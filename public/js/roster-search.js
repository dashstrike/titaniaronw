(function(){
  'use strict';
  const root=document.getElementById('glRosterSearch');
  const publicSearch=root?.dataset.publicSearch==='true';
  const roster=document.getElementById(publicSearch?'content':'teamsWrap');
  const app=document.getElementById('app');
  if(!root||!roster||(!publicSearch&&!app))return;
  const panel=document.getElementById('glRosterSearchPanel');
  const toggle=document.getElementById('glRosterSearchToggle');
  const input=document.getElementById('glRosterSearchInput');
  const count=document.getElementById('glRosterSearchCount');
  const previous=document.getElementById('glRosterSearchPrevious');
  const next=document.getElementById('glRosterSearchNext');
  const normalize=value=>String(value).normalize('NFKC').trim().toLocaleLowerCase();
  let matches=[],active=-1,lastQuery='',timer;
  const rowKey=row=>publicSearch?String([...roster.querySelectorAll('.slot')].indexOf(row)):`${row.dataset.team}:${row.dataset.slot}`;
  function clearHighlights(){
    roster.querySelectorAll('[data-roster-search-match]').forEach(row=>row.removeAttribute('data-roster-search-match'));
  }
  function showActive(scroll){
    matches.forEach((row,index)=>row.dataset.rosterSearchMatch=index===active?'active':'match');
    count.textContent=lastQuery?(matches.length?`${active+1} of ${matches.length} matches`:'No roster matches.'): 'Enter a player name.';
    previous.disabled=next.disabled=matches.length<2;
    if(scroll&&matches[active])matches[active].scrollIntoView({block:'center',inline:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  function search(scroll){
    clearTimeout(timer);
    const query=normalize(input.value);
    const oldKey=query===lastQuery&&matches[active]?rowKey(matches[active]):null;
    clearHighlights();lastQuery=query;
    matches=query&&!root.hidden&&!panel.hidden?[...roster.querySelectorAll(publicSearch?'.slot':'.slot.filled')].filter(row=>{
      const name=row.querySelector(publicSearch?'.member-name':'.slot-name');
      // Read the IGN's text nodes only; nationality flags and other decorations
      // are not part of the searchable player name.
      const text=name?[...name.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent).join(''):'';
      return normalize(text).includes(query);
    }):[];
    active=matches.length?Math.max(0,matches.findIndex(row=>rowKey(row)===oldKey)):-1;
    showActive(scroll);
  }
  function move(direction){
    if(normalize(input.value)!==lastQuery){search(true);return;}
    if(!matches.length)return;
    active=(active+direction+matches.length)%matches.length;showActive(true);
  }
  function close(focus){
    clearTimeout(timer);panel.hidden=true;toggle.setAttribute('aria-expanded','false');
    input.value='';lastQuery='';matches=[];active=-1;clearHighlights();showActive(false);
    if(focus)toggle.focus();
  }
  function syncVisibility(){
    root.hidden=publicSearch?!roster.querySelector('.slot .member-name'):app.hidden||!['guild_league','siege'].includes(document.body.dataset.event);
    if(root.hidden)close(false);
  }
  toggle.addEventListener('click',()=>{
    if(!panel.hidden){close(true);return;}
    panel.hidden=false;toggle.setAttribute('aria-expanded','true');input.focus();
  });
  document.getElementById('glRosterSearchClose').addEventListener('click',()=>close(true));
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>search(true),180);});
  previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close(true);}
    if(event.target===input&&event.key==='Enter'){event.preventDefault();move(event.shiftKey?-1:1);}
  });
  new MutationObserver(syncVisibility).observe(document.body,{attributes:true,attributeFilter:['data-event']});
  if(!publicSearch)new MutationObserver(syncVisibility).observe(app,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(()=>{
    if(publicSearch)syncVisibility();
    if(root.hidden||panel.hidden||!input.value)return;
    clearTimeout(timer);timer=setTimeout(()=>search(false),80);
  }).observe(roster,{childList:true,subtree:true,characterData:true});
  syncVisibility();
})();
