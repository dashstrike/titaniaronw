// Real template assets; synthetic controls and no Supabase/network data access.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),asset=file=>pathToFileURL(path.join(root,'public',file)).href;
const source=file=>fs.readFileSync(path.join(root,'public/js',file),'utf8');
const runs=source('guild-runs.js'),attendance=source('attendance-page.js'),layout=source('attendance-layout.js');
const extract=(text,start,end)=>text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'titania-all-datepickers-')),fixture=path.join(directory,'test.html');
fs.writeFileSync(fixture,`<!doctype html><html data-bs-theme="dark"><head><link rel="stylesheet" href="${asset('vendor/darkone/css/vendor.min.css')}"><link rel="stylesheet" href="${asset('vendor/darkone/css/style.min.css')}"><link rel="stylesheet" href="${asset('css/titania.css')}"></head><body>
<div id="runsList"><label>Date<input id="runDate" class="form-control" value="2026-11-02"></label><label>Time<input id="runTime" class="form-control" value="21:30"></label><label>Edit Date<input class="form-control" data-run-edit="run_date" data-run-id="one" value="2026-11-02"></label><label>Edit Time<input class="form-control" data-run-edit="run_time" data-run-id="one" value="21:30"></label></div>
<div id="createRow"><select id="attEventSelect"><option value=""></option></select><select id="attCreateType"><option value="tuesday">Tuesday</option><option value="thursday">Thursday</option></select><input id="attCreateDate" class="form-control" value="2026-11-03"><button id="attOpenCreateBtn">Create</button></div>
<pre id="browserResult"></pre><script src="${asset('vendor/darkone/js/vendor.min.js')}"></script><script src="${asset('vendor/sweetalert2/sweetalert2.all.min.js')}"></script><script>
const saves=[];const queueRunSave=input=>saves.push({field:input.dataset.runEdit,value:input.value});
const openOrCreateEvent=()=>{},loadEvent=()=>{},latestScheduledDate=type=>type==='tuesday'?'2026-11-03':'2026-11-05';
${extract(runs,'  function initRunPickers(','  function showError(')}
${extract(runs,'  function wireRunControls(','  async function createRun(')}
${extract(attendance,'  function wirePicker(','\n  function ')}
${extract(layout,'  function eventTypeOptions(','  function enhancePageHeader(')}
const wait=()=>new Promise(resolve=>setTimeout(resolve,300));
(async()=>{
  wireRunControls();
  for(const input of document.querySelectorAll('#runDate,#runTime,[data-run-edit]'))if(!input._flatpickr)throw new Error('Missing Guild Runs template picker');
  const date=document.querySelector('[data-run-edit="run_date"]'),time=document.querySelector('[data-run-edit="run_time"]');
  date._flatpickr.setDate('2026-11-04',true);time._flatpickr.setDate('23:45',true);
  if(saves.length!==2||saves[0].value!=='2026-11-04'||saves[1].value!=='23:45')throw new Error('Run autosave value/event changed');
  if(date._flatpickr.altInput.value!=='November 4, 2026'||!time._flatpickr.config.noCalendar||!time._flatpickr.config.time_24hr)throw new Error('Run date/time presentation incorrect');
  wirePicker();const underlying=document.getElementById('attCreateDate');
  const type=document.getElementById('attCreateType');type.value='thursday';type.dispatchEvent(new Event('change'));
  if(underlying.value!=='2026-11-05'||underlying._flatpickr.altInput.value!=='November 5, 2026')throw new Error('Attendance schedule/display out of sync');
  let submitted;document.getElementById('attOpenCreateBtn').addEventListener('click',()=>submitted={type:type.value,date:underlying.value});
  const pending=openCreateModal(document.getElementById('createRow'));await wait();
  const popupDate=document.getElementById('swalAttDate'),picker=popupDate._flatpickr;
  if(!picker)throw new Error('Attendance popup datepicker missing');
  picker.open();await wait();const rect=picker.calendarContainer.getBoundingClientRect();
  if(!picker.calendarContainer.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)))throw new Error('Attendance popup calendar not clickable');
  picker.setDate('2026-11-06',true);picker.close();Swal.getConfirmButton().click();await pending;await wait();
  if(submitted?.date!=='2026-11-06'||underlying._flatpickr.altInput.value!=='November 6, 2026')throw new Error('Attendance selected date not submitted');
  if(document.querySelectorAll('.flatpickr-calendar').length!==5)throw new Error('Attendance popup calendar was not cleaned up');
  document.getElementById('browserResult').textContent=JSON.stringify({passed:true,saves,submitted});
})().catch(error=>document.getElementById('browserResult').textContent=JSON.stringify({error:error.stack}));
</script></body></html>`);
const html=execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files','--window-size=1100,1000','--user-data-dir='+path.join(directory,'profile'),'--dump-dom','--virtual-time-budget=5000',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:25000,maxBuffer:4*1024*1024});
const match=html.match(/<pre id="browserResult"[^>]*>([\s\S]*?)<\/pre>/);assert.ok(match,'Missing browser result');const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));assert.equal(result.passed,true,JSON.stringify(result));
console.log('PASS: Guild Runs create/edit date and 24-hour time pickers use template controls; autosave keeps raw formats; Attendance schedule and modal selections remain synchronized and calendar is clickable.');
