import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('public/created-to-serve/analytics.js', 'utf8');
function setup(url: string, embedded = false) {
  const callbacks: Record<string, (event: any) => void> = {};
  const scripts: any[] = [];
  const sender = {};
  const frame = { id: 'inline-ABcYghQi26TIMoynS0YC', contentWindow: sender };
  const win: any = { addEventListener: (type: string, cb: any) => { callbacks[type] = cb; } };
  win.self = win; win.top = embedded ? {} : win;
  const context = vm.createContext({ window: win, location: new URL(url), URL, URLSearchParams,
    document: { referrer: 'https://example.org/?email=private@example.org',
      createElement: () => ({}), head: { appendChild(script: any) { scripts.push(script); } },
      getElementById: () => frame,
      addEventListener: (type: string, cb: any) => { callbacks[type] = cb; } } });
  vm.runInContext(source, context);
  return { win, context, sender, frame, callbacks, scripts,
    ga: () => Array.from(win.dataLayer ?? [], (x: any) => Array.from(x as any[])),
    meta: () => Array.from(win.fbq?.queue ?? [], (x: any) => Array.from(x as any[])),
    openai: () => Array.from(win.oaiq?.q ?? [], (x: any) => Array.from(x as any[])),
    click: (href: string, dataset: Record<string, string>) => callbacks.click?.({ target: { closest: () => ({ href, dataset }) } }),
  };
}

test('preview and embedded pages report no production conversions', () => {
  for (const url of ['http://127.0.0.1:3044/created-to-serve', 'https://preview.vercel.app/created-to-serve']) {
    assert.equal(setup(url).ga().length, 0);
    assert.equal(setup(url).openai().length, 0);
    assert.equal(setup(url).scripts.length, 0);
  }
  assert.equal(setup('https://www.truthjblue.com/created-to-serve', true).ga().length, 0);
  assert.equal(setup('https://www.truthjblue.com/created-to-serve', true).openai().length, 0);
});

test('ChatGPT pixel initializes once on the public funnel and leaves the campaign URL intact', () => {
  for (const host of ['www.truthjblue.com', 'truthjblue.com']) {
    const url = `https://${host}/created-to-serve?utm_source=chatgpt&utm_medium=paid&utm_campaign=ebook-nov-chatgpt-test-1&utm_content=cover-card-copy-20261115&oppref=opaque-click-reference`;
    const s = setup(url);
    vm.runInContext(source, s.context);
    const scripts = s.scripts.filter((script: any) => script.src === 'https://bzrcdn.openai.com/sdk/oaiq.min.js');
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].async, true);
    assert.equal(JSON.stringify(s.openai()), JSON.stringify([
      ['init', { pixelId: 'R4kGdxSnwwn7ABbgdW1D4N', debug: false }],
    ]));
    assert.equal(s.context.location.href, url);
    assert.equal(s.openai().some((call: any) => call[0] === 'consent'), false, 'do not override an SDK-stored consent denial');
  }
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
  s.click('https://www.truthjblue.com/api/ebook?f=pdf', { download: 'pdf' });
  s.click('https://www.truthjblue.com/api/ebook?f=epub', { download: 'epub' });
  assert.equal(s.ga().filter((x: any) => x[1] === 'ebook_download').length, 4);
  const count = s.ga().length;
  s.click('https://unrelated.example/', { checkout: 'toolkit', download: 'pdf' });
  assert.equal(s.ga().length, count);
  assert.equal(s.meta().some((x: any) => /Purchase|Lead/.test(String(x[1]))), false);
  assert.equal(s.openai().some((x: any) => x[0] === 'measure'), false);
});

