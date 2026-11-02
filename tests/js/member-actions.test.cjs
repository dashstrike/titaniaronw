const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/pages/index.js','utf8');
for(const confirmed of [false,true])test(`Delete Member ${confirmed?'confirmed':'cancelled'} preserves the existing deletion rules`,async()=>{
  const member={id:'one',name:'Test'};let closed=false,commits=0;
  const state={roster:[member],assignments:{main_1:['Test','Other']},membershipHistory:[{memberId:'one',memberName:'Test'},{memberId:'two',memberName:'Other'}]};
  const context={state,memberByName:{Test:member},memberById:{one:member},userCanEdit:()=>true,confirmPlannerAction:async()=>confirmed,
    memberDrafts:new Map([['one',{gr:123}]]),ALL_KEYS:['main_1'],stringValue:value=>String(value??''),dashboardSelected:new Set(['Test']),selectedMember:'Test',editingMemberName:'Test',closeMemberModal:()=>closed=true,commitMutation:()=>commits++,showToast(){}};
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf('  async function deleteMember('),source.indexOf('  function openStatusModal(')),context);
  await context.deleteMember('Test');
  assert.equal(state.roster.length,confirmed?0:1);assert.equal(state.assignments.main_1[0],confirmed?null:'Test');assert.equal(state.assignments.main_1[1],'Other');
  assert.equal(state.membershipHistory.length,confirmed?1:2);assert.equal(closed,confirmed);assert.equal(commits,confirmed?1:0);
});
for(const confirmed of [false,true])test(`Reactivate Member ${confirmed?'confirmed':'cancelled'} records the date/reason without restoring old parties`,async()=>{
  const member={id:'one',name:'Test',status:'inactive',inactiveSince:'2026-10-01',inactiveReason:'Left Guild'};
  const state={assignments:{main_1:[null,'Other']}};let closed=false,commits=0,history;
  const context={state,memberByName:{Test:member},memberById:{one:member},statusModalMemberName:'Test',statusModalMode:'reactivate',userCanEdit:()=>true,confirmPlannerAction:async()=>confirmed,
    document:{getElementById:id=>({value:id==='statusDateInput'?'2026-11-02':'Returned to Guild'})},normalizeDateValue:x=>x,
    closeStatusModal:()=>closed=true,isActiveMember:m=>m.status!=='inactive',touchMember(){},appendMembershipHistory:(...args)=>history=args,clearSelections(){},commitMutation:()=>commits++,showToast(){}};
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf('  async function saveStatusModal('),source.indexOf('  function appendMembershipHistory(')),context);
  await context.saveStatusModal();
  assert.equal(member.status,confirmed?'active':'inactive');assert.equal(closed,confirmed);assert.equal(commits,confirmed?1:0);assert.equal(state.assignments.main_1[0],null);
  if(confirmed){assert.equal(member.lastReturned,'2026-11-02');assert.equal(history[1],'reactivated');assert.equal(history[3],'Returned to Guild');}
});
