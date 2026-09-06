(function TitaniaUserManagement(){
  'use strict';

  const cfg=window.TITANIA_CONFIG||{};
  const loading=document.getElementById('loading');
  const errorBox=document.getElementById('error');
  const list=document.getElementById('usersList');
  const count=document.getElementById('userCount');
  const refreshBtn=document.getElementById('refreshBtn');
  let client=null;
  let currentUserId='';

  const ROLE_OPTIONS=[
    ['pending','Pending'],
    ['viewer','Viewer'],
    ['attendance_auditor','Attendance Auditor'],
    ['party_organizer','Party Organizer'],
    ['admin','Admin']
  ];

  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  function maskEmail(email){
    const value=String(email||'').trim();
    const at=value.indexOf('@');
    if(at<=0)return value||'—';
    const local=value.slice(0,at);
    const domain=value.slice(at+1);
    const visible=local.slice(0,Math.min(3,local.length));
    return `${visible}${'*'.repeat(Math.max(4,local.length-visible.length))}@${domain}`;
  }

  function showError(message){
    loading.hidden=true;
    list.hidden=true;
    errorBox.hidden=false;
    errorBox.textContent=message;
  }

  function roleOptions(selected){
    return ROLE_OPTIONS.map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
  }

  function renderUsers(rows){
    const sorted=[...rows].sort((a,b)=>{
      const ap=a.role==='pending'?0:1;
      const bp=b.role==='pending'?0:1;
      if(ap!==bp)return ap-bp;
      return String(a.display_name||a.email||'').localeCompare(String(b.display_name||b.email||''),undefined,{sensitivity:'base'});
    });

    list.innerHTML=sorted.map(profile=>{
      const self=profile.id===currentUserId;
      const pending=profile.role==='pending';
      return `<div class="user-row${self?' self':''}" data-user-id="${esc(profile.id)}">
        <div class="user-ident">
          <div class="user-name">${esc(profile.display_name||'Unnamed user')}${self?' <span class="you">· You</span>':''}${pending?' <span class="pending-badge">Pending</span>':''}</div>
          <div class="user-email">${esc(maskEmail(profile.email||''))}</div>
        </div>
        <select class="role-select" data-role ${self?'disabled':''}>${roleOptions(profile.role||'pending')}</select>
        <label class="approved"><input type="checkbox" data-approved ${profile.approved?'checked':''} ${self?'disabled':''}> Approved</label>
        <button class="save-btn" data-save type="button" ${self?'disabled':''}>Save</button>
      </div>`;
    }).join('');

    count.textContent=`${sorted.length} user${sorted.length===1?'':'s'}`;
    loading.hidden=true;
    errorBox.hidden=true;
    list.hidden=false;
  }

  async function loadUsers(){
    if(!client)return;
    loading.hidden=false;
    loading.textContent='Loading users…';
    errorBox.hidden=true;
    list.hidden=true;
    refreshBtn.disabled=true;

    const {data,error}=await client.from('profiles').select('id,email,display_name,role,approved,created_at').order('created_at',{ascending:true});
    refreshBtn.disabled=false;
    if(error){showError(error.message||'Could not load users.');return;}
    renderUsers(data||[]);
  }

  async function saveUser(row,button){
    const userId=row.dataset.userId||'';
    if(!userId||userId===currentUserId)return;
    const role=row.querySelector('[data-role]').value;
    const approved=row.querySelector('[data-approved]').checked;
    button.disabled=true;
    button.textContent='Saving…';

    const {error}=await client.from('profiles').update({role,approved}).eq('id',userId);
    if(error){
      button.disabled=false;
      button.textContent='Save';
      alert(error.message||'Could not save user access.');
      return;
    }

    button.textContent='Saved';
    button.classList.add('saved');
    setTimeout(()=>{
      button.classList.remove('saved');
      button.textContent='Save';
      button.disabled=false;
    },1000);
  }

  async function boot(){
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey){showError('Supabase configuration is missing.');return;}
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});

    const userResult=await client.auth.getUser();
    const user=userResult.data&&userResult.data.user;
    if(userResult.error||!user){showError('Sign in to Titania first.');return;}
    currentUserId=user.id;

    const profileResult=await client.from('profiles').select('role,approved').eq('id',currentUserId).single();
    if(profileResult.error||!profileResult.data||!profileResult.data.approved||profileResult.data.role!=='admin'){
      showError('Admin access is required to manage users.');
      return;
    }

    await loadUsers();
  }

  refreshBtn.addEventListener('click',loadUsers);
  list.addEventListener('click',event=>{
    const button=event.target.closest('[data-save]');
    if(!button)return;
    const row=button.closest('.user-row');
    if(row)saveUser(row,button);
  });

  boot();
})();
