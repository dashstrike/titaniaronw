'use strict';

function guildBattlefield(id){return id.startsWith('sub_')?'sub':'main';}
function guildNewRaidHtml(kind){
  if(!userCanEdit()||currentGuildRaids(state,kind).length>=5)return '';
  return `<div class="main-raid-block card mb-0 p-3 border border-dashed" data-guild-new-raid="${kind}" role="button" tabindex="0" aria-label="Create ${kind} raid"><div class="d-flex flex-wrap align-items-center gap-2"><button type="button" class="btn btn-outline-primary btn-sm" data-guild-add-raid="${kind}">+ Add raid</button><span class="text-muted small">Drop a party here to create a new raid.</span></div></div>`;
}
function guildUnusedParty(kind){
  const used=new Set(Object.values(state.guildRaidGroups).flat());
  return (kind==='main'?MAIN_KEYS:SUB_KEYS).find(key=>!used.has(key));
}
function guildUnusedRaid(kind){return (kind==='main'?MAIN_RAIDS:SUB_RAIDS).find(raid=>!Object.hasOwn(state.guildRaidGroups,raid.id));}
function resetGuildRaidSettings(id){
  state.raidCommanders[id]='';state.raidLeaders[id]='';state.raidTeamNames[id]='';state.raidModes[id]=guildBattlefield(id)==='sub'?'MID':'ATK';
}
function canMoveGuildParty(key,targetId){
  if(!/^(main_|sub_)/.test(key))return {ok:false,reason:'invalid'};
  const sourceRaid=raidForTeam(key),kind=guildBattlefield(key),creating=targetId==='new_main'||targetId==='new_sub';
  const targetRaid=creating?guildUnusedRaid(targetId.slice(4)):raidById(targetId);
  if(!sourceRaid||!targetRaid||targetRaid.siege||targetRaid.polarity)return {ok:false,reason:creating?'raidMaximum':'invalid'};
  if(guildBattlefield(targetRaid.id)!==kind)return {ok:false,reason:'battlefield'};
  if(sourceRaid.id===targetRaid.id)return {ok:false,reason:'same'};
  if(creating&&sourceRaid.keys.length===1)return {ok:false,reason:'newMinimum'};
  if(!creating&&targetRaid.keys.length>=8)return {ok:false,reason:'maximum'};
  return {ok:true,sourceRaid,targetRaid,creating};
}
function moveGuildPartyToRaid(key,targetId){
  if(currentEvent!=='guild_league'||!userCanEdit())return;
  const check=canMoveGuildParty(key,targetId);
  if(!check.ok){
    const messages={battlefield:'Move parties within the same battlefield.',maximum:'A raid can hold at most 8 parties.',raidMaximum:'Each battlefield can have at most 5 raids.',newMinimum:'Keep at least one party in the source raid when creating a new raid.'};
    if(messages[check.reason])showToast('Cannot move party',messages[check.reason],'warn');return;
  }
  const {sourceRaid,targetRaid,creating}=check;
  if(creating){state.guildRaidGroups[targetRaid.id]=[];resetGuildRaidSettings(targetRaid.id);}
  state.guildRaidGroups[sourceRaid.id]=sourceRaid.keys.filter(party=>party!==key);
  state.guildRaidGroups[targetRaid.id].push(key);
  // Moving the final party to an existing raid removes the now-empty source raid.
  if(!state.guildRaidGroups[sourceRaid.id].length){delete state.guildRaidGroups[sourceRaid.id];resetGuildRaidSettings(sourceRaid.id);}
  clearSelections(false);commitMutation('Guild League party moved');
}
function addGuildRaid(kind){
  if(currentEvent!=='guild_league'||!userCanEdit())return;
  const raid=guildUnusedRaid(kind),party=guildUnusedParty(kind);if(!raid)return;
  if(!party){showToast('Create a raid','All parties are allocated. Drag a party onto the Add raid area to start a new raid.');return;}
  state.guildRaidGroups[raid.id]=[party];resetGuildRaidSettings(raid.id);commitMutation('Guild League raid added');
}
function swapGuildParties(sourceKey,targetKey){
  if(currentEvent!=='guild_league'||!userCanEdit())return;
  const raid=raidForTeam(sourceKey);
  if(!raid||!raid.keys.includes(targetKey)||sourceKey===targetKey)return;
  const keys=state.guildRaidGroups[raid.id];
  const index=keys.indexOf(sourceKey),next=keys.indexOf(targetKey);
  [keys[index],keys[next]]=[keys[next],keys[index]];
  clearSelections(false);
  commitMutation('Guild League parties reordered');
}
async function removeGuildGroup(id){
  if(currentEvent!=='guild_league'||!userCanEdit())return;
  const raid=raidById(id);if(!raid||raid.siege||raid.polarity)return;
  if(currentGuildRaids(state,guildBattlefield(id)).length<=1){showToast('Cannot remove','Each battlefield must keep at least one raid with one party.','warn');return;}
  const keys=raid.keys;
  const count=keys.reduce((sum,party)=>sum+state.assignments[party].filter(Boolean).length,0);
  const revision=state.revision,groups=JSON.stringify(state.guildRaidGroups);
  if(!await confirmPlannerAction('Remove this raid?',count?`${count} player(s) will return to the member pool. To keep them together, drag the parties to another raid instead.`:'Remove this empty raid from Guild League?','Remove raid',true)||!userCanEdit())return;
  if(state.revision!==revision||JSON.stringify(state.guildRaidGroups)!==groups){showToast('Roster changed','Try again using the latest roster.','warn');return;}
  keys.forEach(party=>{state.assignments[party]=new Array(CONFIG.teamSize).fill(null);});
  delete state.guildRaidGroups[id];resetGuildRaidSettings(id);
  clearSelections(false);commitMutation('Guild League group removed');
}
function wireGuildRaidInteractions(wrap){
  if(currentEvent!=='guild_league'||!userCanEdit())return;
  wrap.querySelectorAll('[data-raid]').forEach(block=>{
    const raid=raidById(block.dataset.raid),kind=guildBattlefield(raid.id);
    const controls=document.createElement('div');controls.className='d-flex gap-2';
    controls.innerHTML=`<button type="button" class="btn btn-sm btn-outline-danger" data-guild-remove-raid="${raid.id}" ${currentGuildRaids(state,kind).length<=1?'disabled':''}>Remove raid</button>`;
    block.querySelector('.main-raid-head').appendChild(controls);
  });
  wrap.querySelectorAll('[data-guild-add-raid]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();addGuildRaid(button.dataset.guildAddRaid);}));
  wrap.querySelectorAll('[data-guild-remove-raid]').forEach(button=>button.addEventListener('click',()=>removeGuildGroup(button.dataset.guildRemoveRaid)));
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
      const source=dragTeamSource;dragTeamSource=null;swapGuildParties(source,targetKey);
    });
  });
  wrap.querySelectorAll('[data-raid],[data-guild-new-raid]').forEach(block=>{
    const target=block.dataset.raid||'new_'+block.dataset.guildNewRaid;
    block.addEventListener('dragover',event=>{
      if(!dragTeamSource||!userCanEdit())return;
      const check=canMoveGuildParty(dragTeamSource,target);event.preventDefault();
      block.classList.toggle('siege-raid-dropover',check.ok);block.classList.toggle('siege-raid-dropinvalid',!check.ok&&check.reason!=='same');
      if(event.dataTransfer)event.dataTransfer.dropEffect=check.ok?'move':'none';
    });
    block.addEventListener('dragleave',event=>{if(!event.relatedTarget||!block.contains(event.relatedTarget))block.classList.remove('siege-raid-dropover','siege-raid-dropinvalid');});
    block.addEventListener('drop',event=>{
      if(!dragTeamSource)return;event.preventDefault();event.stopPropagation();
      const key=dragTeamSource;dragTeamSource=null;clearSiegeRaidDropStates();moveGuildPartyToRaid(key,target);
    });
    block.addEventListener('click',event=>{
      if(!selectedTeamSource||event.target.closest('button,input,.team-drag-handle'))return;
      const card=event.target.closest('[data-team-key]');
      if(card&&raidForTeam(selectedTeamSource)?.id===raidForTeam(card.dataset.teamKey)?.id){swapGuildParties(selectedTeamSource,card.dataset.teamKey);return;}
      moveGuildPartyToRaid(selectedTeamSource,target);
    });
    block.addEventListener('keydown',event=>{if(event.target===block&&(event.key==='Enter'||event.key===' ')){event.preventDefault();if(selectedTeamSource)moveGuildPartyToRaid(selectedTeamSource,target);else if(block.dataset.guildNewRaid)addGuildRaid(block.dataset.guildNewRaid);}});
  });
}
