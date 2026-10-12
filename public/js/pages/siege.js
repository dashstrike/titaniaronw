'use strict';

const VIEW = document.body.dataset.view || 'guild';
const TEAM_SIZE = 5;

const MAIN_RAIDS = [
  {id:'siege_raid_1',label:'Raid 1',keys:['siege_main_1','siege_main_2','siege_main_3','siege_main_4']},
  {id:'siege_raid_2',label:'Raid 2',keys:['siege_main_5','siege_main_6','siege_main_7','siege_main_8']},
  {id:'siege_raid_3',label:'Raid 3',keys:['siege_main_9','siege_main_10','siege_main_11','siege_main_12']}
];
const SUB_RAIDS = [
  {id:'siege_sub_raid_1',label:'Raid 4',keys:['siege_sub_1','siege_sub_2','siege_sub_3','siege_sub_4','siege_sub_17']},
  {id:'siege_sub_raid_2',label:'Raid 5',keys:['siege_sub_5','siege_sub_6','siege_sub_7','siege_sub_8','siege_sub_18']},
  {id:'siege_sub_raid_3',label:'Raid 6',keys:['siege_sub_9','siege_sub_10','siege_sub_11','siege_sub_12']},
  {id:'siege_sub_raid_4',label:'Raid 7',keys:['siege_sub_13','siege_sub_14','siege_sub_15','siege_sub_16']}
];
const DEFAULT_SIEGE_RAIDS = [...MAIN_RAIDS,...SUB_RAIDS];
const SIEGE_PARTY_ORDER = DEFAULT_SIEGE_RAIDS.flatMap(raid=>raid.keys);
const SIEGE_KEY_SET = new Set(SIEGE_PARTY_ORDER);

function normalizeSiegeRaidGroups(raw){
  const source=raw&&typeof raw==='object'?raw:{};
  const out={};const used=new Set();
  DEFAULT_SIEGE_RAIDS.forEach(raid=>{
    out[raid.id]=[];
    const values=Array.isArray(source[raid.id])?source[raid.id]:[];
    values.forEach(value=>{
      const key=str(value).trim();
      if(!SIEGE_KEY_SET.has(key)||used.has(key)||out[raid.id].length>=5)return;
      used.add(key);out[raid.id].push(key);
    });
  });
  SIEGE_PARTY_ORDER.forEach(key=>{
    if(used.has(key))return;
    const preferred=DEFAULT_SIEGE_RAIDS.find(raid=>raid.keys.includes(key));
    let target=preferred&&out[preferred.id].length<5?preferred:null;
    if(!target)target=DEFAULT_SIEGE_RAIDS.find(raid=>out[raid.id].length<5);
    if(target){out[target.id].push(key);used.add(key);}
  });
  DEFAULT_SIEGE_RAIDS.forEach(emptyRaid=>{
    if(out[emptyRaid.id].length)return;
    const donor=DEFAULT_SIEGE_RAIDS.find(raid=>out[raid.id].length>1);
    if(donor)out[emptyRaid.id].push(out[donor.id].pop());
  });
  return out;
}

function currentSiegeRaids(){
  const groups=state&&state.siegeRaidGroups?state.siegeRaidGroups:normalizeSiegeRaidGroups({});
  return DEFAULT_SIEGE_RAIDS.map(raid=>({...raid,keys:(groups[raid.id]||raid.keys).slice()}));
}

