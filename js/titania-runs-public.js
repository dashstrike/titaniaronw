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
  function runLabel(type){return type==='mirage'?'Mirage':'Time Echo';}
  function formatDate(date){if(!date)return '';const d=new Date(`${date}T00:00:00`);return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}
  function formatTime(time){if(!time)return '';const parts=String(time).split(':');const d=new Date();d.setHours(Number(parts[0]||0),Number(parts[1]||0),0,0);return d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});}
  function memberById(id){return roster.find(m=>String(m.id)===String(id));}
  function iconFor(member){const file=iconMap[member&&member.cls];return file?`./assets/images/job/${encodeURIComponent(file)}`:'';}
  function memberHtml(member){
    if(!member)return '<span>Unknown member</span>';
    const src=iconFor(member);
    return `<span class="player-cell">${src?`<img class="job-icon" src="${esc(src)}" alt="">`:''}<span>${esc(member.name)}</span></span>`;
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
      const available=roster.filter(m=>!registeredIds.has(String(m.id)));
      const carriers=regs.filter(r=>r.registration_type==='carrier');
      const needCarry=regs.filter(r=>r.registration_type==='need_carry');
      const time=formatTime(run.run_time);
      const isOpen=run.status==='open';
      return `<article class="run-card public-run-card" data-run-id="${esc(run.id)}">
        <div class="run-card-head">
          <div>
            <div class="run-title">${esc(runLabel(run.run_type))}</div>
            <div class="run-meta">${esc(formatDate(run.run_date))}${time?` · ${esc(time)}`:''}</div>
          </div>
          <span class="status ${isOpen?'open':'closed'}">${isOpen?'Registration Open':'Registration Closed'}</span>
        </div>

        ${isOpen?`<form class="register-grid public-register-form" data-register-form="${esc(run.id)}">
          <label>Player<select class="public-member-select" data-member-select="${esc(run.id)}" required><option value=""></option>${available.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></label>
          <label>Register As<select data-registration-type="${esc(run.id)}" required><option value="need_carry">Need Carry</option><option value="carrier">Can Carry</option></select></label>
          <button class="btn primary" type="submit">Register</button>
        </form>`:'<div class="notice public-closed-note">Registration is currently closed.</div>'}

        <div class="registration-columns">
          <div><h3>Can Carry <span class="count">(${carriers.length})</span></h3><div class="player-list">${carriers.length?carriers.map(r=>`<div class="player-row">${memberHtml(memberById(r.member_id))}</div>`).join(''):'<div class="empty">No players yet.</div>'}</div></div>
          <div><h3>Need Carry <span class="count">(${needCarry.length})</span></h3><div class="player-list">${needCarry.length?needCarry.map(r=>`<div class="player-row">${memberHtml(memberById(r.member_id))}</div>`).join(''):'<div class="empty">No players yet.</div>'}</div></div>
        </div>
      </article>`;
    }).join('');

    document.querySelectorAll('.public-member-select').forEach(select=>{
      if(window.jQuery&&jQuery.fn&&jQuery.fn.select2){
        jQuery(select).select2({placeholder:'Search player…',allowClear:true,templateResult:select2Template,templateSelection:select2Template,width:'100%'});
      }
    });

    document.querySelectorAll('[data-register-form]').forEach(form=>form.addEventListener('submit',register));
    loading.hidden=true;
  }

  async function load(){
    clearError();
    const [payloadResult,iconsResult]=await Promise.all([
      client.rpc('get_public_guild_runs'),
      fetch('./assets/images/job/job-icons.json').then(r=>r.ok?r.json():{}).catch(()=>({}))
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
