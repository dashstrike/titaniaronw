'use strict';

const CLASS_COLORS = {
  'Novice':'#737bd3',
  'Swordman':'#e2776b','Knight':'#e2776b','Lord Knight':'#e2776b','Crusader':'#e2776b','Paladin':'#e2776b',
  'Mage':'#579ed3','Wizard':'#579ed3','High Wizard':'#579ed3','Sage':'#579ed3','Scholar':'#579ed3',
  'Archer':'#e2aa50','Hunter':'#e2aa50','Sniper':'#e2aa50','Bard':'#e2aa50','Clown':'#e2aa50','Dancer':'#e2aa50','Gypsy':'#e2aa50',
  'Acolyte':'#78bd5b','Priest':'#78bd5b','High Priest':'#78bd5b','Monk':'#78bd5b','Champion':'#78bd5b',
  'Thief':'#a579f2','Assassin':'#a579f2','Assassin Cross':'#a579f2','Rogue':'#a579f2','Stalker':'#a579f2',
  'Merchant':'#df9056','Blacksmith':'#df9056','Whitesmith':'#df9056','Alchemist':'#df9056','Creator':'#df9056',
  'Gunslinger':'#b27d69','Rebel':'#b27d69','Night Watch':'#b27d69',
  'Druid':'#32947e','Kanos':'#32947e','Alithea':'#32947e',
  Unknown:'#8b93b0'
};

let client=null;

async function loadCardHistory(memberId,accessory=false){
  const label=accessory?'Accessory':'Card';
  const wrap=document.getElementById(accessory?'memberAccessoryHistoryContent':'memberCardHistoryContent');
  try{
    const {data,error}=await client.rpc(accessory?'get_member_accessory_history':'get_member_card_history',{p_member_id:memberId});
    if(error)throw error;
    if(!data?.length){wrap.innerHTML=`<div class="muted">No ${label.toLowerCase()} registrations or received items yet.</div>`;return;}
    const cards=(accessory?window.TITANIA_AUCTION_ACCESSORIES:window.TITANIA_AUCTION_CARDS)||[];
    wrap.innerHTML=`<table class="history-table table table-centered table-hover align-middle mb-0"><thead><tr><th>${label}</th><th>Status</th><th>Registered</th><th>Received</th><th>Ducks</th></tr></thead><tbody>${data.map(row=>{
      const id=accessory?row.accessory_id:row.card_id;
      const card=cards.find(item=>item.id===id);
      const name=card?.name||id;
      const image=card?`<img src="${esc(accessory?card.image:`images/cards/icon_item_card_${card.id}_01.webp`)}" width="32" height="32" class="mr-2 flex-shrink-0" alt="">`:'';
      return `<tr><td><span class="d-inline-flex align-items-center">${image}<span>${esc(name)}</span></span></td><td><span class="badge bg-${row.status==='received'?'success':'primary'}-subtle text-${row.status==='received'?'success':'primary'}">${row.status==='received'?'RECEIVED':'REGISTERED'}</span></td><td data-order="${new Date(row.registered_at).getTime()||0}">${esc(fmtDateTime(row.registered_at))}</td><td data-order="${new Date(row.received_at).getTime()||0}">${row.received_at?esc(fmtDateTime(row.received_at)):'—'}</td><td><span class="d-inline-flex align-items-center text-nowrap"><iconify-icon icon="mdi:duck" class="text-warning mr-2 fs-28" aria-hidden="true"></iconify-icon>×${esc(row.ducks)}</span></td></tr>`;
    }).join('')}</tbody></table>`;
    new DataTable(wrap.querySelector('table'),{pageLength:5,lengthChange:false,order:[],autoWidth:false,searching:false});
  }catch(error){wrap.textContent=error.message||`Could not load ${label.toLowerCase()} history. Please refresh and try again.`;}
}

