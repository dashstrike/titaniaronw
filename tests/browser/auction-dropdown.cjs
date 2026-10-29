// Real Chromium regression test. Uses a temporary profile, local assets and
// synthetic registrations only; it never connects to Supabase or the live app.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'public/js/auction.js'),'utf8');
const actions=source.slice(source.indexOf('  function rowActions('),source.indexOf('  function setupActionDropdown('));
const setup=source.slice(source.indexOf('  function setupActionDropdown('),source.indexOf('  function render(){'));
const clickHandler=source.slice(source.indexOf("  el('auctionRegistrations').addEventListener('click'"),source.indexOf('  async function boot(){'));
const asset=file=>pathToFileURL(path.join(root,'public',file)).href;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'titania-auction-dropdown-'));
const fixture=path.join(directory,'test.html');
fs.writeFileSync(fixture,`<!doctype html><html data-bs-theme="dark"><head>
${['vendor/darkone/css/style.min.css','css/guild-runs.css','css/titania.css'].map(file=>`<link rel="stylesheet" href="${asset(file)}">`).join('')}
</head><body><div id="titania-content"><main id="auctionPage" data-organizer="true" style="margin:24px"><div id="auctionRegistrations"></div></main></div><pre id="browserResult"></pre>
<script src="${asset('vendor/datatables/jquery.min.js')}"></script><script src="${asset('vendor/darkone/js/vendor.min.js')}"></script><script>
const errors=[],cases=[],invocations=[];
window.addEventListener('error',event=>errors.push(event.message));
let itemLabel='card';const canManage=true,workflow=true,busy=false;
const esc=String,el=id=>document.getElementById(id);
const workflowAction=async button=>invocations.push({...button.dataset});
${actions}
${setup}
${clickHandler}
const wait=()=>new Promise(resolve=>setTimeout(resolve,80));
(async()=>{
  for(const category of ['card','accessory'])for(const narrow of [false,true]){
    itemLabel=category;
    const nextBidder=narrow;
    const registration={id:category+'-'+narrow,member_name:'Test Player',ducks:2,next_bidder:nextBidder};
    el('auctionPage').style.width=narrow?'280px':'800px';
    el('auctionRegistrations').innerHTML='<div class="card"><div data-auction-card="test"><div class="card-body"><ul class="list-unstyled mb-0"><li class="d-flex align-items-center justify-content-between py-2"><span>Test Player</span><span class="d-inline-flex align-items-center">'+rowActions(registration)+'</span></li></ul></div></div></div>';
    const scrollArea=document.querySelector('[data-auction-card] > .card-body');
    scrollArea.scrollLeft=scrollArea.scrollWidth;
    const button=document.querySelector('[data-bs-toggle="dropdown"]');
    setupActionDropdown(button);button.click();await wait();
    const menu=button.nextElementSibling,r=menu.getBoundingClientRect(),b=button.getBoundingClientRect();
    const hit=document.elementFromPoint(r.left+20,r.top+15);
    const result={category,narrow,nextBidder,expanded:button.getAttribute('aria-expanded'),visible:getComputedStyle(menu).display!=='none',onScreen:r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
      nearButton:Math.abs(r.top-b.bottom)<10||Math.abs(r.bottom-b.top)<10,hitTest:menu.contains(hit),hasHorizontalScroll:scrollArea.scrollWidth>scrollArea.clientWidth};
    // Exercise Bootstrap's real keyboard handler while the menu is in the top layer.
    menu.querySelector('.dropdown-item').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    result.escapeClosed=button.getAttribute('aria-expanded')==='false'&&!menu.matches(':popover-open');
    result.focusReturned=document.activeElement===button;
    button.click();await wait();
    const kind=nextBidder?'outbid_again':'add_duck';
    const before=invocations.length;
    menu.querySelector('[data-workflow="'+kind+'"]').click();await wait();
    result.actionReachedHandler=invocations.length===before+1&&invocations.at(-1).workflow===kind&&invocations.at(-1).registration===registration.id;
    const beforeReceived=invocations.length;
    document.querySelector('[data-workflow="received"]').click();await wait();
    result.receivedStillWorks=invocations.length===beforeReceived+1&&invocations.at(-1).workflow==='received';
    bootstrap.Dropdown.getInstance(button).hide();bootstrap.Dropdown.getInstance(button).dispose();
    result.noDanglingPopover=!menu.matches(':popover-open');cases.push(result);
  }
  document.getElementById('browserResult').textContent=JSON.stringify({errors,cases});
})().catch(error=>document.getElementById('browserResult').textContent=JSON.stringify({errors:[error.stack],cases}));
</script></body></html>`);
const chrome=process.env.CHROME_PATH||path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe');
const html=execFileSync(chrome,['--headless','--disable-gpu','--no-first-run','--window-size=1100,850','--user-data-dir='+path.join(directory,'profile'),'--dump-dom','--virtual-time-budget=5000',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:25000,maxBuffer:4*1024*1024});
const match=html.match(/<pre id="browserResult">([\s\S]*?)<\/pre>/);
assert.ok(match,'Browser did not return a test result');
const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
assert.deepEqual(result.errors,[]);assert.equal(result.cases.length,4);
for(const scenario of result.cases){
  assert.equal(scenario.expanded,'true',JSON.stringify(scenario));
  for(const key of ['visible','onScreen','nearButton','hitTest','escapeClosed','focusReturned','actionReachedHandler','receivedStillWorks','noDanglingPopover'])assert.equal(scenario[key],true,key+': '+JSON.stringify(scenario));
  if(scenario.narrow)assert.equal(scenario.hasHorizontalScroll,true);
}
console.log('PASS: Card and Accessory menus open on-screen, accept clicks, close with Escape and preserve auction action routing in wide and horizontally scrolling layouts.');
