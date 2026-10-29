const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../public/js/auction.js'),'utf8');
const setupSource=source.slice(source.indexOf('  function setupActionDropdown('),source.indexOf('  function render(){'));
test('scrolling-list menu opens in the top layer without moving action elements',()=>{
  const events={},attributes={};let open=false,configuration;
  const menu={setAttribute(name,value){attributes[name]=value;},showPopover(){open=true;},hidePopover(){open=false;},matches:()=>open};
  const button={nextElementSibling:menu,addEventListener(name,callback){events[name]=callback;}};
  const context={window:{bootstrap:{Dropdown:{getOrCreateInstance(node,config){assert.equal(node,button);configuration=config;}}}}};
  vm.createContext(context);vm.runInContext(setupSource,context);context.setupActionDropdown(button);
  assert.equal(attributes.popover,'manual');
  assert.equal(configuration.popperConfig({placement:'bottom-end'}).strategy,'fixed');
  assert.equal(configuration.popperConfig({placement:'bottom-end'}).placement,'bottom-end');
  events['show.bs.dropdown']();assert.equal(open,true);
  events['hidden.bs.dropdown']();assert.equal(open,false);
  assert.equal(button.nextElementSibling,menu);
});
test('browsers without popover support retain the Bootstrap dropdown',()=>{
  let initialized=false;
  const context={window:{bootstrap:{Dropdown:{getOrCreateInstance(){initialized=true;}}}}};
  vm.createContext(context);vm.runInContext(setupSource,context);
  context.setupActionDropdown({nextElementSibling:{}});assert.equal(initialized,true);
});
test('card and accessory menus keep all existing workflow actions',()=>{
  const actions=source.slice(source.indexOf('  function rowActions('),source.indexOf('  function setupActionDropdown('));
  for(const itemLabel of ['card','accessory']){
    const context={canManage:true,workflow:true,itemLabel,esc:String};
    vm.createContext(context);vm.runInContext(actions,context);
    const html=context.rowActions({id:'player-registration',member_name:'Alex',ducks:2});
    for(const action of ['received','carry_forward','add_duck','remove_duck','withdraw'])assert.match(html,new RegExp(`data-workflow="${action}"`));
    assert.match(html,/data-bs-toggle="dropdown"/);assert.match(html,/data-registration="player-registration"/);
    const next=context.rowActions({id:'player-registration',member_name:'Alex',ducks:2,next_bidder:true});
    for(const action of ['received','outbid_again','clear_next','withdraw'])assert.match(next,new RegExp(`data-workflow="${action}"`));
  }
});
test('dropdown action click reaches the existing workflow handler once',async()=>{
  let handler;const calls=[];
  const context={el:()=>({addEventListener(type,callback){handler=callback;}}),workflow:true,canManage:true,busy:false,workflowAction:async button=>calls.push(button)};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("  el('auctionRegistrations').addEventListener('click'"),source.indexOf('  async function boot(){')),context);
  const button={dataset:{workflow:'add_duck',registration:'player-registration'}};
  await handler({target:{closest:selector=>selector==='[data-workflow]'?button:null}});
  assert.deepEqual(calls,[button]);
});
