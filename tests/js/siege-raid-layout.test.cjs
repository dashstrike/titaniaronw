const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/pages/index.js','utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  const c={stringValue:v=>String(v??''),toInt:(v,min,max)=>Math.max(min,Math.min(max,parseInt(v)||0)),normalizeDateValue:()=>'',normalizeTimestampValue:()=>'',makeId:()=> 'generated'};
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf('  const CONFIG'),source.indexOf('  let state =')),c);
  vm.runInContext(source.slice(source.indexOf('  function createDefaultRaidLeaders('),source.indexOf('  function rebuildIndex(')),c);
  vm.runInContext(source.slice(source.indexOf('  function cloneJson('),source.indexOf('  function revisionConflict(')),c);
  c.state=c.normalizeClientState({});c.currentEvent='siege';c.userCanEdit=()=>true;c.showToast=()=>{};c.clearSelections=()=>{};
  c.raidForTeam=key=>c.currentSiegeRaids().find(raid=>raid.keys.includes(key));
  c.commitMutation=()=>{c.saves=(c.saves||0)+1;c.normalizeSiegeRaidGroups(c.state.siegeRaidGroups);};
  c.confirmPlannerAction=async()=>true;
  vm.runInContext(fs.readFileSync('public/js/siege-raid-controls.js','utf8'),c);
  return c;
}
test('legacy Siege retains seven raids and all 30 party identities',()=>{
  const c=fixture();assert.deepEqual(plain(c.currentSiegeRaids().map(r=>r.keys.length)),[4,4,4,5,5,4,4]);
  assert.equal(new Set(c.currentSiegeRaids().flatMap(r=>r.keys)).size,30);
});
test('Siege moves across legacy main/sub keys, keeps players and permits eight parties',()=>{
  const c=fixture();c.state.assignments.siege_sub_1[0]='Player';
  for(let i=1;i<=4;i++)c.moveSiegePartyToRaid('siege_sub_'+i,'siege_raid_1');
  assert.equal(c.state.siegeRaidGroups.siege_raid_1.length,8);assert.equal(c.state.assignments.siege_sub_1[0],'Player');
  assert.equal(c.canMoveSiegeParty('siege_sub_17','siege_raid_1').reason,'maximum');
  c.moveSiegePartyToRaid('siege_sub_17','siege_raid_2');
  assert.equal(c.currentSiegeRaids().length,6);assert.equal(c.currentSiegeRaids().flatMap(r=>r.keys).length,30);
  assert.equal(c.state.raidModes.siege_sub_raid_1,'ATK');
});
test('Siege swap reorders party keys without swapping player slots',()=>{
  const c=fixture();c.state.assignments.siege_main_1[0]='Player';c.swapSiegeParties('siege_main_1','siege_main_2');
  assert.deepEqual(plain(c.state.siegeRaidGroups.siege_raid_1.slice(0,2)),['siege_main_2','siege_main_1']);
  assert.equal(c.state.assignments.siege_main_1[0],'Player');assert.equal(c.saves,1);
});
test('Siege creates raids eight through ten, rejects an eleventh and shows the add control below the limit',()=>{
  const c=fixture();assert.match(c.siegeNewRaidHtml(),/Add raid/);
  c.moveSiegePartyToRaid('siege_main_1','new_siege');
  c.moveSiegePartyToRaid('siege_main_2','new_siege');
  c.moveSiegePartyToRaid('siege_main_3','new_siege');
  assert.equal(c.currentSiegeRaids().length,10);assert.equal(c.currentSiegeRaids().flatMap(r=>r.keys).length,30);
  assert.deepEqual(plain(c.state.siegeRaidGroups.siege_raid_8),['siege_main_1']);
  assert.deepEqual(plain(c.state.siegeRaidGroups.siege_raid_10),['siege_main_3']);
  assert.equal(c.canMoveSiegeParty('siege_main_5','new_siege').reason,'raidMaximum');assert.equal(c.siegeNewRaidHtml(),'');
  assert.deepEqual(plain(c.normalizeClientState(c.plannerSnapshot(c.state)).siegeRaidGroups),plain(c.state.siegeRaidGroups));
  c.state.siegeRaidGroups={siege_raid_1:['siege_main_1','siege_sub_1']};
  c.moveSiegePartyToRaid('siege_sub_1','new_siege');assert.equal(c.currentSiegeRaids().length,2);
  assert.deepEqual(plain(c.state.siegeRaidGroups.siege_raid_2),['siege_sub_1']);
  assert.equal(c.canMoveSiegeParty('siege_main_1','new_siege').reason,'newMinimum');
  c.addSiegeRaid();assert.deepEqual(plain(c.state.siegeRaidGroups.siege_raid_3),['siege_main_2']);
});
test('Siege removal needs confirmation, returns players to pool, preserves members and last raid',async()=>{
  const c=fixture();c.state.roster=[{id:'1',name:'Player'}];c.state.assignments.siege_main_1[0]='Player';
  c.confirmPlannerAction=async()=>false;await c.removeSiegeGroup('siege_raid_1');assert.equal(c.currentSiegeRaids().length,7);
  c.confirmPlannerAction=async()=>true;await c.removeSiegeGroup('siege_raid_1');
  assert.equal(c.currentSiegeRaids().length,6);assert.equal(c.state.assignments.siege_main_1[0],null);assert.equal(c.state.roster.length,1);
  c.state.siegeRaidGroups={siege_raid_2:['siege_main_5']};await c.removeSiegeGroup('siege_raid_2');assert.equal(c.currentSiegeRaids().length,1);
});
test('Siege layout survives save/reload without resurrecting removed raids',()=>{
  const c=fixture();c.state.siegeRaidGroups={siege_raid_1:['siege_sub_1','siege_main_1']};
  const loaded=c.normalizeClientState(c.plannerSnapshot(c.state));
  assert.deepEqual(plain(loaded.siegeRaidGroups),plain(c.state.siegeRaidGroups));
  assert.equal(c.currentSiegeRaids(loaded).length,1);
  assert.throws(()=>c.normalizeClientState({roster:[{id:'1',name:'Player'}],assignments:{siege_main_2:['Player']},siegeRaidGroups:c.state.siegeRaidGroups}),/omits an occupied party/);
});
test('Siege rejects duplicate, unknown and oversized parties',()=>{
  const c=fixture();
  for(const groups of [{siege_raid_11:['siege_main_1']},{siege_raid_1:[]},{siege_raid_1:['main_1']},{siege_raid_1:['siege_main_1','siege_main_1']},{siege_raid_1:Array.from({length:9},(_,i)=>'siege_main_'+(i+1))}])assert.throws(()=>c.normalizeSiegeRaidGroups(groups));
});
test('concurrent Siege layout/assignment edits conflict while unrelated GL edits merge',()=>{
  const c=fixture(),base=c.plannerSnapshot(c.state),local=plain(base),remote=plain(base);
  local.siegeRaidGroups.siege_raid_1.reverse();remote.assignments.siege_main_1[0]='Remote';
  assert.throws(()=>c.mergePlannerSnapshots(base,local,remote),/Siege changed/);assert.throws(()=>c.mergePlannerSnapshots(base,remote,local),/Siege changed/);
  remote.assignments.siege_main_1[0]=null;remote.raidTeamNames.raid_1='GL';
  assert.equal(c.mergePlannerSnapshots(base,local,remote).raidTeamNames.raid_1,'GL');
});
test('viewer cannot move, swap, add or remove Siege raids',async()=>{
  const c=fixture(),before=plain(c.state);c.userCanEdit=()=>false;
  c.moveSiegePartyToRaid('siege_main_1','siege_raid_2');c.swapSiegeParties('siege_main_1','siege_main_2');c.addSiegeRaid();await c.removeSiegeGroup('siege_raid_1');
  assert.deepEqual(plain(c.state),before);
});
test('public Siege follows saved order, hides empty raids and has no battlefield headings',()=>{
  const c={document:{body:{dataset:{view:'siege'}},addEventListener(){}}};vm.createContext(c);
  vm.runInContext(fs.readFileSync('public/js/pages/siege.js','utf8'),c);
  vm.runInContext("state=normalize({siegeRaidGroups:{siege_raid_10:['siege_sub_1','siege_main_1'],siege_raid_2:['siege_main_2']},assignments:{siege_sub_1:['Player']}})",c);
  const html=c.renderGuild();assert.equal((html.match(/raid-block card/g)||[]).length,1);assert.equal((html.match(/<article/g)||[]).length,2);
  assert.equal(c.teamLabel('siege_sub_1'),'Party 2');assert.equal(c.teamLabel('siege_main_1'),'Party 3');assert.doesNotMatch(html,/Main Battlefield|Sub Battlefield/);
});
