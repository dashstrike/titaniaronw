export const command={name:'attendance',description:'Titania attendance messages and member links',default_member_permissions:'32',options:[
  {type:1,name:'post',description:'Post Going / Not going buttons for an event',options:[
    {type:3,name:'event',description:'Event type',required:true,choices:[{name:'Guild League Tuesday',value:'guild_league_tuesday'},{name:'Guild League Thursday',value:'guild_league_thursday'},{name:'Siege',value:'siege'}]},
    {type:3,name:'date',description:'YYYY-MM-DD, GMT+8 (default: next event date)'}
  ]},
  {type:1,name:'link',description:'Manually link a Discord member to an active Titania character',options:[{type:6,name:'user',description:'Discord member',required:true},{type:3,name:'character',description:'Exact Titania character name',required:true}]},
  {type:1,name:'unlink',description:'Remove an account link without deleting attendance',options:[{type:6,name:'user',description:'Discord member',required:true}]}
]};

export const voiceCommand={name:'voice-list',description:'Post a CSV snapshot of a voice channel',default_member_permissions:'32',options:[
  {type:7,name:'voice_channel',description:'Voice channel to capture',required:true,channel_types:[2,13]},
  {type:7,name:'post_in',description:'Text channel to post the CSV in',required:true,channel_types:[0,5]}
]};
