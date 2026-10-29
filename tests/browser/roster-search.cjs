// Real Chromium test of the shared inline search, actual CSS and script.
// Uses only synthetic roster data and local assets, never Supabase.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const asset=file=>pathToFileURL(path.join(root,'public',file)).href;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'titania-roster-search-'));
const fixture=path.join(directory,'test.html');
const searchMarkup=fs.readFileSync(path.join(root,'resources/views/partials/roster-search.blade.php'),'utf8').replace(/\{\{[\s\S]*?\}\}/g,expression=>expression.includes('publicSearch')?'true':'Find My Name');
fs.writeFileSync(fixture,`<!doctype html><html data-bs-theme="dark"><head>
<link rel="stylesheet" href="${asset('vendor/darkone/css/style.min.css')}"><link rel="stylesheet" href="${asset('css/titania.css')}">
</head><body data-view="guild"><main id="content"><div class="slot" id="matchedRow"><div class="member-name">DASH</div></div></main>
${searchMarkup}<pre id="browserResult"></pre><script src="${asset('js/roster-search.js')}"></script><script>
const errors=[];window.addEventListener('error',event=>errors.push(event.message));
const input=document.getElementById('glRosterSearchInput'),pill=document.getElementById('glRosterSearchPanel');
const wait=()=>new Promise(resolve=>setTimeout(resolve,250));
const width=()=>{pill.getAnimations().filter(animation=>animation.transitionProperty==='width').forEach(animation=>animation.finish());return pill.getBoundingClientRect().width;};
const type=value=>{input.value=value;input.dispatchEvent(new Event('input'));};
(async()=>{
  const compactWidth=width();input.focus();await wait();const focusedWidth=width();
  type('DASH');await wait();const typedWidth=width();
  type('DASH'.repeat(30));await wait();const longTextWidth=width();
  type('DASH');await wait();
  const samples=['glRosterSearchPanel','matchedRow'].map(id=>{
    const node=document.getElementById(id),animation=node.getAnimations().find(item=>item.animationName?.startsWith('roster-'));
    if(!animation)return {id,animation:false};
    const property=id==='matchedRow'?'backgroundColor':'borderTopColor';
    animation.pause();animation.currentTime=400;const first=getComputedStyle(node)[property];
    animation.currentTime=2200;const second=getComputedStyle(node)[property];
    animation.play();return {id,animation:true,colourChanges:first!==second};
  });
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  const row=document.getElementById('matchedRow');
  const result={errors,compactWidth,focusedWidth,typedWidth,longTextWidth,samples,
    noPopup:!document.getElementById('glRosterSearchToggle')&&!document.getElementById('glRosterSearchClose'),
    highlightPreserved:row.dataset.rosterSearchMatch==='active',rgbContinues:row.getAnimations().some(item=>item.animationName==='roster-match-rgb'),
    searchPreserved:input.value==='DASH',fitsViewport:pill.getBoundingClientRect().left>=0&&pill.getBoundingClientRect().right<=innerWidth};
  type('');await wait();result.clearStillWorks=!row.hasAttribute('data-roster-search-match');result.collapsedWidth=width();
  document.getElementById('browserResult').textContent=JSON.stringify(result);
})().catch(error=>document.getElementById('browserResult').textContent=JSON.stringify({errors:[error.stack]}));
</script></body></html>`);
const chrome=process.env.CHROME_PATH||path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe');
const html=execFileSync(chrome,['--headless','--disable-gpu','--no-first-run','--window-size=1100,850','--force-prefers-reduced-motion','--user-data-dir='+path.join(directory,'profile'),'--dump-dom','--virtual-time-budget=4000',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:25000,maxBuffer:4*1024*1024});
const match=html.match(/<pre id="browserResult">([\s\S]*?)<\/pre>/);
assert.ok(match,'No browser result');const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
assert.deepEqual(result.errors,[]);
assert.ok(result.focusedWidth>result.compactWidth,JSON.stringify(result));
assert.equal(result.focusedWidth,420);assert.equal(result.typedWidth,result.focusedWidth);assert.equal(result.longTextWidth,result.focusedWidth);
assert.equal(result.collapsedWidth,result.compactWidth);
for(const sample of result.samples){assert.equal(sample.animation,true,sample.id+' RGB missing');assert.equal(sample.colourChanges,true,sample.id+' RGB not changing');}
for(const key of ['noPopup','highlightPreserved','rgbContinues','searchPreserved','clearStillWorks','fitsViewport'])assert.equal(result[key],true,key);
console.log('PASS: Inline search expands from '+result.compactWidth+'px to a fixed '+result.focusedWidth+'px on focus, long text does not widen it, RGB and highlights persist after blur, and clearing still works.');
