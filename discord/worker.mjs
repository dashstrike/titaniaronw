// Cloudflare Worker. Credentials belong in Cloudflare secrets, never in public/.
import {command} from './commands.mjs';
const API='https://discord.com/api/v10';
const EVENTS={guild_league_tuesday:{label:'Guild League (Tuesday)',day:2},guild_league_thursday:{label:'Guild League (Thursday)',day:4},siege:{label:'Siege',day:0}};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export const normalizeName=value=>String(value||'').trim().replace(/\s+/gu,' ').toLowerCase();
const json=(data,status=200)=>Response.json(data,{status});
class UserError extends Error {}
const fail=message=>{throw new UserError(message);};
const hex=value=>{
  if(!/^(?:[\da-f]{2})+$/i.test(value||''))throw new Error('Invalid hex');
  return Uint8Array.from(value.match(/../g),byte=>parseInt(byte,16));
};

export async function verifyRequest(request,publicKey,now=Date.now()){
  const body=await request.text(),timestamp=request.headers.get('X-Signature-Timestamp');
  try{
    if(!/^\d+$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300)return null;
    const key=await crypto.subtle.importKey('raw',hex(publicKey),{name:'Ed25519'},false,['verify']);
    if(!await crypto.subtle.verify('Ed25519',key,hex(request.headers.get('X-Signature-Ed25519')),new TextEncoder().encode(timestamp+body)))return null;
    return JSON.parse(body);
  }catch{return null;}
}

export function isManager(interaction){
  try{return (BigInt(interaction.member?.permissions||'0')&40n)!==0n;}catch{return false;}
}

export function eventDate(type,date,now=new Date()){
  if(!EVENTS[type])fail('Choose Guild League Tuesday, Guild League Thursday, or Siege.');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  if(!date){
    const next=new Date(today+'T00:00:00Z');
    next.setUTCDate(next.getUTCDate()+(EVENTS[type].day-next.getUTCDay()+7)%7);
    return next.toISOString().slice(0,10);
  }
  const parsed=new Date(date+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||parsed.getUTCDay()!==EVENTS[type].day)fail('Use YYYY-MM-DD on the correct event weekday (GMT+8).');
  if(date<today)fail('Attendance messages cannot be created for past dates.');
  return date;
}

export function matchMember(roster,nickname,linkedId){
  if(linkedId){
    const member=roster.find(row=>String(row.id)===linkedId);
    if(!member||member.status==='inactive')fail('Your linked Titania member is missing or inactive. Ask management to check your account link.');
    return member;
  }
  const name=normalizeName(nickname);
  if(!name)fail('Ask management to set your Discord server nickname to your Titania character name.');
  const matches=roster.filter(member=>member.status!=='inactive'&&normalizeName(member.name)===name);
  if(matches.length!==1)fail(matches.length?'More than one active character matches your nickname. Ask management to link your account.':'Your server nickname does not match an active Titania member. Ask management to check your nickname and roster.');
  if(!matches[0].id)fail('This character has no member ID. Ask management to check the roster.');
  return matches[0];
}

async function requestJson(url,options={}){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(5000)});
  const text=await response.text();
  let data;try{data=text?JSON.parse(text):null;}catch{throw new Error('Unexpected backend response');}
  if(!response.ok){const error=new Error('Backend request failed');error.status=response.status;error.code=data?.code;throw error;}
  return data;
}

