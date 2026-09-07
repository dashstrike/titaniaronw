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

  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function isOrganizer(){return Boolean(profile&&profile.approved&&['party_organizer','admin'].includes(profile.role));}
  function runLabel(type){return type==='mirage'?'Mirage':'Time Echo';}
  function typeLabel(type){return type==='carrier'?'Can Carry':'Need Carry';}
  function iconFor(member){const file=iconMap[member&&member.cls];return file?`./assets/images/job/${encodeURIComponent(file)}`:'';}
  function memberById(id){return roster.find(m=>String(m.id)===String(id));}
  function memberHtml(member){
    if(!member)return '<span>Unknown member</span>';
    const src=iconFor(member);
    return `<span class="player-cell">${src?`<img class="job-icon" src="${esc(src)}" alt="">`:''}<span>${esc(member.name)}</span></span>`;
  }
  function showError(message){if(loading)loading.hidden=true;if(errorBox){errorBox.hidden=false;errorBox.textContent=message;}}
  function clearError(){if(errorBox)errorBox.hidden=true;}
  function formatDate(date){if(!date)return '';const d=new Date(`${date}T00:00:00`);return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}
  function formatTime(time){if(!time)return '';const parts=String(time).split(':');const d=new Date();d.setHours(Number(parts[0]||0),Number(parts[1]||0),0,0);return d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});}

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
      fetch('./assets/images/job/job-icons.json').then(r=>r.ok?r.json():{}).catch(()=>({}))
    ]);
    if(plannerResult.error)throw plannerResult.error;
    roster=Array.isArray(plannerResult.data&&plannerResult.data.state&&plannerResult.data.state.roster)?plannerResult.data.state.roster:[];
    roster=roster.filter(m=>m&&m.id&&m.name&&m.status!=='inactive').sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'}));
    iconMap=iconsResult||{};
  }

  async function loadRuns(){
    const runsPanel=document.getElementById('runsPanel');
    const createPanel=document.getElementById('createPanel');
    const runsList=document.getElementById('runsList');
    const runCount=document.getElementById('runCount');
    if(isOrganizer())createPanel.hidden=false;

    const [runsResult,regsResult]=await Promise.all([
      client.from('guild_runs').select('id,run_type,run_date,run_time,status,created_at').order('run_date',{ascending:false}).order('run_time',{ascending:false}),
      client.from('guild_run_registrations').select('id,run_id,member_id,registration_type,created_at').order('created_at',{ascending:true})
    ]);
    if(runsResult.error)throw runsResult.error;
    if(regsResult.error)throw regsResult.error;

    const runs=runsResult.data||[];
    const regs=regsResult.data||[];
    runCount.textContent=`${runs.length} run${runs.length===1?'':'s'}`;
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
      const detail=isOrganizer()?`<div class="run-summary"><div class="summary-counts"><span>Need Carry: <b>${need}</b></span><span>Can Carry: <b>${carry}</b></span></div>${runRegs.length?`<div class="table-wrap"><table><thead><tr><th>Player</th><th>Class</th><th>GR</th><th>Type</th></tr></thead><tbody>${sortedRunRegs.map(reg=>{const member=memberById(reg.member_id);return `<tr><td>${memberHtml(member)}</td><td>${esc(member&&member.cls||'—')}</td><td>${esc(member&&member.gr!=null?Number(member.gr).toLocaleString():'—')}</td><td>${esc(typeLabel(reg.registration_type))}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty">No registrations yet.</div>'}</div>`:'';
      const time=formatTime(run.run_time);
      return `<article class="run-card"><div class="run-card-head"><div><div class="run-title">${esc(runLabel(run.run_type))}</div><div class="run-meta">${esc(formatDate(run.run_date))}${time?` · ${esc(time)}`:''}</div></div><div class="run-actions"><span class="status ${esc(run.status)}">${run.status==='open'?'Registration Open':'Registration Closed'}</span><a class="btn" href="./titaniaruns.html">Open Public Registration</a></div></div>${detail}</article>`;
    }).join(''):'<div class="empty">No Guild Runs created yet.</div>';
    runsPanel.hidden=false;
    loading.hidden=true;
  }

  async function createRun(event){
    event.preventDefault();
    clearError();
    const button=event.currentTarget.querySelector('button[type="submit"]');
    const runType=document.getElementById('runType').value;
    const runDate=document.getElementById('runDate').value;
    const runTime=document.getElementById('runTime').value||null;
    if(!runDate)return;
    button.disabled=true;button.textContent='Creating…';
    const {error}=await client.from('guild_runs').insert({run_type:runType,run_date:runDate,run_time:runTime,status:'open'});
    button.disabled=false;button.textContent='Create Run';
    if(error){showError(error.message||'Could not create run.');return;}
    await loadRuns();
  }

  async function boot(){
    try{
      await loadBase();
      if(page==='organizer'){
        const dateInput=document.getElementById('runDate');
        if(dateInput&&!dateInput.value)dateInput.value=new Date().toISOString().slice(0,10);
        const form=document.getElementById('createRunForm');if(form)form.addEventListener('submit',createRun);
        await loadRuns();
      }
    }catch(error){showError(error&&error.message?error.message:'Could not load Guild Runs.');}
  }

  boot();
})();
