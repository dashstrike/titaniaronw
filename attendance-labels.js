/* Correct display labels for Titania attendance event types without changing stored event keys. */
(function(){
  'use strict';

  const LABELS={
    tuesday:'Guild League (Tuesday)',
    guild_league:'Guild League (Thursday)',
    siege:'Siege'
  };

  function setTextIfChanged(el,text){
    if(el&&el.textContent!==text)el.textContent=text;
  }

  function relabelCreateType(){
    const select=document.getElementById('attCreateType');
    if(!select)return;
    const tue=select.querySelector('option[value="tuesday"]');
    const thu=select.querySelector('option[value="guild_league"]');
    const siege=select.querySelector('option[value="siege"]');
    setTextIfChanged(tue,LABELS.tuesday);
    setTextIfChanged(thu,LABELS.guild_league);
    setTextIfChanged(siege,LABELS.siege);
  }

  function relabelQuickButtons(){
    const tue=document.querySelector('[data-att-quick="tuesday"]');
    const thu=document.querySelector('[data-att-quick="guild_league"]');
    const siege=document.querySelector('[data-att-quick="siege"]');
    setTextIfChanged(tue,'🛡️ GL Tuesday');
    setTextIfChanged(thu,'🛡️ GL Thursday');
    setTextIfChanged(siege,'🏰 Siege');
    if(tue)tue.title=tue.title.replace(/Tuesday Event/g,LABELS.tuesday);
    if(thu)tue&&0; // no-op; keeps relabel pass idempotent
    if(thu)thu.title=thu.title.replace(/Open Guild League on/g,'Open Guild League (Thursday) on');
  }

  function relabelHistory(){
    const select=document.getElementById('attEventSelect');
    if(!select)return;
    Array.from(select.options).forEach(option=>{
      if(!option.value)return;
      let text=option.textContent||'';
      text=text.replace(/Tuesday Event/g,LABELS.tuesday);
      text=text.replace(/ · Guild League(?= · CLOSED$|$)/g,` · ${LABELS.guild_league}`);
      setTextIfChanged(option,text);
    });
  }

  function relabelCurrentHeader(){
    const kicker=document.querySelector('.att-event-kicker');
    if(!kicker)return;
    let text=kicker.textContent||'';
    text=text.replace(/Tuesday Event/g,LABELS.tuesday);
    if(!/Guild League \(Tuesday\)/.test(text)){
      text=text.replace(/Guild League(?=$)/g,LABELS.guild_league);
    }
    setTextIfChanged(kicker,text);
  }

  function apply(){
    relabelCreateType();
    relabelQuickButtons();
    relabelHistory();
    relabelCurrentHeader();
  }

  function boot(){
    apply();
    const wrap=document.getElementById('teamsWrap')||document.body;
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;apply();});
    });
    observer.observe(wrap,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