function siegeRaidForParty(key){return currentSiegeRaids().find(raid=>raid.keys.includes(key))||null;}
const STAR_RAIDS = [
  {id:'pz_star_1',label:'Raid Team',keys:['elite_1','elite_2','elite_3','elite_4','elite_5']},
  {id:'pz_star_2',label:'Raid Team',keys:['elite_6','elite_7','elite_8','elite_9','elite_10']}
];
const DUNGEONS = Array.from({length:4},(_,i)=>({
  id:`pz_dungeon_${i+1}`,
  dungeon:i+1,
  label:`Normal Dungeon ${i+1}`,
  keys:Array.from({length:5},(_,j)=>`dungeon${i+1}_${j+1}`)
}));
const HEALERS = new Set(['Acolyte','Priest','High Priest']);
const CLASS_COLORS = {
  Swordman:'#e2776b',Knight:'#e2776b','Lord Knight':'#e2776b',Crusader:'#e2776b',Paladin:'#e2776b',
  Mage:'#579ed3',Wizard:'#579ed3','High Wizard':'#579ed3',Archer:'#e2aa50',Hunter:'#e2aa50',Sniper:'#e2aa50',
  Bard:'#e2aa50',Clown:'#e2aa50',Dancer:'#e2aa50',Gypsy:'#e2aa50',Acolyte:'#78bd5b',Priest:'#78bd5b','High Priest':'#78bd5b',Monk:'#78bd5b',Champion:'#78bd5b',
  Thief:'#a579f2',Assassin:'#a579f2','Assassin Cross':'#a579f2',Merchant:'#df9056',Blacksmith:'#df9056',Whitesmith:'#df9056',Alchemist:'#df9056',Creator:'#df9056',
  Gunslinger:'#b27d69',Rebel:'#b27d69','Night Watch':'#b27d69',Druid:'#32947e',Kanos:'#32947e',Alithea:'#32947e',Unknown:'#8b93b0'
};
const TITLE_ICON_BASE='./images/title/';
const TITLE_ICON_SERIES=Object.freeze({traveler:'traveler_green',explorer:'explorer_blue',pathfinder:'pathfinder_purple',trailblazer:'trailblazer_orange',pioneer:'pioneer_red',dawnbringer:'dawnbringer_rainbow'});
const TITLE_ICON_LEVELS=Object.freeze({i:1,ii:2,iii:3,iv:4,v:5,'1':1,'2':2,'3':3,'4':4,'5':5});

let client = null;
let state = null;
let members = new Map();

document.addEventListener('DOMContentLoaded',()=>{
  setupTheme();
  const refresh = document.getElementById('refreshBtn');
  if(refresh) refresh.addEventListener('click',loadLineup);
  loadLineup();
  setInterval(loadLineup,60000);
});

function setupTheme(){
  document.documentElement.dataset.theme=document.documentElement.dataset.bsTheme||'dark';
}

async function loadLineup(){
  const content=document.getElementById('content');
  if(!content) return;
  if(!state) content.innerHTML='<div class="loading"><div class="spinner"></div>Loading lineup…</div>';
  try{
    const cfg=window.TITANIA_CONFIG||{};
    const url=cfg.supabaseUrl||cfg.SUPABASE_URL;
    const key=cfg.supabasePublishableKey||cfg.SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key) throw new Error('Supabase configuration is missing.');
    if(!window.supabase) throw new Error('Supabase library did not load.');
    if(!client) client=window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await client.rpc('get_public_lineup',{p_view:VIEW});
    if(error) throw error;
    state=normalize(data||{});
    members=new Map(state.roster.map(m=>[m.name,m]));
    render();
  }catch(err){
    content.innerHTML=`<div class="error-box"><b>Could not load lineup</b>${esc(err&&err.message?err.message:String(err))}<br><br><span class="error-note">Make sure <code>siege_public_setup.sql</code> has been run in Supabase.</span></div>`;
  }
}

function normalize(raw){
  const roster=Array.isArray(raw.roster)
    ? raw.roster.map(m=>({name:str(m.name),cls:str(m.cls)||'Unknown',title:str(m.title)})).filter(m=>m.name)
    : [];
  const assignments=raw.assignments&&typeof raw.assignments==='object'?raw.assignments:{};
  return {
    published:raw.published===true,
    roster,
    assignments,
    raidCommanders:raw.raidCommanders||{},
    raidLeaders:raw.raidLeaders||{},
    raidModes:raw.raidModes||{},
    siegeRaidGroups:normalizeSiegeRaidGroups(raw.siegeRaidGroups),
    finishedDungeons:Array.isArray(raw.finishedDungeons)?raw.finishedDungeons.map(Number):[],
    preAttendance:raw.preAttendance&&typeof raw.preAttendance==='object'?raw.preAttendance:{},
    attendanceEventType:str(raw.attendanceEventType),
    attendanceEventDate:str(raw.attendanceEventDate),
    revision:num(raw.revision),
    updatedAt:str(raw.updatedAt)
  };
}

