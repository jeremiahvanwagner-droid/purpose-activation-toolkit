import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { ATTRIBUTION_KEY, captureAttribution, readAttribution } from "../lib/attribution.ts";
import {
  affiliateTrackingRequested,
  shouldLoadAffiliateTracking,
  trackAffiliateLead,
} from "../lib/affiliateTracking.ts";
import {
  HL_AFFILIATE_BRANDED_URL,
  HL_AFFILIATE_COOKIE_DOMAIN,
  HL_AFFILIATE_LOCATION_ID,
  HL_AFFILIATE_SCRIPT_URL,
} from "../lib/links.ts";
import { rewriteAffiliateFlag } from "../scripts/inline-hl-affiliate-flag.mjs";

const analyticsSource = readFileSync("public/created-to-serve/analytics.js", "utf8");
const FLAG = "NEXT_PUBLIC_HL_AFFILIATE_TRACKING";

function withFlag(value: string | undefined, run: () => void) {
  const previous = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env[FLAG];
    else process.env[FLAG] = previous;
  }
}

test("the affiliate script loads only for www when the flag is exactly true", () => {
  withFlag(undefined, () => {
    assert.equal(affiliateTrackingRequested(), false);
    assert.equal(shouldLoadAffiliateTracking("www.truthjblue.com"), false);
  });
  for (const value of ["", "false", "1", "TRUE", "yes"]) {
    withFlag(value, () => {
      assert.equal(shouldLoadAffiliateTracking("www.truthjblue.com"), false);
    });
  }
  withFlag("true", () => {
    assert.equal(shouldLoadAffiliateTracking("www.truthjblue.com"), true);
    assert.equal(shouldLoadAffiliateTracking("WWW.TRUTHJBLUE.COM:443"), true);
    for (const host of [
      "truthjblue.com",
      "store.truthjblue.com",
      "toolkit.truthjblue.com",
      "shop.truthjblue.com",
      "purpose-activation-toolkit.vercel.app",
      "localhost",
      "",
    ]) {
      assert.equal(shouldLoadAffiliateTracking(host), false, host);
    }
  });
});

test("trackLead sends only the trimmed email, and only when the flag is on", () => {
  const calls: Array<{ email: string }> = [];
  const previous = globalThis.window;
  globalThis.window = {
    affiliateManager: {
      trackLead(lead: { email: string }) {
        calls.push(lead);
      },
    },
  } as unknown as Window & typeof globalThis;
  try {
    withFlag(undefined, () => trackAffiliateLead("reader@example.test"));
    assert.equal(calls.length, 0);
    withFlag("true", () => {
      trackAffiliateLead("  cipher-tjb+aff1122@mail.grokbot.com  ");
      trackAffiliateLead("   ");
      globalThis.window = {} as Window & typeof globalThis;
      trackAffiliateLead("reader@example.test");
      globalThis.window = {
        affiliateManager: {
          trackLead() {
            throw new Error("affiliate down");
          },
        },
      } as unknown as Window & typeof globalThis;
      assert.doesNotThrow(() => trackAffiliateLead("reader@example.test"));
    });
  } finally {
    if (previous === undefined) delete (globalThis as { window?: unknown }).window;
    else globalThis.window = previous;
  }
  assert.deepEqual(calls, [{ email: "cipher-tjb+aff1122@mail.grokbot.com" }]);
});

type Memory = Map<string, string>;

function withBrowser(url: string, run: (memory: Memory) => void, failing = false) {
  const memory: Memory = new Map();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failing) throw new Error("storage blocked");
      memory.set(key, value);
    },
  };
  globalThis.localStorage = storage as unknown as Storage;
  globalThis.window = { location: new URL(url) } as unknown as Window & typeof globalThis;
  try {
    run(memory);
  } finally {
    if (previousWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete (globalThis as { localStorage?: unknown }).localStorage;
    else globalThis.localStorage = previousStorage;
  }
}

