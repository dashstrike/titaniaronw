const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

test('public lineup publish codes are 15 alphanumeric characters and rotate',()=>{
  const source=fs.readFileSync('public/js/pages/index.js','utf8');
  const start=source.indexOf('  function newPublicCode()');
  const end=source.indexOf('  async function copySiegePublicLink()',start);
  const context={crypto:require('node:crypto').webcrypto};vm.createContext(context);
  vm.runInContext(source.slice(start,end),context);
  const codes=Array.from({length:20},()=>context.newPublicCode());
  codes.forEach(code=>assert.match(code,/^[A-Za-z0-9]{15}$/));
  assert.equal(new Set(codes).size,codes.length);
});

test('public Guild League code reads the route and restores it after the Pages fallback',()=>{
  const source=fs.readFileSync('public/js/pages/guild-league.js','utf8');
  const start=source.indexOf('function guildPublicCode()');
  const end=source.indexOf('function setupTheme()',start);
  const context={VIEW:'guild',location:{pathname:'/titaniaronw/public/guild-league/',search:'?code=AnYhdjs22Sdd123'},document:{baseURI:'https://dashstrike.github.io/titaniaronw/'},history:{replaceState(_a,_b,path){context.replaced=path;}},URL,URLSearchParams};
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  assert.equal(context.guildPublicCode(),'AnYhdjs22Sdd123');
  assert.equal(context.replaced,'/titaniaronw/public/guild-league/AnYhdjs22Sdd123/');
  context.location={pathname:'/titaniaronw/public/guild-league/Wrong/',search:''};
  assert.equal(context.guildPublicCode(),null);
});

test('public Siege code reads the route and restores the route after the Pages fallback',()=>{
  const source=fs.readFileSync('public/js/pages/siege.js','utf8');
  const start=source.indexOf('function siegePublicCode()');
  const end=source.indexOf('function setupTheme()',start);
  const context={VIEW:'siege',location:{pathname:'/titaniaronw/public/siege/',search:'?code=AnYhdjs22Sdd123'},document:{baseURI:'https://dashstrike.github.io/titaniaronw/'},history:{replaceState(_a,_b,path){context.replaced=path;}},URL,URLSearchParams};
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  assert.equal(context.siegePublicCode(),'AnYhdjs22Sdd123');
  assert.equal(context.replaced,'/titaniaronw/public/siege/AnYhdjs22Sdd123/');
  context.location={pathname:'/titaniaronw/public/siege/Wrong/',search:''};
  assert.equal(context.siegePublicCode(),null);
});
