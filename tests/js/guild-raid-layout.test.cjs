const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/pages/index.js','utf8');
function fixture(){
  const context={stringValue:v=>String(v??''),toInt:(v,min,max)=>Math.max(min,Math.min(max,parseInt(v)||0)),normalizeDateValue:()=>'',normalizeTimestampValue:()=>'',makeId:()=> 'generated'};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const CONFIG'),source.indexOf('  let state =')),context);
  vm.runInContext(source.slice(source.indexOf('  function createDefaultRaidLeaders('),source.indexOf('  function rebuildIndex(')),context);
  vm.runInContext(source.slice(source.indexOf('  function cloneJson('),source.indexOf('  function revisionConflict(')),context);
  context.state=context.normalizeClientState({});
  return context;
}
const plain=value=>JSON.parse(JSON.stringify(value));
function twoMain(c){const groups=c.createDefaultGuildRaidGroups();groups.raid_1=Array.from({length:6},(_,i)=>`main_${i+1}`);groups.raid_2=Array.from({length:6},(_,i)=>`main_${i+7}`);delete groups.raid_3;return groups;}
test('legacy layouts retain exact existing 3-main / 4-sub grouping',()=>{
  const c=fixture(),raids=c.currentGuildRaids();
  assert.deepEqual(plain(raids.map(r=>r.keys.length)),[4,4,4,5,5,4,4]);
  assert.equal(new Set(raids.flatMap(r=>r.keys)).size,30);
});
test('two 30-player main raids retain assignments, roles, names and modes on save/reload',()=>{
  const c=fixture(),groups=twoMain(c);
  const loaded=c.normalizeClientState({guildRaidGroups:groups,roster:[{id:'1',name:'Leader',cls:'Scholar'}],assignments:{main_6:['Leader']},raidLeaders:{raid_1:'Leader'},raidCommanders:{raid_1:'Leader'},raidTeamNames:{raid_1:'ALPHA'},raidModes:{raid_1:'MVP'}});
  assert.equal(loaded.assignments.main_6[0],'Leader');
  assert.equal(loaded.raidLeaders.raid_1,'Leader');assert.equal(loaded.raidCommanders.raid_1,'Leader');
  assert.equal(loaded.raidTeamNames.raid_1,'ALPHA');assert.equal(loaded.raidModes.raid_1,'MVP');
  assert.deepEqual(plain(c.currentGuildRaids(loaded,'main').map(r=>r.keys.length)),[6,6]);
  assert.deepEqual(plain(c.normalizeClientState(c.plannerSnapshot(loaded)).guildRaidGroups),plain(groups));
});
test('limits reject zero/six raids, nine parties, duplicates, cross-field parties and excess capacity',()=>{
  const c=fixture(),base=c.createDefaultGuildRaidGroups();
  const invalid=[{}, {...base,raid_1:[]},{...base,raid_6:['main_1']},{...base,raid_1:Array.from({length:9},(_,i)=>`main_${i+1}`)},
    {...base,raid_1:['main_13']},{...base,sub_raid_1:['sub_19']},{...base,raid_1:['sub_1']},{...base,raid_1:['main_5']},null];
  for(const groups of invalid)assert.throws(()=>c.normalizeGuildRaidGroups(groups));
  assert.deepEqual(plain(c.normalizeGuildRaidGroups({raid_5:['main_1'],sub_raid_5:['sub_18']})),{raid_5:['main_1'],sub_raid_5:['sub_18']});
});
test('occupied parties cannot silently disappear during reload/import',()=>{
  const c=fixture();
  assert.throws(()=>c.normalizeClientState({guildRaidGroups:{raid_1:['main_2'],sub_raid_1:['sub_1']},roster:[{id:'1',name:'Player'}],assignments:{main_1:['Player']}}),/omits an occupied party/);
});
test('concurrent GL assignment/layout edits conflict; unrelated Siege edits merge',()=>{
  const c=fixture(),base=c.plannerSnapshot(c.state),local=plain(base),remote=plain(base);
  local.guildRaidGroups=twoMain(c);remote.assignments.main_1[0]='Remote';
  assert.throws(()=>c.mergePlannerSnapshots(base,local,remote),/Guild League changed/);
  assert.throws(()=>c.mergePlannerSnapshots(base,remote,local),/Guild League changed/);
  remote.assignments.main_1[0]=null;remote.raidTeamNames.siege_raid_1='New Siege';
  const merged=c.mergePlannerSnapshots(base,local,remote);
  assert.deepEqual(plain(merged.guildRaidGroups),plain(local.guildRaidGroups));assert.equal(merged.raidTeamNames.siege_raid_1,'New Siege');
});
test('public GL follows grouping and hides wholly empty raids while retaining partial ones',()=>{
  const c={document:{body:{dataset:{view:'guild'}},addEventListener(){}}};vm.createContext(c);
  vm.runInContext(fs.readFileSync('public/js/pages/guild-league.js','utf8'),c);
  vm.runInContext(`state=normalize({guildRaidGroups:{raid_5:['main_1','main_2'],sub_raid_1:['sub_1']},assignments:{main_2:['Player']},raidModes:{raid_5:'MVP'}});`,c);
  const html=c.renderGuild();assert.equal((html.match(/raid-block card/g)||[]).length,1);assert.equal((html.match(/<article/g)||[]).length,2);assert.match(html,/MVP/);
  vm.runInContext('state.assignments={};',c);assert.doesNotMatch(c.renderGuild(),/raid-block card/);
});
test('public GL party numbers follow saved order in both battlefields',()=>{
  const c={document:{body:{dataset:{view:'guild'}},addEventListener(){}}};vm.createContext(c);
  vm.runInContext(fs.readFileSync('public/js/pages/guild-league.js','utf8'),c);
  vm.runInContext(`state=normalize({guildRaidGroups:{raid_1:['main_2','main_1'],sub_raid_1:['sub_2','sub_1']},assignments:{main_2:['First'],sub_2:['Second']}});`,c);
  assert.equal(c.teamLabel('main_2'),'Party 1');assert.equal(c.teamLabel('main_1'),'Party 2');
  assert.equal(c.teamLabel('sub_2'),'Party 1');assert.equal(c.teamLabel('sub_1'),'Party 2');
});

