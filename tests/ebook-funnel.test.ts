import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('public/created-to-serve/analytics.js', 'utf8');
function setup(url: string, embedded = false) {
  const callbacks: Record<string, (event: any) => void> = {};
  const sender = {};
  const frame = { id: 'inline-ABcYghQi26TIMoynS0YC', contentWindow: sender };
  const win: any = { addEventListener: (type: string, cb: any) => { callbacks[type] = cb; } };
  win.self = win; win.top = embedded ? {} : win;
  const context = vm.createContext({ window: win, location: new URL(url), URL, URLSearchParams,
    document: { referrer: 'https://example.org/?email=private@example.org',
      createElement: () => ({}), head: { appendChild() {} },
      getElementById: () => frame,
      addEventListener: (type: string, cb: any) => { callbacks[type] = cb; } } });
  vm.runInContext(source, context);
  return { win, context, sender, frame, callbacks,
    ga: () => Array.from(win.dataLayer ?? [], (x: any) => Array.from(x)),
    meta: () => Array.from(win.fbq?.queue ?? [], (x: any) => Array.from(x)),
    click: (href: string, dataset: Record<string, string>) => callbacks.click?.({ target: { closest: () => ({ href, dataset }) } }),
  };
}

test('preview and embedded pages report no production conversions', () => {
  for (const url of ['http://127.0.0.1:3044/created-to-serve', 'https://preview.vercel.app/created-to-serve']) {
    assert.equal(setup(url).ga().length, 0);
  }
  assert.equal(setup('https://www.truthjblue.com/created-to-serve', true).ga().length, 0);
});

test('product views, real checkout links and downloads carry accurate values without query data', () => {
  const s = setup('https://www.truthjblue.com/created-to-serve/toolkit?utm_source=email&email=private@example.org');
  const config: any = s.ga().find((x: any) => x[0] === 'config')![2];
  assert.equal(config.page_location, 'https://www.truthjblue.com/created-to-serve/toolkit');
  assert.equal(config.page_referrer, 'https://example.org/');
  assert.equal(config.campaign_source, 'email');
  assert.equal(s.ga().filter((x: any) => x[1] === 'view_item').length, 1);
  vm.runInContext(source, s.context);
  assert.equal(s.ga().filter((x: any) => x[0] === 'config').length, 1);
  s.click('https://site.truthjblue.com/payment-link/696ec80453f21b434dfae38d', { checkout: 'toolkit' });
  s.click('https://site.truthjblue.com/payment-link/696e9d90b112a056c6a3f6c5', { checkout: 'audit' });
  const checkouts = s.ga().filter((x: any) => x[1] === 'begin_checkout');
  assert.deepEqual(checkouts.map((x: any) => x[2].value), [247, 97]);
  s.click('https://www.truthjblue.com/downloads/You-Were-Created-to-Serve.pdf', { download: 'pdf' });
  s.click('https://aagqvfwuixpxtdcrdxmv.supabase.co/storage/v1/object/public/project-assets/truth-j-blue/you-were-created-to-serve.epub', { download: 'epub' });
  assert.equal(s.ga().filter((x: any) => x[1] === 'ebook_download').length, 2);
  const count = s.ga().length;
  s.click('https://unrelated.example/', { checkout: 'toolkit', download: 'pdf' });
  assert.equal(s.ga().length, count);
  assert.equal(s.meta().some((x: any) => /Purchase|Lead/.test(String(x[1]))), false);
});

test('only a successful message from the exact form can report a lead, once', () => {
  const s = setup('https://www.truthjblue.com/created-to-serve');
  const valid = { origin: 'https://site.truthjblue.com', source: s.sender,
    data: ['set-sticky-contacts', 'embedded_iframe_' + s.frame.id, s.frame.id, 'TW8JsPW5NMnA3tfK2XLn'] };
  for (const bad of [{ ...valid, origin: 'https://attacker.example' }, { ...valid, source: {} },
    { ...valid, data: ['set-sticky-contacts', '_ud', s.frame.id, 'TW8JsPW5NMnA3tfK2XLn'] },
    { ...valid, data: ['iframeLoaded'] }]) s.callbacks.message(bad);
  assert.equal(s.ga().some((x: any) => x[1] === 'generate_lead'), false);
  s.callbacks.message(valid); s.callbacks.message(valid);
  assert.equal(s.ga().filter((x: any) => x[1] === 'generate_lead').length, 1);
  assert.equal(setup('https://www.truthjblue.com/created-to-serve/resource').ga().some((x: any) => /purchase|generate_lead/.test(String(x[1]))), false);
});

test('the free eBook is the main entry on /start, listed in the sitemap, and no longer gated behind the Audit', async () => {
  const start = readFileSync('public/start/index.html', 'utf8');
  const entry = start.match(/<a class="entry" href="([^"]+)"[^>]*data-slug="([^"]+)"/);
  assert.equal(entry?.[1], 'https://www.truthjblue.com/created-to-serve');
  assert.equal(entry?.[2], 'ebook');
  assert.ok(start.includes('href="https://www.truthjblue.com/audit" data-utm data-slug="audit"'), 'Audit kept as a secondary link');
  assert.doesNotMatch(start, /Finish all 28 questions|Get the Book|free when you finish|unlocks your profile and your book/);
  const audit = readFileSync('app/(app)/audit/page.tsx', 'utf8');
  assert.doesNotMatch(audit, /Finish the audit to unlock your free eBook/);
  assert.ok(audit.includes('href="/created-to-serve"'));
  const { default: sitemap } = await import('../app/sitemap.ts');
  assert.ok(sitemap().map((e: { url: string }) => e.url).includes('https://www.truthjblue.com/created-to-serve'));
});
