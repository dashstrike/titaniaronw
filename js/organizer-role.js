(function TitaniaAccessRoles(){
  'use strict';

  if(!(/\/$|\/index\.html$/i.test(location.pathname)))return;

  function profileHas(roles){
    try{
      return Boolean(
        typeof currentProfile!=='undefined' &&
        currentProfile &&
        currentProfile.approved &&
        roles.includes(currentProfile.role)
      );
    }catch(_e){return false;}
  }

  function canEditPlanner(){
    return profileHas(['party_organizer','admin']);
  }

  function canManageAttendance(){
    return profileHas(['party_organizer','attendance_auditor','admin']);
  }

  function canPublish(){
    return profileHas(['admin']);
  }

  function isAdmin(){
    return profileHas(['admin']);
  }

  function protectAdminOnlyControls(){
    const publish=document.getElementById('publicToggleBtn');
    if(publish){
      const allowed=canPublish();
      publish.disabled=!allowed;
      if(!allowed)publish.title='Admin access required to publish or hide public lineups';
    }
  }

  function install(){
    try{window.userCanEdit=canEditPlanner;}catch(_e){}
    try{window.userCanManageAttendance=canManageAttendance;}catch(_e){}
    try{window.userCanPublish=canPublish;}catch(_e){}
    try{window.userIsAdmin=isAdmin;}catch(_e){}
    protectAdminOnlyControls();
  }

  install();
  document.addEventListener('DOMContentLoaded',install,{once:true});
  window.addEventListener('focus',install);
  new MutationObserver(protectAdminOnlyControls).observe(document.documentElement,{subtree:true,childList:true});
})();
