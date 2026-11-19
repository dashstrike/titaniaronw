import {command,voiceCommand} from './commands.mjs';
// Run locally. The token is read from an environment variable, never printed.
const token=process.env.DISCORD_BOT_TOKEN;
const application=process.env.DISCORD_APPLICATION_ID||'1562532538847596776';
const guild=process.env.DISCORD_GUILD_ID||'505382879983960064';
if(!token)throw new Error('Set DISCORD_BOT_TOKEN in this terminal first.');
for(const item of [command,voiceCommand]){
  const response=await fetch('https://discord.com/api/v10/applications/'+application+'/guilds/'+guild+'/commands',{
    method:'POST',headers:{Authorization:'Bot '+token,'Content-Type':'application/json'},body:JSON.stringify(item)
  });
  if(!response.ok)throw new Error('Command registration failed (HTTP '+response.status+'). Check the token, application ID and server installation.');
}
console.log('Registered /attendance and /voice-list for the Titania Discord server. Other bot commands were not replaced.');