test("am_id is stored first-party without replacing an earlier utm source", () => {
  withBrowser("https://www.truthjblue.com/?am_id=%20tjbtest2267%20", (memory) => {
    captureAttribution();
    const stored = JSON.parse(memory.get(ATTRIBUTION_KEY) ?? "{}");
    assert.equal(stored.am_id, "tjbtest2267");
    assert.equal(stored.landing, "/");
    assert.match(stored.captured_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(readAttribution()?.am_id, "tjbtest2267");

    globalThis.window = {
      location: new URL("https://www.truthjblue.com/toolkit?am_id=later&utm_source=email"),
    } as unknown as Window & typeof globalThis;
    captureAttribution();
    const merged = JSON.parse(memory.get(ATTRIBUTION_KEY) ?? "{}");
    assert.equal(merged.am_id, "tjbtest2267");
    assert.equal(merged.utm_source, "email");
    assert.equal(merged.landing, "/");
  });

  withBrowser("https://www.truthjblue.com/?utm_source=tiktok&utm_medium=live", (memory) => {
    captureAttribution();
    globalThis.window = {
      location: new URL("https://www.truthjblue.com/audit?utm_source=email&am_id=partner"),
    } as unknown as Window & typeof globalThis;
    captureAttribution();
    const stored = JSON.parse(memory.get(ATTRIBUTION_KEY) ?? "{}");
    assert.equal(stored.utm_source, "tiktok");
    assert.equal(stored.utm_medium, "live");
    assert.equal(stored.am_id, "partner");
    assert.equal(stored.landing, "/");
  });

  withBrowser("https://www.truthjblue.com/?am_id=" + "x".repeat(250), (memory) => {
    captureAttribution();
    assert.equal(JSON.parse(memory.get(ATTRIBUTION_KEY) ?? "{}").am_id.length, 200);
  });

  withBrowser("https://www.truthjblue.com/", (memory) => {
    captureAttribution();
    assert.equal(memory.size, 0);
  });

  withBrowser("https://www.truthjblue.com/?am_id=kept", () => {
    assert.doesNotThrow(() => captureAttribution());
  }, true);
});

function runAnalytics(source: string, url: string) {
  const scripts: Array<{ src?: string; async?: boolean; onload?: () => void; readyState?: string }> = [];
  const inits: unknown[][] = [];
  const win: {
    affiliateManager?: { init: (...args: unknown[]) => void };
    addEventListener: () => void;
    self: unknown;
    top: unknown;
  } = {
    addEventListener() {},
    self: null,
    top: null,
    affiliateManager: {
      init(...args: unknown[]) {
        inits.push(args);
      },
    },
  };
  win.self = win;
  win.top = win;
  const document = {
    referrer: "",
    head: { appendChild(script: (typeof scripts)[number]) { scripts.push(script); } },
    createElement: () => ({}),
    getElementById: () => null,
    addEventListener() {},
  };
  vm.runInContext(source, vm.createContext({ window: win, location: new URL(url), URL, URLSearchParams, document }));
  return { scripts, inits, win };
}

test("the static loader stays dark and matches the HighLevel snippet", () => {
  assert.equal(analyticsSource.includes("var HL_AFFILIATE_TRACKING = false;"), true);
  assert.equal(analyticsSource.includes(HL_AFFILIATE_SCRIPT_URL), true);
  assert.equal(
    analyticsSource.includes(
      `window.affiliateManager.init('${HL_AFFILIATE_LOCATION_ID}', '${HL_AFFILIATE_BRANDED_URL}', '${HL_AFFILIATE_COOKIE_DOMAIN}')`,
    ),
    true,
  );

  const dark = runAnalytics(analyticsSource, "https://www.truthjblue.com/created-to-serve");
  assert.equal(dark.scripts.some((script) => script.src === HL_AFFILIATE_SCRIPT_URL), false);

  const enabled = rewriteAffiliateFlag(analyticsSource, true);
  assert.equal(enabled.includes("var HL_AFFILIATE_TRACKING = true;"), true);
  assert.equal(rewriteAffiliateFlag(enabled, false).includes("var HL_AFFILIATE_TRACKING = false;"), true);
  assert.throws(() => rewriteAffiliateFlag("var HL_AFFILIATE_TRACKING = false;\nvar HL_AFFILIATE_TRACKING = false;", true));

  for (const url of [
    "https://truthjblue.com/created-to-serve",
    "https://preview.vercel.app/created-to-serve",
    "http://localhost:3000/created-to-serve",
  ]) {
    const skipped = runAnalytics(enabled, url);
    assert.equal(skipped.scripts.some((script) => script.src === HL_AFFILIATE_SCRIPT_URL), false, url);
  }

  const live = runAnalytics(enabled, "https://www.truthjblue.com/created-to-serve/toolkit?am_id=tjbtest2267");
  const script = live.scripts.find((item) => item.src === HL_AFFILIATE_SCRIPT_URL);
  assert.ok(script);
  assert.equal(script.async, true);
  script.readyState = "loading";
  script.onload?.();
  assert.equal(live.inits.length, 0);
  script.readyState = "complete";
  script.onload?.();
  script.onload?.();
  assert.deepEqual(live.inits, [[HL_AFFILIATE_LOCATION_ID, HL_AFFILIATE_BRANDED_URL, HL_AFFILIATE_COOKIE_DOMAIN]]);

  const again = runAnalytics(enabled, "https://www.truthjblue.com/");
  const failing = again.scripts.find((item) => item.src === HL_AFFILIATE_SCRIPT_URL);
  again.win.affiliateManager = {
    init() {
      throw new Error("init failed");
    },
  };
  assert.doesNotThrow(() => failing?.onload?.());
});

test("sign-in still asks for the magic link and reports the affiliate lead from that address", () => {
  const source = readFileSync("components/AccountWidget.tsx", "utf8");
  const ask = source.indexOf("trackAffiliateLead(addr)");
  const prepare = source.indexOf("/api/auth/prepare-signin");
  assert.ok(ask > 0);
  assert.ok(prepare > ask);
});
