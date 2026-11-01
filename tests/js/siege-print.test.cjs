const {test}=require('node:test'),assert=require('node:assert/strict');
const render=require('../fixtures/siege-print.cjs');
test('Siege print preserves all 30 parties, custom row sizes, roles, titles, classes and empty slots',()=>{
  const html=render();
  assert.equal((html.match(/<article /g)||[]).length,30);
  assert.equal((html.match(/class="print-raid-block"/g)||[]).length,7);
  assert.equal((html.match(/--lineup-print-columns:5/g)||[]).length,2);
  assert.match(html,/↻ RESPAWN/);assert.match(html,/♜ CAPTURE/);
  assert.match(html,/aria-label="Raid Leader"/);assert.match(html,/pathfinder_purple_3_stars.png/);
  assert.match(html,/Scholar job icon/);assert.match(html,/Empty team leader/);assert.match(html,/No healer/);
  assert.match(html,/Leader &amp; Friends/);assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>/);
});
test('Guild League print uses the compact cards with battlefield sections and every raid mode',()=>{
  const html=render(undefined,'guild_league');
  assert.match(html,/<h1>TITANIA GUILD LEAGUE<\/h1>/);
  assert.equal((html.match(/<article /g)||[]).length,30);
  assert.match(html,/Main Battlefield/);assert.match(html,/Sub Battlefield/);
  for(const label of ['ATK','DEF','MVP','TOP','MID','BTM'])assert.ok(html.includes('>'+label+'</span>'),label);
  assert.match(html,/aria-label="Raid Leader"/);assert.match(html,/Scholar job icon/);
  assert.doesNotMatch(html,/Star Dungeon|CAPTURE|RESPAWN/);
});
test('print heading names both events and Star Dungeon markers follow the selected party keys',()=>{
  const html=render();
  assert.match(html,/<h1>TITANIA SIEGE\/POLARITY<\/h1>/);
  assert.equal((html.match(/aria-label="Star Dungeon"><svg/g)||[]).length,2);
  assert.equal((html.match(/aria-label="Star Dungeon" hidden/g)||[]).length,28);
  assert.match(html,/data-party-key="party_3_2"[^]*?aria-label="Star Dungeon"><svg/);
  assert.equal((render([]).match(/aria-label="Star Dungeon"><svg/g)||[]).length,0);
});
