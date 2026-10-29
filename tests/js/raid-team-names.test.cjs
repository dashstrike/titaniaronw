const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/pages/index.js','utf8');
const raids=[{id:'raid_1'},{id:'sub_raid_1'},{id:'siege_raid_1'},{id:'siege_sub_raid_1'}];
const stringValue=value=>String(value??'');
test('editing a team name saves separately without changing commander or mode',()=>{
  let change,keydown,commits=0;
  const input={dataset:{raidTeamName:'raid_1'},value:'  Dragons  ',addEventListener(type,handler){if(type==='change')change=handler;else keydown=handler;},blur(){change();}};
  const state={raidTeamNames:{raid_1:'Old team'},raidCommanders:{raid_1:'Commander'},raidModes:{raid_1:'MVP'}};
  const context={state,currentEvent:'guild_league',touchEventUpdate(){},renderEventLastUpdated(){},ALL_GUILD_STYLE_RAIDS:raids,stringValue,userCanEdit:()=>true,queueSave:()=>commits++,wrap:{querySelectorAll:()=>[input]}};
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf("    wrap.querySelectorAll('[data-raid-team-name]')"),source.indexOf("    wrap.querySelectorAll('[data-raid-mode-toggle]')")),context);
  keydown({key:'Enter',stopPropagation(){},preventDefault(){}});
  assert.equal(state.raidTeamNames.raid_1,'Dragons');assert.equal(state.raidCommanders.raid_1,'Commander');assert.equal(state.raidModes.raid_1,'MVP');assert.equal(commits,1);
  context.userCanEdit=()=>false;input.value='Blocked';change();assert.equal(state.raidTeamNames.raid_1,'Dragons');
});
test('management uses custom names independently with legacy fallback and explicit clearing',()=>{
  const context={state:{raidTeamNames:{raid_1:'Dragons',sub_raid_1:''},raidCommanders:{raid_1:'Commander',sub_raid_1:'Other',siege_raid_1:'Legacy'}},ALL_GUILD_STYLE_RAIDS:raids,stringValue};
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf('  function raidTeamName('),source.indexOf('  function raidForTeam(')),context);
  assert.equal(context.raidTeamName(raids[0]),'Dragons');assert.equal(context.raidTeamName(raids[1]),'Not assigned');assert.equal(context.raidTeamName(raids[2]),'Legacy');
});
for(const page of ['guild-league','siege'])test(`${page} public headers and party badges use the same custom name safely`,()=>{
  const script=fs.readFileSync(`public/js/pages/${page}.js`,'utf8');
  const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const raid={id:page==='siege'?'siege_raid_1':'raid_1',keys:['party1']};
  const context={state:{raidTeamNames:{[raid.id]:'<Dragon & Friends>'},raidCommanders:{[raid.id]:'Commander'},raidModes:{}},str:stringValue,esc:escape,MAIN_RAIDS:[raid],DEFAULT_SIEGE_RAIDS:[raid],slots:()=>[],teamNoHealer:()=>false,raidForParty:()=>raid,teamLabel:()=> 'Party 1'};
  vm.createContext(context);vm.runInContext(script.slice(script.indexOf('function raidBlock('),script.indexOf('function slotHtml(')),context);
  context.raidForParty=()=>raid;context.teamLabel=()=> 'Party 1';
  const html=context.raidBlock(raid,'main',false);
  assert.equal((html.match(/&lt;Dragon &amp; Friends&gt;/g)||[]).length,2);assert.doesNotMatch(html,/TEAM.*Commander/);
});
test('team names participate in snapshots and concurrent per-raid merge',()=>{
  const context={state:{},cloneJson:value=>JSON.parse(JSON.stringify(value)),ALL_KEYS:[],ALL_RAIDS:[],ALL_GUILD_STYLE_RAIDS:raids,MAIN_RAIDS:[],SUB_RAIDS:[],ALL_SIEGE_RAIDS:[],sameJson:(a,b)=>JSON.stringify(a)===JSON.stringify(b),createEmptyAssignments:()=>({}),createDefaultRaidCommanders:()=>({}),createDefaultRaidLeaders:()=>({}),createDefaultRaidModes:()=>({}),createDefaultSiegeRaidGroups:()=>({}),mergeRosterThreeWay:()=>[],mergeHistoryThreeWay:()=>[],normalizeClientState:x=>x,stringValue};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function plannerSnapshot('),source.indexOf('  function mergeRosterThreeWay(')),context);
  vm.runInContext(source.slice(source.indexOf('  function mergePlannerSnapshots('),source.indexOf('\n  function ',source.indexOf('  function mergePlannerSnapshots(')+5)),context);
  const base={raidTeamNames:{raid_1:'Old',siege_raid_1:'Old Siege'}};
  const result=context.mergePlannerSnapshots(base,{raidTeamNames:{...base.raidTeamNames,raid_1:'New'}},{raidTeamNames:{...base.raidTeamNames,siege_raid_1:'New Siege'}});
  assert.equal(result.raidTeamNames.raid_1,'New');assert.equal(result.raidTeamNames.siege_raid_1,'New Siege');
});
