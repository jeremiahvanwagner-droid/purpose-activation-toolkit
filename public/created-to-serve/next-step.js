/* Shows the Toolkit next-step block under the eBook form after a successful
   submit. Same success message analytics.js uses for the Meta Lead: the known
   form window, origin, form key and bound location. This file sends no events
   and reads no contact fields; the Lead still fires only from analytics.js. */
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
  });
})();
