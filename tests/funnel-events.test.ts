import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseFunnelEvent } from '../lib/funnelEvents.ts';

const source = readFileSync('public/created-to-serve/analytics.js', 'utf8');

function run(url: string, withBeacon = true) {
  const callbacks: Record<string, (event: any) => void> = {};
  const beacons: Array<[string, string]> = [];
  const win: any = { addEventListener: (type: string, cb: any) => { callbacks[type] = cb; } };
  win.self = win; win.top = win;
  if (withBeacon) win.navigator = { sendBeacon: (u: string, b: string) => { beacons.push([u, b]); return true; } };
  const context = vm.createContext({ window: win, location: new URL(url), URL, URLSearchParams,
    document: { referrer: 'https://l.facebook.com/l.php?u=private', createElement: () => ({}), head: { appendChild() {} },
      getElementById: () => null, addEventListener: (type: string, cb: any) => { callbacks[type] = cb; } } });
  vm.runInContext(source, context);
  return { beacons, click: (href: string, dataset: Record<string, string>) => callbacks.click?.({ target: { closest: () => ({ href, dataset }) } }) };
}

test('toolkit view and checkout click are counted first-party, without query data', () => {
  const s = run('https://www.truthjblue.com/created-to-serve/toolkit?utm_source=fb&utm_campaign=ebook-nov-meta-test-2&utm_term=Facebook_Mobile_Feed&email=private@example.org');
  assert.equal(s.beacons.length, 1);
  assert.equal(s.beacons[0][0], '/api/funnel-event');
  assert.deepEqual(JSON.parse(s.beacons[0][1]), { event: 'view', page: 'toolkit', utm_source: 'fb', utm_campaign: 'ebook-nov-meta-test-2', utm_term: 'Facebook_Mobile_Feed', referrer_host: 'l.facebook.com' });
  s.click('https://site.truthjblue.com/payment-link/696ec80453f21b434dfae38d', { checkout: 'toolkit' });
  assert.equal(JSON.parse(s.beacons[1][1]).event, 'checkout_click');
  assert.equal(JSON.parse(s.beacons[1][1]).product, 'toolkit');
  s.click('https://unrelated.example/', { checkout: 'toolkit' });
  assert.equal(s.beacons.length, 2);
  assert.equal(s.beacons.some(([, b]) => b.includes('private')), false);
});

test('no counter on preview hosts, unknown pages, or without sendBeacon', () => {
  assert.equal(run('https://preview.vercel.app/created-to-serve/toolkit').beacons.length, 0);
  assert.equal(run('https://www.truthjblue.com/created-to-serve/unknown').beacons.length, 0);
  assert.doesNotThrow(() => run('https://www.truthjblue.com/created-to-serve/toolkit', false));
  assert.equal(JSON.parse(run('https://truthjblue.com/created-to-serve').beacons[0][1]).page, 'created-to-serve');
});

test('the sink keeps only known events and fields', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
  assert.deepEqual(parseFunnelEvent(JSON.stringify({ event: 'checkout_click', page: 'toolkit', product: 'toolkit', email: 'x@y.z', utm_term: '{{placement}}' }), iphone),
    { event: 'checkout_click', page: 'toolkit', product: 'toolkit', device: 'mobile' });
  assert.equal(parseFunnelEvent(JSON.stringify({ event: 'checkout_click', page: 'toolkit' }), null), null);
  assert.equal(parseFunnelEvent(JSON.stringify({ event: 'purchase', page: 'toolkit' }), null), null);
  assert.equal(parseFunnelEvent(JSON.stringify({ event: 'view', page: 'admin' }), null), null);
  assert.equal(parseFunnelEvent('not json', null), null);
  assert.equal(parseFunnelEvent(JSON.stringify({ event: 'view', page: 'toolkit', referrer_host: 'bad host/x' }), 'Windows')?.referrer_host, undefined);
});
