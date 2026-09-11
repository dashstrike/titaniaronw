/* Replace generic Party Pool user icons with Titania job icons. */
(function TitaniaPartyPoolJobIcons(){
  'use strict';
  if(!(/\/$|\/index\.html$/i.test(location.pathname)))return;

  let iconMap={};
  let ready=false;

  function rosterByName(){
    const map=new Map();
    try{
      const roster=state&&Array.isArray(state.roster)?state.roster:[];
      roster.forEach(member=>{
        const name=String(member&&member.name||'').trim();
        if(name)map.set(name,member);
      });
    }catch(_e){}
    return map;
  }

  function decorate(){
    if(!ready)return;
    const members=rosterByName();
    document.querySelectorAll('.party-pool-member').forEach(row=>{
      if(row.dataset.jobIconReady==='1')return;
      const name=String(row.querySelector('span')&&row.querySelector('span').textContent||'').trim();
      const member=members.get(name);
      const file=member&&iconMap[member.cls];
      if(!file)return;
      const old=row.querySelector('i');
      const img=document.createElement('img');
      img.className='party-pool-job-icon';
      img.src=`./assets/images/job/${encodeURIComponent(file)}`;
      img.alt='';
      img.title=member.cls||'';
      if(old)old.replaceWith(img);else row.prepend(img);
      row.dataset.jobIconReady='1';
    });
  }

  async function boot(){
    try{
      const response=await fetch('./assets/images/job/job-icons.json?v=20260905-2',{cache:'force-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      iconMap=await response.json();
      ready=true;
    }catch(error){
      console.warn('[Titania] Could not load Party Pool job icons:',error);
      return;
    }

    const style=document.createElement('style');
    style.textContent='.party-pool-job-icon{width:18px;height:18px;object-fit:contain;flex:none;display:block}';
    document.head.appendChild(style);

    decorate();
    const list=document.getElementById('partyPoolList');
    if(list)new MutationObserver(decorate).observe(list,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
