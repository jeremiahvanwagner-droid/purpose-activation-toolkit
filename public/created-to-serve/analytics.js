/* Public funnel events. Contact fields are never read or sent to analytics. */
(function () {
  'use strict';
  if (window.top !== window.self || window.__ywctsAnalytics) return;
  // Vercel preview domains and localhost must not report production conversions.
  if (!['www.truthjblue.com', 'truthjblue.com'].includes(location.hostname)) return;
  window.__ywctsAnalytics = true;
  var GA = 'G-4TF57DLDBH', PIXEL = '815130848255492';
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
  if (!window.fbq) {
    var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    var metaScript = document.createElement('script');
    metaScript.async = true; metaScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(metaScript);
    window.fbq('set', 'autoConfig', false, PIXEL);
    window.fbq('init', PIXEL);
  }
  window.fbq('track', 'PageView');
  function ga(name, details) {
    try { window.gtag('event', name, Object.assign({ funnel_name: 'ywcts', page_location: clean(location.href) }, details)); } catch (_) {}
  }
  function meta(name, details, custom) {
    try { window.fbq(custom ? 'trackCustom' : 'track', name, details); } catch (_) {}
  }
  var products = {
    toolkit: { id: '696d7f574f705f240b0875fd', name: 'Purpose Activation Toolkit', value: 247, payment: '696ec80453f21b434dfae38d' },
    audit: { id: '696d7e4ab83430aa974a7746', name: 'Inner Alignment Audit', value: 97, payment: '696e9d90b112a056c6a3f6c5' }
  };
  function item(p) { return { item_id: p.id, item_name: p.name, price: p.value, quantity: 1 }; }
  var step = location.pathname.replace(/\/$/, '').split('/').pop();
  if (products[step]) {
    var p = products[step];
    ga('view_item', { currency: 'USD', value: p.value, items: [item(p)] });
    meta('ViewContent', { content_ids: [p.id], content_name: p.name, content_type: 'product', currency: 'USD', value: p.value });
  }
  document.addEventListener('click', function (event) {
    var a = event.target.closest && event.target.closest('a');
    if (!a) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (_) { return; }
    var product = products[a.dataset.checkout];
    if (product && url.origin === 'https://site.truthjblue.com' && url.pathname === '/payment-link/' + product.payment) {
      ga('begin_checkout', { currency: 'USD', value: product.value, items: [item(product)] });
      meta('InitiateCheckout', { content_ids: [product.id], content_name: product.name, content_type: 'product', currency: 'USD', value: product.value, num_items: 1 });
    }
    var format = a.dataset.download;
    var pdf = format === 'pdf' && url.origin === location.origin && url.pathname === '/downloads/You-Were-Created-to-Serve.pdf';
    var epub = format === 'epub' && url.origin === 'https://aagqvfwuixpxtdcrdxmv.supabase.co' && url.pathname === '/storage/v1/object/public/project-assets/truth-j-blue/you-were-created-to-serve.epub';
    if (pdf || epub) {
      ga('ebook_download', { book_title: 'You Were Created to Serve', file_format: format });
      meta('EbookDownload', { content_name: 'You Were Created to Serve', file_format: format }, true);
    }
  });
  // The vendor embed marks leadCollected from this specific message contract.
  // Accept only the known form window, origin, form key and bound location.
  var leadSent = false;
  window.addEventListener('message', function (event) {
    var frame = document.getElementById('inline-ABcYghQi26TIMoynS0YC');
    var data = event.data;
    if (leadSent || !frame || event.origin !== 'https://site.truthjblue.com' || event.source !== frame.contentWindow || !Array.isArray(data)) return;
    if (data[0] !== 'set-sticky-contacts' || data[1] !== 'embedded_iframe_' + frame.id || data[2] !== frame.id || data[3] !== 'TW8JsPW5NMnA3tfK2XLn') return;
    leadSent = true;
    ga('generate_lead', { form_id: 'ABcYghQi26TIMoynS0YC', lead_source: 'free_ebook' });
  });
  // Meta Lead is configured on successful submission in the native form.
  // Visits to /resource and /purchase-support are not Lead or Purchase events.
})();
