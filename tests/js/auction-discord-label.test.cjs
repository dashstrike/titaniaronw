const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/auction.js','utf8');
const template=source.slice(source.indexOf('  function optionTemplate('),source.indexOf('  function dropdowns('));
for(const prefix of ['auction','accessory','relic']){
  test(prefix+' player dropdown shows No Discord only for unlinked members',()=>{
    const member={id:'m1',name:'Player',discord_linked:false};
    const node=()=>({children:[],classList:{add(){}},appendChild(child){this.children.push(child);}});
    const context={document:{createElement:node},el:id=>({id:id.replace(/^auction/,prefix)}),members:[member],iconMap:{},relic:prefix==='relic'};
    vm.createContext(context);vm.runInContext(template,context);
    const option={id:'m1',text:'Player',element:{parentElement:{id:prefix+'Player'}}};
    const unlinked=context.optionTemplate(option);
    assert.ok(unlinked.children.some(child=>child.textContent==='No Discord'&&child.className.includes('bg-danger')));
    member.discord_linked=true;
    assert.equal(context.optionTemplate(option).children.some(child=>child.textContent==='No Discord'),false);
  });
}
