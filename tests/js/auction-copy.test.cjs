const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../public/js/auction.js'), 'utf8');
const copySource = source.slice(source.indexOf('  async function copyIgn('), source.indexOf('  function rowActions('));

function fixture(clipboard, fallback = true, organizerPage = true, rows) {
  const calls = {copied: [], removed: 0, restoredFocus: 0, errors: [], timers: []};
  let textarea;
  const icon = {className: 'fa-regular fa-copy'};
  const button = {disabled: false, dataset: {copyIgn: 'registration-1', copyAllNames: 'fh'}, querySelector: selector => selector === 'i' ? icon : null, getAttribute: () => 'Copy IGN', setAttribute() {}};
  const context = {
    organizerPage, canManage: true, busy: false,
    registrations: rows || [{id: 'registration-1', card_id: 'fh', member_name: 'Love棉花糖'}],
    navigator: {clipboard},
    document: {
      activeElement: {focus() { calls.restoredFocus++; }},
      body: {appendChild(input) { textarea = input; }},
      createElement() { return {setAttribute() {}, select() {}, remove() { calls.removed++; }}; },
      execCommand(command) { assert.equal(command, 'copy'); calls.copied.push(textarea.value); return fallback; },
    },
    message(text) { calls.errors.push(text); },
    setTimeout(callback) { calls.timers.push(callback); },
  };
  vm.createContext(context);
  vm.runInContext(copySource, context);
  return {calls, button, icon, copy: () => context.copyIgn(button), copyAll: () => context.copyAllNames(button)};
}

test('copies the exact IGN with Clipboard API and restores button after feedback', async () => {
  const names = [];
  const f = fixture({writeText: async name => { names.push(name); }});
  await f.copy();
  assert.deepEqual(names, ['Love棉花糖']);
  assert.equal(f.calls.copied.length, 0);
  assert.match(f.icon.className, /fa-check/);
  assert.equal(f.button.dataset.titaniaTooltip, 'Copied');
  f.calls.timers[0]();
  assert.equal(f.button.disabled, false);
  assert.equal(f.icon.className, 'fa-regular fa-copy');
});

test('HTTP Laragon fallback copies Unicode IGN and cleans up temporary input', async () => {
  const f = fixture(undefined);
  await f.copy();
  assert.deepEqual(f.calls.copied, ['Love棉花糖']);
  assert.equal(f.calls.removed, 1);
  assert.equal(f.calls.restoredFocus, 1);
  assert.equal(f.calls.errors.length, 0);
});

test('denied Clipboard API falls back to browser copy', async () => {
  const f = fixture({writeText: async () => { throw new Error('Denied'); }});
  await f.copy();
  assert.deepEqual(f.calls.copied, ['Love棉花糖']);
  assert.equal(f.calls.errors.length, 0);
});

test('failed copy reports failure, cleans up, and leaves the button usable', async () => {
  const f = fixture(undefined, false);
  await f.copy();
  assert.match(f.calls.errors[0], /Could not copy/);
  assert.equal(f.calls.removed, 1);
  assert.equal(f.button.disabled, false);
  assert.equal(f.calls.timers.length, 0);
});

test('public page cannot invoke management copy action', async () => {
  const f = fixture(undefined, true, false);
  await f.copy();
  assert.equal(f.calls.copied.length, 0);
  assert.equal(f.calls.timers.length, 0);
});

test('bulk copy repeats each IGN by its duck count, one per line, for only this item', async () => {
  const f = fixture(undefined, true, true, [
    {card_id: 'fh', member_name: 'George', ducks: 1},
    {card_id: 'fh', member_name: 'Alex', ducks: 3},
    {card_id: 'fh', member_name: 'Zero', ducks: 0},
    {card_id: 'other', member_name: 'Other Item', ducks: 9},
  ]);
  await f.copyAll();
  assert.deepEqual(f.calls.copied, ['Alex\nAlex\nAlex\nGeorge']);
});

test('bulk copy supports exact Unicode names through Clipboard API', async () => {
  const names = [];
  const f = fixture({writeText: async text => { names.push(text); }}, true, true, [
    {card_id: 'fh', member_name: 'Love棉花糖', ducks: 2},
  ]);
  await f.copyAll();
  assert.deepEqual(names, ['Love棉花糖\nLove棉花糖']);
});

test('NEXT BIDDER blocks a new race list', async () => {
  const f = fixture(undefined, true, true, [
    {card_id: 'fh', member_name: 'Alex', ducks: 3, next_bidder: true},
    {card_id: 'fh', member_name: 'George', ducks: 1},
  ]);
  await f.copyAll();
  assert.equal(f.calls.copied.length, 0);
  assert.match(f.calls.errors[0], /Alex is NEXT BIDDER/);
});

test('empty and zero-duck lists do not overwrite the clipboard', async () => {
  const f = fixture(undefined, true, true, [{card_id: 'fh', member_name: 'Alex', ducks: 0}]);
  await f.copyAll();
  assert.equal(f.calls.copied.length, 0);
  assert.match(f.calls.errors[0], /no duck entries/);
});

test('public page cannot copy a race list', async () => {
  const f = fixture(undefined, true, false);
  await f.copyAll();
  assert.equal(f.calls.copied.length, 0);
  assert.equal(f.calls.errors.length, 0);
});

function renderedList(organizerPage, accessory = false) {
  const nodes = new Map();
  const el = id => {
    if (!nodes.has(id)) nodes.set(id, {value: '', querySelectorAll: () => []});
    return nodes.get(id);
  };
  const context = {
    organizerPage, accessory, prefix: accessory ? 'accessory' : 'auction',
    loaded: true, busy: false, workflow: true, canManage: true, expanded: new Map(),
    itemLabel: accessory ? 'accessory' : 'card', theme: accessory ? 'danger' : 'primary',
    registrations: [{id: 'registration-1', member_id: 'one', card_id: 'fh', member_name: 'Alex', ducks: 3}],
    cards: [{value: 'fh', dataset: {name: 'Test Item', image: 'test.webp', effect: 'Test effect', slot: 'BACKWEAR'}}],
    window: {}, el, esc: value => String(value), dropdowns() {}, receiptTime: () => 'Not yet',
    registeredPlayer: row => row.member_name, rowActions: () => '',
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function render(){'), source.indexOf('  async function load(){')), context);
  context.render();
  return el('auctionRegistrations').innerHTML;
}

test('management headers are static with copy buttons and always-open bodies for both categories', () => {
  for (const accessory of [false, true]) {
    const html = renderedList(true, accessory);
    assert.match(html, /data-copy-all-names="fh"/);
    assert.match(html, /Copy All Names/);
    assert.doesNotMatch(html, /data-bs-toggle="collapse"/);
    assert.doesNotMatch(html, /class="collapse/);
    assert.doesNotMatch(html, /fa-chevron/);
  }
});

test('public headers retain their accordion and have no bulk-copy control', () => {
  const html = renderedList(false);
  assert.match(html, /data-bs-toggle="collapse"/);
  assert.match(html, /class="collapse show"/);
  assert.doesNotMatch(html, /data-copy-all-names/);
});
