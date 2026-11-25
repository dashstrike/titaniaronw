const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('public/js/guild-runs.js','utf8');
function functionBlock(start,end,context){
  const first=source.indexOf(start),last=source.indexOf(end,first);
  assert.ok(first>=0&&last>first);
  vm.runInContext(source.slice(first,last),context);
}

test('editing a run field requires confirmation; Cancel restores the saved value',async()=>{
  const writes=[],prompts=[],state={textContent:''};
  let confirmed=false;
  const context={window:{Swal:{fire:async options=>{prompts.push(options);return {isConfirmed:confirmed};}}},
    showError:message=>assert.fail(message),document:{querySelector:()=>state},
    confirmationQueue:Promise.resolve(),
    client:{from:table=>{assert.equal(table,'guild_runs');return{update:value=>({eq:async(_key,id)=>{writes.push({id,value});return{error:null};}})};}},
    setTimeout:()=>{},console};
  vm.createContext(context);
  functionBlock('  async function confirmRunChange(', '  async function loadBase(',context);
  functionBlock('  async function saveRunField(', '  function wireRunControls(',context);
  const input={disabled:false,value:'New title',dataset:{runId:'run-1',runEdit:'note',original:'Old title'}};
  await context.saveRunField(input);
  assert.equal(input.value,'Old title');
  assert.equal(writes.length,0);
  assert.equal(prompts.length,1);
  input.value='New title';confirmed=true;
  await context.saveRunField(input);
  assert.equal(JSON.stringify(writes),JSON.stringify([{id:'run-1',value:{note:'New title'}}]));
  assert.equal(input.dataset.original,'New title');
  await context.saveRunField(input);
  assert.equal(prompts.length,2,'an unchanged field does not prompt or write again');
});

test('Cancel prevents run status, deletion, carry status, and creation writes',async()=>{
  const handlers={},writes=[];
  const button=(selector,dataset={})=>({dataset,disabled:false,addEventListener:(_event,handler)=>{handlers[selector]=handler;}});
  const toggle=button('toggle',{nextStatus:'closed',runToggle:'run-1'});
  const end=button('end',{runEnd:'run-1'});
  const remove=button('delete',{runDelete:'run-1',runTitle:'Test run'});
  const carry=button('carry',{carryStatus:'done'});
  carry.classList={contains:()=>false};
  carry.closest=selector=>selector==='.carry-switch'?{dataset:{regId:'reg-1'},querySelectorAll:()=>[carry]}:{querySelector:()=>({textContent:'Player One'})};
  const selections={'[data-run-toggle]':[toggle],'[data-run-end]':[end],'[data-run-delete]':[remove],
    '[data-run-edit]':[],'.carry-switch [data-carry-status]':[carry]};
  const fields={runType:{value:'mirage'},runDate:{value:'2026-11-25'},runTime:{value:'12:00'},runNote:{value:'Test run'}};
  const context={window:{},document:{querySelectorAll:selector=>selections[selector]||[],
    getElementById:id=>fields[id]},
    confirmRunChange:async()=>false,initRunPickers:()=>{},clearError:()=>{},
    client:{from:table=>{writes.push(table);throw Error('Write attempted without confirmation');}},
    runLabel:()=> 'Mirage',console};
  vm.createContext(context);
  functionBlock('  function wireRunControls(', '  async function createRun(',context);
  functionBlock('  async function createRun(', '  async function boot(',context);
  context.wireRunControls();
  for(const key of ['toggle','end','delete','carry'])await handlers[key]();
  await context.createRun({preventDefault(){},currentTarget:{querySelector:()=>({disabled:false,textContent:'Create Run'})}});
  assert.equal(writes.length,0);
});
