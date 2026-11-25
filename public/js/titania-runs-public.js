(function TitaniaPublicRuns(){
  'use strict';

  const cfg=window.TITANIA_CONFIG||{};
  const loading=document.getElementById('loading');
  const errorBox=document.getElementById('pageError');
  const runsList=document.getElementById('publicRunsList');
  let client=null;
  let runs=[];
  let roster=[];
  let iconMap={};

  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function runLabel(type){return type==='mirage'?'Mirage':type==='calamity_zone'?'Calamity Zone':'Time Echo';}
  function runImage(type){return type==='mirage'?'./images/raid/final-mirage.png':type==='calamity_zone'?'./images/raid/calamity-zone.png':'./images/raid/time-echoes.png';}
  function formatDate(date){if(!date)return '';const d=new Date(`${date}T00:00:00`);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
  function formatTime(time){if(!time)return '';return String(time).slice(0,5);}
  function memberById(id){return roster.find(m=>String(m.id)===String(id));}
  function iconFor(member){const file=iconMap[member&&member.cls];return file?`./images/job/${encodeURIComponent(file)}`:'';}
  function statusIcon(status){
    if(status==='done')return '<span class="run-status-icon done" title="Done" aria-label="Done">✓</span>';
    if(status==='cancel')return '<span class="run-status-icon cancel" title="Cancel" aria-label="Cancel">✕</span>';
    if(status==='mia')return '<span class="run-status-icon mia" title="MIA" aria-label="MIA">?</span>';
    return '';
  }
  function memberHtml(member,status){
    if(!member)return '<span>Unknown member</span>';
    const src=iconFor(member);
    const discord=member.discord_linked===true?'':'<span class="badge bg-danger" title="Discord account is not linked"><i class="fa-brands fa-discord me-1" aria-hidden="true"></i>No Discord</span>';
    return `<span class="player-cell flex-wrap">${src?`<img class="job-icon" src="${esc(src)}" alt="">`:''}<span>${esc(member.name)}</span>${discord}${statusIcon(status)}</span>`;
  }
  function showError(message){loading.hidden=true;errorBox.hidden=false;errorBox.textContent=message;}
  function clearError(){errorBox.hidden=true;}

  function select2Template(option){
    if(!option.id)return option.text;
    const member=memberById(option.id);
    if(!member)return option.text;
    const src=iconFor(member);
    const row=document.createElement('span');row.className='select2-player';
    if(src){const img=document.createElement('img');img.src=src;img.alt='';row.appendChild(img);}
    const text=document.createElement('span');text.textContent=member.name;row.appendChild(text);
    if(member.discord_linked!==true){
      row.classList.add('text-muted');
      const badge=document.createElement('span');badge.className='badge bg-danger ms-auto';badge.textContent='No Discord';row.appendChild(badge);
    }
    return row;
  }

  function render(){
    if(!runs.length){
      runsList.innerHTML='<div class="empty public-empty">No guild runs available at the moment.</div>';
      loading.hidden=true;
      return;
    }

    runsList.innerHTML=runs.map(run=>{
      const regs=Array.isArray(run.registrations)?run.registrations:[];
      const registeredIds=new Set(regs.map(r=>String(r.member_id)));
      const available=roster.filter(m=>String(m.status||'active').toLowerCase()!=='inactive'&&!registeredIds.has(String(m.id)));
      const carriers=regs.filter(r=>r.registration_type==='carrier');
      const needCarry=regs
        .filter(r=>r.registration_type==='need_carry')
        .sort((a,b)=>(a.carry_status==='done'?1:0)-(b.carry_status==='done'?1:0));
      const time=formatTime(run.run_time);
      const isOpen=run.status==='open';
      const title=String(run.note||'').trim()||'Untitled Run';
      return `<article class="run-card public-run-card card" data-run-id="${esc(run.id)}" data-run-type="${esc(run.run_type)}">
        <div class="public-run-top">
          <div class="public-run-heading">
            <img class="run-raid-image" src="${esc(runImage(run.run_type))}" alt="">
            <h2 class="public-run-type">${esc(runLabel(run.run_type).toUpperCase())}</h2>
            <span class="badge bg-${isOpen?'success':'warning'}-subtle text-${isOpen?'success':'warning'}">${isOpen?'Open':'Closed'}</span>
          </div>
          <div class="public-run-datetime">${esc(formatDate(run.run_date))}${time?` · ${esc(time)}`:''}</div>
        </div>

        <div class="public-run-title"><strong class="fs-4">${esc(title)}</strong></div>

        ${isOpen?`<form class="row g-3 align-items-end public-register-form" data-register-form="${esc(run.id)}">
          <div class="col-md-4"><label class="form-label" for="public-player-${esc(run.id)}">Player</label><select id="public-player-${esc(run.id)}" class="public-member-select form-select" data-member-select="${esc(run.id)}" required><option value=""></option>${available.map(m=>`<option value="${esc(m.id)}"${m.discord_linked===true?'':' disabled'}>${esc(m.name)}${m.discord_linked===true?'':' — No Discord'}</option>`).join('')}</select></div>
          <div class="col-md-5"><label class="form-label" for="public-registration-${esc(run.id)}">Register As</label><select id="public-registration-${esc(run.id)}" data-registration-type="${esc(run.id)}" required class="form-select"><option value="need_carry">Need Carry</option><option value="carrier">Can Carry</option></select></div>
          <div class="col-md-3"><button class="btn primary btn-primary w-100" type="submit">Register</button></div>
        </form>`:'<div class="notice public-closed-note">Registration is currently closed.</div>'}

        <hr class="border-secondary opacity-100 mt-4 mb-2">
        <div class="registration-columns">
          <div><h3>Can Carry <span class="count">(${carriers.length})</span></h3><div class="player-list">${carriers.length?carriers.map(r=>`<div class="player-row">${memberHtml(memberById(r.member_id),r.carry_status)}</div>`).join(''):'<div class="empty">No players yet.</div>'}</div></div>
          <div><h3>Need Carry <span class="count">(${needCarry.length})</span></h3><div class="player-list">${needCarry.length?needCarry.map(r=>`<div class="player-row">${memberHtml(memberById(r.member_id),r.carry_status)}</div>`).join(''):'<div class="empty">No players yet.</div>'}</div></div>
        </div>
      </article>`;
    }).join('');

    document.querySelectorAll('.public-member-select').forEach(select=>{
      if(!(window.jQuery&&jQuery.fn&&jQuery.fn.select2))return;
      const runId=select.dataset.memberSelect;
      const run=runs.find(item=>String(item.id)===String(runId));
      const regs=run&&Array.isArray(run.registrations)?run.registrations:[];
      const registeredIds=new Set(regs.map(r=>String(r.member_id)));
      const registeredNames=roster.filter(m=>registeredIds.has(String(m.id))).map(m=>String(m.name||''));
      let searchTerm='';

      jQuery(select).select2({
        dropdownParent:jQuery('#titania-content'),
        placeholder:'Search player…',
        allowClear:true,
        templateResult:select2Template,
        templateSelection:select2Template,
        width:'100%',
        matcher(params,data){
          searchTerm=String(params.term||'').trim();
          if(!searchTerm)return data;
          return String(data.text||'').toLowerCase().includes(searchTerm.toLowerCase())?data:null;
        },
        language:{
          noResults(){
            const term=searchTerm.toLowerCase();
            if(term&&registeredNames.some(name=>name.toLowerCase().includes(term)))return 'Player already on the list';
            return 'Player not found';
          }
        }
      });
    });

    document.querySelectorAll('[data-register-form]').forEach(form=>form.addEventListener('submit',register));
    loading.hidden=true;
  }

  async function load(){
    clearError();
    const [payloadResult,iconsResult]=await Promise.all([
      client.rpc('get_public_guild_runs'),
      fetch('./images/job/job-icons.json?v=sea-jobs-20261101').then(r=>r.ok?r.json():{}).catch(()=>({}))
    ]);
    if(payloadResult.error)throw payloadResult.error;
    const payload=payloadResult.data||{};
    runs=Array.isArray(payload.runs)?payload.runs:[];
    roster=Array.isArray(payload.members)?payload.members:[];
    iconMap=iconsResult||{};
    render();
  }

  async function register(event){
    event.preventDefault();
    clearError();
    const form=event.currentTarget;
    const runId=form.dataset.registerForm;
    const memberSelect=form.querySelector('[data-member-select]');
    const typeSelect=form.querySelector('[data-registration-type]');
    const button=form.querySelector('button[type="submit"]');
    const memberId=memberSelect&&memberSelect.value;
    const registrationType=typeSelect&&typeSelect.value;
    if(!runId||!memberId)return;
    if(memberById(memberId)?.discord_linked!==true){showError('No Discord link. Link your Discord account before registering.');return;}

    button.disabled=true;
    button.textContent='Registering…';
    const result=await client.rpc('register_public_guild_run',{p_run_id:runId,p_member_id:memberId,p_registration_type:registrationType});
    button.disabled=false;
    button.textContent='Register';

    if(result.error){
      const msg=String(result.error.message||'');
      if(result.error.code==='23505'||msg.includes('already registered'))showError('This player is already registered for this run.');
      else showError(msg||'Could not register player.');
      return;
    }

    await load();
  }

  async function boot(){
    try{
      if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey)throw new Error('Supabase configuration is missing.');
      client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      await load();
    }catch(error){showError(error&&error.message?error.message:'Could not load Guild Runs.');}
  }

  boot();
})();
