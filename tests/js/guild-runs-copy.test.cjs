const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('public/js/guild-runs.js','utf8');

test('Discord mentions load in one database query and copy without a network request',async()=>{
  const queries=[],writes=[];
  const client={auth:{getUser:async()=>({data:{user:{id:'admin'}}})},from(table){
    queries.push(table);
    return {select(){
      if(table==='member_discord_accounts')return Promise.resolve({data:[{member_id:'m1',discord_user_id:'111111111111111111',discord_username:'player'}]});
      return {eq(){return {single:async()=>({data:table==='profiles'?{approved:true,role:'admin'}:{state:{roster:[{id:'m1',name:'ABBY'}]}}})};}};
    }};
  }};
  const context={window:{supabase:{createClient:()=>client}},cfg:{supabaseUrl:'test',supabasePublishableKey:'test'},
    document:{},discordMentions:new Map(),fetch:async url=>{assert.match(url,/job-icons/);return {ok:true,json:async()=>({})};},
    navigator:{clipboard:{writeText:value=>{writes.push(value);return Promise.resolve();}}},
    setTimeout:()=>1,clearTimeout(){},showError:message=>assert.fail(message)};
  vm.createContext(context);
  vm.runInContext("let client,profile,roster,iconMap; function isOrganizer(){return profile.role==='admin';}",context);
  for(const [start,end] of [['  async function loadBase(){','  function carryStatusControl('],['  async function copyPlayer(','  function pickerIcon(']]){
    vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),context);
  }
  await context.loadBase();
  assert.equal(queries.filter(table=>table==='member_discord_accounts').length,1);
  const button={dataset:{copyDiscord:'m1'},classList:{add(){},remove(){}}};
  const copying=context.copyPlayer(button);
  assert.deepEqual(writes,['<@111111111111111111>']);
  await copying;
  await context.copyPlayer(button);
  assert.equal(writes.length,2);
});
