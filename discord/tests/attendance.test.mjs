import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import worker,{AttendanceStore,Backend,matchMember,eventDate,isManager,verifyRequest} from '../worker.mjs';

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
const env={DISCORD_APPLICATION_ID:'1562532538847596776',DISCORD_GUILD_ID:'505382879983960064',DISCORD_ATTENDANCE_CHANNEL_ID:'1572811638560522321',DISCORD_BOT_TOKEN:'test-only',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only'};
const eventId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const actor='111111111111111111',other='222222222222222222';
const roster=[{id:'member_1',name:'Player One',status:'active'},{id:'member_2',name:'Player Two',status:'active'},{id:'former',name:'Inactive',status:'inactive'}];
class Storage {
  data=new Map();tail=Promise.resolve();alarm=null;
  async get(key){return structuredClone(this.data.get(key));}
  async put(key,value){this.data.set(key,structuredClone(value));}
  async delete(key){for(const item of Array.isArray(key)?key:[key])this.data.delete(item);}
  async getAlarm(){return this.alarm;}
  async setAlarm(value){this.alarm=value;}
  async list({prefix='',limit=1000,startAfter=''}){return new Map([...this.data].filter(([key])=>key.startsWith(prefix)&&key>startAfter).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit));}
  transaction(callback){const result=this.tail.then(()=>callback(this));this.tail=result.catch(()=>{});return result;}
}
function interaction(type=3){return {id:crypto.randomUUID(),type,token:'test-interaction',application_id:env.DISCORD_APPLICATION_ID,guild_id:env.DISCORD_GUILD_ID,channel_id:env.DISCORD_ATTENDANCE_CHANNEL_ID,member:{user:{id:actor},nick:' player   ONE ',permissions:'0'},message:{id:'message_1',author:{id:env.DISCORD_APPLICATION_ID}},data:{custom_id:'titania:'+eventId+':going'}};}
function fixture(){
  const storage=new Storage(),store=new AttendanceStore({storage},env),calls=[];
  storage.data.set('message:message_1',{eventId,type:'siege',date:'2026-11-22'});
  const record={id:'record_1',event_id:eventId,member_id:'member_1',member_name:'Player One',pre_status:'not_going',actual_status:'present',note:'Management note'};
  const state={roster:structuredClone(roster),closed:false,record};
  globalThis.fetch=async (input,options={})=>{
    const url=new URL(input),body=options.body?JSON.parse(options.body):undefined;
    calls.push({url,options,body});
    if(url.pathname.endsWith('/planner_state'))return Response.json([{state:{roster:state.roster}}]);
    if(url.pathname.endsWith('/attendance_events'))return Response.json([{id:eventId,status:state.closed?'closed':'upcoming'}]);
    if(url.pathname.endsWith('/attendance_records')){
      if(options.method==='PATCH'){Object.assign(record,body);return new Response(null,{status:204});}
      if(options.method==='POST'){Object.assign(record,body);return new Response(null,{status:201});}
      return Response.json(state.exists===false?[]:[record]);
    }
    if(url.pathname.includes('/channels/'))return Response.json({id:'new_message'});
    if(url.pathname.includes('/webhooks/'))return new Response(null,{status:204});
    throw new Error('Unexpected request '+url);
  };
  return {storage,store,state,calls,record};
}
const send=async(store,data)=>(await store.fetch(new Request('https://internal/',{method:'POST',body:JSON.stringify(data)}))).json();

