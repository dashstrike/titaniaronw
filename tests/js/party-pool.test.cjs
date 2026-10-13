const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('party pool refreshes when roster arrives after saved parties',async()=>{
  const listeners={};
  const list={innerHTML:'',querySelectorAll:()=>[]};
  const ids=['1','2','3','4','5'];
  const context={
    console,
    memberById:{},
    window:{addEventListener:(name,fn)=>{listeners[name]=fn;}},
    document:{documentElement:{dataset:{titaniaPage:'index'}},body:{dataset:{event:'guild_league'}},getElementById:id=>id==='partyPoolList'?list:null,addEventListener(){}},
    fetch:async()=>({ok:true,json:async()=>({})}),
    supabaseClient:{from:()=>({select:()=>({order:async()=>({data:[{party_no:1,member_ids:ids}]})})})}
  };
  let source=fs.readFileSync('public/js/party-pool.js','utf8');
  source=source.replace(/  if\(document.readyState==='loading'\)[\s\S]*?  else boot\(\);/, '  window.loadForTest=loadParties;');
  vm.runInNewContext(source,context);
  await context.window.loadForTest(false);
  assert.match(list.innerHTML,/Loading members/);
  assert.doesNotMatch(list.innerHTML,/Member unavailable/);
  ids.forEach(id=>{context.memberById[id]={id,name:'Player '+id,status:'active'};});
  listeners['titania:roster-updated']();
  assert.match(list.innerHTML,/5\/5/);
  assert.match(list.innerHTML,/draggable="true"/);
  assert.match(list.innerHTML,/Player 1/);
  assert.doesNotMatch(list.innerHTML,/Member unavailable/);
  context.memberById['1'].name='Renamed player';
  listeners['titania:roster-updated']();
  assert.match(list.innerHTML,/Renamed player/);
});
