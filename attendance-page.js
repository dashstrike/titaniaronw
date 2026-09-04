/* Titania Attendance Records page - actual attendance + event history. */
(function(){
  'use strict';

  const EVENT_META={
    tuesday:{label:'Tuesday Event',short:'Tuesday',day:2,icon:'📅'},
    guild_league:{label:'Guild League',short:'GL',day:4,icon:'🛡️'},
    siege:{label:'Siege',short:'Siege',day:0,icon:'🏰'}
  };
  const PRE_META={
    going:{label:'GOING',symbol:'✓',className:'going'},
    not_going:{label:'NOT GOING',symbol:'✕',className:'not-going'},
    no_response:{label:'NO RESPONSE',symbol:'?',className:'no-response'}
  };
  const ACTUAL_META={
    not_checked:{label:'Not Checked',symbol:'—',className:'not-checked'},
    present:{label:'Present',symbol:'✓',className:'present'},
    absent:{label:'Absent',symbol:'✕',className:'absent'},
    excused:{label:'Excused',symbol:'E',className:'excused'}
  };

  let attendanceActive=false;
  let events=[];
  let selectedEvent=null;
  let records=new Map();
  let extendedSchemaSupported=true;
  let loading=false;
  let filters={search:'',pre:'all',actual:'all'};
  let teamsObserver=null;

  function appReady(){
    return typeof supabaseClient!=='undefined'&&supabaseClient&&typeof state!=='undefined'&&state&&Array.isArray(state.roster)&&document.getElementById('eventTabs')&&document.getElementById('teamsWrap');
  }
  function canEdit(){try{return typeof userCanEdit==='function'?userCanEdit():true;}catch(_e){return true;}}
  function toast(title,message,type){try{if(typeof showToast==='function')showToast(title,message,type||'');}catch(_e){}}
  function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function dateInputValue(date){const d=date instanceof Date?date:new Date(date);if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function parseLocalDate(value){const p=String(value||'').split('-').map(Number);if(p.length!==3||!p[0]||!p[1]||!p[2])return null;return new Date(p[0],p[1]-1,p[2]);}
  function formatEventDate(value){const d=parseLocalDate(value);if(!d)return String(value||'');return d.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});}
  function latestScheduledDate(eventType){const meta=EVENT_META[eventType];if(!meta)return dateInputValue(new Date());const d=new Date();d.setHours(0,0,0,0);const delta=(d.getDay()-meta.day+7)%7;d.setDate(d.getDate()-delta);return dateInputValue(d);}
  function eventTitle(event){if(!event)return 'Attendance';return String(event.title||'').trim()||((EVENT_META[event.event_type]||{}).label||event.event_type);}
  function normalizePre(value){return PRE_META[value]?value:'no_response';}
  function normalizeActual(value){return ACTUAL_META[value]?value:'not_checked';}

  function activeRosterSnapshot(){
    return (state.roster||[]).filter(member=>String(member&&member.status||'active').toLowerCase()!=='inactive').map(member=>({memberId:String(member.id||member.name||''),name:String(member.name||''),cls:String(member.cls||'Unknown'),gr:Number(member.gr)||0}));
  }
  function partyLabel(key){try{if(typeof displayTeamLabel==='function')return String(displayTeamLabel(key));}catch(_e){}const m=String(key).match(/(\d+)$/);return `Party ${m?m[1]:'?'}`;}
  function raidForKey(key){try{if(typeof raidForTeam==='function'){const raid=raidForTeam(key);if(raid)return raid;}}catch(_e){}return null;}
  function lineupSnapshot(eventType){
    const roster=activeRosterSnapshot();
    if(eventType!=='guild_league'&&eventType!=='siege')return {version:1,capturedAt:new Date().toISOString(),eventType,roster,lineup:[]};
    const memberMap=new Map(roster.map(member=>[member.name.toLowerCase(),member]));
    const lineup=[];
    const assignments=state.assignments&&typeof state.assignments==='object'?state.assignments:{};
    const keys=Object.keys(assignments).filter(key=>eventType==='guild_league'?(/^(main_|sub_)/.test(key)):(/^siege_(main_|sub_)/.test(key)));
    keys.forEach(key=>{
      const raid=raidForKey(key);
      const groupLabel=eventType==='guild_league'?(key.startsWith('main_')?'Main Battlefield':'Sub Battlefield'):'';
      const raidLabel=raid&&raid.label?String(raid.label):'Raid ?';
      const party=partyLabel(key);
      const partyNum=Number((party.match(/\d+/)||[])[0]||999);
      const raidNum=Number((raidLabel.match(/\d+/)||[])[0]||999);
      (Array.isArray(assignments[key])?assignments[key]:[]).forEach((name,slot)=>{if(!name)return;const member=memberMap.get(String(name).toLowerCase());lineup.push({memberId:member?member.memberId:String(name).toLowerCase(),memberName:String(name),teamKey:key,partyLabel:party,raidId:raid&&raid.id?String(raid.id):'',raidLabel,groupLabel,raidOrder:raidNum,partyOrder:partyNum,slot:Number(slot)||0});});
    });
    return {version:1,capturedAt:new Date().toISOString(),eventType,roster,lineup};
  }
  function isEmptySnapshot(snapshot){return !snapshot||typeof snapshot!=='object'||!Array.isArray(snapshot.roster)||snapshot.roster.length===0;}

  async function fetchEvents(){
    let select='id,event_type,event_date,title,status,created_at,updated_at,lineup_snapshot,closed_at';
    let result=await supabaseClient.from('attendance_events').select(select).order('event_date',{ascending:false}).order('created_at',{ascending:false}).limit(60);
    if(result.error&&String(result.error.code||'')==='42703'){extendedSchemaSupported=false;result=await supabaseClient.from('attendance_events').select('id,event_type,event_date,title,status,created_at,updated_at').order('event_date',{ascending:false}).order('created_at',{ascending:false}).limit(60);}
    if(result.error)throw result.error;
    events=(result.data||[]).map(row=>({...row,lineup_snapshot:row.lineup_snapshot||null,closed_at:row.closed_at||null}));
  }
  async function fetchRecords(eventId){
    const result=await supabaseClient.from('attendance_records').select('id,event_id,member_id,member_name,pre_status,actual_status,note,pre_updated_at,actual_updated_at,updated_at').eq('event_id',eventId);
    if(result.error)throw result.error;
    records=new Map();
    (result.data||[]).forEach(row=>records.set(String(row.member_id),{...row,pre_status:normalizePre(row.pre_status),actual_status:normalizeActual(row.actual_status)}));
  }
  async function ensureSnapshot(event){
    if(!event||!extendedSchemaSupported||!isEmptySnapshot(event.lineup_snapshot)||!canEdit())return;
    const snapshot=lineupSnapshot(event.event_type);
    const update=await supabaseClient.from('attendance_events').update({lineup_snapshot:snapshot}).eq('id',event.id).select('lineup_snapshot').single();
    if(update.error){if(String(update.error.code||'')==='42703')extendedSchemaSupported=false;else console.warn('Attendance snapshot save failed',update.error);return;}
    event.lineup_snapshot=update.data&&update.data.lineup_snapshot?update.data.lineup_snapshot:snapshot;
  }
  async function loadEvent(eventId){
    const event=events.find(item=>String(item.id)===String(eventId));if(!event)return;selectedEvent=event;loading=true;renderShell();
    try{await fetchRecords(event.id);await ensureSnapshot(event);}catch(error){console.error(error);toast('Attendance load failed',String(error&&error.message||error),'err');}finally{loading=false;renderShell();}
  }
  async function openOrCreateEvent(eventType,eventDate){
    if(!EVENT_META[eventType]||!eventDate)return;loading=true;renderShell();
    try{
      let result=await supabaseClient.from('attendance_events').select(extendedSchemaSupported?'id,event_type,event_date,title,status,created_at,updated_at,lineup_snapshot,closed_at':'id,event_type,event_date,title,status,created_at,updated_at').eq('event_type',eventType).eq('event_date',eventDate).maybeSingle();
      if(result.error&&String(result.error.code||'')==='42703'){extendedSchemaSupported=false;result=await supabaseClient.from('attendance_events').select('id,event_type,event_date,title,status,created_at,updated_at').eq('event_type',eventType).eq('event_date',eventDate).maybeSingle();}
      if(result.error)throw result.error;
      let event=result.data;
      if(!event){
        if(!canEdit())throw new Error('Only Leader/Admin accounts can create an attendance event.');
        const payload={event_type:eventType,event_date:eventDate,title:EVENT_META[eventType].label,status:'open'};
        if(extendedSchemaSupported)payload.lineup_snapshot=lineupSnapshot(eventType);
        let insert=await supabaseClient.from('attendance_events').insert(payload).select(extendedSchemaSupported?'id,event_type,event_date,title,status,created_at,updated_at,lineup_snapshot,closed_at':'id,event_type,event_date,title,status,created_at,updated_at').single();
        if(insert.error&&String(insert.error.code||'')==='42703'){extendedSchemaSupported=false;delete payload.lineup_snapshot;insert=await supabaseClient.from('attendance_events').insert(payload).select('id,event_type,event_date,title,status,created_at,updated_at').single();}
        if(insert.error)throw insert.error;event=insert.data;
      }
      await fetchEvents();const selected=events.find(item=>String(item.id)===String(event.id))||event;selectedEvent=selected;await fetchRecords(selected.id);await ensureSnapshot(selected);selectedEvent=selected;
    }catch(error){toast('Attendance event failed',String(error&&error.message||error),'err');}finally{loading=false;renderShell();}
  }

  function membersForEvent(){
    if(!selectedEvent)return [];
    let snapshot=selectedEvent.lineup_snapshot;if(isEmptySnapshot(snapshot))snapshot=lineupSnapshot(selectedEvent.event_type);
    const rosterSource=Array.isArray(snapshot&&snapshot.roster)&&snapshot.roster.length?snapshot.roster:activeRosterSnapshot();
    const lineupSource=Array.isArray(snapshot&&snapshot.lineup)?snapshot.lineup:[];
    const assignmentById=new Map();lineupSource.forEach(item=>{if(item&&item.memberId)assignmentById.set(String(item.memberId),item);});
    const memberRows=[];const seen=new Set();
    rosterSource.forEach(member=>{const id=String(member.memberId||member.id||member.name||'');if(!id||seen.has(id))return;seen.add(id);const record=records.get(id)||null;const assignment=assignmentById.get(id)||null;memberRows.push({memberId:id,name:String(member.name||record&&record.member_name||'Unknown'),cls:String(member.cls||'Unknown'),gr:Number(member.gr)||0,pre_status:normalizePre(record&&record.pre_status),actual_status:normalizeActual(record&&record.actual_status),note:String(record&&record.note||''),assignment});});
    records.forEach((record,id)=>{if(seen.has(id))return;memberRows.push({memberId:id,name:String(record.member_name||'Unknown'),cls:'Unknown',gr:0,pre_status:normalizePre(record.pre_status),actual_status:normalizeActual(record.actual_status),note:String(record.note||''),assignment:assignmentById.get(id)||null});});
    return memberRows;
  }
  function attendanceCounts(rows){const out={going:0,not_going:0,no_response:0,present:0,absent:0,excused:0,not_checked:0};rows.forEach(row=>{out[row.pre_status]=(out[row.pre_status]||0)+1;out[row.actual_status]=(out[row.actual_status]||0)+1;});return out;}
  function filteredRows(rows){const q=filters.search.trim().toLowerCase();return rows.filter(row=>{if(filters.pre!=='all'&&row.pre_status!==filters.pre)return false;if(filters.actual!=='all'&&row.actual_status!==filters.actual)return false;if(q&&!`${row.name} ${row.cls} ${row.assignment&&row.assignment.partyLabel||''} ${row.assignment&&row.assignment.raidLabel||''}`.toLowerCase().includes(q))return false;return true;});}
  function groupRows(rows){
    const groups=new Map();rows.forEach(row=>{const a=row.assignment;let key='unassigned';let label=selectedEvent&&selectedEvent.event_type==='tuesday'?'All Members':'Unassigned / Reserve';let order=9999;if(a){const group=String(a.groupLabel||'');label=group?`${group} · ${a.raidLabel||'Raid ?'}`:(a.raidLabel||'Raid ?');key=`${group}|${a.raidId||a.raidLabel}`;const sectionOrder=group==='Main Battlefield'?0:group==='Sub Battlefield'?100:0;order=sectionOrder+(Number(a.raidOrder)||999);}if(!groups.has(key))groups.set(key,{key,label,order,rows:[]});groups.get(key).rows.push(row);});
    const result=[...groups.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label));result.forEach(group=>group.rows.sort((a,b)=>{const aa=a.assignment,bb=b.assignment;const pa=aa?Number(aa.partyOrder)||999:999,pb=bb?Number(bb.partyOrder)||999:999,sa=aa?Number(aa.slot)||0:0,sb=bb?Number(bb.slot)||0:0;return pa-pb||sa-sb||a.name.localeCompare(b.name);}));return result;
  }
  function summaryChip(value,label,className){return `<div class="att-summary-chip ${className||''}"><b>${value}</b><span>${esc(label)}</span></div>`;}
  function statusPill(type,status){const meta=type==='pre'?PRE_META[status]:ACTUAL_META[status];return `<span class="att-${type}-pill ${meta.className}"><b>${esc(meta.symbol)}</b>${esc(meta.label)}</span>`;}
  function actualControls(row){const disabled=!canEdit()||selectedEvent.status==='closed';return `<div class="att-actual-buttons" data-member="${esc(row.memberId)}">${['present','absent','excused','not_checked'].map(status=>{const meta=ACTUAL_META[status];return `<button type="button" class="att-actual-btn ${meta.className}${row.actual_status===status?' active':''}" data-att-actual="${status}" data-member-id="${esc(row.memberId)}" ${disabled?'disabled':''} title="${esc(meta.label)}"><span>${esc(meta.symbol)}</span><em>${esc(meta.label)}</em></button>`;}).join('')}</div>`;}

  function renderMemberGroups(){
    const container=document.getElementById('attendanceMemberGroups');if(!container||!selectedEvent)return;const rows=filteredRows(membersForEvent()),groups=groupRows(rows);if(!rows.length){container.innerHTML='<div class="att-empty">No members match the current filters.</div>';return;}
    container.innerHTML=groups.map(group=>{const present=group.rows.filter(row=>row.actual_status==='present').length,assigned=group.rows.length;return `<section class="att-group"><div class="att-group-head"><div><b>${esc(group.label)}</b><span>${assigned} member${assigned===1?'':'s'}</span></div><strong>${present}/${assigned} Present</strong></div><div class="att-member-list">${group.rows.map(row=>`<div class="att-member-row ${row.actual_status}"><div class="att-member-main"><span class="class-dot" style="background:${typeof classColor==='function'?classColor(row.cls):'#8b93b0'};color:${typeof classColor==='function'?classColor(row.cls):'#8b93b0'}"></span><div><b>${esc(row.name)}</b><span>${esc(row.cls)}</span></div></div><div class="att-party">${row.assignment?`<b>${esc(row.assignment.partyLabel||'')}</b><span>${esc(row.assignment.raidLabel||'')}</span>`:'<span>Reserve / Unassigned</span>'}</div><div class="att-pre-cell">${statusPill('pre',row.pre_status)}</div><div class="att-actual-cell">${actualControls(row)}</div><button type="button" class="att-note-btn ${row.note?'has-note':''}" data-att-note="${esc(row.memberId)}" title="${row.note?esc(row.note):'Add note'}">📝</button></div>`).join('')}</div></section>`;}).join('');
  }
  function renderEventPanel(){
    const panel=document.getElementById('attendanceEventPanel');if(!panel)return;if(loading){panel.innerHTML='<div class="att-loading"><span></span>Loading attendance…</div>';return;}if(!selectedEvent){panel.innerHTML='<div class="att-empty"><b>No attendance event selected.</b><span>Choose a recent event above or create/open one by date.</span></div>';return;}
    const rows=membersForEvent(),counts=attendanceCounts(rows),decided=counts.present+counts.absent,attendanceRate=decided?Math.round(counts.present/decided*100):0,closed=selectedEvent.status==='closed';
    panel.innerHTML=`<div class="att-event-head"><div><span class="att-event-kicker">${esc((EVENT_META[selectedEvent.event_type]||{}).icon||'📋')} ${esc(eventTitle(selectedEvent))}</span><h2>${esc(formatEventDate(selectedEvent.event_date))}</h2><p>${closed?'Attendance finalized':'Mark the members shown in the game/screenshot. Changes save immediately.'}</p></div><div class="att-event-actions"><button class="btn small" id="attRefreshBtn">↻ Refresh</button>${canEdit()?(closed?'<button class="btn small" id="attReopenBtn">↺ Reopen</button>':'<button class="btn small primary" id="attFinishBtn">✓ Finish Attendance</button>'):''}</div></div><div class="att-summary-grid">${summaryChip(counts.going,'Pre Going','going')}${summaryChip(counts.not_going,'Pre Not Going','not-going')}${summaryChip(counts.no_response,'No Response','no-response')}${summaryChip(counts.present,'Present','present')}${summaryChip(counts.absent,'Absent','absent')}${summaryChip(counts.excused,'Excused','excused')}${summaryChip(counts.not_checked,'Not Checked','not-checked')}${summaryChip(`${attendanceRate}%`,'Attendance Rate','rate')}</div><div class="att-filterbar"><input id="attSearch" type="search" placeholder="Search member, class, party…" value="${esc(filters.search)}"><select id="attPreFilter"><option value="all">All Pre</option><option value="going">Going</option><option value="not_going">Not Going</option><option value="no_response">No Response</option></select><select id="attActualFilter"><option value="all">All Actual</option><option value="not_checked">Not Checked</option><option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option></select></div><div class="att-column-head"><span>Member</span><span>Party</span><span>Pre</span><span>Actual</span><span></span></div><div id="attendanceMemberGroups"></div>`;
    const pre=document.getElementById('attPreFilter');if(pre)pre.value=filters.pre;const actual=document.getElementById('attActualFilter');if(actual)actual.value=filters.actual;renderMemberGroups();wireEventPanel();
  }
  function renderShell(){
    if(!attendanceActive)return;const wrap=document.getElementById('teamsWrap');if(!wrap)return;if(!document.getElementById('attendancePage'))wrap.innerHTML=`<div class="attendance-page" id="attendancePage"><div class="att-page-head"><div><span>📋</span><div><h1>ATTENDANCE</h1><p>Pre-attendance vs actual event attendance history.</p></div></div><span class="att-autosave">● Supabase records</span></div><div class="att-picker-card"><div class="att-picker-row"><label class="att-grow"><span>Attendance History</span><select id="attEventSelect"><option value="">Select event…</option></select></label><div class="att-quick" id="attQuickButtons"></div></div><div class="att-create-row"><label><span>Event Type</span><select id="attCreateType"><option value="tuesday">Tuesday Event</option><option value="guild_league">Guild League</option><option value="siege">Siege</option></select></label><label><span>Date</span><input id="attCreateDate" type="date" value="${dateInputValue(new Date())}"></label><button class="btn primary" id="attOpenCreateBtn">Open / Create</button></div>${extendedSchemaSupported?'':'<div class="att-schema-note">For permanent lineup snapshots, rerun the latest <b>attendance_setup.sql</b>.</div>'}</div><div id="attendanceEventPanel"></div></div>`;renderPicker();renderEventPanel();updateHeaderForAttendance();
  }
  function renderPicker(){const select=document.getElementById('attEventSelect');if(select){const selectedId=selectedEvent?String(selectedEvent.id):'';select.innerHTML='<option value="">Select event…</option>'+events.map(event=>`<option value="${esc(event.id)}" ${String(event.id)===selectedId?'selected':''}>${esc(formatEventDate(event.event_date))} · ${esc(eventTitle(event))}${event.status==='closed'?' · CLOSED':''}</option>`).join('');}const quick=document.getElementById('attQuickButtons');if(quick)quick.innerHTML=['tuesday','guild_league','siege'].map(type=>{const meta=EVENT_META[type],date=latestScheduledDate(type);return `<button class="btn small" data-att-quick="${type}" data-att-date="${date}" title="Open ${esc(meta.label)} on ${esc(formatEventDate(date))}">${meta.icon} ${esc(meta.short)}</button>`;}).join('');wirePicker();}
  function wirePicker(){const select=document.getElementById('attEventSelect');if(select&&!select.dataset.wired){select.dataset.wired='1';select.addEventListener('change',()=>{if(select.value)loadEvent(select.value);});}document.querySelectorAll('[data-att-quick]').forEach(button=>{if(button.dataset.wired)return;button.dataset.wired='1';button.addEventListener('click',()=>openOrCreateEvent(button.dataset.attQuick,button.dataset.attDate));});const type=document.getElementById('attCreateType'),date=document.getElementById('attCreateDate');if(type&&!type.dataset.wired){type.dataset.wired='1';type.addEventListener('change',()=>{if(date)date.value=latestScheduledDate(type.value);});}const open=document.getElementById('attOpenCreateBtn');if(open&&!open.dataset.wired){open.dataset.wired='1';open.addEventListener('click',()=>openOrCreateEvent(type?type.value:'guild_league',date?date.value:''));}}
  function wireEventPanel(){const search=document.getElementById('attSearch');if(search)search.addEventListener('input',()=>{filters.search=search.value;renderMemberGroups();});const pre=document.getElementById('attPreFilter');if(pre)pre.addEventListener('change',()=>{filters.pre=pre.value;renderMemberGroups();});const actual=document.getElementById('attActualFilter');if(actual)actual.addEventListener('change',()=>{filters.actual=actual.value;renderMemberGroups();});const refresh=document.getElementById('attRefreshBtn');if(refresh)refresh.addEventListener('click',refreshSelectedEvent);const finish=document.getElementById('attFinishBtn');if(finish)finish.addEventListener('click',finishAttendance);const reopen=document.getElementById('attReopenBtn');if(reopen)reopen.addEventListener('click',reopenAttendance);}

  async function saveActual(memberId,status){
    if(!selectedEvent||!canEdit()||selectedEvent.status==='closed')return;const rows=membersForEvent(),member=rows.find(row=>row.memberId===memberId);if(!member)return;const old=records.get(memberId)||null;records.set(memberId,{...(old||{}),event_id:selectedEvent.id,member_id:memberId,member_name:member.name,pre_status:member.pre_status,actual_status:status,note:member.note||''});renderEventPanel();
    try{const payload={event_id:selectedEvent.id,member_id:memberId,member_name:member.name,pre_status:member.pre_status,actual_status:status,note:member.note||''};const result=await supabaseClient.from('attendance_records').upsert(payload,{onConflict:'event_id,member_id'}).select('id,event_id,member_id,member_name,pre_status,actual_status,note,pre_updated_at,actual_updated_at,updated_at').single();if(result.error)throw result.error;records.set(memberId,{...result.data,pre_status:normalizePre(result.data.pre_status),actual_status:normalizeActual(result.data.actual_status)});if(selectedEvent.status==='upcoming'){selectedEvent.status='open';await supabaseClient.from('attendance_events').update({status:'open'}).eq('id',selectedEvent.id);}renderEventPanel();}catch(error){if(old)records.set(memberId,old);else records.delete(memberId);renderEventPanel();toast('Attendance save failed',String(error&&error.message||error),'err');}
  }
  async function saveNote(memberId){if(!selectedEvent||!canEdit())return;const member=membersForEvent().find(row=>row.memberId===memberId);if(!member)return;const next=window.prompt(`Attendance note for ${member.name}`,member.note||'');if(next===null)return;const note=String(next).trim().slice(0,500),payload={event_id:selectedEvent.id,member_id:memberId,member_name:member.name,pre_status:member.pre_status,actual_status:member.actual_status,note};const result=await supabaseClient.from('attendance_records').upsert(payload,{onConflict:'event_id,member_id'}).select('id,event_id,member_id,member_name,pre_status,actual_status,note,pre_updated_at,actual_updated_at,updated_at').single();if(result.error){toast('Note save failed',String(result.error.message||result.error),'err');return;}records.set(memberId,{...result.data,pre_status:normalizePre(result.data.pre_status),actual_status:normalizeActual(result.data.actual_status)});renderEventPanel();}
  async function finishAttendance(){
    if(!selectedEvent||!canEdit())return;const rows=membersForEvent(),toAbsent=rows.filter(row=>row.pre_status==='going'&&row.actual_status==='not_checked'),message=toAbsent.length?`Finish this attendance? ${toAbsent.length} member${toAbsent.length===1?'':'s'} who said GOING but are still Not Checked will be marked ABSENT.`:'Finish and close this attendance record?';if(!window.confirm(message))return;loading=true;renderEventPanel();
    try{if(toAbsent.length){const payload=toAbsent.map(row=>({event_id:selectedEvent.id,member_id:row.memberId,member_name:row.name,pre_status:row.pre_status,actual_status:'absent',note:row.note||''}));const result=await supabaseClient.from('attendance_records').upsert(payload,{onConflict:'event_id,member_id'}).select('id');if(result.error)throw result.error;}const updatePayload={status:'closed'};if(extendedSchemaSupported)updatePayload.closed_at=new Date().toISOString();let close=await supabaseClient.from('attendance_events').update(updatePayload).eq('id',selectedEvent.id);if(close.error&&String(close.error.code||'')==='42703'){extendedSchemaSupported=false;close=await supabaseClient.from('attendance_events').update({status:'closed'}).eq('id',selectedEvent.id);}if(close.error)throw close.error;selectedEvent.status='closed';await fetchRecords(selectedEvent.id);await fetchEvents();selectedEvent=events.find(event=>String(event.id)===String(selectedEvent.id))||selectedEvent;toast('Attendance finalized','Actual attendance has been saved.');}catch(error){toast('Finish attendance failed',String(error&&error.message||error),'err');}finally{loading=false;renderShell();}
  }
  async function reopenAttendance(){if(!selectedEvent||!canEdit()||!window.confirm('Reopen this attendance record for editing?'))return;let payload={status:'open'};if(extendedSchemaSupported)payload.closed_at=null;let result=await supabaseClient.from('attendance_events').update(payload).eq('id',selectedEvent.id);if(result.error&&String(result.error.code||'')==='42703'){extendedSchemaSupported=false;result=await supabaseClient.from('attendance_events').update({status:'open'}).eq('id',selectedEvent.id);}if(result.error){toast('Reopen failed',String(result.error.message||result.error),'err');return;}selectedEvent.status='open';renderShell();}
  async function refreshSelectedEvent(){if(!selectedEvent)return;loading=true;renderEventPanel();try{await fetchEvents();const refreshed=events.find(event=>String(event.id)===String(selectedEvent.id));if(refreshed)selectedEvent=refreshed;await fetchRecords(selectedEvent.id);await ensureSnapshot(selectedEvent);}catch(error){toast('Refresh failed',String(error&&error.message||error),'err');}finally{loading=false;renderShell();}}
  function updateHeaderForAttendance(){const stats=document.getElementById('statsRow');if(stats){const rows=selectedEvent?membersForEvent():[],counts=attendanceCounts(rows);stats.innerHTML=`<div class="stat-chip"><b>${rows.length}</b><span>Members</span></div><div class="stat-chip"><b>${counts.going||0}</b><span>Pre Going</span></div><div class="stat-chip"><b>${counts.present||0}</b><span>Present</span></div><div class="stat-chip ${counts.absent?'warn':''}"><b>${counts.absent||0}</b><span>Absent</span></div>`;}}

  function showAttendance(){
    attendanceActive=true;document.body.classList.add('attendance-view');document.body.dataset.event='attendance';const bodyWrap=document.getElementById('bodyWrap');if(bodyWrap){bodyWrap.classList.add('dashboard-mode');bodyWrap.dataset.event='attendance';}const hint=document.getElementById('hintBar');if(hint)hint.hidden=true;const action=document.getElementById('eventActionRow');if(action)action.hidden=true;const auto=document.getElementById('autoFillBtn');if(auto)auto.hidden=true;document.querySelectorAll('.event-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.event==='attendance'));renderShell();updateHeaderForAttendance();
    if(!events.length&&!loading){loading=true;renderShell();fetchEvents().then(()=>{if(!selectedEvent&&events.length){const today=dateInputValue(new Date());selectedEvent=events.find(event=>event.event_date<=today)||events[0];if(selectedEvent)return fetchRecords(selectedEvent.id).then(()=>ensureSnapshot(selectedEvent));}}).catch(error=>{if(String(error&&error.code||'')==='42P01')toast('Attendance setup required','Run attendance_setup.sql in Supabase first.','warn');else toast('Attendance load failed',String(error&&error.message||error),'err');}).finally(()=>{loading=false;renderShell();updateHeaderForAttendance();});}
  }
  function leaveAttendance(){if(!attendanceActive)return;attendanceActive=false;document.body.classList.remove('attendance-view');const hint=document.getElementById('hintBar');if(hint)hint.hidden=false;const bodyWrap=document.getElementById('bodyWrap');if(bodyWrap)bodyWrap.classList.remove('dashboard-mode');}
  function injectTab(){const tabs=document.getElementById('eventTabs');if(!tabs||tabs.querySelector('[data-event="attendance"]'))return;const button=document.createElement('button');button.className='event-tab att-tab';button.dataset.event='attendance';button.type='button';button.innerHTML='📋 Attendance';button.setAttribute('aria-label','Attendance records');const polarity=tabs.querySelector('[data-event="polarity_zone"]');if(polarity)tabs.insertBefore(button,polarity);else tabs.appendChild(button);}
  function wireGlobal(){
    document.addEventListener('click',event=>{const tab=event.target.closest('.event-tab');if(tab&&tab.dataset.event==='attendance'){event.preventDefault();event.stopImmediatePropagation();showAttendance();return;}if(tab&&attendanceActive&&tab.dataset.event!=='attendance')leaveAttendance();},true);
    document.addEventListener('click',event=>{if(!attendanceActive)return;const actual=event.target.closest('[data-att-actual]');if(actual){event.preventDefault();saveActual(String(actual.dataset.memberId||''),String(actual.dataset.attActual||''));return;}const note=event.target.closest('[data-att-note]');if(note){event.preventDefault();saveNote(String(note.dataset.attNote||''));}});
  }
  function watchTeamsWrap(){const wrap=document.getElementById('teamsWrap');if(!wrap)return;teamsObserver=new MutationObserver(()=>{if(attendanceActive&&!document.getElementById('attendancePage'))renderShell();});teamsObserver.observe(wrap,{childList:true});}
  function boot(){let attempts=0;const wait=setInterval(()=>{attempts++;if(appReady()){clearInterval(wait);injectTab();wireGlobal();watchTeamsWrap();}else if(attempts>120)clearInterval(wait);},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();