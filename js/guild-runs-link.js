(function TitaniaGuildRunsLink(){
  'use strict';

  if(!(/\/$|\/index\.html$/i.test(location.pathname)))return;

  function addTab(){
    const tabs=document.getElementById('eventTabs');
    if(!tabs||tabs.querySelector('[data-event="runs"]'))return false;
    const attendance=tabs.querySelector('[data-event="attendance"]');
    if(!attendance)return false;

    const button=document.createElement('button');
    button.className='event-tab';
    button.dataset.event='runs';
    button.type='button';
    button.innerHTML='⚔ Runs';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href='./guild-runs.html';
    },true);
    attendance.insertAdjacentElement('afterend',button);
    return true;
  }

  function boot(){
    if(addTab())return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(addTab()||tries>=50)clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
