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
    style.textContent='.event-tab.active.gl{color:#0dcaf0!important}.page-fa-icon{display:inline-block;width:1.15em;margin-right:8px;text-align:center}.att-page-head .page-fa-icon{font-size:24px;margin-right:0}#hintBar{display:none!important}@media (max-width:720px){.event-tab.fa-nav-tab::before{display:none!important}.event-tab.fa-nav-tab i{font-size:21px!important;line-height:1}}@media (max-width:420px){.event-tab.fa-nav-tab i{font-size:20px!important}}';
    document.head.appendChild(style);
  }

  function installHelpGuide(){
    const overlay=document.getElementById('guideOverlay');
    if(!overlay)return;
    const body=overlay.querySelector('.modal-body');
    if(!body)return;

    body.innerHTML=`
      <div class="guide-step"><div class="guide-step-num">1</div><div><b>Dashboard</b> — review guild statistics, class balance, Gear Rating distribution, top members, and recent membership history. Use the <b>Members</b> tab for roster changes.</div></div>
      <div class="guide-step"><div class="guide-step-num">2</div><div><b>Members</b> — add or edit members, change class and Gear Rating, mark members inactive when they leave, and reactivate them when they return. Changes autosave to Supabase.</div></div>
      <div class="guide-step"><div class="guide-step-num">3</div><div><b>Guild League & Siege</b> — drag a member onto a slot. Drag one filled slot onto another to swap. On any device, tap/click a member or filled slot, then tap another slot to place or swap. Use the slot ✕ to remove a member.</div></div>
      <div class="guide-step"><div class="guide-step-num">4</div><div><b>Siege Parties</b> — drag the ⠿ handle on a Party into another Raid. Each Raid must keep at least 1 Party and can hold up to 5.</div></div>
      <div class="guide-step"><div class="guide-step-num">5</div><div><b>Attendance</b> — open or create an event, mark actual attendance, use <b>Refresh Members</b> to reload the latest active roster and party list, then finish attendance when complete.</div></div>
      <div class="guide-step"><div class="guide-step-num">6</div><div><b>Runs</b> — create Time Echo or Mirage runs, open or close registration, review registered players, update status, and end or delete runs.</div></div>
      <div class="guide-step"><div class="guide-step-num">7</div><div><b>People leaving or returning</b> — use <b>Mark Inactive</b> instead of deleting a member. Inactive members leave current teams and disappear from the Member Pool. Reactivate them from Dashboard when they return.</div></div>
      <div class="guide-step"><div class="guide-step-num">8</div><div><b>Polarity Zone</b> — STAR and Normal Dungeon are grouped into raid rows. Moving a team from STAR copies it; moving a Normal Dungeon team moves it.</div></div>
      <div class="guide-step"><div class="guide-step-num">9</div><div><b>Website access</b> — Admin has full access. Party Organizer manages lineups and attendance. Attendance Auditor manages attendance only. Viewer is read-only.</div></div>
      <div class="guide-note">Use <b>Print/Share</b> for a clean lineup summary. Export/import contains the full roster, Guild Status, membership history, Guild League, Siege, Polarity Zone, and finished-dungeon marks.</div>
    `;
  }

  function applyIcons(tabs){
    Object.entries(navIcons).forEach(([event,meta])=>{
      const button=tabs.querySelector(`[data-event="${event}"]`);
      if(!button)return;
      button.classList.add('fa-nav-tab');
      button.innerHTML=`<i class="${meta.icon}" aria-hidden="true"></i> ${meta.label}`;
    });
  }

  function currentEvent(tabs){
    const active=tabs&&tabs.querySelector('.event-tab.active');
    return active&&active.dataset.event?active.dataset.event:String(document.body.dataset.event||'');
  }

  function setSectionTitleIcon(element,event,label){
    const meta=navIcons[event];
    if(!element||!meta)return;
    element.innerHTML=`<i class="${meta.icon} page-fa-icon" aria-hidden="true"></i>${label}`;
  }

  function applyPageHeadingIcon(){
    const tabs=document.getElementById('eventTabs');
    if(!tabs)return;
    const event=currentEvent(tabs);

    if(event==='dashboard'){
      const title=[...document.querySelectorAll('.section-title')].find(el=>el.textContent.includes('Guild Dashboard'));
      setSectionTitleIcon(title,event,'Guild Dashboard');
      return;
    }

    if(event==='manage_members'){
      const title=[...document.querySelectorAll('.section-title')].find(el=>el.textContent.includes('Manage Members'));
      setSectionTitleIcon(title,event,'Manage Members');
      return;
    }

    if(event==='guild_league'||event==='siege'){
      const title=[...document.querySelectorAll('.section-title')].find(el=>el.textContent.includes('Main Battlefield'));
      setSectionTitleIcon(title,event,'Main Battlefield');
      return;
    }

    if(event==='attendance'){
      const icon=document.querySelector('.att-page-head>div:first-child>span');
      const meta=navIcons.attendance;
      if(icon&&meta)icon.innerHTML=`<i class="${meta.icon} page-fa-icon" aria-hidden="true"></i>`;
    }
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
    installHelpGuide();
    setTimeout(applyPageHeadingIcon,0);
    return true;
  }

  function boot(){
    document.addEventListener('click',event=>{
      if(!event.target.closest('.event-tab'))return;
      setTimeout(applyPageHeadingIcon,0);
    },true);

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
