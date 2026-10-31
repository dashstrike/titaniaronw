const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/pages/index.js','utf8');
const catalog=JSON.parse(fs.readFileSync('public/images/job/job-catalog.json','utf8'));

test('loading and reloading Stalker and Scholar members preserves class and member identity',()=>{
  const context={
    stringValue:value=>String(value??''),
    toInt:(value,min,max)=>Math.max(min,Math.min(max,Number.parseInt(value,10)||min)),
    normalizeDateValue:()=>'',normalizeTimestampValue:()=> '2026-11-01T00:00:00Z',
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const CONFIG'),source.indexOf('  let state =')),context);
  vm.runInContext(source.slice(source.indexOf('  function createDefaultRaidLeaders('),source.indexOf('  function rebuildIndex(')),context);
  const input={roster:[
    {id:'stalker',name:'Player A',cls:'Stalker',status:'active'},
    {id:'scholar',name:'Player B',cls:'Scholar',status:'active'},
  ],assignments:{main_1:['Player A','Player B']}};
  const loaded=context.normalizeClientState(input);
  const reloaded=context.normalizeClientState(JSON.parse(JSON.stringify(loaded)));
  assert.deepEqual(Array.from(reloaded.roster,m=>({id:m.id,cls:m.cls})),[
    {id:'stalker',cls:'Stalker'},{id:'scholar',cls:'Scholar'},
  ]);
  assert.deepEqual(Array.from(reloaded.assignments.main_1).slice(0,2),['Player A','Player B']);
});

test('member edit dropdown supports every job in the verified SEA catalog',()=>{
  const context={escapeAttr:String,escapeHtml:String};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const CLASSES'),source.indexOf('  const HEALERS')),context);
  vm.runInContext(source.slice(source.indexOf('  function populateClassOptions('),source.indexOf('  function renderDashboard(')),context);
  const classes=vm.runInContext('Array.from(CLASSES)',context);
  assert.deepEqual(Array.from(classes),[...catalog.jobs.map(job=>job.name),'Unknown']);
  for(const cls of catalog.jobs.map(job=>job.name)){
    const select={};
    context.populateClassOptions(select,cls);
    assert.equal(select.value,cls);
    assert.ok(select.innerHTML.includes(`<option value="${cls}">${cls}</option>`));
  }
});

test('every SEA job uses its verified reference icon and matching family color on all views',()=>{
  const icons=JSON.parse(fs.readFileSync('public/images/job/job-icons.json','utf8'));
  const {createHash}=require('node:crypto');
  assert.equal(catalog.jobs.length,39);
  assert.notEqual(icons.Scholar,icons.Sage);
  for(const job of catalog.jobs){
    assert.equal(icons[job.name],job.icon,job.name);
    const image=fs.readFileSync('public/images/job/'+icons[job.name]);
    assert.equal(image.toString('ascii',0,4),'RIFF');
    assert.equal(image.toString('ascii',8,12),'WEBP');
    assert.equal(createHash('sha256').update(image).digest('hex'),job.sha256,job.name);
  }
  for(const file of ['pages/index.js','pages/member.js','pages/guild-league.js','pages/siege.js','pages/polarity-zone.js','public-lineup.js']){
    const script=fs.readFileSync('public/js/'+file,'utf8');
    const object=script.match(/const CLASS_COLORS\s*=\s*(?:Object.freeze\()?({[\s\S]*?})\)?;/)[1];
    const colors=vm.runInNewContext('('+object+')');
    assert.equal(colors.Stalker,colors.Thief,file);
    assert.equal(colors.Scholar,colors.Mage,file);
    assert.notEqual(colors.Stalker,colors.Unknown,file);
    for(const job of catalog.jobs)assert.equal(colors[job.name],job.color,`${file}: ${job.name}`);
  }
});

test('all SEA classes survive planner normalization and a save/reload round trip',()=>{
  const context={
    stringValue:value=>String(value??''),
    toInt:(value,min,max)=>Math.max(min,Math.min(max,Number.parseInt(value,10)||min)),
    normalizeDateValue:()=>'',normalizeTimestampValue:()=> '2026-11-01T00:00:00Z',
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const CONFIG'),source.indexOf('  let state =')),context);
  vm.runInContext(source.slice(source.indexOf('  function createDefaultRaidLeaders('),source.indexOf('  function rebuildIndex(')),context);
  const roster=catalog.jobs.map(job=>({id:String(job.id),name:job.name+' Player',cls:job.name,status:'active'}));
  const loaded=context.normalizeClientState({roster});
  const reloaded=context.normalizeClientState(JSON.parse(JSON.stringify(loaded)));
  assert.deepEqual(Array.from(reloaded.roster,member=>member.cls),catalog.jobs.map(job=>job.name));
});
