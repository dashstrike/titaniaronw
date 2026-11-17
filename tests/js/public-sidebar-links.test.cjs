const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

test('public sidebar links appear only when published and use the current coded URL',()=>{
  const source=fs.readFileSync('public/js/titania-layout.js','utf8');
  const start=source.indexOf('  function setPublicPageLinks(');
  const end=source.indexOf('  window.addEventListener(',start);
  const nodes=Object.fromEntries(['guildLeague','siege'].map(key=>[key,{hidden:true,link:{href:''},querySelector(){return this.link;}}]));
  const context={document:{baseURI:'https://dashstrike.github.io/titaniaronw/',querySelector(selector){return nodes[selector.match(/"(guildLeague|siege)"/)?.[1]]||null;}},URL};
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  context.setPublicPageLinks({guildLeague:true,guildLeagueCode:'AbCdEf123456789',siege:false,siegeCode:'Qwerty123456789'});
  assert.equal(nodes.guildLeague.hidden,false);
  assert.equal(nodes.guildLeague.link.href,'https://dashstrike.github.io/titaniaronw/public/guild-league/AbCdEf123456789/');
  assert.equal(nodes.siege.hidden,true);
  context.setPublicPageLinks({guildLeague:false,siege:true,siegeCode:'Qwerty123456789'});
  assert.equal(nodes.guildLeague.hidden,true);
  assert.equal(nodes.siege.hidden,false);
  assert.equal(nodes.siege.link.href,'https://dashstrike.github.io/titaniaronw/public/siege/Qwerty123456789/');
  context.setPublicPageLinks(null);
  assert.equal(nodes.guildLeague.hidden,true);assert.equal(nodes.siege.hidden,true);
});
