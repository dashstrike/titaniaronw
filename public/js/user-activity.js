(function(){
  'use strict';
  const cfg=window.TITANIA_CONFIG||{};
  window.TitaniaSignOut=async function(client,options){
    let session;
    try{session=(await client.auth.getSession()).data?.session;}catch(_error){}
    const result=await client.auth.signOut(options);
    if(!result.error&&session?.access_token){
      try{
        // Keep the original token only in memory for this final request. The
        // server checks the session really ended before recording a logout.
        await fetch(cfg.supabaseUrl+'/rest/v1/rpc/record_user_logout',{
          method:'POST',headers:{apikey:cfg.supabasePublishableKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
          body:'{}',signal:AbortSignal.timeout(3000),
        });
      }catch(_error){}
    }
    return result;
  };
  if(document.body.dataset.titaniaPublic==='true'||!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey)return;
  // A reset-link session is not recorded while choosing a new password.
  if(new URL(location.href).searchParams.get('password_reset')==='1'||location.hash.includes('type=recovery'))return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const popup=document.getElementById?.('onlineUsersPopup');
  let popupAllowed=false,popupUserId='',popupBusy=false,permissionBusy=false,popupEpoch=0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const popupPanel=popup?document.getElementById('onlineUsersPopupPanel'):null;
  const popupToggle=popup?document.getElementById('onlineUsersPopupToggle'):null;
  function closePopup(focus=false){
    if(!popup)return;
    popupPanel.hidden=true;popupToggle.setAttribute('aria-expanded','false');
    if(focus)popupToggle.focus();
  }
  function popupVisibility(){
    if(!popup)return;
    popup.hidden=!popupAllowed||Boolean(document.getElementById('app')?.hidden);
    if(popup.hidden)closePopup();
  }
  async function loadOnline(){
    if(!popupAllowed||popupBusy||document.visibilityState==='hidden')return;
    popupBusy=true;
    const target=document.getElementById('onlineUsersPopupList');
    try{
      const {data,error}=await client.rpc('get_online_users');
      if(error)throw error;
      if(!popupAllowed)return;
      const rows=(data||[]).sort((a,b)=>new Date(b.last_seen_at)-new Date(a.last_seen_at));
      const pages={index:'Dashboard',dashboard:'Dashboard',manage_members:'Members',guild_league:'Guild League',siege:'Siege',attendance:'Attendance',users:'User Access','guild-runs':'Guild Runs','guild-runs-history':'Run History',auction:'Auction','pvp-guild-league':'Battle Stats · Guild League','pvp-siege':'Battle Stats · Siege',parties:'Manage Party',member:'Player Profile'};
      document.getElementById('onlineUsersPopupCount').textContent=rows.length;
      target.innerHTML=rows.length?'<ul class="list-unstyled mb-0">'+rows.map((row,index)=>`<li class="${index?'border-top ':''}py-2"><div class="d-flex align-items-center gap-2"><span class="badge bg-success">ONLINE</span><strong>${esc(row.display_name||'Unnamed user')}${row.user_id===popupUserId?' · You':''}</strong></div><small class="text-muted d-block mt-1">${esc(pages[row.last_page]||row.last_page)}</small><small class="text-muted d-block">${esc(new Date(row.last_seen_at).toLocaleString('en-GB',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}))} GMT+8</small></li>`).join('')+'</ul>':'<p class="text-muted mb-0">No users active in the last two minutes.</p>';
    }catch(error){if(popupAllowed)target.textContent='Could not load online users: '+error.message;}
    finally{popupBusy=false;}
  }
  async function checkPopupPermission(){
    if(!popup||permissionBusy)return;
    permissionBusy=true;
    const epoch=popupEpoch;
    try{
      const {data,error}=await client.auth.getSession();
      const user=data.session?.user;
      const permission=!error&&user?await client.rpc('can_view_login_history'):null;
      if(epoch!==popupEpoch)return;
      popupAllowed=Boolean(user&&!permission?.error&&permission?.data===true);
      popupUserId=user?.id||'';popupVisibility();
      if(popupAllowed)await loadOnline();
      else{document.getElementById('onlineUsersPopupList').textContent='';document.getElementById('onlineUsersPopupCount').textContent='0';}
    }catch(_error){popupAllowed=false;popupVisibility();}
    finally{permissionBusy=false;if(epoch!==popupEpoch)setTimeout(checkPopupPermission,0);}
  }
  if(popup){
    popupToggle.addEventListener('click',()=>{
      if(!popupPanel.hidden){closePopup(true);return;}
      popupPanel.hidden=false;popupToggle.setAttribute('aria-expanded','true');
      document.getElementById('onlineUsersPopupClose').focus();loadOnline();
    });
    document.getElementById('onlineUsersPopupClose').addEventListener('click',()=>closePopup(true));
    popup.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closePopup(true);}});
    document.getElementById('glRosterSearchInput')?.addEventListener('focus',()=>closePopup());
    const app=document.getElementById('app');
    if(app)new MutationObserver(popupVisibility).observe(app,{attributes:true,attributeFilter:['hidden']});
    setInterval(loadOnline,30000);
    checkPopupPermission();
  }
  let busy=false;
  async function heartbeat(){
    if(busy||document.visibilityState==='hidden')return;
    busy=true;
    try{
      const {data,error}=await client.auth.getSession();
      if(error||!data.session)return;
      const page=document.body.dataset.event||document.body.dataset.titaniaPage||'';
      await client.rpc('record_user_activity',{p_page:page});
    }catch(_error){
      // Tracking must never interrupt login, roster editing or other app actions.
    }finally{busy=false;}
  }
  // Do not perform an async Supabase request inside its auth event callback.
  client.auth.onAuthStateChange((event,session)=>{
    if(popup&&(event==='SIGNED_OUT'||(session?.user?.id&&session.user.id!==popupUserId))){
      popupEpoch++;popupAllowed=false;popupVisibility();
      document.getElementById('onlineUsersPopupList').textContent='';
      document.getElementById('onlineUsersPopupCount').textContent='0';
    }
    setTimeout(()=>{heartbeat();checkPopupPermission();},0);
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')heartbeat();});
  setInterval(heartbeat,60000);
  heartbeat();
})();
