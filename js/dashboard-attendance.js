/* Dashboard attendance: read-only charts using the existing signed-in client. */
(function TitaniaDashboardAttendance(){
  'use strict';
  if(!(/\/$|\/index\.html$/i.test(location.pathname)))return;

  const EVENT_LABELS={guild_league_tuesday:'GL Tue',guild_league_thursday:'GL Thu',siege:'Siege'};
  const MODES={
    actual:[['present','Present'],['absent','Absent'],['excused','Excused'],['not_checked','Not checked']],
    pre:[['going','Going'],['not_going','Not going'],['no_response','No response']]
  };
  let mode='actual';
  let pending=null;

  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function userId(){return typeof currentAuthUser!=='undefined'&&currentAuthUser?currentAuthUser.id:'';}
  function canRead(){return userId()&&typeof currentProfile!=='undefined'&&currentProfile&&currentProfile.approved&&typeof supabaseClient!=='undefined'&&supabaseClient;}
  function dateLabel(value){const d=new Date(String(value)+'T12:00:00');return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString(undefined,{day:'numeric',month:'short'});}

  function summarize(events,records){
    const grouped=new Map(events.map(event=>[String(event.id),new Map()]));
    records.forEach(row=>{
      const group=grouped.get(String(row.event_id));
      if(group&&row.member_id)group.set(String(row.member_id),row);
    });
    return events.slice().reverse().map(event=>{
      const snapshot=event.lineup_snapshot||{};
      const hasRoster=Array.isArray(snapshot.roster);
      const members=new Map();
      // Use the saved event roster, never today's roster, for historical totals.
      if(hasRoster)snapshot.roster.forEach(member=>{
        if(!member)return;
        const id=String(member.memberId||member.id||member.name||'');
        if(id)members.set(id,{});
      });
      grouped.get(String(event.id)).forEach((row,id)=>{
        // Refresh Members deliberately removes old members from this event.
        if(!hasRoster||!snapshot.membersRefreshed||members.has(id))members.set(id,row);
      });
      const actual={present:0,absent:0,excused:0,not_checked:0};
      const pre={going:0,not_going:0,no_response:0};
      members.forEach(row=>{
        const a=Object.hasOwn(actual,row.actual_status)?row.actual_status:'not_checked';
        const p=Object.hasOwn(pre,row.pre_status)?row.pre_status:'no_response';
        actual[a]++;
        pre[p]++;
      });
      return {id:event.id,label:EVENT_LABELS[event.event_type]||'Event',date:event.event_date,status:event.status,total:members.size,actual,pre,hasRoster};
    });
  }

  async function fetchData(){
    const client=supabaseClient;
    // Include unfinished events: some already contain actual attendance marks.
    const result=await client.from('attendance_events')
      .select('id,event_type,event_date,status,lineup_snapshot')
      .in('event_type',Object.keys(EVENT_LABELS))
      .order('event_date',{ascending:false}).order('id',{ascending:false}).limit(8);
    if(result.error)throw result.error;
    const events=result.data||[];
    if(!events.length)return [];
    const records=[];
    let offset=0;
    // A history chart can exceed Supabase's default response row limit.
    while(true){
      const page=await client.from('attendance_records')
        .select('event_id,member_id,pre_status,actual_status',{count:'exact'})
        .in('event_id',events.map(event=>event.id))
        .order('id',{ascending:true}).range(offset,offset+499);
      if(page.error)throw page.error;
      const rows=page.data||[];
      records.push(...rows);
      offset+=rows.length;
      if(typeof page.count==='number'){
        if(offset>=page.count)break;
        if(!rows.length)throw new Error('Attendance records were incomplete. Please refresh.');
      }else if(rows.length<500)break;
    }
    return summarize(events,records);
  }

  function renderChart(panel,events){
    const content=panel.querySelector('.dash-att-content');
    if(!events.length){
      content.innerHTML='<p class="dash-att-message" role="status">No attendance events yet. Create an event in the Attendance tab to see it here.</p>';
      return;
    }
    const meta=MODES[mode];
    const primary=meta[0][0];
    const total=Object.fromEntries(meta.map(([key])=>[key,events.reduce((sum,event)=>sum+event[mode][key],0)]));
    const legend=meta.map(([key,label])=>`<span><i class="dash-att-dot ${key}" aria-hidden="true"></i>${label} <b>${total[key]}</b></span>`).join('');
    const bars=events.map(event=>{
      const counts=event[mode];
      const pct=event.total?Math.round(counts[primary]/event.total*100):null;
      const detail=`${event.label} ${event.date}. ${meta.map(([key,label])=>`${label}: ${counts[key]}`).join(', ')}. ${event.total} event members. ${event.status==='closed'?'Closed.':'Not final.'}`;
      return `<div class="dash-att-column">
        <strong>${pct===null?'\u2014':pct+'%'}</strong>
        <div class="dash-att-bar" tabindex="0" role="img" aria-label="${esc(detail)}" title="${esc(detail)}">
          ${meta.map(([key])=>`<span class="${key}" style="height:${event.total?counts[key]/event.total*100:0}%"></span>`).join('')}
        </div>
        <b>${esc(dateLabel(event.date))}</b><span>${esc(event.label)}</span>
        <small>${counts[primary]}/${event.total} ${mode==='actual'?'present':'going'}</small>
        <small class="dash-att-state">${event.status==='closed'?'Closed':'Not final'}</small>
      </div>`;
    }).join('');
    content.innerHTML=`<div class="dash-att-legend">${legend}</div>
      <div class="dash-att-scroll" tabindex="0" role="region" aria-label="Attendance chart; scroll horizontally on small screens">
        <div class="dash-att-chart">${bars}</div>
      </div>
      <p class="dash-att-note">Percentages use that event's members, not today's roster. ${mode==='actual'?'Not checked is not counted as absent.':'No response is separate from Not going.'} Unfinished events are marked Not final.${events.some(event=>!event.hasRoster)?' Events without a saved roster use recorded members only.':''}</p>`;
  }

  async function load(panel){
    const id=userId();
    if(!canRead())return;
    const button=panel.querySelector('[data-dash-att-refresh]');
    const select=panel.querySelector('select');
    const content=panel.querySelector('.dash-att-content');
    button.disabled=true;
    select.disabled=true;
    content.setAttribute('aria-busy','true');
    content.innerHTML='<p class="dash-att-message" role="status">Loading attendance...</p>';
    try{
      if(!pending||pending.user!==id){
        const request={user:id,promise:fetchData()};
        pending=request;
        request.promise.finally(()=>{if(pending===request)pending=null;}).catch(()=>{});
      }
      const events=await pending.promise;
      if(!panel.isConnected||userId()!==id||!canRead())return;
      renderChart(panel,events);
      panel.querySelector('select').onchange=event=>{mode=event.target.value;renderChart(panel,events);};
    }catch(error){
      if(panel.isConnected&&userId()===id){
        content.innerHTML='<p class="dash-att-message" role="alert">Could not load attendance. Select Refresh to try again.</p>';
        console.warn('Dashboard attendance load failed',error);
      }
    }finally{
      button.disabled=false;
      select.disabled=false;
      content.removeAttribute('aria-busy');
    }
  }

  function mount(){
    if(document.body.dataset.event!=='dashboard'||!canRead())return;
    const wrap=document.getElementById('teamsWrap');
    if(!wrap||wrap.querySelector('#dashAttendance'))return;
    const panel=document.createElement('section');
    panel.id='dashAttendance';
    panel.className='dash-panel dash-attendance';
    panel.setAttribute('aria-labelledby','dashAttendanceTitle');
    panel.innerHTML=`<div class="dash-att-head">
      <div><h2 id="dashAttendanceTitle"><i class="fa-solid fa-chart-column mr-2" aria-hidden="true"></i>Attendance Overview</h2><p>Latest 8 events \u00b7 Guild League &amp; Siege</p></div>
      <div class="dash-att-controls"><select class="edit-input" aria-label="Attendance chart view"><option value="actual">Actual attendance</option><option value="pre">Pre-attendance</option></select><button class="btn small" type="button" data-dash-att-refresh><i class="fa-solid fa-rotate mr-2" aria-hidden="true"></i>Refresh</button></div>
    </div><div class="dash-att-content"></div>`;
    panel.querySelector('select').value=mode;
    panel.querySelector('[data-dash-att-refresh]').addEventListener('click',()=>load(panel));
    wrap.appendChild(panel);
    load(panel);
  }

  function boot(){
    const wrap=document.getElementById('teamsWrap');
    if(!wrap)return;
    // Watch only dashboard replacement, not every icon, chart or member change.
    new MutationObserver(mount).observe(wrap,{childList:true});
    mount();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
