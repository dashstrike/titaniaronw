(function TitaniaGuildRunsLink(){
  'use strict';

  if(!(/\/$|\/index\.html$/i.test(location.pathname)))return;

  const navIcons={
    dashboard:{icon:'fa-solid fa-chart-pie',label:'Dashboard'},
    manage_members:{icon:'fa-solid fa-users',label:'Members'},
    guild_league:{icon:'fa-solid fa-shield-heart',label:'Guild League'},
    siege:{icon:'fa-brands fa-fort-awesome',label:'Siege'},
    attendance:{icon:'fa-solid fa-list-check',label:'Attendance'},
    runs:{icon:'fa-solid fa-people-pulling',label:'Runs'}
  };

  function styleFontAwesomeTabs(){
    if(document.getElementById('titania-fa-nav-style'))return;
    const style=document.createElement('style');
    style.id='titania-fa-nav-style';
    style.textContent='.event-tab.active.gl{color:#0dcaf0!important}@media (max-width:720px){.event-tab.fa-nav-tab::before{display:none!important}.event-tab.fa-nav-tab i{font-size:21px!important;line-height:1}}@media (max-width:420px){.event-tab.fa-nav-tab i{font-size:20px!important}}';
    document.head.appendChild(style);
  }

  function applyIcons(tabs){
    Object.entries(navIcons).forEach(([event,meta])=>{
      const button=tabs.querySelector(`[data-event="${event}"]`);
      if(!button)return;
      button.classList.add('fa-nav-tab');
      button.innerHTML=`<i class="${meta.icon}" aria-hidden="true"></i> ${meta.label}`;
    });
  }

  function addTab(){
    const tabs=document.getElementById('eventTabs');
    if(!tabs)return false;

    if(!tabs.querySelector('[data-event="runs"]')){
      const attendance=tabs.querySelector('[data-event="attendance"]');
      if(!attendance)return false;

      const button=document.createElement('button');
      button.className='event-tab';
      button.dataset.event='runs';
      button.type='button';
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        location.href='./guild-runs.html';
      },true);
      attendance.insertAdjacentElement('afterend',button);
    }

    styleFontAwesomeTabs();
    applyIcons(tabs);
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
