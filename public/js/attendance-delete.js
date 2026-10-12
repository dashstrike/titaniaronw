/* Admin-only attendance event deletion with SweetAlert2 confirmation. */
(function TitaniaAttendanceDelete(){
  'use strict';
  if(!(document.documentElement.dataset.titaniaPage==='index'))return;

  const cfg=window.TITANIA_CONFIG||{};
  let client=null;
  let isAdmin=false;
  let busy=false;

  function ensureStyle(){
    if(document.getElementById('titania-att-delete-style'))return;
    const style=document.createElement('style');
    style.id='titania-att-delete-style';
    style.textContent='.att-delete-event-btn{border-color:#ef5a6f!important;color:#ff9aaa!important;background:#35161d!important}.att-delete-event-btn:hover{border-color:#ff788b!important;color:#fff!important}';
    document.head.appendChild(style);
  }

  async function initClient(){
    if(client)return true;
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey)return false;
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const userResult=await client.auth.getUser();
    const user=userResult.data&&userResult.data.user;
    if(userResult.error||!user)return false;
    const profileResult=await client.from('profiles').select('role,approved').eq('id',user.id).single();
    isAdmin=Boolean(!profileResult.error&&profileResult.data&&profileResult.data.approved&&profileResult.data.role==='admin');
    return true;
  }

  function selectedEvent(){
    const select=document.getElementById('attEventSelect');
    if(!select||!select.value)return null;
    const option=select.options[select.selectedIndex];
    return {id:select.value,label:option?option.textContent.trim():'this attendance event'};
  }

  function esc(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  async function removeAttendance(){
    if(busy||!isAdmin)return;
    const event=selectedEvent();
    if(!event)return;
    if(!window.Swal){
      alert('SweetAlert2 did not load. Attendance was not deleted. Refresh the page and try again.');
      return;
    }

    const result=await Swal.fire({
      title:'Delete attendance event?',
      html:`<b>${esc(event.label)}</b><br><br>This permanently deletes this event and all attendance records inside it.`,
      icon:'warning',
      showCancelButton:true,
      confirmButtonText:'Delete Attendance',
      cancelButtonText:'Cancel',
      reverseButtons:true,
      focusCancel:true,
      confirmButtonColor:'var(--bs-danger)',
      cancelButtonColor:'var(--bs-border-color)',
      background:'var(--bs-secondary-bg)',
      color:'var(--bs-body-color)'
    });
    if(!result.isConfirmed)return;

    busy=true;
    const button=document.getElementById('attDeleteEventBtn');
    if(button)button.disabled=true;
    const deletion=await client.rpc('admin_delete_attendance_event',{p_event_id:event.id});
    if(deletion.error){
      busy=false;
      if(button)button.disabled=false;
      await window.TitaniaToast('Delete failed',deletion.error.message||'Could not delete attendance.','err');
      return;
    }

    await window.TitaniaToast('Attendance deleted','The event and its attendance records were removed.');
    sessionStorage.setItem('titania_reopen_attendance','1');
    location.reload();
  }

  function addButton(){
    if(!isAdmin||document.body.dataset.event!=='attendance')return;
    const actions=document.querySelector('#attendanceEventPanel .att-event-actions');
    if(!actions||actions.querySelector('#attDeleteEventBtn')||!selectedEvent())return;
    const button=document.createElement('button');
    button.id='attDeleteEventBtn';
    button.type='button';
    button.className='btn btn-outline-danger btn-sm small att-event-action-btn att-delete-event-btn';
    button.innerHTML='<i class="fa-solid fa-trash-can mr-2" aria-hidden="true"></i><span>Delete Attendance</span>';
    button.addEventListener('click',removeAttendance);
    actions.appendChild(button);
  }

  function reopenAttendance(){
    if(sessionStorage.getItem('titania_reopen_attendance')!=='1')return;
    const tab=document.querySelector('.event-tab[data-event="attendance"]');
    if(!tab)return;
    sessionStorage.removeItem('titania_reopen_attendance');
    tab.click();
  }

  async function boot(){
    ensureStyle();
    await initClient();
    const observer=new MutationObserver(()=>{addButton();reopenAttendance();});
    observer.observe(document.body,{childList:true,subtree:true});
    addButton();
    reopenAttendance();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