test('only a successful message from the exact form can report a lead, once', () => {
  const s = setup('https://www.truthjblue.com/created-to-serve');
  const leads = () => s.meta().filter((x: any) => x[1] === 'Lead');
  const openaiLeads = () => s.openai().filter((x: any) => x[1] === 'lead_created');
  assert.equal(leads().length, 0);
  const valid = { origin: 'https://site.truthjblue.com', source: s.sender,
    data: ['set-sticky-contacts', 'embedded_iframe_' + s.frame.id, s.frame.id, 'TW8JsPW5NMnA3tfK2XLn', 'fingerprint-not-for-analytics'] };
  for (const bad of [{ ...valid, origin: 'https://attacker.example' }, { ...valid, source: {} },
    { ...valid, data: ['set-sticky-contacts', '_ud', s.frame.id, 'TW8JsPW5NMnA3tfK2XLn'] },
    { ...valid, data: ['set-sticky-contacts', 'embedded_iframe_wrong-form', s.frame.id, 'TW8JsPW5NMnA3tfK2XLn'] },
    { ...valid, data: ['set-sticky-contacts', 'embedded_iframe_' + s.frame.id, 'wrong-form', 'TW8JsPW5NMnA3tfK2XLn'] },
    { ...valid, data: ['set-sticky-contacts', 'embedded_iframe_' + s.frame.id, s.frame.id, 'wrong-location'] },
    { ...valid, data: null },
    { ...valid, data: ['iframeLoaded'] }]) s.callbacks.message(bad);
  assert.equal(s.ga().some((x: any) => x[1] === 'generate_lead'), false);
  assert.equal(leads().length, 0);
  assert.equal(openaiLeads().length, 0);
  s.callbacks.message(valid); s.callbacks.message(valid);
  assert.equal(s.ga().filter((x: any) => x[1] === 'generate_lead').length, 1);
  assert.equal(s.ga().filter((x: any) => x[1] === 'ebook_form_submit_success').length, 1);
  assert.equal(s.ga().some((x: any) => x[1] === 'ebook_form_submit_attempt' || x[1] === 'ebook_form_submit_error'), false);
  assert.equal(leads().length, 1);
  const lead = leads()[0] as any[];
  assert.equal(lead[0], 'track');
  assert.equal(JSON.stringify(lead[2]), JSON.stringify({ content_name: 'You Were Created to Serve', content_category: 'free_ebook' }));
  assert.match(lead[3].eventID, /^ywcts-lead-\d+-[a-z0-9]+$/);
  assert.equal(Object.keys(lead[3]).join(','), 'eventID');
  assert.equal(JSON.stringify(lead).includes('fingerprint-not-for-analytics'), false);
  assert.equal(JSON.stringify(s.ga()).includes('fingerprint-not-for-analytics'), false);
  assert.equal(openaiLeads().length, 1);
  assert.equal(JSON.stringify(openaiLeads()[0]), JSON.stringify([
    'measure', 'lead_created', { type: 'customer_action' }, { event_id: lead[3].eventID },
  ]));
  assert.equal(JSON.stringify(s.openai()).includes('fingerprint-not-for-analytics'), false);
  for (const path of ['/created-to-serve/resource', '/created-to-serve/purchase-support']) {
    const page = setup('https://www.truthjblue.com' + path);
    assert.equal(page.ga().some((x: any) => /purchase|generate_lead/.test(String(x[1]))), false);
    assert.equal(page.meta().some((x: any) => x[1] === 'Lead'), false);
    assert.equal(page.openai().some((x: any) => x[0] === 'measure'), false);
  }
});

test('a ChatGPT SDK failure does not interrupt the existing signup tracking', () => {
  const s = setup('https://www.truthjblue.com/created-to-serve');
  s.win.oaiq = () => { throw new Error('SDK unavailable'); };
  const valid = { origin: 'https://site.truthjblue.com', source: s.sender,
    data: ['set-sticky-contacts', 'embedded_iframe_' + s.frame.id, s.frame.id, 'TW8JsPW5NMnA3tfK2XLn'] };
  assert.doesNotThrow(() => s.callbacks.message(valid));
  assert.equal(s.ga().filter((x: any) => x[1] === 'generate_lead').length, 1);
  assert.equal(s.meta().filter((x: any) => x[1] === 'Lead').length, 1);
});

test('the free eBook is the main entry on /start, listed in the sitemap, and no longer gated behind the Audit', async () => {
  const start = readFileSync('public/start/index.html', 'utf8');
  const entry = start.match(/<a class="entry" href="([^"]+)"[^>]*data-slug="([^"]+)"/);
  assert.equal(entry?.[1], 'https://www.truthjblue.com/created-to-serve');
  assert.equal(entry?.[2], 'ebook');
  // Nov 12, 2026 (Page item 20): /start is eBook only, and (item 4) carries no free-Audit wording.
  assert.ok(!start.includes('data-slug="audit" data-slot'), '/start lists no Audit row');
  assert.doesNotMatch(start, /free Inner Alignment Audit|data-slug="(dpw|btv|toolkit|eos|palace|rtl|aama|blog)"/);
  assert.doesNotMatch(start, /Finish all 28 questions|Get the Book|free when you finish|unlocks your profile and your book/);
  const audit = readFileSync('app/(app)/audit/page.tsx', 'utf8');
  assert.doesNotMatch(audit, /Finish the audit to unlock your free eBook/);
  assert.ok(audit.includes('href="/created-to-serve"'));
  const { default: sitemap } = await import('../app/sitemap.ts');
  assert.ok(sitemap().map((e: { url: string }) => e.url).includes('https://www.truthjblue.com/created-to-serve'));
});
