/* Read-only PRE attendance for published Guild League / Siege pages. */
(function(){
  'use strict';

  const STATUS={
    no_response:{label:'PRE ?',className:'pre-no-response'},
    going:{label:'PRE ✓',className:'pre-going'},
    not_going:{label:'PRE ✕',className:'pre-not-going'}
  };

  let cachedSignature='';
  let statusByName=new Map();
  let loading=false;
  let queued=false;

  function isSupported(){
    const view=document.body&&document.body.dataset?document.body.dataset.view:'';
    return view==='guild'||view==='siege';
  }

  function cfgClient(){
    if(typeof client!=='undefined'&&client)return client;
    const cfg=window.TITANIA_CONFIG||{};
    const url=cfg.supabaseUrl||cfg.SUPABASE_URL;
    const key=cfg.supabasePublishableKey||cfg.SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key||!window.supabase)return null;
    return window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  }

  async function load(force){
    if(!isSupported()||loading)return;
    loading=true;
    try{
      const c=cfgClient();if(!c)return;
      const view=document.body.dataset.view;
      const {data,error}=await c.rpc('get_public_lineup',{p_view:view});
      if(error)throw error;
      if(!data||data.published!==true){statusByName=new Map();cachedSignature='';scheduleDecorate();return;}
      const signature=`${data.attendanceEventType||''}:${data.attendanceEventDate||''}:${JSON.stringify(data.preAttendance||{})}`;
      if(!force&&signature===cachedSignature){scheduleDecorate();return;}
      cachedSignature=signature;
      statusByName=new Map();
      const rows=data.preAttendance&&typeof data.preAttendance==='object'?data.preAttendance:{};
      Object.entries(rows).forEach(([name,status])=>statusByName.set(String(name),STATUS[status]?status:'no_response'));
      scheduleDecorate();
    }catch(error){
      console.warn('Public pre-attendance unavailable',error);
    }finally{
      loading=false;
    }
  }

  function scheduleDecorate(){
    if(queued)return;
    queued=true;
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
    load(true);
    setInterval(()=>load(false),60000);
    const refresh=document.getElementById('refreshBtn');
    if(refresh)refresh.addEventListener('click',()=>setTimeout(()=>load(true),400));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
