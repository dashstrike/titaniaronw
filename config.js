/* Compatibility bootstrap. Real configuration lives in ./js/config.js. */
document.write('<script src="./js/config.js?v=20260908-2"><\/script>');
document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">');
document.write('<script src="./js/job-icons-global.js?v=20260908-2"><\/script>');
document.write('<link rel="stylesheet" href="./css/crowns.css?v=20260906-2">');
document.write('<link rel="stylesheet" href="./css/tooltips.css?v=20260906-1">');
document.write('<script src="./js/tooltips-global.js?v=20260906-2"><\/script>');
document.write('<link rel="stylesheet" href="./css/party-stars.css?v=20260906-8">');
document.write('<script src="./js/member-profile-enhancements.js?v=20260906-2"><\/script>');
document.write('<script src="./js/user-management-link.js?v=20260906-1"><\/script>');
document.write('<script src="./js/guild-runs-link.js?v=20260910-1"><\/script>');
document.write('<script src="./js/organizer-role.js?v=20260907-1"><\/script>');

document.addEventListener('DOMContentLoaded',()=>{
  if(document.querySelector('script[data-titania-party-stars]'))return;
  const script=document.createElement('script');
  script.src='./js/party-stars.js?v=20260906-4';
  script.setAttribute('data-titania-party-stars','1');
  document.body.appendChild(script);
},{once:true});
