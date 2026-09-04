/*
 * Titania website configuration.
 * Safe for browser use: this file contains ONLY the Supabase Project URL and Publishable key.
 * NEVER put a service_role key or secret key in this file.
 */
window.TITANIA_CONFIG = Object.freeze({
  supabaseUrl: 'https://dczcesmpbfurpllqpkml.supabase.co',
  supabasePublishableKey: 'sb_publishable_PZgwOpRXW5Acawq1ZEPBJQ_6xHYf3--',
  appName: 'Titania Guild Management Tool'
});

/*
 * Feature flags.
 * Polarity Zone is temporarily hidden, not deleted.
 * Change polarityZone to true to restore it everywhere.
 */
window.TITANIA_FEATURES = Object.freeze({
  polarityZone: false
});

const TITANIA_IS_MANAGEMENT_PAGE = /\/$|\/index\.html$/i.test(window.location.pathname);
const TITANIA_IS_PUBLIC_EVENT_PAGE = /\/(guild-league|siege)\.html$/i.test(window.location.pathname);

(function loadTitaniaMobileNav(){
  if (!TITANIA_IS_MANAGEMENT_PAGE) return;
  if (document.querySelector('link[data-titania-mobile-nav]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './mobile-nav.css?v=20260904-2';
  link.setAttribute('data-titania-mobile-nav', '1');
  document.head.appendChild(link);
})();

(function loadTitaniaDashboardFixes(){
  if (!TITANIA_IS_MANAGEMENT_PAGE) return;
  if (document.querySelector('link[data-titania-dashboard-fixes]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './dashboard-fixes.css?v=20260904-1';
  link.setAttribute('data-titania-dashboard-fixes', '1');
  document.head.appendChild(link);
})();

/* Guild League / Siege pre-attendance badge UI. */
(function loadTitaniaPreAttendance(){
  if (!TITANIA_IS_MANAGEMENT_PAGE) return;
  if (!document.querySelector('link[data-titania-pre-attendance]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './attendance-pre.css?v=20260904-4';
    link.setAttribute('data-titania-pre-attendance', '1');
    document.head.appendChild(link);
  }

  const loadScript = () => {
    if (document.querySelector('script[data-titania-pre-attendance]')) return;
    const script = document.createElement('script');
    script.src = './attendance-pre.js?v=20260904-3';
    script.setAttribute('data-titania-pre-attendance', '1');
    document.body.appendChild(script);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadScript, {once:true});
  else loadScript();
})();

/* Attendance history / actual attendance tab. */
(function loadTitaniaAttendancePage(){
  if (!TITANIA_IS_MANAGEMENT_PAGE) return;
  if (!document.querySelector('link[data-titania-attendance-page]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './attendance-page.css?v=20260904-2';
    link.setAttribute('data-titania-attendance-page', '1');
    document.head.appendChild(link);
  }

  const loadScript = () => {
    if (document.querySelector('script[data-titania-attendance-page]')) return;
    const script = document.createElement('script');
    script.src = './attendance-page.js?v=20260904-3';
    script.setAttribute('data-titania-attendance-page', '1');
    document.body.appendChild(script);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadScript, {once:true});
  else loadScript();
})();

/* Read-only PRE attendance on published Guild League / Siege pages. */
(function loadTitaniaPublicAttendance(){
  if (!TITANIA_IS_PUBLIC_EVENT_PAGE) return;
  if (!document.querySelector('link[data-titania-public-attendance]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './public-attendance.css?v=20260904-1';
    link.setAttribute('data-titania-public-attendance', '1');
    document.head.appendChild(link);
  }

  const loadScript = () => {
    if (document.querySelector('script[data-titania-public-attendance]')) return;
    const script = document.createElement('script');
    script.src = './public-attendance.js?v=20260904-2';
    script.setAttribute('data-titania-public-attendance', '1');
    document.body.appendChild(script);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadScript, {once:true});
  else loadScript();
})();

/*
 * Reversible Polarity Zone hide switch.
 * This only hides UI/public access; saved Supabase Polarity data remains untouched.
 */
(function applyTitaniaFeatureFlags(){
  if (window.TITANIA_FEATURES && window.TITANIA_FEATURES.polarityZone === false) {
    if (!document.querySelector('link[data-titania-polarity-hidden]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './polarity-hidden.css?v=20260904-2';
      link.setAttribute('data-titania-polarity-hidden', '1');
      document.head.appendChild(link);
    }

    try {
      const storedEvent = localStorage.getItem('roworld_sheets_event_v1');
      if (storedEvent === 'polarity_zone') {
        localStorage.setItem('roworld_sheets_event_v1', 'guild_league');
      }
    } catch (error) {
      /* localStorage may be unavailable; safe to ignore */
    }
  }
})();
