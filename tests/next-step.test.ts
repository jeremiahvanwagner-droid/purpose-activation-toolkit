import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync("public/created-to-serve/next-step.js", "utf8");
const MESSAGE = ["set-sticky-contacts", "embedded_iframe_inline-ABcYghQi26TIMoynS0YC", "inline-ABcYghQi26TIMoynS0YC", "TW8JsPW5NMnA3tfK2XLn"];

function setup(options: { narrow?: boolean; reduce?: boolean } = {}) {
  const ga: unknown[][] = [];
  const meta: unknown[][] = [];
  const scrolls: Array<{ behavior: string; block: string }> = [];
  const timers: Array<{ fn: () => void; ms: number }> = [];
  const sender = {};
  const block = {
    hidden: true,
    scrollIntoView(opts: { behavior: string; block: string }) {
      scrolls.push(opts);
    },
  };
  const frame = { id: "inline-ABcYghQi26TIMoynS0YC", contentWindow: sender };
  let onMessage: ((event: { origin: string; source: unknown; data: unknown }) => void) | null = null;
  const win: {
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
    matchMedia: (query: string) => { matches: boolean };
    addEventListener: (type: string, cb: typeof onMessage) => void;
    self: unknown;
    top: unknown;
  } = {
    gtag(...args: unknown[]) {
      ga.push(args);
    },
    fbq(...args: unknown[]) {
      meta.push(args);
    },
    matchMedia(query: string) {
      if (query === "(max-width: 760px)") return { matches: options.narrow === true };
      if (query === "(prefers-reduced-motion: reduce)") return { matches: options.reduce === true };
      return { matches: false };
    },
    addEventListener(type, cb) {
      if (type === "message") onMessage = cb;
    },
    self: null,
    top: null,
  };
  win.self = win;
  win.top = win;
  vm.runInContext(
    source,
    vm.createContext({
      window: win,
      document: { getElementById: (id: string) => (id === frame.id ? frame : id === "ywcts-next-step" ? block : null) },
      setTimeout(fn: () => void, ms: number) {
        timers.push({ fn, ms });
        return timers.length;
      },
    }),
  );
  return {
    ga,
    meta,
    scrolls,
    timers,
    block,
    send(data: unknown = MESSAGE, origin = "https://site.truthjblue.com", source: unknown = sender) {
      onMessage?.({ origin, source, data });
    },
  };
}

test("the next-step block stays hidden and sends nothing for any other message", () => {
  const page = setup();
  page.send(["set-sticky-contacts", "embedded_iframe_other", "inline-ABcYghQi26TIMoynS0YC", "TW8JsPW5NMnA3tfK2XLn"]);
  page.send(MESSAGE, "https://evil.example");
  page.send(MESSAGE, "https://site.truthjblue.com", {});
  assert.equal(page.block.hidden, true);
  assert.equal(page.ga.length, 0);
  assert.equal(page.meta.length, 0);
  assert.equal(page.timers.length, 0);
});

test("a real success shows the block once and sends one GA4 impression, never Meta", () => {
  const page = setup();
  page.send();
  page.send();
  assert.equal(page.block.hidden, false);
  assert.deepEqual(JSON.parse(JSON.stringify(page.ga)), [["event", "toolkit_next_step_view", { funnel_name: "ywcts", transport_type: "beacon" }]]);
  assert.equal(page.meta.length, 0);
  assert.equal(page.timers.length, 0);
});

test("phones scroll the block into view, and reduced motion is instant", () => {
  const phone = setup({ narrow: true });
  phone.send();
  assert.equal(phone.timers.length, 1);
  assert.equal(phone.timers[0].ms, 400);
  phone.timers[0].fn();
  assert.deepEqual(JSON.parse(JSON.stringify(phone.scrolls)), [{ behavior: "smooth", block: "end" }]);

  const still = setup({ narrow: true, reduce: true });
  still.send();
  still.timers[0].fn();
  assert.deepEqual(JSON.parse(JSON.stringify(still.scrolls)), [{ behavior: "auto", block: "end" }]);

  const desktop = setup({ narrow: false, reduce: true });
  desktop.send();
  assert.equal(desktop.timers.length, 0);
});
