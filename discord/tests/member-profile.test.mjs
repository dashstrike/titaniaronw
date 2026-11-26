import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {AttendanceStore,websiteRequest} from '../worker.mjs';
const originalFetch=globalThis.fetch;afterEach(()=>globalThis.fetch=originalFetch);
const userId='111111111111111111',otherId='222222222222222222';
const env={DISCORD_GUILD_ID:'505382879983960064',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'private-test',DISCORD_BOT_TOKEN:'bot-test'};
class Storage {
  data=new Map();tail=Promise.resolve();
  async get(key){return structuredClone(this.data.get(key));}
  async put(key,value){this.data.set(key,structuredClone(value));}
  async delete(key){this.data.delete(key);}
  transaction(callback){const result=this.tail.then(()=>callback(this));this.tail=result.catch(()=>{});return result;}
}
function fixture(){
  const storage=new Storage(),store=new AttendanceStore({storage},env),calls=[];
  const state={approved:true,role:'viewer',auth:true,left:false,inactive:false};
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('/auth/v1/user'))return Response.json(state.auth?{id:'verified-manager'}:{error:'invalid'},{status:state.auth?200:401});
    if(String(url).includes('/profiles?'))return Response.json([{approved:state.approved,role:state.role}]);
    if(String(url).includes('/planner_state?'))return Response.json([{state:{roster:[{id:'m1',name:'Player',status:state.inactive?'inactive':'active'},{id:'m2',name:'Another'}]}}]);
    if(String(url).includes('/member_discord_link_status?'))return new Response(null,{status:201});
    if(String(url).includes('/guilds/'))return Response.json(state.left?{error:'missing'}:{nick:'Player Nick',user:{id:userId,username:'player_user',avatar:'abcdef123'}},{status:state.left?404:200});
    throw Error('Unexpected request '+url);
  };
  const runtime={...env,ATTENDANCE:{idFromName:id=>id,get:()=>({fetch:(url,opts)=>store.fetch(new Request(url,opts))})}};
  return {storage,store,state,calls,runtime};
}
const read={memberId:'m1',action:'read'};
function request(body=read,extra={}){return new Request('https://worker/member-discord',{method:'POST',headers:{Origin:'https://dashstrike.github.io',Authorization:'Bearer valid-session','Content-Type':'application/json',...extra},body:JSON.stringify(body)});}

