import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captureVoice,voiceCsv,voiceRows} from '../voice-list.mjs';
import {voiceCommand} from '../commands.mjs';
import {AttendanceStore} from '../worker.mjs';

test('voice command requires a voice channel and destination text channel',()=>{
  assert.equal(voiceCommand.name,'voice-list');
  assert.deepEqual(voiceCommand.options.map(option=>option.channel_types),[[2,13],[0,5]]);
});

test('snapshot selects only the requested channel and prefers server nicknames',()=>{
  const guild={members:[{user:{id:'1',username:'First'},nick:'A nickname'},{user:{id:'2',username:'Second',global_name:'Second display'}}],voice_states:[{user_id:'2',channel_id:'voice'},{user_id:'1',channel_id:'voice'},{user_id:'3',channel_id:'other'}]};
  assert.deepEqual(voiceRows(guild,'voice'),[{id:'1',name:'A nickname'},{id:'2',name:'Second display'}]);
});

test('CSV contains only names, escapes quotes, and protects spreadsheet formulas',()=>{
  const csv=voiceCsv([{id:'123',name:'=SUM(1,2)'},{id:'456',name:'Name "quoted"'}]);
  assert.match(csv,/^\uFEFFname\r\n/);
  assert.match(csv,/"'=SUM\(1,2\)"/);
  assert.match(csv,/"Name ""quoted"""/);
  assert.doesNotMatch(csv,/123|456/);
});

test('one time Gateway connection identifies and returns current voice members',async()=>{
  const listeners={},sent=[];
  const socket={accept(){},send(data){sent.push(JSON.parse(data));},close(){},addEventListener(name,fn){listeners[name]=fn;}};
  const result=captureVoice('guild','voice','secret',{connect:async()=>({webSocket:socket}),timeoutMs:1000});
  await Promise.resolve();
  listeners.message({data:JSON.stringify({op:10,d:{heartbeat_interval:45000}})});
  assert.equal(sent[0].op,2);
  assert.equal(sent[0].d.intents,129);
  listeners.message({data:JSON.stringify({op:0,t:'GUILD_CREATE',d:{id:'guild',members:[{user:{id:'1',username:'Player'}}],voice_states:[{user_id:'1',channel_id:'voice'}]}})});
  assert.deepEqual(await result,[{id:'1',name:'Player'}]);
});

test('command posts CSV attachment without writing attendance',async()=>{
  const previous=globalThis.fetch,storeData=new Map(),calls=[];
  const guild='505382879983960064',voice='111111111111111111',destination='222222222222222222';
  const storage={get:key=>storeData.get(key),put:(key,value)=>{storeData.set(key,value);},transaction:fn=>fn(storage),getAlarm:()=>null,setAlarm:()=>{}};
  const env={DISCORD_GUILD_ID:guild,DISCORD_ATTENDANCE_CHANNEL_ID:'333333333333333333',DISCORD_BOT_TOKEN:'test'};
  const store=new AttendanceStore({storage},env);
  globalThis.fetch=async(url,options)=>{
    if(String(url).startsWith('https://gateway.discord.gg/')){
      assert.equal(options.headers.Upgrade,'websocket');
      const listeners={};
      const socket={accept(){queueMicrotask(()=>listeners.message({data:JSON.stringify({op:10})}));},addEventListener(name,fn){listeners[name]=fn;},send(packet){if(JSON.parse(packet).op===2)queueMicrotask(()=>listeners.message({data:JSON.stringify({op:0,t:'GUILD_CREATE',d:{id:guild,members:[{user:{id:'444444444444444444',username:'Test Player'}}],voice_states:[{user_id:'444444444444444444',channel_id:voice}]}})}));},close(){}};
      return {webSocket:socket};
    }
    calls.push({url:String(url),options});return Response.json({id:'posted'});
  };
  try{
    const interaction={id:'555555555555555555',type:2,guild_id:guild,channel_id:'777777777777777777',member:{user:{id:'666666666666666666'},permissions:'32'},data:{name:'voice-list',options:[{name:'voice_channel',value:voice},{name:'post_in',value:destination}],resolved:{channels:{[voice]:{type:2},[destination]:{type:0}}}}};
    const response=await store.process(interaction);
    assert.match((await response.json()).content,/Posted 1 name/);
    assert.equal(calls.length,1);
    assert.match(calls[0].url,new RegExp('/channels/'+destination+'/messages$'));
    assert.match(await calls[0].options.body.get('files[0]').text(),/Test Player/);
    assert.deepEqual(JSON.parse(calls[0].options.body.get('payload_json')).allowed_mentions,{parse:[]});
  }finally{globalThis.fetch=previous;}
});
