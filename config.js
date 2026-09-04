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

/* Load the responsive mobile navigation stylesheet without changing index.html. */
(function loadTitaniaMobileNav(){
  if (document.querySelector('link[data-titania-mobile-nav]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './mobile-nav.css?v=20260904';
  link.setAttribute('data-titania-mobile-nav', '1');
  document.head.appendChild(link);
})();

/* Small dashboard layout/readability fixes. */
(function loadTitaniaDashboardFixes(){
  if (document.querySelector('link[data-titania-dashboard-fixes]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './dashboard-fixes.css?v=20260904-1';
  link.setAttribute('data-titania-dashboard-fixes', '1');
  document.head.appendChild(link);
})();

/* Guild League / Siege pre-attendance badge UI. */
(function loadTitaniaPreAttendance(){
  if (!document.querySelector('link[data-titania-pre-attendance]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './attendance-pre.css?v=20260904-1';
    link.setAttribute('data-titania-pre-attendance', '1');
    document.head.appendChild(link);
  }

  const loadScript = () => {
    if (document.querySelector('script[data-titania-pre-attendance]')) return;
    const script = document.createElement('script');
    script.src = './attendance-pre.js?v=20260904-1';
    script.setAttribute('data-titania-pre-attendance', '1');
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
      link.href = './polarity-hidden.css?v=20260904';
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
