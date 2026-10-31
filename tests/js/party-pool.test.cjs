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

function templateFixture(){
  const list={innerHTML:'',querySelectorAll:()=>[]};
  const members={};
  for(let n=1;n<=6;n++)members[n]={id:String(n),name:'Player '+n,status:'active'};
  let result={data:[{party_no:1,member_ids:['1','2','3','4','5']}]};
  const commits=[];
  const state={assignments:{main_1:['Existing GL'],main_2:['Player 1'],siege_1:['Existing Siege']}};
  const context={console,memberById:members,state,
    window:{addEventListener(){}},
    document:{documentElement:{dataset:{titaniaPage:'index'}},body:{dataset:{event:'guild_league'}},
      getElementById:id=>id==='partyPoolList'?list:null,addEventListener(){}},
    TEAM_KEY_SET:new Set(['main_1','main_2','siege_1']),
    scopeKeys:team=>team.startsWith('main_')?['main_1','main_2']:['siege_1'],
    removeMemberFromKeys(name,keys){for(const key of keys)state.assignments[key]=state.assignments[key].map(value=>value===name?null:value);},
    commitMutation:message=>commits.push(message),showToast(){},displayTeamLabel:team=>team,
    fetch:async()=>({ok:true,json:async()=>({})}),
    supabaseClient:{from:()=>({select:()=>({order:async()=>result})})},
  };
  let source=fs.readFileSync('public/js/party-pool.js','utf8');
  source=source.replace(/  if\(document.readyState==='loading'\)[\s\S]*?  else boot\(\);/,
    '  rosterReady=true;window.templateTest={loadParties,fillTeamFromParty};');
  vm.runInNewContext(source,context);
  return {context,list,members,commits,state,setResult:value=>{result=value;}};
}

test('changing or loading templates leaves existing GL and Siege assignments independent',async()=>{
  const f=templateFixture();
  const original=JSON.stringify(f.state.assignments);
  await f.context.window.templateTest.loadParties(false);
  f.setResult({data:[{party_no:1,member_ids:['2','3','4','5','6']}]});
  await f.context.window.templateTest.loadParties(false);
  assert.match(f.list.innerHTML,/Player 1/,'the open pool retains its loaded templates');
  assert.doesNotMatch(f.list.innerHTML,/Player 6/);
  assert.equal(JSON.stringify(f.state.assignments),original);
  await f.context.window.templateTest.loadParties(true);
  assert.match(f.list.innerHTML,/Player 6/);
  assert.equal(JSON.stringify(f.state.assignments),original,'even reloading the pool must not alter event teams');
  assert.equal(f.commits.length,0);
});

test('only placing a template changes its target event; later template edits do not change the placed roster',async()=>{
  const f=templateFixture();
  const payload={partyNo:1,memberIds:['1','2','3','4','5']};
  f.context.window.templateTest.fillTeamFromParty('main_1',payload);
  assert.deepEqual(Array.from(f.state.assignments.main_1),['Player 1','Player 2','Player 3','Player 4','Player 5']);
  assert.deepEqual(f.state.assignments.main_2,[null],'duplicate GL assignments are removed on placement');
  assert.deepEqual(f.state.assignments.siege_1,['Existing Siege']);
  const placedGL=JSON.stringify(f.state.assignments.main_1);
  f.setResult({data:[{party_no:1,member_ids:['2','3','4','5','6']}]});
  await f.context.window.templateTest.loadParties(true);
  assert.equal(JSON.stringify(f.state.assignments.main_1),placedGL);
  f.context.window.templateTest.fillTeamFromParty('siege_1',{partyNo:1,memberIds:['2','3','4','5','6']});
  assert.deepEqual(Array.from(f.state.assignments.siege_1),['Player 2','Player 3','Player 4','Player 5','Player 6']);
  assert.equal(JSON.stringify(f.state.assignments.main_1),placedGL);
  assert.equal(f.commits.length,2);
});

test('inactive members are hidden from templates and an incomplete party cannot replace a lineup',async()=>{
  const f=templateFixture();
  f.members['1'].status='inactive';
  await f.context.window.templateTest.loadParties(false);
  assert.match(f.list.innerHTML,/4\/5/);
  assert.match(f.list.innerHTML,/draggable="false"/);
  assert.doesNotMatch(f.list.innerHTML,/Player 1/);
  f.context.window.templateTest.fillTeamFromParty('main_1',{partyNo:1,memberIds:['1','2','3','4','5']});
  assert.deepEqual(f.state.assignments.main_1,['Existing GL']);
  assert.equal(f.commits.length,0);
});