function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function fmtGr(v){return Math.round(num(v)).toLocaleString();}
function fmtDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}
function fmtDateTime(v){const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function classColor(cls){return CLASS_COLORS[cls]||CLASS_COLORS.Unknown;}

function setupTheme(){document.documentElement.dataset.theme=document.documentElement.dataset.bsTheme||'dark';}

function gainAt(history,current,days){if(!history.length)return null;const cutoff=Date.now()-days*86400000;let base=null;for(const row of history){const t=new Date(row.recorded_at).getTime();if(t<=cutoff)base=row;else break;}if(!base)base=history[0];return current-num(base.gear_rating);}
function setGain(id,value){const el=document.getElementById(id);if(value==null){el.textContent='—';el.className='';return;}el.textContent=`${value>0?'+':''}${Math.round(value).toLocaleString()}`;el.className=`gain ${value>0?'pos':value<0?'neg':'zero'}`;}

function renderChart(history){const wrap=document.getElementById('chartWrap');if(history.length<2){wrap.innerHTML='<div class="chart-empty">Progress tracking is active. The chart will appear after this member\'s next GR change.</div>';return;}const width=900,height=280,pad={l:58,r:20,t:18,b:38};const values=history.map(r=>num(r.gear_rating));let min=Math.min(...values),max=Math.max(...values);if(min===max){min-=1;max+=1;}const range=max-min;min-=range*.08;max+=range*.08;const times=history.map(r=>new Date(r.recorded_at).getTime());let tMin=Math.min(...times),tMax=Math.max(...times);if(tMin===tMax)tMax=tMin+1;const x=t=>pad.l+((t-tMin)/(tMax-tMin))*(width-pad.l-pad.r);const y=v=>pad.t+(1-(v-min)/(max-min))*(height-pad.t-pad.b);const pts=history.map((r,i)=>`${x(times[i]).toFixed(1)},${y(values[i]).toFixed(1)}`).join(' ');let grid='';for(let i=0;i<4;i++){const value=min+(max-min)*(i/3);const yy=y(value);grid+=`<line class="chart-grid" x1="${pad.l}" y1="${yy}" x2="${width-pad.r}" y2="${yy}"></line><text class="chart-label" x="4" y="${yy+4}">${esc(fmtGr(value))}</text>`;}const area=`${x(times[0])},${height-pad.b} ${pts} ${x(times[times.length-1])},${height-pad.b}`;const dots=history.map((r,i)=>`<circle class="chart-dot" cx="${x(times[i])}" cy="${y(values[i])}" r="4"><title>${esc(fmtDateTime(r.recorded_at))} · ${esc(fmtGr(values[i]))}</title></circle>`).join('');const labels=`<text class="chart-label" x="${pad.l}" y="${height-8}">${esc(fmtDate(history[0].recorded_at))}</text><text class="chart-label" text-anchor="end" x="${width-pad.r}" y="${height-8}">${esc(fmtDate(history[history.length-1].recorded_at))}</text>`;wrap.innerHTML=`<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gear rating progress chart">${grid}<polygon class="chart-area" points="${area}"></polygon><polyline class="chart-line" points="${pts}"></polyline>${dots}${labels}</svg>`;}

function renderHistory(history){const wrap=document.getElementById('historyWrap');const existing=wrap.querySelector('table');if(existing&&DataTable.isDataTable(existing))new DataTable(existing).destroy();if(!history.length){wrap.innerHTML='<div class="muted">No GR history recorded yet.</div>';return;}const desc=[...history].reverse();wrap.innerHTML=`<table class="history-table table table-centered table-hover align-middle mb-0"><thead><tr><th>Date</th><th>Gear Rating</th><th>Change</th></tr></thead><tbody>${desc.map((row,index)=>{const chronologicalIndex=history.length-1-index;const prev=chronologicalIndex>0?history[chronologicalIndex-1]:null;const delta=prev?num(row.gear_rating)-num(prev.gear_rating):null;return `<tr><td data-order="${new Date(row.recorded_at).getTime()||0}">${esc(fmtDateTime(row.recorded_at))}</td><td data-order="${num(row.gear_rating)}"><b>${esc(fmtGr(row.gear_rating))}</b></td><td class="${delta==null?'delta-zero':delta>0?'delta-pos':delta<0?'delta-neg':'delta-zero'}">${delta==null?'Baseline':`${delta>0?'+':''}${Math.round(delta).toLocaleString()}`}</td></tr>`;}).join('')}</tbody></table>`;new DataTable(wrap.querySelector('table'),{pageLength:5,lengthChange:false,order:[[0,'desc']],autoWidth:false,searching:false,columnDefs:[{targets:2,orderable:false}]});}

function renderNationality(member){
  const nationalities={malaysia:['Malaysia','images/flags/malaysia.svg'],indonesia:['Indonesia','images/flags/indonesia.svg'],thailand:['Thailand','images/flags/thailand.svg'],philippines:['Philippines','images/flags/philippines.svg']};
  const nationality=nationalities[String(member.nationality||'').toLowerCase()];
  if(!nationality)return;
  const flag=document.createElement('img');
  flag.className='nationality-flag ms-2';
  flag.src=nationality[1];
  flag.alt=nationality[0];
  flag.title=nationality[0];
  document.getElementById('memberName').appendChild(flag);
}

function renderProfile(member,history){document.title=`Titania · ${member.name}`;document.getElementById('memberName').textContent=member.name||'Unknown';renderNationality(member);document.getElementById('memberClass').textContent=member.cls||'Unknown';const status=member.status==='inactive'?'inactive':'active';const statusEl=document.getElementById('memberStatus');statusEl.textContent=status;statusEl.className=`status ${status}`;document.getElementById('classOrb').style.background=classColor(member.cls);document.getElementById('classOrb').style.color=classColor(member.cls);const current=num(member.gr);document.getElementById('currentGr').textContent=fmtGr(current);setGain('gain7',gainAt(history,current,7));setGain('gain30',gainAt(history,current,30));setGain('gainTotal',history.length?current-num(history[0].gear_rating):null);document.getElementById('trackingSince').textContent=history.length?fmtDate(history[0].recorded_at):'—';document.getElementById('memberInfo').innerHTML=[['Member ID',member.id],['Class',member.cls||'Unknown'],['Status',status],['Last roster edit',member.updatedAt?fmtDateTime(member.updatedAt):'—'],['Updated by',member.updatedBy||'—'],['Inactive since',member.inactiveSince?fmtDate(member.inactiveSince):'—'],['Last returned',member.lastReturned?fmtDate(member.lastReturned):'—'],['Notes',member.notes||'—']].map(([k,v])=>`<div class="info-row"><div class="info-key">${esc(k)}</div><div class="info-value">${esc(v)}</div></div>`).join('');renderChart(history);renderHistory(history);document.getElementById('loading').hidden=true;document.getElementById('profile').style.display='block';}

function fail(message){document.getElementById('loading').hidden=true;document.getElementById('errorText').textContent=message;document.getElementById('error').hidden=false;}

async function boot(){setupTheme();const cfg=window.TITANIA_CONFIG||{};if(!cfg.supabaseUrl||!cfg.supabasePublishableKey){fail('Supabase configuration is missing.');return;}if(!window.supabase){fail('Supabase library did not load.');return;}const memberId=new URLSearchParams(location.search).get('id')||'';if(!memberId){fail('No member ID was provided.');return;}client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});const userResult=await client.auth.getUser();if(userResult.error||!userResult.data||!userResult.data.user){fail('Sign in to Titania first, then open the member profile again.');return;}const profileResult=await client.from('profiles').select('approved,role').eq('id',userResult.data.user.id).single();if(profileResult.error||!profileResult.data||!profileResult.data.approved){fail('Your Titania account is not approved to view member profiles.');return;}const plannerResult=await client.from('planner_state').select('state').eq('id',1).single();if(plannerResult.error){fail(plannerResult.error.message||'Could not load planner data.');return;}const roster=Array.isArray(plannerResult.data&&plannerResult.data.state&&plannerResult.data.state.roster)?plannerResult.data.state.roster:[];const member=roster.find(m=>String(m&&m.id||'')===memberId);if(!member){fail('This member is no longer in the current roster.');return;}const historyResult=await client.from('gear_rating_history').select('gear_rating,recorded_at').eq('member_id',memberId).order('recorded_at',{ascending:true});if(historyResult.error){fail(historyResult.error.message||'Could not load GR history.');return;}renderProfile(member,historyResult.data||[]);loadCardHistory(memberId);loadCardHistory(memberId,true);if(window.TitaniaMemberAttendance)window.TitaniaMemberAttendance(client,memberId,userResult.data.user.id);}

const startProfile=()=>boot().catch(error=>{console.warn('Member profile load failed',error);fail('Could not load the member profile. Please refresh and try again.');});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startProfile,{once:true});else startProfile();
