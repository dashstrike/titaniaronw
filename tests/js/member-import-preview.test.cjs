const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('public/js/member-import-preview.js','utf8');
const functions=source.slice(source.indexOf('  function clone('),source.indexOf('  function importPayload('));

function apply(roster,rows,extra={}){
  const plannerState={roster,assignments:{party:roster.map(m=>m.name)},raidCommanders:{raid:roster[0].name},raidLeaders:{raid:roster[0].name},membershipHistory:[{memberId:roster[0].id,memberName:roster[0].name}],...extra};
  const context={plannerState,rows,currentProfile:{display_name:'Tester'},localDate:()=> '2026-10-14',makeId:()=> 'new-id',toInt:v=>Number(v)||0,exactKey:v=>String(v).trim().toLowerCase(),presentExistingIds:()=>new Set(rows.map(r=>r.memberId))};
  vm.createContext(context);
  vm.runInContext(functions,context);
  return {next:context.applyToState(),original:plannerState};
}
const member=(id,name)=>({id,name,cls:'Night Watch',gr:55884,status:'active'});
const row=(memberId,csvName,extra={})=>({memberId,csvName,cls:'Night Watch',gr:55884,needsReview:false,...extra});

test('CSV updates every SEA class without replacing member IDs',()=>{
  const catalog=JSON.parse(fs.readFileSync('public/images/job/job-catalog.json','utf8'));
  for(const cls of catalog.jobs.map(job=>job.name)){
    const {next}=apply([member('1','Player')],[row('1','Player',{cls})]);
    assert.equal(next.roster[0].id,'1');
    assert.equal(next.roster[0].cls,cls);
  }
});

test('confirmed mapping renames same ID and lineup references while retaining history',()=>{
  const {next,original}=apply([member('1','Xaraki')],[row('1','福Le-Xhiaツ')]);
  assert.equal(next.roster[0].id,'1');
  assert.equal(next.roster[0].name,'福Le-Xhiaツ');
  assert.equal(next.assignments.party[0],'福Le-Xhiaツ');
  assert.equal(next.raidCommanders.raid,'福Le-Xhiaツ');
  assert.equal(next.raidLeaders.raid,'福Le-Xhiaツ');
  assert.equal(next.membershipHistory[0].memberName,'Xaraki');
  assert.equal(original.roster[0].name,'Xaraki');
  assert.equal(next.roster[0].updatedBy,'Tester');
});
test('batch renames preserve distinct assignments when names swap',()=>{
  const {next}=apply([member('1','A'),member('2','B')],[row('1','B'),row('2','A')]);
  assert.equal(JSON.stringify(next.assignments.party),'["B","A"]');
});
test('ignored mappings do not rename; case changes do',()=>{
  assert.equal(apply([member('1','Xaraki')],[row('1','New',{ignored:true})]).next.roster[0].name,'Xaraki');
  assert.equal(apply([member('1','Xaraki')],[row('1','XARAKI')]).next.roster[0].name,'XARAKI');
});
test('unconfirmed mappings and collisions cannot be applied',()=>{
  assert.throws(()=>apply([member('1','A')],[row('1','B',{needsReview:true})]),/Confirm all member mappings/);
  assert.throws(()=>apply([member('1','A'),member('2','B')],[row('1','B'),row('2','B',{ignored:true})]),/more than one member/);
});
