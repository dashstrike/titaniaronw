function siegeNewRaidHtml(){
  if(!userCanEdit()||currentSiegeRaids().length>=ALL_SIEGE_RAIDS.length)return '';
  return `<div class="main-raid-block card mb-0 p-3 border border-dashed" data-siege-new-raid="siege" role="button" tabindex="0" aria-label="Create Siege raid"><div class="d-flex flex-wrap align-items-center gap-2"><button type="button" class="btn btn-outline-primary btn-sm" data-siege-add-raid="siege">+ Add raid</button><span class="text-muted small">Drop a party here to create a new raid.</span></div></div>`;
}
function siegeUnusedParty(){
  const used=new Set(Object.values(state.siegeRaidGroups).flat());
  return SIEGE_DEFAULT_PARTY_ORDER.find(key=>!used.has(key));
}
function siegeUnusedRaid(){return ALL_SIEGE_RAIDS.find(raid=>!Object.hasOwn(state.siegeRaidGroups,raid.id));}
function resetSiegeRaidSettings(id){
  state.raidCommanders[id]='';state.raidLeaders[id]='';state.raidTeamNames[id]='';state.raidModes[id]='ATK';
}
function canMoveSiegeParty(key,targetId){
  if(!SIEGE_KEYS.includes(key))return {ok:false,reason:'invalid'};
  const sourceRaid=raidForTeam(key),creating=targetId==='new_siege';
  const targetRaid=creating?siegeUnusedRaid():raidById(targetId);
  if(!sourceRaid||!sourceRaid.siege||!targetRaid||!targetRaid.siege||(!creating&&!Object.hasOwn(state.siegeRaidGroups,targetId)))return {ok:false,reason:creating?'raidMaximum':'invalid'};

  if(sourceRaid.id===targetRaid.id)return {ok:false,reason:'same'};
  if(creating&&sourceRaid.keys.length===1)return {ok:false,reason:'newMinimum'};
  if(!creating&&targetRaid.keys.length>=8)return {ok:false,reason:'maximum'};
  return {ok:true,sourceRaid,targetRaid,creating};
}
function moveSiegePartyToRaid(key,targetId){
  if(currentEvent!=='siege'||!userCanEdit())return;
  const check=canMoveSiegeParty(key,targetId);
  if(!check.ok){
    const messages={maximum:'A raid can hold at most 8 parties.',raidMaximum:'Siege can have at most 10 raids.',newMinimum:'Keep at least one party in the source raid when creating a new raid.'};
    if(messages[check.reason])showToast('Cannot move party',messages[check.reason],'warn');return;
  }
  const {sourceRaid,targetRaid,creating}=check;
  if(creating){state.siegeRaidGroups[targetRaid.id]=[];resetSiegeRaidSettings(targetRaid.id);}
  state.siegeRaidGroups[sourceRaid.id]=sourceRaid.keys.filter(party=>party!==key);
  state.siegeRaidGroups[targetRaid.id].push(key);
  // Moving the final party to an existing raid removes the now-empty source raid.
  if(!state.siegeRaidGroups[sourceRaid.id].length){delete state.siegeRaidGroups[sourceRaid.id];resetSiegeRaidSettings(sourceRaid.id);}
  clearSelections(false);commitMutation('Siege party moved');
}
function addSiegeRaid(){
  if(currentEvent!=='siege'||!userCanEdit())return;
  const raid=siegeUnusedRaid(),party=siegeUnusedParty();if(!raid)return;
  if(!party){showToast('Create a raid','All parties are allocated. Drag a party onto the Add raid area to start a new raid.');return;}
  state.siegeRaidGroups[raid.id]=[party];resetSiegeRaidSettings(raid.id);commitMutation('Siege raid added');
}
function swapSiegeParties(sourceKey,targetKey){
  if(currentEvent!=='siege'||!userCanEdit())return;
  const raid=raidForTeam(sourceKey);
  if(!raid||!raid.keys.includes(targetKey)||sourceKey===targetKey)return;
  const keys=state.siegeRaidGroups[raid.id];
  const index=keys.indexOf(sourceKey),next=keys.indexOf(targetKey);
  [keys[index],keys[next]]=[keys[next],keys[index]];
  clearSelections(false);
  commitMutation('Siege parties reordered');
}
async function removeSiegeGroup(id){
  if(currentEvent!=='siege'||!userCanEdit())return;
  const raid=raidById(id);if(!raid||!raid.siege||!Object.hasOwn(state.siegeRaidGroups,id))return;
  if(currentSiegeRaids().length<=1){showToast('Cannot remove','Siege must keep at least one raid with one party.','warn');return;}
  const keys=raid.keys;
  const count=keys.reduce((sum,party)=>sum+state.assignments[party].filter(Boolean).length,0);
  const revision=state.revision,groups=JSON.stringify(state.siegeRaidGroups);
  if(!await confirmPlannerAction('Remove this raid?',count?`${count} player(s) will return to the member pool. To keep them together, drag the parties to another raid instead.`:'Remove this empty raid from Siege?','Remove raid',true)||!userCanEdit())return;
  if(state.revision!==revision||JSON.stringify(state.siegeRaidGroups)!==groups){showToast('Roster changed','Try again using the latest roster.','warn');return;}
  keys.forEach(party=>{state.assignments[party]=new Array(CONFIG.teamSize).fill(null);});
  delete state.siegeRaidGroups[id];resetSiegeRaidSettings(id);
  clearSelections(false);commitMutation('Siege group removed');
}
function wireSiegeRaidInteractions(wrap){
  if(currentEvent!=='siege'||!userCanEdit())return;
  wrap.querySelectorAll('[data-raid]').forEach(block=>{
    const raid=raidById(block.dataset.raid);
    const controls=document.createElement('div');controls.className='d-flex gap-2';
    controls.innerHTML=`<button type="button" class="btn btn-sm btn-outline-danger" data-siege-remove-raid="${raid.id}" ${currentSiegeRaids().length<=1?'disabled':''}>Remove raid</button>`;
    block.querySelector('.main-raid-head').appendChild(controls);
  });
  wrap.querySelectorAll('[data-siege-add-raid]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();addSiegeRaid(button.dataset.siegeAddRaid);}));
  wrap.querySelectorAll('[data-siege-remove-raid]').forEach(button=>button.addEventListener('click',()=>removeSiegeGroup(button.dataset.siegeRemoveRaid)));
  wrap.querySelectorAll('[data-team-key]').forEach(card=>{
    const targetKey=card.dataset.teamKey;
    card.addEventListener('dragover',event=>{
      if(!dragTeamSource||!userCanEdit())return;
      const valid=dragTeamSource!==targetKey&&raidForTeam(dragTeamSource)?.id===raidForTeam(targetKey)?.id;
      if(!valid)return;
      event.preventDefault();event.stopPropagation();card.classList.add('team-dropover');
      if(event.dataTransfer)event.dataTransfer.dropEffect='move';
    });
    card.addEventListener('dragleave',event=>{if(!event.relatedTarget||!card.contains(event.relatedTarget))card.classList.remove('team-dropover');});
    card.addEventListener('drop',event=>{
      if(!dragTeamSource||dragTeamSource===targetKey||raidForTeam(dragTeamSource)?.id!==raidForTeam(targetKey)?.id)return;
      event.preventDefault();event.stopPropagation();card.classList.remove('team-dropover');
      const source=dragTeamSource;dragTeamSource=null;swapSiegeParties(source,targetKey);
    });
  });
  wrap.querySelectorAll('[data-raid],[data-siege-new-raid]').forEach(block=>{
    const target=block.dataset.raid||'new_'+block.dataset.siegeNewRaid;
    block.addEventListener('dragover',event=>{
      if(!dragTeamSource||!userCanEdit())return;
      const check=canMoveSiegeParty(dragTeamSource,target);event.preventDefault();
      block.classList.toggle('siege-raid-dropover',check.ok);block.classList.toggle('siege-raid-dropinvalid',!check.ok&&check.reason!=='same');
      if(event.dataTransfer)event.dataTransfer.dropEffect=check.ok?'move':'none';
    });
    block.addEventListener('dragleave',event=>{if(!event.relatedTarget||!block.contains(event.relatedTarget))block.classList.remove('siege-raid-dropover','siege-raid-dropinvalid');});
    block.addEventListener('drop',event=>{
      if(!dragTeamSource)return;event.preventDefault();event.stopPropagation();
      const key=dragTeamSource;dragTeamSource=null;clearSiegeRaidDropStates();moveSiegePartyToRaid(key,target);
    });
    block.addEventListener('click',event=>{
      if(!selectedTeamSource||event.target.closest('button,input,.team-drag-handle'))return;
      const card=event.target.closest('[data-team-key]');
      if(card&&raidForTeam(selectedTeamSource)?.id===raidForTeam(card.dataset.teamKey)?.id){swapSiegeParties(selectedTeamSource,card.dataset.teamKey);return;}
      moveSiegePartyToRaid(selectedTeamSource,target);
    });
    block.addEventListener('keydown',event=>{if(event.target===block&&(event.key==='Enter'||event.key===' ')){event.preventDefault();if(selectedTeamSource)moveSiegePartyToRaid(selectedTeamSource,target);else if(block.dataset.siegeNewRaid)addSiegeRaid(block.dataset.siegeNewRaid);}});
  });
}