export class Backend {
  constructor(env){this.env=env;}
  async call(path,method='GET',body,prefer){
    const key=this.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!key||!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(this.env.SUPABASE_URL||''))throw new Error('Backend configuration missing');
    const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
    if(prefer)headers.Prefer=prefer;
    return requestJson(this.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  }
  async roster(){
    const rows=await this.call('planner_state?id=eq.1&select=state');
    if(!rows?.[0]||!Array.isArray(rows[0].state?.roster))throw new Error('Roster unavailable');
    return rows[0].state.roster;
  }
  async event(type,date){
    const path='attendance_events?event_type=eq.'+type+'&event_date=eq.'+date+'&select=id,event_type,event_date,status';
    let rows=await this.call(path);
    if(!rows.length){
      try{await this.call('attendance_events','POST',{event_type:type,event_date:date,title:EVENTS[type].label,status:'upcoming'});}
      catch(error){if(error.code!=='23505')throw error;}
      rows=await this.call(path);
    }
    if(!rows[0])throw new Error('Event unavailable');
    if(rows[0].status==='closed')fail('This attendance event is closed. Ask management to reopen it on Titania.');
    return rows[0];
  }
  async save(eventId,member,status){
    const events=await this.call('attendance_events?id=eq.'+encodeURIComponent(eventId)+'&select=status');
    if(!events[0]||events[0].status==='closed')fail('This attendance event is closed or was deleted.');
    const filter='event_id=eq.'+encodeURIComponent(eventId)+'&member_id=eq.'+encodeURIComponent(member.id);
    const rows=await this.call('attendance_records?'+filter+'&select=id');
    // PATCH only these two fields: retain actual attendance, notes and audit fields.
    const update={pre_status:status,member_name:member.name};
    if(rows.length){await this.call('attendance_records?'+filter,'PATCH',update);return;}
    try{await this.call('attendance_records','POST',{event_id:eventId,member_id:String(member.id),...update});}
    catch(error){if(error.code!=='23505')throw error;await this.call('attendance_records?'+filter,'PATCH',update);}
  }
  async counts(eventId,roster){
    const rows=await this.call('attendance_records?event_id=eq.'+encodeURIComponent(eventId)+'&select=member_id,pre_status');
    const active=new Set(roster.filter(member=>member.status!=='inactive').map(member=>String(member.id)));
    const going=new Set(),notGoing=new Set();
    for(const row of rows){
      if(!active.has(String(row.member_id)))continue;
      if(row.pre_status==='going')going.add(String(row.member_id));
      if(row.pre_status==='not_going')notGoing.add(String(row.member_id));
    }
    return {going:going.size,notGoing:notGoing.size};
  }
}

export function attendanceMessage(posted,counts){
  return {
    embeds:[{
      title:EVENTS[posted.type].label,
      description:'Choose your attendance below. You can change your response.',
      color:0x8064cf,
      fields:[{name:'📅 Event date',value:posted.date+' (GMT+8)',inline:false},{name:'✅ Going',value:String(counts.going),inline:true},{name:'❌ Not going',value:String(counts.notGoing),inline:true}],
      footer:{text:'Titania Guild • Attendance'}
    }],
    components:[{type:1,components:[{type:2,style:3,label:'✅ Going ('+counts.going+')',custom_id:'titania:'+posted.eventId+':going'},{type:2,style:4,label:'❌ Not going ('+counts.notGoing+')',custom_id:'titania:'+posted.eventId+':not_going'}]}]
  };
}

async function discord(env,path,method,body,bot=true){
  return requestJson(API+path,{method,headers:{'Content-Type':'application/json',...(bot?{Authorization:'Bot '+env.DISCORD_BOT_TOKEN}:{})},body:JSON.stringify({...body,allowed_mentions:{parse:[]}})});
}
const commandOptions=interaction=>Object.fromEntries((interaction.data?.options?.[0]?.options||[]).map(option=>[option.name,option.value]));

