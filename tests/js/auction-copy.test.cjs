const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../public/js/auction.js'), 'utf8');
const copySource = source.slice(source.indexOf('  async function copyIgn('), source.indexOf('  function rowActions('));

function fixture(clipboard, fallback = true, organizerPage = true) {
  const calls = {copied: [], removed: 0, restoredFocus: 0, errors: [], timers: []};
  let textarea;
  const icon = {className: 'fa-regular fa-copy'};
  const button = {disabled: false, dataset: {copyIgn: 'registration-1'}, querySelector: () => icon, setAttribute() {}};
  const context = {
    organizerPage, canManage: true,
    registrations: [{id: 'registration-1', member_name: 'Love棉花糖'}],
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
  return {calls, button, icon, copy: () => context.copyIgn(button)};
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
