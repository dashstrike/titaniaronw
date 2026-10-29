const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../public/js/roster-search.js'),'utf8');
function fixture(event='guild_league',publicMode=false){
  const nodes=new Map(),timers=new Map(),observers=[];let timerId=0;
  function node(id){
    if(!nodes.has(id))nodes.set(id,{hidden:false,value:'',dataset:{},handlers:{},
      addEventListener(type,callback){this.handlers[type]=callback;},
      removeAttribute(key){if(key==='data-roster-search-match')delete this.dataset.rosterSearchMatch;},
      focus(){this.handlers.focus?.();},blur(){this.blurred=true;this.handlers.blur?.();},
      scrollIntoView(){this.scrolled=(this.scrolled||0)+1;},
    });
    return nodes.get(id);
  }
  function player(name,index){
    const row=node('player-'+index);row.dataset={team:'main_1',slot:String(index)};
    row.querySelector=selector=>selector===(publicMode?'.member-name':'.slot-name')?{childNodes:[{nodeType:3,textContent:name},{nodeType:1,textContent:'FLAG'}]}:null;
    return row;
  }
  let rows=[player('Alex',0),player('Alexander',1),player('Love棉花糖',2)];
  node('glRosterSearch').dataset.publicSearch=publicMode?'true':'false';
  const roster=node(publicMode?'content':'teamsWrap');
  roster.querySelector=()=>rows.length?{}:null;
  roster.querySelectorAll=selector=>['.slot.filled','.slot'].includes(selector)?rows:rows.filter(row=>row.dataset.rosterSearchMatch);
  const body={dataset:{event}};
  vm.runInNewContext(source,{document:{body,getElementById:id=>publicMode&&id==='app'?null:node(id)},window:{matchMedia:()=>({matches:false})},
    setTimeout(callback){timers.set(++timerId,callback);return timerId;},clearTimeout(id){timers.delete(id);},
    MutationObserver:class{constructor(callback){this.callback=callback;}observe(target){observers.push({target,callback:this.callback});}},
  });
  const fire=(id,type,details={})=>node(id).handlers[type]({target:node(id),preventDefault(){},...details});
  return {node,rows,fire,
    flush(){const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());},
    search(value){node('glRosterSearchInput').value=value;fire('glRosterSearchInput','input');this.flush();},
    key(key,shiftKey=false){fire('glRosterSearch','keydown',{target:node('glRosterSearchInput'),key,shiftKey});},
    updateEvent(value){body.dataset.event=value;observers.find(item=>item.target===body).callback();},
    replaceRows(){rows=[player('Alex',3)];observers.find(item=>item.target===roster).callback();this.flush();return rows;},
  };
}
test('inline search is limited to GL and Siege and clears when leaving the roster',()=>{
  const f=fixture('dashboard');assert.equal(f.node('glRosterSearch').hidden,true);
  f.updateEvent('guild_league');assert.equal(f.node('glRosterSearch').hidden,false);f.search('alex');
  f.updateEvent('siege');assert.equal(f.node('glRosterSearch').hidden,false);
  f.updateEvent('dashboard');assert.equal(f.node('glRosterSearch').hidden,true);
  assert.ok(f.rows.every(row=>!row.dataset.rosterSearchMatch));
});
test('public GL and Siege search names without login and exclude decorations',()=>{
  for(const event of ['guild','siege']){
    const f=fixture(event,true);f.search('alex');assert.equal(f.node('glRosterSearchCount').textContent,'1/2');
    f.fire('glRosterSearchNext','click');assert.equal(f.rows[1].dataset.rosterSearchMatch,'active');
    f.search('FLAG');assert.equal(f.node('glRosterSearchCount').textContent,'0 matches');
    f.search('棉花');assert.equal(f.rows[2].dataset.rosterSearchMatch,'active');
  }
});
test('clicking/focusing an empty search expands it immediately and blurring it collapses it',()=>{
  const f=fixture();f.node('glRosterSearchInput').focus();
  assert.equal(f.node('glRosterSearch').dataset.expanded,'true');
  f.node('glRosterSearchInput').blur();assert.equal(f.node('glRosterSearch').dataset.expanded,'false');
});
test('clearing removes highlights and keeps the fixed expanded state while focused',()=>{
  const f=fixture();f.node('glRosterSearchInput').focus();f.search('alex');
  assert.equal(f.node('glRosterSearchControls').hidden,false);f.search('');
  assert.equal(f.node('glRosterSearch').dataset.expanded,'true');
  assert.equal(f.node('glRosterSearchControls').hidden,true);assert.ok(f.rows.every(row=>!row.dataset.rosterSearchMatch));
  f.node('glRosterSearchInput').blur();assert.equal(f.node('glRosterSearch').dataset.expanded,'false');
});
test('case-insensitive partial names and previous/next navigation still work',()=>{
  const f=fixture();f.search(' ALEX ');assert.equal(f.node('glRosterSearchCount').textContent,'1/2');
  assert.equal(f.rows[0].scrolled,1);f.fire('glRosterSearchNext','click');assert.equal(f.rows[1].dataset.rosterSearchMatch,'active');
  f.fire('glRosterSearchPrevious','click');assert.equal(f.rows[0].dataset.rosterSearchMatch,'active');
});
test('Enter and Shift+Enter navigate; Escape keeps the name and highlight',()=>{
  for(const [event,publicMode] of [['guild_league',false],['siege',false],['guild',true],['siege',true]]){
    const f=fixture(event,publicMode);f.search('alex');f.key('Enter');assert.equal(f.rows[1].dataset.rosterSearchMatch,'active');
    f.key('Enter',true);assert.equal(f.rows[0].dataset.rosterSearchMatch,'active');
    f.key('Escape');assert.equal(f.rows[0].dataset.rosterSearchMatch,'active');
    assert.equal(f.node('glRosterSearchInput').value,'alex');assert.equal(f.node('glRosterSearchInput').blurred,true);
  }
});
test('redraw keeps the highlight without scrolling, and leaving the page clears it',()=>{
  const f=fixture();f.search('alex');f.key('Escape');const rows=f.replaceRows();
  assert.equal(rows[0].dataset.rosterSearchMatch,'active');assert.equal(rows[0].scrolled,undefined);
  f.updateEvent('dashboard');assert.equal(rows[0].dataset.rosterSearchMatch,undefined);
});
