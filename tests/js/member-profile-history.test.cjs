const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/member-profile-enhancements.js','utf8');
function placement(){const c={};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  function glPlacement('),source.indexOf('  function siegePlacement(')),c);return c.glPlacement;}
test('GL placement receives its own state without relying on a page-global variable',()=>{
  const result=placement()({assignments:{main_2:['Player']},guildRaidGroups:{raid_5:['main_2']}},'Player');
  assert.equal(result.raid,'Raid 5');assert.equal(result.teamKey,'main_2');
});
test('legacy GL layouts and unassigned members retain their fallback behavior',()=>{
  const gl=placement();assert.equal(gl({assignments:{sub_18:['Player']}},'Player').raid,'Raid 2');assert.equal(gl({},'Player'),null);
});
async function bootHistory(assigned){
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{id,textContent:'',innerHTML:'',style:{},querySelector(){return null;}});return nodes.get(id);};
  node('profile').style.display='block';
  for(const [panel,wrap] of [['nameHistoryPanel','nameHistoryWrap'],['classHistoryPanel','classHistoryWrap']])node(panel).querySelector=()=>node(wrap);
  const values={planner_state:{state:{roster:[{id:'member1',name:'Player',cls:'Scholar'}],assignments:assigned?{main_1:['Player']}:{},guildRaidGroups:{raid_1:['main_1']}}},party_star_selections:[],member_csv_data:null,
    name_history:[{old_name:'Old <Name>',new_name:'Player',changed_at:'2026-11-01T12:00:00Z'}],class_history:[{old_class:'Sage',new_class:'Scholar',changed_at:'2026-11-01T12:00:00Z'}]};
  const client={from(table){const query={select(){return query;},eq(){return query;},order(){return query;},single(){return query;},maybeSingle(){return query;},then(resolve){return Promise.resolve({data:values[table]}).then(resolve);}};return query;}};
  const c={window:{TITANIA_CONFIG:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'fake'},supabase:{createClient:()=>client}},document:{documentElement:{dataset:{titaniaPage:'member'}},head:{appendChild(){}},getElementById:id=>id==='member-profile-enhancements-style'?{}:id==='gainTotal'||id==='trackingSince'?null:node(id)},location:{search:'?id=member1'},URLSearchParams,fetch:async()=>({ok:true,json:async()=>({})}),setInterval(){throw Error('Unexpected loading loop');},clearInterval(){}};
  vm.createContext(c);
  const start=source.indexOf("  if(document.readyState==='loading')");
  vm.runInContext(source.slice(0,start)+'window.runHistoryBoot=boot;})();',c);
  await c.window.runHistoryBoot();return nodes;
}
for(const assigned of [true,false])test('profile histories render for '+(assigned?'GL-assigned':'unassigned')+' members',async()=>{
  const nodes=await bootHistory(assigned);
  assert.match(nodes.get('nameHistoryWrap').innerHTML,/Old &lt;Name&gt;/);assert.match(nodes.get('nameHistoryWrap').innerHTML,/Player/);
  assert.match(nodes.get('classHistoryWrap').innerHTML,/Sage/);assert.match(nodes.get('classHistoryWrap').innerHTML,/Scholar/);
  assert.doesNotMatch(nodes.get('nameHistoryWrap').innerHTML,/Loading/);
});
