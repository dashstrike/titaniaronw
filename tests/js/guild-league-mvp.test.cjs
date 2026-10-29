const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../public/js/pages/index.js'),'utf8');
const MAIN_RAIDS=[{id:'raid_1'},{id:'raid_2'},{id:'raid_3'}],SUB_RAIDS=[{id:'sub_raid_1'}],ALL_SIEGE_RAIDS=[{id:'siege_raid_1'}];
test('reload normalization preserves MVP only for Guild League main raids',()=>{
  const start=source.indexOf('  function createDefaultRaidModes(){');
  const end=source.indexOf('\n  function ',source.indexOf('  function normalizeRaidModes('));
  const context={MAIN_RAIDS,SUB_RAIDS,ALL_GUILD_STYLE_RAIDS:[...MAIN_RAIDS,...SUB_RAIDS,...ALL_SIEGE_RAIDS],stringValue:value=>String(value??'')};
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  const modes=context.normalizeRaidModes({raid_1:' mvp ',raid_2:'DEF',sub_raid_1:'TOP',siege_raid_1:'DEF'});
  assert.equal(modes.raid_1,'MVP');assert.equal(modes.raid_2,'DEF');assert.equal(modes.sub_raid_1,'TOP');assert.equal(modes.siege_raid_1,'DEF');
  const invalid=context.normalizeRaidModes({sub_raid_1:'MVP',siege_raid_1:'MVP'});
  assert.equal(invalid.sub_raid_1,'MID');assert.equal(invalid.siege_raid_1,'ATK');
});
function fixture(id,initial,fail=false){
  let handler;const calls=[],commits=[];
  const button={dataset:{raidModeToggle:id},addEventListener(_,callback){handler=callback;}};
  const context={wrap:{querySelectorAll:()=>[button]},MAIN_RAIDS,SUB_RAIDS,ALL_SIEGE_RAIDS,state:{raidModes:{[id]:initial}},
    quickSaveInFlight:0,createDefaultRaidModes:()=>({}),commitMutation:message=>commits.push(message),
    renderAll(){},setSaveFlag(){},callServer:async(method,raid,mode)=>{calls.push({method,raid,mode});if(fail)throw new Error('Save failed');return {mode,revision:1,updatedAt:'2026-10-29T00:00:00Z'};},
    stringValue:value=>String(value??''),toInt:value=>value,currentEditorName:()=> 'Test admin',touchEventUpdate(){},renderEventLastUpdated(){},queueSave(){},showToast(){},errorMessage:error=>error.message,
  };
  const start=source.indexOf("    wrap.querySelectorAll('[data-raid-mode-toggle]')");
  const end=source.indexOf("wrap.querySelectorAll('[data-raid-commander-drop]')",start);
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  return {context,calls,commits,click:()=>handler({preventDefault(){},stopPropagation(){}})};
}
test('GL cycles ATK to DEF to MVP to ATK and saves the selected mode',async()=>{
  const f=fixture('raid_1','ATK');
  for(const expected of ['DEF','MVP','ATK']){await f.click();assert.equal(f.context.state.raidModes.raid_1,expected);assert.equal(f.calls.at(-1).mode,expected);}
  assert.equal(f.context.quickSaveInFlight,0);
});
test('Siege and Sub Battlefield cycles are unchanged',async()=>{
  const siege=fixture('siege_raid_1','ATK');await siege.click();assert.equal(siege.context.state.raidModes.siege_raid_1,'DEF');
  await siege.click();assert.equal(siege.context.state.raidModes.siege_raid_1,'ATK');assert.equal(siege.calls.length,0);
  const sub=fixture('sub_raid_1','MID');for(const expected of ['TOP','BOTTOM','MID']){await sub.click();assert.equal(sub.context.state.raidModes.sub_raid_1,expected);}assert.equal(sub.calls.length,0);
});
test('a failed MVP save restores DEF instead of losing the previous mode',async()=>{
  const f=fixture('raid_1','DEF',true);await f.click();assert.equal(f.calls[0].mode,'MVP');assert.equal(f.context.state.raidModes.raid_1,'DEF');assert.equal(f.context.quickSaveInFlight,0);
});
test('management renders the dragon with me-2 and preserves Siege/Sub controls',()=>{
  const context={MAIN_RAIDS,SUB_RAIDS,ALL_SIEGE_RAIDS,state:{raidModes:{raid_1:'MVP',siege_raid_1:'DEF',sub_raid_1:'BOTTOM'},raidCommanders:{},raidLeaders:{}},currentEvent:'guild_league',
    stringValue:value=>String(value??''),escapeHtml:String,userCanEdit:()=>true,raidLeaderIcon:()=>'',raidCommanderIcon:()=>'',teamCardHtml:()=>'',
  };
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf('  function mainRaidHtml('),source.indexOf('  function raidForTeam(')),context);
  const html=context.mainRaidHtml({id:'raid_1',keys:[]});assert.match(html,/fa-solid fa-dragon me-2/);assert.match(html,/>MVP<\/button>/);assert.match(html,/ATK, DEF and MVP/);
  const siege=context.mainRaidHtml({id:'siege_raid_1',keys:[]});assert.match(siege,/RESPAWN/);assert.doesNotMatch(siege,/fa-dragon/);
  const sub=context.mainRaidHtml({id:'sub_raid_1',keys:[]});assert.match(sub,/BTM/);assert.doesNotMatch(sub,/fa-dragon/);
});
test('public GL displays saved MVP rather than falling back to ATK',()=>{
  const publicSource=fs.readFileSync(path.join(__dirname,'../../public/js/pages/guild-league.js'),'utf8');
  const context={MAIN_RAIDS,state:{raidModes:{raid_1:'MVP'},raidCommanders:{}},str:value=>String(value??''),esc:String,teamCard:()=>''};
  vm.createContext(context);vm.runInContext(publicSource.slice(publicSource.indexOf('function raidBlock('),publicSource.indexOf('function teamCard(')),context);
  const html=context.raidBlock({id:'raid_1',keys:[]},'main',false);
  assert.match(html,/fa-solid fa-dragon me-2/);assert.match(html,/>MVP<\/span>/);
});
