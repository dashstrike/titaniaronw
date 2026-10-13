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
