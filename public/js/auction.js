(function(){
  let connection;
  async function connect(organizerPage){
    const cfg=window.TITANIA_CONFIG||{};
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey)throw new Error('Auction connection is unavailable.');
    const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:organizerPage,autoRefreshToken:organizerPage,detectSessionInUrl:false}});
    let canManage=false;
    if(organizerPage){
      const {data,error}=await client.auth.getUser();
      if(error||!data.user)throw new Error('Sign in to Titania first to manage auctions.');
      const profile=await client.from('profiles').select('role,approved').eq('id',data.user.id).single();
      if(profile.error||!profile.data?.approved)throw new Error('Approved Titania access is required.');
      canManage=profile.data.role==='admin';
    }
    const iconMap=await fetch('./images/job/job-icons.json').then(response=>response.ok?response.json():{}).catch(()=>({}));
    return {client,canManage,iconMap};
  }
  function TitaniaAuction(category){
  'use strict';
  const root=document.getElementById('auctionPage');
  if(!root)return;
  const accessory=category==='accessory';
  const prefix=accessory?'accessory':'auction';
  const itemLabel=accessory?'accessory':'card';
  const theme=accessory?'danger':'primary';
  const el=id=>document.getElementById(id.replace(/^auction/,prefix));
  const organizerPage=root.dataset.organizer==='true';
  const cards=[...el('auctionCard').options].filter(option=>option.value);
  const expanded=new Map();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client,members=[],registrations=[],iconMap={},canManage=false,busy=false,loaded=false;
  function registeredPlayer(row){
    const member=members.find(item=>String(item.id)===String(row.member_id));
    const file=member&&iconMap[member.cls];
    const image=file?`<img src="./images/job/${esc(encodeURIComponent(file))}" width="24" height="24" class="mr-2 flex-shrink-0" alt="${esc(member.cls)}">`:'';
    const name=organizerPage?`<a href="member?id=${encodeURIComponent(row.member_id)}" target="_blank" rel="noopener noreferrer">${esc(row.member_name)}</a>`:`<span>${esc(row.member_name)}</span>`;
    return `<span class="d-inline-flex align-items-center">${image}${name}</span>`;
  }
  function optionTemplate(option){
    if(!option.id)return option.text;
    const isCard=option.element?.parentElement?.id===el('auctionCard').id;
    const member=isCard?null:members.find(item=>String(item.id)===String(option.id));
    const file=member&&iconMap[member.cls];
    const src=isCard?option.element.dataset.image:file?'./images/job/'+encodeURIComponent(file):'';
    const row=document.createElement('span');
    row.className='select2-player gap-0';
    if(src){const image=document.createElement('img');image.src=src;image.alt='';image.className='mr-2';row.appendChild(image);}
    const text=document.createElement('span');text.textContent=option.text;row.appendChild(text);
    return row;
  }
  function dropdowns(){
    if(!(window.jQuery&&jQuery.fn.select2))return;
    ['auctionPlayer','auctionCard'].forEach(id=>{
      const select=jQuery(el(id));
      if(select.hasClass('select2-hidden-accessible'))select.select2('destroy');
      select.prop('disabled',!loaded||busy).select2({
        dropdownParent:jQuery('#titania-content'),
        placeholder:id==='auctionPlayer'?'Search player...':`Search ${itemLabel}...`,
        allowClear:true,width:'100%',templateResult:optionTemplate,templateSelection:optionTemplate
      });
    });
  }
  function message(text,error=false){
    el('auctionMessage').hidden=true;
    if(!text)return;
    if(window.Swal){
      Swal.fire({
        title:error?'Unable to complete request':text.startsWith('Registered for ')?'Registered':accessory?'Accessory Auction':'Card Auction',
        text,
        icon:error?'error':text.startsWith('Registered for ')?'success':'info',
        confirmButtonText:'OK',
        confirmButtonColor:`var(--bs-${theme})`,
        background:'var(--bs-secondary-bg)',
        color:'var(--bs-body-color)'
      });
      return;
    }
    el('auctionMessage').textContent=text;
    el('auctionMessage').className='alert '+(error?'alert-danger':'alert-info');
    el('auctionMessage').hidden=!text;
  }
  async function rpc(name,args){
    if(accessory){
      name=name.replace('card_auction','accessory_auction');
      if(args?.p_card_ids){args={p_member_id:args.p_member_id,p_accessory_ids:args.p_card_ids};}
    }
    const result=await client.rpc(name,args);
    if(result.error)throw result.error;
    return result.data;
  }
  function players(){
    const selected=el('auctionPlayer').value;
    el('auctionPlayer').innerHTML='<option value="">Select IGN</option>'+members.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
    el('auctionPlayer').value=selected;
  }
  function render(){
    el('auctionFields').disabled=!loaded||busy;
    const rows=registrations;
    const selectedMember=el('auctionPlayer').value;
    cards.forEach(input=>{
      const registered=rows.some(row=>row.member_id===selectedMember&&row.card_id===input.value);
      input.disabled=registered;
      input.textContent=input.dataset.name+(registered?' (Already registered)':'');
      if(registered&&input.selected)el('auctionCard').value='';
    });
    dropdowns();
    el('auctionTotals').textContent=loaded?`${new Set(rows.map(row=>row.member_id)).size} players · ${rows.length} ${itemLabel} registrations`:'Loading registrations...';
    el('auctionRegistrations').querySelectorAll('[data-auction-details]').forEach(node=>window.bootstrap?.Popover.getInstance(node)?.dispose());
    el('auctionRegistrations').innerHTML=loaded?cards.map(input=>{
      const name=input.dataset.name;
      const image=input.dataset.image;
      const entries=rows.filter(row=>row.card_id===input.value).sort((a,b)=>a.member_name.localeCompare(b.member_name));
      return `<div class="col-12 col-md-6"><div class="card mb-0"><button type="button" id="auctionHeading-${esc(input.value)}" class="card-header border-top-0 border-start-0 border-end-0 border-bottom text-start text-body w-100" data-bs-toggle="collapse" data-bs-target="#auctionList-${esc(input.value)}" aria-expanded="${expanded.get(input.value)!==false}" aria-controls="auctionList-${esc(input.value)}"><span class="d-flex align-items-center mb-2"><img ${accessory?`data-auction-details="${esc(input.value)}"`:""} src="${esc(image)}" width="44" height="44" class="mr-2 flex-shrink-0" alt=""><strong class="mr-2">${esc(name)}</strong><span class="badge bg-${theme} text-white ms-auto mr-2 flex-shrink-0">${String(entries.length).padStart(2,'0')}</span><i class="fa-solid ${expanded.get(input.value)!==false?'fa-chevron-up':'fa-chevron-down'} flex-shrink-0" aria-hidden="true"></i></span><span class="d-block small text-muted mb-0">${accessory?"Level 90 · ":""}${esc(input.dataset.effect)}${accessory?"":"<br>Includes up to 2 random affixes."}</span></button><div id="auctionList-${esc(input.value)}" class="collapse ${expanded.get(input.value)!==false?'show':''}" data-auction-card="${esc(input.value)}" role="region" aria-labelledby="auctionHeading-${esc(input.value)}"><div class="card-body">${entries.length?'<ul class="list-unstyled mb-0">'+entries.map((row,index)=>`<li class="d-flex align-items-center justify-content-between ${index?"border-top ":""}py-2">${registeredPlayer(row)}<span class="d-inline-flex align-items-center flex-shrink-0 ms-auto"><span class="d-inline-flex align-items-center text-nowrap mx-2" aria-label="${esc(row.ducks??1)} ducks"><iconify-icon icon="mdi:duck" class="text-warning mr-2 fs-28" aria-hidden="true"></iconify-icon>×${esc(row.ducks??1)}</span>${canManage?`<button type="button" class="btn btn-sm btn-outline-danger" data-remove="${esc(row.id)}" aria-label="Mark ${itemLabel} received by ${esc(row.member_name)}" title="Mark ${itemLabel} received"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`:''}</span></li>`).join('')+'</ul>':'<p class="text-muted small mb-0">No registrations yet.</p>'}</div></div></div></div>`;
    }).join('').replaceAll('auctionHeading-',prefix+'Heading-').replaceAll('auctionList-',prefix+'List-'):'';
    if(accessory&&window.bootstrap?.Popover){
      el('auctionRegistrations').querySelectorAll('[data-auction-details]').forEach(node=>{
        const item=cards.find(option=>option.value===node.dataset.auctionDetails);
        new bootstrap.Popover(node,{trigger:'hover',placement:'auto',container:'body',html:true,
          template:'<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header bg-danger text-white"></h3><div class="popover-body"></div></div>',
          title:esc(item.dataset.name),content:document.getElementById('accessoryDetails-'+item.value).innerHTML,
          delay:{show:250,hide:100}});
      });
    }
  }
  async function load(){
    const payload=await rpc('get_public_card_auctions');
    members=payload.members||[];registrations=(payload.registrations||[]).map(row=>accessory?{...row,card_id:row.accessory_id}:row);
    loaded=true;
    players();render();
  }
  async function action(button,callback){
    if(busy)return;
    busy=true;button.disabled=true;el('auctionFields').disabled=true;dropdowns();message('');
    try{await callback();}catch(error){message(error.message||'Could not complete the request. Please try again.',true);}
    finally{busy=false;button.disabled=false;render();}
  }
  el('auctionRegisterForm').addEventListener('submit',event=>{
    event.preventDefault();
    const selected=cards.find(option=>option.selected&&!option.disabled);
    if(!selected){message(`Select a ${itemLabel}.`,true);return;}
    const memberId=el('auctionPlayer').value;
    if(!loaded||!memberId)return;
    action(el('auctionRegister'),async()=>{
      const count=await rpc('register_public_card_auction',{p_member_id:memberId,p_card_ids:[selected.value]});
      el('auctionCard').value='';
      message(count?`Registered for ${selected.dataset.name}.`:`You are already registered for this ${itemLabel}.`);
      try{await load();}catch(error){message('Registration saved. Refresh to reload the list.',true);}
    });
  });
  const playerChanged=()=>{el('auctionCard').value='';render();};
  if(window.jQuery)jQuery(el('auctionPlayer')).on('change',playerChanged);
  else el('auctionPlayer').addEventListener('change',playerChanged);
  el('auctionRefresh').addEventListener('click',()=>action(el('auctionRefresh'),()=>load()));
  ['show.bs.collapse','hide.bs.collapse'].forEach(type=>{
    el('auctionRegistrations').addEventListener(type,event=>{
      const card=event.target.dataset.auctionCard;
      if(!card)return;
      const open=type==='show.bs.collapse';
      expanded.set(card,open);
      const heading=el('auctionHeading-'+card);
      heading.setAttribute('aria-expanded',String(open));
      const arrow=heading.querySelector('.fa-chevron-up,.fa-chevron-down');
      arrow.classList.toggle('fa-chevron-up',open);
      arrow.classList.toggle('fa-chevron-down',!open);
    });
  });
  el('auctionRegistrations').addEventListener('click',async event=>{
    const button=event.target.closest('[data-remove]');
    if(!button||!canManage||busy)return;
    if(!window.Swal){message('Confirmation could not load. Please refresh and try again.',true);return;}
    const confirmation=await Swal.fire({
      title:`Player received this ${itemLabel}?`,
      text:`This will save the ${itemLabel} to their player history and give everyone remaining on this ${itemLabel} +1 duck.`,
      icon:'warning',
      showCancelButton:true,
      confirmButtonText:`Yes, ${itemLabel} received`,
      cancelButtonText:'Cancel',
      confirmButtonColor:'var(--bs-danger)',
      cancelButtonColor:'var(--bs-secondary)',
      background:'var(--bs-secondary-bg)',
      color:'var(--bs-body-color)',
      focusCancel:true
    });
    if(!confirmation.isConfirmed)return;
    action(button,async()=>{await rpc('remove_card_auction_registration',{p_id:button.dataset.remove});await load();});
  });
  async function boot(){
    try{
      connection ||= connect(organizerPage);
      ({client,canManage,iconMap}=await connection);
      await load();
    }catch(error){message(error.message||'Could not load auctions.',true);}
  }
  boot();
  }
  TitaniaAuction('card');
  TitaniaAuction('accessory');
})();
