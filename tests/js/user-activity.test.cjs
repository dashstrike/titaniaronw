const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../public/js/user-activity.js'),'utf8');
async function fixture({publicPage=false,hidden=false,session=true,recovery=false,fail=false,logoutError=false,fetchFail=false,popup=false,owner=false}={}){
  const calls=[],intervals=[],handlers={},logoutEvents=[];let clients=0;
  const client={auth:{getSession:async()=>({data:{session:session?{access_token:'synthetic-test-token',user:{id:'test-user'}}:null}}),signOut:async()=>{logoutEvents.push('signed-out');return {error:logoutError?new Error('Sign out failed'):null};},onAuthStateChange:callback=>{handlers.auth=callback;}},rpc:async(name,args)=>{calls.push({name,args});if(fail)throw new Error('Offline');return {error:null,data:name==='can_view_login_history'?owner:name==='get_online_users'?[{user_id:'test-user',display_name:'<DASH>',last_page:'guild_league',last_seen_at:'2026-10-29T08:00:00Z'}]:null};}};
  const nodes=new Map();
  if(popup)for(const id of ['onlineUsersPopup','onlineUsersPopupPanel','onlineUsersPopupToggle','onlineUsersPopupList','onlineUsersPopupCount','onlineUsersPopupClose'])nodes.set(id,{
    hidden:true,handlers:{},attributes:{},textContent:'',innerHTML:'',
    addEventListener(name,callback){this.handlers[name]=callback;},setAttribute(name,value){this.attributes[name]=value;},focus(){this.focused=true;},
  });
  const document={body:{dataset:{titaniaPublic:String(publicPage),event:'guild_league'}},visibilityState:hidden?'hidden':'visible',getElementById:id=>nodes.get(id)||null,addEventListener:(name,callback)=>{handlers[name]=callback;}};
  const context={window:{TITANIA_CONFIG:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'public-key'},supabase:{createClient(){clients++;return client;}}},document,
    location:{href:'https://example.com/dashboard'+(recovery?'?password_reset=1':''),hash:''},URL,AbortSignal,
    fetch:async(url)=>{assert.match(url,/\/rest\/v1\/rpc\/record_user_logout$/);logoutEvents.push('logout-record');if(fetchFail)throw new Error('Offline');return {ok:true};},
    setInterval(callback,delay){intervals.push({callback,delay});},setTimeout(callback){handlers.deferred=callback;},
  };
  vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));
  return {calls,intervals,handlers,document,clients,nodes,logoutEvents,signOut:()=>context.window.TitaniaSignOut(client)};
}
test('public pages and password recovery do not start tracking',async()=>{
  for(const options of [{publicPage:true},{recovery:true}]){
    const f=await fixture(options);assert.equal(f.clients,0);assert.equal(f.calls.length,0);
  }
});
test('anonymous or hidden tabs do not record activity',async()=>{
  for(const options of [{session:false},{hidden:true}]){
    const f=await fixture(options);assert.equal(f.calls.length,0);
  }
});
test('signed-in activity sends only the page and repeats every minute',async()=>{
  const f=await fixture();assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].name,'record_user_activity');assert.equal(f.calls[0].args.p_page,'guild_league');
  assert.deepEqual(Object.keys(f.calls[0].args),['p_page']);
  assert.equal(f.intervals[0].delay,60000);
  await f.intervals[0].callback();assert.equal(f.calls.length,2);
  f.document.visibilityState='hidden';await f.intervals[0].callback();assert.equal(f.calls.length,2);
});
test('network failures do not break app actions or prevent later heartbeats',async()=>{
  const f=await fixture({fail:true});assert.equal(f.calls.length,1);
  await f.intervals[0].callback();assert.equal(f.calls.length,2);
});
test('logout is recorded only after signOut succeeds',async()=>{
  const f=await fixture();const result=await f.signOut();
  assert.equal(result.error,null);assert.deepEqual(f.logoutEvents,['signed-out','logout-record']);
  const failed=await fixture({logoutError:true});assert.ok((await failed.signOut()).error);
  assert.deepEqual(failed.logoutEvents,['signed-out']);
});
test('logout tracking failure does not block successful sign-out, and anonymous sign-out is safe',async()=>{
  const f=await fixture({fetchFail:true});assert.equal((await f.signOut()).error,null);
  const anonymous=await fixture({session:false});assert.equal((await anonymous.signOut()).error,null);
  assert.deepEqual(anonymous.logoutEvents,['signed-out']);
});
test('owner-only online popup opens, escapes names and closes on logout',async()=>{
  const f=await fixture({popup:true,owner:true});
  assert.equal(f.nodes.get('onlineUsersPopup').hidden,false);
  assert.match(f.nodes.get('onlineUsersPopupList').innerHTML,/&lt;DASH&gt;/);
  f.nodes.get('onlineUsersPopupToggle').handlers.click();
  assert.equal(f.nodes.get('onlineUsersPopupPanel').hidden,false);
  f.nodes.get('onlineUsersPopupClose').handlers.click();
  assert.equal(f.nodes.get('onlineUsersPopupPanel').hidden,true);
  f.handlers.auth('SIGNED_OUT',null);
  assert.equal(f.nodes.get('onlineUsersPopup').hidden,true);
  assert.equal(f.nodes.get('onlineUsersPopupCount').textContent,'0');
});
test('other users never see the online popup or request the online list',async()=>{
  const f=await fixture({popup:true,owner:false});
  assert.equal(f.nodes.get('onlineUsersPopup').hidden,true);
  assert.equal(f.calls.filter(call=>call.name==='get_online_users').length,0);
});
