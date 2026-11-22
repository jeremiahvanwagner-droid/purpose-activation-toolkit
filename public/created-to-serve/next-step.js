/* Shows the Toolkit next-step block under the eBook form after a successful
   submit. Same success message analytics.js uses for the Meta Lead: the known
   form window, origin, form key and bound location. GA4 impression only; no
   Meta events. Reads no contact fields; the Lead still fires only from
   analytics.js. */
(function () {
  'use strict';
  if (window.top !== window.self || window.__ywctsNextStep) return;
  window.__ywctsNextStep = true;
  window.addEventListener('message', function (event) {
    var frame = document.getElementById('inline-ABcYghQi26TIMoynS0YC');
    var block = document.getElementById('ywcts-next-step');
    var data = event.data;
    if (!frame || !block || !block.hidden || event.origin !== 'https://site.truthjblue.com' || event.source !== frame.contentWindow || !Array.isArray(data)) return;
    if (data[0] !== 'set-sticky-contacts' || data[1] !== 'embedded_iframe_' + frame.id || data[2] !== frame.id || data[3] !== 'TW8JsPW5NMnA3tfK2XLn') return;
    block.hidden = false;
    // GA4-only impression so the v3 ask can be counted (no Meta event; the Lead still fires once from analytics.js).
    try { if (typeof window.gtag === 'function') window.gtag('event', 'toolkit_next_step_view', { funnel_name: 'ywcts', transport_type: 'beacon' }); } catch (_) {}
    // Phones: bring the button on screen after the form collapses to its thank-you height.
    try {
      if (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) {
        var motion = 'smooth';
        try {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) motion = 'auto';
        } catch (_) {}
        setTimeout(function () { block.scrollIntoView({ behavior: motion, block: 'end' }); }, 400);
      }
    } catch (_) {}
  });
})();
