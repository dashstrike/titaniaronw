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
  const workflow=window.TITANIA_CONFIG?.auctionWorkflow===true;
  const el=id=>document.getElementById(id.replace(/^auction/,prefix));
  const organizerPage=root.dataset.organizer==='true';
  const cards=[...el('auctionCard').options].filter(option=>option.value);
  const expanded=new Map();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client,members=[],registrations=[],lastReceived={},iconMap={},canManage=false,busy=false,loaded=false,bans=[],revision=0;
  const uuid=()=>{
    const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    return [...bytes].map((v,i)=>([4,6,8,10].includes(i)?'-':'')+v.toString(16).padStart(2,'0')).join('');
  };
  const dialogTheme={background:'var(--bs-secondary-bg)',color:'var(--bs-body-color)',confirmButtonColor:'var(--bs-primary)'};
  const inputTime=value=>value?new Date(value.replace(' ','T')+':00+08:00'):new Date(NaN);
  function receiptTime(itemId){
    const value=lastReceived[itemId];
    if(!value)return 'Not yet';
    return formatTime(value);
  }
  function formatTime(value){
    if(!value)return 'Not available';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return 'Not available';
    return date.toLocaleString('en-GB',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true})+' GMT+8';
  }
  function registeredPlayer(row){
    const member=members.find(item=>String(item.id)===String(row.member_id));
    const file=member&&iconMap[member.cls];
    const image=file?`<img src="./images/job/${esc(encodeURIComponent(file))}" width="24" height="24" class="mr-2 flex-shrink-0" alt="${esc(member.cls)}">`:'';
    const name=organizerPage?`<a href="member?id=${encodeURIComponent(row.member_id)}" target="_blank" rel="noopener noreferrer">${esc(row.member_name)}</a>`:`<span>${esc(row.member_name)}</span>`;
    const copy=organizerPage&&canManage?`<button type="button" class="btn btn-sm btn-outline-secondary border-0 p-1 ms-2 d-inline-flex align-items-center justify-content-center" data-copy-ign="${esc(row.id)}" aria-label="Copy IGN ${esc(row.member_name)}" data-titania-tooltip="Copy IGN"><i class="fa-regular fa-copy" aria-hidden="true"></i></button>`:'';
    return `<span class="d-inline-flex align-items-center">${image}<span class="d-flex flex-column"><span class="d-inline-flex align-items-center flex-wrap gap-2"><span class="d-inline-flex align-items-center">${name}${copy}</span>${workflow&&row.next_bidder?'<span class="badge bg-warning text-dark" title="Will bid in the next auction for this item.">NEXT BIDDER</span>':''}</span><small class="text-muted fst-italic">${esc(formatTime(row.created_at))}</small></span></span>`;
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
    ['auctionPlayer','auctionCard',...(workflow&&canManage?['auctionBanPlayer']:[])].forEach(id=>{
      const select=jQuery(el(id));
      if(select.hasClass('select2-hidden-accessible'))select.select2('destroy');
      select.prop('disabled',!loaded||busy).select2({
        dropdownParent:jQuery('#titania-content'),
        placeholder:id==='auctionCard'?`Search ${itemLabel}...`:'Search player...',
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
    const banned=new Set(bans.filter(b=>b.active).map(b=>b.member_id));
    const options='<option value="">Select IGN</option>'+members.map(m=>`<option value="${esc(m.id)}" ${banned.has(m.id)?'disabled':''}>${esc(m.name)}${banned.has(m.id)?' (BANNED)':''}</option>`).join('');
    el('auctionPlayer').innerHTML=options;
    el('auctionPlayer').value=banned.has(selected)?'':selected;
    if(workflow&&canManage){
      const selectedBan=el('auctionBanPlayer').value;
      el('auctionBanPlayer').innerHTML=options;
      el('auctionBanPlayer').value=banned.has(selectedBan)?'':selectedBan;
    }
  }
  async function copyIgn(button){
    if(!organizerPage||!canManage||button.disabled)return;
    const row=registrations.find(item=>item.id===button.dataset.copyIgn);
    if(!row)return;
    await copyText(button,row.member_name,'Copy IGN');
  }
  async function copyAllNames(button){
    if(!organizerPage||!canManage||button.disabled||busy)return;
    const entries=registrations.filter(row=>row.card_id===button.dataset.copyAllNames).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    const next=entries.find(row=>row.next_bidder);
    if(next){message(`${next.member_name} is NEXT BIDDER for this item. A new duck race is not needed until that status is cleared or the item is received.`);return;}
    const names=entries.flatMap(row=>Array.from({length:Math.max(0,Number(row.ducks??1))},()=>row.member_name));
    if(!names.length){message('There are no duck entries to copy for this item.');return;}
    await copyText(button,names.join('\n'),'Copy All Names');
  }
  async function copyText(button,text,label){
    button.disabled=true;
    const icon=button.querySelector('i');
    const originalIcon=icon.className;
    const caption=button.querySelector('[data-copy-caption]');
    const originalCaption=caption?.textContent;
    const originalLabel=button.getAttribute('aria-label')||label;
    try{
      let copied=false;
      if(navigator.clipboard?.writeText){
        try{await navigator.clipboard.writeText(text);copied=true;}catch(_error){}
      }
      if(!copied){
        const previousFocus=document.activeElement;
        const input=document.createElement('textarea');
        input.value=text;
        input.readOnly=true;
        input.className='position-fixed top-0 start-0 opacity-0 pe-none';
        input.setAttribute('aria-hidden','true');
        input.tabIndex=-1;
        document.body.appendChild(input);
        try{input.select();copied=document.execCommand('copy');}
        finally{input.remove();previousFocus?.focus({preventScroll:true});}
      }
      if(!copied)throw new Error('Could not copy the names. Please select and copy the player names manually.');
      icon.className='fa-solid fa-check text-success'+(caption?' me-2':'');
      if(caption)caption.textContent='Copied';
      button.dataset.titaniaTooltip='Copied';
      button.setAttribute('aria-label','Names copied');
      setTimeout(()=>{
        icon.className=originalIcon;
        if(caption)caption.textContent=originalCaption;
        button.dataset.titaniaTooltip=label;
        button.setAttribute('aria-label',originalLabel);
        button.disabled=false;
      },1500);
    }catch(error){button.disabled=false;message(error.message,true);}
  }
  function rowActions(row){
    if(!canManage)return '';
    const received=`<button type="button" class="btn btn-sm btn-outline-success" ${workflow?'data-workflow="received" data-registration':'data-remove'}="${esc(row.id)}" aria-label="Mark ${itemLabel} received by ${esc(row.member_name)}" title="Mark ${itemLabel} received"><i class="fa-solid fa-check" aria-hidden="true"></i></button>`;
    if(!workflow)return received;
    const choices=row.next_bidder?[['outbid_again','Outbid Again'],['clear_next','Clear Next Bidder'],['withdraw','Withdraw']]:[...(Number(row.ducks??1)>0?[['carry_forward','Carry Forward']]:[]),['add_duck','Add 1 Duck','text-info'],...(Number(row.ducks??1)>0?[['remove_duck','Remove 1 Duck','text-danger']]:[]),['withdraw','Withdraw']];
    return received+`<span class="dropdown ms-2"><button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="More actions for ${esc(row.member_name)}"><i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i></button><span class="dropdown-menu dropdown-menu-end">${choices.map(([kind,label,color])=>`<button type="button" class="dropdown-item${color?' '+color:''}" data-workflow="${kind}" data-registration="${esc(row.id)}">${label}</button>`).join('')}</span></span>`;
  }
  function render(){
    el('auctionFields').disabled=!loaded||busy;
    if(workflow&&canManage){el('auctionBanForm').hidden=false;el('auctionBanFields').disabled=!loaded||busy;el('auctionActionHistory').hidden=false;}
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
    el('auctionRegistrations').querySelectorAll('[data-bs-toggle="dropdown"]').forEach(node=>window.bootstrap?.Dropdown.getInstance(node)?.dispose());
    el('auctionRegistrations').innerHTML=loaded?cards.map(input=>{
      const name=input.dataset.name;
      const image=input.dataset.image;
      const entries=rows.filter(row=>row.card_id===input.value).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
      const headerTag=organizerPage?'div':'button';
      const headerAttributes=organizerPage?'':`type="button" data-bs-toggle="collapse" data-bs-target="#auctionList-${esc(input.value)}" aria-expanded="${expanded.get(input.value)!==false}" aria-controls="auctionList-${esc(input.value)}"`;
      const arrow=organizerPage?'':`<i class="fa-solid ${expanded.get(input.value)!==false?'fa-chevron-up':'fa-chevron-down'} flex-shrink-0" aria-hidden="true"></i>`;
      const listClass=organizerPage?'':`collapse ${expanded.get(input.value)!==false?'show':''}`;
      const copyAll=organizerPage&&canManage?`<div class="d-flex w-100 justify-content-start mt-2"><button type="button" class="btn btn-sm btn-light text-dark d-inline-flex align-items-center justify-content-center" data-copy-all-names="${esc(input.value)}" aria-label="Copy all names for ${esc(name)}" data-titania-tooltip="Copy All Names"><i class="fa-regular fa-copy me-2" aria-hidden="true"></i><span data-copy-caption>Copy All Names</span></button></div>`:'';
      return `<div class="col-12 col-md-6"><div class="card mb-0"><${headerTag} ${headerAttributes} id="auctionHeading-${esc(input.value)}" class="card-header border-top-0 border-start-0 border-end-0 border-bottom text-start text-body w-100"><span class="d-flex align-items-center mb-2"><img ${accessory?`data-auction-details="${esc(input.value)}"`:""} src="${esc(image)}" width="44" height="44" class="mr-2 flex-shrink-0" alt=""><span class="d-inline-flex align-items-center me-2"><strong class="me-2">${esc(name)}</strong>${!accessory&&input.dataset.slot?`<span class="badge badge-outline-dark rounded-pill text-uppercase flex-shrink-0">${esc(input.dataset.slot)}</span>`:""}</span><span class="badge bg-${theme} text-white ms-auto mr-2 flex-shrink-0">${String(entries.length).padStart(2,'0')}</span>${arrow}</span><span class="d-block small text-muted mb-0">${accessory?"Level 90 · ":""}${esc(input.dataset.effect)}${accessory?"":"<br>Includes up to 2 random affixes."}</span><span class="d-block small text-muted fst-italic mt-1">Last received: ${esc(receiptTime(input.value))}</span>${copyAll}</${headerTag}><div id="auctionList-${esc(input.value)}" class="${listClass}" data-auction-card="${esc(input.value)}" role="region" aria-labelledby="auctionHeading-${esc(input.value)}"><div class="card-body">${entries.length?'<ul class="list-unstyled mb-0">'+entries.map((row,index)=>`<li class="d-flex align-items-center justify-content-between ${index?"border-top ":""}py-2">${registeredPlayer(row)}<span class="d-inline-flex align-items-center flex-shrink-0 ms-auto">${workflow&&row.next_bidder?'':`<span class="d-inline-flex align-items-center text-nowrap mx-2" aria-label="${esc(row.ducks??1)} ducks"><iconify-icon icon="mdi:duck" class="text-warning mr-2 fs-28" aria-hidden="true"></iconify-icon>×${esc(row.ducks??1)}</span>`}${rowActions(row)}</span></li>`).join('')+'</ul>':'<p class="text-muted small mb-0">No registrations yet.</p>'}</div></div></div></div>`;
    }).join('').replaceAll('auctionHeading-',prefix+'Heading-').replaceAll('auctionList-',prefix+'List-'):'';
    if(organizerPage&&window.bootstrap?.Dropdown){
      el('auctionRegistrations').querySelectorAll('[data-bs-toggle="dropdown"]').forEach(node=>{
        new window.bootstrap.Dropdown(node,{popperConfig:config=>({...config,strategy:'fixed'})});
      });
    }
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
    const payload=workflow?await rpc('get_public_auction_workflow',{p_category:category}):await rpc('get_public_card_auctions');
    bans=payload.bans||[];revision=payload.revision||0;
    lastReceived=payload.last_received||{};
    members=payload.members||[];registrations=(payload.registrations||[]).map(row=>accessory?{...row,card_id:row.accessory_id}:row);
    loaded=true;
    players();render();
  }
  async function action(button,callback){
    if(busy)return;
    busy=true;button.disabled=true;el('auctionFields').disabled=true;dropdowns();message('');
    try{await callback();}catch(error){
      if(workflow)try{await load();}catch(refreshError){/* Keep the last list visible if the connection is unavailable. */}
      message(error.message||'Could not complete the request. Please try again.',true);
    }
    finally{busy=false;button.disabled=false;render();if(workflow)document.dispatchEvent(new Event('auction:changed'));}
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
  async function workflowAction(button){
    const kind=button.dataset.workflow;
    const row=registrations.find(r=>r.id===button.dataset.registration);
    if(!row||busy||!canManage||!window.Swal)return;
    const titles={received:'Mark item received',carry_forward:'Carry Forward',outbid_again:'Outbid Again',clear_next:'Clear Next Bidder',withdraw:'Withdraw registration',add_duck:'Add 1 Duck',remove_duck:'Remove 1 Duck'};
    const explanations={
      received:'Save this item as received, remove this registration, and give everyone remaining on this item +1 duck.',
      carry_forward:'This player becomes NEXT BIDDER whenever this same item appears again. Their duck count is preserved and hidden. Everyone else on this item receives +1 duck.',
      outbid_again:'Use this only if this item appeared again and this player was outbid again. They stay NEXT BIDDER. Everyone else on this item receives another +1 duck.',
      clear_next:'Remove NEXT BIDDER status and show the saved duck count again. Nobody receives extra ducks.',
      withdraw:'Remove this registration and any NEXT BIDDER status. No ducks are awarded and no item is marked received.',
      add_duck:'Add one duck to this player for this item. This adjustment is recorded in Action History.',
      remove_duck:'Remove one duck from this player for this item. At ×0, the player stays registered but has no duck entries. This adjustment is recorded in Action History.'
    };
    const expectedRevision=revision;
    const confirmation=await Swal.fire({...dialogTheme,title:titles[kind],icon:kind==='add_duck'?'info':'warning',
      confirmButtonColor:kind==='add_duck'?'var(--bs-info)':kind==='remove_duck'?'var(--bs-danger)':dialogTheme.confirmButtonColor,
      html:`<p>${esc(row.member_name)}</p><p>${explanations[kind]}</p>`,
      showCancelButton:true,confirmButtonText:'Confirm',focusCancel:true
    });
    if(!confirmation.isConfirmed)return;
    await action(button,async()=>{
      await rpc('auction_admin_action',{p_kind:kind,p_category:category,p_registration:row.id,p_revision:expectedRevision,p_request:uuid()});
      await load();message(titles[kind]+' saved.');
    });
  }
  async function showBans(){
    if(!window.Swal)return;
    try{await load();}catch(error){message(error.message,true);return;}
    const body=bans.length?`<div class="table-responsive"><table class="table align-middle text-start"><thead><tr><th>Player</th><th>Added from</th><th>Banned on</th><th>Ban until</th><th>Status</th></tr></thead><tbody>${bans.map(b=>`<tr><td>${esc(b.member_name)}</td><td>${esc(b.category)}</td><td>${esc(formatTime(b.banned_at))}</td><td>${esc(formatTime(b.expires_at))}</td><td><span class="badge bg-${b.active?'danger':'secondary'}">${b.active?'BANNED':'EXPIRED'}</span></td></tr>`).join('')}</tbody></table></div>`:'<p>No banned players.</p>';
    Swal.fire({...dialogTheme,title:'Auction Ban List',html:'<p>Bans apply to all auction items and categories.</p>'+body,width:900,confirmButtonText:'Close'});
  }
  async function showActionHistory(){
    if(!window.Swal||!canManage)return;
    try{
      await load();
      const history=await rpc('get_auction_action_history');
      const expectedRevision=revision;
      const label={received:'Item received',carry_forward:'Carry Forward',outbid_again:'Outbid Again',clear_next:'Clear Next Bidder',withdraw:'Withdraw',add_duck:'Added 1 Duck',remove_duck:'Removed 1 Duck',ban:'Ban'};
      Swal.fire({...dialogTheme,title:'Auction Action History',width:1100,confirmButtonText:'Close',
        html:'<p class="small text-muted">Undo is available only for the latest action, before any newer registration or admin action. It restores the affected registrations, ducks, status and receipt history.</p>'+ (history.length?`<div class="table-responsive"><table class="table align-middle text-start"><thead><tr><th>Action / Player</th><th>Item</th><th>Recorded / Admin</th><th>Status</th></tr></thead><tbody>${history.map(a=>{
          const catalog=a.category==='card'?document.getElementById('auctionCard'):document.getElementById('accessoryCard');
          const item=catalog?[...catalog.options].find(o=>o.value===a.item_id):null;
          return `<tr><td>${esc(label[a.kind]||a.kind)}<br>${esc(a.member_name)}</td><td>${esc(a.kind==='ban'?'All items':item?.dataset.name||a.item_id||'')}</td><td>${esc(formatTime(a.created_at))}<br>${esc(a.admin_name)}</td><td>${a.undone_at?`<span class="badge bg-secondary">UNDONE</span><small class="d-block">${esc(formatTime(a.undone_at))}<br>${esc(a.undone_by_name)}</small>`:a.can_undo?`<button type="button" class="btn btn-sm btn-outline-warning" data-undo="${esc(a.id)}"><i class="fa-solid fa-rotate-left me-2" aria-hidden="true"></i>Undo</button>`:'Recorded'}</td></tr>`;
        }).join('')}</tbody></table></div>`:'<p>No actions recorded yet.</p>'),
        didOpen:()=>Swal.getHtmlContainer().addEventListener('click',async event=>{
          const undo=event.target.closest('[data-undo]');if(!undo)return;
          const id=undo.dataset.undo;
          const result=await Swal.fire({...dialogTheme,title:'Undo this action?',text:'Restore the affected registrations and duck counts to their state before this action.',icon:'warning',showCancelButton:true,confirmButtonText:'Undo',focusCancel:true});
          if(result.isConfirmed)await action(el('auctionActionHistory'),async()=>{await rpc('undo_auction_action',{p_action:id,p_revision:expectedRevision});await load();message('Action undone.');});
        })
      });
    }catch(error){message(error.message,true);}
  }
  if(workflow){
    if(organizerPage){
      const banUntil=el('auctionBanUntil');
      if(window.flatpickr)window.flatpickr(banUntil,{enableTime:true,dateFormat:'Y-m-d H:i',altInput:true,altFormat:'F j, Y H:i',time_24hr:true,disableMobile:true});
      else banUntil.type='datetime-local';
    }
    if(!accessory)el('auctionBanList').addEventListener('click',showBans);
    if(organizerPage){
      el('auctionActionHistory').addEventListener('click',showActionHistory);
      el('auctionBanForm').addEventListener('submit',async event=>{
        event.preventDefault();if(!canManage||busy||!window.Swal)return;
        const memberId=el('auctionBanPlayer').value;
        const member=members.find(m=>m.id===memberId);
        const until=inputTime(el('auctionBanUntil').value);
        if(!member||Number.isNaN(until.getTime())||until<=new Date()){message('Select a player and a future ban expiry date/time.',true);return;}
        const expectedRevision=revision;
        const confirmation=await Swal.fire({...dialogTheme,title:'Ban from all auctions?',text:`${member.name} will be banned until ${formatTime(until.toISOString())}. All active registrations, duck counts and NEXT BIDDER statuses will be removed. No extra ducks are awarded. Past receipts remain.`,icon:'warning',showCancelButton:true,confirmButtonText:'Ban player',confirmButtonColor:'var(--bs-danger)',focusCancel:true});
        if(!confirmation.isConfirmed)return;
        await action(el('auctionBanSubmit'),async()=>{
          await rpc('ban_auction_player',{p_member_id:memberId,p_category:category,p_expires_at:until.toISOString(),p_revision:expectedRevision,p_request:uuid()});
          el('auctionBanUntil')._flatpickr?.clear();el('auctionBanUntil').value='';el('auctionBanPlayer').value='';await load();message('Player banned from all auctions.');
        });
      });
    }
    const refreshWorkflow=()=>{if(loaded&&!busy&&!window.Swal?.isVisible()&&!document.querySelector('.select2-container--open'))load().catch(()=>{});};
    document.addEventListener('auction:changed',refreshWorkflow);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWorkflow();});
    window.setInterval(refreshWorkflow,30000);
  }
  if(!organizerPage)['show.bs.collapse','hide.bs.collapse'].forEach(type=>{
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
    const copyAllButton=event.target.closest('[data-copy-all-names]');
    if(copyAllButton){event.preventDefault();await copyAllNames(copyAllButton);return;}
    const copyButton=event.target.closest('[data-copy-ign]');
    if(copyButton){event.preventDefault();await copyIgn(copyButton);return;}
    const workflowButton=event.target.closest('[data-workflow]');
    if(workflowButton&&workflow){await workflowAction(workflowButton);return;}
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
      confirmButtonColor:'var(--bs-success)',
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
