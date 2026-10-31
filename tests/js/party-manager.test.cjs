const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('party dropdown excludes assigned players and responds to unsaved changes',()=>{
  const selects=[{value:'player-1'},{value:''},{value:'player-2'}];
  const grid={querySelectorAll:()=>selects};
  const configurations=new Map();
  const jQuery=select=>({select2:config=>configurations.set(select,config)});
  jQuery.fn={select2(){}};
  const context={window:{jQuery},jQuery,document:{getElementById:id=>id==='partyGrid'?grid:{} }};
  const source=fs.readFileSync('public/js/party-manager.js','utf8').replace('  boot();','  initSelect2();');
  vm.runInNewContext(source,context);
  const emptyMatcher=configurations.get(selects[1]).matcher;
  const assigned={id:'player-1',text:'CiTriX High Priest'};
  const available={id:'player-3',text:'New player Paladin'};
  assert.equal(emptyMatcher({},assigned),null);
  assert.equal(emptyMatcher({term:'CiTriX'},assigned),null);
  assert.equal(emptyMatcher({},available),available);
  assert.equal(configurations.get(selects[0]).matcher({},assigned),assigned);
  selects[0].value='';
  assert.equal(emptyMatcher({},assigned),assigned);
  selects[2].value='player-1';
  assert.equal(emptyMatcher({},assigned),null);
  assert.equal(emptyMatcher({term:'missing'},available),null);
  assert.equal(emptyMatcher({term:'paladin'},available),available);
});

