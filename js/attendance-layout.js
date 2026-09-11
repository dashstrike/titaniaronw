/* Small UI-only enhancement for clearer attendance workflow. */
(function TitaniaAttendanceLayout(){
  'use strict';
  if(!(/\/$|\/index\.html$/i.test(location.pathname)))return;

  function sectionTitle(title,subtitle){
    const head=document.createElement('div');
    head.className='att-control-section-head';
    head.innerHTML=`<b>${title}</b><span>${subtitle}</span>`;
    return head;
  }

  function enhance(){
    if(document.body.dataset.event!=='attendance')return;

    const picker=document.querySelector('.att-picker-card');
    if(picker&&!picker.dataset.layoutEnhanced){
      picker.dataset.layoutEnhanced='1';
      picker.classList.add('att-picker-card-clear');

      const historyRow=picker.querySelector('.att-picker-row');
      const createRow=picker.querySelector('.att-create-row');

      if(historyRow){
        const block=document.createElement('section');
        block.className='att-control-section';
        block.appendChild(sectionTitle('1. Select Existing Attendance','Choose an event to review or update.'));
        historyRow.before(block);
        block.appendChild(historyRow);

        const quick=historyRow.querySelector('.att-quick');
        if(quick&&!quick.querySelector('.att-quick-label')){
          const label=document.createElement('span');
          label.className='att-quick-label';
          label.textContent='Quick open';
          quick.prepend(label);
        }
      }

      if(createRow){
        const block=document.createElement('section');
        block.className='att-control-section att-control-create';
        block.appendChild(sectionTitle('2. Create / Open Attendance','Use this when starting attendance for a new event date.'));
        createRow.before(block);
        block.appendChild(createRow);
      }
    }

    const eventHead=document.querySelector('#attendanceEventPanel .att-event-head');
    if(eventHead&&!eventHead.dataset.layoutEnhanced){
      eventHead.dataset.layoutEnhanced='1';
      eventHead.classList.add('att-selected-event-card');
      const info=eventHead.firstElementChild;
      if(info){
        const badge=document.createElement('span');
        badge.className='att-selected-label';
        badge.textContent='Selected Event';
        info.prepend(badge);
      }

      const actions=eventHead.querySelector('.att-event-actions');
      const del=actions&&actions.querySelector('.att-delete-event-btn');
      if(del)del.classList.add('att-danger-action');
    }
  }

  function boot(){
    enhance();
    new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
