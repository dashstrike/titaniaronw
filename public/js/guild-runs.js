(function TitaniaGuildRuns(){
  'use strict';

  const cfg=window.TITANIA_CONFIG||{};
  const page=document.body.dataset.guildRunsPage||'';
  const loading=document.getElementById('loading');
  const errorBox=document.getElementById('pageError');
  let client=null;
  let profile=null;
  let roster=[];
  let iconMap={};
  let confirmationQueue=Promise.resolve();

  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function isOrganizer(){return Boolean(profile&&profile.approved&&['party_organizer','admin'].includes(profile.role));}
  function runLabel(type){return type==='mirage'?'Mirage':type==='calamity_zone'?'Calamity Zone':'Time Echo';}
  function runImage(type){return type==='mirage'?'./images/raid/final-mirage.png':type==='calamity_zone'?'./images/raid/calamity-zone.png':'./images/raid/time-echoes.png';}
  function typeLabel(type){return type==='carrier'?'Can Carry':'Need Carry';}
  function iconFor(member){const file=iconMap[member&&member.cls];return file?`./images/job/${encodeURIComponent(file)}`:'';}
  function memberById(id){return roster.find(m=>String(m.id)===String(id));}
  function memberHtml(member,copyActions=false){
    if(!member)return '<span>Unknown member</span>';
    const src=iconFor(member);
    const actions=copyActions?`<span class="player-copy-actions"><button type="button" class="btn btn-sm btn-outline-secondary" data-copy-name="${esc(member.name)}" title="Copy player name" aria-label="Copy player name: ${esc(member.name)}">Copy name</button><button type="button" class="btn btn-sm btn-outline-secondary" data-copy-discord="${esc(member.id)}" title="Copy Discord mention to tag this player" aria-label="Copy Discord mention for ${esc(member.name)}">Copy Discord</button></span>`:'';
    return `<span class="player-cell${copyActions?' player-cell-copy':''}">${src?`<img class="job-icon" src="${esc(src)}" alt="">`:''}<span class="player-name">${esc(member.name)}</span>${actions}</span>`;
  }
  async function copyPlayer(button){
    const label=button.textContent;
    button.disabled=true;
    try{
      let value=button.dataset.copyName;
      if(button.dataset.copyDiscord){
        button.textContent='Loading…';
        const session=await client.auth.getSession();
        const token=session.data?.session?.access_token;
        if(session.error||!token)throw new Error('Sign in to Titania again.');
        const response=await fetch('https://titania-attendance.dashstrike.workers.dev/member-discord',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({memberId:button.dataset.copyDiscord,action:'read'}),signal:AbortSignal.timeout(15000)});
        const account=await response.json();
        if(!response.ok)throw new Error(account.error||'Could not load the Discord account.');
        if(!account.linked||!/^\d{17,20}$/.test(account.userId))throw new Error('This player has no linked Discord account.');
        value=`<@${account.userId}>`;
      }
      try{await navigator.clipboard.writeText(value);}
      catch{
        if(!window.Swal)throw new Error('Clipboard unavailable. Please try again in a supported browser.');
        await window.Swal.fire({title:label,input:'text',inputValue:value,inputAttributes:{readonly:'readonly'},confirmButtonText:'Close',background:'var(--bs-secondary-bg)',color:'var(--bs-body-color)'});
        return;
      }
      button.textContent='Copied!';
      await new Promise(resolve=>setTimeout(resolve,1200));
    }catch(error){showError(error.message||'Could not copy this player.');}
    finally{button.textContent=label;button.disabled=false;}
  }
  function pickerIcon(type){
    if(type==='date')return '<span class="run-picker-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path></svg></span>';
    return '<span class="run-picker-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span>';
  }
  function initRunPickers(root){
    if(!window.flatpickr)return;
    root.querySelectorAll('#runDate,#runTime,[data-run-edit="run_date"],[data-run-edit="run_time"]').forEach(input=>{
      if(input._flatpickr)return;
      const time=input.id==='runTime'||input.dataset.runEdit==='run_time';
      window.flatpickr(input,time?{enableTime:true,noCalendar:true,dateFormat:'H:i',time_24hr:true,disableMobile:true}:{dateFormat:'Y-m-d',altInput:true,altFormat:'F j, Y',disableMobile:true});
    });
  }
  function showError(message){if(loading)loading.hidden=true;if(errorBox){errorBox.hidden=false;errorBox.textContent=message;}}
  function clearError(){if(errorBox)errorBox.hidden=true;}

  async function confirmRunChange(title,text,confirmButtonText='Save',danger=false){
    if(!window.Swal){showError('Confirmation is unavailable. Refresh the page and try again.');return false;}
    const options={
      title,text,icon:'question',showCancelButton:true,
      confirmButtonText,cancelButtonText:'Cancel',
      confirmButtonColor:danger?'var(--bs-danger)':'var(--bs-primary)',
      background:'var(--bs-secondary-bg)',color:'var(--bs-body-color)'
    };
    const pending=confirmationQueue.then(()=>window.Swal.fire(options));
    confirmationQueue=pending.then(()=>{},()=>{});
    try{return (await pending).isConfirmed===true;}
    catch{showError('Could not open the confirmation. Refresh the page and try again.');return false;}
  }

  function restoreRunField(input){
    const original=input.dataset.original||'';
    if(input._flatpickr)input._flatpickr.setDate(original,false);
    else input.value=original;
  }

  async function loadBase(){
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey)throw new Error('Supabase configuration is missing.');
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const userResult=await client.auth.getUser();
    const user=userResult.data&&userResult.data.user;
    if(userResult.error||!user)throw new Error('Sign in to Titania first.');

    const profileResult=await client.from('profiles').select('role,approved').eq('id',user.id).single();
    if(profileResult.error||!profileResult.data||!profileResult.data.approved)throw new Error('Approved Titania access is required.');
    profile=profileResult.data;

    const [plannerResult,iconsResult]=await Promise.all([
      client.from('planner_state').select('state').eq('id',1).single(),
      fetch('./images/job/job-icons.json?v=sea-jobs-20261101').then(r=>r.ok?r.json():{}).catch(()=>({}))
    ]);
    if(plannerResult.error)throw plannerResult.error;
    roster=Array.isArray(plannerResult.data&&plannerResult.data.state&&plannerResult.data.state.roster)?plannerResult.data.state.roster:[];
    roster=roster.filter(m=>m&&m.id&&m.name&&m.status!=='inactive').sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'}));
    iconMap=iconsResult||{};
  }

  function carryStatusControl(reg,locked){
    if(reg.registration_type!=='need_carry')return '—';
    const value=reg.carry_status||'';
    return `<div class="carry-switch" data-reg-id="${esc(reg.id)}">
      <button type="button" data-carry-status="done" class="btn btn-sm btn-outline-success ${value==='done'?'active done':''}" ${locked?'disabled':''}>Done</button>
      <button type="button" data-carry-status="cancel" class="btn btn-sm btn-outline-warning ${value==='cancel'?'active cancel':''}" ${locked?'disabled':''}>Cancel</button>
      <button type="button" data-carry-status="mia" class="btn btn-sm btn-outline-danger ${value==='mia'?'active mia':''}" ${locked?'disabled':''}>MIA</button>
    </div>`;
  }

  async function loadRuns(){
    const runsPanel=document.getElementById('runsPanel');
    const createPanel=document.getElementById('createPanel');
    const runsList=document.getElementById('runsList');
    const runCount=document.getElementById('runCount');
    if(isOrganizer())createPanel.hidden=false;

    const [runsResult,regsResult]=await Promise.all([
      client.from('guild_runs').select('id,run_type,run_date,run_time,note,status,created_at').order('run_date',{ascending:false}).order('run_time',{ascending:false}),
      client.from('guild_run_registrations').select('id,run_id,member_id,registration_type,carry_status,created_at').order('created_at',{ascending:true})
    ]);
    if(runsResult.error)throw runsResult.error;
    if(regsResult.error)throw regsResult.error;

    const runs=(runsResult.data||[]).filter(run=>run.status!=='ended');
    const regs=regsResult.data||[];
    runCount.textContent=`${runs.length} run${runs.length===1?'':'s'}`;
    runsList.querySelectorAll('input').forEach(input=>input._flatpickr?.destroy());
    runsList.innerHTML=runs.length?runs.map(run=>{
      const runRegs=regs.filter(r=>r.run_id===run.id);
      const sortedRunRegs=[...runRegs].sort((a,b)=>{
        const aOrder=a.registration_type==='carrier'?0:1;
        const bOrder=b.registration_type==='carrier'?0:1;
        if(aOrder!==bOrder)return aOrder-bOrder;
        const aMember=memberById(a.member_id);
        const bMember=memberById(b.member_id);
        return String(aMember&&aMember.name||'').localeCompare(String(bMember&&bMember.name||''),undefined,{sensitivity:'base'});
      });
      const need=runRegs.filter(r=>r.registration_type==='need_carry').length;
      const carry=runRegs.filter(r=>r.registration_type==='carrier').length;
      const statusText=run.status==='open'?'Open':run.status==='closed'?'Closed':'Ended';
      const statusClass=run.status==='ended'?'ended':run.status;
      const locked=run.status==='ended';
      const actionControls=locked
        ? ''
        : `<button type="button" class="btn btn-outline-secondary" data-run-toggle="${esc(run.id)}" data-next-status="${run.status==='open'?'closed':'open'}">${run.status==='open'?'Close Registration':'Open Registration'}</button><button type="button" class="btn danger btn-outline-danger" data-run-end="${esc(run.id)}">End Run</button>`;
      const table=runRegs.length?`<div class="table-wrap table-responsive"><table><thead><tr><th>Player</th><th>Class</th><th>GR</th><th>Type</th><th>Status</th></tr></thead><tbody>${sortedRunRegs.map(reg=>{const member=memberById(reg.member_id);return `<tr><td>${memberHtml(member,isOrganizer()&&reg.registration_type==='need_carry')}</td><td>${esc(member&&member.cls||'—')}</td><td>${esc(member&&member.gr!=null?Number(member.gr).toLocaleString():'—')}</td><td>${esc(typeLabel(reg.registration_type))}</td><td>${carryStatusControl(reg,locked)}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty">No registrations yet.</div>';
      const detail=isOrganizer()?`<div class="run-summary"><div class="summary-counts"><span>Need Carry: <b>${need}</b></span><span>Can Carry: <b>${carry}</b></span></div>${table}</div>`:'';
      return `<article class="run-card card">
        <div class="run-card-top">
          <div class="run-identity">
            <img class="run-raid-image" src="${esc(runImage(run.run_type))}" alt="">
            <h3 class="run-type-heading ${run.run_type==='mirage'?'mirage':'time-echo'}">${esc(runLabel(run.run_type).toUpperCase())}</h3>
            <span class="badge bg-${statusClass==='open'?'success':statusClass==='closed'?'warning':'secondary'}-subtle text-${statusClass==='open'?'success':statusClass==='closed'?'warning':'secondary'}">${esc(statusText)}</span>
            ${locked?'':'<a class="run-public-link" href="./titaniaruns" target="_blank" rel="noopener">Open Public Registration</a>'}
          </div>
          <div class="run-actions">${actionControls}<button type="button" class="btn danger-solid btn-danger" data-run-delete="${esc(run.id)}" data-run-title="${esc(run.note||runLabel(run.run_type))}">Delete Run</button></div>
        </div>
        <div class="run-edit-row">
          <input class="run-title-input form-control" type="text" maxlength="200" value="${esc(run.note||'')}" data-original="${esc(run.note||'')}" placeholder="Untitled Run" data-run-edit="note" data-run-id="${esc(run.id)}" ${locked?'disabled':''}>
          <span class="run-picker-wrap"><input class="run-date-input form-control" type="text" value="${esc(run.run_date||'')}" data-original="${esc(run.run_date||'')}" data-run-edit="run_date" data-run-id="${esc(run.id)}" autocomplete="off" ${locked?'disabled':''}>${pickerIcon('date')}</span>
          <span class="run-edit-separator">·</span>
          <span class="run-picker-wrap"><input class="run-time-input form-control" type="text" value="${esc(run.run_time?String(run.run_time).slice(0,5):'')}" data-original="${esc(run.run_time?String(run.run_time).slice(0,5):'')}" data-run-edit="run_time" data-run-id="${esc(run.id)}" autocomplete="off" ${locked?'disabled':''}>${pickerIcon('time')}</span>
          <span class="autosave-state" data-autosave-state="${esc(run.id)}"></span>
        </div>
        ${detail}
      </article>`;
    }).join(''):'<div class="empty">No Guild Runs created yet.</div>';

    runsPanel.hidden=false;
    loading.hidden=true;
    wireRunControls();
  }


  async function loadPreviousRuns(){
    const runsPanel=document.getElementById('runsPanel');
    const runsList=document.getElementById('runsList');
    const runCount=document.getElementById('runCount');

    const [runsResult,regsResult]=await Promise.all([
      client.from('guild_runs').select('id,run_type,run_date,run_time,note,status,created_at').eq('status','ended').order('run_date',{ascending:false}).order('run_time',{ascending:false}),
      client.from('guild_run_registrations').select('id,run_id,member_id,registration_type,carry_status,created_at').order('created_at',{ascending:true})
    ]);
    if(runsResult.error)throw runsResult.error;
    if(regsResult.error)throw regsResult.error;

    const runs=runsResult.data||[];
    const regs=regsResult.data||[];
    runCount.textContent=`${runs.length} previous run${runs.length===1?'':'s'}`;

    runsList.innerHTML=runs.length?runs.map((run,index)=>{
      const runRegs=regs.filter(r=>r.run_id===run.id);
      const sortedRunRegs=[...runRegs].sort((a,b)=>{
        const aOrder=a.registration_type==='carrier'?0:1;
        const bOrder=b.registration_type==='carrier'?0:1;
        if(aOrder!==bOrder)return aOrder-bOrder;
        const aMember=memberById(a.member_id);
        const bMember=memberById(b.member_id);
        return String(aMember&&aMember.name||'').localeCompare(String(bMember&&bMember.name||''),undefined,{sensitivity:'base'});
      });
      const need=runRegs.filter(r=>r.registration_type==='need_carry').length;
      const carry=runRegs.filter(r=>r.registration_type==='carrier').length;
      const table=runRegs.length?`<div class="table-wrap table-responsive"><table><thead><tr><th>Player</th><th>Class</th><th>GR</th><th>Type</th><th>Status</th></tr></thead><tbody>${sortedRunRegs.map(reg=>{const member=memberById(reg.member_id);return `<tr><td>${memberHtml(member)}</td><td>${esc(member&&member.cls||'—')}</td><td>${esc(member&&member.gr!=null?Number(member.gr).toLocaleString():'—')}</td><td>${esc(typeLabel(reg.registration_type))}</td><td>${reg.registration_type==='need_carry'?(reg.carry_status?'<span class="history-carry-status '+esc(reg.carry_status)+'">'+esc(reg.carry_status.toUpperCase())+'</span>':'—'):'—'}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty">No registrations were recorded.</div>';
      return `<article class="run-card previous-run-card card">
        <div class="run-card-top">
          <div class="run-identity">
            <img class="run-raid-image" src="${esc(runImage(run.run_type))}" alt="">
            <h3 class="run-type-heading ${run.run_type==='mirage'?'mirage':'time-echo'}">${esc(runLabel(run.run_type).toUpperCase())}</h3>
            <span class="status ended">Ended</span>
          </div>
        </div>
        <div class="previous-run-meta">
          <strong>${esc(run.note||'Untitled Run')}</strong>
          <span>${esc(run.run_date||'No date')}${run.run_time?' · '+esc(String(run.run_time).slice(0,5)):''}</span>
        </div>
        <div class="run-summary">
          <div class="summary-counts"><span>Need Carry: <b>${need}</b></span><span>Can Carry: <b>${carry}</b></span></div>
          <div class="accordion mt-3">
            <div class="accordion-item">
              <h4 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#history-players-${index}" aria-expanded="false" aria-controls="history-players-${index}">Players (${runRegs.length})</button>
              </h4>
              <div id="history-players-${index}" class="accordion-collapse collapse">
                <div class="accordion-body">${table}</div>
              </div>
            </div>
          </div>
        </div>
      </article>`;
    }).join(''):'<div class="empty">No previous Guild Runs yet.</div>';

    runsPanel.hidden=false;
    loading.hidden=true;
  }

  async function saveRunField(input){
    if(input.disabled)return;
    const runId=input.dataset.runId;
    const field=input.dataset.runEdit;
    if(!runId||!field)return;
    const state=document.querySelector(`[data-autosave-state="${runId}"]`);
    const original=input.dataset.original||'';
    const edited=field==='note'?input.value.trim():input.value;
    if(edited===original)return;
    const label={note:'title',run_date:'date',run_time:'time'}[field]||field;
    input.disabled=true;
    const confirmed=await confirmRunChange(`Save run ${label}?`,`Change ${label} from “${original||'empty'}” to “${edited||'empty'}”?`,'Save Change');
    if(!confirmed){restoreRunField(input);input.disabled=false;return;}
    if(state)state.textContent='Saving…';
    const value=field==='run_time'?(edited||null):edited;
    const {error}=await client.from('guild_runs').update({[field]:value}).eq('id',runId);
    if(error){restoreRunField(input);input.disabled=false;if(state)state.textContent='Save failed';showError(error.message||'Could not save run details.');return;}
    input.dataset.original=edited;
    input.disabled=false;
    if(state)state.textContent='Saved';
    setTimeout(()=>{if(state&&state.textContent==='Saved')state.textContent='';},1200);
  }

  function wireRunControls(){
    document.querySelectorAll('[data-copy-name],[data-copy-discord]').forEach(button=>button.addEventListener('click',()=>copyPlayer(button)));
    document.querySelectorAll('[data-run-toggle]').forEach(button=>button.addEventListener('click',async()=>{
      const opening=button.dataset.nextStatus==='open';
      if(!await confirmRunChange(`${opening?'Open':'Close'} registration?`,`This will ${opening?'allow':'stop'} public registrations for this run.`,opening?'Open Registration':'Close Registration'))return;
      button.disabled=true;
      const {error}=await client.from('guild_runs').update({status:button.dataset.nextStatus}).eq('id',button.dataset.runToggle);
      if(error){button.disabled=false;showError(error.message||'Could not update registration status.');return;}
      await loadRuns();
    }));

    document.querySelectorAll('[data-run-end]').forEach(button=>button.addEventListener('click',async()=>{
      if(!await confirmRunChange('End this run?','It will no longer appear on the public registration page.','End Run',true))return;
      button.disabled=true;
      const {error}=await client.from('guild_runs').update({status:'ended'}).eq('id',button.dataset.runEnd);
      if(error){button.disabled=false;showError(error.message||'Could not end run.');return;}
      await loadRuns();
    }));

    document.querySelectorAll('[data-run-delete]').forEach(button=>button.addEventListener('click',async()=>{
      const title=button.dataset.runTitle||'this run';
      if(!await confirmRunChange('Delete this run?',`${title} and all of its registrations will be permanently deleted.`,'Delete Run',true))return;

      button.disabled=true;
      const {error}=await client.from('guild_runs').delete().eq('id',button.dataset.runDelete);
      if(error){button.disabled=false;showError(error.message||'Could not delete run.');return;}

      window.TitaniaToast('Run deleted','The run and its registrations were removed.');
      await loadRuns();
    }));

    document.querySelectorAll('[data-run-edit]').forEach(input=>{
      input.addEventListener('change',()=>saveRunField(input));
    });
    initRunPickers(document.getElementById('runsList'));

    document.querySelectorAll('.carry-switch [data-carry-status]').forEach(button=>button.addEventListener('click',async()=>{
      const wrap=button.closest('.carry-switch');
      if(!wrap)return;
      if(button.classList.contains('active'))return;
      const member=button.closest('tr')?.querySelector('.player-cell span')?.textContent||'this player';
      const label=button.dataset.carryStatus.toUpperCase();
      if(!await confirmRunChange(`Set ${label} status?`,`Set ${member} to ${label}?`,'Save Status'))return;
      wrap.querySelectorAll('button').forEach(b=>b.disabled=true);
      const {error}=await client.from('guild_run_registrations').update({carry_status:button.dataset.carryStatus}).eq('id',wrap.dataset.regId);
      if(error){wrap.querySelectorAll('button').forEach(b=>b.disabled=false);showError(error.message||'Could not update status.');return;}
      await loadRuns();
    }));
  }

  async function createRun(event){
    event.preventDefault();
    clearError();
    const button=event.currentTarget.querySelector('button[type="submit"]');
    const runType=document.getElementById('runType').value;
    const runDate=document.getElementById('runDate').value;
    const runTime=document.getElementById('runTime').value||null;
    const note=document.getElementById('runNote').value.trim();
    if(!runDate)return;
    if(!await confirmRunChange('Create this run?',`${note||runLabel(runType)} on ${runDate}${runTime?' at '+runTime:''}.`,'Create Run'))return;
    button.disabled=true;button.textContent='Creating…';
    const {error}=await client.from('guild_runs').insert({run_type:runType,run_date:runDate,run_time:runTime,note,status:'open'});
    button.disabled=false;button.textContent='Create Run';
    if(error){showError(error.message||'Could not create run.');return;}
    document.getElementById('runNote').value='';
    await loadRuns();
  }

  async function boot(){
    try{
      await loadBase();
      if(page==='organizer'){
        const dateInput=document.getElementById('runDate');
        if(dateInput&&!dateInput.value)dateInput.value=new Date().toISOString().slice(0,10);
        initRunPickers(document.getElementById('createRunForm'));
        const form=document.getElementById('createRunForm');if(form)form.addEventListener('submit',createRun);
        await loadRuns();
      }else if(page==='history'){
        await loadPreviousRuns();
      }
    }catch(error){showError(error&&error.message?error.message:'Could not load Guild Runs.');}
  }

  boot();
})();
