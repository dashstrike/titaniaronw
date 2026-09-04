/*
 * Titania pre-attendance controls for Guild League / Siege party slots.
 * Depends on the main index.html script having created supabaseClient/state/currentEvent.
 */
(function(){
  'use strict';

  const STATUS_META={
    no_response:{label:'PRE ?',className:'pre-no-response',next:'going'},
    going:{label:'PRE ✓',className:'pre-going',next:'not_going'},
    not_going:{label:'PRE ✕',className:'pre-not-going',next:'no_response'}
  };

  let cachedEventKey='';
  let cachedEventId='';
  let statusByMemberId=new Map();
  let loadingKey='';
  let observer=null;

  function canUseAttendance(){
    return typeof supabaseClient!=='undefined'&&supabaseClient&&typeof state!=='undefined'&&state&&Array.isArray(state.roster);
  }

  function plannerEventType(){
    if(typeof currentEvent==='undefined')return '';
    if(currentEvent==='guild_league')return 'guild_league';
    if(currentEvent==='siege')return 'siege';
    return '';
  }

  function nextEventDate(eventType){
    const targetDay=eventType==='guild_league'?4:eventType==='siege'?0:null;
    if(targetDay===null)return '';
    const now=new Date();
    const date=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const delta=(targetDay-date.getDay()+7)%7;
    date.setDate(date.getDate()+delta);
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,'0');
    const d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function currentKey(){
    const type=plannerEventType();
    if(!type)return '';
    return `${type}:${nextEventDate(type)}`;
  }

  function memberIdForName(name){
    const lower=String(name||'').trim().toLowerCase();
    const member=(state.roster||[]).find(item=>String(item&&item.name||'').trim().toLowerCase()===lower);
    return member?String(member.id||member.name):lower;
  }

  function memberNameForId(memberId){
    const member=(state.roster||[]).find(item=>String(item&&item.id||'')===String(memberId));
    return member?String(member.name||''):'';
  }

  function toast(title,message,type){
    try{
      if(typeof showToast==='function')showToast(title,message,type||'');
    }catch(_e){}
  }

  function canEdit(){
    try{return typeof userCanEdit==='function'?userCanEdit():true;}catch(_e){return true;}
  }

  async function ensureEventRow(eventType,eventDate){
    if(cachedEventId&&cachedEventKey===`${eventType}:${eventDate}`)return cachedEventId;
    let query=await supabaseClient.from('attendance_events').select('id').eq('event_type',eventType).eq('event_date',eventDate).maybeSingle();
    if(query.error)throw query.error;
    if(query.data&&query.data.id){cachedEventId=query.data.id;return cachedEventId;}

    const title=eventType==='guild_league'?'Guild League':'Siege';
    const insert=await supabaseClient.from('attendance_events').insert({event_type:eventType,event_date:eventDate,title,status:'upcoming'}).select('id').single();
    if(insert.error){
      if(String(insert.error.code||'')==='23505'){
        query=await supabaseClient.from('attendance_events').select('id').eq('event_type',eventType).eq('event_date',eventDate).single();
        if(query.error)throw query.error;
        cachedEventId=query.data.id;
        return cachedEventId;
      }
      throw insert.error;
    }
    cachedEventId=insert.data.id;
    return cachedEventId;
  }

  async function loadStatuses(force){
    if(!canUseAttendance())return;
    const key=currentKey();
    if(!key){
      cachedEventKey='';cachedEventId='';statusByMemberId=new Map();
      decorateSlots();
      return;
    }
    if(!force&&key===cachedEventKey&&loadingKey!==key){decorateSlots();return;}
    if(loadingKey===key)return;
    loadingKey=key;
    cachedEventKey=key;
    cachedEventId='';
    statusByMemberId=new Map();
    const [eventType,eventDate]=key.split(':');
    try{
      const eventRes=await supabaseClient.from('attendance_events').select('id').eq('event_type',eventType).eq('event_date',eventDate).maybeSingle();
      if(eventRes.error)throw eventRes.error;
      if(eventRes.data&&eventRes.data.id){
        cachedEventId=eventRes.data.id;
        const recordRes=await supabaseClient.from('attendance_records').select('member_id,pre_status').eq('event_id',cachedEventId);
        if(recordRes.error)throw recordRes.error;
        (recordRes.data||[]).forEach(row=>statusByMemberId.set(String(row.member_id),STATUS_META[row.pre_status]?row.pre_status:'no_response'));
      }
    }catch(error){
      if(String(error&&error.code||'')==='42P01'){
        toast('Attendance setup required','Run attendance_setup.sql in Supabase first.','warn');
      }else{
        console.warn('Attendance load failed',error);
      }
    }finally{
      loadingKey='';
      decorateSlots();
    }
  }

  function badgeHtml(status,memberId,name){
    const meta=STATUS_META[status]||STATUS_META.no_response;
    return `<button type="button" class="pre-attendance-badge ${meta.className}" data-pre-member-id="${escapeHtmlAttr(memberId)}" data-pre-member-name="${escapeHtmlAttr(name)}" data-pre-status="${status}" title="Pre-attendance: ${status==='going'?'Going':status==='not_going'?'Not Going':'No Response'}. Click to change.">${meta.label}</button>`;
  }

  function escapeHtmlAttr(value){
    return String(value==null?'':value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function decorateSlots(){
    const type=plannerEventType();
    document.querySelectorAll('.pre-attendance-badge').forEach(el=>{if(!type)el.remove();});
    if(!type)return;

    document.querySelectorAll('#teamsWrap .slot.filled').forEach(slot=>{
      const nameEl=slot.querySelector('.slot-name');
      if(!nameEl)return;
      const name=nameEl.textContent.trim();
      const memberId=memberIdForName(name);
      if(!memberId)return;
      let row=nameEl.closest('.slot-name-row');
      if(!row){
        row=document.createElement('span');
        row.className='slot-name-row';
        nameEl.parentNode.insertBefore(row,nameEl);
        row.appendChild(nameEl);
      }
      let badge=row.querySelector('.pre-attendance-badge');
      const status=statusByMemberId.get(memberId)||'no_response';
      if(!badge){
        row.insertAdjacentHTML('beforeend',badgeHtml(status,memberId,name));
        badge=row.querySelector('.pre-attendance-badge');
      }else{
        const meta=STATUS_META[status]||STATUS_META.no_response;
        badge.className=`pre-attendance-badge ${meta.className}`;
        badge.dataset.preMemberId=memberId;
        badge.dataset.preMemberName=name;
        badge.dataset.preStatus=status;
        badge.textContent=meta.label;
      }
    });
  }

  async function handleBadgeClick(badge){
    if(!canEdit()){
      toast('Read-only access','Your account cannot change pre-attendance.','warn');
      return;
    }
    const key=currentKey();
    if(!key)return;
    const [eventType,eventDate]=key.split(':');
    const memberId=String(badge.dataset.preMemberId||'');
    const memberName=String(badge.dataset.preMemberName||memberNameForId(memberId)||'');
    const current=STATUS_META[badge.dataset.preStatus]?badge.dataset.preStatus:'no_response';
    const next=STATUS_META[current].next;

    badge.classList.add('pre-saving');
    badge.disabled=true;
    try{
      const eventId=await ensureEventRow(eventType,eventDate);
      const result=await supabaseClient.from('attendance_records').upsert({
        event_id:eventId,
        member_id:memberId,
        member_name:memberName,
        pre_status:next
      },{onConflict:'event_id,member_id'}).select('pre_status').single();
      if(result.error)throw result.error;
      statusByMemberId.set(memberId,result.data&&STATUS_META[result.data.pre_status]?result.data.pre_status:next);
      decorateSlots();
    }catch(error){
      if(String(error&&error.code||'')==='42P01')toast('Attendance setup required','Run attendance_setup.sql in Supabase first.','warn');
      else toast('Attendance save failed',String(error&&error.message||error),'err');
    }finally{
      badge.disabled=false;
      badge.classList.remove('pre-saving');
    }
  }

  function wireClicks(){
    document.addEventListener('pointerdown',event=>{
      if(event.target.closest('.pre-attendance-badge'))event.stopPropagation();
    },true);
    document.addEventListener('click',event=>{
      const badge=event.target.closest('.pre-attendance-badge');
      if(!badge)return;
      event.preventDefault();event.stopPropagation();
      handleBadgeClick(badge);
    },true);
  }

  function startObserver(){
    const root=document.getElementById('app')||document.body;
    observer=new MutationObserver(()=>{
      decorateSlots();
      const key=currentKey();
      if(key&&key!==cachedEventKey)loadStatuses(true);
    });
    observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-event']});
  }

  function boot(){
    let attempts=0;
    const wait=setInterval(()=>{
      attempts++;
      if(canUseAttendance()){
        clearInterval(wait);
        wireClicks();
        startObserver();
        loadStatuses(true);
      }else if(attempts>120){clearInterval(wait);}
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