function controls(){
  const c=fixture();c.currentEvent='guild_league';c.userCanEdit=()=>true;c.showToast=()=>{};c.clearSelections=()=>{};
  c.raidForTeam=key=>c.currentGuildRaids().find(raid=>raid.keys.includes(key));
  c.commitMutation=()=>c.normalizeGuildRaidGroups(c.state.guildRaidGroups);
  c.confirmPlannerAction=async()=>true;
  vm.runInContext(fs.readFileSync('public/js/guild-raid-controls.js','utf8'),c);return c;
}
test('drag creates raids up to five, rejects a sixth and preserves party identities',()=>{
  const c=controls();c.moveGuildPartyToRaid('main_1','new_main');c.moveGuildPartyToRaid('main_2','new_main');
  assert.equal(c.currentGuildRaids(c.state,'main').length,5);
  assert.equal(c.canMoveGuildParty('main_3','new_main').reason,'raidMaximum');
  assert.equal(new Set(c.currentGuildRaids(c.state,'main').flatMap(r=>r.keys)).size,12);
  assert.equal(c.canMoveGuildParty('sub_1','raid_1').reason,'battlefield');
  assert.equal(c.canMoveGuildParty('main_3','siege_raid_1').reason,'invalid');
});
test('moving the last party removes its source without losing a member',()=>{
  const c=controls();c.state.guildRaidGroups={raid_1:['main_1'],raid_2:['main_2'],sub_raid_1:['sub_1']};
  c.state.assignments.main_1=['Player',null,null,null,null];c.moveGuildPartyToRaid('main_1','raid_2');
  assert.equal(c.currentGuildRaids(c.state,'main').length,1);assert.equal(c.state.assignments.main_1[0],'Player');
  assert.deepEqual(plain(c.state.guildRaidGroups.raid_2),['main_2','main_1']);
});
test('inline removal/addition keeps one raid and party per battlefield',async()=>{
  const c=controls();c.state.guildRaidGroups={raid_1:['main_1'],sub_raid_1:['sub_1']};
  await c.removeGuildGroup('raid_1');
  assert.deepEqual(plain(c.state.guildRaidGroups),{raid_1:['main_1'],sub_raid_1:['sub_1']});
  assert.equal(c.canMoveGuildParty('main_1','new_main').reason,'newMinimum');
  c.addGuildRaid('main');
  assert.deepEqual(plain(c.state.guildRaidGroups.raid_2),['main_2']);
});
test('dropping one party on another swaps whole parties without changing members',()=>{
  const c=controls();c.state.assignments.main_1=['One',null,null,null,null];
  c.state.assignments.main_2=['Two',null,null,null,null];
  c.swapGuildParties('main_2','main_1');
  assert.deepEqual(plain(c.state.guildRaidGroups.raid_1.slice(0,2)),['main_2','main_1']);
  assert.equal(c.state.assignments.main_1[0],'One');assert.equal(c.state.assignments.main_2[0],'Two');
  c.swapGuildParties('main_2','main_1');
  assert.deepEqual(plain(c.state.guildRaidGroups.raid_1.slice(0,2)),['main_1','main_2']);
});
