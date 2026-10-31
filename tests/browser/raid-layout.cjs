// Offline Chromium regression for the production stylesheet cascade.
// Synthetic cards only: no Supabase connection or roster writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
const asset=file=>pathToFileURL(path.join(root,'public',file)).href;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'titania-raid-layout-'));
const fixture=path.join(directory,'test.html');
const styles=['vendor/darkone/css/style.min.css','css/pages/index.css','css/titania.css','css/mobile-nav.css','css/dashboard-fixes.css'];
const cases=[];
for(const width of [375,768,885,985,1440])for(const event of ['guild_league','siege'])for(const count of [4,5]){
  const cards=Array.from({length:count},(_,index)=>`<div class="team-card card"><div class="team-head">Party ${index+1}</div><div class="slot">Synthetic member</div></div>`).join('');
  const html=`<!doctype html><html data-bs-theme="dark"><head>${styles.map(file=>`<link rel="stylesheet" href="${asset(file)}">`).join('')}</head><body data-event="${event}"><div id="titania-content" style="width:100%;padding:16px"><div class="main-raid-block card"><div class="main-raid-grid${count===5?' five':''} card-body">${cards}</div></div></div></body></html>`;
  cases.push({width,event,count,html});
}
fs.writeFileSync(fixture,`<!doctype html><html><body><pre id="browserResult"></pre><script>
const cases=${JSON.stringify(cases)},results=[];
Promise.all(cases.map(test=>new Promise(resolve=>{
  const frame=document.createElement('iframe');frame.style.width=test.width+'px';frame.style.height='300px';
  frame.onload=()=>{
    const doc=frame.contentDocument,grid=doc.querySelector('.main-raid-grid');
    const style=frame.contentWindow.getComputedStyle(grid);
    grid.scrollLeft=grid.scrollWidth;
    results.push({width:test.width,event:test.event,count:test.count,
      columns:style.gridTemplateColumns,
      gridContentWidth:grid.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),
      cardWidths:[...grid.children].map(card=>card.getBoundingClientRect().width),
      gridWidth:grid.getBoundingClientRect().width,viewport:frame.contentWindow.innerWidth,
      overflowX:style.overflowX,scrollWidth:grid.scrollWidth,clientWidth:grid.clientWidth,scrollLeft:grid.scrollLeft,
      pageWidth:doc.documentElement.scrollWidth});resolve();
  };
  frame.srcdoc=test.html;document.body.append(frame);
}))).then(()=>document.getElementById('browserResult').textContent=JSON.stringify(results));
</script></body></html>`);
const chrome=process.env.CHROME_PATH||path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe');
const html=execFileSync(chrome,['--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files','--user-data-dir='+path.join(directory,'profile'),'--dump-dom','--virtual-time-budget=5000',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000,maxBuffer:4*1024*1024});
const match=html.match(/<pre id="browserResult">([\s\S]*?)<\/pre>/);
assert.ok(match,'No browser result');
const results=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
assert.equal(results.length,cases.length);
for(const test of results){
  const detail=JSON.stringify(test);
  assert.ok(Math.max(...test.cardWidths)-Math.min(...test.cardWidths)<2,'Unequal party widths: '+detail);
  assert.ok(Math.min(...test.cardWidths)>=Math.min(300,test.gridContentWidth)-1,'Squeezed party card: '+detail);
  assert.ok(test.pageWidth<=test.viewport+2,'Horizontal scrolling escaped the raid grid: '+detail);
  if(test.scrollWidth>test.clientWidth+1){
    assert.ok(['auto','scroll'].includes(test.overflowX),'Raid cannot scroll: '+detail);
    assert.ok(test.scrollLeft>0,'Later parties cannot be reached by scrolling: '+detail);
  }
}
console.log('PASS: '+results.length+' GL/Siege layouts have equal readable party cards with scrolling contained inside each raid.');
