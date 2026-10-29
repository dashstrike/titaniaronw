const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../public/js/roster-search.js'),'utf8');

function fixture(event='guild_league',publicMode=false){
  const nodes=new Map(),timers=new Map(),observers=[];
  let timerId=0;
  function node(id){
    if(!nodes.has(id))nodes.set(id,{hidden:false,value:'',dataset:{},handlers:{},attributes:{},
      addEventListener(type,callback){this.handlers[type]=callback;},
      setAttribute(key,value){this.attributes[key]=value;},
      removeAttribute(key){if(key==='data-roster-search-match')delete this.dataset.rosterSearchMatch;},
      focus(){this.focused=true;},scrollIntoView(){this.scrolled=(this.scrolled||0)+1;},
    });
    return nodes.get(id);
  }
  function player(name,index){
    const row=node('player-'+index);
    row.dataset={team:'main_1',slot:String(index)};
    row.querySelector=selector=>selector===(publicMode?'.member-name':'.slot-name')?{childNodes:[{nodeType:3,textContent:name},{nodeType:1,textContent:'FLAG'}]}:null;
    return row;
  }
  let rows=[player('Alex',0),player('Alexander',1),player('Love棉花糖',2)];
  node('glRosterSearchPanel').hidden=true;
  node('glRosterSearch').dataset.publicSearch=publicMode?'true':'false';
  const roster=node(publicMode?'content':'teamsWrap');
  roster.querySelector=()=>rows.length?{}:null;
  roster.querySelectorAll=selector=>['.slot.filled','.slot'].includes(selector)?rows:rows.filter(row=>row.dataset.rosterSearchMatch);
  const body={dataset:{event}};
  const context={document:{body,getElementById:id=>publicMode&&id==='app'?null:node(id)},window:{matchMedia:()=>({matches:false})},
    setTimeout(callback){timers.set(++timerId,callback);return timerId;},clearTimeout(id){timers.delete(id);},
    MutationObserver:class{constructor(callback){this.callback=callback;}observe(target){observers.push({target,callback:this.callback});}},
  };
  vm.runInNewContext(source,context);
  const fire=(id,type,details={})=>node(id).handlers[type]({target:node(id),preventDefault(){},...details});
  return {node,body,rows,fire,
    flush(){const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());},
    search(value){node('glRosterSearchInput').value=value;fire('glRosterSearchInput','input');this.flush();},
    updateEvent(value){body.dataset.event=value;observers.find(item=>item.target===body).callback();},
    replaceRows(){rows=[player('Alex',3)];observers.find(item=>item.target===roster).callback();this.flush();return rows;},
  };
}
test('search is limited to GL and Siege rosters and closes on other pages',()=>{
  const f=fixture('dashboard');assert.equal(f.node('glRosterSearch').hidden,true);
  f.updateEvent('guild_league');assert.equal(f.node('glRosterSearch').hidden,false);
  f.fire('glRosterSearchToggle','click');f.search('alex');
  f.updateEvent('siege');assert.equal(f.node('glRosterSearch').hidden,false);
  f.updateEvent('dashboard');assert.equal(f.node('glRosterSearch').hidden,true);
  assert.equal(f.node('glRosterSearchPanel').hidden,true);
  assert.ok(f.rows.every(row=>!row.dataset.rosterSearchMatch));
});
test('public GL and Siege search published names without a management app or login',()=>{
  for(const event of ['guild','siege']){
    const f=fixture(event,true);assert.equal(f.node('glRosterSearch').hidden,false);
    f.fire('glRosterSearchToggle','click');f.search('alex');
    assert.equal(f.node('glRosterSearchCount').textContent,'1 of 2 matches');
    f.fire('glRosterSearchNext','click');assert.equal(f.rows[1].dataset.rosterSearchMatch,'active');
    assert.equal(f.rows[1].scrolled,1);
    f.search('FLAG');assert.equal(f.node('glRosterSearchCount').textContent,'No roster matches.');
    f.search('棉花');assert.equal(f.rows[2].dataset.rosterSearchMatch,'active');
    f.fire('glRosterSearchClose','click');assert.ok(f.rows.every(row=>!row.dataset.rosterSearchMatch));
  }
});
test('Siege supports player search and scrolls to the matching row',()=>{
  const f=fixture('siege');assert.equal(f.node('glRosterSearch').hidden,false);
  f.fire('glRosterSearchToggle','click');f.search('棉花');
  assert.equal(f.rows[2].dataset.rosterSearchMatch,'active');assert.equal(f.rows[2].scrolled,1);
});
test('case-insensitive partial names highlight matches and support next/previous',()=>{
  const f=fixture();f.fire('glRosterSearchToggle','click');f.search(' ALEX ');
  assert.equal(f.node('glRosterSearchCount').textContent,'1 of 2 matches');
  assert.equal(f.rows[0].dataset.rosterSearchMatch,'active');assert.equal(f.rows[0].scrolled,1);
  f.fire('glRosterSearchNext','click');assert.equal(f.rows[1].dataset.rosterSearchMatch,'active');
  f.fire('glRosterSearchPrevious','click');assert.equal(f.rows[0].dataset.rosterSearchMatch,'active');
});
test('Unicode names work and decorations are excluded from matching',()=>{
  const f=fixture();f.fire('glRosterSearchToggle','click');f.search('棉花');
  assert.equal(f.rows[2].dataset.rosterSearchMatch,'active');
  f.search('FLAG');assert.equal(f.node('glRosterSearchCount').textContent,'No roster matches.');
  assert.equal(f.node('glRosterSearchNext').disabled,true);
  f.search('');assert.equal(f.node('glRosterSearchCount').textContent,'Enter a player name.');
  assert.ok(f.rows.every(row=>!row.dataset.rosterSearchMatch));
});
test('roster redraw reapplies matches without scrolling or changing roster content',()=>{
  const f=fixture();f.fire('glRosterSearchToggle','click');f.search('alex');
  const rows=f.replaceRows();assert.equal(rows[0].dataset.rosterSearchMatch,'active');
  assert.equal(rows[0].scrolled,undefined);assert.equal(f.node('glRosterSearchCount').textContent,'1 of 1 matches');
  f.fire('glRosterSearchClose','click');assert.equal(rows[0].dataset.rosterSearchMatch,undefined);
  assert.equal(f.node('glRosterSearchToggle').focused,true);
});
