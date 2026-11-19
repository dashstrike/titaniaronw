const GATEWAY='https://gateway.discord.gg/?v=10&encoding=json';
const intents=1|128; // GUILDS and GUILD_VOICE_STATES; neither is privileged.

export function voiceRows(guild,channelId){
  const members=new Map((guild.members||[]).map(member=>[member.user?.id,member]));
  return (guild.voice_states||[]).filter(state=>state.channel_id===channelId).map(state=>{
    const member=state.member||members.get(state.user_id);
    const user=member?.user;
    return {id:state.user_id,name:member?.nick||user?.global_name||user?.username||state.user_id};
  }).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
}

const csvCell=value=>{
  const safe=String(value).replace(/^[\s\uFEFF]*[=+@\-]/u,match=>"'"+match);
  return '"'+safe.replaceAll('"','""')+'"';
};
export function voiceCsv(rows){
  return '\uFEFFname\r\n'+rows.map(row=>csvCell(row.name)).join('\r\n')+'\r\n';
}

export async function captureVoice(guildId,channelId,token,{connect=()=>fetch(GATEWAY,{headers:{Upgrade:'websocket'}}),timeoutMs=18000}={}){
  const response=await connect();
  const socket=response.webSocket;
  if(!socket)throw new Error('Discord Gateway connection failed');
  socket.accept();
  return new Promise((resolve,reject)=>{
    let done=false,identified=false;
    const finish=(error,rows)=>{
      if(done)return;
      done=true;clearTimeout(timer);
      try{socket.close(1000,'snapshot complete');}catch{}
      if(error)reject(error);else resolve(rows);
    };
    const timer=setTimeout(()=>finish(new Error('Discord voice snapshot timed out')),timeoutMs);
    socket.addEventListener('message',event=>{
      let packet;try{packet=JSON.parse(event.data);}catch{return;}
      if(packet.op===10&&!identified){
        identified=true;
        socket.send(JSON.stringify({op:2,d:{token,intents,properties:{os:'cloudflare',browser:'titania',device:'titania'}}}));
      }
      if(packet.op===1)socket.send(JSON.stringify({op:1,d:null}));
      if(packet.op===0&&packet.t==='GUILD_CREATE'&&packet.d?.id===guildId){
        if(packet.d.unavailable)return finish(new Error('Discord guild is temporarily unavailable'));
        finish(null,voiceRows(packet.d,channelId));
      }
    });
    socket.addEventListener('close',event=>finish(new Error('Discord Gateway closed before the voice snapshot (code '+event.code+')')));
    socket.addEventListener('error',()=>finish(new Error('Discord Gateway connection failed')));
  });
}
