// Real roster renderer, drag events and confirmations. In-memory saves only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const mobile=process.argv.includes('--mobile'),printing=process.argv.includes('--pdf');
const dir=path.resolve('storage/app/guild-raid-drag-preview'+(mobile?'-mobile':printing?'-pdf':''));fs.mkdirSync(dir,{recursive:true});
const asset=file=>pathToFileURL(path.resolve('public',file)).href;
const source=fs.readFileSync('public/js/pages/index.js','utf8').replace("document.addEventListener('DOMContentLoaded', bootstrapWebsite);",'');
const styles=['vendor/darkone/css/style.min.css','css/pages/index.css','css/siege-print.css','css/titania.css','css/mobile-nav.css','css/dashboard-fixes.css'];
const script=`
window.fetch=()=>Promise.reject(Error('Network disabled in test'));
const errors=[],toasts=[];window.addEventListener('error',event=>errors.push(event.message));
const expect=(value,message)=>{if(!value)throw Error(message);};
const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('Timed out waiting for UI');};
let saves=0,saved;
currentEvent='guild_league';currentProfile={approved:true,role:'admin'};
state=normalizeClientState({});state.revision=1;
GUILD_KEYS.forEach((key,index)=>{state.assignments[key]=Array.from({length:5},(_,slot)=>{const name='Player '+(index*5+slot+1);state.roster.push({id:name,name,cls:slot===0?'High Priest':'Scholar',status:'active'});return name;});});
state.raidLeaders.raid_3='Player 41';state.raidCommanders.raid_3='Player 41';
renderAll=()=>{rebuildIndex();renderTeams();};queueSave=()=>{saved=plannerSnapshot(state);saves++;state.revision++;};setSaveFlag=()=>{};showToast=(title,message)=>toasts.push({title,message});
renderAll();
const drag=(key,selector)=>{
  const handle=document.querySelector('[data-team-drag="'+key+'"]'),transfer=new DataTransfer();
  expect(handle,'Missing drag handle');handle.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
  const target=document.querySelector(selector);expect(target,'Missing drop target');
  target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  handle.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:transfer}));
};
(async()=>{try{
  expect(!document.getElementById('organizeGuildRaidsBtn'),'Popup control still present');
  expect(document.querySelector('[data-team-key="sub_1"] .team-name span:last-child').textContent==='Party 1','Sub party numbering should start at 1');
  drag('main_9','[data-raid="raid_1"] .slot');
  drag('main_10','[data-raid="raid_1"] [data-raid-commander-drop]');
  drag('main_11','[data-raid="raid_2"] [data-raid-leader-drop]');
  drag('main_12','[data-raid="raid_2"]');
  expect(saves===4,'Drag did not save each move');
  expect(currentGuildRaids(state,'main').map(r=>r.keys.length).join(',')==='6,6','Six-party layout not saved');
  const partyWidths=[...document.querySelectorAll('[data-raid="raid_1"] .team-card')].map(card=>card.getBoundingClientRect().width);
  if(innerWidth>=768)expect(partyWidths.length===6&&partyWidths.every(width=>width>=340&&width<=400),'Party cards should stay compact in a multi-party raid: '+partyWidths.join(','));
  expect(document.querySelector('[data-team-key="main_9"] .team-name span:last-child').textContent==='Party 5','Moved party number did not follow its position');
  expect(assignedNamesSet().size===150,'Moving parties lost members');
  expect(state.raidLeaders.raid_3===''&&state.raidCommanders.raid_3==='','Removed raid roles survived');
  const print=buildCompactPrintContent('guild_league');expect((print.match(/<article /g)||[]).length===30&&print.includes('--lineup-print-columns:3'),'Print lost parties');
  const grid=document.querySelector('[data-raid="raid_1"] .main-raid-grid');grid.scrollLeft=grid.scrollWidth;expect(grid.scrollLeft>0,'Raid not scrollable');
  drag('main_1','[data-guild-new-raid="main"]');expect(currentGuildRaids(state,'main').length===3,'Cannot create raid by drop');
  const singleGrid=document.querySelector('[data-raid="raid_3"] .main-raid-grid');
  if(innerWidth>=768)expect(singleGrid.classList.contains('single-party')&&singleGrid.querySelector('.team-card').getBoundingClientRect().width<=400,'Single party stretched across raid');
  drag('main_1','[data-raid="raid_1"]');expect(currentGuildRaids(state,'main').length===2,'Last-party move did not remove empty raid');
  drag('main_5','[data-raid="raid_1"]');drag('main_6','[data-raid="raid_1"]');
  const full=JSON.stringify(plannerSnapshot(state)),before=saves;
  drag('main_7','[data-raid="raid_1"]');drag('main_7','[data-raid="sub_raid_1"]');
  expect(saves===before&&JSON.stringify(plannerSnapshot(state))===full,'Limits allowed invalid drop');
  drag('main_5','[data-raid="raid_2"]');drag('main_6','[data-raid="raid_2"]');
  const order=state.guildRaidGroups.raid_1.slice();
  drag(order[1],'[data-team-key="'+order[0]+'"] .slot');
  expect(state.guildRaidGroups.raid_1[0]===order[1]&&state.guildRaidGroups.raid_1[1]===order[0],'Dropping on a party did not swap them');
  expect(document.querySelector('[data-team-key="'+order[1]+'"] .team-name span:last-child').textContent==='Party 1','Swapped party number did not follow its position');
  drag(order[1],'[data-team-key="'+order[0]+'"]');
  expect(JSON.stringify(state.guildRaidGroups.raid_1)===JSON.stringify(order),'Second drop did not restore order');
  expect(assignedNamesSet().size===150&&state.roster.length===150,'Reordering lost players');
  expect(!document.querySelector('[data-guild-remove-party]'),'Party removal button is still visible');
  expect(!document.querySelector('[data-guild-swap]'),'Party swap buttons are still visible');
  expect(!document.querySelector('[data-guild-add-party]'),'Add party button is still visible');
  currentProfile={approved:true,role:'viewer'};renderAll();const readOnly=JSON.stringify(plannerSnapshot(state));moveGuildPartyToRaid('main_1','raid_2');
  expect(!document.querySelector('[data-guild-remove-raid]')&&!document.querySelector('[data-team-drag]')&&readOnly===JSON.stringify(plannerSnapshot(state)),'Read-only user can edit');
  currentProfile={approved:true,role:'admin'};renderAll();
  const result={saves,players:state.roster.length,slotted:assignedNamesSet().size,errors};document.getElementById('browserResult').textContent=JSON.stringify(result);
  ${printing?`state.guildRaidGroups.sub_raid_1=SUB_KEYS.slice(0,8);state.guildRaidGroups.sub_raid_2=SUB_KEYS.slice(8,16);state.guildRaidGroups.sub_raid_3=SUB_KEYS.slice(16);delete state.guildRaidGroups.sub_raid_4;
  document.body.classList.add('print-mode');document.getElementById('titania-content').innerHTML='<div id="printOverlay" class="print-overlay"><div class="print-shell"><div class="print-content">'+buildCompactPrintContent('guild_league')+'</div></div></div>';`:''}
}catch(error){document.getElementById('browserResult').textContent=JSON.stringify({error:error.stack,errors});}})();
`;

