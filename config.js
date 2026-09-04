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

/* Load the responsive mobile navigation stylesheet without changing index.html. */
(function loadTitaniaMobileNav(){
  if (document.querySelector('link[data-titania-mobile-nav]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './mobile-nav.css?v=20260904';
  link.setAttribute('data-titania-mobile-nav', '1');
  document.head.appendChild(link);
})();
