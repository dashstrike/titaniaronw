// Uses rendered public-page markup and the real auction.js with a mocked backend.
// No registrations or other writes are sent to Supabase.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
(async()=>{
  const origin=process.env.TITANIA_PREVIEW_URL||'http://127.0.0.1:8015';
  let html=await fetch(origin+'/titaniaauction').then(response=>{assert.equal(response.status,200);return response.text();});
  const directory=path.resolve('storage/app/relic-auction-preview');fs.mkdirSync(directory,{recursive:true});
  const mock=`<script>
  const calls=[],external=[],errors=[];window.addEventListener('error',event=>errors.push(event.message));
  const realFetch=window.fetch;window.fetch=(url,options)=>{const target=new URL(url,document.baseURI);if(target.origin!==${JSON.stringify(origin)}){external.push(target.href);return Promise.reject(Error('External request blocked'));}return realFetch(url,options);};
  let registrations=[{id:'test-str',member_id:'test-member',member_name:'Test Player',relic_id:'str',created_at:'2026-11-01T00:00:00Z',ducks:2,next_bidder:false}];
  window.supabase={createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});if(name==='register_public_relic_auction'){registrations.push({id:'test-agi',member_id:args.p_member_id,member_name:'Test Player',relic_id:args.p_relic_ids[0],created_at:'2026-11-01T00:01:00Z',ducks:1});return{data:1};}return{data:{members:[{id:'test-member',name:'Test Player',cls:'Scholar'}],registrations:args?.p_category==='relic'?registrations:[],last_received:{},revision:1,bans:[]}};}})};
  window.addEventListener('load',async()=>{try{
    for(let attempt=0;attempt<60&&!document.querySelector('#relicHeading-str');attempt++)await new Promise(resolve=>setTimeout(resolve,50));
    document.getElementById('auctionRelicTab').click();
    const ids=[...document.querySelectorAll('#relicCard option')].filter(option=>option.value).map(option=>option.value);
    const colors=[...document.querySelectorAll('#relicRegistrations .relic-icon')].map(icon=>getComputedStyle(icon).borderTopColor);
    const glow=[...document.querySelectorAll('#relicRegistrations .relic-icon')].every(icon=>getComputedStyle(icon).boxShadow!=='none');
    jQuery('#relicPlayer').val('test-member').trigger('change');jQuery('#relicCard').val('agi').trigger('change');
    document.getElementById('relicRegisterForm').dispatchEvent(new Event('submit',{cancelable:true}));
    for(let attempt=0;attempt<60&&!calls.some(call=>call.name==='register_public_relic_auction');attempt++)await new Promise(resolve=>setTimeout(resolve,50));
    await new Promise(resolve=>setTimeout(resolve,100));Swal.close();
    const result={ids,colors,glow,calls,external,errors,affixes:document.getElementById('relicRegistrations').textContent.includes('random affixes')};
    const output=document.createElement('pre');output.id='browserResult';output.textContent=JSON.stringify(result);document.body.append(output);
  }catch(error){const output=document.createElement('pre');output.id='browserResult';output.textContent=JSON.stringify({error:error.stack});document.body.append(output);}});
  </script>`;
  html=html.replace(/(?=<script src="[^\"]*\/js\/auction\.js\?)/,mock);
  assert.ok(html.includes('window.supabase={'),'Mock backend was not installed');
  const fixture=path.join(directory,'index.html');fs.writeFileSync(fixture,html);
  const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const dom=execFileSync(chrome,['--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files','--user-data-dir='+path.join(directory,'profile'),'--dump-dom','--virtual-time-budget=7000','--screenshot='+path.join(directory,'preview.png'),'--window-size=1360,1100',pathToFileURL(fixture).href],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000,maxBuffer:5*1024*1024});
  fs.writeFileSync(path.join(directory,'rendered.html'),dom);
  const match=dom.slice(dom.lastIndexOf('<pre id="browserResult">')).match(/<pre id="browserResult">([^]*?)<\/pre>/);assert.ok(match,'Missing result: '+directory);
  const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  assert.equal(result.error,undefined,result.error);assert.deepEqual(result.errors,[]);assert.deepEqual(result.external,[]);
  assert.deepEqual(result.ids,['str','agi','vit','dex','int','luk']);assert.equal(new Set(result.colors).size,6);assert.equal(result.glow,true);assert.equal(result.affixes,false);
  const registered=result.calls.find(call=>call.name==='register_public_relic_auction');assert.deepEqual(registered.args,{p_member_id:'test-member',p_relic_ids:['agi']});
  console.log('PASS: six ordered/color-coded Relic cards, Select2 and registration RPC; external requests blocked. Preview: '+directory);
})().catch(error=>{console.error(error);process.exitCode=1;});
