'use strict';

  const CONFIG = Object.freeze({
    teamSize:5,
    mainTeams:12,
    subTeams:18,
    eliteTeams:10,
    dungeonCount:4,
    maxMembers:1000,
    maxHistory:20000
  });

  const CLASSES = Object.freeze([
    'Swordman','Knight','Lord Knight','Crusader','Paladin',
    'Mage','Wizard','High Wizard',
    'Archer','Hunter','Sniper',
    'Bard','Clown','Dancer','Gypsy',
    'Acolyte','Priest','High Priest','Monk','Champion',
    'Thief','Assassin','Assassin Cross',
    'Merchant','Blacksmith','Whitesmith','Alchemist','Creator',
    'Gunslinger','Rebel','Night Watch',
    'Druid','Kanos','Alithea','Unknown'
  ]);
  const HEALERS = Object.freeze(['Acolyte','Priest','High Priest']);
  const INACTIVE_REASONS = Object.freeze(['Left Guild','Removed from Guild','Temporary Break','Transferred','Inactive Player','Other']);
  const REACTIVATE_REASONS = Object.freeze(['Returned to Guild','Rejoined Guild','Temporary Break Ended','Other']);
  /*
   * Job-family colors follow the supplied in-game class icon palette.
   * Every promoted job keeps the color of its originating job family.
   */
  const CLASS_COLORS = Object.freeze({
    Swordman:'#e2776b',Knight:'#e2776b','Lord Knight':'#e2776b',Crusader:'#e2776b',Paladin:'#e2776b',
    Mage:'#579ed3',Wizard:'#579ed3','High Wizard':'#579ed3',
    Archer:'#e2aa50',Hunter:'#e2aa50',Sniper:'#e2aa50',
    Bard:'#e2aa50',Clown:'#e2aa50',Dancer:'#e2aa50',Gypsy:'#e2aa50',
    Acolyte:'#78bd5b',Priest:'#78bd5b','High Priest':'#78bd5b',Monk:'#78bd5b',Champion:'#78bd5b',
    Thief:'#a579f2',Assassin:'#a579f2','Assassin Cross':'#a579f2',
    Merchant:'#df9056',Blacksmith:'#df9056',Whitesmith:'#df9056',Alchemist:'#df9056',Creator:'#df9056',
    Gunslinger:'#b27d69',Rebel:'#b27d69','Night Watch':'#b27d69',
    Druid:'#32947e',Kanos:'#32947e',Alithea:'#32947e',Unknown:'#8b93b0'
  });

  const MAIN_KEYS = Object.freeze(Array.from({length:CONFIG.mainTeams},(_,i)=>`main_${i+1}`));
  const MAIN_RAIDS = Object.freeze([
    Object.freeze({id:'raid_1',label:'Raid 1',keys:Object.freeze(['main_1','main_2','main_3','main_4']),defaultLeaderTeam:'main_1'}),
    Object.freeze({id:'raid_2',label:'Raid 2',keys:Object.freeze(['main_5','main_6','main_7','main_8']),defaultLeaderTeam:'main_5'}),
    Object.freeze({id:'raid_3',label:'Raid 3',keys:Object.freeze(['main_9','main_10','main_11','main_12']),defaultLeaderTeam:'main_9'})
  ]);
  const SUB_KEYS = Object.freeze(Array.from({length:CONFIG.subTeams},(_,i)=>`sub_${i+1}`));
  const SUB_RAIDS = Object.freeze([
    Object.freeze({id:'sub_raid_1',label:'Raid 1',keys:Object.freeze(['sub_1','sub_2','sub_3','sub_4','sub_17']),defaultLeaderTeam:'sub_1'}),
    Object.freeze({id:'sub_raid_2',label:'Raid 2',keys:Object.freeze(['sub_5','sub_6','sub_7','sub_8','sub_18']),defaultLeaderTeam:'sub_5'}),
    Object.freeze({id:'sub_raid_3',label:'Raid 3',keys:Object.freeze(['sub_9','sub_10','sub_11','sub_12']),defaultLeaderTeam:'sub_9'}),
    Object.freeze({id:'sub_raid_4',label:'Raid 4',keys:Object.freeze(['sub_13','sub_14','sub_15','sub_16']),defaultLeaderTeam:'sub_13'})
  ]);
  const ALL_GUILD_RAIDS = Object.freeze([...MAIN_RAIDS,...SUB_RAIDS]);
  const SIEGE_MAIN_KEYS = Object.freeze(Array.from({length:CONFIG.mainTeams},(_,i)=>`siege_main_${i+1}`));
  const SIEGE_MAIN_RAIDS = Object.freeze([
    Object.freeze({id:'siege_raid_1',label:'Raid 1',keys:Object.freeze(['siege_main_1','siege_main_2','siege_main_3','siege_main_4']),defaultLeaderTeam:'siege_main_1',siege:true}),
    Object.freeze({id:'siege_raid_2',label:'Raid 2',keys:Object.freeze(['siege_main_5','siege_main_6','siege_main_7','siege_main_8']),defaultLeaderTeam:'siege_main_5',siege:true}),
    Object.freeze({id:'siege_raid_3',label:'Raid 3',keys:Object.freeze(['siege_main_9','siege_main_10','siege_main_11','siege_main_12']),defaultLeaderTeam:'siege_main_9',siege:true})
  ]);
  const SIEGE_SUB_KEYS = Object.freeze(Array.from({length:CONFIG.subTeams},(_,i)=>`siege_sub_${i+1}`));
  const SIEGE_SUB_RAIDS = Object.freeze([
    Object.freeze({id:'siege_sub_raid_1',label:'Raid 4',keys:Object.freeze(['siege_sub_1','siege_sub_2','siege_sub_3','siege_sub_4','siege_sub_17']),defaultLeaderTeam:'siege_sub_1',siege:true}),
    Object.freeze({id:'siege_sub_raid_2',label:'Raid 5',keys:Object.freeze(['siege_sub_5','siege_sub_6','siege_sub_7','siege_sub_8','siege_sub_18']),defaultLeaderTeam:'siege_sub_5',siege:true}),
    Object.freeze({id:'siege_sub_raid_3',label:'Raid 6',keys:Object.freeze(['siege_sub_9','siege_sub_10','siege_sub_11','siege_sub_12']),defaultLeaderTeam:'siege_sub_9',siege:true}),
    Object.freeze({id:'siege_sub_raid_4',label:'Raid 7',keys:Object.freeze(['siege_sub_13','siege_sub_14','siege_sub_15','siege_sub_16']),defaultLeaderTeam:'siege_sub_13',siege:true})
  ]);
  const ALL_SIEGE_RAIDS = Object.freeze([...SIEGE_MAIN_RAIDS,...SIEGE_SUB_RAIDS]);
  const SIEGE_DEFAULT_PARTY_ORDER = Object.freeze(ALL_SIEGE_RAIDS.flatMap(raid=>raid.keys));

  function createDefaultSiegeRaidGroups(){
    const out={};
    ALL_SIEGE_RAIDS.forEach(raid=>{out[raid.id]=raid.keys.slice();});
    return out;
  }

  function normalizeSiegeRaidGroups(raw){
    const source=raw&&typeof raw==='object'?raw:{};
    const out={};
    const used=new Set();
    ALL_SIEGE_RAIDS.forEach(raid=>{
      const values=Array.isArray(source[raid.id])?source[raid.id]:[];
      out[raid.id]=[];
      values.forEach(value=>{
        const key=stringValue(value).trim();
        if(!SIEGE_KEYS.includes(key)||used.has(key)||out[raid.id].length>=5)return;
        used.add(key);out[raid.id].push(key);
      });
    });
    SIEGE_DEFAULT_PARTY_ORDER.forEach(key=>{
      if(used.has(key))return;
      const preferred=ALL_SIEGE_RAIDS.find(raid=>raid.keys.includes(key));
      let target=preferred&&out[preferred.id].length<5?preferred:null;
      if(!target)target=ALL_SIEGE_RAIDS.find(raid=>out[raid.id].length<5);
      if(target){out[target.id].push(key);used.add(key);}
    });
    ALL_SIEGE_RAIDS.forEach(emptyRaid=>{
      if(out[emptyRaid.id].length)return;
      const donor=ALL_SIEGE_RAIDS.find(raid=>out[raid.id].length>1);
      if(donor)out[emptyRaid.id].push(out[donor.id].pop());
    });
    return out;
  }

  function raidKeysForGroups(raid,groups){
    if(!raid)return[];
    if(raid.siege){
      const source=groups&&typeof groups==='object'?groups:{};
      const keys=source[raid.id];
      return Array.isArray(keys)?keys:raid.keys;
    }
    return raid.keys||[];
  }

  function currentSiegeRaids(source=state){
    const groups=source&&source.siegeRaidGroups?source.siegeRaidGroups:createDefaultSiegeRaidGroups();
    return ALL_SIEGE_RAIDS.map(raid=>({...raid,keys:raidKeysForGroups(raid,groups).slice()}));
  }

  function raidById(id){
    const raid=ALL_RAIDS.find(item=>item.id===id)||null;
    if(!raid||!raid.siege)return raid;
    return {...raid,keys:raidKeysForGroups(raid,state.siegeRaidGroups).slice()};
  }
  const ALL_GUILD_STYLE_RAIDS = Object.freeze([...ALL_GUILD_RAIDS,...ALL_SIEGE_RAIDS]);
  const ELITE_KEYS = Object.freeze(Array.from({length:CONFIG.eliteTeams},(_,i)=>`elite_${i+1}`));
  const POLARITY_DUNGEON_TEAM_COUNTS = Object.freeze([5,5,5,5]);
  function dungeonTeamCount(d){return POLARITY_DUNGEON_TEAM_COUNTS[d-1]||0;}
  function dungeonKeys(d){return Array.from({length:dungeonTeamCount(d)},(_,i)=>`dungeon${d}_${i+1}`);}
  const DUNGEON_KEYS = Object.freeze(Array.from({length:CONFIG.dungeonCount},(_,i)=>dungeonKeys(i+1)).flat());
  const POLARITY_STAR_RAIDS = Object.freeze([
    Object.freeze({id:'pz_star_1',label:'STAR Raid 1',keys:Object.freeze(['elite_1','elite_2','elite_3','elite_4','elite_5']),defaultLeaderTeam:'elite_1',polarity:true,kind:'star'}),
    Object.freeze({id:'pz_star_2',label:'STAR Raid 2',keys:Object.freeze(['elite_6','elite_7','elite_8','elite_9','elite_10']),defaultLeaderTeam:'elite_6',polarity:true,kind:'star'})
  ]);
  const POLARITY_NORMAL_RAIDS = Object.freeze(Array.from({length:CONFIG.dungeonCount},(_,i)=>{
    const dungeon=i+1;
    const keys=dungeonKeys(dungeon);
    return Object.freeze({id:`pz_dungeon_${dungeon}`,label:`Normal Dungeon ${dungeon}`,keys:Object.freeze(keys),defaultLeaderTeam:keys[0],polarity:true,kind:'normal',dungeon});
  }));
  const ALL_POLARITY_RAIDS = Object.freeze([...POLARITY_STAR_RAIDS,...POLARITY_NORMAL_RAIDS]);
  const ALL_RAIDS = Object.freeze([...ALL_GUILD_RAIDS,...ALL_SIEGE_RAIDS,...ALL_POLARITY_RAIDS]);
  const GUILD_KEYS = Object.freeze([...MAIN_KEYS,...SUB_KEYS]);
  const SIEGE_KEYS = Object.freeze([...SIEGE_MAIN_KEYS,...SIEGE_SUB_KEYS]);
  const POLARITY_KEYS = Object.freeze([...ELITE_KEYS,...DUNGEON_KEYS]);
  const ALL_KEYS = Object.freeze([...GUILD_KEYS,...SIEGE_KEYS,...POLARITY_KEYS]);
  const TEAM_KEY_SET = new Set(ALL_KEYS);

  let state = {
    roster:[],
    assignments:createEmptyAssignments(),
    finishedDungeons:[],
    raidCommanders:createDefaultRaidCommanders(),
    raidLeaders:createDefaultRaidLeaders(),
    raidModes:createDefaultRaidModes(),
    siegeRaidGroups:createDefaultSiegeRaidGroups(),
    membershipHistory:[],
    publicVisibility:{guildLeague:false,siege:false,polarityZone:false},
    eventUpdates:{
      guildLeague:{updatedAt:'',updatedBy:''},
      siege:{updatedAt:'',updatedBy:''},
      polarityZone:{updatedAt:'',updatedBy:''}
    },
    revision:0,
    updatedAt:'',
    updatedBy:'',
    spreadsheetName:''
  };
  let memberByName = Object.create(null);
  let memberById = Object.create(null);
  let currentEvent = readStoredEvent();
  let searchTerm = '';
  let statusFilter = 'All';
  let classFilter = 'All';
  let sortBy = 'gr';
  let sortDir = 'desc';
  let selectedMember = null;
  let selectedSlot = null;
  let selectedTeamSource = null;
  let dragMemberName = null;
  let dragSourceSlot = null;
  let dragTeamSource = null;
  let editingMemberName = null;
  let dashboardSearch = '';
  let dashboardGuildStatusFilter = 'Active';
  let dashboardSortBy = 'name';
  let dashboardSortDir = 'asc';
  let dashboardClassFilter = 'All';
  let dashboardSelected = new Set();
  let statusModalMemberName = null;
  let statusModalMode = 'inactive';
  let saveTimer = null;
  let saveInFlight = false;
  let saveQueued = false;
  let dirty = false;
  let quickSaveInFlight = 0;
  let syncedStateSnapshot = null;
  let syncPollTimer = null;
  let syncCheckInFlight = false;
  let syncListenersWired = false;
  let poolHidden = readPoolHidden();

  document.addEventListener('DOMContentLoaded', bootstrapWebsite);


  let supabaseClient = null;
  let currentAuthUser = null;
  let currentProfile = null;
  let passwordRecoveryMode = false;
  const TITLE_ICON_BASE='./images/title/';
  const TITLE_ICON_SERIES=Object.freeze({traveler:'traveler_green',explorer:'explorer_blue',pathfinder:'pathfinder_purple',trailblazer:'trailblazer_orange',pioneer:'pioneer_red',dawnbringer:'dawnbringer_rainbow'});
  const TITLE_ICON_LEVELS=Object.freeze({i:1,ii:2,iii:3,iv:4,v:5,'1':1,'2':2,'3':3,'4':4,'5':5});
  let memberTitleById=Object.create(null);

  function readPoolHidden(){
    try{return localStorage.getItem('titania_pool_hidden_v1')==='1';}catch(_error){return false;}
  }

  function renderPoolToggle(){
    const button=document.getElementById('poolToggleBtn');
    if(!button)return;
    const icon=document.getElementById('poolToggleIcon');
    const label=document.getElementById('poolToggleText');
    button.setAttribute('aria-expanded',poolHidden?'false':'true');
    button.title=poolHidden?'Show Member/Party Pool':'Hide Member/Party Pool';
    if(icon)icon.className=`fa-solid ${poolHidden?'fa-angles-right':'fa-angles-left'}`;
    if(label)label.textContent=poolHidden?'Show Pool':'Hide Pool';
  }

  function togglePoolVisibility(){
    poolHidden=!poolHidden;
    try{localStorage.setItem('titania_pool_hidden_v1',poolHidden?'1':'0');}catch(_error){}
    const body=document.getElementById('bodyWrap');
    if(body){
      const fullWidthMode=currentEvent==='dashboard'||currentEvent==='manage_members';
      body.classList.toggle('pool-hidden',!fullWidthMode&&poolHidden);
    }
    renderPoolToggle();
  }

  function configReady(){
    const cfg=window.TITANIA_CONFIG||{};
    return /^https:\/\/.+\.supabase\.co\/?$/i.test(String(cfg.supabaseUrl||'')) &&
      String(cfg.supabasePublishableKey||'').length>20 &&
      !String(cfg.supabasePublishableKey||'').includes('PASTE_YOUR');
  }

  function showAuthView(view){
    const loginUrl=new URL('login',document.baseURI);
    if(location.pathname.replace(/\/$/,'')!==loginUrl.pathname)history.replaceState(null,'',loginUrl.pathname+location.search+location.hash);
    const screen=document.getElementById('authScreen');
    screen.hidden=false;
    const panels={login:'authLoginPanel',register:'authRegisterPanel',pending:'authPendingPanel',reset:'authResetPanel',config:'authConfigPanel'};
    Object.entries(panels).forEach(([key,id])=>{const el=document.getElementById(id);if(el)el.hidden=key!==view;});
    const tabs=document.getElementById('authTabs');
    if(tabs)tabs.hidden=!['login','register'].includes(view);
    document.querySelectorAll('[data-auth-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.authView===view));
    document.getElementById('app').hidden=true;
    document.getElementById('loadingOverlay').hidden=true;
  }

  function setAuthMessage(id,text,kind){
    const el=document.getElementById(id);if(!el)return;
    el.textContent=text||'';el.className='auth-message'+(kind?' '+kind:'');
  }

  async function bootstrapWebsite(){
    wireAuthControls();
    if(!configReady()){showAuthView('config');return;}
    const cfg=window.TITANIA_CONFIG;
    supabaseClient=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    supabaseClient.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY'){
        passwordRecoveryMode=true;
        showAuthView('reset');
      }
    });
    const {data,error}=await supabaseClient.auth.getSession();
    if(error){showAuthView('login');setAuthMessage('authLoginMessage',error.message,'err');return;}
    if(!data.session){showAuthView('login');return;}
    if(passwordRecoveryMode){showAuthView('reset');return;}
    await enterAuthenticatedApp(data.session);
  }

  function wireAuthControls(){
    document.querySelectorAll('[data-auth-view]').forEach(btn=>btn.addEventListener('click',()=>showAuthView(btn.dataset.authView)));
    document.getElementById('authLoginBtn').addEventListener('click',loginAccount);
    document.getElementById('authLoginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')loginAccount();});
    document.getElementById('authRegisterBtn').addEventListener('click',registerAccount);
    document.getElementById('authForgotBtn').addEventListener('click',sendPasswordReset);
    document.getElementById('authCheckApprovalBtn').addEventListener('click',checkApproval);
    document.getElementById('authPendingLogoutBtn').addEventListener('click',logoutAccount);
    document.getElementById('authResetBtn').addEventListener('click',finishPasswordReset);
    document.getElementById('logoutBtn').addEventListener('click',logoutAccount);
    document.getElementById('adminUsersClose').addEventListener('click',closeAdminUsers);
    document.getElementById('adminUsersDone').addEventListener('click',closeAdminUsers);
    document.getElementById('adminUsersRefresh').addEventListener('click',loadAdminUsers);
    document.getElementById('adminUsersModal').addEventListener('click',e=>{if(e.target.id==='adminUsersModal')closeAdminUsers();});
  }

  async function loginAccount(){
    const email=document.getElementById('authLoginEmail').value.trim();
    const password=document.getElementById('authLoginPassword').value;
    if(!email||!password){setAuthMessage('authLoginMessage','Enter your email and password.','warn');return;}
    setAuthMessage('authLoginMessage','Signing in…');
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error){setAuthMessage('authLoginMessage',error.message,'err');return;}
    if(data.session)location.reload();
  }

  async function registerAccount(){
    const displayName=document.getElementById('authRegisterName').value.trim();
    const email=document.getElementById('authRegisterEmail').value.trim();
    const password=document.getElementById('authRegisterPassword').value;
    if(!displayName||!email){setAuthMessage('authRegisterMessage','Display name and email are required.','warn');return;}
    if(password.length<8){setAuthMessage('authRegisterMessage','Use a password with at least 8 characters.','warn');return;}
    setAuthMessage('authRegisterMessage','Creating account…');
    const redirectTo=new URL('.',document.baseURI).href;
    const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{display_name:displayName},emailRedirectTo:redirectTo}});
    if(error){setAuthMessage('authRegisterMessage',error.message,'err');return;}
    if(data.session){
      currentAuthUser=data.user;
      await showPendingForUser();
    }else{
      setAuthMessage('authRegisterMessage','Account created. Check your email to confirm it, then sign in. An admin must approve your account before the planner opens.','ok');
    }
  }

  async function sendPasswordReset(){
    const email=document.getElementById('authLoginEmail').value.trim();
    if(!email){setAuthMessage('authLoginMessage','Enter your email first, then choose Forgot password.','warn');return;}
    const redirectTo=new URL('.',document.baseURI).href;
    const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo});
    if(error){setAuthMessage('authLoginMessage',error.message,'err');return;}
    setAuthMessage('authLoginMessage','Password reset email sent.','ok');
  }

  async function finishPasswordReset(){
    const p1=document.getElementById('authResetPassword').value;
    const p2=document.getElementById('authResetPassword2').value;
    if(p1.length<8){setAuthMessage('authResetMessage','Use at least 8 characters.','warn');return;}
    if(p1!==p2){setAuthMessage('authResetMessage','Passwords do not match.','warn');return;}
    const {error}=await supabaseClient.auth.updateUser({password:p1});
    if(error){setAuthMessage('authResetMessage',error.message,'err');return;}
    passwordRecoveryMode=false;
    setAuthMessage('authResetMessage','Password updated. Reloading…','ok');
    setTimeout(()=>location.reload(),700);
  }

  async function fetchCurrentProfile(userId){
    const {data,error}=await supabaseClient.from('profiles').select('id,email,display_name,role,approved,created_at').eq('id',userId).maybeSingle();
    if(error)throw error;
    return data;
  }

  async function enterAuthenticatedApp(session){
    currentAuthUser=session.user;
    let profile=await fetchCurrentProfile(currentAuthUser.id);
    if(!profile){
      await new Promise(resolve=>setTimeout(resolve,500));
      profile=await fetchCurrentProfile(currentAuthUser.id);
    }
    currentProfile=profile;
    if(!profile||!profile.approved||profile.role==='pending'){
      await showPendingForUser();
      return;
    }
    if(location.pathname.replace(/\/$/,'')===new URL('login',document.baseURI).pathname){
      history.replaceState(null,'',new URL('dashboard',document.baseURI).pathname+location.search+location.hash);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    document.getElementById('authScreen').hidden=true;
    document.getElementById('app').hidden=false;
    document.getElementById('loadingOverlay').hidden=false;
    document.getElementById('accountBtn').hidden=false;
    document.getElementById('logoutBtn').hidden=false;
    document.getElementById('accountName').textContent=profile.display_name||profile.email||'Account';
    document.getElementById('accountRole').textContent=profile.role;
    document.body.classList.toggle('readonly-mode',profile.role==='viewer');
    await initPlanner();
    if(profile.role==='viewer')showToast('Read-only access','Your account is approved as Viewer. Ask an admin for Leader access to make changes.');
  }

  async function showPendingForUser(){
    showAuthView('pending');
    let text='Your account is waiting for administrator approval.';
    if(currentAuthUser&&currentAuthUser.email)text+=` Signed in as ${currentAuthUser.email}.`;
    document.getElementById('authPendingText').textContent=text;
  }

  async function checkApproval(){
    setAuthMessage('authPendingMessage','Checking…');
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(!session){showAuthView('login');return;}
    currentAuthUser=session.user;
    const profile=await fetchCurrentProfile(session.user.id);
    if(profile&&profile.approved&&profile.role!=='pending'){location.reload();return;}
    setAuthMessage('authPendingMessage','Still waiting for administrator approval.','warn');
  }

  async function logoutAccount(){
    if(supabaseClient)await supabaseClient.auth.signOut();
    location.reload();
  }

  function userCanEdit(){return Boolean(currentProfile&&currentProfile.approved&&['leader','admin'].includes(currentProfile.role));}

  async function openAdminUsers(){
    if(!currentProfile||currentProfile.role!=='admin')return;
    document.getElementById('adminUsersModal').hidden=false;
    await loadAdminUsers();
  }
  function closeAdminUsers(){document.getElementById('adminUsersModal').hidden=true;}

  async function loadAdminUsers(){
    const list=document.getElementById('adminUsersList');
    list.innerHTML='<div class="empty-note">Loading users…</div>';
    const {data,error}=await supabaseClient.from('profiles').select('id,email,display_name,role,approved,created_at').order('created_at',{ascending:true});
    if(error){list.innerHTML=`<div class="empty-note">${escapeHtml(error.message)}</div>`;return;}
    if(!data.length){list.innerHTML='<div class="empty-note">No registered users.</div>';return;}
    list.innerHTML=data.map(profile=>{
      const self=profile.id===currentAuthUser.id;
      return `<div class="admin-user-row" data-admin-user="${escapeAttr(profile.id)}"><div class="admin-user-ident"><div class="admin-user-name">${escapeHtml(profile.display_name||'Unnamed user')}${self?' · You':''}</div><div class="admin-user-email">${escapeHtml(maskEmail(profile.email||''))}</div></div><select data-admin-role ${self?'disabled':''} class="form-select">${['pending','viewer','leader','admin'].map(role=>`<option value="${role}" ${profile.role===role?'selected':''}>${role}</option>`).join('')}</select><label class="admin-approved"><input type="checkbox" data-admin-approved ${profile.approved?'checked':''} ${self?'disabled':''} class="form-check-input"> Approved</label><button class="btn small btn-outline-secondary btn-sm" data-admin-save ${self?'disabled':''}>Save</button></div>`;
    }).join('');
    list.querySelectorAll('[data-admin-save]').forEach(button=>button.addEventListener('click',async()=>{
      const row=button.closest('[data-admin-user]');
      const id=row.dataset.adminUser;
      const role=row.querySelector('[data-admin-role]').value;
      const approved=row.querySelector('[data-admin-approved]').checked;
      button.disabled=true;button.textContent='Saving…';
      const {error}=await supabaseClient.from('profiles').update({role,approved}).eq('id',id);
      if(error){showToast('User update failed',error.message,'err');button.disabled=false;button.textContent='Save';return;}
      showToast('User access updated',`${role}${approved?' · approved':' · pending'}`);
      await loadAdminUsers();
    }));
  }

  function titleAssetPath(title){
    const value=stringValue(title).trim();
    if(!value)return '';
    const match=value.match(/^([A-Za-z]+)\s+([IVX]+|[1-5])$/i);
    if(!match)return '';
    const series=TITLE_ICON_SERIES[match[1].toLowerCase()];
    const level=TITLE_ICON_LEVELS[match[2].toLowerCase()];
    if(!series||!level)return '';
    return `${TITLE_ICON_BASE}${series}_${level}_star${level===1?'':'s'}.png`;
  }

  async function loadMemberTitles(){
    memberTitleById=Object.create(null);
    if(!supabaseClient)return;
    const {data,error}=await supabaseClient.from('member_csv_data').select('member_id,title');
    if(error){
      console.warn('[Titania] Could not load member title icons:',error);
      return;
    }
    (data||[]).forEach(row=>{
      const id=stringValue(row&&row.member_id).trim();
      if(id)memberTitleById[id]=stringValue(row&&row.title).trim();
    });
  }

  function memberBoardIconHtml(member,slot=false){
    const color=classColor(member&&member.cls);
    if(currentEvent==='guild_league'||currentEvent==='siege'){
      const title=memberTitleById[stringValue(member&&member.id)];
      const src=titleAssetPath(title);
      if(src)return `<span class="title-icon" style="background-image:url('${src}')" title="${escapeAttr(title)}" aria-label="${escapeAttr(title)} title icon"></span>`;
    }
    return `<span class="class-dot" style="background:${color};color:${color}"></span>`;
  }

  async function initPlanner(){
    wireStaticControls();
    populateClassOptions(document.getElementById('memberClassInput'),'Hunter');
    try{
      const loaded = await callServer('getPlannerState');
      state = normalizeClientState(loaded || {});
      state.revision = toInt(loaded && loaded.revision,0,Number.MAX_SAFE_INTEGER);
      state.updatedAt = stringValue(loaded && loaded.updatedAt);
      state.updatedBy = stringValue(loaded && loaded.updatedBy);
      state.spreadsheetName = stringValue(loaded && loaded.spreadsheetName);
      await loadMemberTitles();
      rebuildIndex();
      syncedStateSnapshot = plannerSnapshot(state);
      setSaveFlag('ok','Loaded');
      renderAll();
      startPlannerAutoSync();
    }catch(error){
      setSaveFlag('err','Load failed');
      document.getElementById('loadingText').textContent = errorMessage(error);
      showToast('Could not load planner',errorMessage(error),'err');
      return;
    }
    document.getElementById('loadingOverlay').hidden = true;
  }

  let plannerConfirmationPending=false;
  async function confirmPlannerAction(title,text,confirmButtonText='Proceed',danger=false){
    if(plannerConfirmationPending)return false;
    if(!window.Swal){showToast('Confirmation unavailable','Refresh the page and try again. No action was taken.','warn');return false;}
    const event=currentEvent;
    plannerConfirmationPending=true;
    try{
      const result=await Swal.fire({
        title,text,icon:danger?'warning':'question',showCancelButton:true,
        confirmButtonText,cancelButtonText:'Cancel',focusCancel:true,reverseButtons:true,
        confirmButtonColor:danger?'var(--bs-danger)':'var(--bs-primary)',
        cancelButtonColor:'var(--bs-secondary)',background:'var(--bs-secondary-bg)',color:'var(--bs-body-color)'
      });
      return result.isConfirmed&&event===currentEvent;
    }finally{plannerConfirmationPending=false;}
  }

  function wirePlannerScrolling(){
    const pool=document.getElementById('sidebar');
    const topbar=document.getElementById('titania-topbar');
    const updateOffset=()=>pool.style.setProperty('--pool-top',`${(topbar&&!topbar.hidden?topbar.getBoundingClientRect().bottom:0)+12}px`);
    updateOffset();
    if(topbar)new ResizeObserver(updateOffset).observe(topbar);
    window.addEventListener('resize',updateOffset);
    let dragging=false,point=null,frame=0,lastTime=0;
    const stop=()=>{dragging=false;point=null;cancelAnimationFrame(frame);frame=0;lastTime=0;};
    const speed=(y,top,bottom)=>{
      const edge=Math.min(72,(bottom-top)/3);
      if(y<top+edge)return -Math.min(1,Math.max(0,(top+edge-y)/edge))*650;
      if(y>bottom-edge)return Math.min(1,Math.max(0,(y-bottom+edge)/edge))*650;
      return 0;
    };
    const scroll=time=>{
      if(!dragging)return;
      const elapsed=lastTime?Math.min(time-lastTime,32)/1000:0;
      lastTime=time;
      if(point){
        const hit=document.elementFromPoint(point.x,point.y);
        const overPool=hit&&pool.contains(hit);
        const list=overPool?pool.querySelector('#memberList:not([hidden]), #partyPoolList:not([hidden])'):null;
        if(list&&getComputedStyle(list).display!=='none'){
          const bounds=list.getBoundingClientRect();
          list.scrollTop+=speed(point.y,bounds.top,Math.min(bounds.bottom,innerHeight))*elapsed;
        }else if(!overPool){
          const top=topbar&&!topbar.hidden?topbar.getBoundingClientRect().bottom:0;
          window.scrollBy(0,speed(point.y,top,innerHeight)*elapsed);
        }
      }
      frame=requestAnimationFrame(scroll);
    };
    document.addEventListener('dragstart',event=>{
      if(!event.target.closest('#bodyWrap [draggable="true"]'))return;
      stop();dragging=true;frame=requestAnimationFrame(scroll);
    },true);
    document.addEventListener('dragover',event=>{if(dragging)point={x:event.clientX,y:event.clientY};},true);
    document.addEventListener('dragleave',event=>{if(!event.relatedTarget)point=null;},true);
    document.addEventListener('drop',stop,true);
    document.addEventListener('dragend',stop,true);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')stop();},true);
    window.addEventListener('blur',stop);
  }

  function wireStaticControls(){
    wirePlannerScrolling();
    document.getElementById('eventTabs').addEventListener('click',event=>{
      const button = event.target.closest('[data-event]');
      if(!button) return;
      setEvent(button.dataset.event);
    });
    document.getElementById('memberSearch').addEventListener('input',event=>{
      searchTerm = event.target.value;
      renderMemberList();
    });
    document.getElementById('classFilter').addEventListener('change',event=>{
      classFilter = event.target.value;
      renderMemberList();
    });
    document.getElementById('addMemberBtn').addEventListener('click',()=>openMemberModal(null));
    document.getElementById('autoFillBtn').addEventListener('click',async()=>{if(await confirmPlannerAction('Auto-fill lineup?','Fill the remaining slots by Gear Rating. Existing assignments will be kept.','Auto-fill')&&userCanEdit())autoFillCurrent();});
    document.getElementById('printBtn').addEventListener('click',async()=>{if(await confirmPlannerAction('Open Print/Share?','Open the print and share preview for this event.','Open preview'))openPrintView();});
    document.getElementById('poolToggleBtn').addEventListener('click',async()=>{if(await confirmPlannerAction('Change pool visibility?','Show or hide the Member/Party Pool.','Proceed'))togglePoolVisibility();});
    document.getElementById('publicToggleBtn').addEventListener('click',togglePublicVisibility);
    document.getElementById('exportBtn').addEventListener('click',async()=>{if(await confirmPlannerAction('Export lineup?','Download the roster, membership history and all event lineups as a JSON file.','Export'))exportLineup();});
    document.getElementById('importBtn').addEventListener('click',async()=>{if(await confirmPlannerAction('Import lineup?','Choose an exported JSON file. You will confirm replacing the data after the file is checked.','Choose file')&&userCanEdit())document.getElementById('importFileInput').click();});
    document.getElementById('importFileInput').addEventListener('change',event=>{
      const file = event.target.files && event.target.files[0];
      if(file) importLineupFile(file);
      event.target.value = '';
    });
    document.getElementById('clearBtn').addEventListener('click',clearCurrentEvent);

    document.getElementById('memberModalClose').addEventListener('click',closeMemberModal);
    document.getElementById('memberModalCancel').addEventListener('click',closeMemberModal);
    document.getElementById('memberModalSave').addEventListener('click',saveMemberFromModal);
    document.getElementById('memberModal').addEventListener('click',event=>{if(event.target.id==='memberModal') closeMemberModal();});
    document.getElementById('memberNameInput').addEventListener('keydown',event=>{if(event.key==='Enter') saveMemberFromModal();});

    document.getElementById('statusModalClose').addEventListener('click',closeStatusModal);
    document.getElementById('statusModalCancel').addEventListener('click',closeStatusModal);
    document.getElementById('statusModalSave').addEventListener('click',saveStatusModal);
    document.getElementById('statusModal').addEventListener('click',event=>{if(event.target.id==='statusModal') closeStatusModal();});
    document.getElementById('statusReasonInput').addEventListener('change',syncStatusOtherReason);


    document.getElementById('printCloseBtn').addEventListener('click',closePrintView);
    document.getElementById('printNowBtn').addEventListener('click',printCurrentLineup);
    window.addEventListener('beforeprint',()=>{
      const overlay=document.getElementById('printOverlay');
      if(overlay && !overlay.hidden) document.body.classList.add('print-mode');
    });
    window.addEventListener('afterprint',()=>{
      document.body.classList.remove('print-mode');
    });

    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape') return;
      if(!document.getElementById('memberModal').hidden) closeMemberModal();
      else if(!document.getElementById('statusModal').hidden) closeStatusModal();
      else if(!document.getElementById('printOverlay').hidden) closePrintView();
      else clearSelections();
    });
    window.addEventListener('beforeunload',event=>{
      if(!dirty && !saveInFlight && quickSaveInFlight===0) return;
      event.preventDefault();
      event.returnValue='';
    });
  }

  async function callServer(method,...args){
    if(!supabaseClient)throw new Error('Supabase is not configured.');
    if(method==='getPlannerState'){
      const {data,error}=await supabaseClient.from('planner_state').select('state,revision,updated_at,updated_by').eq('id',1).single();
      if(error)throw error;
      const payload=data&&data.state&&typeof data.state==='object'?data.state:{};
      let updatedBy='';
      const updaterId=stringValue(data&&data.updated_by).trim();
      if(updaterId){
        const {data:updaterProfile,error:profileError}=await supabaseClient.from('profiles').select('display_name,email').eq('id',updaterId).maybeSingle();
        if(!profileError&&updaterProfile){
          updatedBy=stringValue(updaterProfile.display_name).trim()||stringValue(updaterProfile.email).trim();
        }
      }
      return {...payload,revision:Number(data.revision||0),updatedAt:data.updated_at||'',updatedBy,spreadsheetName:'Titania Guild Management'};
    }
    if(method==='savePlannerState'){
      if(!userCanEdit())throw new Error('READ_ONLY: Your account cannot edit the planner.');
      const snapshot=args[0]&&typeof args[0]==='object'?args[0]:{};
      const baseRevision=toInt(args[1],0,Number.MAX_SAFE_INTEGER);
      const {data,error}=await supabaseClient.rpc('save_planner_state',{p_state:snapshot,p_base_revision:baseRevision});
      if(error)throw error;
      return data||{};
    }
    if(method==='saveRaidCommanderSetting'){
      if(!userCanEdit())throw new Error('READ_ONLY: Your account cannot edit Raid Commanders.');
      const {data,error}=await supabaseClient.rpc('save_raid_commander_setting',{p_raid_id:stringValue(args[0]),p_member_name:stringValue(args[1])});
      if(error)throw error;
      return data||{};
    }
    if(method==='saveRaidLeaderSetting'){
      if(!userCanEdit())throw new Error('READ_ONLY: Your account cannot edit Raid Leaders.');
      const {data,error}=await supabaseClient.rpc('save_raid_leader_setting',{p_raid_id:stringValue(args[0]),p_member_name:stringValue(args[1])});
      if(error)throw error;
      return data||{};
    }
    if(method==='saveRaidModeSetting'){
      if(!userCanEdit())throw new Error('READ_ONLY: Your account cannot edit raid modes.');
      const {data,error}=await supabaseClient.rpc('save_raid_mode_setting',{p_raid_id:stringValue(args[0]),p_mode:stringValue(args[1])});
      if(error)throw error;
      return data||{};
    }
    if(method==='getPlannerEnvironment'){
      return {spreadsheetName:'Titania Guild Management',webAppUrl:window.location.href};
    }
    throw new Error(`Supabase backend does not implement ${method}.`);
  }

  function createMockState(){
    const rows = [
      ['YRDRY','Hunter',44800],['Astra','High Priest',42100],['Kairo','Lord Knight',43750],['Nyx','Assassin Cross',43100],['Lumi','High Wizard',42500],
      ['Riven','Paladin',41900],['Miko','Sniper',41200],['Sage','Champion',40750],['Vela','Creator',40200],['Orion','Priest',39700],
      ['Cinder','Rebel',39100],['Tala','Dancer',38600],['Rune','Wizard',38100],['Mira','Acolyte',37600],['Zeph','Whitesmith',37100],
      ['Echo','Bard',36800],['Jett','Gunslinger',36200],['Iris','Druid',35800],['Nova','Knight',35200],['Vale','Hunter',34600]
    ];
    const roster = rows.map((row,index)=>({id:`member_preview_${index+1}`,name:row[0],cls:row[1],gr:row[2],status:'active',inactiveSince:'',lastReturned:'',inactiveReason:'',notes:''}));
    roster.push({id:'member_preview_former',name:'FormerMember',cls:'Priest',gr:33000,status:'inactive',inactiveSince:'2026-07-20',lastReturned:'',inactiveReason:'Left Guild',notes:'Preview inactive member'});
    const assignments=createEmptyAssignments();
    assignments.main_1=['Kairo','Astra','YRDRY','Lumi','Nyx'];
    assignments.main_2=['Riven','Orion','Miko','Sage','Vela'];
    assignments.sub_1=['Nova','Mira','Cinder','Tala','Rune'];
    assignments.elite_1=['Kairo','Astra','YRDRY','Lumi','Nyx'];
    assignments.dungeon1_1=['Kairo','Astra','YRDRY','Lumi','Nyx'];
    const membershipHistory=[{id:'history_preview_1',memberId:'member_preview_former',memberName:'FormerMember',action:'inactive',effectiveDate:'2026-07-20',reason:'Left Guild',changedAt:'2026-07-20T10:00:00.000Z'}];
    return {version:'preview',spreadsheetName:'Preview Sheet',roster,assignments,finishedDungeons:[],raidCommanders:createDefaultRaidCommanders(),raidLeaders:createDefaultRaidLeaders(),raidModes:createDefaultRaidModes(),siegeRaidGroups:createDefaultSiegeRaidGroups(),membershipHistory,eventUpdates:{guildLeague:{updatedAt:'',updatedBy:''},siege:{updatedAt:'',updatedBy:''},polarityZone:{updatedAt:'',updatedBy:''}},revision:1,updatedAt:new Date().toISOString()};
  }

  function createDefaultRaidLeaders(){
    const out={};
    ALL_GUILD_STYLE_RAIDS.forEach(raid=>{out[raid.id]='';});
    return out;
  }

  function createDefaultRaidCommanders(){
    const out={};
    ALL_RAIDS.forEach(raid=>{out[raid.id]='';});
    return out;
  }

  function createDefaultRaidModes(){
    const out={};
    ALL_GUILD_STYLE_RAIDS.forEach(raid=>{out[raid.id]=SUB_RAIDS.some(item=>item.id===raid.id)?'MID':'ATK';});
    return out;
  }

  function normalizeRaidModes(raw){
    const source=raw&&typeof raw==='object'?raw:{};
    const out=createDefaultRaidModes();
    ALL_GUILD_STYLE_RAIDS.forEach(raid=>{
      const mode=stringValue(source[raid.id]).trim().toUpperCase();
      out[raid.id]=SUB_RAIDS.some(item=>item.id===raid.id)?(['MID','TOP','BOTTOM'].includes(mode)?mode:'MID'):(mode==='DEF'?'DEF':'ATK');
    });
    return out;
  }

  function raidMemberNames(raid,assignments=state.assignments,siegeRaidGroups=state.siegeRaidGroups){
    const names=new Set();
    raidKeysForGroups(raid,siegeRaidGroups).forEach(key=>(assignments[key]||[]).forEach(name=>{if(name)names.add(name);}));
    return names;
  }

  function normalizeRaidCommanders(raw,assignments,siegeRaidGroups){
    const source=raw&&typeof raw==='object'?raw:{};
    const out=createDefaultRaidCommanders();
    ALL_RAIDS.forEach(raid=>{
      const candidate=stringValue(source[raid.id]).trim();
      if(!candidate)return;
      const keys=raidKeysForGroups(raid,siegeRaidGroups);
      // Backward compatibility: older versions stored a team key. Convert it to that team's current leader.
      if(keys.includes(candidate)){
        const legacyCommander=assignments[candidate]&&assignments[candidate][0]?assignments[candidate][0]:'';
        if(legacyCommander)out[raid.id]=legacyCommander;
        return;
      }
      if(raidMemberNames(raid,assignments,siegeRaidGroups).has(candidate))out[raid.id]=candidate;
    });
    return out;
  }

  function normalizeRaidLeaders(raw,assignments,siegeRaidGroups){
    const source=raw&&typeof raw==='object'?raw:{};
    const out=createDefaultRaidLeaders();
    ALL_GUILD_STYLE_RAIDS.forEach(raid=>{
      const candidate=stringValue(source[raid.id]).trim();
      if(candidate&&raidMemberNames(raid,assignments,siegeRaidGroups).has(candidate))out[raid.id]=candidate;
    });
    return out;
  }

  function validateRaidCommanders(){
    ALL_RAIDS.forEach(raid=>{
      const selected=stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim();
      if(selected&&!raidMemberNames(raid).has(selected))state.raidCommanders[raid.id]='';
    });
  }

  function validateRaidLeaders(){
    ALL_GUILD_STYLE_RAIDS.forEach(raid=>{
      const selected=stringValue(state.raidLeaders&&state.raidLeaders[raid.id]).trim();
      if(selected&&!raidMemberNames(raid).has(selected))state.raidLeaders[raid.id]='';
    });
  }

  function createEmptyAssignments(){
    const out={};
    ALL_KEYS.forEach(key=>{out[key]=new Array(CONFIG.teamSize).fill(null);});
    return out;
  }

  function normalizePublicVisibility(raw){
    const source=raw&&typeof raw==='object'?raw:{};
    return {guildLeague:source.guildLeague===true,siege:source.siege===true,polarityZone:source.polarityZone===true};
  }

  function normalizeClientState(input){
    const rawRoster = Array.isArray(input.roster)?input.roster:(Array.isArray(input.m)?input.m:[]);
    const roster=[];
    const canonicalActive=new Map();
    const memberByLower=new Map();
    const memberByIdMap=new Map();
    const usedIds=new Set();
    rawRoster.slice(0,CONFIG.maxMembers*2).forEach(raw=>{
      if(!raw || typeof raw!=='object') return;
      const name=stringValue(raw.name).trim().slice(0,120);
      if(!name || memberByLower.has(name.toLowerCase())) return;
      let id=stringValue(raw.id||raw.memberId).trim().slice(0,120);
      if(!id||usedIds.has(id))id=makeId('member');
      while(usedIds.has(id))id=makeId('member');
      usedIds.add(id);
      const cls=CLASSES.includes(stringValue(raw.cls||raw.class))?stringValue(raw.cls||raw.class):'Unknown';
      const gr=toInt(raw.gr!==undefined?raw.gr:raw.gearRating,0,999999999);
      const notes=stringValue(raw.notes).trim().slice(0,500);
      const status=stringValue(raw.status||raw.guildStatus).trim().toLowerCase()==='inactive'?'inactive':'active';
      const inactiveSince=status==='inactive'?normalizeDateValue(raw.inactiveSince||raw.leftDate||raw.departureDate):'';
      const lastReturned=normalizeDateValue(raw.lastReturned||raw.returnedDate||raw.reactivatedOn);
      const inactiveReason=status==='inactive'?stringValue(raw.inactiveReason||raw.reason).trim().slice(0,300):'';
      const updatedAt=normalizeTimestampValue(raw.updatedAt||raw.lastUpdatedAt||raw.modifiedAt);
      const updatedBy=stringValue(raw.updatedBy||raw.lastUpdatedBy).trim().slice(0,120);
      const member={id,name,cls,gr,status,inactiveSince,lastReturned,inactiveReason,notes,updatedAt,updatedBy};
      roster.push(member);
      memberByLower.set(name.toLowerCase(),member);
      memberByIdMap.set(id,member);
      if(status==='active')canonicalActive.set(name.toLowerCase(),name);
    });
    const rawAssignments = input.assignments && typeof input.assignments==='object'?input.assignments:(input.a&&typeof input.a==='object'?input.a:{});
    const assignments=createEmptyAssignments();
    ALL_KEYS.forEach(key=>{
      const slots=Array.isArray(rawAssignments[key])?rawAssignments[key]:[];
      for(let i=0;i<CONFIG.teamSize;i++){
        const candidate=stringValue(slots[i]).trim();
        const canonicalName=canonicalActive.get(candidate.toLowerCase());
        if(canonicalName) assignments[key][i]=canonicalName;
      }
    });
    enforceUnique(assignments,GUILD_KEYS);
    enforceUnique(assignments,SIEGE_KEYS);
    enforceUnique(assignments,ELITE_KEYS);
    enforceUnique(assignments,DUNGEON_KEYS);
    const rawFinished=Array.isArray(input.finishedDungeons)?input.finishedDungeons:(Array.isArray(input.fd)?input.fd:[]);
    const finishedDungeons=[...new Set(rawFinished.map(v=>toInt(v,0,999)).filter(v=>v>=1&&v<=CONFIG.dungeonCount))].sort((a,b)=>a-b);
    const siegeRaidGroups=normalizeSiegeRaidGroups(input.siegeRaidGroups||(input.srg&&typeof input.srg==='object'?input.srg:{}));
    const raidCommanders=normalizeRaidCommanders(input.raidCommanders||(input.rc&&typeof input.rc==='object'?input.rc:(input.rl&&typeof input.rl==='object'?input.rl:{})),assignments,siegeRaidGroups);
    const raidLeaders=normalizeRaidLeaders(input.raidLeaders||(input.rlead&&typeof input.rlead==='object'?input.rlead:{}),assignments,siegeRaidGroups);
    const raidModes=normalizeRaidModes(input.raidModes||(input.rm&&typeof input.rm==='object'?input.rm:{}));
    const rawHistory=Array.isArray(input.membershipHistory)?input.membershipHistory:(Array.isArray(input.mh)?input.mh:[]);
    const usedHistoryIds=new Set();
    const membershipHistory=[];
    rawHistory.slice(-CONFIG.maxHistory*2).forEach(raw=>{
      if(!raw||typeof raw!=='object')return;
      let id=stringValue(raw.id||raw.historyId).trim().slice(0,120);
      if(!id||usedHistoryIds.has(id))id=makeId('history');
      while(usedHistoryIds.has(id))id=makeId('history');
      usedHistoryIds.add(id);
      let memberId=stringValue(raw.memberId).trim().slice(0,120);
      const suppliedName=stringValue(raw.memberName||raw.name).trim().slice(0,120);
      if(!memberId&&suppliedName&&memberByLower.has(suppliedName.toLowerCase()))memberId=memberByLower.get(suppliedName.toLowerCase()).id;
      const currentMember=memberId?memberByIdMap.get(memberId):null;
      const memberName=suppliedName||(currentMember?currentMember.name:'Unknown member');
      const rawAction=stringValue(raw.action).trim().toLowerCase();
      const action=rawAction==='reactivated'||rawAction==='active'?'reactivated':(rawAction==='inactive'||rawAction==='marked inactive'?'inactive':'');
      if(!action)return;
      membershipHistory.push({id,memberId,memberName,action,effectiveDate:normalizeDateValue(raw.effectiveDate||raw.date),reason:stringValue(raw.reason).trim().slice(0,300),changedAt:normalizeTimestampValue(raw.changedAt||raw.createdAt)});
    });
    const publicVisibility=normalizePublicVisibility(input.publicVisibility);
    const rawEventUpdates=input.eventUpdates&&typeof input.eventUpdates==='object'?input.eventUpdates:(input.eu&&typeof input.eu==='object'?input.eu:{});
    const legacyUpdatedAt=stringValue(input.updatedAt).trim()?normalizeTimestampValue(input.updatedAt):'';
    const legacyUpdatedBy=stringValue(input.updatedBy).trim().slice(0,120);
    const normalizeEventUpdate=(raw,useLegacy=true)=>{
      const source=raw&&typeof raw==='object'?raw:{};
      const rawAt=stringValue(source.updatedAt||source.at).trim();
      const rawBy=stringValue(source.updatedBy||source.by).trim().slice(0,120);
      return {
        updatedAt:rawAt?normalizeTimestampValue(rawAt):(useLegacy?legacyUpdatedAt:''),
        updatedBy:rawBy||(useLegacy?legacyUpdatedBy:'')
      };
    };
    const eventUpdates={
      guildLeague:normalizeEventUpdate(rawEventUpdates.guildLeague),
      siege:normalizeEventUpdate(rawEventUpdates.siege,false),
      polarityZone:normalizeEventUpdate(rawEventUpdates.polarityZone)
    };
    return {roster,assignments,finishedDungeons,raidCommanders,raidLeaders,raidModes,siegeRaidGroups,membershipHistory:membershipHistory.slice(-CONFIG.maxHistory),publicVisibility,eventUpdates,revision:0,updatedAt:'',spreadsheetName:''};
  }

  function enforceUnique(assignments,keys){
    const used=new Set();
    keys.forEach(key=>assignments[key].forEach((name,index)=>{
      if(!name) return;
      const lower=name.toLowerCase();
      if(used.has(lower)) assignments[key][index]=null;
      else used.add(lower);
    }));
  }

  function rebuildIndex(){
    memberByName=Object.create(null);
    memberById=Object.create(null);
    state.roster.forEach(member=>{memberByName[member.name]=member;memberById[member.id]=member;});
  }

  function renderAll(){
    rebuildIndex();
    if(currentEvent==='attendance'){
      renderTabs();
      renderHeaderStats();
      document.body.dataset.event='attendance';
      document.getElementById('eventActionRow').hidden=true;
      document.getElementById('bodyWrap').classList.add('dashboard-mode');
      if(window.TitaniaShowAttendance)window.TitaniaShowAttendance();
      return;
    }
    renderTabs();
    renderHeaderStats();
    renderActionState();
    renderHint();
    const body=document.getElementById('bodyWrap');
    const fullWidthMode=currentEvent==='dashboard'||currentEvent==='manage_members';
    body.classList.toggle('dashboard-mode',fullWidthMode);
    body.classList.toggle('pool-hidden',!fullWidthMode&&poolHidden);
    renderPoolToggle();
    body.dataset.event=currentEvent;
    document.body.dataset.event=currentEvent;
    if(currentEvent==='dashboard'){
      renderDashboard();
    }else if(currentEvent==='manage_members'){
      renderManageMembersTab();
    }else{
      renderSidebar();
      renderTeams();
    }
  }

  function renderTabs(){
    document.querySelectorAll('.event-tab').forEach(button=>{
      const active=button.dataset.event===currentEvent;
      button.classList.toggle('active',active);
      button.classList.toggle('db',active&&currentEvent==='dashboard');
      button.classList.toggle('mm',active&&currentEvent==='manage_members');
      button.classList.toggle('gl',active&&currentEvent==='guild_league');
      button.classList.toggle('sg',active&&currentEvent==='siege');
      button.classList.toggle('pz',active&&currentEvent==='polarity_zone');
      button.setAttribute('aria-current',active?'page':'false');
    });
  }

  function setEvent(eventName){
    if(!['dashboard','manage_members','guild_league','siege','attendance','polarity_zone'].includes(eventName)) return;
    currentEvent=eventName;
    try{localStorage.setItem('roworld_sheets_event_v1',eventName);}catch(error){}
    statusFilter='All';
    clearSelections(false);
    renderAll();
  }

  function readStoredEvent(){
    const page=document.body.dataset.plannerEvent;
    return ['dashboard','manage_members','guild_league','siege','attendance','polarity_zone'].includes(page)?page:'dashboard';
  }

  function renderHeaderStats(){
    const row=document.getElementById('statsRow');
    const active=activeRoster();
    const inactiveCount=state.roster.length-active.length;
    if(currentEvent==='dashboard'){
      const guildAssigned=assignedNamesSet(GUILD_KEYS).size;
      const siegeAssigned=assignedNamesSet(SIEGE_KEYS).size;
      const polarityAssigned=assignedNamesSet(POLARITY_KEYS).size;
      const healers=active.filter(member=>isHealer(member.cls)).length;
      row.innerHTML=statChip(active.length,'Active')+statChip(inactiveCount,'Inactive',inactiveCount>0)+statChip(`${guildAssigned}/150`,'Guild Slotted')+statChip(`${siegeAssigned}/150`,'Siege Slotted')+statChip(`${polarityAssigned}/250`,'PZ Slotted')+statChip(healers,'Healers');
      return;
    }
    if(currentEvent==='manage_members'){
      row.innerHTML=statChip(active.length,'Active')+statChip(inactiveCount,'Inactive',inactiveCount>0)+statChip(state.roster.length,'All Records');
      return;
    }
    const keys=currentTeamKeys();
    const assigned=assignedNamesSet(keys).size;
    const full=keys.filter(key=>state.assignments[key].every(Boolean)).length;
    const noHealer=keys.filter(teamHasNoHealer).length;
    row.innerHTML=statChip(active.length,'Active Members')+statChip(`${assigned}/${keys.length*CONFIG.teamSize}`,'Slotted')+statChip(`${full}/${keys.length}`,'Full Teams')+statChip(noHealer,'No Healer',noHealer>0);
  }

  function statChip(value,label,warn){
    return `<div class="flex-shrink-0 text-nowrap"><div class="text-muted small">${escapeHtml(label)}</div><div class="fw-semibold fs-16 ${warn?'text-danger':'text-body'}">${escapeHtml(String(value))}</div></div>`;
  }

  function renderActionState(){
    const nonTeamMode=currentEvent==='dashboard'||currentEvent==='manage_members';
    document.getElementById('autoFillBtn').hidden=nonTeamMode;
    const eventActionRow=document.getElementById('eventActionRow');
    if(eventActionRow)eventActionRow.hidden=nonTeamMode;
    if(!nonTeamMode){
      document.getElementById('autoFillBtn').title=currentEvent==='polarity_zone'?'Fill the Star Dungeon only':'Fill Main and Sub teams by highest Gear Rating';
      renderPoolToggle();
      renderPublicToggle();
      renderEventLastUpdated();
    }
  }

  function currentEditorName(){
    return stringValue(currentProfile&&currentProfile.display_name).trim()||stringValue(currentProfile&&currentProfile.email).trim()||'Unknown user';
  }

  function eventUpdateKey(eventName=currentEvent){
    if(eventName==='guild_league')return'guildLeague';
    if(eventName==='siege')return'siege';
    if(eventName==='polarity_zone')return'polarityZone';
    return'';
  }

  function ensureEventUpdates(){
    if(!state.eventUpdates||typeof state.eventUpdates!=='object')state.eventUpdates={};
    if(!state.eventUpdates.guildLeague||typeof state.eventUpdates.guildLeague!=='object')state.eventUpdates.guildLeague={updatedAt:'',updatedBy:''};
    if(!state.eventUpdates.siege||typeof state.eventUpdates.siege!=='object')state.eventUpdates.siege={updatedAt:'',updatedBy:''};
    if(!state.eventUpdates.polarityZone||typeof state.eventUpdates.polarityZone!=='object')state.eventUpdates.polarityZone={updatedAt:'',updatedBy:''};
  }

  function touchEventUpdate(scope=currentEvent){
    ensureEventUpdates();
    const stamp={updatedAt:new Date().toISOString(),updatedBy:currentEditorName()};
    if(scope==='all'||scope==='both'){
      state.eventUpdates.guildLeague={...stamp};
      state.eventUpdates.siege={...stamp};
      state.eventUpdates.polarityZone={...stamp};
      return;
    }
    const key=eventUpdateKey(scope);
    if(key)state.eventUpdates[key]={...stamp};
  }

  function renderEventLastUpdated(){
    const wrap=document.getElementById('eventLastUpdated');
    if(!wrap)return;
    const value=wrap.querySelector('.event-last-updated-value');
    if(!value)return;
    ensureEventUpdates();
    const key=eventUpdateKey();
    const entry=key&&state.eventUpdates[key]?state.eventUpdates[key]:{};
    const updateTime=entry.updatedAt?formatMemberUpdate(entry.updatedAt):'';
    const updater=stringValue(entry.updatedBy).trim();
    value.textContent=updateTime?`${updateTime}${updater?` · ${updater}`:''}`:'No event update recorded';
    wrap.title=updateTime?`${currentEventPublicLabel()} lineup last updated ${updateTime}${updater?` by ${updater}`:''}`:'No event-specific lineup update recorded yet';
  }

  function currentPublicVisibilityKey(){
    if(currentEvent==='polarity_zone')return'polarityZone';
    if(currentEvent==='siege')return'siege';
    return'guildLeague';
  }

  function currentEventPublicLabel(){
    if(currentEvent==='polarity_zone')return'Polarity Zone';
    if(currentEvent==='siege')return'Siege';
    return'Guild League';
  }

  function isCurrentEventPublished(){
    return Boolean(state.publicVisibility&&state.publicVisibility[currentPublicVisibilityKey()]);
  }

  function renderPublicToggle(){
    const button=document.getElementById('publicToggleBtn');
    const text=document.getElementById('publicToggleText');
    if(!button||!text)return;
    const published=isCurrentEventPublished();
    button.classList.toggle('on',published);
    button.classList.toggle('off',!published);
    button.setAttribute('aria-pressed',published?'true':'false');
    text.textContent=`Public View: ${published?'ON':'OFF'}`;
    button.title=published
      ?`${currentEventPublicLabel()} is visible on the public lineup page. Click to hide it.`
      :`${currentEventPublicLabel()} is private. Click to publish it publicly.`;
  }

  async function togglePublicVisibility(){
    if(!userCanEdit()){showToast('Read-only access','Your account cannot change public visibility.','warn');return;}
    if(currentEvent!=='guild_league'&&currentEvent!=='siege'&&currentEvent!=='polarity_zone')return;
    const key=currentPublicVisibilityKey();
    const label=currentEventPublicLabel();
    if(!state.publicVisibility||typeof state.publicVisibility!=='object')state.publicVisibility={guildLeague:false,siege:false,polarityZone:false};
    const next=!Boolean(state.publicVisibility[key]);
    if(!await confirmPlannerAction(
      `${next?'Publish':'Hide'} the ${label} lineup?`,
      next?'Anyone with the public link will be able to view this lineup.':'The lineup will no longer be visible to public visitors.',
      next?'Publish lineup':'Hide lineup'
    )||!userCanEdit()||key!==currentPublicVisibilityKey())return;
    state.publicVisibility[key]=next;
    commitMutation(`${label} public lineup ${next?'published':'hidden'}`,'none');
    showToast(next?'Public view published':'Public view hidden',next?`${label} is now visible on the public page.`:`${label} is now private. Public visitors will see that no lineup is published.`);
  }

  function renderHint(){
    const bar=document.getElementById('hintBar');
    if(currentEvent==='dashboard'){
      bar.innerHTML=hintIcon()+`<div><b>Dashboard:</b> review guild statistics, class balance, Gear Rating distribution, top members, and recent membership history. Use the <b>Members</b> tab for roster changes.</div>`;
      return;
    }
    if(currentEvent==='manage_members'){
      bar.innerHTML=hintIcon()+`<div><b>Members:</b> add or edit members, change class and Gear Rating, mark members inactive when they leave, and reactivate them when they return. Every change autosaves to Supabase.</div>`;
      return;
    }
    const extra=currentEvent==='polarity_zone'?` · <b>Bringing teams down:</b> drag a team's handle (or tap it, then tap a target card) from Star onto an empty Normal Dungeon team. Star is copied; Normal Dungeon teams are moved.`:currentEvent==='siege'?` · <b>Siege Parties:</b> drag the ⠿ handle on a Party into another Raid. Each Raid must keep at least 1 Party and can hold up to 5.`:'';
    bar.innerHTML=hintIcon()+`<div><b>Desktop:</b> drag a member onto a slot — drag one filled slot onto another to swap them directly. · <b>Any device:</b> tap/click a member (or a filled slot) to select it, then tap another slot to place or swap. Click a filled slot's ✕ to remove. · Use <b>Print/Share</b> for a clean summary.${extra}</div>`;
  }

  function hintIcon(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v.01M11 12h1v4h1"></path></svg>`;}

  function renderSidebar(){
    renderFilters();
    renderClassFilter();
    renderSortRow();
    renderMemberList();
    renderClassBreakdown();
  }

  function renderFilters(){
    const options=currentEvent==='polarity_zone'?['All','Star','Normal','Unassigned']:['All','Main','Sub','Unassigned'];
    if(!options.includes(statusFilter)) statusFilter='All';
    const row=document.getElementById('filterRow');
    row.innerHTML=options.map(option=>`<button class="pill ${option===statusFilter?'active':''} btn btn-outline-primary btn-sm px-2 text-nowrap" data-filter="${option}">${option}</button>`).join('');
    row.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{statusFilter=button.dataset.filter;renderFilters();renderMemberList();}));
  }

  function renderClassFilter(){
    const select=document.getElementById('classFilter');
    const classes=[...new Set(activeRoster().map(member=>member.cls))].sort((a,b)=>a.localeCompare(b));
    if(classFilter!=='All'&&!classes.includes(classFilter)) classFilter='All';
    select.innerHTML='<option value="All">All Classes</option>'+classes.map(cls=>`<option value="${escapeAttr(cls)}">${escapeHtml(cls)}</option>`).join('');
    select.value=classFilter;
  }

  function renderSortRow(){
    const row=document.getElementById('sortRow');
    const options=[{key:'gr',label:'Gear Rating'},{key:'name',label:'Name'}];
    row.innerHTML='<span class="sort-label">Sort</span>'+options.map(option=>{
      const active=sortBy===option.key;
      const arrow=sortDir==='asc'?'fa-arrow-up':'fa-arrow-down';
      return `<button class="pill sort-pill ${active?'active':''} btn btn-outline-primary btn-sm" data-sort="${option.key}"><span${active?' class="mr-2"':''}>${option.label}</span>${active?`<i class="fa-solid ${arrow}" aria-hidden="true"></i>`:''}</button>`;
    }).join('');
    row.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>{
      const key=button.dataset.sort;
      if(sortBy===key) sortDir=sortDir==='asc'?'desc':'asc';
      else{sortBy=key;sortDir=key==='name'?'asc':'desc';}
      renderSortRow();renderMemberList();
    }));
  }

  function renderMemberList(){
    if(currentEvent==='dashboard'||currentEvent==='manage_members') return;
    const list=activeRoster().filter(member=>{
      const status=memberStatus(member.name);
      if(statusFilter!=='All'&&!status.filters.includes(statusFilter)) return false;
      if(classFilter!=='All'&&member.cls!==classFilter) return false;
      if(searchTerm&&!member.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    }).sort(compareMembers);
    const wrap=document.getElementById('memberList');
    if(!list.length){wrap.innerHTML='<div class="empty-note">No active members match this filter.<br>Inactive members are managed from the Members tab.</div>';return;}
    wrap.innerHTML=list.map(member=>memberCardHtml(member)).join('');
    wrap.querySelectorAll('.member-card').forEach(card=>{
      const name=card.dataset.name;
      const status=memberStatus(name);
      if(!status.assigned){
        card.addEventListener('dragstart',event=>{
          dragMemberName=name;dragSourceSlot=null;card.classList.add('dragging');
          event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',name);
        });
        card.addEventListener('dragend',()=>{card.classList.remove('dragging');dragMemberName=null;});
      }
      card.addEventListener('click',event=>{
        if(event.target.closest('.card-tools')) return;
        if(status.assigned) return;
        selectedMember=selectedMember===name?null:name;
        selectedSlot=null;selectedTeamSource=null;
        renderMemberList();renderTeams();
      });
    });
    wrap.querySelectorAll('[data-edit-member]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openMemberModal(button.dataset.editMember);}));
    wrap.querySelectorAll('[data-inactivate-member]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openStatusModal(button.dataset.inactivateMember,'inactive');}));
  }

  function compareMembers(a,b){
    let result=sortBy==='name'?a.name.localeCompare(b.name,undefined,{sensitivity:'base'}):a.gr-b.gr;
    if(result===0) result=a.name.localeCompare(b.name,undefined,{sensitivity:'base'});
    return sortDir==='asc'?result:-result;
  }

  function memberCardHtml(member){
    const status=memberStatus(member.name);
    const selected=selectedMember===member.name;
    const color=classColor(member.cls);
    const tags=status.labels.map(label=>`<span class="status-tag ${statusTagClass(label)}">${escapeHtml(label)}</span>`).join('');
    return `<div class="member-card ${status.assigned?'assigned':''} ${selected?'selected':''}" draggable="${status.assigned?'false':'true'}" data-name="${escapeAttr(member.name)}">
      ${memberBoardIconHtml(member)}
      <div class="m-info"><div class="m-name">${escapeHtml(member.name)}</div><div class="m-sub"><span>${escapeHtml(member.cls)}</span>${tags}${status.assignmentText?`<span class="assigned-flag">${escapeHtml(status.assignmentText)}</span>`:''}</div></div>
      <span class="m-gr">${formatNumber(member.gr)}</span>
      <div class="card-tools"><button class="icon-btn btn btn-outline-secondary btn-sm" data-edit-member="${escapeAttr(member.name)}" title="Edit member">✎</button><button class="icon-btn btn btn-outline-secondary btn-sm" data-inactivate-member="${escapeAttr(member.name)}" title="Mark inactive">⏸</button></div>
    </div>`;
  }

  function memberStatus(name){
    if(currentEvent==='siege'){
      const found=findAssignments(name,SIEGE_KEYS);
      if(found.length){
        const raid=raidForTeam(found[0].key);
        const raidLabel=raid?raid.label:'Raid ?';
        return {assigned:true,labels:[raidLabel],filters:[found[0].key.startsWith('siege_main_')?'Main':'Sub'],assignmentText:''};
      }
      return {assigned:false,labels:['Unassigned'],filters:['Unassigned'],assignmentText:''};
    }
    if(currentEvent==='polarity_zone'){
      const elite=findAssignments(name,ELITE_KEYS);
      const dungeon=findAssignments(name,DUNGEON_KEYS);
      const labels=[];const filters=[];const texts=[];
      if(elite.length){labels.push('Star');filters.push('Star');texts.push('Star');}
      if(dungeon.length){labels.push('Normal');filters.push('Normal');texts.push('Normal');}
      if(!labels.length){labels.push('Unassigned');filters.push('Unassigned');}
      return {assigned:elite.length>0||dungeon.length>0,labels,filters,assignmentText:texts.join(' · ')};
    }
    const mainKeys=currentEvent==='siege'?SIEGE_MAIN_KEYS:MAIN_KEYS;
    const subKeys=currentEvent==='siege'?SIEGE_SUB_KEYS:SUB_KEYS;
    const main=findAssignments(name,mainKeys);
    const sub=findAssignments(name,subKeys);
    if(main.length) return {assigned:true,labels:['Main'],filters:['Main'],assignmentText:main.map(item=>teamLongLabel(item.key)).join(', ')};
    if(sub.length) return {assigned:true,labels:['Sub'],filters:['Sub'],assignmentText:sub.map(item=>teamLongLabel(item.key)).join(', ')};
    return {assigned:false,labels:['Unassigned'],filters:['Unassigned'],assignmentText:''};
  }

  function statusTagClass(label){return label==='Main'?'tag-main':label==='Sub'?'tag-sub':label==='Star'?'tag-elite':label==='Normal'?'tag-dungeon':label.startsWith('Raid ')?'tag-siege':'tag-unassigned';}

  function findAssignments(name,keys){
    const found=[];
    keys.forEach(key=>state.assignments[key].forEach((value,slot)=>{if(value===name) found.push({key,slot});}));
    return found;
  }

  function renderClassBreakdown(){
    const wrap=document.getElementById('classBreakdown');
    const active=activeRoster();
    const counts={};active.forEach(member=>{counts[member.cls]=(counts[member.cls]||0)+1;});
    const rows=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b));
    wrap.innerHTML=`<div class="cb-head"><span>Active Class Breakdown</span><span>${active.length}</span></div>`+(rows.length?rows.map(cls=>`<div class="cb-row"><span class="class-dot" style="background:${classColor(cls)};color:${classColor(cls)}"></span><span class="cb-name">${escapeHtml(cls)}</span><span class="cb-count">${counts[cls]}</span></div>`).join(''):'<div class="empty-note" style="padding:8px">No active members.</div>');
  }

  function renderTeams(){
    const wrap=document.getElementById('teamsWrap');
    if(currentEvent==='polarity_zone'){
      let html=sectionHeader('★ STAR DUNGEON','elite-bf',`2 raid teams · Parties 1–${CONFIG.eliteTeams}`)+`<div class="main-raids polarity-star-raids">${POLARITY_STAR_RAIDS.map(mainRaidHtml).join('')}</div>`;
      for(let dungeon=1;dungeon<=CONFIG.dungeonCount;dungeon++){
        const keys=dungeonKeys(dungeon);const assigned=assignedNamesSet(keys).size;const finished=state.finishedDungeons.includes(dungeon);
        const raid=POLARITY_NORMAL_RAIDS.find(item=>item.dungeon===dungeon);
        const selectedCommander=raid?stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim():'';
        const displayCommander=selectedCommander||'NOT ASSIGNED';
        const dropText=selectedCommander||'Drag member here';
        const gridClass=keys.length===5?'cols-5':'cols-4';
        html+=`<div class="pz-dungeon-group"><div class="pz-dungeon-group-head"><span class="pz-dungeon-group-title">🗝 Normal Dungeon ${dungeon}</span><span class="pz-dungeon-group-team">TEAM ${escapeHtml(displayCommander)}</span><span class="pz-dungeon-group-line"></span><label class="raid-commander-control"><b>Raid Commander</b><span class="raid-commander-drop ${selectedCommander?'':'empty'}" data-raid-commander-drop="${raid?raid.id:''}" role="button" tabindex="0" title="Drag any member from Normal Dungeon ${dungeon} here to make them Raid Commander">${raidCommanderIcon()}<span class="raid-commander-drop-name">${escapeHtml(dropText)}</span></span></label>${finished?'<span class="dungeon-finished-badge">✅ Run Finished</span>':`<span class="pz-dungeon-member-count">${assigned}/${keys.length*CONFIG.teamSize} members</span>`}<span class="pz-dungeon-group-actions"><button class="btn small btn-outline-secondary btn-sm" data-autofill-dungeon="${dungeon}">⚡ Auto-fill</button><button class="btn small dungeon-finish-btn ${finished?'active':''} btn-outline-secondary btn-sm" data-finish-dungeon="${dungeon}">${finished?'↺ Reopen':'🏁 Mark Finished'}</button></span></div><div class="pz-dungeon-team-grid ${gridClass}">${keys.map(teamCardHtml).join('')}</div></div>`;
      }
      wrap.innerHTML=html;
    }else if(currentEvent==='siege'){
      wrap.innerHTML=`<div class="main-raids siege-raids">${currentSiegeRaids().map(mainRaidHtml).join('')}</div>`;
    }else{
      wrap.innerHTML=sectionHeader('⚔ Main Battlefield','main-bf',`3 raids · 4 teams each`)+`<div class="main-raids">${MAIN_RAIDS.map(mainRaidHtml).join('')}</div>`+sectionHeader('<i class="fa-solid fa-shield-cat mr-2" aria-hidden="true"></i>Sub Battlefield','sub-bf',`4 raids · Parties 1–${CONFIG.subTeams}`)+`<div class="main-raids sub-raids">${SUB_RAIDS.map(mainRaidHtml).join('')}</div>`;
    }
    wireTeamInteractions();
  }

  function mainRaidHtml(raid){
    const selectedCommander=stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim();
    const displayCommander=selectedCommander||'Not assigned';
    const dropText=selectedCommander||'Drag member here';
    const isGuildMainRaid=MAIN_RAIDS.some(item=>item.id===raid.id);
    const isSiegeRaid=ALL_SIEGE_RAIDS.some(item=>item.id===raid.id);
    const isPolarityRaid=Boolean(raid.polarity);
    let modeToggle='';
    if(SUB_RAIDS.some(item=>item.id===raid.id)){
      const position=['MID','TOP','BOTTOM'].includes(state.raidModes?.[raid.id])?state.raidModes[raid.id]:'MID';
      modeToggle=`<button class="raid-mode-toggle gap-0" style="color:${position==='TOP'?'var(--bs-primary)':position==='BOTTOM'?'#ffd34d':'#3b82f6'};border-color:currentColor" data-raid-mode-toggle="${raid.id}" type="button" title="Switch this raid between MID, TOP and BOTTOM"><i class="fa-solid ${position==='TOP'?'fa-circle-up':position==='BOTTOM'?'fa-circle-down':'fa-circle-dot'} me-2" aria-hidden="true"></i>${position==='BOTTOM'?'BTM':position}</button>`;
    }
    if(isGuildMainRaid||isSiegeRaid){
      const raidMode=state.raidModes&&state.raidModes[raid.id]==='DEF'?'DEF':'ATK';
      const siegeModeLabel=raidMode==='DEF'?'RESPAWN':'CAPTURE';
      const modeIcon=isSiegeRaid?(raidMode==='DEF'?'↻':'🏰'):(raidMode==='DEF'?'🛡':'⚔');
      const modeLabel=isSiegeRaid?siegeModeLabel:raidMode;
      const modeTitle=isSiegeRaid?'Switch this raid between CAPTURE and RESPAWN':'Switch this raid between ATK and DEF';
      modeToggle=`<button class="raid-mode-toggle ${raidMode.toLowerCase()}" data-raid-mode-toggle="${raid.id}" type="button" title="${modeTitle}">${modeIcon} ${modeLabel}</button>`;
    }
    const title=`TEAM ${displayCommander}`;
    const selectedLeader=!isPolarityRaid?stringValue(state.raidLeaders&&state.raidLeaders[raid.id]).trim():'';
    const leaderDropText=selectedLeader||'Drag member here';
    const raidLeaderControl=isPolarityRaid?'':`<label class="raid-leader-control"><b>Raid Leader</b><span class="raid-leader-drop ${selectedLeader?'':'empty'}" data-raid-leader-drop="${raid.id}" role="button" tabindex="0" title="Drag the member who created this raid party here">${raidLeaderIcon()}<span class="raid-leader-drop-name">${escapeHtml(leaderDropText)}</span></span></label>`;
    let gridClass=raid.kind==='star'?'pz-star-raid-grid':raid.kind==='normal'?'pz-normal-raid-grid':'main-raid-grid';
    if(!isPolarityRaid&&raid.keys.length===5)gridClass+=' five';
    return `<div class="main-raid-block card mb-0" data-raid="${raid.id}"><div class="main-raid-head card-header ${currentEvent==='guild_league'&&SUB_RAIDS.some(item=>item.id===raid.id)?'': 'bg-primary-subtle'}"><div class="main-raid-title">${escapeHtml(title)}</div>${modeToggle}<div class="main-raid-line"></div><label class="raid-commander-control"><b>Raid Commander</b><span class="raid-commander-drop ${selectedCommander?'':'empty'}" data-raid-commander-drop="${raid.id}" role="button" tabindex="0" title="Drag any member from this raid here to make them Raid Commander">${raidCommanderIcon()}<span class="raid-commander-drop-name">${escapeHtml(dropText)}</span></span></label>${raidLeaderControl}</div><div class="${gridClass} card-body">${raid.keys.map(teamCardHtml).join('')}</div></div>`;
  }

  function raidForTeam(key){if(key.startsWith('siege_'))return currentSiegeRaids().find(raid=>raid.keys.includes(key))||null;return ALL_RAIDS.find(raid=>!raid.siege&&raid.keys.includes(key))||null;}

  function sectionHeader(title,kind,note){return `<div class="section-head"><div class="section-title ${kind}">${title}</div><div class="section-line"></div><div class="section-note">${note}</div></div>`;}

  function teamCardHtml(key){
    const slots=state.assignments[key];const filled=slots.filter(Boolean).length;const kind=teamKind(key);const noHealer=teamHasNoHealer(key);const dungeon=dungeonNumber(key);const finished=dungeon&&state.finishedDungeons.includes(dungeon);
    const matches=kind==='elite-bf'?dungeonMatches(key):[];const sent=matches.length>0;
    const wholePartyDraggable=currentEvent==='siege'||(currentEvent==='polarity_zone'&&filled);
    const handle=wholePartyDraggable?`<span class="team-drag-handle ${selectedTeamSource===key?'team-selected':''}" draggable="true" data-team-drag="${key}" title="${currentEvent==='siege'?'Drag this whole Party to another Raid':'Drag or tap to move/copy this whole team'}">⠿</span>`:'';
    const dot=filled===CONFIG.teamSize?'full':filled?'partial':'empty';
    return `<div class="team-card ${kind} ${sent?'sent':''} ${finished?'run-finished':''} card" data-team-key="${key}">
      <div class="team-head"><div class="team-name">${handle}<span>${escapeHtml(displayTeamLabel(key))}</span></div><div class="team-meta"><span class="team-fill-dot ${dot}"></span>${filled}/${CONFIG.teamSize}</div></div>
      ${slots.map((name,index)=>slotHtml(key,index,name)).join('')}
      ${sent?`<div class="team-sent-badge">↳ Sent to ${matches.map(teamLongLabel).map(escapeHtml).join(', ')}</div>`:''}
      ${noHealer?'<div class="team-warn">⚠ No healer</div>':''}
    </div>`;
  }

  function slotHtml(key,index,name){
    const leader=index===0;const selected=selectedSlot&&selectedSlot.team===key&&selectedSlot.slot===index;
    if(!name){
      return `<div class="slot ${leader?'leader':''} ${selected?'slot-selected':''}" data-team="${key}" data-slot="${index}" role="button" tabindex="0" aria-label="${leader?'Empty team leader slot':'Empty member slot'}"><span class="slot-empty-label">${leader?'Team Leader — drop here':'Empty slot'}</span></div>`;
    }
    const member=memberByName[name]||{name,cls:'Unknown',gr:0};const color=classColor(member.cls);
    const raid=raidForTeam(key);
    const raidCommanderSelected=Boolean(raid&&state.raidCommanders&&state.raidCommanders[raid.id]===name);
    const raidLeaderSelected=Boolean(raid&&state.raidLeaders&&state.raidLeaders[raid.id]===name);
    return `<div class="slot filled ${leader?'leader':''} ${selected?'slot-selected':''}" draggable="true" data-team="${key}" data-slot="${index}" role="button" tabindex="0" aria-label="${escapeAttr(name)} in ${escapeAttr(teamLongLabel(key))}"><div class="slot-member-main">${memberBoardIconHtml(member,true)}<div class="slot-info"><span class="slot-name">${escapeHtml(name)}</span><span class="slot-class" style="color:${color}">${escapeHtml(member.cls)}</span></div>${raidCommanderSelected?`<span class="slot-raid-commander-mark" title="Raid Commander" aria-label="Raid Commander">${raidCommanderSlotIcon()}</span>`:''}${raidLeaderSelected?`<span class="slot-raid-leader-mark" title="Raid Leader" aria-label="Raid Leader">${raidLeaderSlotIcon()}</span>`:''}</div><span class="slot-gr">${formatNumber(member.gr)}</span><button class="slot-remove" data-remove-team="${key}" data-remove-slot="${index}" title="Remove from slot" aria-label="Remove ${escapeAttr(name)}">✕</button></div>`;
  }

  function raidCommanderIcon(){return '<i class="fa-solid fa-person-military-rifle raid-commander-icon" aria-hidden="true"></i>';}
  function raidCommanderSlotIcon(){return '<i class="fa-solid fa-person-military-rifle raid-commander-slot-icon" aria-hidden="true"></i>';}
  function raidLeaderIcon(){return '<i class="fa-solid fa-crown raid-leader-icon" aria-hidden="true"></i>';}
  function raidLeaderSlotIcon(){return '<i class="fa-solid fa-crown raid-leader-slot-icon" aria-hidden="true"></i>';}
  function crownIcon(){return `<svg class="leader-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/></svg>`;}
  function printCrownIcon(){return `<svg class="p-leader-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/></svg>`;}

  function wireTeamInteractions(){
    const wrap=document.getElementById('teamsWrap');
    wrap.querySelectorAll('.slot').forEach(slot=>{
      const team=slot.dataset.team;const index=toInt(slot.dataset.slot,0,CONFIG.teamSize-1);const filled=slot.classList.contains('filled');
      if(filled){
        slot.addEventListener('dragstart',event=>{
          dragSourceSlot={team,slot:index};dragMemberName=state.assignments[team][index];slot.classList.add('dragging');event.dataTransfer.effectAllowed='copyMove';event.dataTransfer.setData('text/plain',dragMemberName||'');event.dataTransfer.setData('application/x-titania-slot',JSON.stringify({team,slot:index,name:dragMemberName||''}));
        });
        slot.addEventListener('dragend',()=>{slot.classList.remove('dragging');dragSourceSlot=null;dragMemberName=null;});
      }
      slot.addEventListener('dragover',event=>{if(dragTeamSource) return;event.preventDefault();slot.classList.add('dragover');});
      slot.addEventListener('dragleave',()=>slot.classList.remove('dragover'));
      slot.addEventListener('drop',event=>{
        if(dragTeamSource) return;
        event.preventDefault();event.stopPropagation();slot.classList.remove('dragover');
        if(dragSourceSlot) swapOrMoveSlots(dragSourceSlot,{team,slot:index});
        else if(dragMemberName) placeMember(dragMemberName,team,index);
      });
      slot.addEventListener('click',event=>{
        if(event.target.closest('.slot-remove')||selectedTeamSource) return;
        if(selectedMember){placeMember(selectedMember,team,index);return;}
        if(selectedSlot){swapOrMoveSlots(selectedSlot,{team,slot:index});return;}
        if(filled){selectedSlot={team,slot:index};selectedMember=null;selectedTeamSource=null;renderMemberList();renderTeams();}
      });
      slot.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();slot.click();}});
    });

    wrap.querySelectorAll('[data-remove-team]').forEach(button=>button.addEventListener('click',event=>{
      event.stopPropagation();removeFromSlot(button.dataset.removeTeam,toInt(button.dataset.removeSlot,0,CONFIG.teamSize-1));
    }));
    wrap.querySelectorAll('[data-raid-mode-toggle]').forEach(button=>button.addEventListener('click',async event=>{
      event.preventDefault();event.stopPropagation();
      const raidId=button.dataset.raidModeToggle;
      const siegeRaid=ALL_SIEGE_RAIDS.some(raid=>raid.id===raidId);
      if(SUB_RAIDS.some(raid=>raid.id===raidId)){
        if(!state.raidModes||typeof state.raidModes!=='object')state.raidModes=createDefaultRaidModes();
        const positions=['MID','TOP','BOTTOM'];
        const previous=positions.includes(state.raidModes[raidId])?state.raidModes[raidId]:'MID';
        state.raidModes[raidId]=positions[(positions.indexOf(previous)+1)%positions.length];
        commitMutation('Sub Battlefield position updated');
        return;
      }
      if(!MAIN_RAIDS.some(raid=>raid.id===raidId)&&!siegeRaid)return;
      if(!state.raidModes||typeof state.raidModes!=='object')state.raidModes=createDefaultRaidModes();
      const previous=state.raidModes[raidId]==='DEF'?'DEF':'ATK';
      const next=previous==='DEF'?'ATK':'DEF';
      state.raidModes[raidId]=next;
      if(siegeRaid){
        commitMutation('Siege raid objective updated');
        return;
      }
      renderAll();
      setSaveFlag('busy','Saving');quickSaveInFlight+=1;
      try{
        const result=await callServer('saveRaidModeSetting',raidId,next);
        state.raidModes[raidId]=stringValue(result&&result.mode).toUpperCase()==='DEF'?'DEF':'ATK';
        state.revision=toInt(result&&result.revision,state.revision,Number.MAX_SAFE_INTEGER);
        state.updatedAt=stringValue(result&&result.updatedAt);
        state.updatedBy=currentEditorName();
        touchEventUpdate('guild_league');
        renderEventLastUpdated();
        queueSave();
      }catch(error){
        state.raidModes[raidId]=previous;renderAll();setSaveFlag('err','Save failed');showToast('ATK/DEF save failed',errorMessage(error),'err');
      }finally{quickSaveInFlight=Math.max(0,quickSaveInFlight-1);}
    }));

        wrap.querySelectorAll('[data-raid-commander-drop]').forEach(drop=>{
      const raid=raidById(drop.dataset.raidCommanderDrop);
      if(!raid)return;
      const chooseFromSlot=source=>{
        if(!source||!raid.keys.includes(source.team)){
          drop.classList.add('invalid');setTimeout(()=>drop.classList.remove('invalid'),450);
          showToast('Wrong raid',`Choose a member from ${raid.label} only.`,'warn');
          return false;
        }
        const name=state.assignments[source.team]&&state.assignments[source.team][source.slot];
        if(!name)return false;
        const previous=stringValue(state.raidCommanders&&state.raidCommanders[raid.id]);
        state.raidCommanders[raid.id]=name;
        clearSelections(false);
        validateRaidCommanders();rebuildIndex();renderAll();
        if(raid.siege){
          commitMutation('Siege Raid Commander updated');
          showToast('Raid Commander updated',`${raid.label}: ${state.raidCommanders[raid.id]}`);
          return true;
        }
        setSaveFlag('busy','Saving');quickSaveInFlight+=1;
        callServer('saveRaidCommanderSetting',raid.id,name).then(result=>{
          state.raidCommanders[raid.id]=stringValue(result&&result.memberName)||name;
          state.revision=toInt(result&&result.revision,state.revision,Number.MAX_SAFE_INTEGER);
          state.updatedAt=stringValue(result&&result.updatedAt);
          state.updatedBy=currentEditorName();
          touchEventUpdate(raid.polarity?'polarity_zone':'guild_league');
          renderEventLastUpdated();
          queueSave();
          showToast('Raid Commander updated',`${raid.label}: ${state.raidCommanders[raid.id]}`);
        }).catch(error=>{
          state.raidCommanders[raid.id]=previous;validateRaidCommanders();rebuildIndex();renderAll();setSaveFlag('err','Save failed');showToast('Raid Commander save failed',errorMessage(error),'err');
        }).finally(()=>{quickSaveInFlight=Math.max(0,quickSaveInFlight-1);});
        return true;
      };
      const sourceFromDragEvent=event=>{
        if(dragSourceSlot)return dragSourceSlot;
        if(!event||!event.dataTransfer)return null;
        try{
          const raw=event.dataTransfer.getData('application/x-titania-slot');
          if(raw){
            const parsed=JSON.parse(raw);
            if(parsed&&parsed.team&&Number.isInteger(Number(parsed.slot)))return {team:String(parsed.team),slot:Number(parsed.slot)};
          }
        }catch(_error){}
        return null;
      };
      drop.addEventListener('dragover',event=>{
        const source=sourceFromDragEvent(event);
        if(!source)return;
        event.preventDefault();event.stopPropagation();
        const valid=raid.keys.includes(source.team);
        drop.classList.toggle('dragover',valid);
        drop.classList.toggle('invalid',!valid);
        if(event.dataTransfer)event.dataTransfer.dropEffect=valid?'copy':'none';
      });
      drop.addEventListener('dragleave',()=>{drop.classList.remove('dragover');drop.classList.remove('invalid');});
      drop.addEventListener('drop',event=>{
        if(dragTeamSource&&dragTeamSource.startsWith('siege_'))return;
        event.preventDefault();event.stopPropagation();drop.classList.remove('dragover');drop.classList.remove('invalid');
        const source=sourceFromDragEvent(event);
        chooseFromSlot(source);
      });
      drop.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        if(selectedSlot){chooseFromSlot(selectedSlot);return;}
        showToast('Choose Raid Commander',`Drag a member from ${raid.label} here, or select a member slot first.`);
      });
      drop.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();drop.click();}
      });
    });
    wrap.querySelectorAll('[data-raid-leader-drop]').forEach(drop=>{
      const raid=raidById(drop.dataset.raidLeaderDrop);
      if(!raid||raid.polarity)return;
      const chooseFromSlot=source=>{
        if(!source||!raid.keys.includes(source.team)){
          drop.classList.add('invalid');setTimeout(()=>drop.classList.remove('invalid'),450);
          showToast('Wrong raid',`Choose a member from ${raid.label} only.`,'warn');
          return false;
        }
        const name=state.assignments[source.team]&&state.assignments[source.team][source.slot];
        if(!name)return false;
        const previous=stringValue(state.raidLeaders&&state.raidLeaders[raid.id]);
        state.raidLeaders[raid.id]=name;
        clearSelections(false);
        validateRaidLeaders();rebuildIndex();renderAll();
        if(raid.siege){
          commitMutation('Siege Raid Leader updated');
          showToast('Raid Leader updated',`${raid.label}: ${state.raidLeaders[raid.id]}`);
          return true;
        }
        setSaveFlag('busy','Saving');quickSaveInFlight+=1;
        callServer('saveRaidLeaderSetting',raid.id,name).then(result=>{
          state.raidLeaders[raid.id]=stringValue(result&&result.memberName)||name;
          state.revision=toInt(result&&result.revision,state.revision,Number.MAX_SAFE_INTEGER);
          state.updatedAt=stringValue(result&&result.updatedAt);
          state.updatedBy=currentEditorName();
          touchEventUpdate('guild_league');
          renderEventLastUpdated();
          queueSave();
          showToast('Raid Leader updated',`${raid.label}: ${state.raidLeaders[raid.id]}`);
        }).catch(error=>{
          state.raidLeaders[raid.id]=previous;validateRaidLeaders();rebuildIndex();renderAll();setSaveFlag('err','Save failed');showToast('Raid Leader save failed',errorMessage(error),'err');
        }).finally(()=>{quickSaveInFlight=Math.max(0,quickSaveInFlight-1);});
        return true;
      };
      const sourceFromDragEvent=event=>{
        if(dragSourceSlot)return dragSourceSlot;
        if(!event||!event.dataTransfer)return null;
        try{
          const raw=event.dataTransfer.getData('application/x-titania-slot');
          if(raw){
            const parsed=JSON.parse(raw);
            if(parsed&&parsed.team&&Number.isInteger(Number(parsed.slot)))return {team:String(parsed.team),slot:Number(parsed.slot)};
          }
        }catch(_error){}
        return null;
      };
      drop.addEventListener('dragover',event=>{
        const source=sourceFromDragEvent(event);
        if(!source)return;
        event.preventDefault();event.stopPropagation();
        const valid=raid.keys.includes(source.team);
        drop.classList.toggle('dragover',valid);
        drop.classList.toggle('invalid',!valid);
        if(event.dataTransfer)event.dataTransfer.dropEffect=valid?'copy':'none';
      });
      drop.addEventListener('dragleave',()=>{drop.classList.remove('dragover');drop.classList.remove('invalid');});
      drop.addEventListener('drop',event=>{
        if(dragTeamSource&&dragTeamSource.startsWith('siege_'))return;
        event.preventDefault();event.stopPropagation();drop.classList.remove('dragover');drop.classList.remove('invalid');
        chooseFromSlot(sourceFromDragEvent(event));
      });
      drop.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        if(selectedSlot){chooseFromSlot(selectedSlot);return;}
        showToast('Choose Raid Leader',`Drag the member who created ${raid.label} here, or select a member slot first.`);
      });
      drop.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();drop.click();}
      });
    });
    wrap.querySelectorAll('[data-autofill-dungeon]').forEach(button=>button.addEventListener('click',()=>autoFillDungeon(toInt(button.dataset.autofillDungeon,1,CONFIG.dungeonCount))));
    wrap.querySelectorAll('[data-finish-dungeon]').forEach(button=>button.addEventListener('click',()=>toggleDungeonFinished(toInt(button.dataset.finishDungeon,1,CONFIG.dungeonCount))));

    wrap.querySelectorAll('.team-drag-handle').forEach(handle=>{
      const key=handle.dataset.teamDrag;
      handle.addEventListener('dragstart',event=>{event.stopPropagation();dragTeamSource=key;event.dataTransfer.effectAllowed=key.startsWith('elite_')?'copy':'move';event.dataTransfer.setData('text/plain','TEAM:'+key);const card=handle.closest('.team-card');if(card)card.classList.add('team-dragging');});
      handle.addEventListener('dragend',()=>{const card=handle.closest('.team-card');if(card)card.classList.remove('team-dragging');dragTeamSource=null;clearSiegeRaidDropStates();});
      handle.addEventListener('click',event=>{
        event.stopPropagation();
        if(key.startsWith('siege_')){showToast('Move Party','Drag the ⠿ handle into another Siege raid.');return;}
        selectedMember=null;selectedSlot=null;selectedTeamSource=selectedTeamSource===key?null:key;renderMemberList();renderTeams();
      });
    });

    if(currentEvent==='siege'){
      wrap.querySelectorAll('.main-raid-block[data-raid]').forEach(block=>{
        const targetRaidId=block.dataset.raid;
        block.addEventListener('dragover',event=>{
          if(!dragTeamSource||!dragTeamSource.startsWith('siege_'))return;
          const check=canMoveSiegeParty(dragTeamSource,targetRaidId);
          event.preventDefault();
          block.classList.toggle('siege-raid-dropover',check.ok);
          block.classList.toggle('siege-raid-dropinvalid',!check.ok&&check.reason!=='same');
          if(event.dataTransfer)event.dataTransfer.dropEffect=check.ok?'move':'none';
        });
        block.addEventListener('dragleave',event=>{
          if(event.relatedTarget&&block.contains(event.relatedTarget))return;
          block.classList.remove('siege-raid-dropover','siege-raid-dropinvalid');
        });
        block.addEventListener('drop',event=>{
          if(!dragTeamSource||!dragTeamSource.startsWith('siege_'))return;
          event.preventDefault();event.stopPropagation();
          const source=dragTeamSource;dragTeamSource=null;clearSiegeRaidDropStates();
          moveSiegePartyToRaid(source,targetRaidId);
        });
      });
    }

    wrap.querySelectorAll('.team-card.dungeon-bf').forEach(card=>{
      const target=card.dataset.teamKey;
      card.addEventListener('dragover',event=>{if(!dragTeamSource)return;event.preventDefault();card.classList.add('team-dropover');});
      card.addEventListener('dragleave',()=>card.classList.remove('team-dropover'));
      card.addEventListener('drop',event=>{if(!dragTeamSource)return;event.preventDefault();card.classList.remove('team-dropover');const source=dragTeamSource;dragTeamSource=null;placeTeam(source,target);});
      card.addEventListener('click',event=>{
        if(!selectedTeamSource||event.target.closest('.slot,.team-drag-handle,button')) return;
        placeTeam(selectedTeamSource,target);
      });
    });
  }

  function clearSiegeRaidDropStates(){
    document.querySelectorAll('.main-raid-block.siege-raid-dropover,.main-raid-block.siege-raid-dropinvalid').forEach(block=>block.classList.remove('siege-raid-dropover','siege-raid-dropinvalid'));
  }

  function canMoveSiegeParty(key,targetRaidId){
    const sourceRaid=raidForTeam(key);
    const targetRaid=raidById(targetRaidId);
    if(!sourceRaid||!targetRaid||!targetRaid.siege)return{ok:false,reason:'invalid'};
    if(sourceRaid.id===targetRaid.id)return{ok:false,reason:'same'};
    if(sourceRaid.keys.length<=1)return{ok:false,reason:'minimum'};
    if(targetRaid.keys.length>=5)return{ok:false,reason:'maximum'};
    return{ok:true,sourceRaid,targetRaid};
  }

  function moveSiegePartyToRaid(key,targetRaidId){
    if(currentEvent!=='siege'||!key.startsWith('siege_'))return;
    const check=canMoveSiegeParty(key,targetRaidId);
    if(!check.ok){
      if(check.reason==='minimum')showToast('Cannot move Party','A Siege raid must keep at least 1 Party.','warn');
      else if(check.reason==='maximum')showToast('Raid is full','A Siege raid can have a maximum of 5 Parties.','warn');
      return;
    }
    if(!state.siegeRaidGroups||typeof state.siegeRaidGroups!=='object')state.siegeRaidGroups=createDefaultSiegeRaidGroups();
    state.siegeRaidGroups[check.sourceRaid.id]=check.sourceRaid.keys.filter(teamKey=>teamKey!==key);
    state.siegeRaidGroups[check.targetRaid.id]=[...check.targetRaid.keys,key];
    clearSelections(false);
    commitMutation('Siege Party moved');
    showToast('Party moved',`${displayTeamLabel(key)} → ${check.targetRaid.label}`);
  }

  function placeMember(name,team,slot){
    if(!memberByName[name]||!isActiveMember(memberByName[name])||!TEAM_KEY_SET.has(team)) return;
    removeMemberFromKeys(name,scopeKeys(team));
    state.assignments[team][slot]=name;
    clearSelections(false);
    commitMutation('Member placed');
  }

  function removeFromSlot(team,slot){
    if(!TEAM_KEY_SET.has(team)) return;
    state.assignments[team][slot]=null;
    clearSelections(false);
    commitMutation('Member removed');
  }

  function swapOrMoveSlots(source,target){
    if(!source||!target||(source.team===target.team&&source.slot===target.slot)){clearSelections();return;}
    const sourceValue=state.assignments[source.team][source.slot];
    const targetValue=state.assignments[target.team][target.slot];
    if(scopeId(source.team)===scopeId(target.team)){
      state.assignments[source.team][source.slot]=targetValue;
      state.assignments[target.team][target.slot]=sourceValue;
    }else{
      state.assignments[source.team][source.slot]=null;
      state.assignments[target.team][target.slot]=null;
      if(sourceValue){removeMemberFromKeys(sourceValue,scopeKeys(target.team),target);state.assignments[target.team][target.slot]=sourceValue;}
      if(targetValue){removeMemberFromKeys(targetValue,scopeKeys(source.team),source);state.assignments[source.team][source.slot]=targetValue;}
    }
    clearSelections(false);
    commitMutation('Slots updated');
  }

  function removeMemberFromKeys(name,keys,except){
    keys.forEach(key=>state.assignments[key].forEach((value,index)=>{if(value===name&&(!except||except.team!==key||except.slot!==index))state.assignments[key][index]=null;}));
  }

  function placeTeam(source,target){
    if(!source||!target||source===target) return;
    if(!target.startsWith('dungeon')){showToast('Can’t place team','Whole teams can only be placed into a Normal Dungeon team.','warn');return;}
    if(state.assignments[target].some(Boolean)){showToast('Team slot occupied','Clear the destination team before placing another whole team.','warn');return;}
    const names=state.assignments[source].slice();
    if(!names.some(Boolean)){showToast('Nothing to move','The selected team has no members.','warn');return;}
    names.forEach(name=>{if(name)removeMemberFromKeys(name,DUNGEON_KEYS,{team:target,slot:-1});});
    state.assignments[target]=names.slice();
    const copied=source.startsWith('elite_');
    if(!copied) state.assignments[source]=new Array(CONFIG.teamSize).fill(null);
    clearSelections(false);
    commitMutation(copied?'Star team copied':'Normal Dungeon team moved');
    showToast(copied?'Team copied from Star':'Team moved',`${teamLongLabel(source)} → ${teamLongLabel(target)}.`);
  }

  function autoFillCurrent(){
    const keys=currentEvent==='polarity_zone'?ELITE_KEYS:currentTeamKeys();
    const used=assignedNamesSet(scopeKeys(keys[0]));
    const sorted=activeRoster().slice().sort((a,b)=>b.gr-a.gr||a.name.localeCompare(b.name));
    keys.forEach(key=>state.assignments[key].forEach((name,index)=>{
      if(name) return;
      const candidate=sorted.find(member=>!used.has(member.name));
      if(candidate){state.assignments[key][index]=candidate.name;used.add(candidate.name);}
    }));
    const eventName=currentEventPublicLabel();
    commitMutation(currentEvent==='polarity_zone'?'Star auto-filled':`${eventName} auto-filled`);
    showToast('Auto-fill complete',currentEvent==='polarity_zone'?'Star Dungeon remaining slots were filled by Gear Rating.':currentEvent==='siege'?`${eventName} remaining slots were filled by Gear Rating.`:`${eventName} Main and Sub remaining slots were filled by Gear Rating.`);
  }

  function autoFillDungeon(dungeon){
    const used=assignedNamesSet(DUNGEON_KEYS);
    const sorted=activeRoster().slice().sort((a,b)=>b.gr-a.gr||a.name.localeCompare(b.name));
    dungeonKeys(dungeon).forEach(key=>{
      const slots=state.assignments[key];
      let hasHealer=slots.some(name=>name&&memberByName[name]&&isHealer(memberByName[name].cls));
      for(let index=0;index<CONFIG.teamSize;index++){
        if(slots[index]) continue;
        let candidate=null;
        if(!hasHealer) candidate=sorted.find(member=>!used.has(member.name)&&isHealer(member.cls));
        if(!candidate) candidate=sorted.find(member=>!used.has(member.name));
        if(!candidate) break;
        slots[index]=candidate.name;used.add(candidate.name);if(isHealer(candidate.cls))hasHealer=true;
      }
    });
    commitMutation(`Dungeon ${dungeon} auto-filled`);
    showToast('Dungeon auto-filled',`Normal Dungeon ${dungeon}'s remaining slots were filled, prioritizing a healer per team.`);
  }

  function toggleDungeonFinished(dungeon){
    const set=new Set(state.finishedDungeons);
    if(set.has(dungeon)){set.delete(dungeon);showToast(`Dungeon ${dungeon} reopened`,'Its teams are no longer marked finished.');}
    else{set.add(dungeon);showToast(`Dungeon ${dungeon} marked finished`,'Its teams are visually blacked out.');}
    state.finishedDungeons=[...set].sort((a,b)=>a-b);
    commitMutation('Dungeon status changed');
  }

  async function clearCurrentEvent(){
    const label=currentEventPublicLabel();
    if(!userCanEdit()||!await confirmPlannerAction(`Clear every ${label} assignment?`,'The roster and the other events will remain unchanged.','Clear all',true)||!userCanEdit())return;
    currentTeamKeys().forEach(key=>{state.assignments[key]=new Array(CONFIG.teamSize).fill(null);});
    if(currentEvent==='polarity_zone') state.finishedDungeons=[];
    clearSelections(false);
    commitMutation(`${label} cleared`);
  }

  function clearSelections(shouldRender=true){
    selectedMember=null;selectedSlot=null;selectedTeamSource=null;dragMemberName=null;dragSourceSlot=null;dragTeamSource=null;
    if(shouldRender) renderAll();
  }

  function openMemberModal(name){
    editingMemberName=name;
    const member=name?memberByName[name]:null;
    document.getElementById('memberModalTitle').textContent=member?'Edit member':'Add member';
    document.getElementById('memberNameInput').value=member?member.name:'';
    populateClassOptions(document.getElementById('memberClassInput'),member?member.cls:'Hunter');
    document.getElementById('memberGrInput').value=member?member.gr:'';
    document.getElementById('memberNotesInput').value=member?member.notes||'':'';
    const notice=document.getElementById('memberStatusNotice');
    if(member&&member.status==='inactive'){
      notice.hidden=false;
      notice.textContent=`Inactive since ${formatDate(member.inactiveSince)||'date not recorded'}${member.inactiveReason?` · ${member.inactiveReason}`:''}. Reactivate this member from Dashboard.`;
    }else notice.hidden=true;
    document.getElementById('memberModal').hidden=false;
    setTimeout(()=>document.getElementById('memberNameInput').focus(),0);
  }

  function closeMemberModal(){document.getElementById('memberModal').hidden=true;document.getElementById('memberStatusNotice').hidden=true;editingMemberName=null;}

  function touchMember(member){
    if(!member)return;
    member.updatedAt=new Date().toISOString();
    member.updatedBy=stringValue(currentProfile&&currentProfile.display_name).trim()||stringValue(currentProfile&&currentProfile.email).trim()||'Unknown user';
  }

  function saveMemberFromModal(){
    const wasEditing=Boolean(editingMemberName);
    const name=document.getElementById('memberNameInput').value.trim();
    const cls=document.getElementById('memberClassInput').value;
    const gr=toInt(document.getElementById('memberGrInput').value,0,999999999);
    const notes=document.getElementById('memberNotesInput').value.trim().slice(0,500);
    if(!name){showToast('Name required','Enter a member name.','warn');return;}
    const duplicate=state.roster.find(member=>member.name.toLowerCase()===name.toLowerCase()&&member.name!==editingMemberName);
    if(duplicate){
      if(!wasEditing&&duplicate.status==='inactive'){
        if(!confirm(`${duplicate.name} already exists as an inactive member. Reactivate this record instead of creating a duplicate?`))return;
        duplicate.cls=CLASSES.includes(cls)?cls:'Unknown';duplicate.gr=gr;if(notes)duplicate.notes=notes;
        closeMemberModal();
        reactivateMemberRecord(duplicate,todayIso(),'Returned to Guild');
        return;
      }
      showToast('Duplicate member',`A member named ${duplicate.name} already exists.`,'warn');return;
    }
    if(editingMemberName){
      const member=memberByName[editingMemberName];if(!member)return;
      const oldName=member.name;member.name=name.slice(0,120);member.cls=CLASSES.includes(cls)?cls:'Unknown';member.gr=gr;member.notes=notes;touchMember(member);
      if(oldName!==member.name){
        ALL_KEYS.forEach(key=>state.assignments[key]=state.assignments[key].map(value=>value===oldName?member.name:value));
        ALL_RAIDS.forEach(raid=>{if(state.raidCommanders[raid.id]===oldName)state.raidCommanders[raid.id]=member.name;});
        ALL_GUILD_STYLE_RAIDS.forEach(raid=>{if(state.raidLeaders[raid.id]===oldName)state.raidLeaders[raid.id]=member.name;});
        if(dashboardSelected.delete(oldName))dashboardSelected.add(member.name);
        if(selectedMember===oldName)selectedMember=member.name;
      }
    }else{
      if(state.roster.length>=CONFIG.maxMembers){showToast('Roster full',`The roster limit is ${CONFIG.maxMembers} members.`,'err');return;}
      const member={id:makeId('member'),name:name.slice(0,120),cls:CLASSES.includes(cls)?cls:'Unknown',gr,status:'active',inactiveSince:'',lastReturned:'',inactiveReason:'',notes,updatedAt:'',updatedBy:''};touchMember(member);state.roster.push(member);
    }
    closeMemberModal();
    commitMutation(wasEditing?'Member updated':'Member added');
  }

  function deleteMember(name){
    const member=memberByName[name];
    if(!member)return;
    if(!confirm(`Permanently delete ${name}?\n\nThis clears the member from every team and removes their membership history. For a normal guild departure, use Mark Inactive instead.`)) return;
    ALL_KEYS.forEach(key=>state.assignments[key]=state.assignments[key].map(value=>value===name?null:value));
    const lowerName=member.name.toLowerCase();
    state.membershipHistory=state.membershipHistory.filter(entry=>entry.memberId!==member.id&&stringValue(entry.memberName).toLowerCase()!==lowerName);
    state.roster=state.roster.filter(item=>item.id!==member.id);
    dashboardSelected.delete(name);
    if(selectedMember===name)selectedMember=null;
    commitMutation('Member permanently deleted');
  }

  function openStatusModal(name,mode){
    const member=memberByName[name];
    if(!member)return;
    const requestedMode=mode==='reactivate'?'reactivate':'inactive';
    if(requestedMode==='reactivate'&&isActiveMember(member)){
      showToast('Member already active',`${member.name} is already available in the Member Pool.`,'warn');
      return;
    }
    if(requestedMode==='inactive'&&!isActiveMember(member)){
      showToast('Member already inactive',`${member.name} is already hidden from the active Member Pool.`,'warn');
      return;
    }
    statusModalMemberName=name;
    statusModalMode=requestedMode;
    const reactivating=statusModalMode==='reactivate';
    document.getElementById('statusModalTitle').textContent=reactivating?'Reactivate member':'Mark member inactive';
    document.getElementById('statusDateLabel').textContent=reactivating?'Return date':'Inactive since';
    document.getElementById('statusDateInput').value=todayIso();
    document.getElementById('statusMemberSummary').innerHTML=`<b>${escapeHtml(member.name)}</b><span>${escapeHtml(member.cls)} · ${formatNumber(member.gr)} GR · ${member.status==='inactive'?'Currently inactive':'Currently active'}</span>`;
    const reasons=reactivating?REACTIVATE_REASONS:INACTIVE_REASONS;
    const select=document.getElementById('statusReasonInput');
    select.innerHTML=reasons.map(reason=>`<option value="${escapeAttr(reason)}">${escapeHtml(reason)}</option>`).join('');
    select.value=reactivating?'Returned to Guild':'Left Guild';
    document.getElementById('statusOtherReasonInput').value='';
    syncStatusOtherReason();
    document.getElementById('statusImpactText').innerHTML=reactivating
      ?'<b>After reactivation:</b> this member returns to the active Member Pool as unassigned. Previous team positions are not restored automatically.'
      :'<b>After marking inactive:</b> this member is removed from every Guild League, Siege, and Polarity Zone team, hidden from the Member Pool, and excluded from Auto-fill.';
    const save=document.getElementById('statusModalSave');
    save.textContent=reactivating?'Reactivate Member':'Mark Inactive';
    save.classList.toggle('teal',reactivating);
    document.getElementById('statusModal').hidden=false;
  }

  function closeStatusModal(){
    document.getElementById('statusModal').hidden=true;
    statusModalMemberName=null;
    statusModalMode='inactive';
  }

  function syncStatusOtherReason(){
    const other=document.getElementById('statusReasonInput').value==='Other';
    document.getElementById('statusOtherReasonField').hidden=!other;
    if(other)setTimeout(()=>document.getElementById('statusOtherReasonInput').focus(),0);
  }

  function saveStatusModal(){
    const member=memberByName[statusModalMemberName];
    if(!member){closeStatusModal();return;}
    const date=normalizeDateValue(document.getElementById('statusDateInput').value);
    if(!date){showToast('Date required','Choose the effective date.','warn');return;}
    let reason=document.getElementById('statusReasonInput').value;
    if(reason==='Other')reason=document.getElementById('statusOtherReasonInput').value.trim();
    if(!reason){showToast('Reason required','Enter the reason for this status change.','warn');return;}
    const mode=statusModalMode;
    closeStatusModal();
    if(mode==='reactivate')reactivateMemberRecord(member,date,reason);
    else markMemberInactiveRecord(member,date,reason);
  }

  function markMemberInactiveRecord(member,date,reason){
    if(!member||member.status==='inactive')return;
    ALL_KEYS.forEach(key=>state.assignments[key]=state.assignments[key].map(value=>value===member.name?null:value));
    member.status='inactive';member.inactiveSince=date;member.inactiveReason=reason;touchMember(member);
    appendMembershipHistory(member,'inactive',date,reason);
    dashboardSelected.delete(member.name);
    if(selectedMember===member.name)selectedMember=null;
    clearSelections(false);
    commitMutation('Member marked inactive');
    showToast('Member marked inactive',`${member.name} was removed from all teams and hidden from the active Member Pool.`);
  }

  function reactivateMemberRecord(member,date,reason){
    if(!member||isActiveMember(member))return;
    member.status='active';member.lastReturned=date;member.inactiveSince='';member.inactiveReason='';touchMember(member);
    appendMembershipHistory(member,'reactivated',date,reason);
    clearSelections(false);
    commitMutation('Member reactivated');
    showToast('Member reactivated',`${member.name} is active and available in the Member Pool as unassigned.`);
  }

  function appendMembershipHistory(member,action,effectiveDate,reason){
    state.membershipHistory.push({id:makeId('history'),memberId:member.id,memberName:member.name,action,effectiveDate,reason:stringValue(reason).slice(0,300),changedAt:new Date().toISOString()});
    if(state.membershipHistory.length>CONFIG.maxHistory)state.membershipHistory=state.membershipHistory.slice(-CONFIG.maxHistory);
  }

  function populateClassOptions(select,selected){
    select.innerHTML=CLASSES.map(cls=>`<option value="${escapeAttr(cls)}">${escapeHtml(cls)}</option>`).join('');
    select.value=CLASSES.includes(selected)?selected:'Unknown';
  }

  function renderDashboard(){
    const wrap=document.getElementById('teamsWrap');
    const records=state.roster.length;
    if(!records){
      wrap.innerHTML=sectionHeader('📊 Guild Dashboard','', '0 member records')+`<div class="empty-note" style="padding:60px 10px">No member records yet.<br>Open the <b>Members</b> tab to add your guild roster.</div>`;
      return;
    }
    const active=activeRoster();
    const inactive=inactiveRoster();
    const total=active.length;
    const totalGR=active.reduce((sum,member)=>sum+member.gr,0);
    const avgGR=total?Math.round(totalGR/total):0;
    const healers=active.filter(member=>isHealer(member.cls)).length;
    const withGR=active.filter(member=>member.gr>0).slice().sort((a,b)=>b.gr-a.gr);
    const top=withGR[0]||null;const bottom=withGR.length?withGR[withGR.length-1]:null;
    const classMap={};active.forEach(member=>{if(!classMap[member.cls])classMap[member.cls]={cls:member.cls,count:0,total:0};classMap[member.cls].count++;classMap[member.cls].total+=member.gr;});
    const classRows=Object.values(classMap).map(row=>({...row,pct:total?row.count/total*100:0,avg:Math.round(row.total/row.count)})).sort((a,b)=>b.count-a.count||a.cls.localeCompare(b.cls));
    const maxClass=Math.max(1,...classRows.map(row=>row.count));
    const maxGR=Math.max(0,...active.map(member=>member.gr));
    const bucketSize=Math.max(500,Math.ceil(Math.max(1,maxGR)/4/500)*500);
    const buckets=Array.from({length:4},(_,i)=>({min:i*bucketSize,max:i===3?Infinity:(i+1)*bucketSize-1,count:0}));
    active.forEach(member=>{const index=Math.min(3,Math.floor(member.gr/bucketSize));buckets[index].count++;});
    const maxBucket=Math.max(1,...buckets.map(bucket=>bucket.count));
    const topFive=withGR.slice(0,5);
    const lowestFive=withGR.slice(-5).reverse();
    const analytics=total?`
      ${sectionHeader('Active Members by Class','',`${classRows.length} classes`)}
      <div class="dash-class-analytics-grid"><div class="dash-panel dash-class-bars card">${classRows.map(row=>dashBarRow(row.cls,row.count,row.pct,row.avg,maxClass,classColor(row.cls))).join('')}</div>${dashClassPieHtml(classRows,total)}</div>
      ${sectionHeader('Active Gear Rating Spread','','')}
      <div class="dash-gr-analytics-grid">${dashClassAverageGrChartHtml(classRows)}<div class="dash-panel dash-gr-spread-panel card">${buckets.map((bucket,index)=>{const label=index===3?`${formatNumber(bucket.min)}+`:`${formatNumber(bucket.min)}–${formatNumber(bucket.max)}`;return `<div class="dash-bar-row"><span class="dash-bar-name">${label}</span><div class="dash-bar-track"><div class="dash-bar-fill" style="width:${bucket.count/maxBucket*100}%;background:var(--teal)"></div></div><span class="dash-bar-count">${bucket.count}</span><span class="dash-bar-pct">${Math.round(bucket.count/total*100)}%</span></div>`;}).join('')}</div></div>
      ${topFive.length?`<div class="dash-gr-rank-grid"><div class="dash-gr-rank-col">${sectionHeader('Top 5 Active Members by Gear Rating','','')}<div class="dash-panel card">${topFive.map((member,index)=>`<div class="dash-bar-row"><span class="dash-rank">#${index+1}</span><span class="class-dot" style="background:${classColor(member.cls)};color:${classColor(member.cls)}"></span><span class="dash-bar-name" style="flex:1">${escapeHtml(member.name)}</span><span class="dash-bar-avg">${escapeHtml(member.cls)}</span><span class="dash-bar-count" style="width:80px">${formatNumber(member.gr)}</span></div>`).join('')}</div></div><div class="dash-gr-rank-col">${sectionHeader('Lowest 5 Active Members by Gear Rating','','')}<div class="dash-panel card">${lowestFive.map((member,index)=>`<div class="dash-bar-row"><span class="dash-rank">#${index+1}</span><span class="class-dot" style="background:${classColor(member.cls)};color:${classColor(member.cls)}"></span><span class="dash-bar-name" style="flex:1">${escapeHtml(member.name)}</span><span class="dash-bar-avg">${escapeHtml(member.cls)}</span><span class="dash-bar-count" style="width:80px">${formatNumber(member.gr)}</span></div>`).join('')}</div></div></div>`:''}`:`<div class="empty-note" style="padding:30px 10px">There are no active members. Open the Members tab to reactivate members.</div>`;
    wrap.innerHTML=`
      ${sectionHeader('📊 Guild Dashboard','',`${active.length} active · ${inactive.length} inactive · ${records} records`)}
      <div class="dash-grid">
        ${dashCard('Active Members',formatNumber(active.length),'Available for team assignment',true)}${dashCard('Inactive Members',formatNumber(inactive.length),'Hidden from Member Pool')}${dashCard('All Member Records',formatNumber(records))}${dashCard('Active Total GR',formatNumber(totalGR))}${dashCard('Active Average GR',formatNumber(avgGR))}${dashCard('Active Healers',`${healers}<span class="dash-card-sub"> / ${total}</span>`)}
        ${top?dashCard('Highest Active GR',escapeHtml(top.name),`${formatNumber(top.gr)} · ${escapeHtml(top.cls)}`,true):''}${bottom?dashCard('Lowest Active GR',escapeHtml(bottom.name),`${formatNumber(bottom.gr)} · ${escapeHtml(bottom.cls)}`):''}
      </div>
      ${analytics}`;
    wireDashboardClassPie();
    wireDashboardClassAverageGrChart();
  }

  function renderManageMembersTab(){
    const wrap=document.getElementById('teamsWrap');
    wrap.innerHTML=renderManageMembersHtml()+renderMembershipHistoryHtml();
    wireDashboard();
  }

  function dashCard(label,value,sub='',highlight=false){return `<div class="dash-card ${highlight?'highlight':''} card"><div class="dash-card-label">${label}</div><div class="dash-card-value">${value}</div>${sub?`<div class="dash-card-sub">${sub}</div>`:''}</div>`;}
  function dashboardPiePoint(cx,cy,radius,angle){
    const radians=(angle-90)*Math.PI/180;
    return{x:cx+(radius*Math.cos(radians)),y:cy+(radius*Math.sin(radians))};
  }

  function dashboardPieSlicePath(startAngle,endAngle){
    const start=dashboardPiePoint(110,110,92,endAngle);
    const end=dashboardPiePoint(110,110,92,startAngle);
    const largeArc=endAngle-startAngle>180?1:0;
    return`M 110 110 L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A 92 92 0 ${largeArc} 0 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
  }

  function dashClassPieHtml(rows,total){
    if(!rows.length||!total)return'';
    let angle=0;
    const slices=rows.map((row,index)=>{
      const start=angle;
      const end=index===rows.length-1?360:angle+(row.count/total*360);
      angle=end;
      const color=classColor(row.cls);
      const pct=row.count/total*100;
      if(rows.length===1)return`<circle class="dash-class-pie-slice" cx="110" cy="110" r="92" fill="${escapeAttr(color)}" data-class="${escapeAttr(row.cls)}" data-count="${row.count}" data-pct="${pct.toFixed(1)}"><title>${escapeHtml(row.cls)} · ${pct.toFixed(1)}% · ${row.count} member${row.count===1?'':'s'}</title></circle>`;
      return`<path class="dash-class-pie-slice" d="${dashboardPieSlicePath(start,end)}" fill="${escapeAttr(color)}" data-class="${escapeAttr(row.cls)}" data-count="${row.count}" data-pct="${pct.toFixed(1)}"><title>${escapeHtml(row.cls)} · ${pct.toFixed(1)}% · ${row.count} member${row.count===1?'':'s'}</title></path>`;
    }).join('');
    return`<div class="dash-panel dash-class-pie-panel card"><div class="dash-class-pie-title">Class Distribution</div><div class="dash-class-pie-wrap"><svg class="dash-class-pie" viewBox="0 0 220 220" role="img" aria-label="Active members class distribution pie chart">${slices}</svg><div class="dash-class-pie-tooltip" id="dashClassPieTooltip"></div></div><div class="dash-class-pie-note">Hover a slice for class %</div></div>`;
  }

  function wireDashboardClassPie(){
    const pie=document.querySelector('.dash-class-pie');
    const wrap=document.querySelector('.dash-class-pie-wrap');
    const tooltip=document.getElementById('dashClassPieTooltip');
    if(!pie||!wrap||!tooltip)return;
    const hide=()=>{
      pie.classList.remove('has-hover');
      pie.querySelectorAll('.dash-class-pie-slice.is-hovered').forEach(slice=>slice.classList.remove('is-hovered'));
      tooltip.classList.remove('show');
    };
    pie.querySelectorAll('.dash-class-pie-slice').forEach(slice=>{
      const show=event=>{
        pie.classList.add('has-hover');
        pie.querySelectorAll('.dash-class-pie-slice.is-hovered').forEach(other=>{if(other!==slice)other.classList.remove('is-hovered');});
        slice.classList.add('is-hovered');
        const cls=slice.dataset.class||'Unknown';
        const count=Number(slice.dataset.count||0);
        const pct=Number(slice.dataset.pct||0);
        tooltip.innerHTML=`<b>${escapeHtml(cls)}</b><span>${pct.toFixed(1)}% · ${count} member${count===1?'':'s'}</span>`;
        tooltip.classList.add('show');
        move(event);
      };
      const move=event=>{
        const rect=wrap.getBoundingClientRect();
        let x=event.clientX-rect.left;
        let y=event.clientY-rect.top;
        const tipWidth=tooltip.offsetWidth||150;
        const tipHeight=tooltip.offsetHeight||50;
        if(x+tipWidth+20>rect.width)x=Math.max(0,x-tipWidth-20);
        if(y-tipHeight/2<0)y=tipHeight/2;
        if(y+tipHeight/2>rect.height)y=rect.height-tipHeight/2;
        tooltip.style.left=`${x}px`;
        tooltip.style.top=`${y}px`;
      };
      slice.addEventListener('mouseenter',show);
      slice.addEventListener('mousemove',move);
      slice.addEventListener('mouseleave',hide);
      slice.addEventListener('focus',event=>{
        const rect=slice.getBoundingClientRect();
        show({clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2});
      });
      slice.addEventListener('blur',hide);
      slice.setAttribute('tabindex','0');
    });
  }

  function dashBarRow(label,count,pct,avg,max,color){return `<div class="dash-bar-row"><span class="class-dot" style="background:${color};color:${color}"></span><span class="dash-bar-name">${escapeHtml(label)}</span><div class="dash-bar-track"><div class="dash-bar-fill" style="width:${count/max*100}%;background:${color}"></div></div><span class="dash-bar-count">${count}</span><span class="dash-bar-pct">${pct.toFixed(0)}%</span><span class="dash-bar-avg">avg ${formatNumber(avg)}</span></div>`;}

  function dashboardClassShortLabel(cls){
    const words=stringValue(cls).trim().split(/\s+/).filter(Boolean);
    if(!words.length)return'?';
    if(words.length===1)return words[0].slice(0,3).toUpperCase();
    return words.map(word=>word.charAt(0)).join('').slice(0,3).toUpperCase();
  }

  function dashClassAverageGrChartHtml(rows){
    if(!rows.length)return'';
    const maxAvg=Math.max(1,...rows.map(row=>row.avg||0));
    const items=rows.map(row=>{
      const avg=Number(row.avg||0);
      const height=Math.max(avg>0?8:0,avg/maxAvg*100);
      const color=classColor(row.cls);
      const short=dashboardClassShortLabel(row.cls);
      return`<div class="dash-gr-class-bar-item" tabindex="0" data-class="${escapeAttr(row.cls)}" data-avg="${avg}" data-count="${row.count}" aria-label="${escapeAttr(row.cls)} average Gear Rating ${formatNumber(avg)}, ${row.count} members"><div class="dash-gr-class-bar-track"><div class="dash-gr-class-bar" style="height:${height.toFixed(2)}%;background:${escapeAttr(color)}"></div></div><span class="dash-gr-class-bar-label">${escapeHtml(short)}</span></div>`;
    }).join('');
    return`<div class="dash-panel dash-gr-class-chart-panel card"><div class="dash-gr-class-chart-title">Average GR by Class</div><div class="dash-gr-class-chart-wrap"><div class="dash-gr-class-chart">${items}</div><div class="dash-gr-class-chart-tooltip" id="dashGrClassTooltip"></div></div><div class="dash-gr-class-chart-note">Hover a bar for class details</div></div>`;
  }

  function wireDashboardClassAverageGrChart(){
    const wrap=document.querySelector('.dash-gr-class-chart-wrap');
    const tooltip=document.getElementById('dashGrClassTooltip');
    if(!wrap||!tooltip)return;
    const hide=()=>tooltip.classList.remove('show');
    const move=(event,item)=>{
      const wrapRect=wrap.getBoundingClientRect();
      const itemRect=item.getBoundingClientRect();
      const tipWidth=tooltip.offsetWidth||170;
      const tipHeight=tooltip.offsetHeight||62;
      let x=itemRect.left-wrapRect.left+itemRect.width/2;
      let y=itemRect.top-wrapRect.top+4;
      x=Math.max(tipWidth/2+4,Math.min(wrapRect.width-tipWidth/2-4,x));
      y=Math.max(tipHeight+8,y);
      tooltip.style.left=`${x}px`;
      tooltip.style.top=`${y}px`;
    };
    wrap.querySelectorAll('.dash-gr-class-bar-item').forEach(item=>{
      const show=event=>{
        const cls=item.dataset.class||'Unknown';
        const avg=Number(item.dataset.avg||0);
        const count=Number(item.dataset.count||0);
        tooltip.innerHTML=`<b>${escapeHtml(cls)}</b><span>Average GR: ${formatNumber(avg)}</span><span>${count} member${count===1?'':'s'}</span>`;
        tooltip.classList.add('show');
        move(event,item);
      };
      item.addEventListener('mouseenter',show);
      item.addEventListener('mousemove',event=>move(event,item));
      item.addEventListener('mouseleave',hide);
      item.addEventListener('focus',show);
      item.addEventListener('blur',hide);
    });
  }

  function renderMembershipHistoryHtml(){
    const rows=state.membershipHistory.slice().sort((a,b)=>stringValue(b.changedAt).localeCompare(stringValue(a.changedAt))).slice(0,12);
    if(!rows.length)return '';
    return `<section class="card mt-4"><div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2"><h5 class="card-title mb-0">Membership History</h5><span class="text-muted small">${state.membershipHistory.length} status events · latest 12 shown</span></div><div class="table-responsive"><table class="table table-centered table-hover align-middle mb-0"><thead><tr><th>Player</th><th>Status change</th><th>Date</th><th>Reason</th></tr></thead><tbody>${rows.map(entry=>{const current=memberById[entry.memberId];const displayName=current?current.name:entry.memberName;return `<tr><td class="fw-semibold">${escapeHtml(displayName)}</td><td><span class="badge bg-${entry.action==='reactivated'?'success':'danger'}-subtle text-${entry.action==='reactivated'?'success':'danger'}">${entry.action==='reactivated'?'Reactivated':'Marked Inactive'}</span></td><td class="text-nowrap">${escapeHtml(formatDate(entry.effectiveDate)||'No date')}</td><td>${escapeHtml(entry.reason||'No reason recorded')}</td></tr>`;}).join('')}</tbody></table></div></section>`;
  }

  function dashboardAvailableClasses(){
    const counts=new Map();
    state.roster.forEach(member=>{
      if(dashboardGuildStatusFilter==='Active'&&member.status==='inactive')return;
      if(dashboardGuildStatusFilter==='Inactive'&&member.status!=='inactive')return;
      const cls=stringValue(member.cls)||'Unknown';
      counts.set(cls,(counts.get(cls)||0)+1);
    });
    return [...counts.entries()]
      .filter(([,count])=>count>0)
      .sort((a,b)=>a[0].localeCompare(b[0],undefined,{sensitivity:'base'}));
  }

  function dashboardVisibleMembers(){
    const term=dashboardSearch.trim().toLowerCase();
    return state.roster.filter(member=>{
      if(dashboardGuildStatusFilter==='Active'&&member.status==='inactive')return false;
      if(dashboardGuildStatusFilter==='Inactive'&&member.status!=='inactive')return false;
      if(dashboardClassFilter!=='All'&&member.cls!==dashboardClassFilter)return false;
      return !term||member.name.toLowerCase().includes(term);
    }).slice().sort(compareDashboardMembers);
  }

  function compareDashboardMembers(a,b){
    if(dashboardSortBy==='updated'){
      const aTime=a.updatedAt?Date.parse(a.updatedAt):0;
      const bTime=b.updatedAt?Date.parse(b.updatedAt):0;
      const aValid=Number.isFinite(aTime)&&aTime>0;
      const bValid=Number.isFinite(bTime)&&bTime>0;
      if(aValid!==bValid)return aValid?-1:1;
      if(aValid&&bValid&&aTime!==bTime)return dashboardSortDir==='asc'?aTime-bTime:bTime-aTime;
      return a.name.localeCompare(b.name,undefined,{sensitivity:'base'});
    }
    if(dashboardSortBy==='gear'){
      const aGear=Number(a.gr)||0;
      const bGear=Number(b.gr)||0;
      if(aGear!==bGear)return dashboardSortDir==='asc'?aGear-bGear:bGear-aGear;
      return a.name.localeCompare(b.name,undefined,{sensitivity:'base'});
    }
    const result=a.name.localeCompare(b.name,undefined,{sensitivity:'base'});
    return dashboardSortDir==='desc'?-result:result;
  }

  function renderManageMembersHtml(){
    const rows=dashboardVisibleMembers();
    const valid=new Set(state.roster.map(member=>member.name));[...dashboardSelected].forEach(name=>{if(!valid.has(name))dashboardSelected.delete(name);});
    const selectedCount=dashboardSelected.size;const allVisible=rows.length&&rows.every(member=>dashboardSelected.has(member.name));
    const activeCount=activeRoster().length;const inactiveCount=state.roster.length-activeCount;
    return `${sectionHeader('🛠 Manage Members','',`${rows.length} shown · ${activeCount} active · ${inactiveCount} inactive`)}
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3"><input class="edit-input form-control" id="dashSearch" placeholder="Search members…" value="${escapeAttr(dashboardSearch)}" style="width:210px"><div class="d-flex flex-wrap align-items-center">${['Active','Inactive','All'].map(status=>`<button class="pill ${dashboardGuildStatusFilter===status?'active':''} btn btn-outline-primary btn-sm m-2" data-dashboard-status="${status}">${status}</button>`).join('')}</div><div class="d-flex flex-wrap align-items-center gap-2"><span class="dash-manage-sort-label">Sort</span><button class="pill ${dashboardSortBy==='name'?'active':''} btn btn-outline-primary btn-sm" data-dashboard-sort="name">Name${dashboardSortBy==='name'?(dashboardSortDir==='asc'?' ↑':' ↓'):''}</button><button class="pill ${dashboardSortBy==='gear'?'active':''} btn btn-outline-primary btn-sm" data-dashboard-sort="gear">Gear Rating${dashboardSortBy==='gear'?(dashboardSortDir==='asc'?' ↑':' ↓'):''}</button><button class="pill ${dashboardSortBy==='updated'?'active':''} btn btn-outline-primary btn-sm" data-dashboard-sort="updated">Last Update${dashboardSortBy==='updated'?(dashboardSortDir==='asc'?' ↑':' ↓'):''}</button><select class="form-select w-auto" id="dashClassFilter" title="Filter members by class"><option value="All" ${dashboardClassFilter==='All'?'selected':''}>All Classes</option>${dashboardAvailableClasses().map(([cls,count])=>`<option value="${escapeAttr(cls)}" ${dashboardClassFilter===cls?'selected':''}>${escapeHtml(cls)} (${count})</option>`).join('')}</select></div><label class="d-flex align-items-center gap-2 ms-lg-auto"><input type="checkbox" id="dashSelectAll" ${allVisible?'checked':''} class="form-check-input"> Select all shown</label><span class="text-muted small">${selectedCount} selected</span><button class="btn primary small btn-primary btn-sm" id="dashAddMember">+ Add member</button></div>
      ${selectedCount?`<div class="dash-bulk-bar"><span class="dash-bulk-label">Class</span><select class="edit-input form-select" id="dashBulkClass">${CLASSES.map(cls=>`<option value="${escapeAttr(cls)}">${escapeHtml(cls)}</option>`).join('')}</select><button class="btn small btn-outline-secondary btn-sm" id="dashBulkClassBtn">Apply to ${selectedCount}</button><span class="dash-bulk-label">Set GR</span><input type="number" class="edit-input form-control" id="dashBulkSet" min="0" placeholder="25000"><button class="btn small btn-outline-secondary btn-sm" id="dashBulkSetBtn">Set for ${selectedCount}</button><span class="dash-bulk-label">Adjust GR</span><input type="number" class="edit-input form-control" id="dashBulkAdjust" placeholder="500 or -500"><button class="btn small btn-outline-secondary btn-sm" id="dashBulkAdjustBtn">Adjust ${selectedCount}</button><button class="btn small danger btn-outline-danger btn-sm" id="dashBulkDeleteBtn">Permanently delete ${selectedCount}</button></div>`:''}
      <div class="card"><div class="table-responsive" id="dashManageTable"><table class="table table-centered table-hover align-middle mb-0"><thead><tr><th aria-label="Select"></th><th>Player</th><th>Status</th><th>Class</th><th>Gear Rating</th><th>Last Updated</th><th class="text-end">Actions</th></tr></thead><tbody>${rows.length?rows.map(member=>{
        const inactive=member.status==='inactive';
        const detail=inactive?`Since ${formatDate(member.inactiveSince)||'date not recorded'}${member.inactiveReason?` · ${member.inactiveReason}`:''}`:(member.lastReturned?`Returned ${formatDate(member.lastReturned)}`:'Available for teams');
        const updateValue=member.updatedAt?formatMemberUpdate(member.updatedAt):'No edit recorded';
        return `<tr class="dash-manage-row ${dashboardSelected.has(member.name)?'table-active':''}"><td><input type="checkbox" class="form-check-input dash-row-check" aria-label="Select ${escapeAttr(member.name)}" data-name="${escapeAttr(member.name)}" ${dashboardSelected.has(member.name)?'checked':''}></td><td><div class="d-flex align-items-center gap-2"><span class="class-dot" style="background:${classColor(member.cls)};color:${classColor(member.cls)}"></span><span class="dash-manage-name fw-semibold" title="${escapeAttr(member.name)}">${escapeHtml(member.name)}</span></div></td><td><span class="badge bg-${inactive?'danger':'success'}-subtle text-${inactive?'danger':'success'}">${inactive?'Inactive':'Active'}</span><div class="text-muted small mt-1">${escapeHtml(detail)}</div></td><td><select class="form-select form-select-sm dash-row-class" aria-label="Class for ${escapeAttr(member.name)}" data-name="${escapeAttr(member.name)}">${CLASSES.map(cls=>`<option value="${escapeAttr(cls)}" ${cls===member.cls?'selected':''}>${escapeHtml(cls)}</option>`).join('')}</select></td><td><input type="number" class="form-control form-control-sm dash-row-gr" aria-label="Gear rating for ${escapeAttr(member.name)}" data-name="${escapeAttr(member.name)}" value="${member.gr}" min="0"></td><td class="text-nowrap"><div>${escapeHtml(updateValue)}</div>${member.updatedBy?`<div class="text-muted small">${escapeHtml(member.updatedBy)}</div>`:''}</td><td><div class="d-flex justify-content-end align-items-center gap-2"><button class="btn btn-soft-secondary btn-sm dash-row-edit" data-name="${escapeAttr(member.name)}" title="Edit member details" aria-label="Edit ${escapeAttr(member.name)}"><i class="bx bx-pencil"></i></button>${inactive?`<button class="btn btn-soft-success btn-sm text-nowrap" data-reactivate-member="${escapeAttr(member.name)}">Reactivate</button>`:`<button class="btn btn-soft-warning btn-sm text-nowrap" data-inactivate-member="${escapeAttr(member.name)}">Mark Inactive</button>`}<button class="btn btn-soft-danger btn-sm dash-row-del" data-name="${escapeAttr(member.name)}" title="Permanently delete member" aria-label="Delete ${escapeAttr(member.name)}"><i class="bx bx-trash"></i></button></div></td></tr>`;
      }).join(''):'<tr><td colspan="7" class="text-center text-muted py-4">No members match this search and status filter.</td></tr>'}</tbody></table></div></div>`;
  }

  function rerenderManageMembers(){
    if(currentEvent==='manage_members') renderManageMembersTab();
    else renderDashboard();
  }

  function wireDashboard(){
    const root=document.getElementById('teamsWrap');
    const search=root.querySelector('#dashSearch');
    if(search) search.addEventListener('input',()=>{dashboardSearch=search.value;rerenderManageMembers();const next=document.getElementById('dashSearch');if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);}});
    root.querySelectorAll('[data-dashboard-status]').forEach(button=>button.addEventListener('click',()=>{dashboardGuildStatusFilter=button.dataset.dashboardStatus;const available=new Set(dashboardAvailableClasses().map(([cls])=>cls));if(dashboardClassFilter!=='All'&&!available.has(dashboardClassFilter))dashboardClassFilter='All';dashboardSelected.clear();rerenderManageMembers();}));
    root.querySelectorAll('[data-dashboard-sort]').forEach(button=>button.addEventListener('click',()=>{
      const key=button.dataset.dashboardSort;
      if(dashboardSortBy===key)dashboardSortDir=dashboardSortDir==='asc'?'desc':'asc';
      else{dashboardSortBy=key;dashboardSortDir=(key==='updated'||key==='gear')?'desc':'asc';}
      rerenderManageMembers();
    }));
    const classFilter=root.querySelector('#dashClassFilter');if(classFilter)classFilter.addEventListener('change',()=>{dashboardClassFilter=classFilter.value;dashboardSelected.clear();rerenderManageMembers();});
    const selectAll=root.querySelector('#dashSelectAll');
    if(selectAll) selectAll.addEventListener('change',()=>{dashboardVisibleMembers().forEach(member=>selectAll.checked?dashboardSelected.add(member.name):dashboardSelected.delete(member.name));rerenderManageMembers();});
    const add=root.querySelector('#dashAddMember');if(add)add.addEventListener('click',()=>openMemberModal(null));
    root.querySelectorAll('.dash-row-check').forEach(box=>box.addEventListener('change',()=>{box.checked?dashboardSelected.add(box.dataset.name):dashboardSelected.delete(box.dataset.name);rerenderManageMembers();}));
    root.querySelectorAll('.dash-row-edit').forEach(button=>button.addEventListener('click',()=>openMemberModal(button.dataset.name)));
    root.querySelectorAll('[data-inactivate-member]').forEach(button=>button.addEventListener('click',()=>openStatusModal(button.dataset.inactivateMember,'inactive')));
    root.querySelectorAll('[data-reactivate-member]').forEach(button=>button.addEventListener('click',()=>openStatusModal(button.dataset.reactivateMember,'reactivate')));
    root.querySelectorAll('.dash-row-class').forEach(select=>select.addEventListener('change',()=>{const member=memberByName[select.dataset.name];if(member){member.cls=select.value;touchMember(member);commitMutation('Member class updated');}}));
    root.querySelectorAll('.dash-row-gr').forEach(input=>input.addEventListener('change',()=>{const member=memberByName[input.dataset.name];if(member){member.gr=toInt(input.value,0,999999999);touchMember(member);commitMutation('Member Gear Rating updated');}}));
    root.querySelectorAll('.dash-row-del').forEach(button=>button.addEventListener('click',()=>deleteMember(button.dataset.name)));
    const classButton=root.querySelector('#dashBulkClassBtn');if(classButton)classButton.addEventListener('click',()=>{const cls=document.getElementById('dashBulkClass').value;state.roster.forEach(member=>{if(dashboardSelected.has(member.name)){member.cls=cls;touchMember(member);}});commitMutation('Bulk class update complete');});
    const setButton=root.querySelector('#dashBulkSetBtn');if(setButton)setButton.addEventListener('click',()=>{const value=toInt(document.getElementById('dashBulkSet').value,0,999999999);state.roster.forEach(member=>{if(dashboardSelected.has(member.name)){member.gr=value;touchMember(member);}});commitMutation('Bulk Gear Rating set');});
    const adjustButton=root.querySelector('#dashBulkAdjustBtn');if(adjustButton)adjustButton.addEventListener('click',()=>{const delta=Number.parseInt(document.getElementById('dashBulkAdjust').value,10)||0;state.roster.forEach(member=>{if(dashboardSelected.has(member.name)){member.gr=Math.max(0,Math.min(999999999,member.gr+delta));touchMember(member);}});commitMutation('Bulk Gear Rating adjusted');});
    const deleteButton=root.querySelector('#dashBulkDeleteBtn');if(deleteButton)deleteButton.addEventListener('click',()=>{
      if(!confirm(`Permanently delete ${dashboardSelected.size} selected members?

Their team assignments and membership history will also be removed. Use Mark Inactive for normal guild departures.`))return;
      const names=new Set(dashboardSelected);const lowerNames=new Set([...names].map(name=>name.toLowerCase()));const ids=new Set(state.roster.filter(member=>names.has(member.name)).map(member=>member.id));ALL_KEYS.forEach(key=>state.assignments[key]=state.assignments[key].map(value=>names.has(value)?null:value));state.membershipHistory=state.membershipHistory.filter(entry=>!ids.has(entry.memberId)&&!lowerNames.has(stringValue(entry.memberName).toLowerCase()));state.roster=state.roster.filter(member=>!names.has(member.name));dashboardSelected.clear();commitMutation('Selected members permanently deleted');
    });
  }



  function cloneJson(value){
    return JSON.parse(JSON.stringify(value));
  }

  function sameJson(a,b){
    return JSON.stringify(a===undefined?null:a)===JSON.stringify(b===undefined?null:b);
  }

  function plannerSnapshot(source=state){
    const value=source&&typeof source==='object'?source:{};
    return cloneJson({
      roster:Array.isArray(value.roster)?value.roster:[],
      assignments:value.assignments&&typeof value.assignments==='object'?value.assignments:createEmptyAssignments(),
      finishedDungeons:Array.isArray(value.finishedDungeons)?value.finishedDungeons:[],
      raidCommanders:value.raidCommanders&&typeof value.raidCommanders==='object'?value.raidCommanders:createDefaultRaidCommanders(),
      raidLeaders:value.raidLeaders&&typeof value.raidLeaders==='object'?value.raidLeaders:createDefaultRaidLeaders(),
      raidModes:value.raidModes&&typeof value.raidModes==='object'?value.raidModes:createDefaultRaidModes(),
      siegeRaidGroups:value.siegeRaidGroups&&typeof value.siegeRaidGroups==='object'?value.siegeRaidGroups:createDefaultSiegeRaidGroups(),
      membershipHistory:Array.isArray(value.membershipHistory)?value.membershipHistory:[],
      publicVisibility:value.publicVisibility&&typeof value.publicVisibility==='object'?value.publicVisibility:{guildLeague:false,siege:false,polarityZone:false},
      eventUpdates:value.eventUpdates&&typeof value.eventUpdates==='object'?value.eventUpdates:{guildLeague:{updatedAt:'',updatedBy:''},siege:{updatedAt:'',updatedBy:''},polarityZone:{updatedAt:'',updatedBy:''}}
    });
  }

  function mergeRosterThreeWay(baseRoster,localRoster,remoteRoster){
    const baseById=new Map((baseRoster||[]).map(member=>[stringValue(member&&member.id),member]));
    const localById=new Map((localRoster||[]).map(member=>[stringValue(member&&member.id),member]));
    const remoteById=new Map((remoteRoster||[]).map(member=>[stringValue(member&&member.id),cloneJson(member)]));
    const deletedLocally=new Set();
    baseById.forEach((_base,id)=>{if(id&&!localById.has(id))deletedLocally.add(id);});
    deletedLocally.forEach(id=>remoteById.delete(id));
    const fields=['name','cls','gr','status','inactiveSince','lastReturned','inactiveReason','notes','updatedAt','updatedBy'];
    baseById.forEach((baseMember,id)=>{
      if(!id)return;
      const localMember=localById.get(id);
      const remoteMember=remoteById.get(id);
      if(!localMember||!remoteMember)return;
      const merged={...remoteMember,id};
      fields.forEach(field=>{if(!sameJson(localMember[field],baseMember[field]))merged[field]=cloneJson(localMember[field]);});
      remoteById.set(id,merged);
    });
    localById.forEach((localMember,id)=>{
      if(!id||baseById.has(id))return;
      remoteById.set(id,cloneJson(localMember));
    });
    const ordered=[];
    const used=new Set();
    (remoteRoster||[]).forEach(member=>{
      const id=stringValue(member&&member.id);
      if(id&&remoteById.has(id)&&!used.has(id)){ordered.push(remoteById.get(id));used.add(id);}
    });
    (localRoster||[]).forEach(member=>{
      const id=stringValue(member&&member.id);
      if(id&&remoteById.has(id)&&!used.has(id)){ordered.push(remoteById.get(id));used.add(id);}
    });
    return ordered.slice(0,CONFIG.maxMembers);
  }

  function mergeHistoryThreeWay(baseHistory,localHistory,remoteHistory){
    const baseById=new Map((baseHistory||[]).map(item=>[stringValue(item&&item.id),item]));
    const localById=new Map((localHistory||[]).map(item=>[stringValue(item&&item.id),item]));
    const remoteById=new Map((remoteHistory||[]).map(item=>[stringValue(item&&item.id),cloneJson(item)]));
    baseById.forEach((_base,id)=>{if(id&&!localById.has(id))remoteById.delete(id);});
    localById.forEach((localItem,id)=>{
      if(!id)return;
      const baseItem=baseById.get(id);
      if(!baseItem||!sameJson(localItem,baseItem))remoteById.set(id,cloneJson(localItem));
    });
    const ordered=[];
    const used=new Set();
    (remoteHistory||[]).forEach(item=>{const id=stringValue(item&&item.id);if(id&&remoteById.has(id)&&!used.has(id)){ordered.push(remoteById.get(id));used.add(id);}});
    (localHistory||[]).forEach(item=>{const id=stringValue(item&&item.id);if(id&&remoteById.has(id)&&!used.has(id)){ordered.push(remoteById.get(id));used.add(id);}});
    return ordered.slice(-CONFIG.maxHistory);
  }

  function mergePlannerSnapshots(baseInput,localInput,remoteInput){
    const base=plannerSnapshot(baseInput);
    const local=plannerSnapshot(localInput);
    const remote=plannerSnapshot(remoteInput);
    const merged=plannerSnapshot(remote);

    merged.roster=mergeRosterThreeWay(base.roster,local.roster,remote.roster);

    ALL_KEYS.forEach(key=>{
      if(!Array.isArray(merged.assignments[key]))merged.assignments[key]=new Array(CONFIG.teamSize).fill(null);
      for(let i=0;i<CONFIG.teamSize;i++){
        const baseValue=base.assignments[key]&&base.assignments[key][i]!==undefined?base.assignments[key][i]:null;
        const localValue=local.assignments[key]&&local.assignments[key][i]!==undefined?local.assignments[key][i]:null;
        if(!sameJson(localValue,baseValue))merged.assignments[key][i]=localValue||null;
      }
    });

    const baseFinished=new Set(base.finishedDungeons||[]);
    const localFinished=new Set(local.finishedDungeons||[]);
    const mergedFinished=new Set(remote.finishedDungeons||[]);
    localFinished.forEach(value=>{if(!baseFinished.has(value))mergedFinished.add(value);});
    baseFinished.forEach(value=>{if(!localFinished.has(value))mergedFinished.delete(value);});
    merged.finishedDungeons=[...mergedFinished].sort((a,b)=>a-b);

    ALL_RAIDS.forEach(raid=>{
      const id=raid.id;
      if(!sameJson(local.raidCommanders[id],base.raidCommanders[id]))merged.raidCommanders[id]=local.raidCommanders[id]||'';
    });
    ALL_GUILD_STYLE_RAIDS.forEach(raid=>{
      const id=raid.id;
      if(!sameJson(local.raidLeaders[id],base.raidLeaders[id]))merged.raidLeaders[id]=local.raidLeaders[id]||'';
    });
    [...MAIN_RAIDS,...SUB_RAIDS,...ALL_SIEGE_RAIDS].forEach(raid=>{
      const id=raid.id;
      if(!sameJson(local.raidModes[id],base.raidModes[id]))merged.raidModes[id]=local.raidModes[id];
    });
    if(!sameJson(local.siegeRaidGroups,base.siegeRaidGroups))merged.siegeRaidGroups=cloneJson(local.siegeRaidGroups);

    merged.membershipHistory=mergeHistoryThreeWay(base.membershipHistory,local.membershipHistory,remote.membershipHistory);
    const localRosterIds=new Set((local.roster||[]).map(member=>stringValue(member&&member.id)));
    const locallyDeletedMemberIds=new Set((base.roster||[]).map(member=>stringValue(member&&member.id)).filter(id=>id&&!localRosterIds.has(id)));
    if(locallyDeletedMemberIds.size)merged.membershipHistory=merged.membershipHistory.filter(entry=>!locallyDeletedMemberIds.has(stringValue(entry&&entry.memberId)));

    ['guildLeague','siege','polarityZone'].forEach(key=>{
      if(!sameJson(local.publicVisibility[key],base.publicVisibility[key]))merged.publicVisibility[key]=local.publicVisibility[key]===true;
      if(!sameJson(local.eventUpdates[key],base.eventUpdates[key]))merged.eventUpdates[key]=cloneJson(local.eventUpdates[key]);
    });

    const baseRosterById=new Map((base.roster||[]).map(member=>[stringValue(member&&member.id),member]));
    const mergedRosterById=new Map((merged.roster||[]).map(member=>[stringValue(member&&member.id),member]));
    const renameMap=new Map();
    baseRosterById.forEach((baseMember,id)=>{
      const mergedMember=mergedRosterById.get(id);
      const oldName=stringValue(baseMember&&baseMember.name).trim();
      const newName=stringValue(mergedMember&&mergedMember.name).trim();
      if(oldName&&newName&&oldName.toLowerCase()!==newName.toLowerCase())renameMap.set(oldName.toLowerCase(),newName);
    });
    if(renameMap.size){
      ALL_KEYS.forEach(key=>{
        merged.assignments[key]=merged.assignments[key].map(name=>{
          const text=stringValue(name).trim();
          return text&&renameMap.has(text.toLowerCase())?renameMap.get(text.toLowerCase()):name;
        });
      });
      Object.keys(merged.raidCommanders).forEach(id=>{
        const text=stringValue(merged.raidCommanders[id]).trim();
        if(text&&renameMap.has(text.toLowerCase()))merged.raidCommanders[id]=renameMap.get(text.toLowerCase());
      });
      Object.keys(merged.raidLeaders).forEach(id=>{
        const text=stringValue(merged.raidLeaders[id]).trim();
        if(text&&renameMap.has(text.toLowerCase()))merged.raidLeaders[id]=renameMap.get(text.toLowerCase());
      });
    }

    return plannerSnapshot(normalizeClientState(merged));
  }

  function revisionConflict(error){
    return errorMessage(error).includes('REVISION_CONFLICT');
  }

  function applyPlannerMetadata(target,revision,updatedAt,updatedBy,spreadsheetName){
    target.revision=toInt(revision,0,Number.MAX_SAFE_INTEGER);
    target.updatedAt=stringValue(updatedAt);
    target.updatedBy=stringValue(updatedBy);
    target.spreadsheetName=stringValue(spreadsheetName)||'Titania Guild Management';
    return target;
  }

  function userIsEditingInline(){
    const active=document.activeElement;
    if(!active||!document.getElementById('app').contains(active))return false;
    return /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName);
  }

  async function syncRemoteIfIdle(){
    if(syncCheckInFlight||!supabaseClient||!currentAuthUser||!currentProfile||!currentProfile.approved)return;
    if(document.hidden||dirty||saveQueued||saveInFlight||quickSaveInFlight>0||userIsEditingInline())return;
    syncCheckInFlight=true;
    try{
      const loaded=await callServer('getPlannerState');
      const remoteRevision=toInt(loaded&&loaded.revision,0,Number.MAX_SAFE_INTEGER);
      if(remoteRevision<=state.revision)return;
      const next=normalizeClientState(loaded||{});
      applyPlannerMetadata(next,remoteRevision,loaded&&loaded.updatedAt,loaded&&loaded.updatedBy,loaded&&loaded.spreadsheetName);
      state=next;
      syncedStateSnapshot=plannerSnapshot(state);
      clearSelections(false);
      renderAll();
      setSaveFlag('ok','Synced');
    }catch(_error){
      // Background sync is intentionally silent; normal save/load errors remain visible.
    }finally{
      syncCheckInFlight=false;
    }
  }

  function startPlannerAutoSync(){
    if(syncPollTimer)clearInterval(syncPollTimer);
    syncPollTimer=setInterval(syncRemoteIfIdle,15000);
    if(syncListenersWired)return;
    syncListenersWired=true;
    window.addEventListener('focus',()=>setTimeout(syncRemoteIfIdle,120));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(syncRemoteIfIdle,120);});
  }

  function commitMutation(message,eventScope='auto'){
    if(!userCanEdit()){showToast('Read-only access','Your account cannot make changes.','warn');reloadFromServer();return;}
    if(eventScope==='all'||eventScope==='both')touchEventUpdate('all');
    else if(eventScope!=='none'&&(currentEvent==='guild_league'||currentEvent==='siege'||currentEvent==='polarity_zone'))touchEventUpdate(currentEvent);
    validateRaidCommanders();
    validateRaidLeaders();
    rebuildIndex();
    renderAll();
    queueSave();
    if(message)setSaveFlag('busy','Saving');
  }

  function queueSave(){
    dirty=true;saveQueued=true;setSaveFlag('busy','Saving');
    clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,650);
  }

  async function flushSave(){
    if(saveInFlight){saveQueued=true;return;}
    if(!dirty&&!saveQueued)return;
    saveInFlight=true;saveQueued=false;dirty=false;

    const localAtStart=plannerSnapshot(state);
    const baseAtStart=syncedStateSnapshot?plannerSnapshot(syncedStateSnapshot):plannerSnapshot(localAtStart);
    const originalSpreadsheetName=state.spreadsheetName;
    let snapshotToSave=plannerSnapshot(localAtStart);
    let baseRevision=state.revision;
    let result=null;
    let mergedOtherUserChanges=false;

    try{
      for(let attempt=0;attempt<5;attempt++){
        try{
          result=await callServer('savePlannerState',snapshotToSave,baseRevision);
          break;
        }catch(error){
          if(!revisionConflict(error)||attempt===4)throw error;
          const loaded=await callServer('getPlannerState');
          const remoteState=normalizeClientState(loaded||{});
          snapshotToSave=mergePlannerSnapshots(baseAtStart,localAtStart,plannerSnapshot(remoteState));
          baseRevision=toInt(loaded&&loaded.revision,0,Number.MAX_SAFE_INTEGER);
          mergedOtherUserChanges=true;
        }
      }
      if(!result)throw new Error('Save did not complete.');

      const savedRevision=toInt(result&&result.revision,baseRevision+1,Number.MAX_SAFE_INTEGER);
      const savedUpdatedAt=stringValue(result&&result.updatedAt);
      const savedUpdatedBy=currentEditorName();
      const savedSnapshot=plannerSnapshot(snapshotToSave);
      const localNow=plannerSnapshot(state);
      const newerLocalChanges=dirty||saveQueued||!sameJson(localNow,localAtStart);

      syncedStateSnapshot=plannerSnapshot(savedSnapshot);
      if(newerLocalChanges){
        const rebased=mergePlannerSnapshots(localAtStart,localNow,savedSnapshot);
        state=normalizeClientState(rebased);
        applyPlannerMetadata(state,savedRevision,savedUpdatedAt,savedUpdatedBy,originalSpreadsheetName);
        dirty=true;saveQueued=true;
      }else{
        state=normalizeClientState(savedSnapshot);
        applyPlannerMetadata(state,savedRevision,savedUpdatedAt,savedUpdatedBy,originalSpreadsheetName);
      }
      rebuildIndex();
      if(mergedOtherUserChanges)renderAll();
      renderEventLastUpdated();
      setSaveFlag('ok',mergedOtherUserChanges?'Merged & saved':'Saved');
      if(mergedOtherUserChanges)showToast('Changes merged','A newer edit from another user was found. Both sets of changes were merged and saved.');
    }catch(error){
      dirty=true;setSaveFlag('err','Save failed');
      const message=errorMessage(error);
      showToast('Save failed',message,'err');
      if(revisionConflict(error)){
        showToast('Sync conflict','The data changed repeatedly while saving. Wait a moment, then try your edit again.','warn');
      }
    }finally{
      saveInFlight=false;
      if(saveQueued||dirty){setTimeout(flushSave,80);}
    }
  }

  async function reloadFromServer(){
    document.getElementById('loadingOverlay').hidden=false;document.getElementById('loadingText').textContent='Reloading latest Supabase data…';
    try{
      const loaded=await callServer('getPlannerState');state=normalizeClientState(loaded||{});state.revision=toInt(loaded&&loaded.revision,0,Number.MAX_SAFE_INTEGER);state.updatedAt=stringValue(loaded&&loaded.updatedAt);state.updatedBy=stringValue(loaded&&loaded.updatedBy);state.spreadsheetName=stringValue(loaded&&loaded.spreadsheetName);syncedStateSnapshot=plannerSnapshot(state);dirty=false;saveQueued=false;clearSelections(false);renderAll();setSaveFlag('ok','Loaded');
    }catch(error){showToast('Reload failed',errorMessage(error),'err');}
    finally{document.getElementById('loadingOverlay').hidden=true;}
  }

  function setSaveFlag(kind,text){
    const flag=document.getElementById('saveFlag');
    flag.classList.remove('text-success','text-warning','text-danger','text-muted');
    flag.classList.add(({ok:'text-success',busy:'text-warning',err:'text-danger'})[kind]||'text-muted');
    document.getElementById('saveFlagText').textContent=text;
  }

  function exportLineup(){
    const payload={type:'tempest-lineup-export',version:10,exportedAt:new Date().toISOString(),source:'Titania Supabase website',m:state.roster,a:state.assignments,fd:state.finishedDungeons,rc:state.raidCommanders,rlead:state.raidLeaders,rm:state.raidModes,mh:state.membershipHistory,eu:state.eventUpdates};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`guild-lineup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);showToast('Lineup exported','Roster status, membership history, Guild League, Siege, Polarity Zone, and finished-dungeon marks were included.');
  }

  function importLineupFile(file){
    const reader=new FileReader();
    reader.onload=async()=>{
      let data;try{data=JSON.parse(reader.result);}catch(error){showToast('Import failed','The selected file is not valid JSON.','err');return;}
      if(!data||(!Array.isArray(data.m)&&!Array.isArray(data.roster))){showToast('Import failed','This file does not contain a roster.','err');return;}
      const imported=normalizeClientState(data);
      const when=data.exportedAt?new Date(data.exportedAt).toLocaleString():'an unknown time';
      if(!userCanEdit()||!await confirmPlannerAction(`Import the lineup exported on ${when}?`,'This will replace the current roster, Guild Status records, membership history, and all event lineups in the Titania database.','Replace data',true)||!userCanEdit())return;
      state.roster=imported.roster;state.assignments=imported.assignments;state.finishedDungeons=imported.finishedDungeons;state.raidCommanders=imported.raidCommanders;state.raidLeaders=imported.raidLeaders;state.raidModes=imported.raidModes;state.siegeRaidGroups=imported.siegeRaidGroups;state.membershipHistory=imported.membershipHistory;dashboardSelected.clear();clearSelections(false);commitMutation('Lineup imported','all');showToast('Lineup imported','The roster, raid commanders, status history, and event data are being saved to Supabase.');
    };
    reader.onerror=()=>showToast('Import failed','The file could not be read.','err');reader.readAsText(file);
  }

  function openPrintView(){
    if(currentEvent==='dashboard'||currentEvent==='manage_members')return;
    document.getElementById('printContent').innerHTML=buildPrintContent();
    document.getElementById('printOverlay').hidden=false;
  }

  function closePrintView(){
    document.body.classList.remove('print-mode');
    document.getElementById('printOverlay').hidden=true;
  }

  function printCurrentLineup(){
    if(currentEvent==='dashboard'||currentEvent==='manage_members')return;
    document.getElementById('printContent').innerHTML=buildPrintContent();
    document.getElementById('printOverlay').hidden=false;
    document.body.classList.add('print-mode');
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
  }

  function buildPrintContent(){
    const keys=currentTeamKeys();const assigned=assignedNamesSet(keys).size;const totalSlots=keys.length*CONFIG.teamSize;const eventLabel=currentEventPublicLabel();
    let html=`<div class="print-doc-head"><div><h1>Titania ${eventLabel}</h1><div class="print-sub">Guild lineup summary · Dark Lord Server</div></div><div class="print-doc-meta">${new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}<br>${assigned}/${totalSlots} unique members slotted</div></div>`;

    const appendTeamCard=key=>{
      const slots=state.assignments[key];const noHealer=teamHasNoHealer(key);
      const raid=raidForTeam(key);
      const raidCommanderName=raid?(stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim()||'Not assigned'):'Not assigned';
      let card=`<div class="print-team-card ${currentEvent==='siege'?'siege-party ':''}${noHealer?'no-healer':''}"><div class="print-team-head"><b>${escapeHtml(displayTeamLabel(key))}</b><span title="Team ${escapeAttr(raidCommanderName)}">TEAM ${escapeHtml(raidCommanderName)}</span></div>`;
      slots.forEach((name,index)=>{
        if(!name){card+=`<div class="print-slot-row p-empty ${index===0?'p-party-leader':''}"><span>${index===0?'':'·'}</span><span>${index===0?'Empty leader':'Empty slot'}</span></div>`;return;}
        const member=memberByName[name]||{cls:'Unknown'};card+=index===0
          ? `<div class="print-slot-row p-party-leader"><span class="p-dot" style="background:${classColor(member.cls)}"></span><span class="p-name">${escapeHtml(name)}</span><span class="p-cls">${escapeHtml(member.cls)}</span></div>`
          : `<div class="print-slot-row"><span class="p-dot" style="background:${classColor(member.cls)}"></span><span class="p-name">${escapeHtml(name)}</span><span class="p-cls">${escapeHtml(member.cls)}</span></div>`;
      });
      if(noHealer)card+='<div class="print-team-warn">⚠ No healer</div>';
      return card+'</div>';
    };

    if(currentEvent==='polarity_zone'){
      html+=`<div class="print-section-title">★ STAR DUNGEON</div>`;
      POLARITY_STAR_RAIDS.forEach(raid=>{
        const commanderName=stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim()||'Not assigned';
        html+=`<div class="print-raid-block"><div class="print-raid-head"><span>RAID TEAM — ${escapeHtml(commanderName)}</span></div><div class="print-team-grid print-polarity-grid">${raid.keys.map(appendTeamCard).join('')}</div></div>`;
      });
      html+=`<div class="print-section-title">🗝 NORMAL DUNGEON</div>`;
      for(let dungeon=1;dungeon<=CONFIG.dungeonCount;dungeon++){
        const raid=POLARITY_NORMAL_RAIDS.find(item=>item.dungeon===dungeon);
        const commanderName=raid?stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim()||'Not assigned':'Not assigned';
        html+=`<div class="print-raid-block"><div class="print-raid-head"><span>NORMAL DUNGEON ${dungeon} · TEAM ${escapeHtml(commanderName)}</span></div><div class="print-team-grid print-polarity-grid">${dungeonKeys(dungeon).map(appendTeamCard).join('')}</div></div>`;
      }
    }else if(currentEvent==='siege'){
      currentSiegeRaids().forEach(raid=>{
        const commanderName=stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim()||'Not assigned';
        const raidMode=state.raidModes&&state.raidModes[raid.id]==='DEF'?'DEF':'ATK';
        const modeLabel=raidMode==='DEF'?'RESPAWN':'CAPTURE';
        const modeIcon=raidMode==='DEF'?'↻':'🏰';
        const printGridClass=raid.keys.length===5?'print-main-raid-grid five':'print-main-raid-grid';
        html+=`<div class="print-raid-block"><div class="print-raid-head"><span>${escapeHtml(raid.label.toUpperCase())} · TEAM ${escapeHtml(commanderName)} <span class="print-raid-mode ${raidMode.toLowerCase()}">${modeIcon} ${modeLabel}</span></span></div><div class="print-team-grid ${printGridClass}">${raid.keys.map(appendTeamCard).join('')}</div></div>`;
      });
    }else{
      html+=`<div class="print-section-title">Main Battlefield</div>`;
      MAIN_RAIDS.forEach(raid=>{
        const commanderName=stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim()||'Not assigned';
        const raidMode=state.raidModes&&state.raidModes[raid.id]==='DEF'?'DEF':'ATK';
        const modeIcon=raidMode==='DEF'?'🛡':'⚔';
        html+=`<div class="print-raid-block"><div class="print-raid-head"><span>${escapeHtml(raid.label.toUpperCase())} · TEAM ${escapeHtml(commanderName)} <span class="print-raid-mode ${raidMode.toLowerCase()}">${modeIcon} ${raidMode}</span></span></div><div class="print-team-grid print-main-raid-grid">${raid.keys.map(appendTeamCard).join('')}</div></div>`;
      });
      html+=`<div class="print-section-title"><i class="fa-solid fa-shield-cat mr-2" aria-hidden="true"></i>Sub Battlefield</div>`;
      SUB_RAIDS.forEach(raid=>{
        const commanderName=stringValue(state.raidCommanders&&state.raidCommanders[raid.id]).trim()||'Not assigned';
        const printGridClass=raid.keys.length===5?'print-main-raid-grid five':'print-main-raid-grid';
        html+=`<div class="print-raid-block"><div class="print-raid-head"><span>${escapeHtml(raid.label.toUpperCase())} · TEAM ${escapeHtml(commanderName)}</span></div><div class="print-team-grid ${printGridClass}">${raid.keys.map(appendTeamCard).join('')}</div></div>`;
      });
    }
    return html+'<div class="print-footer-note">Generated from Titania Guild Management Tool · Dark Lord Server.</div>';
  }

  function activeRoster(){return state.roster.filter(member=>isActiveMember(member));}
  function inactiveRoster(){return state.roster.filter(member=>!isActiveMember(member));}
  function isActiveMember(member){return Boolean(member)&&member.status!=='inactive';}
  function makeId(prefix){
    if(window.crypto&&typeof window.crypto.randomUUID==='function')return `${prefix}_${window.crypto.randomUUID().replace(/-/g,'').slice(0,16)}`;
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`;
  }
  function todayIso(){const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  function normalizeDateValue(value){
    if(value instanceof Date&&!Number.isNaN(value.getTime()))return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
    const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(stringValue(value).trim());
    if(!match)return '';
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    if(year<1900||month<1||month>12||day<1||day>31)return '';
    const candidate=new Date(Date.UTC(year,month-1,day));
    return candidate.getUTCFullYear()===year&&candidate.getUTCMonth()===month-1&&candidate.getUTCDate()===day?`${match[1]}-${match[2]}-${match[3]}`:'';
  }
  function normalizeTimestampValue(value){const parsed=new Date(stringValue(value));return Number.isNaN(parsed.getTime())?new Date().toISOString():parsed.toISOString();}
  function formatDate(value){const iso=normalizeDateValue(value);if(!iso)return '';const date=new Date(`${iso}T00:00:00`);return date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}
  function formatMemberUpdate(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return 'No edit recorded';return date.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}

  function currentTeamKeys(){if(currentEvent==='polarity_zone')return POLARITY_KEYS;if(currentEvent==='siege')return SIEGE_KEYS;return GUILD_KEYS;}
  function scopeKeys(key){if(key.startsWith('elite_'))return ELITE_KEYS;if(key.startsWith('dungeon'))return DUNGEON_KEYS;if(key.startsWith('siege_'))return SIEGE_KEYS;return GUILD_KEYS;}
  function scopeId(key){if(key.startsWith('elite_'))return'elite';if(key.startsWith('dungeon'))return'dungeon';if(key.startsWith('siege_'))return'siege';return'guild';}
  function assignedNamesSet(keys){const set=new Set();(keys||currentTeamKeys()).forEach(key=>state.assignments[key].forEach(name=>{if(name)set.add(name);}));return set;}
  function teamHasNoHealer(key){const names=state.assignments[key].filter(Boolean);return names.length>0&&!names.some(name=>memberByName[name]&&isHealer(memberByName[name].cls));}
  function isHealer(cls){return HEALERS.includes(cls);}
  function teamKind(key){if(key.startsWith('main_')||key.startsWith('siege_main_'))return'main-bf';if(key.startsWith('sub_')||key.startsWith('siege_sub_'))return'sub-bf';if(key.startsWith('dungeon'))return'dungeon-bf';return'elite-bf';}
  function teamLabel(key){const match=key.match(/_(\d+)$/);return`Party ${match?match[1]:'?'}`;}
  function subDisplayTeamLabel(key){
    if(key.startsWith('siege_')){
      const siegeIndex=SIEGE_DEFAULT_PARTY_ORDER.indexOf(key);
      return siegeIndex>=0?`Party ${siegeIndex+1}`:teamLabel(key);
    }
    const index=SUB_RAIDS.flatMap(raid=>raid.keys).indexOf(key);
    return index>=0?`Party ${index+1}`:teamLabel(key);
  }
  function displayTeamLabel(key){
    if(key.startsWith('sub_')||key.startsWith('siege_sub_'))return subDisplayTeamLabel(key);
    if(currentEvent==='polarity_zone'&&key.startsWith('dungeon')){
      const index=DUNGEON_KEYS.indexOf(key);
      if(index>=0)return`Party ${index+1}`;
    }
    return teamLabel(key);
  }
  function dungeonNumber(key){const match=/^dungeon(\d+)_/.exec(key);return match?Number.parseInt(match[1],10):null;}
  function teamLongLabel(key){if(key.startsWith('siege_'))return displayTeamLabel(key);if(key.startsWith('main_'))return`Main ${teamLabel(key)}`;if(key.startsWith('sub_'))return`Sub ${subDisplayTeamLabel(key)}`;if(key.startsWith('elite_'))return`Star ${teamLabel(key)}`;return`Normal Dungeon ${dungeonNumber(key)} ${teamLabel(key)}`;}
  function teamsMatch(a,b){const first=state.assignments[a].filter(Boolean).slice().sort();const second=state.assignments[b].filter(Boolean).slice().sort();return first.length>0&&first.length===second.length&&first.every((value,index)=>value===second[index]);}
  function dungeonMatches(eliteKey){return DUNGEON_KEYS.filter(key=>teamsMatch(eliteKey,key));}
  function classColor(cls){return CLASS_COLORS[cls]||CLASS_COLORS.Unknown;}
  function formatNumber(value){return Number(value||0).toLocaleString();}
  function stringValue(value){return value===null||value===undefined?'':String(value);}
  function toInt(value,min,max){let number=Number.parseInt(value,10);if(!Number.isFinite(number))number=min;return Math.max(min,Math.min(max,number));}
  function errorMessage(error){return error&&error.message?String(error.message):String(error||'Unknown error');}
  function maskEmail(value){
    const email=stringValue(value).trim();
    const at=email.indexOf('@');
    if(at<=0)return email;
    const local=email.slice(0,at);
    const domain=email.slice(at+1);
    const visible=Math.min(3,Math.max(1,local.length-1));
    const masked=local.slice(0,visible)+'*'.repeat(Math.max(3,local.length-visible));
    return `${masked}@${domain}`;
  }

  function escapeHtml(value){return stringValue(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
  function escapeAttr(value){return escapeHtml(value);}

  function showToast(title,message,kind){
    return window.TitaniaToast(title,message,kind);
  }