function render(){
  const content=document.getElementById('content');
  if(!content) return;
  const title=VIEW==='guild'?'Guild League':VIEW==='siege'?'Siege':'Polarity Zone';
  document.title=`Titania · ${title}`;
  const updated=state.updatedAt?formatDateTime(state.updatedAt):'Live';
  if(!state.published){
    content.innerHTML=`<section class="lineup-sheet">
      <div class="sheet-head">
        <div class="sheet-brand">${esc(title)}</div>
        <div class="sheet-meta">Dark Lord Server</div>
      </div>
      <div class="unpublished-box card"><div class="unpublished-icon">🔒</div><h2>Lineup Not Published Yet</h2><p>The Titania ${esc(title)} lineup is currently private.<br>Please check back later.</p></div>
    </section>`;
    return;
  }
  const eventDate=state.attendanceEventDate?`<br>PRE ${esc(formatSimpleDate(state.attendanceEventDate))}`:'';
  content.innerHTML=`<section class="lineup-sheet">
    <div class="sheet-head">
      <div class="sheet-brand">${esc(title)}</div>
      <div class="sheet-meta">Dark Lord Server<br>Updated ${esc(updated)}${eventDate}</div>
    </div>
    ${VIEW==='polarity'?renderPolarity():renderGuild()}
  </section>`;
}

function renderGuild(){
  return currentSiegeRaids().map(r=>raidBlock(r,'siege',r.keys.length===5)).join('');
}

function renderPolarity(){
  let html=section('★ Star Dungeon','star');
  html+=STAR_RAIDS.map(r=>raidBlock(r,'star',true)).join('');
  DUNGEONS.forEach(d=>{
    const commander=str(state.raidCommanders[d.id])||'Not assigned';
    const finished=state.finishedDungeons.includes(d.dungeon);
    html+=`<div class="raid-block dungeon-block">
      <div class="raid-head card-header">
        <div class="raid-name">NORMAL DUNGEON ${d.dungeon} · TEAM <b>${esc(commander)}</b></div>
        ${finished?'<span class="finished">✓ Run Finished</span>':''}
        <div class="raid-line"></div>
      </div>
      <div class="team-grid">${d.keys.map((k,i)=>teamCard(k,'normal',`Party ${i+1}`)).join('')}</div>
    </div>`;
  });
  return html;
}

function raidBlock(raid,kind,five){
  const commander=str(state.raidCommanders[raid.id])||'Not assigned';
  const isSiegeRaid=DEFAULT_SIEGE_RAIDS.some(r=>r.id===raid.id);
  const mode=isSiegeRaid?(str(state.raidModes[raid.id]).toUpperCase()==='DEF'?'DEF':'ATK'):'';
  const modeLabel=mode==='DEF'?'RESPAWN':'CAPTURE';
  const modeIcon=mode==='DEF'?'↻':'🏰';
  const raidTitle=kind==='star'?`RAID TEAM — <b>${esc(commander)}</b>`:`${esc(raid.label.toUpperCase())} · TEAM <b>${esc(commander)}</b>`;
  return `<div class="raid-block card" data-kind="${kind}">
    <div class="raid-head card-header">
      <div class="raid-name">${raidTitle}</div>
      ${mode?`<span class="mode ${mode.toLowerCase()}">${modeIcon} ${modeLabel}</span>`:''}
      <div class="raid-line"></div>
    </div>
    <div class="team-grid card-body ${five?'five':''}">${raid.keys.map(k=>teamCard(k,kind)).join('')}</div>
  </div>`;
}

function teamCard(key,kind,label){
  const s=slots(key);
  const noHealer=teamNoHealer(key);
  return `<article class="team-card ${kind} card">
    <div class="team-head card-header"><div class="team-name">${esc(label||teamLabel(key))}</div></div>
    <div class="card-body p-2">${s.map((name,i)=>slotHtml(name,i,key)).join('')}</div>
    ${noHealer?'<div class="no-healer">⚠ No healer</div>':''}
  </article>`;
}

