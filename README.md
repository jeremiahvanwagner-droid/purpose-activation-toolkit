# Purpose Activation Toolkit

**Truth J Blue · Growth by Choice** — an interactive, faith-first digital workbook that guides you from wondering about your purpose to walking in it. $247, one-time, lifetime access, sold through a HighLevel payment link.

Every exercise is fillable, every answer is saved on the device as it's written, and signed-in answers sync to the reader's account. The four companion PDFs (print/annotation workbooks, no form fields) carry the same exercises in their original long form.

## The four modules

1. **Purpose Activation** — the four components of purpose (calling, gifts, assignments, seasons), design patterns, ranked core values, purpose statement, six-domain map, Purpose Morning, renewing the mind, and a signed 30-day plan.
2. **Proper Decision-Making** — the Higher-Self filter, the 7-Step Divine Decision Framework (with the workbook's guidance and a worked example for each step), distortion rewrites, the Values-Based Decision Grid, listening prayer, domain applications, and the Decision Covenant.
3. **Alignment-to-Action** — alignment indicators, the Aligned Action Formula, resistance bypasses, the daily ritual, an accountability ecosystem, the 21-Day Alignment Tracker, and a signed 90-day plan.
4. **Execution Prompts** — 69 journaling prompts in six decks, a custom prompt lab, and a personal prompt toolkit sorted into morning, decision, and evening rotations.

The keepsake (`/workbook`) gathers every answer into a printable document (browser "Save as PDF").

## How answers are saved

[lib/sync/workbookSync.ts](lib/sync/workbookSync.ts) holds the rules; [lib/store.ts](lib/store.ts) binds them to React and `localStorage`; [lib/sync/supabaseRemote.ts](lib/sync/supabaseRemote.ts) talks to `public.workbooks`.

- Every edit is written to the device first. The status labels ("Saved on this device", "Synced to your account", "not synced yet") come from recorded outcomes, never from being signed in.
- Signed-out answers and each account's answers are stored separately. Answers written before signing in are added automatically to a brand-new account (with a way to hand them back), and to an existing account only when the reader chooses.
- The cloud copy is merged field by field with the device copy against the last cloud copy the device saw. A field changed in only one place takes that change; a field changed in both keeps the more recent edit and saves the other version for review.
- A cloud write lands only if the row is still at the version the device merged with (`updated_at`, restamped by the database trigger on every update); otherwise the device re-reads and merges. Nothing is written after a failed read, and a device never deletes an answer because the cloud copy lacks it.
- Signing out with unsynced answers warns first and keeps them on that browser, out of view, until the same account signs in there again.

## Access

Modules and the keepsake are gated by `components/Paywall.tsx`. A signed-in reader is entitled when `public.entitlements` has a row for their email and `purpose-activation-toolkit`. With no row, `/api/entitlement-sync` pages through HighLevel's live transactions for a succeeded charge on the Toolkit payment link (`696ec80453f21b434dfae38d`) to that email and records it. The paywall distinguishes "no purchase found" from "couldn't check", offers **Check my purchase again**, and re-checks when the reader returns from the checkout tab.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # targeted regression tests (Node 22.18+ / 24)
npm run build   # production build + type check
```

`tests/harness/mock-supabase.mjs` is a local stand-in for the Supabase endpoints the app uses, with failure injection and a second-device simulator, for reproducing save and sync behaviour in a real browser. Point a dev server at it with `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key` in `.env.local` (never commit that file).

## What is verified, and where

| Behaviour | Verified by |
| --- | --- |
| Save, reload, offline/failed writes, failed reads, two-device merges and conflicts, sign-out and account switching, late responses | `tests/sync.test.ts`; the same scenarios in a browser against the mock backend |
| Purchase matching (live, succeeded, correct link and email; paging; lookup failures) | `tests/entitlement.test.ts` |
| Keepsake contents and progress counting | `tests/keepsake.test.ts`; printed output checked in headless Edge |
| Real signed-in sync across two devices in production | Not yet exercised — see the owner walkthrough in the handoff |
| A real Toolkit purchase unlocking access | Not yet exercised — no qualifying live purchase exists |

## Repository layout

```
app/          # routes: home, /toolkit, /module/*, /workbook, /audit, /store, API routes
components/   # interactive exercise components (auto-saving)
lib/          # store + sync, entitlements, module registry, content manifests
tests/        # node:test regressions and the mock Supabase harness
legacy/       # earlier prototypes, archived for reference (not built)
```

© Truth J Blue LLC. Educational content; not a substitute for medical or psychological advice.
