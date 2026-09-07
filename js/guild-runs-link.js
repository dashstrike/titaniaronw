(function TitaniaGuildRunsLink(){
  'use strict';

  if(!(/\/$|\/index\.html$/i.test(location.pathname)))return;

  function addLink(){
    if(document.getElementById('guildRunsBtn'))return;
    const usersButton=document.getElementById('adminUsersBtn');
    const logoutButton=document.getElementById('logoutBtn');
    const anchor=document.createElement('a');
    anchor.id='guildRunsBtn';
    anchor.className='btn';
    anchor.href='./guild-runs.html';
    anchor.textContent='⚔ Guild Runs';
    const parent=(usersButton||logoutButton)&&((usersButton||logoutButton).parentElement);
    if(!parent)return;
    parent.insertBefore(anchor,usersButton||logoutButton);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addLink,{once:true});
  else addLink();
})();
