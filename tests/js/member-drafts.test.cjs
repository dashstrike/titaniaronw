const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/pages/index.js','utf8');
const classes=JSON.parse(fs.readFileSync('public/images/job/job-catalog.json','utf8')).jobs.map(job=>job.name);

function fixture(){
  const member={id:'one',name:'Player A',cls:'High Priest',gr:50000,notes:'Saved notes',status:'active'};
  const other={id:'two',name:'Player B',cls:'Paladin',gr:40000,notes:'Other notes',status:'active'};
  const state={roster:[member,other],assignments:{main_1:['Player A'],siege_1:['Player A']}};
  const prompts=[],commits=[],toasts=[];
  let result={isConfirmed:true},canEdit=true,flushes=0;
  const Swal={fire:async options=>{prompts.push(options);return result;}};
  const context={state,memberById:{one:member,two:other},memberByName:{'Player A':member,'Player B':other},
    memberDrafts:new Map(),CLASSES:[...classes,'Unknown'],currentEvent:'manage_members',plannerConfirmationPending:false,
    userCanEdit:()=>canEdit,toInt:(value,min,max)=>Math.max(min,Math.min(max,Number.parseInt(value,10)||min)),
    rerenderManageMembers(){},showToast:(...args)=>toasts.push(args),
    touchMember:member=>{member.updatedAt='confirmed';},
    commitMutation(message){commits.push(message);context.dirty=true;},
    confirmPlannerAction:async(...args)=>{prompts.push(args);return (await result).isConfirmed;},
    window:{Swal},Swal,dirty:false,saveQueued:false,saveInFlight:false,
    flushSave:async()=>{flushes++;context.dirty=false;context.saveQueued=false;context.saveInFlight=false;},
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function stageMemberDraft('),source.indexOf('  function renderManageMembersHtml(')),context);
  return {context,member,other,state,prompts,commits,toasts,get flushes(){return flushes;},setResult:value=>{result=value;},setPermission:value=>{canEdit=value;}};
}

test('class and GR edits remain outside saved state until explicit confirmation, and reverting removes drafts',()=>{
  const f=fixture(),before=JSON.stringify(f.state);
  f.context.stageMemberDraft('one',{cls:'Scholar',gr:60000});
  assert.equal(JSON.stringify(f.state),before);
  assert.equal(f.commits.length,0);
  assert.deepEqual({...f.context.memberDrafts.get('one')},{cls:'Scholar',gr:60000});
  f.context.stageMemberDraft('one',{cls:'High Priest'});
  assert.deepEqual({...f.context.memberDrafts.get('one')},{gr:60000});
  f.context.stageMemberDraft('one',{gr:50000});
  assert.equal(f.context.memberDrafts.size,0);
});

test('inline Select2 class selection creates a draft and shows Save without opening SweetAlert2',()=>{
  const f=fixture(),configurations=[],handlers={},destroyed=[];
  const actions=[{hidden:true},{hidden:true}];
  const row={querySelectorAll:()=>actions};
  const select={value:'High Priest',dataset:{memberId:'one'},closest:()=>row};
  const root={querySelectorAll:()=>[select]};
  const wrapper={
    select2(config){if(config==='destroy')destroyed.push(select);else configurations.push(config);return this;},
    on(event,handler){handlers[event]=handler;return this;},hasClass:()=>true,
  };
  const jQuery=()=>wrapper;jQuery.fn={select2(){}};
  Object.assign(f.context,{jQuery,document:{getElementById:()=>null}});f.context.window.jQuery=jQuery;
  f.context.initMemberClassSelects(root);
  assert.equal(configurations[0].minimumResultsForSearch,0);
  assert.equal(f.context.memberDrafts.size,0,'opening the dropdown does not change the member');
  select.value='Scholar';handlers['change.memberClassDraft']();
  assert.equal(f.context.memberDrafts.get('one').cls,'Scholar');
  assert.equal(actions[0].hidden,false);assert.equal(actions[1].hidden,false);
  assert.equal(f.member.cls,'High Priest');
  assert.equal(f.commits.length,0);assert.equal(f.prompts.length,0);
  f.context.destroyMemberClassSelects(root);
  assert.equal(destroyed.length,1);
});

test('cancelled Save keeps the draft and never mutates the roster',async()=>{
  const f=fixture(),before=JSON.stringify(f.state);
  f.context.stageMemberDraft('one',{cls:'Scholar',gr:60000});
  f.setResult({isConfirmed:false});
  assert.equal(await f.context.reviewMemberDrafts(['one']),false);
  assert.equal(JSON.stringify(f.state),before);
  assert.equal(f.context.memberDrafts.size,1);
  assert.equal(f.commits.length,0);
  assert.match(f.prompts[0].text,/High Priest → Scholar/);
  assert.match(f.prompts[0].text,/50000 → 60000/);
});

test('confirmed row Save applies only its reviewed fields and leaves other drafts and lineups unchanged',async()=>{
  const f=fixture(),assignments=JSON.stringify(f.state.assignments);
  f.context.stageMemberDraft('one',{cls:'Scholar',gr:60000});
  f.context.stageMemberDraft('two',{gr:55000});
  f.member.notes='Remote note update';
  assert.equal(await f.context.reviewMemberDrafts(['one']),true);
  assert.equal(f.member.cls,'Scholar');
  assert.equal(f.member.gr,60000);
  assert.equal(f.member.notes,'Remote note update');
  assert.equal(f.member.updatedAt,'confirmed');
  assert.equal(f.other.gr,40000);
  assert.equal(f.context.memberDrafts.has('one'),false);
  assert.equal(f.context.memberDrafts.has('two'),true);
  assert.equal(JSON.stringify(f.state.assignments),assignments);
  assert.equal(f.commits.length,1);
});

test('Save all reviews once and applies all members together',async()=>{
  const f=fixture();
  f.context.stageMemberDraft('one',{cls:'Scholar'});
  f.context.stageMemberDraft('two',{cls:'Stalker'});
  assert.equal(await f.context.reviewMemberDrafts(['one','two']),true);
  assert.equal(f.prompts.length,1);
  assert.match(f.prompts[0].title,/2 members/);
  assert.equal(f.member.cls,'Scholar');assert.equal(f.other.cls,'Stalker');
  assert.equal(f.context.memberDrafts.size,0);
  assert.equal(f.commits.length,1);
});

test('changes arriving during confirmation cannot be overwritten by a stale review',async()=>{
  const f=fixture();
  f.context.stageMemberDraft('one',{cls:'Scholar'});
  let answer;
  f.setResult(new Promise(resolve=>{answer=resolve;}));
  const saving=f.context.reviewMemberDrafts(['one']);
  assert.equal(f.member.cls,'High Priest');
  f.member.cls='Sage';
  answer({isConfirmed:true});
  assert.equal(await saving,false);
  assert.equal(f.member.cls,'Sage');
  assert.equal(f.commits.length,0);
  assert.equal(f.context.memberDrafts.size,1);
});

test('missing SweetAlert2 and lost edit permission fail closed without saving',async()=>{
  const f=fixture();
  f.setPermission(false);
  f.context.stageMemberDraft('one',{cls:'Scholar'});
  assert.equal(f.context.memberDrafts.size,0);
  f.setPermission(true);f.context.stageMemberDraft('one',{cls:'Scholar'});
  f.context.window.Swal=null;
  assert.equal(await f.context.reviewMemberDrafts(['one']),false);
  assert.equal(f.commits.length,0);
  f.context.window.Swal=f.context.Swal;
  let answer;
  f.setResult(new Promise(resolve=>{answer=resolve;}));
  const saving=f.context.reviewMemberDrafts(['one']);
  f.setPermission(false);answer({isConfirmed:true});
  assert.equal(await saving,false);
  assert.equal(f.member.cls,'High Priest');
});

test('leaving Members supports Save, Discard, and Keep editing; Save waits for persistence',async()=>{
  for(const answer of [{isConfirmed:true},{isDenied:true},{isDismissed:true}]){
    const f=fixture();
    f.context.stageMemberDraft('one',{gr:60000});
    f.setResult(answer);
    const leave=await f.context.resolveMemberDraftNavigation();
    assert.equal(leave,!answer.isDismissed);
    assert.equal(f.member.gr,answer.isConfirmed?60000:50000);
    assert.equal(f.context.memberDrafts.size,answer.isDismissed?1:0);
    assert.equal(f.flushes,answer.isConfirmed?1:0);
    assert.equal(f.prompts[0].showDenyButton,true);
  }
});

test('inline GR events show Save/Discard in Actions without saving on input or blur',async()=>{
  const f=fixture(),handlers={};
  const save={hidden:true,dataset:{memberId:'one'},addEventListener:(event,fn)=>handlers.save=fn};
  const discard={hidden:true,dataset:{memberId:'one'},addEventListener(){}};
  const row={querySelectorAll:()=>[save,discard]};
  const input={value:'61000',dataset:{memberId:'one'},closest:()=>row,addEventListener:(event,fn)=>handlers[event]=fn};
  const notice={hidden:true,querySelector:()=>({textContent:''})};
  const root={querySelector:()=>null,querySelectorAll:selector=>({'.dash-row-gr':[input],'.dash-row-save':[save],'.dash-row-discard':[discard]})[selector]||[]};
  f.context.document={getElementById:id=>id==='teamsWrap'?root:id==='dashDraftNotice'?notice:null};
  vm.runInContext(source.slice(source.indexOf('  function wireDashboard(){'),source.indexOf('  function cloneJson(')),f.context);
  f.context.wireDashboard();
  handlers.input();
  assert.equal(save.hidden,false);assert.equal(discard.hidden,false);assert.equal(notice.hidden,false);
  assert.equal(f.member.gr,50000);assert.equal(f.commits.length,0);
  assert.equal(handlers.change,undefined);
  await handlers.save();
  assert.equal(f.member.gr,61000);assert.equal(f.commits.length,1);
});

test('rendering uses draft values and shows explicit row Save buttons while keeping saved data intact',()=>{
  const f=fixture();
  Object.assign(f.context,{dashboardSelected:new Set(),dashboardVisibleMembers:()=>f.state.roster,
    activeRoster:()=>f.state.roster,dashboardSearch:'',dashboardGuildStatusFilter:'Active',dashboardSortBy:'name',dashboardSortDir:'asc',dashboardClassFilter:'All',
    dashboardAvailableClasses:()=>[],sectionHeader:()=>'',escapeHtml:String,escapeAttr:String,classColor:()=> '#579ed3',formatMemberUpdate:String,
  });
  vm.runInContext(source.slice(source.indexOf('  function renderManageMembersHtml(){'),source.indexOf('  function rerenderManageMembers(')),f.context);
  const original=f.context.renderManageMembersHtml();
  assert.match(original,/dash-row-save"[^>]*hidden/);
  f.context.stageMemberDraft('one',{cls:'Scholar',gr:60000});
  const draft=f.context.renderManageMembersHtml();
  assert.match(draft,/value="Scholar" selected/);
  assert.match(draft,/<select class="form-select form-select-sm dash-row-class"/);
  assert.match(draft,/dash-row-save" data-member-id="one" >/);
  assert.match(draft,/value="60000"/);
  assert.equal(f.member.cls,'High Priest');
});

test('bulk class, set GR, and adjust GR controls stage drafts without writing the saved roster',()=>{
  const f=fixture(),handlers={};
  const controls={dashBulkClass:{value:'Scholar'},dashBulkSet:{value:'60000'},dashBulkAdjust:{value:'500'}};
  const buttons=Object.fromEntries(['dashBulkClassBtn','dashBulkSetBtn','dashBulkAdjustBtn'].map(id=>[id,{addEventListener:(_event,fn)=>handlers[id]=fn}]));
  const root={querySelector:selector=>buttons[selector.slice(1)]||null,querySelectorAll:()=>[]};
  f.context.dashboardSelected=new Set(['Player A','Player B']);
  f.context.document={getElementById:id=>id==='teamsWrap'?root:controls[id]};
  vm.runInContext(source.slice(source.indexOf('  function wireDashboard(){'),source.indexOf('  function cloneJson(')),f.context);
  f.context.wireDashboard();
  handlers.dashBulkClassBtn();handlers.dashBulkSetBtn();handlers.dashBulkAdjustBtn();
  assert.equal(f.member.cls,'High Priest');assert.equal(f.other.cls,'Paladin');
  assert.equal(f.member.gr,50000);assert.equal(f.other.gr,40000);
  assert.equal(f.commits.length,0);
  for(const draft of f.context.memberDrafts.values())assert.deepEqual({...draft},{cls:'Scholar',gr:60500});
});

test('member detail form cancellation preserves name/class/notes; confirmed rename keeps identity and updates lineup references',async()=>{
  for(const confirmed of [false,true]){
    const f=fixture();
    f.state.raidCommanders={raid_1:'Player A'};f.state.raidLeaders={raid_1:'Player A'};
    Object.assign(f.context,{editingMemberName:'Player A',selectedMember:'Player A',CONFIG:{maxMembers:1000},NATIONALITIES:{malaysia:{}},
      ALL_KEYS:['main_1','siege_1'],ALL_RAIDS:[{id:'raid_1'}],ALL_GUILD_STYLE_RAIDS:[{id:'raid_1'}],dashboardSelected:new Set(['Player A']),
      stringValue:value=>String(value??''),closeMemberModal(){},
    });
    const values={memberNameInput:'Renamed',memberClassInput:'Scholar',memberGrInput:'61000',memberNationalityInput:'malaysia',memberNotesInput:'New notes'};
    f.context.document={getElementById:id=>({value:values[id]})};
    vm.runInContext(source.slice(source.indexOf('  async function saveMemberFromModal(){'),source.indexOf('  async function deleteMember(')),f.context);
    f.setResult({isConfirmed:confirmed});
    await f.context.saveMemberFromModal();
    assert.equal(f.member.id,'one');
    assert.equal(f.member.name,confirmed?'Renamed':'Player A');
    assert.equal(f.member.cls,confirmed?'Scholar':'High Priest');
    assert.equal(f.member.notes,confirmed?'New notes':'Saved notes');
    assert.equal(f.state.assignments.main_1[0],confirmed?'Renamed':'Player A');
    assert.equal(f.commits.length,confirmed?1:0);
    assert.match(f.prompts[0][1],/Saved notes → New notes/);
  }
});

test('status form requires confirmation before removing a member from event lineups',async()=>{
  for(const confirmed of [false,true]){
    const f=fixture();
    Object.assign(f.context,{statusModalMemberName:'Player A',statusModalMode:'inactive',ALL_KEYS:['main_1','siege_1'],
      dashboardSelected:new Set(),selectedMember:null,normalizeDateValue:value=>value,stringValue:String,
      closeStatusModal(){},appendMembershipHistory(){},clearSelections(){},
    });
    const values={statusDateInput:'2026-11-01',statusReasonInput:'Left Guild'};
    f.context.document={getElementById:id=>({value:values[id]})};
    vm.runInContext(source.slice(source.indexOf('  async function saveStatusModal(){'),source.indexOf('  function appendMembershipHistory(')),f.context);
    f.setResult({isConfirmed:confirmed});
    await f.context.saveStatusModal();
    assert.equal(f.member.status,confirmed?'inactive':'active');
    assert.equal(f.state.assignments.main_1[0],confirmed?null:'Player A');
    assert.equal(f.commits.length,confirmed?1:0);
  }
});
