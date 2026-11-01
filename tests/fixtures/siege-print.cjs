// Synthetic lineup only; no connection to a guild database.
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/pages/index.js','utf8');
module.exports=function render(starParties=['party_0_0','party_3_2'],event='siege'){
  const raids=[4,4,4,5,5,4,4].map((count,index)=>({id:`raid_${index}`,keys:Array.from({length:count},(_,party)=>`party_${index}_${party}`)}));
  const state={assignments:{},raidModes:{raid_1:'DEF',...(event==='guild_league'?{raid_2:'MVP',raid_3:'TOP',raid_4:'MID',raid_5:'BOTTOM'}:{})},raidLeaders:{raid_0:'Leader & Friends'}};
  const members={},titles={};let number=0;
  for(const raid of raids)for(const key of raid.keys){
    state.assignments[key]=Array.from({length:5},(_,slot)=>{
      const name=number===0&&slot===0?'Leader & Friends':`Member ${number+1} ${slot+1}`;
      members[name]={id:name,cls:slot===0?'High Priest':slot===1?'Scholar':'Stalker'};
      titles[name]='Pathfinder III';return name;
    });number++;
  }
  state.assignments.party_6_3=[null,'<script>unsafe</script>',null,null,null];
  const context={window:{TitaniaPartyStars:{isSelected:key=>starParties.includes(key)}},state,memberByName:members,memberTitleById:titles,CONFIG:{teamSize:5},
    TITLE_ICON_BASE:'./images/title/',TITLE_ICON_SERIES:{pathfinder:'pathfinder_purple'},TITLE_ICON_LEVELS:{iii:3},
    MAIN_RAIDS:raids.slice(0,3),SUB_RAIDS:raids.slice(3),currentSiegeRaids:()=>raids,currentTeamKeys:()=>raids.flatMap(raid=>raid.keys),
    assignedNamesSet:keys=>new Set(keys.flatMap(key=>state.assignments[key]).filter(Boolean)),
    raidTeamName:raid=>`Team ${raids.indexOf(raid)+1}`,
    displayTeamLabel:key=>`Party ${raids.flatMap(raid=>raid.keys).indexOf(key)+1}`,
    teamHasNoHealer:key=>key==='party_6_3',stringValue:value=>String(value??''),classColor:()=>'#579ed3'};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function titleAssetPath('),source.indexOf('  async function loadMemberTitles(')),context);
  vm.runInContext(source.slice(source.indexOf('  function escapeHtml('),source.indexOf('  function escapeAttr('))+ '\nfunction escapeAttr(value){return escapeHtml(value);}',context);
  vm.runInContext(source.slice(source.indexOf('  function buildCompactPrintContent('),source.indexOf('  function activeRoster(')),context);
  return context.buildCompactPrintContent(event);
};
