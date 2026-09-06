/* Compatibility bootstrap. Real configuration lives in ./js/config.js. */
document.write('<script src="./js/config.js?v=20260905-1"><\/script>');
document.write('<script src="./js/job-icons-global.js?v=20260905-1"><\/script>');
document.write('<link rel="stylesheet" href="./css/party-stars.css?v=20260906-2">');

document.addEventListener('DOMContentLoaded',()=>{
  if(document.querySelector('script[data-titania-party-stars]'))return;
  const script=document.createElement('script');
  script.src='./js/party-stars.js?v=20260906-1';
  script.setAttribute('data-titania-party-stars','1');
  document.body.appendChild(script);
},{once:true});
