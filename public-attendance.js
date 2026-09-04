/* Read-only PRE attendance for published Guild League / Siege pages. */
(function(){
  'use strict';

  const STATUS={
    no_response:{label:'PRE ?',className:'pre-no-response'},
    going:{label:'PRE ✓',className:'pre-going'},
    not_going:{label:'PRE ✕',className:'pre-not-going'}
  };

  let cachedKey='';
  let statusByName=new Map();
  let loading=false;
  let queued=false;

  function isSupported(){
    const view=document.body&&document.body.dataset?document.body.dataset.view:'';
    return view==='guild'||view==='siege';
  }

  function eventMeta(){
    const view=document.body.dataset.view;
    const now=new Date();
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    if(view==='siege'){
      const delta=(0-today.getDay()+7)%7;
      const date=new Date(today);date.setDate(date.getDate()+delta);
      return {type:'siege',date:fmt(date)};
    }
    const tue=(2-today.getDay()+7)%7;
    const thu=(4-today.getDay()+7)%7;
    const target=tue<=thu?2:4;
    const date=new Date(today);date.setDate(date.getDate()+((target-today.getDay()+7)%7));
    return {type:target===2?'guild_league_tuesday':'guild_league_thursday',date:fmt(date)};
  }

  function fmt(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

  function cfgClient(){
    if(typeof client!=='undefined'&&client)return client;
    const cfg=window.TITANIA_CONFIG||{};
    const url=cfg.supabaseUrl||cfg.SUPABASE_URL;
    const key=cfg.supabasePublishableKey||cfg.SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key||!window.supabase)return null;
    return window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  }

  async function load(){
    if(!isSupported()||loading)return;
    const meta=eventMeta();
    const key=`${meta.type}:${meta.date}`;
    if(key===cachedKey){scheduleDecorate();return;}
    loading=true;
    try{
      const c=cfgClient();if(!c)return;
      const {data,error}=await c.rpc('get_public_pre_attendance',{p_view:document.body.dataset.view});
      if(error)throw error;
      cachedKey=key;
      statusByName=new Map();
      const rows=data&&typeof data==='object'&&data.statuses&&typeof data.statuses==='object'?data.statuses:{};
      Object.entries(rows).forEach(([name,status])=>statusByName.set(String(name),STATUS[status]?status:'no_response'));
    }catch(error){
      console.warn('Public pre-attendance unavailable',error);
    }finally{
      loading=false;
      scheduleDecorate();
    }
  }

  function scheduleDecorate(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;decorate();});
  }

  function decorate(){
    if(!isSupported())return;
    document.querySelectorAll('.slot .member-name').forEach(nameEl=>{
      const name=nameEl.textContent.trim();
      if(!name)return;
      let row=nameEl.closest('.member-name-row');
      if(!row){
        row=document.createElement('div');
        row.className='member-name-row';
        nameEl.parentNode.insertBefore(row,nameEl);
        row.appendChild(nameEl);
      }
      const status=statusByName.get(name)||'no_response';
      const meta=STATUS[status];
      let badge=row.querySelector('.public-pre-attendance');
      if(!badge){
        badge=document.createElement('span');
        row.appendChild(badge);
      }
      badge.className=`public-pre-attendance ${meta.className}`;
      badge.textContent=meta.label;
      badge.title=`Pre-attendance: ${status==='going'?'Going':status==='not_going'?'Not Going':'No Response'}`;
    });
  }

  function boot(){
    if(!isSupported())return;
    const content=document.getElementById('content')||document.body;
    const observer=new MutationObserver(()=>scheduleDecorate());
    observer.observe(content,{childList:true,subtree:true});
    load();
    setInterval(load,60000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