// One object per guild: private, strongly consistent links and interaction receipts.
// SQLite-backed storage is supported on Cloudflare's Free plan.
export class AttendanceStore {
  constructor(ctx,env){this.ctx=ctx;this.env=env;this.refreshes=new Map();}
  async refreshMessage(messageId,posted,backend,roster){
    // Serialize counter updates, not attendance writes, so older edits cannot
    // finish after newer ones when several members respond together.
    const previous=this.refreshes.get(messageId)||Promise.resolve();
    const update=previous.catch(()=>{}).then(async()=>{
      const counts=await backend.counts(posted.eventId,roster);
      await discord(this.env,'/channels/'+this.env.DISCORD_ATTENDANCE_CHANNEL_ID+'/messages/'+messageId,'PATCH',attendanceMessage(posted,counts));
    });
    this.refreshes.set(messageId,update);
    try{await update;}finally{if(this.refreshes.get(messageId)===update)this.refreshes.delete(messageId);}
  }
  async fetch(request){
    if(new URL(request.url).pathname==='/member-profile'){
      try{return json(await this.memberProfile(await request.json()));}
      catch(error){return json({error:error instanceof UserError?error.message:'Could not load Discord account details.'},error instanceof UserError?409:502);}
    }
    if(new URL(request.url).pathname==='/register'){
      if(await this.ctx.storage.get('commandVersion')!==1){
        await requestJson(API+'/applications/'+this.env.DISCORD_APPLICATION_ID+'/guilds/'+this.env.DISCORD_GUILD_ID+'/commands',{
          method:'POST',headers:{Authorization:'Bot '+this.env.DISCORD_BOT_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(command)
        });
        await this.ctx.storage.put('commandVersion',1);
      }
      return json({registered:true});
    }
    return this.process(await request.json());
  }
  async process(interaction){
    const key='delivery:'+interaction.id;
    const receipt=await this.ctx.storage.transaction(async transaction=>{
      const existing=await transaction.get(key);
      if(existing)return existing;
      await transaction.put(key,{at:Date.now()});
      return null;
    });
    if(receipt)return json({content:receipt.content||'This request was already received. Check Titania before submitting another response.'});
    // Retain receipts for 24 hours; signatures older than five minutes are rejected.
    if(await this.ctx.storage.getAlarm()===null)await this.ctx.storage.setAlarm(Date.now()+86400000);
    let content;
    try{content=await this.handle(interaction);}
    catch(error){
      content=error instanceof UserError?error.message:'Attendance could not be confirmed. Check Titania, then try again or contact management.';
      if(!(error instanceof UserError))console.error('Discord attendance failed',{interactionId:interaction.id,status:error.status||null});
    }
    await this.ctx.storage.put(key,{at:Date.now(),content});
    return json({content});
  }
  async alarm(){
    // Paginate: storage.list returns at most 1,000 keys by default.
    let start;
    do{
      const entries=await this.ctx.storage.list({prefix:'delivery:',limit:500,...(start?{startAfter:start}:{})});
      if(!entries.size)break;
      const stale=[...entries].filter(([,value])=>value.at<Date.now()-86400000).map(([key])=>key);
      if(stale.length)await this.ctx.storage.delete(stale);
      start=[...entries.keys()].at(-1);
      if(entries.size<500)break;
    }while(start);
    if((await this.ctx.storage.list({prefix:'delivery:',limit:1})).size)await this.ctx.storage.setAlarm(Date.now()+86400000);
  }
  async link(userId,member,automatic){
    return this.ctx.storage.transaction(async transaction=>{
      const existing=await transaction.get('user:'+userId),owner=await transaction.get('member:'+member.id);
      if(owner&&owner!==userId)fail('That Titania character is already linked to another Discord account. Ask management to resolve it.');
      if(existing&&existing.memberId!==String(member.id))fail('This Discord account is already linked. Management must unlink it before changing the character.');
      await transaction.put('user:'+userId,{memberId:String(member.id),automatic:existing?.automatic??automatic,linkedAt:existing?.linkedAt||new Date().toISOString()});
      await transaction.put('member:'+member.id,userId);
    });
  }
  async guildMember(userId){
    let member;
    try{member=await requestJson(API+'/guilds/'+this.env.DISCORD_GUILD_ID+'/members/'+userId,{headers:{Authorization:'Bot '+this.env.DISCORD_BOT_TOKEN}});}
    catch(error){if(error.status===404)fail('This Discord account is not in the Titania server.');throw error;}
    if(!member.user||member.user.bot)fail('Choose a human member of the Titania Discord server.');
    return member;
  }
  async memberProfile(input){
    const {memberId,action,userId,expectedUserId,actorId}=input;
    const member=(await new Backend(this.env).roster()).find(row=>String(row.id)===memberId);
    if(!member)fail('This Titania member no longer exists.');
    if(action!=='read'){
      if(!['link','unlink'].includes(action))fail('Unknown account action.');
      if(action==='link'&&(typeof userId!=='string'||!/^\d{17,20}$/.test(userId)||member.status==='inactive'))fail('Enter a Discord user ID for an active Titania member.');
      if(action==='link')await this.guildMember(userId);
      await this.ctx.storage.transaction(async transaction=>{
        const current=await transaction.get('member:'+memberId)||null;
        if(current!==(expectedUserId||null))fail('The account link changed. Refresh the card and try again.');
        if(action==='link'){
          const existing=await transaction.get('user:'+userId);
          if(existing&&existing.memberId!==memberId)fail('That Discord account is already linked to another Titania character.');
          if(current&&current!==userId)await transaction.delete('user:'+current);
          await transaction.put('user:'+userId,{memberId,automatic:false,linkedAt:new Date().toISOString(),linkedBy:actorId});
          await transaction.put('member:'+memberId,userId);
        }else if(current){
          await transaction.delete('user:'+current);await transaction.delete('member:'+memberId);
        }
      });
    }
    const linkedUserId=await this.ctx.storage.get('member:'+memberId);
    if(!linkedUserId)return {linked:false};
    const link=await this.ctx.storage.get('user:'+linkedUserId);
    if(!link||link.memberId!==memberId)fail('Account link is inconsistent. Ask management to check it.');
    let profile=null;
    try{
      const discordMember=await this.guildMember(linkedUserId),user=discordMember.user;
      const hash=/^(a_)?[a-f0-9]+$/i.test(user.avatar||'')?user.avatar:null;
      profile={username:user.username,nickname:discordMember.nick||null,avatarUrl:hash?'https://cdn.discordapp.com/avatars/'+linkedUserId+'/'+hash+'.png?size=128':'https://cdn.discordapp.com/embed/avatars/'+((BigInt(linkedUserId)>>22n)%6n)+'.png'};
    }catch{/* Keep the link visible if Discord is temporarily unavailable or the user left. */}
    return {linked:true,userId:linkedUserId,linkedAt:link.linkedAt,method:link.automatic?'Automatic nickname match':'Management',profile};
  }
  async handle(interaction){
    const env=this.env;
    if(interaction.guild_id!==env.DISCORD_GUILD_ID||interaction.channel_id!==env.DISCORD_ATTENDANCE_CHANNEL_ID)fail('Use the configured Titania attendance channel.');
    const userId=interaction.member?.user?.id;
    if(!userId||interaction.member.user.bot)fail('A Discord server member is required.');
    const backend=new Backend(env);
    if(interaction.type===3){
      const match=/^titania:([0-9a-f-]{36}):(going|not_going)$/.exec(interaction.data?.custom_id||'');
      if(!match||interaction.message?.author?.id!==interaction.application_id)fail('This is not a valid Titania attendance button.');
      const posted=await this.ctx.storage.get('message:'+interaction.message.id);
      if(!posted||posted.eventId!==match[1])fail('This message is not registered. Ask management to post a new attendance message.');
      const roster=await backend.roster(),link=await this.ctx.storage.get('user:'+userId);
      const member=matchMember(roster,interaction.member.nick,link?.memberId);
      await this.link(userId,member,!link);
      await backend.save(posted.eventId,member,match[2]);
      try{await this.refreshMessage(interaction.message.id,posted,backend,roster);}
      catch{console.error('Attendance saved but message counts could not refresh',{messageId:interaction.message.id});}
      return member.name+': '+(match[2]==='going'?'Going ✅':'Not going ❌')+' saved for '+EVENTS[posted.type].label+' on '+posted.date+'.';
    }
    if(interaction.type!==2||interaction.data?.name!=='attendance')fail('Unknown command.');
    if(!isManager(interaction))fail('Only Discord administrators or members with Manage Server can manage attendance messages and links.');
    const subcommand=interaction.data.options?.[0]?.name,options=commandOptions(interaction);
    if(subcommand==='post'){
      const date=eventDate(options.event,options.date),event=await backend.event(options.event,date);
      const posted={eventId:event.id,type:options.event,date};
      const counts=await backend.counts(event.id,await backend.roster());
      const message=await discord(env,'/channels/'+env.DISCORD_ATTENDANCE_CHANNEL_ID+'/messages','POST',attendanceMessage(posted,counts));
      await this.ctx.storage.put('message:'+message.id,{eventId:event.id,type:options.event,date});
      return 'Attendance posted: https://discord.com/channels/'+env.DISCORD_GUILD_ID+'/'+env.DISCORD_ATTENDANCE_CHANNEL_ID+'/'+message.id;
    }
    if(subcommand==='link'){
      if(!/^\d{17,20}$/.test(String(options.user||'')))fail('Select a Discord member.');
      if(!interaction.data.resolved?.members?.[options.user]||interaction.data.resolved?.users?.[options.user]?.bot)fail('Select a human member of this Discord server.');
      const member=matchMember(await backend.roster(),options.character);
      await this.link(String(options.user),member,false);
      return 'Linked Discord account '+options.user+' to '+member.name+'.';
    }
    if(subcommand==='unlink'){
      const id=String(options.user||'');
      await this.ctx.storage.transaction(async transaction=>{
        const link=await transaction.get('user:'+id);
        if(link){await transaction.delete('member:'+link.memberId);await transaction.delete('user:'+id);}
      });
      return 'Account link removed. No attendance records were deleted.';
    }
    fail('Choose post, link, or unlink.');
  }
}

export async function finishInteraction(interaction,env){
  let content;
  try{
    const store=env.ATTENDANCE.get(env.ATTENDANCE.idFromName(env.DISCORD_GUILD_ID));
    const result=await store.fetch('https://attendance.internal/',{method:'POST',body:JSON.stringify(interaction)});
    content=(await result.json()).content;
  }catch{content='Attendance could not be confirmed. Check Titania or contact management.';}
  try{await discord(env,'/webhooks/'+interaction.application_id+'/'+interaction.token+'/messages/@original','PATCH',{content},false);}
  catch{console.error('Could not deliver private attendance confirmation',{interactionId:interaction.id});}
}

export async function websiteRequest(request,env){
  const origin=request.headers.get('Origin');
  const allowed=['https://dashstrike.github.io','http://titaniaronw.test','http://127.0.0.1:8015','http://localhost:8015'];
  if(!allowed.includes(origin))return json({error:'Origin not allowed.'},403);
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin','Cache-Control':'no-store'};
  const reply=(body,status=200)=>Response.json(body,{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
  const authorization=request.headers.get('Authorization');
  if(!/^Bearer \S+$/.test(authorization||''))return reply({error:'Sign in to Titania first.'},401);
  let user;
  try{user=await requestJson(env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:authorization}});}
  catch{return reply({error:'Your session could not be verified. Sign in again.'},401);}
  if(!user?.id)return reply({error:'Sign in to Titania first.'},401);
  try{
    const profiles=await new Backend(env).call('profiles?id=eq.'+encodeURIComponent(user.id)+'&select=approved,role');
    if(!profiles[0]?.approved)return reply({error:'Approved Titania access is required.'},403);
    const canManage=['admin','party_organizer'].includes(profiles[0].role);
    let input;try{input=await request.json();}catch{return reply({error:'Invalid request.'},400);}
    if(!input||typeof input.memberId!=='string'||!input.memberId||input.memberId.length>120||!['read','link','unlink'].includes(input.action))return reply({error:'Invalid member request.'},400);
    if(input.action!=='read'&&!canManage)return reply({error:'Only administrators and party organizers can change account links.'},403);
    const store=env.ATTENDANCE.get(env.ATTENDANCE.idFromName(env.DISCORD_GUILD_ID));
    const result=await store.fetch('https://attendance.internal/member-profile',{method:'POST',body:JSON.stringify({memberId:input.memberId,action:input.action,userId:input.userId,expectedUserId:input.expectedUserId,actorId:user.id})});
    return reply({...await result.json(),canManage},result.status);
  }catch{return reply({error:'Discord account details are unavailable. Try again shortly.'},502);}
}

export default {
  async fetch(request,env,ctx){
    if(new URL(request.url).pathname==='/member-discord')return websiteRequest(request,env);
    if(request.method==='GET')return new Response('Titania attendance endpoint is running.');
    if(request.method!=='POST')return new Response('Method not allowed',{status:405});
    const interaction=await verifyRequest(request,env.DISCORD_PUBLIC_KEY);
    if(!interaction)return new Response('Invalid signature',{status:401});
    if(interaction.type===1){
      // Only a signed Discord verification request can trigger setup.
      if(env.ATTENDANCE&&env.DISCORD_BOT_TOKEN)ctx.waitUntil((async()=>{
        try{
          const store=env.ATTENDANCE.get(env.ATTENDANCE.idFromName(env.DISCORD_GUILD_ID));
          await store.fetch('https://attendance.internal/register',{method:'POST'});
        }catch{console.error('Attendance command registration failed; check bot token and installation.');}
      })());
      return json({type:1});
    }
    const privateReply=content=>json({type:4,data:{content,flags:64,allowed_mentions:{parse:[]}}});
    if(interaction.guild_id!==env.DISCORD_GUILD_ID)return privateReply('This bot is restricted to the Titania server.');
    if(interaction.application_id!==env.DISCORD_APPLICATION_ID)return new Response('Wrong application',{status:401});
    if(interaction.channel_id!==env.DISCORD_ATTENDANCE_CHANNEL_ID)return privateReply('Use the configured Titania attendance channel.');
    if(![2,3].includes(interaction.type))return new Response('Unsupported interaction',{status:400});
    if(interaction.type===2&&!isManager(interaction))return privateReply('Only management can use this command. Members can use the Going and Not going buttons.');
    ctx.waitUntil(finishInteraction(interaction,env));
    return json({type:5,data:{flags:64}});
  }
};
