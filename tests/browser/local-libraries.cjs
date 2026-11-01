// Offline browser smoke test: no API calls or real member data.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'titania-local-libraries-'));
const fixture=path.join(directory,'test.html'),root=path.resolve(__dirname,'../../public');
const asset=file=>pathToFileURL(path.join(root,file)).href;
const scripts=['vendor/datatables/jquery.min.js','vendor/select2/select2.min.js','vendor/sweetalert2/sweetalert2.all.min.js','vendor/supabase/supabase.js','vendor/chartjs/chart.umd.js','vendor/iconify/icons.js','vendor/darkone/js/vendor.min.js'];
fs.writeFileSync(fixture,`<!doctype html><html data-bs-theme="dark"><head><base href="${asset('')}/"><script>
const errors=[],external=[];window.addEventListener('error',event=>errors.push(event.message));
window.fetch=(url)=>{external.push(String(url));return Promise.reject(new Error('External requests blocked'));};
</script>${scripts.map(file=>`<script src="${asset(file)}"></script>`).join('')}
<link rel="stylesheet" href="${asset('vendor/select2/select2.min.css')}"><link rel="stylesheet" href="${asset('vendor/fonts/play.css')}"><link rel="stylesheet" href="${asset('vendor/fontawesome/css/all.min.css')}"></head>
<body><select id="job"><option>High Priest</option><option>Scholar</option></select><iconify-icon icon="mdi:duck" id="duck"></iconify-icon><pre id="browserResult"></pre><script>
(async()=>{
  $('#job').select2({minimumResultsForSearch:0});$('#job').select2('open');
  const select2Search=Boolean(document.querySelector('.select2-search__field'));
  $('#job').val('Scholar').trigger('change');$('#job').select2('close');
  const prompt=Swal.fire({title:'Save changes?',showCancelButton:true});Swal.clickCancel();const result=await prompt;
  await document.fonts.ready;await new Promise(resolve=>setTimeout(resolve,250));
  document.getElementById('browserResult').textContent=JSON.stringify({errors,external,select2Search,
    selected:$('#job').val(),sweetAlertCancelled:result.isDismissed,supabase:typeof supabase.createClient,
    chart:typeof Chart,localIcon:Boolean(document.getElementById('duck').shadowRoot?.querySelector('svg'))});
})().catch(error=>document.getElementById('browserResult').textContent=JSON.stringify({error:error.stack}));
</script></body></html>`);
const chrome=process.env.CHROME_PATH||path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe');
const html=execFileSync(chrome,['--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files','--user-data-dir='+path.join(directory,'profile'),'--dump-dom','--virtual-time-budget=5000',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000,maxBuffer:4*1024*1024});
fs.writeFileSync(path.join(directory,'rendered.html'),html);
const match=html.match(/<pre\b[^>]*\bid="browserResult"[^>]*>([\s\S]*?)<\/pre>/);assert.ok(match,'No browser result; inspect '+path.join(directory,'rendered.html'));
const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
assert.equal(result.error,undefined,result.error);assert.deepEqual(result.errors,[]);assert.deepEqual(result.external,[]);
assert.equal(result.select2Search,true);assert.equal(result.selected,'Scholar');assert.equal(result.sweetAlertCancelled,true);
assert.equal(result.supabase,'function');assert.equal(result.chart,'function');assert.equal(result.localIcon,true);
console.log('PASS: Select2, SweetAlert2, Supabase, Chart.js, fonts and Iconify icons work locally with network requests blocked.');
