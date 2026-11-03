const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),asset=file=>pathToFileURL(path.join(root,'public',file)).href;
const source=fs.readFileSync(path.join(root,'public/js/pages/index.js'),'utf8');
const context={MAIN_RAIDS:[{id:'raid_1'}],SUB_RAIDS:[{id:'sub_raid_1'}],ALL_SIEGE_RAIDS:[{id:'siege_raid_1'}],
state:{raidModes:{raid_1:'ATK',sub_raid_1:'TOP',siege_raid_1:'DEF'},raidTeamNames:{raid_1:'ALPHA',sub_raid_1:'BETA',siege_raid_1:'SIEGE'},raidCommanders:{},raidLeaders:{}},currentEvent:'guild_league',stringValue:v=>String(v??''),escapeHtml:String,userCanEdit:()=>true,raidLeaderIcon:()=>'<i class="fa-solid fa-crown me-2"></i>',raidCommanderIcon:()=>'<i class="fa-solid fa-person-military-pointing me-2"></i>',teamCardHtml:()=>''};
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('  function mainRaidHtml('),source.indexOf('  function raidTeamName(')),context);
const markup=[...context.MAIN_RAIDS,...context.SUB_RAIDS,...context.ALL_SIEGE_RAIDS].map(raid=>context.mainRaidHtml({...raid,keys:[]})).join('');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'titania-raid-header-')),fixture=path.join(directory,'test.html');
fs.writeFileSync(fixture,`<!doctype html><html data-bs-theme="dark"><head><link rel="stylesheet" href="${asset('vendor/darkone/css/style.min.css')}"><link rel="stylesheet" href="${asset('css/pages/index.css')}"><link rel="stylesheet" href="${asset('css/titania.css')}"><link rel="stylesheet" href="${asset('css/ui-icons.css')}"><link rel="stylesheet" href="${asset('vendor/fontawesome/css/all.min.css')}"></head><body><div id="titania-content">${markup}</div><pre id="result"></pre><script src="${asset('js/ui-icons.js')}"></script><script>
setTimeout(()=>{
const cases=[];
for(const width of [1280,860,375]){
 document.getElementById('titania-content').style.width=width+'px';
 for(const header of document.querySelectorAll('.main-raid-head')){
  const bounds=header.getBoundingClientRect(),badge=header.querySelector('.raid-mode-toggle'),box=badge.getBoundingClientRect();
  const icon=badge.querySelector('i');const iconBox=icon?.getBoundingClientRect();
  const range=document.createRange();range.selectNodeContents(badge);const content=range.getBoundingClientRect();
  cases.push({width,mode:badge.textContent.trim(),contained:[...header.children].every(node=>{const r=node.getBoundingClientRect();return r.left>=bounds.left-1&&r.right<=bounds.right+1;}),badgeContainsText:content.left>=box.left&&content.right<=box.right,iconInside:!iconBox||(iconBox.left>=box.left&&iconBox.right<=box.right),badgeWidth:box.width});
 }
}
document.getElementById('result').textContent=JSON.stringify(cases);
},300);
</script></body></html>`);
const html=execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files','--window-size=1920,1080','--user-data-dir='+path.join(directory,'profile'),'--dump-dom','--virtual-time-budget=2000',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:25000,maxBuffer:4*1024*1024});
const match=html.match(/<pre id="result">([\s\S]*?)<\/pre>/);assert.ok(match,'Missing result');const cases=JSON.parse(match[1].replaceAll('&amp;','&'));
assert.equal(cases.length,9);for(const item of cases)for(const key of ['contained','badgeContainsText','iconInside'])assert.equal(item[key],true,JSON.stringify(item));
console.log('PASS: GL main/Sub and Siege headers fit at 1280px, 860px and 375px; badge icons and text stay inside their pills.');
