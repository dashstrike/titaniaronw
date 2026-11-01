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
  let registrations=[{id:'test-str',member_id:'test-member',member_name:'Test Player',relic_id:'bane_str',created_at:'2026-11-01T00:00:00Z',ducks:2,next_bidder:false}];
  window.supabase={createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});if(name==='register_public_relic_auction'){registrations.push({id:'test-agi',member_id:args.p_member_id,member_name:'Test Player',relic_id:args.p_relic_ids[0],created_at:'2026-11-01T00:01:00Z',ducks:1});return{data:1};}return{data:{members:[{id:'test-member',name:'Test Player',cls:'Scholar'},{id:'other-member',name:'Other Player',cls:'Stalker'}],registrations:args?.p_category==='relic'?registrations:[{id:'other-category',member_id:'test-member',member_name:'Test Player',card_id:'fh',accessory_id:'56009017',created_at:'2026-11-01T00:00:00Z',ducks:1}],last_received:{},revision:1,bans:[]}};}})};
  window.addEventListener('load',async()=>{try{
    for(let attempt=0;attempt<60&&!document.querySelector('#relicHeading-bane_str');attempt++)await new Promise(resolve=>setTimeout(resolve,50));
    document.getElementById('auctionRelicTab').click();
    const alreadyRegistered=[];
    function checkChoice(prefix,id){
      const select=jQuery('#'+prefix+'Card');
      const option=[...select[0].options].find(option=>option.value===id);
      const label=option.dataset.name;
      select.select2('open');select.select2('close'); // Warm Select2's cache before changing IGN.
      jQuery('#'+prefix+'Player').val('test-member').trigger('change');select.select2('open');
      let row=[...document.querySelectorAll('.select2-results__option')].find(row=>row.textContent.startsWith(label));
      const registered=Boolean(row?.textContent.includes('(Already registered)')&&row.getAttribute('aria-disabled')==='true');
      select.select2('close');jQuery('#'+prefix+'Player').val('other-member').trigger('change');select.select2('open');
      row=[...document.querySelectorAll('.select2-results__option')].find(row=>row.textContent.startsWith(label));
      const reset=Boolean(row&&!row.textContent.includes('(Already registered)')&&row.getAttribute('aria-disabled')!=='true');
      select.select2('close');alreadyRegistered.push({prefix,registered,reset});
    }
    for(const [tab,prefix,id] of [['auctionCardTab','auction','fh'],['auctionAccessoryTab','accessory','56009017'],['auctionRelicTab','relic','bane_str']]){
      document.getElementById(tab).click();checkChoice(prefix,id);
    }
    const ids=[...document.querySelectorAll('#relicCard option')].filter(option=>option.value).map(option=>option.value);
    const headers=[...document.querySelectorAll('#relicRegistrations .relic-header strong')].map(header=>header.textContent);
    jQuery('#relicType').val('guard').trigger('change');
    const guardIds=[...document.querySelectorAll('#relicCard option')].filter(option=>option.value).map(option=>option.value);
    const icons=[...document.querySelectorAll('#relicRegistrations .relic-icon')];
    const colors=icons.map(icon=>getComputedStyle(icon).getPropertyValue('--relic-color').trim());
    const glow=icons.every(icon=>getComputedStyle(icon).filter.includes('drop-shadow'));
    const cleanIcons=icons.every(icon=>{const style=getComputedStyle(icon);return style.borderTopWidth==='0px'&&style.boxShadow==='none'&&style.backgroundColor==='rgba(0, 0, 0, 0)';});
    jQuery('#relicPlayer').val('test-member').trigger('change');jQuery('#relicCard').val('guard_agi').trigger('change');
    document.getElementById('relicRegisterForm').dispatchEvent(new Event('submit',{cancelable:true}));
    for(let attempt=0;attempt<60&&!calls.some(call=>call.name==='register_public_relic_auction');attempt++)await new Promise(resolve=>setTimeout(resolve,50));
    await new Promise(resolve=>setTimeout(resolve,100));Swal.close();
    const result={ids,guardIds,headers,colors,glow,cleanIcons,calls,external,errors,alreadyRegistered,affixes:document.getElementById('relicRegistrations').textContent.includes('random affixes')};
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
  for(const check of result.alreadyRegistered){assert.equal(check.registered,true,check.prefix+' must display and disable Already registered');assert.equal(check.reset,true,check.prefix+' must clear the label for a different player');}
  const stats=['str','agi','vit','dex','int','luk'];
  assert.deepEqual(result.ids,stats.map(stat=>'bane_'+stat));assert.deepEqual(result.guardIds,stats.map(stat=>'guard_'+stat));
  assert.deepEqual(result.headers,['Bane','Guard'].flatMap(type=>stats.map(stat=>stat.toUpperCase()+' Relic ('+type+')')));
  assert.equal(new Set(result.colors).size,6);assert.equal(result.glow,true);assert.equal(result.cleanIcons,true);assert.equal(result.affixes,false);
  const registered=result.calls.find(call=>call.name==='register_public_relic_auction');assert.deepEqual(registered.args,{p_member_id:'test-member',p_relic_ids:['guard_agi']});
  console.log('PASS: 12 typed Relic headers, six-stat type filtering, colors and Guard registration; external requests blocked. Preview: '+directory);
})().catch(error=>{console.error(error);process.exitCode=1;});
