// Actual SweetAlert2 and planner CSS, synthetic modal only; no database writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const asset=file=>pathToFileURL(path.join(root,'public',file)).href;
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'titania-planner-confirmation-'));
const fixture=path.join(directory,'test.html');
const source=fs.readFileSync(path.join(root,'public/js/pages/index.js'),'utf8');
const confirmation=source.slice(source.indexOf('  let plannerConfirmationPending=false;'),source.indexOf('  function wirePlannerScrolling('));
const blade=fs.readFileSync(path.join(root,'resources/views/pages/index.blade.php'),'utf8');
const markup=blade.slice(blade.indexOf('  <div class="overlay" id="memberModal"'),blade.indexOf('  <div class="overlay" id="adminUsersModal"'));
const modalFunctions=source.slice(source.indexOf('  function openMemberModal('),source.indexOf('  function nationalitySelectTemplate('));
const statusFunctions=source.slice(source.indexOf('  function prepareMemberStatus('),source.indexOf('  async function saveStatusModal('));
fs.writeFileSync(fixture,`<!doctype html><html data-bs-theme="dark"><head>
<link rel="stylesheet" href="${asset('vendor/darkone/css/vendor.min.css')}">
<link rel="stylesheet" href="${asset('vendor/darkone/css/style.min.css')}">
<link rel="stylesheet" href="${asset('css/pages/index.css')}">
<link rel="stylesheet" href="${asset('css/titania.css')}">
</head><body><div id="titania-content">${markup}</div>
<pre id="browserResult"></pre><script src="${asset('vendor/darkone/js/vendor.min.js')}"></script><script src="${asset('vendor/sweetalert2/sweetalert2.all.min.js')}"></script><script>
let currentEvent='manage_members';const showToast=()=>{};
let editingMemberName=null,statusModalMemberName=null,statusModalMode='inactive';
const memberByName={Test:{name:'Test',id:'one',cls:'Champion',gr:50000,status:'active',notes:'Saved notes'}};
const memberDrafts=new Map(),INACTIVE_REASONS=['Left Guild','Other'],REACTIVATE_REASONS=['Returned to Guild','Other'];
const isActiveMember=member=>member.status!=='inactive',todayIso=()=> '2026-11-02',formatDate=String,formatNumber=String;
const escapeHtml=value=>String(value??''),escapeAttr=escapeHtml;
const populateClassOptions=(select,value)=>{select.innerHTML='<option>'+value+'</option>';},initNationalitySelect=()=>{};
${modalFunctions}
${statusFunctions}
${confirmation}
const wait=()=>new Promise(resolve=>setTimeout(resolve,350));
(async()=>{
  const cases=[];
  openMemberModal('Test');
  document.getElementById('memberNotesInput').value='Unsaved notes';setMemberAction('inactive');setMemberAction('delete');setMemberAction('edit');
  if(document.getElementById('memberNotesInput').value!=='Unsaved notes'||memberByName.Test.notes!=='Saved notes')throw new Error('Switching actions lost edits or saved data');
  const before=JSON.stringify(memberByName);
  for(const scenario of [{action:'inactive',title:'Mark member inactive',confirm:'Save inactive status',danger:true},{action:'edit',title:'Edit member',confirm:'Save member',danger:false},{action:'reactivate',title:'Reactivate member',confirm:'Save and reactivate',danger:false},{action:'delete',title:'Delete member',confirm:'Delete member',danger:true}]){
  memberByName.Test.status=scenario.action==='reactivate'?'inactive':'active';openMemberModal('Test');setMemberAction(scenario.action);
  const overlay=document.getElementById('memberModal');
  const expected=scenario.action==='edit'?'memberEditPanel':scenario.action==='delete'?'memberDeletePanel':'statusModal';
  if(document.getElementById(expected).hidden)throw new Error('Wrong action panel: '+scenario.action);
  if(scenario.action==='inactive'||scenario.action==='reactivate'){
    const date=document.getElementById('statusDateInput'),picker=date._flatpickr;
    if(!picker||date.value!=='2026-11-02'||picker.altInput.value!=='November 2, 2026')throw new Error('Template datepicker/date value missing');
    picker.open();await wait();
    const calendar=picker.calendarContainer,rect=calendar.getBoundingClientRect();
    if(!picker.isOpen||rect.width===0||!calendar.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)))throw new Error('Datepicker is not visible/clickable above modal');
    picker.close();
  }
  const result={scenario:scenario.title};
  for(const action of ['cancel','confirm']){
    const pending=confirmPlannerAction(scenario.title,'Synthetic test',scenario.confirm,scenario.danger);
    await wait();
    const button=action==='confirm'?Swal.getConfirmButton():Swal.getCancelButton();
    const rect=button.getBoundingClientRect();const hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
    result[action+'Clickable']=button===hit||button.contains(hit);
    result.swalZ=Number(getComputedStyle(Swal.getContainer()).zIndex);
    result.modalZ=Number(getComputedStyle(overlay).zIndex);
    button.click();result[action+'Result']=await pending;await wait();
    result.modalPreserved=!overlay.hidden;
  }
  cases.push(result);
  }
  document.getElementById('browserResult').textContent=JSON.stringify({cases});
})().catch(error=>document.getElementById('browserResult').textContent=JSON.stringify({error:error.stack}));
</script></body></html>`);
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const html=execFileSync(chrome,['--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files','--window-size=1100,850','--user-data-dir='+path.join(directory,'profile'),'--dump-dom','--virtual-time-budget=9000',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:25000,maxBuffer:4*1024*1024});
const match=html.match(/<pre id="browserResult"[^>]*>([\s\S]*?)<\/pre>/);assert.ok(match,'Missing browser result');
const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
assert.equal(result.error,undefined,JSON.stringify(result));assert.equal(result.cases.length,4);
for(const scenario of result.cases){
assert.ok(scenario.swalZ>scenario.modalZ,JSON.stringify(scenario));
assert.equal(scenario.cancelClickable,true);assert.equal(scenario.confirmClickable,true);
assert.equal(scenario.cancelResult,false);assert.equal(scenario.confirmResult,true);assert.equal(scenario.modalPreserved,true);
}
console.log('PASS: One Manage Member modal switches Edit/Inactive/Reactivate/Delete without saving; all four SweetAlert2 confirmations render in front with clickable Confirm and Cancel.');
