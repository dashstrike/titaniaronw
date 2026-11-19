const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/attendance-pre.js','utf8');
function fixture(){
  let result={data:[{member_id:'m1',pre_status:'going'}]},pending;
  const context={console:{warn(){}},canUseAttendance:()=>true,currentKey:()=> 'siege:2026-11-22',ensureResetButton(){},scheduleDecorate(){},toast(){},
    supabaseClient:{from(table){const query={select(){return query;},eq(){return query;},async maybeSingle(){return {data:{id:'event'}};},then(resolve){return (pending||Promise.resolve(result)).then(resolve);}};return query;}}
  };
  vm.createContext(context);
  vm.runInContext(`const STATUS_META={going:{},not_going:{},no_response:{}};let cachedEventKey='siege:2026-11-22',cachedEventId='',loadingKey='',statusRevision=0,statusByMemberId=new Map([['m1','not_going']]);`,context);
  vm.runInContext(source.slice(source.indexOf('  async function loadStatuses('),source.indexOf('  function badgeHtml(')),context);
  return {context,setResult:value=>result=value,hold:()=>{pending=new Promise(resolve=>context.release=resolve);},status:()=>vm.runInContext("statusByMemberId.get('m1')",context)};
}
test('Discord refresh loads pre-attendance from existing records',async()=>{
  const f=fixture();await f.context.loadStatuses(true);assert.equal(f.status(),'going');
});
test('failed background refresh retains last known attendance',async()=>{
  const f=fixture();f.setResult({error:new Error('offline')});await f.context.loadStatuses(true);assert.equal(f.status(),'not_going');
});
test('response fetched before a management click cannot overwrite the manual tick',async()=>{
  const f=fixture();f.hold();const loading=f.context.loadStatuses(true);await new Promise(resolve=>setImmediate(resolve));
  vm.runInContext("statusRevision++;statusByMemberId.set('m1','not_going')",f.context);
  f.context.release({data:[{member_id:'m1',pre_status:'going'}]});await loading;assert.equal(f.status(),'not_going');
});
test('management permission checks and manual write fields are retained',()=>{
  assert.match(source,/async function handleBadgeClick\(badge\)\{\s*if\(!canEdit\(\)\)/);
  assert.match(source,/pre_status:next/);assert.match(source,/setInterval\(refresh,20000\)/);
});
