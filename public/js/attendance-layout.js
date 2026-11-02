/* UI-only attendance layout: simple history card + create modal. */
(function TitaniaAttendanceLayout(){
  'use strict';
  if(!(document.documentElement.dataset.titaniaPage==='index'))return;

  function canEdit(){
    try{return typeof userCanEdit==='function'?userCanEdit():true;}catch(_e){return true;}
  }

  function ensureStyle(){
    if(document.getElementById('titania-att-layout-style'))return;
    const style=document.createElement('style');
    style.id='titania-att-layout-style';
    style.textContent=`
      .att-picker-card.att-history-only{padding:16px;gap:10px}
      .att-history-card-head{display:flex;align-items:flex-start;gap:9px;margin-bottom:2px}
      .att-history-card-head>i{margin-top:2px;color:var(--text)}
      .att-history-card-head>div{min-width:0}
      .att-history-card-head b{display:block;color:var(--text);font-size:15px;line-height:1.25}
      .att-history-card-head span{display:block;margin-top:3px;color:var(--muted);font-size:12px}
      .att-picker-card.att-history-only .att-picker-row{display:block}
      .att-picker-card.att-history-only .att-picker-row>label{width:100%;min-width:0}
      .att-picker-card.att-history-only .att-picker-row>label>span{display:none}
      .att-picker-card.att-history-only #attEventSelect{width:100%;min-height:42px}
      .att-hidden-create-row{display:none!important}
      .att-create-top-btn{min-height:38px;display:inline-flex;align-items:center;justify-content:center}
      .att-event-head.att-selected-event-card{border-color:var(--line-soft)!important;box-shadow:none!important}
      .att-event-head .att-selected-label{display:none!important}
      .att-event-actions .att-danger-action{margin-left:8px}
      .titania-att-create-popup{font-family:var(--bs-body-font-family)}
      .titania-att-create-popup .swal2-title{font-family:var(--bs-body-font-family);font-size:20px!important}
      .titania-att-create-form{text-align:left;display:grid;gap:14px;margin-top:8px}
      .titania-att-create-field{display:grid;gap:6px}
      .titania-att-create-field label{font-size:11px;color:var(--bs-secondary-color);text-transform:uppercase;letter-spacing:.75px;font-weight:700}
      .titania-att-create-field select:not(.form-select),.titania-att-create-field input:not(.form-control){width:100%;height:42px;background:var(--bs-body-bg);border:1px solid var(--bs-border-color);border-radius:8px;color:var(--bs-body-color);padding:9px 11px;font:600 14px var(--bs-body-font-family);outline:none}
      .titania-att-create-field select:not(.form-select):focus,.titania-att-create-field input:not(.form-control):focus{border-color:var(--bs-primary);box-shadow:0 0 0 2px rgba(var(--bs-primary-rgb),0.333)}
      @media(max-width:800px){
        .att-page-head{flex-direction:row!important;align-items:center!important}
        .att-create-top-btn{width:auto}
        .att-event-actions .att-danger-action{margin-left:0}
      }
      @media(max-width:520px){
        .att-page-head{align-items:flex-start!important;flex-direction:column!important}
        .att-create-top-btn{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function eventTypeOptions(select){
    return [...select.options].map(option=>`<option value="${option.value.replace(/"/g,'&quot;')}"${option.selected?' selected':''}>${option.textContent}</option>`).join('');
  }

  async function openCreateModal(createRow){
    const type=createRow.querySelector('#attCreateType');
    const date=createRow.querySelector('#attCreateDate');
    const submit=createRow.querySelector('#attOpenCreateBtn');
    if(!type||!date||!submit)return;

    if(!window.Swal){
      alert('Create Attendance modal could not load. Refresh the page and try again.');
      return;
    }

    let datepicker;
    const result=await Swal.fire({
      title:'Create Attendance',
      html:`<div class="titania-att-create-form">
        <div class="titania-att-create-field"><label for="swalAttType">Event Type</label><select id="swalAttType" class="form-select">${eventTypeOptions(type)}</select></div>
        <div class="titania-att-create-field"><label for="swalAttDate">Date</label><input id="swalAttDate" type="text" value="${String(date.value||'').replace(/"/g,'&quot;')}" class="form-control"></div>
      </div>`,
      icon:'info',
      showCancelButton:true,
      confirmButtonText:'Open / Create',
      cancelButtonText:'Cancel',
      reverseButtons:true,
      focusCancel:false,
      confirmButtonColor:'var(--bs-primary)',
      cancelButtonColor:'var(--bs-border-color)',
      background:'var(--bs-secondary-bg)',
      color:'var(--bs-body-color)',
      customClass:{popup:'titania-att-create-popup'},
      didOpen:()=>{
        const input=document.getElementById('swalAttDate');
        if(window.flatpickr){
          datepicker=window.flatpickr(input,{dateFormat:'Y-m-d',altInput:true,altFormat:'F j, Y',disableMobile:true});
          datepicker.altInput.id='swalAttDateDisplay';
          document.querySelector('label[for="swalAttDate"]').htmlFor='swalAttDateDisplay';
        }
      },
      willClose:()=>datepicker?.destroy(),
      preConfirm:()=>{
        const modalType=document.getElementById('swalAttType');
        const modalDate=document.getElementById('swalAttDate');
        if(!modalType||!modalDate||!modalDate.value){
          Swal.showValidationMessage('Please choose an event type and date.');
          return false;
        }
        return {type:modalType.value,date:modalDate.value};
      }
    });
    if(!result.isConfirmed||!result.value)return;

    type.value=result.value.type;
    type.dispatchEvent(new Event('change',{bubbles:true}));
    if(date._flatpickr)date._flatpickr.setDate(result.value.date,false);else date.value=result.value.date;
    submit.click();
  }

  function enhancePageHeader(page){
    const pageHead=page.querySelector('.att-page-head');
    if(!pageHead)return;

    const autosave=pageHead.querySelector('.att-autosave');
    if(autosave)autosave.remove();

    if(canEdit()&&!pageHead.querySelector('.att-create-top-btn')){
      const button=document.createElement('button');
      button.type='button';
      button.className='btn btn-primary primary att-create-top-btn';
      button.innerHTML='<i class="fa-solid fa-plus mr-2" aria-hidden="true"></i>Create Attendance';
      button.addEventListener('click',()=>{
        const createRow=page.querySelector('.att-create-row');
        if(createRow)openCreateModal(createRow);
      });
      pageHead.appendChild(button);
    }
  }

  function enhanceHistory(page){
    const picker=page.querySelector('.att-picker-card');
    if(!picker)return;

    const historyRow=picker.querySelector('.att-picker-row');
    const createRow=picker.querySelector('.att-create-row');
    if(!historyRow||!createRow)return;

    picker.classList.remove('att-picker-card-clear');
    picker.classList.add('att-history-only');

    picker.querySelectorAll('.att-control-section-head').forEach(node=>node.remove());
    const quick=historyRow.querySelector('.att-quick');
    if(quick)quick.remove();

    if(historyRow.parentElement!==picker)picker.prepend(historyRow);
    if(createRow.parentElement!==picker)picker.appendChild(createRow);
    createRow.classList.add('att-hidden-create-row');

    if(!picker.querySelector('.att-history-card-head')){
      const head=document.createElement('div');
      head.className='att-history-card-head';
      head.innerHTML='<i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><div><b>Attendance History</b><span>Review an existing attendance event</span></div>';
      picker.prepend(head);
    }

    picker.querySelectorAll('.att-control-section').forEach(section=>{
      if(!section.children.length)section.remove();
    });
  }

  function cleanSelectedEvent(page){
    const eventHead=page.querySelector('#attendanceEventPanel .att-event-head');
    if(!eventHead)return;
    eventHead.classList.remove('att-selected-event-card');
    eventHead.style.boxShadow='none';
    const badge=eventHead.querySelector('.att-selected-label');
    if(badge)badge.remove();

    const del=eventHead.querySelector('.att-delete-event-btn');
    if(del)del.classList.add('att-danger-action');
  }

  function enhance(){
    if(document.body.dataset.event!=='attendance')return;
    const page=document.getElementById('attendancePage');
    if(!page)return;
    enhancePageHeader(page);
    enhanceHistory(page);
    cleanSelectedEvent(page);
  }

  function boot(){
    ensureStyle();
    enhance();
    new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
