/* GA4 page_view only, matching the /created-to-serve config.
   Preview hosts and iframes stay quiet. No pixel and no Lead event. */
(function () {
  'use strict';
  if (window.top !== window.self || window.__workshopPageView) return;
  if (!['www.truthjblue.com', 'truthjblue.com'].includes(location.hostname)) return;
  window.__workshopPageView = true;
  var GA = 'G-4TF57DLDBH';
  var clean = function (raw) {
    try { var u = new URL(raw, location.href); return u.origin + u.pathname; }
    catch (_) { return ''; }
  };
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  var gaConfig = { page_location: clean(location.href), page_referrer: clean(document.referrer), allow_google_signals: false, allow_ad_personalization_signals: false };
  var params = new URLSearchParams(location.search);
  [['utm_source', 'campaign_source'], ['utm_medium', 'campaign_medium'], ['utm_campaign', 'campaign_name'], ['utm_content', 'campaign_content'], ['utm_term', 'campaign_term']].forEach(function (pair) {
    var v = params.get(pair[0]);
    if (v && /^[a-zA-Z0-9 _.-]{1,100}$/.test(v)) gaConfig[pair[1]] = v;
  });
  window.gtag('js', new Date());
  window.gtag('config', GA, gaConfig);
  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
  document.head.appendChild(gaScript);
})();