test('My Status reads the latest response without linking or writing attendance, including closed events',async()=>{
  for(const status of ['going','not_going',null]){
    const f=fixture(),i=interaction();f.state.closed=true;f.record.pre_status=status;
    i.data.custom_id='titania:'+eventId+':status';
    const result=await send(f.store,i);
    assert.match(result.content,status==='going'?/GOING/:status==='not_going'?/NOT GOING/:/haven't responded yet/);
    assert.match(result.content,/22\/11\/2026/);
    assert.equal(f.calls.some(call=>['POST','PATCH','DELETE'].includes(call.options.method)),false);
    assert.equal(await f.storage.get('user:'+actor),undefined);
    f.record.pre_status='going';i.id=crypto.randomUUID();
    assert.match((await send(f.store,i)).content,/YOUR RESPONSE:.*GOING/);
  }
});

test('first click links exact normalized server nickname; updates pre-attendance only',async()=>{
  const f=fixture(),result=await send(f.store,interaction());
  assert.match(result.content,/going_tick_circle:1572867047379963947>\s+Going saved/);assert.equal(f.record.pre_status,'going');
  assert.equal(f.record.actual_status,'present');assert.equal(f.record.note,'Management note');
  assert.equal((await f.storage.get('user:'+actor)).memberId,'member_1');
  assert.deepEqual(f.calls.find(call=>call.options.method==='PATCH').body,{pre_status:'going',member_name:'Player One'});
});
test('CSV rename and later Discord nickname changes retain the saved member ID',async()=>{
  const f=fixture();await f.store.link(actor,roster[0],true);
  f.state.roster[0].name='Renamed Character';const i=interaction();i.member.nick='Unrelated Nick';i.data.custom_id='titania:'+eventId+':not_going';
  assert.match((await send(f.store,i)).content,/Renamed Character:.*Not going/);assert.equal(f.record.member_id,'member_1');
});
test('display name links automatically when no server nickname is set',async()=>{
  const f=fixture(),i=interaction();i.member.nick=null;i.member.user.global_name='Player One';
  assert.match((await send(f.store,i)).content,/going_tick_circle:1572867047379963947>\s+Going saved/);
  assert.equal((await f.storage.get('user:'+actor)).memberId,'member_1');
});
test('an explicitly set server nickname takes precedence over the global display name',async()=>{
  const f=fixture(),i=interaction();i.member.nick='Unmatched';i.member.user.global_name='Player One';
  assert.doesNotMatch((await send(f.store,i)).content,/saved for/);
  assert.equal(await f.storage.get('user:'+actor),undefined);
});
test('missing, duplicate or inactive roster entries never create members or mark attendance',async()=>{
  for(const nickname of ['Nobody','Inactive','']){
    const f=fixture(),i=interaction();i.member.nick=nickname;const result=await send(f.store,i);
    assert.doesNotMatch(result.content,/saved for/);assert.equal(f.calls.filter(call=>['POST','PATCH'].includes(call.options.method)).length,0);
  }
  const f=fixture();f.state.roster.push({id:'duplicate',name:'PLAYER ONE',status:'active'});
  assert.match((await send(f.store,interaction())).content,/More than one/);
});
test('missing or inactive linked member is not silently rebound by nickname',()=>{
  assert.throws(()=>matchMember(roster,'Player One','deleted'),/missing or inactive/);
  assert.throws(()=>matchMember(roster,'Player One','former'),/missing or inactive/);
});
test('one character cannot be claimed by two Discord accounts concurrently',async()=>{
  const f=fixture();const results=await Promise.allSettled([f.store.link(actor,roster[0],true),f.store.link(other,roster[0],true)]);
  assert.equal(results.filter(row=>row.status==='fulfilled').length,1);
  assert.match(results.find(row=>row.status==='rejected').reason.message,/already linked/);
});
test('duplicate deliveries do not overwrite a later management correction',async()=>{
  const f=fixture(),i=interaction();await send(f.store,i);f.record.pre_status='not_going';
  await send(f.store,i);assert.equal(f.record.pre_status,'not_going');assert.equal(f.calls.filter(call=>call.options.method==='PATCH'&&call.url.pathname.endsWith('/attendance_records')).length,1);
});
test('closed event rejects Discord response without altering actual attendance or notes',async()=>{
  const f=fixture();f.state.closed=true;assert.match((await send(f.store,interaction())).content,/closed/);
  assert.equal(f.record.pre_status,'not_going');assert.equal(f.record.actual_status,'present');
  assert.equal(f.calls.filter(call=>call.options.method==='PATCH').length,0);
});
test('foreign guild/channel and unregistered or forged messages are rejected',async()=>{
  for(const change of [i=>i.guild_id='other',i=>i.channel_id='other',i=>i.message.id='unknown',i=>i.message.author.id='imposter']){
    const f=fixture(),i=interaction();change(i);assert.doesNotMatch((await send(f.store,i)).content,/saved for/);assert.equal(f.calls.length,0);
  }
});
test('posting is management-only and produces exactly Going / Not going buttons',async()=>{
  const f=fixture(),i=interaction(2);i.data={name:'attendance',options:[{name:'post',options:[{name:'event',value:'siege'}]}]};
  assert.match((await send(f.store,i)).content,/Only Discord administrators/);assert.equal(f.calls.length,0);
  i.id=crypto.randomUUID();i.member.permissions='32';await send(f.store,i);
  const posted=f.calls.find(call=>call.url.pathname.includes('/channels/')).body;
  assert.deepEqual(posted.components[0].components.map(button=>button.label),['Going (0)','Not going (1)','My Status']);
  assert.deepEqual(posted.components[0].components.map(button=>button.emoji?.id),['1572867047379963947','1572867073267343380',undefined]);
  assert.match(posted.embeds[0].fields[1].name,/<:going_tick_circle:1572867047379963947>/);
  assert.match(posted.embeds[0].fields[2].name,/<:not_going_x_circle:1572867073267343380>/);
  assert.match(posted.embeds[0].thumbnail.url,/1564620820838351008\.png$/);
  assert.equal(posted.content,'<@&1559578395564843069>');assert.deepEqual(posted.allowed_mentions,{parse:[],roles:['1559578395564843069']});assert.equal((await f.storage.get('message:new_message')).eventId,eventId);
});
test('message counts change when a member switches response without double counting',async()=>{
  const f=fixture(),i=interaction();await send(f.store,i);
  let message=f.calls.filter(call=>call.url.pathname.includes('/channels/')&&call.options.method==='PATCH').at(-1).body;
  assert.deepEqual(message.allowed_mentions,{parse:[]});assert.equal(message.content,undefined);
  assert.deepEqual(message.components[0].components.map(button=>button.label),['Going (1)','Not going (0)','My Status']);
  i.id=crypto.randomUUID();i.data.custom_id='titania:'+eventId+':not_going';await send(f.store,i);
  message=f.calls.filter(call=>call.url.pathname.includes('/channels/')&&call.options.method==='PATCH').at(-1).body;
  assert.deepEqual(message.components[0].components.map(button=>button.label),['Going (0)','Not going (1)','My Status']);
  assert.equal(f.record.note,'Management note');assert.equal(f.record.actual_status,'present');
});
test('counters exclude inactive members, missing members and no-response rows',async()=>{
  fixture();globalThis.fetch=async()=>Response.json([{member_id:'member_1',pre_status:'going'},{member_id:'member_1',pre_status:'going'},{member_id:'member_2',pre_status:'no_response'},{member_id:'former',pre_status:'going'},{member_id:'deleted',pre_status:'not_going'}]);
  assert.deepEqual(await new Backend(env).counts(eventId,roster),{going:1,notGoing:0});
});
test('event date uses GMT+8, validates weekday and rejects past/invalid dates',()=>{
  const now=new Date('2026-11-18T17:00:00Z'); // Thursday in Malaysia.
  assert.equal(eventDate('guild_league_thursday',undefined,now),'2026-11-19');assert.equal(eventDate('siege',undefined,now),'2026-11-22');
  for(const date of ['2026-11-19','2026-02-30','2026-11-15'])assert.throws(()=>eventDate('siege',date,now));
  assert.equal(isManager({member:{permissions:'8'}}),true);assert.equal(isManager({member:{permissions:'0'}}),false);
});
test('new attendance insert contains no actual-status or note overwrite',async()=>{
  const f=fixture();f.state.exists=false;await new Backend(env).save(eventId,roster[0],'going');
  assert.deepEqual(f.calls.find(call=>call.options.method==='POST').body,{event_id:eventId,member_id:'member_1',member_name:'Player One',pre_status:'going'});
});
test('management unlink removes both directions and keeps attendance records',async()=>{
  const f=fixture();await f.store.link(actor,roster[0],true);
  const i=interaction(2);i.member.permissions='32';i.data={name:'attendance',options:[{name:'unlink',options:[{name:'user',value:actor}]}]};
  assert.match((await send(f.store,i)).content,/No attendance records were deleted/);
  assert.equal(await f.storage.get('user:'+actor),undefined);assert.equal(await f.storage.get('member:member_1'),undefined);assert.equal(f.calls.length,0);
});
test('receipt cleanup removes expired deliveries and retains permanent links',async()=>{
  const f=fixture();await f.store.link(actor,roster[0],true);
  await f.storage.put('delivery:old',{at:0});await f.storage.put('delivery:new',{at:Date.now()});await f.store.alarm();
  assert.equal(await f.storage.get('delivery:old'),undefined);assert.ok(await f.storage.get('delivery:new'));assert.ok(await f.storage.get('user:'+actor));
});

async function signed(data,{timestamp=String(Math.floor(Date.now()/1000)),tamper=false}={}){
  const keys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
  const publicKey=Buffer.from(await crypto.subtle.exportKey('raw',keys.publicKey)).toString('hex');
  const body=JSON.stringify(data),signature=Buffer.from(await crypto.subtle.sign('Ed25519',keys.privateKey,new TextEncoder().encode(timestamp+body))).toString('hex');
  return {publicKey,request:new Request('https://worker/',{method:'POST',headers:{'X-Signature-Timestamp':timestamp,'X-Signature-Ed25519':signature},body:tamper?body+' ':body})};
}
test('signed Discord PING works; tampered, stale and unsigned requests fail',async()=>{
  const ping=await signed({type:1});assert.deepEqual(await (await worker.fetch(ping.request,{DISCORD_PUBLIC_KEY:ping.publicKey},{})).json(),{type:1});
  for(const options of [{tamper:true},{timestamp:'1'}]){const s=await signed({type:1},options);assert.equal(await verifyRequest(s.request,s.publicKey),null);}
  assert.equal((await worker.fetch(new Request('https://worker/',{method:'POST',body:'{}'}),{},{})).status,401);
});
test('Worker rejects other guilds, channels, applications and non-management commands before backend access',async()=>{
  for(const change of [i=>i.guild_id='other',i=>i.channel_id='other',i=>i.application_id='other',i=>i.type=2]){
    const f=fixture(),i=interaction();change(i);const s=await signed(i);
    await worker.fetch(s.request,{...env,DISCORD_PUBLIC_KEY:s.publicKey},{waitUntil(){throw new Error('Unexpected backend execution');}});
    assert.equal(f.calls.length,0);
  }
});
test('Worker acknowledges quickly, delegates processing and sends a private confirmation',async()=>{
  const f=fixture(),i=interaction(),s=await signed(i),tasks=[];
  const runtime={...env,DISCORD_PUBLIC_KEY:s.publicKey,ATTENDANCE:{idFromName:id=>id,get:()=>({fetch:(url,opts)=>f.store.fetch(new Request(url,opts))})}};
  assert.deepEqual(await (await worker.fetch(s.request,runtime,{waitUntil:task=>tasks.push(task)})).json(),{type:5,data:{flags:64}});
  await Promise.all(tasks);assert.ok(f.calls.some(call=>call.url.pathname.includes('/webhooks/')&&/saved/.test(call.body.content)));
});
test('signed Discord verification registers both commands once without exposing the bot token',async()=>{
  const f=fixture(),tasks=[],registrations=[];
  globalThis.fetch=async(url,options)=>{
    assert.match(String(url),/\/applications\/1562532538847596776\/guilds\/505382879983960064\/commands$/);
    assert.equal(options.headers.Authorization,'Bot test-only');
    registrations.push(JSON.parse(options.body).name);return Response.json({id:'command'});
  };
  const runtime={...env,ATTENDANCE:{idFromName:id=>id,get:()=>({fetch:(url,opts)=>f.store.fetch(new Request(url,opts))})}};
  for(let count=0;count<2;count++){
    const s=await signed({type:1});
    assert.deepEqual(await (await worker.fetch(s.request,{...runtime,DISCORD_PUBLIC_KEY:s.publicKey},{waitUntil:task=>tasks.push(task)})).json(),{type:1});
    await Promise.all(tasks);
  }
  assert.deepEqual(registrations,['attendance','voice-list']);assert.equal(await f.storage.get('commandVersion'),2);
  const health=await worker.fetch(new Request('https://worker/'),runtime,{waitUntil(){throw new Error('Public GET must not run setup');}});
  assert.equal(health.status,200);
});
