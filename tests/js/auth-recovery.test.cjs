const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../public/js/pages/index.js'), 'utf8');
const authSource = source.slice(source.indexOf('  function configReady(){'), source.indexOf('  async function fetchCurrentProfile('));

function fixture(url, session = {user: {id: 'test-user'}}) {
  let current = new URL(url);
  const nodes = new Map();
  const element = id => {
    if (!nodes.has(id)) nodes.set(id, {hidden: false, disabled: false, value: '', textContent: '', className: '', addEventListener() {}, classList: {toggle() {}}});
    return nodes.get(id);
  };
  const calls = {entered: 0, resets: 0, updates: 0, signOut: []};
  const auth = {
    onAuthStateChange(callback) { this.listener = callback; },
    async getSession() { return {data: {session}, error: null}; },
    async resetPasswordForEmail(email, options) { calls.resets++; calls.redirect = options.redirectTo; return {error: null}; },
    async updateUser() { calls.updates++; return {error: null}; },
    async signOut(options) { calls.signOut.push(options.scope); return {error: null}; },
  };
  const context = {
    URL, URLSearchParams, Date,
    location: {
      get href() { return current.href; },
      get pathname() { return current.pathname; },
      get search() { return current.search; },
      get hash() { return current.hash; },
    },
    history: {replaceState(_state, _title, next) { current = new URL(next, current); }},
    document: {baseURI: 'http://titaniaronw.test/', getElementById: element, querySelectorAll: () => []},
    window: {
      TITANIA_CONFIG: {supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_fake_key_for_tests'},
      supabase: {createClient() { current.hash = ''; return {auth}; }},
    },
    enterAuthenticatedApp: async () => { calls.entered++; },
    checkApproval() {}, logoutAccount() {}, closeAdminUsers() {}, loadAdminUsers() {},
  };
  vm.createContext(context);
  vm.runInContext(`let supabaseClient = null;
    let passwordRecoveryMode = false;
    let passwordResetRequestInFlight = false;
    let passwordResetRequestedAt = 0;
    let passwordResetUpdateInFlight = false;
    ${authSource}
    globalThis.actions = {bootstrapWebsite, sendPasswordReset, finishPasswordReset, cancelPasswordReset};`, context);
  return {actions: context.actions, auth, calls, element, url: () => current};
}

test('recovery hash opens reset form before SDK consumes it, without waiting for an auth event', async () => {
  const f = fixture('http://titaniaronw.test/#access_token=fake&type=recovery');
  await f.actions.bootstrapWebsite();
  assert.equal(f.calls.entered, 0);
  assert.equal(f.element('authResetPanel').hidden, false);
  assert.equal(f.element('authResetBtn').disabled, false);
  assert.equal(f.url().searchParams.get('password_reset'), '1');
});

test('reloading a consumed recovery link stays on reset form', async () => {
  const f = fixture('http://titaniaronw.test/login?password_reset=1');
  await f.actions.bootstrapWebsite();
  assert.equal(f.calls.entered, 0);
  assert.equal(f.element('authResetPanel').hidden, false);
});

test('ordinary saved sessions still open the application', async () => {
  const f = fixture('http://titaniaronw.test/dashboard');
  await f.actions.bootstrapWebsite();
  assert.equal(f.calls.entered, 1);
});

test('successful password reset signs out and returns to sign in', async () => {
  const f = fixture('http://titaniaronw.test/?password_reset=1');
  await f.actions.bootstrapWebsite();
  f.element('authResetPassword').value = 'example-test-password';
  f.element('authResetPassword2').value = 'example-test-password';
  await f.actions.finishPasswordReset();
  assert.equal(f.calls.updates, 1);
  assert.deepEqual(f.calls.signOut, ['local']);
  assert.equal(f.calls.entered, 0);
  assert.equal(f.element('authLoginPanel').hidden, false);
  assert.match(f.element('authLoginMessage').textContent, /Sign in with your new password/);
  assert.equal(f.url().search, '');
  assert.equal(f.element('authResetPassword').value, '');
});

test('concurrent clicks and immediate retry send only one recovery request', async () => {
  const f = fixture('http://titaniaronw.test/login', null);
  await f.actions.bootstrapWebsite();
  f.element('authLoginEmail').value = 'test@example.com';
  let release;
  f.auth.resetPasswordForEmail = async (_email, options) => {
    f.calls.resets++;
    f.calls.redirect = options.redirectTo;
    return new Promise(resolve => { release = resolve; });
  };
  const first = f.actions.sendPasswordReset();
  await f.actions.sendPasswordReset();
  assert.equal(f.calls.resets, 1);
  assert.equal(f.element('authForgotBtn').disabled, true);
  release({error: null});
  await first;
  await f.actions.sendPasswordReset();
  assert.equal(f.calls.resets, 1);
  assert.equal(new URL(f.calls.redirect).searchParams.get('password_reset'), '1');
  assert.equal(f.element('authForgotBtn').disabled, false);
});

test('expired recovery link blocks update and allows returning to sign in', async () => {
  const f = fixture('http://titaniaronw.test/?password_reset=1#error_description=Expired', null);
  await f.actions.bootstrapWebsite();
  assert.equal(f.calls.entered, 0);
  assert.equal(f.element('authResetBtn').disabled, true);
  assert.match(f.element('authResetMessage').textContent, /invalid or expired/);
  await f.actions.cancelPasswordReset();
  assert.equal(f.element('authLoginPanel').hidden, false);
  assert.equal(f.url().search, '');
});
