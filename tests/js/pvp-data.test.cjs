const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseCsv,columns,glSessions}=require('../../public/js/pvp-data.js');
test('Tuesday has two sessions, Thursday has one, and other or invalid dates have none',()=>{
  assert.deepEqual(glSessions('2026-10-27').map(session=>session.time),['22:30','23:00']);
  assert.equal(glSessions('2026-10-27')[1].label,'Tuesday GL 2 — 23:00');
  assert.deepEqual(glSessions('2026-10-29').map(session=>session.time),['23:00']);
  for(const date of ['2026-10-28','2026-02-30','','invalid'])assert.deepEqual(glSessions(date),[]);
});
const csv=rows=>columns.join(',')+'\r\n'+rows.join('\r\n');
test('view filters offer only saved sessions and battlefields for the chosen date',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'../../public/js/pvp-data.js'),'utf8');
  const controls={pvpViewSession:{value:'23:00'},pvpViewField:{value:'main'}};
  let selected;
  const context={
    battles:[
      {battle_date:'2026-10-27',battle_time:'23:00:00',battlefield:'main'},
      {battle_date:'2026-10-27',battle_time:'22:30:00',battlefield:'sub'},
      {battle_date:'2026-10-29',battle_time:'23:00:00',battlefield:'main'},
    ],viewDate:{value:'2026-10-27'},el:id=>controls[id],esc:String,sessionLabel:(_,time)=>time,
    selectBattle(){selected=[context.viewDate.value,controls.pvpViewSession.value,controls.pvpViewField.value];},
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function updateViewSessions('),source.indexOf('  function notice(')),context);
  context.updateViewSessions('22:30');
  assert.deepEqual(selected,['2026-10-27','22:30','sub']);
  assert.doesNotMatch(controls.pvpViewField.innerHTML,/value="main"/);
  context.viewDate.value='2026-10-29';context.updateViewSessions();
  assert.deepEqual(selected,['2026-10-29','23:00','main']);
  assert.doesNotMatch(controls.pvpViewSession.innerHTML,/22:30/);
  context.viewDate.value='2026-10-28';context.updateViewSessions();
  assert.equal(controls.pvpViewSession.disabled,true);assert.equal(controls.pvpViewField.disabled,true);
});
test('preserves both guilds, Unicode IGNs and numeric metrics',()=>{
  const players=parseCsv('\uFEFF'+csv([
    'Titania,Love棉花糖,High Priest,0,11,2372,0,4775778,6877602,12,18,0,0,0,0',
    'BuFFalo,Opponent,Night Watch,4,6,1103333,1058654224,0,1777549,4,0,0,0,0,0',
  ]));
  assert.equal(players.length,2);assert.equal(players[0].Player,'Love棉花糖');
  assert.equal(players[1].Guild,'BuFFalo');assert.equal(players[1]['Building Damage'],1058654224);
});
test('quoted commas, escaped quotes and CRLF are parsed correctly',()=>{
  const players=parseCsv(csv(['Titania,"A,""B""",Creator,1,2,"1,234",0,0,0,0,0,0,0,0,0']));
  assert.equal(players[0].Player,'A,"B"');assert.equal(players[0]['Player Damage'],1234);
});
test('rejects wrong headers, missing columns, invalid numbers and duplicates',()=>{
  assert.throws(()=>parseCsv('Guild,Player\nTitania,Alex'),/columns/);
  assert.throws(()=>parseCsv(csv(['Titania,Alex,Creator'])),/columns/);
  const row='Titania,Alex,Creator,1,2,3,0,0,0,0,0,0,0,0,0';
  assert.throws(()=>parseCsv(csv([row,row])),/Duplicate/);
  assert.throws(()=>parseCsv(csv([row.replace(',1,2,',',-1,2,')])),/whole number/);
  assert.throws(()=>parseCsv(csv([row.replace(',1,2,',',abc,2,')])),/whole number/);
  assert.throws(()=>parseCsv(csv([])),/between 1/);
});
