/* Compatibility bootstrap. Real configuration lives in ./js/config.js. */
document.write('<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"><\/script>');
document.write('<script src="./js/config.js?v=siege-rook-1"><\/script>');
document.write('<script src="./js/job-icons-global.js?v=clean-routes-1"><\/script>');
document.write('<link rel="stylesheet" href="./css/crowns.css?v=clean-routes-1">');
document.write('<link rel="stylesheet" href="./css/party-stars.css?v=gold-star-1">');
document.write('<link rel="stylesheet" href="./css/ui-polish.css?v=clean-routes-1">');
document.write('<script src="./js/member-profile-enhancements.js?v=clean-routes-1"><\/script>');
document.write('<script src="./js/member-csv-import-link.js?v=clean-routes-1"><\/script>');
document.write('<script src="./js/user-management-link.js?v=clean-routes-1"><\/script>');
document.write('<script src="./js/guild-runs-link.js?v=siege-rook-1"><\/script>');
document.write('<script src="./js/organizer-role.js?v=clean-routes-1"><\/script>');
document.write('<link rel="stylesheet" href="./css/attendance-page.css?v=clean-routes-1">');
document.write('<script src="./js/attendance-delete.js?v=clean-routes-1"><\/script>');
document.write('<script src="./js/attendance-layout.js?v=clean-routes-1"><\/script>');
document.write('<script src="./js/party-pool.js?v=clean-routes-1"><\/script>');
document.write('<script src="./js/siege-polarity-label.js?v=clean-routes-1"><\/script>');
document.write('<script src="./js/dashboard-weekly-ranking.js?v=stable-ranking-1"><\/script>');

document.addEventListener('DOMContentLoaded',()=>{
  if(document.querySelector('script[data-titania-party-stars]'))return;
  const script=document.createElement('script');
  script.src='./js/party-stars.js?v=clean-routes-1';
  script.setAttribute('data-titania-party-stars','1');
  document.body.appendChild(script);
},{once:true});
