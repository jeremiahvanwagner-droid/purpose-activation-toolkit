# Purpose Activation Toolkit

**Truth J Blue · Growth by Choice** — an interactive, faith-first digital workbook that guides you from wondering about your purpose to walking in it.

Unlike a PDF, this toolkit is a living workbook: every exercise is fillable, every answer saves automatically, and your journey culminates in signed commitments you can return to.

## The four modules

1. **Purpose Activation** — discover your God-given design, rank your core values, craft your purpose statement, map your six life domains, and sign a 30-day activation covenant.
2. **Proper Decision-Making** — the 7-Step Divine Decision Framework, the Values-Based Decision Grid, and listening prayer.
3. **Alignment-to-Action** — the Aligned Action Formula, daily rituals, and the 21-Day Alignment Tracker.
4. **Execution Prompts** — 69 journaling prompts in six themed decks, plus a custom prompt lab and personal toolkit.

## Tech

- **Next.js 14 (App Router) + TypeScript** — one clean app, statically exportable
- **Local-first persistence** — [lib/store.ts](lib/store.ts) saves every answer to `localStorage` instantly; optional account sync (Supabase) arrives in Phase 2
- **Design system** — navy + gold, light/dark aware, defined in [app/globals.css](app/globals.css)
- Module content lives as typed manifests in [lib/content/](lib/content/) — the source of truth is the original Truth J Blue workbooks

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Roadmap

- [x] Phase 0 — Foundation: clean app, design system, shell
- [x] Phase 1 — Module 1 fully interactive
- [ ] Phase 2 — Accounts, cross-device sync, keepsake PDF export
- [ ] Phase 3 — Modules 2–4
- [ ] Phase 4 — Landing page, checkout, GoHighLevel/Skool integration
- [ ] Phase 5 — Polish, QA, production deploy

## Repository layout

```
app/          # routes: home dashboard + one route per module
components/   # interactive exercise components (auto-saving)
lib/          # store, module registry, content manifests
legacy/       # earlier prototypes, archived for reference
```

© Truth J Blue LLC. Educational content; not a substitute for medical or psychological advice.