function preBadge(name){
  const status=str((state.preAttendance||{})[name])||'no_response';
  if(status==='going')return '<span class="public-pre-attendance pre-going" title="Pre-attendance: Going">PRE ✓</span>';
  if(status==='not_going')return '<span class="public-pre-attendance pre-not-going" title="Pre-attendance: Not Going">PRE ✕</span>';
  return '<span class="public-pre-attendance pre-no-response" title="Pre-attendance: No Response">PRE ?</span>';
}

function titleAssetPath(title){
  const value=str(title).trim();
  if(!value)return '';
  const match=value.match(/^([A-Za-z]+)\s+([IVX]+|[1-5])$/i);
  if(!match)return '';
  const series=TITLE_ICON_SERIES[match[1].toLowerCase()];
  const level=TITLE_ICON_LEVELS[match[2].toLowerCase()];
  if(!series||!level)return '';
  return `${TITLE_ICON_BASE}${series}_${level}_star${level===1?'':'s'}.png`;
}

function titleIconHtml(member){
  const title=str(member&&member.title).trim();
  const src=titleAssetPath(title);
  if(!src)return '<span class="public-title-icon is-empty" aria-hidden="true"></span>';
  return `<span class="public-title-icon" style="background-image:url('${src}')" title="${esc(title)}" aria-label="${esc(title)} title icon"></span>`;
}

function raidForParty(key){
  return key.startsWith('siege_')?siegeRaidForParty(key):null;
}

function slotHtml(name,index,key){
  if(!name){
    return `<div class="slot ${index===0?'leader-slot':''}"><span class="empty">${index===0?'Empty team leader':'Empty slot'}</span></div>`;
  }
  const m=members.get(name)||{name,cls:'Unknown',title:''};
  const c=CLASS_COLORS[m.cls]||CLASS_COLORS.Unknown;
  const raid=raidForParty(key);
  const raidLeaderSelected=Boolean(raid&&state.raidLeaders&&str(state.raidLeaders[raid.id])===name);
  return `<div class="slot ${index===0?'leader-slot':''}">
    ${titleIconHtml(m)}
    <div class="member"><div class="member-name">${esc(name)}</div>${preBadge(name)}${raidLeaderSelected?'<span class="public-raid-leader" title="Raid Leader" aria-label="Raid Leader"><i class="fa-solid fa-crown" aria-hidden="true"></i></span>':''}</div>
    <span class="job-class job-class-source">${esc(m.cls)}</span><span class="dot public-job-icon" title="${esc(m.cls)}" aria-label="${esc(m.cls)} class icon"></span>
  </div>`;
}

function section(title,kind){
  return `<div class="section-head"><div class="section-title ${kind}">${title}</div><div class="section-line"></div></div>`;
}

function slots(key){
  const a=Array.isArray(state.assignments[key])?state.assignments[key].slice(0,TEAM_SIZE):[];
  while(a.length<TEAM_SIZE)a.push(null);
  return a.map(v=>str(v)||null);
}

function teamNoHealer(key){
  const names=slots(key).filter(Boolean);
  return names.length>0&&!names.some(n=>HEALERS.has((members.get(n)||{}).cls));
}

function teamLabel(key){
  if(key.startsWith('siege_')){
    const index=SIEGE_PARTY_ORDER.indexOf(key);
    if(index>=0)return `Party ${index+1}`;
  }
  const m=/_([0-9]+)$/.exec(key);
  return `Party ${m?m[1]:'?'}`;
}

function formatDateTime(v){
  const d=new Date(v);
  return Number.isNaN(d.getTime())?'':d.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function formatSimpleDate(v){
  const p=str(v).split('-').map(Number);if(p.length!==3)return str(v);
  const d=new Date(p[0],p[1]-1,p[2]);
  return Number.isNaN(d.getTime())?str(v):d.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}
function str(v){return v==null?'':String(v);}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function esc(v){return str(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