function syncFixture(){
  const configurations=new Map(),events=new Map(),timers=new Map(),queries=[];
  const selects=[{value:'one',dataset:{party:'1'}},{value:'two',dataset:{party:'1'}}];
  for(const select of selects){
    Object.defineProperty(select,'innerHTML',{set(html){this.html=html;this.value='';}});
  }
  const slots=selects.map(select=>({querySelector:()=>select,classList:{toggle(){}}}));
  const count={textContent:''};
  const card={dataset:{partyCard:'1'},querySelectorAll:()=>selects,querySelector:()=>count};
  const grid={hidden:false,querySelector:()=>card,querySelectorAll(selector){
    if(selector==='.party-slot')return slots;
    if(selector==='.party-card')return [card];
    return selects;
  }};
  const stateBox={hidden:true},summary={};
  function node(tag){return {tag,children:[],appendChild(child){this.children.push(child);},append(...children){this.children.push(...children);}};}
  const document={hidden:false,createElement:node,getElementById:id=>({partyGrid:grid,state:stateBox,summary})[id]||{},
    addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  const jQuery=select=>({
    data:()=>configurations.has(select),
    select2(config){if(config==='destroy')configurations.delete(select);else configurations.set(select,config);}
  });
  jQuery.fn={select2(){}};
  let response={data:{state:{roster:[{id:'one',name:'Renamed',cls:'High Wizard'},{id:'two',name:'Other',cls:'Paladin'}]}}};
  const client={from(table){queries.push(table);return {select:()=>({eq:()=>({single:async()=>response})})};}};
  const window={jQuery,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  const context={window,document,jQuery,setInterval(fn,delay){timers.set(delay,fn);return delay;},clearInterval:id=>timers.delete(id)};
  const expose=`
    client=window.testClient;
    roster=[{id:'one',name:'Old name',cls:'Unknown'},{id:'two',name:'Other',cls:'Paladin'}];
    iconMap={'High Wizard':'wizard.webp','Paladin':'paladin.webp'};
    window.sync={refreshRoster,startRosterSync};
    initSelect2();`;
  window.testClient=client;
  vm.runInNewContext(fs.readFileSync('public/js/party-manager.js','utf8').replace('  boot();',expose),context);
  return {window,document,selects,configurations,stateBox,summary,count,queries,events,timers,setResponse:value=>{response=value;}};
}

test('saved member rename and class changes refresh labels, icons, and search without changing draft assignments',async()=>{
  const f=syncFixture();
  // Simulate a local move which has not been saved to party_templates.
  f.selects[0].value='two';f.selects[1].value='one';
  await f.window.sync.refreshRoster();
  assert.deepEqual(f.selects.map(select=>select.value),['two','one']);
  assert.match(f.selects[1].html,/Renamed · High Wizard/);
  assert.doesNotMatch(f.selects[1].html,/Old name/);
  const config=f.configurations.get(f.selects[1]);
  const label=config.templateSelection({id:'one'});
  assert.equal(label.children[0].src,'./images/job/wizard.webp');
  assert.equal(label.children[1].children[0].textContent,'Renamed');
  assert.equal(label.children[1].children[1].textContent,'High Wizard');
  const option={id:'one',text:'Renamed · High Wizard'};
  assert.equal(config.matcher({term:'Renamed'},option),option);
  assert.equal(config.matcher({term:'High Wizard'},option),option);
  assert.equal(config.matcher({term:'Old name'},option),null);
  assert.deepEqual(f.queries,['planner_state']);
  assert.equal(f.summary.textContent,'1/30 complete · 2/2 active members assigned');
});

test('inactive members clear automatically while deleted IDs remain explicit and counts update',async()=>{
  const f=syncFixture();
  f.setResponse({data:{state:{roster:[{id:'one',name:'Renamed',cls:'High Wizard',status:'inactive'}]}}});
  await f.window.sync.refreshRoster();
  assert.deepEqual(f.selects.map(select=>select.value),['','two']);
  assert.doesNotMatch(f.selects[0].html,/value="one"/);
  assert.match(f.selects[1].html,/selected disabled>Unavailable member/);
  assert.equal(f.count.textContent,'1/5');
  f.setResponse({data:{state:{roster:[{id:'one',name:'Returned',cls:'High Wizard'}]}}});
  await f.window.sync.refreshRoster();
  assert.equal(f.selects[0].value,'');
  assert.match(f.selects[0].html,/Returned/);
});

test('roster refresh retries after failure and does not overlap requests or erase drafts',async()=>{
  const f=syncFixture();
  f.setResponse({error:{message:'Offline'}});
  const first=f.window.sync.refreshRoster(),second=f.window.sync.refreshRoster();
  assert.equal(first,second);
  await first;
  assert.equal(f.queries.length,1);
  assert.equal(f.stateBox.hidden,false);
  assert.deepEqual(f.selects.map(select=>select.value),['one','two']);
  f.setResponse({data:{state:{roster:[{id:'one',name:'Recovered',cls:'High Wizard'}]}}});
  await f.window.sync.refreshRoster();
  assert.equal(f.stateBox.hidden,true);
  assert.match(f.selects[0].html,/Recovered/);
});

test('automatic member refresh polls visible pages and refreshes on return to the tab',async()=>{
  const f=syncFixture();
  f.window.sync.startRosterSync();
  assert.ok(f.timers.has(15000));
  f.document.hidden=true;
  f.timers.get(15000)();
  assert.equal(f.queries.length,0);
  f.document.hidden=false;
  f.events.get('focus')();
  await f.window.sync.refreshRoster();
  assert.equal(f.queries.length,1);
  f.events.get('visibilitychange')();
  await f.window.sync.refreshRoster();
  assert.equal(f.queries.length,2);
  f.events.get('pagehide')({persisted:true});
  assert.equal(f.timers.size,1);
  f.events.get('pagehide')({persisted:false});
  assert.equal(f.timers.size,0);
  assert.equal(f.events.has('focus'),false);
});

test('saving a template writes only party_templates without notifying or changing event lineups',async()=>{
  const source=fs.readFileSync('public/js/party-manager.js','utf8');
  for(const mode of ['success','save-failed','storage-blocked']){
    const notifications=[],toasts=[],saved=[],writes=[];
    const state={assignments:{main_1:['Existing GL'],siege_1:['Existing Siege']}};
    const button={classList:{add:value=>saved.push(value),remove(){}},disabled:false};
    const context={state,canEdit:true,validateDuplicates:()=>true,cfg:{supabaseUrl:'https://test.supabase.co'},
      grid:{querySelector:()=>({querySelectorAll:()=>[{value:'one'},{value:'two'}]})},
      client:{from:table=>({upsert:async value=>{writes.push({table,value});return {error:mode==='save-failed'?{message:'Offline'}:null};}})},
      localStorage:{setItem(key,value){if(mode==='storage-blocked')throw Error('Storage disabled');notifications.push([key,JSON.parse(value)]);}},
      window:{TitaniaToast:(...args)=>toasts.push(args)},setTimeout(){},
    };
    vm.createContext(context);
    vm.runInContext(source.slice(source.indexOf('  async function saveParty('),source.indexOf('  boot();')),context);
    await context.saveParty(1,button);
    assert.equal(notifications.length,0);
    assert.equal(writes.length,1);
    assert.equal(writes[0].table,'party_templates');
    assert.deepEqual(Array.from(writes[0].value.member_ids),['one','two']);
    assert.deepEqual(state.assignments,{main_1:['Existing GL'],siege_1:['Existing Siege']});
    assert.equal(saved.includes('saved'),mode!=='save-failed');
    assert.equal(toasts[0][0],mode==='save-failed'?'Save failed':'Party saved');
  }
});