const html=`<!doctype html><html data-bs-theme="dark"><head><meta charset="utf-8"><base href="${asset('')}/">${styles.map(file=>`<link rel="stylesheet" href="${asset(file)}">`).join('')}</head><body data-planner-event="guild_league" data-event="guild_league"><div id="titania-content"><div id="teamsWrap"></div></div><pre id="browserResult" hidden></pre><script src="${asset('vendor/sweetalert2/sweetalert2.all.min.js')}"></script><script>${source}</script><script src="${asset('js/guild-raid-controls.js')}"></script><script>${script}</script></body></html>`;
const file=path.join(dir,'index.html');fs.writeFileSync(file,html);
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const output=execFileSync(chrome,['--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files','--user-data-dir='+path.join(dir,'profile'),'--window-size='+(mobile?'500,850':'1440,1000'),'--virtual-time-budget=10000','--screenshot='+path.join(dir,'preview.png'),...(printing?['--no-pdf-header-footer','--print-to-pdf='+path.join(dir,'guild-league.pdf')]:[]),'--dump-dom',pathToFileURL(file).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000,maxBuffer:4*1024*1024});
fs.writeFileSync(path.join(dir,'rendered.html'),output);
const result=JSON.parse(output.match(/<pre id="browserResult"[^>]*>([^]*?)<\/pre>/)?.[1]?.replaceAll('&quot;','"').replaceAll('&amp;','&')||'{}');
assert.equal(result.error,undefined,JSON.stringify(result));assert.equal(result.saves,12,JSON.stringify(result));assert.deepEqual(result.errors,[]);
if(printing){
  const pdf=fs.readFileSync(path.join(dir,'guild-league.pdf'),'latin1');
  const pages=[...pdf.matchAll(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/g)];
  assert.ok(pages.length>0);for(const page of pages)assert.ok(Math.abs(Number(page[1])-841.89)<1&&Math.abs(Number(page[2])-595.28)<1,'A4 landscape required');
  assert.equal((output.replace(/<script\b[^>]*>[^]*?<\/script>/g,'').match(/class="print-team-card/g)||[]).length,30);
}
console.log('PASS: native party drops, inline controls, 6+6 raids, limits, roles, permissions, scrolling, and print. '+dir);
