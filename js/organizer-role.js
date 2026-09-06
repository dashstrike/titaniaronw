(function TitaniaOrganizerRole(){
  'use strict';

  if(!(/\/$|\/index\.html$/i.test(location.pathname)))return;

  function canEditPlanner(){
    try{
      return Boolean(
        typeof currentProfile!=='undefined' &&
        currentProfile &&
        currentProfile.approved &&
        ['organizer','leader','admin'].includes(currentProfile.role)
      );
    }catch(_e){return false;}
  }

  function canLead(){
    try{
      return Boolean(
        typeof currentProfile!=='undefined' &&
        currentProfile &&
        currentProfile.approved &&
        ['leader','admin'].includes(currentProfile.role)
      );
    }catch(_e){return false;}
  }

  function install(){
    try{window.userCanEdit=canEditPlanner;}catch(_e){}
    try{window.userCanLead=canLead;}catch(_e){}
  }

  install();
  document.addEventListener('DOMContentLoaded',install,{once:true});
  window.addEventListener('focus',install);
})();
