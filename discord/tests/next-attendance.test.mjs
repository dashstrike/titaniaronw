import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {AttendanceStore,nextAttendanceEvent,websiteRequest} from '../worker.mjs';
const savedFetch=globalThis.fetch;afterEach(()=>globalThis.fetch=savedFetch);
const sourceId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',nextId='bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const env={DISCORD_GUILD_ID:'505382879983960064',DISCORD_ATTENDANCE_CHANNEL_ID:'1572811638560522321',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only',DISCORD_BOT_TOKEN:'test-only'};
for(const [type,date,expected] of [
  ['guild_league_thursday','2026-11-19',{type:'siege',date:'2026-11-22'}],
  ['guild_league_tuesday','2026-11-17',{type:'guild_league_thursday',date:'2026-11-19'}],
  ['siege','2026-11-15',{type:'guild_league_tuesday',date:'2026-11-17'}],
  ['guild_league_thursday','2026-12-31',{type:'siege',date:'2027-01-03'}]
])test('next event after '+type+' '+date,()=>{
  const now=new Date(date+'T12:00:00+08:00');assert.deepEqual(nextAttendanceEvent({event_type:type,event_date:date},now),expected);
});
test('closing historical attendance chooses the next current event instead of an old date',()=>{
  assert.deepEqual(nextAttendanceEvent({event_type:'guild_league_thursday',event_date:'2026-10-01'},new Date('2026-11-18T17:00:00Z')),{type:'guild_league_thursday',date:'2026-11-19'});
});
class Storage {
  data=new Map();tail=Promise.resolve();
  async get(key){return structuredClone(this.data.get(key));}
  async put(key,value){this.data.set(key,structuredClone(value));}
  async delete(key){this.data.delete(key);}
  transaction(fn){const result=this.tail.then(()=>fn(this));this.tail=result.catch(()=>{});return result;}
}
function fixture(){
  const storage=new Storage(),store=new AttendanceStore({storage},env),calls=[];
  const state={role:'attendance_auditor',approved:true,status:'closed',postError:false,timeout:false};
  globalThis.fetch=async(url,options={})=>{
    const path=String(url),body=options.body?JSON.parse(options.body):undefined;calls.push({path,options,body});
    if(path.includes('/auth/v1/user'))return Response.json({id:'manager'});
    if(path.includes('/profiles?'))return Response.json([{approved:state.approved,role:state.role}]);
    if(path.includes('attendance_events?id='))return Response.json([{id:sourceId,event_type:'guild_league_thursday',event_date:'2026-11-19',status:state.status}]);
    if(path.includes('attendance_events?event_type='))return Response.json([{id:nextId,status:'upcoming'}]);
    if(path.includes('planner_state?'))return Response.json([{state:{roster:[{id:'m1',status:'active'}]}}]);
    if(path.includes('attendance_records?'))return Response.json([{member_id:'m1',pre_status:'going'}]);
    if(path.includes('/channels/')){
      if(state.timeout)throw new Error('network timeout');
      if(state.postError)return Response.json({message:'Missing permissions'},{status:403});
      return Response.json({id:'new_post'});
    }
    throw new Error('Unexpected request '+path);
  };
  const runtime={...env,ATTENDANCE:{idFromName:id=>id,get:()=>({fetch:(url,options)=>store.fetch(new Request(url,options))})}};
  const request=()=>new Request('https://worker/attendance-next',{method:'POST',headers:{Origin:'https://dashstrike.github.io',Authorization:'Bearer fake-session'},body:JSON.stringify({closedEventId:sourceId})});
  return {storage,store,calls,state,runtime,request};
}
test('finish posts the next event once and retains existing pre-attendance counts',async()=>{
  const f=fixture();const first=await f.store.publishNext(sourceId),second=await f.store.publishNext(sourceId);
  assert.equal(first.posted,true);assert.equal(second.alreadyPosted,true);
  const posts=f.calls.filter(call=>call.path.includes('/channels/'));assert.equal(posts.length,1);
  assert.equal(posts[0].body.enforce_nonce,true);assert.ok(posts[0].body.nonce.length<=25);
  assert.equal(posts[0].body.content,'@everyone');assert.deepEqual(posts[0].body.allowed_mentions,{parse:['everyone']});
  assert.equal(posts[0].body.embeds[0].fields[1].value,'1');
  assert.equal((await f.storage.get('message:new_post')).eventId,nextId);
  assert.equal(f.calls.filter(call=>call.path.includes('attendance_records')&&['POST','PATCH','DELETE'].includes(call.options.method)).length,0);
});
test('concurrent finish requests for the same target produce only one Discord post',async()=>{
  const f=fixture();await Promise.all([f.store.publishNext(sourceId),f.store.publishNext(sourceId)]);
  assert.equal(f.calls.filter(call=>call.path.includes('/channels/')).length,1);
});
test('an open source event cannot trigger automatic posting',async()=>{
  const f=fixture();f.state.status='open';await assert.rejects(f.store.publishNext(sourceId),/Finish and close/);
  assert.equal(f.calls.filter(call=>call.path.includes('/channels/')).length,0);
});
test('definite Discord rejection allows retry without reopening closed attendance',async()=>{
  const f=fixture();f.state.postError=true;await assert.rejects(f.store.publishNext(sourceId));
  f.state.postError=false;assert.equal((await f.store.publishNext(sourceId)).posted,true);assert.equal(f.state.status,'closed');
});
test('uncertain network outcome blocks automatic duplicate posting',async()=>{
  const f=fixture();f.state.timeout=true;await assert.rejects(f.store.publishNext(sourceId));
  f.state.timeout=false;await assert.rejects(f.store.publishNext(sourceId),/could not be confirmed/);
  assert.equal(f.calls.filter(call=>call.path.includes('/channels/')).length,1);
});
test('website attendance roles are authorized server-side; viewers cannot post',async()=>{
  for(const role of ['attendance_auditor','party_organizer','admin','viewer']){
    const f=fixture();f.state.role=role;
    const result=await websiteRequest(f.request(),f.runtime);
    assert.equal(result.status,role==='viewer'?403:200);
    if(role==='viewer')assert.equal(f.calls.filter(call=>call.path.includes('/channels/')).length,0);
  }
});
