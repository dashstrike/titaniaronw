const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/attendance-page.js','utf8');
function fixture(){
  const calls=[],event={id:'event1',status:'open'},button={disabled:false},state={allow:true,confirm:true,closeError:null,discordError:false};
  const c={selectedEvent:event,canEdit:()=>state.allow,window:{confirm:()=>state.confirm},document:{getElementById:()=>button},Date,AbortSignal,
    EVENT_META:{guild_league_tuesday:{label:'Guild League (Tuesday)'}},
    supabaseClient:{auth:{getSession:async()=>({data:{session:{access_token:'session'}}})},from:()=>({update:payload=>({eq:async()=>{calls.push({close:payload});return {error:state.closeError};}})})},
    fetch:async()=>{calls.push({discord:true});return {ok:!state.discordError,json:async()=>state.discordError?{error:'Discord unavailable'}:{eventType:'guild_league_tuesday',eventDate:'2026-11-24'}};},
    fetchRecords:async()=>{},fetchEvents:async()=>{},renderShell(){},toast:(title,message,type)=>calls.push({title,message,type})};
  vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  let finishingAttendance='),source.indexOf('  async function reopenAttendance()')),c);
  return {c,calls,event,button,state};
}
test('Finish closes current attendance before requesting the next Discord post',async()=>{
  const f=fixture();await f.c.finishAttendance();assert.ok(f.calls[0].close);assert.equal(f.calls[1].discord,true);assert.equal(f.event.status,'closed');assert.equal(f.button.disabled,false);
  assert.ok(f.calls.some(call=>call.message?.includes('24/11/2026')));
});
test('cancel, read-only access and failed close do not post next attendance',async()=>{
  for(const mode of ['confirm','allow','closeError']){
    const f=fixture();f.state[mode]=mode==='closeError'?new Error('close failed'):false;await f.c.finishAttendance();
    assert.equal(f.calls.some(call=>call.discord),false);assert.equal(f.event.status,'open');
  }
});
test('Discord failure warns management while preserving the successfully closed event',async()=>{
  const f=fixture();f.state.discordError=true;await f.c.finishAttendance();assert.equal(f.event.status,'closed');assert.ok(f.calls.some(call=>call.type==='warn'&&call.message.includes('Discord unavailable')));
});
