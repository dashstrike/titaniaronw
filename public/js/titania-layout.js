(function () {
  'use strict';

  const isPlanner = document.body.dataset.titaniaPage === 'index';
  const navigation = document.getElementById('titania-navigation');
  const topbar = document.getElementById('titania-topbar');
  const content = document.getElementById('titania-page-content');
  const app = document.getElementById('app');
  const events = new Set(['dashboard', 'manage_members', 'guild_league', 'siege', 'attendance']);
  let requestedEvent = null;

  function updateNavigation() {
    if (isPlanner && app) {
      navigation.hidden = app.hidden;
      topbar.hidden = app.hidden;
      document.getElementById('titania-footer').hidden = app.hidden;
      content.style.marginLeft = app.hidden ? '0' : '';
      content.style.paddingTop = app.hidden ? '0' : '';
      if (!app.hidden && requestedEvent) {
        const tab = document.querySelector('.event-tab[data-event="' + requestedEvent + '"]');
        if (tab) { requestedEvent = null; tab.click(); }
      }
    }
    document.querySelectorAll('a[data-planner-event][href]').forEach(link => {
      const active = isPlanner && link.dataset.plannerEvent === document.body.dataset.event;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const roster = document.getElementById('sidebarGuildRoster');
    if (isPlanner && roster) {
      const toggle = document.querySelector('[aria-controls="sidebarGuildRoster"]');
      const active = Boolean(roster.querySelector('a[data-planner-event].active'));
      const wasActive = toggle.classList.contains('active');
      toggle.classList.toggle('active', active);
      if (active && !wasActive && window.bootstrap?.Collapse) {
        bootstrap.Collapse.getOrCreateInstance(roster, {toggle:false}).show();
      }
    }
    if (typeof currentProfile !== 'undefined') setAccount(currentProfile);
  }

  function readRoute() {
    if (!isPlanner) return;
    const hash = location.hash.slice(1);
    const event = hash === 'members' ? 'manage_members' : hash;
    const links = [...document.querySelectorAll('a[data-planner-event][href]')];
    const legacy = events.has(event) && links.find(link => link.dataset.plannerEvent === event);
    if (legacy) history.replaceState(null, '', new URL(legacy.getAttribute('href'), document.baseURI).pathname + location.search);
    const active = links.find(link => new URL(link.getAttribute('href'), document.baseURI).pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, ''));
    requestedEvent = active ? active.dataset.plannerEvent : 'dashboard';
    updateNavigation();
  }

  function setAccount(profile) {
    const usersLink = document.getElementById('titania-users-link');
    if (usersLink) usersLink.hidden = !profile || !profile.approved || profile.role !== 'admin';
    const label = document.getElementById('titania-account-label');
    if (label) label.textContent = profile && profile.approved ? profile.display_name || 'Guild Management' : 'Guild Management';
    if (!isPlanner && document.getElementById('accountBtn')) {
      const approved = Boolean(profile && profile.approved);
      document.getElementById('accountBtn').hidden = !approved;
      document.getElementById('logoutBtn').hidden = !approved;
      document.getElementById('accountName').textContent = approved ? profile.display_name || 'Account' : 'Account';
      document.getElementById('accountRole').textContent = approved ? profile.role : '';
    }
  }

  // Keep existing public/member theme controls in step with Darkone.
  const themeObserver = new MutationObserver(changes => {
    const source = changes[changes.length - 1].attributeName;
    const target = source === 'data-theme' ? 'data-bs-theme' : 'data-theme';
    const theme = document.documentElement.getAttribute(source);
    if (document.documentElement.getAttribute(target) !== theme) document.documentElement.setAttribute(target, theme);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-bs-theme'] });

  if (app) new MutationObserver(updateNavigation).observe(app, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(updateNavigation).observe(document.body, { attributes: true, attributeFilter: ['data-event'] });
  const tabs = document.getElementById('eventTabs');
  if (tabs) new MutationObserver(updateNavigation).observe(tabs, { childList: true });
  window.addEventListener('hashchange', readRoute);
  window.addEventListener('popstate', readRoute);
  document.addEventListener('DOMContentLoaded', readRoute, { once: true });
  readRoute();

  if (!isPlanner && document.body.dataset.titaniaPublic !== 'true' && window.supabase) {
    const cfg = window.TITANIA_CONFIG;
    if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) return;
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    const logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', async () => {
      logout.disabled = true;
      try {
        const result = await client.auth.signOut();
        if (result.error) throw result.error;
        location.href = new URL('dashboard', document.baseURI).href;
      } catch (error) {
        logout.disabled = false;
        window.alert(error.message || 'Could not sign out. Please try again.');
      }
    });
    client.auth.getUser().then(async result => {
      const user = result.data && result.data.user;
      if (!user) return;
      const profile = await client.from('profiles').select('role,approved,display_name').eq('id', user.id).single();
      if (!profile.error) setAccount(profile.data);
    }).catch(() => {});
  }
})();