test('approved viewer can read a linked profile but receives no bot or backend credentials',async()=>{
  const f=fixture();await f.store.link(userId,{id:'m1'},true);
  const response=await websiteRequest(request(),f.runtime),data=await response.json();
  assert.equal(response.status,200);assert.equal(data.linked,true);assert.equal(data.canManage,false);
  assert.equal(data.profile.username,'player_user');assert.equal(data.profile.nickname,'Player Nick');assert.equal(data.method,'Automatic nickname match');
  assert.match(data.profile.avatarUrl,/^https:\/\/cdn.discordapp.com\/avatars\//);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://dashstrike.github.io');assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.doesNotMatch(JSON.stringify(data),/private-test|bot-test|verified-manager/);
});
test('unlinked profile is reported only after authenticated backend lookup',async()=>{
  const f=fixture();assert.deepEqual(await (await websiteRequest(request(),f.runtime)).json(),{linked:false,canManage:false});
  assert.ok(f.calls.some(call=>call.url.includes('/auth/v1/user')));
});
test('reading an existing link repairs its missing badge status',async()=>{
  const f=fixture();await f.store.link(userId,{id:'m1'},true);
  f.calls.length=0;
  const response=await websiteRequest(request(),f.runtime);
  assert.equal((await response.json()).linked,true);
  const statusWrite=f.calls.find(call=>call.url.includes('/member_discord_link_status?'));
  assert.equal(JSON.parse(statusWrite.options.body).linked,true);
  assert.equal(JSON.parse(statusWrite.options.body).member_id,'m1');
});
test('missing/invalid sessions, unapproved users and foreign origins cannot read links',async()=>{
  for(const mode of ['missing','invalid','unapproved','origin']){
    const f=fixture();if(mode==='invalid')f.state.auth=false;if(mode==='unapproved')f.state.approved=false;
    const response=await websiteRequest(request(read,mode==='missing'?{Authorization:''}:mode==='origin'?{Origin:'https://attacker.test'}:{}),f.runtime);
    assert.equal(response.status,mode==='missing'||mode==='invalid'?401:403);
    assert.equal(f.calls.filter(call=>call.url.includes('/planner_state')||call.url.includes('/guilds/')).length,0);
  }
});
test('only admins and party organizers can change links, regardless of client-supplied flags',async()=>{
  for(const role of ['viewer','attendance_auditor']){
    const f=fixture();f.state.role=role;
    const response=await websiteRequest(request({memberId:'m1',action:'link',userId,canManage:true,role:'admin'}),f.runtime);
    assert.equal(response.status,403);assert.equal(await f.storage.get('member:m1'),undefined);
  }
  for(const role of ['admin','party_organizer']){
    const f=fixture();f.state.role=role;
    const response=await websiteRequest(request({memberId:'m1',action:'link',userId,expectedUserId:null}),f.runtime);
    assert.equal(response.status,200);assert.equal((await response.json()).canManage,true);
    assert.equal((await f.storage.get('user:'+userId)).linkedBy,'verified-manager');
  }
});
test('management can change a link atomically and old account is released',async()=>{
  const f=fixture();f.state.role='admin';await f.store.link(userId,{id:'m1'},true);
  const response=await websiteRequest(request({memberId:'m1',action:'link',userId:otherId,expectedUserId:userId}),f.runtime);
  assert.equal(response.status,200);assert.equal(await f.storage.get('user:'+userId),undefined);assert.equal(await f.storage.get('member:m1'),otherId);
});
test('changing a claimed account or a stale link never removes either owner',async()=>{
  const f=fixture();f.state.role='admin';await f.store.link(userId,{id:'m1'},true);await f.store.link(otherId,{id:'m2'},true);
  let response=await websiteRequest(request({memberId:'m1',action:'link',userId:otherId,expectedUserId:userId}),f.runtime);assert.equal(response.status,409);
  response=await websiteRequest(request({memberId:'m1',action:'unlink',expectedUserId:null}),f.runtime);assert.equal(response.status,409);
  assert.equal(await f.storage.get('member:m1'),userId);assert.equal(await f.storage.get('member:m2'),otherId);
});
test('website unlink removes only the account relationship and never writes attendance',async()=>{
  const f=fixture();f.state.role='admin';await f.store.link(userId,{id:'m1'},true);
  const response=await websiteRequest(request({memberId:'m1',action:'unlink',expectedUserId:userId}),f.runtime);
  assert.equal(response.status,200);assert.equal((await response.json()).linked,false);assert.equal(await f.storage.get('user:'+userId),undefined);
  assert.equal(f.calls.filter(call=>call.url.includes('/attendance_records')&&['PATCH','POST'].includes(call.options.method)).length,0);
});
test('users outside the server and inactive characters cannot be newly linked',async()=>{
  for(const mode of ['left','inactive']){
    const f=fixture();f.state.role='admin';f.state[mode]=true;
    const response=await websiteRequest(request({memberId:'m1',action:'link',userId,expectedUserId:null}),f.runtime);
    assert.equal(response.status,409);assert.equal(await f.storage.get('member:m1'),undefined);
  }
});
test('temporary Discord outage or departed member retains an existing link',async()=>{
  const f=fixture();await f.store.link(userId,{id:'m1'},true);f.state.left=true;
  const data=await (await websiteRequest(request(),f.runtime)).json();assert.equal(data.linked,true);assert.equal(data.profile,null);assert.equal(data.userId,userId);
});
test('repeated attendance linking keeps the original automatic method and linked date',async()=>{
  const f=fixture();await f.store.link(userId,{id:'m1'},true);const before=await f.storage.get('user:'+userId);
  await f.store.link(userId,{id:'m1'},false);assert.deepEqual(await f.storage.get('user:'+userId),before);
});
test('CORS preflight is limited to configured origins and POST with authorization',async()=>{
  const f=fixture();const response=await websiteRequest(new Request('https://worker/member-discord',{method:'OPTIONS',headers:{Origin:'http://titaniaronw.test'}}),f.runtime);
  assert.equal(response.status,204);assert.equal(f.calls.length,0);assert.equal(response.headers.get('Access-Control-Allow-Methods'),'POST, OPTIONS');
});
