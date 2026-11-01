// Render the actual print builder using synthetic data, with no Supabase calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const render=require('../fixtures/siege-print.cjs');
const event=process.argv.includes('--guild-league')?'guild_league':'siege';
const directory=path.resolve('storage/app/'+event+'-print-preview');fs.mkdirSync(directory,{recursive:true});
const fixture=path.join(directory,'index.html'),asset=file=>pathToFileURL(path.resolve('public',file)).href;
const styles=['vendor/darkone/css/style.min.css','css/pages/index.css','css/siege-print.css','css/titania.css'];
const iconMap=JSON.parse(fs.readFileSync('public/images/job/job-icons.json','utf8'));
fs.writeFileSync(fixture,`<!doctype html><html data-bs-theme="dark"><head><meta charset="utf-8"><base href="${asset('')}/">${styles.map(file=>`<link rel="stylesheet" href="${asset(file)}">`).join('')}</head>
<body data-event="${event}" class="print-mode"><main id="titania-page-content"><div class="container-fluid"><div id="titania-content"><div id="printOverlay" class="print-overlay"><div class="print-shell"><div class="print-toolbar">Print / PDF preview</div><div class="print-content">${render(undefined,event)}</div></div></div></div></div></main><pre id="browserResult"></pre>
<script>const map=${JSON.stringify(iconMap)};document.querySelectorAll('.p-job-icon').forEach(icon=>{const cls=icon.parentNode.querySelector('.slot-class').textContent;if(map[cls]){icon.style.backgroundImage='url('+new URL('images/job/'+map[cls],document.baseURI).href+')';icon.style.backgroundColor='transparent';icon.style.boxShadow='none';icon.style.borderRadius='0';}});
document.fonts.ready.then(()=>{const grids=[...document.querySelectorAll('.print-team-grid')];document.getElementById('browserResult').textContent=JSON.stringify(grids.map(grid=>({count:grid.children.length,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,overflow:grid.scrollWidth>grid.clientWidth+1})));});
window.addEventListener('beforeprint',()=>{document.title=JSON.stringify([...document.querySelectorAll('.print-raid-block')].map(block=>({height:block.getBoundingClientRect().height,width:block.getBoundingClientRect().width,columns:getComputedStyle(block.querySelector('.print-team-grid')).gridTemplateColumns})));});</script><style>@media print{#browserResult{display:none}}</style></body></html>`);
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args=['--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files','--user-data-dir='+path.join(directory,'profile'),'--virtual-time-budget=2500'];
const html=execFileSync(chrome,[...args,'--dump-dom','--screenshot='+path.join(directory,'preview.png'),'--window-size=1280,1050',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000});
const result=JSON.parse(html.match(/<pre id="browserResult">([\s\S]*?)<\/pre>/)[1]);
assert.equal(result.length,7);for(const grid of result){assert.equal(grid.columns,grid.count);assert.equal(grid.overflow,false);}
execFileSync(chrome,[...args,'--no-pdf-header-footer','--print-to-pdf='+path.join(directory,'siege.pdf'),pathToFileURL(fixture).href],{stdio:'ignore',timeout:30000});
const pdf=fs.readFileSync(path.join(directory,'siege.pdf'),'latin1');
const pages=[...pdf.matchAll(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/g)];
assert.ok(pages.length>0,'PDF must have page dimensions');
for(const page of pages)assert.ok(Math.abs(Number(page[1])-841.89)<1&&Math.abs(Number(page[2])-595.28)<1,'PDF must be A4 landscape');
const printLayout=JSON.parse(pdf.match(/\/Title \(([^\n]*)\)/)[1]);
for(const raid of printLayout)assert.ok([4,5].includes(raid.columns.split(' ').length),'Print must preserve 4/5-party rows');
assert.equal(pages.length,2,'The standard 30-party synthetic lineup should fit on two landscape pages');
console.log('PASS: all 30 parties render in their 4/5-column rows. A4 landscape PDF and preview: '+directory);
