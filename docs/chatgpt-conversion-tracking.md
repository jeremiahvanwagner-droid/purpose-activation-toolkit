# ChatGPT Ads conversion tracking

The public `/created-to-serve` funnel uses the existing Truth J Blue web pixel
`R4kGdxSnwwn7ABbgdW1D4N`. Its loader and event call live in
`public/created-to-serve/analytics.js`, alongside the existing GA4 and Meta events.

## Browser measurement

- Initialize the SDK once on `www.truthjblue.com` or `truthjblue.com`, at the top
  level. Localhost, Vercel previews, and embedded copies do not report events.
- Send `lead_created` with `{ type: 'customer_action' }` only after the existing
  HighLevel success message for form `ABcYghQi26TIMoynS0YC`.
- Require the known iframe window, `https://site.truthjblue.com` origin, exact
  form key, and TJB location. Reject load-time `_ud` sticky-contact messages.
- Send at most one lead per page lifecycle. The event ID is generated once and
  passed as the fourth argument's `event_id` field.
- Page loads, resource visits, download clicks, and checkout clicks do not send
  ChatGPT lead or purchase conversions.
- This integration does not read or pass form fields, contact identifiers, or
  email/phone data. The vendor SDK handles its own browser measurement signals.
- Do not override the SDK's stored consent denial. Required email consent in
  HighLevel is not a substitute for a separate measurement-consent policy.
- Production debug logging is disabled. SDK failures cannot interrupt the
  existing Google or Meta lead calls.

The approved landing URL is unchanged:

https://www.truthjblue.com/created-to-serve?utm_source=chatgpt&utm_medium=paid&utm_campaign=ebook-nov-chatgpt-test-1&utm_content=cover-card-copy-20261115

The code leaves query parameters intact, including OpenAI's `oppref` click
reference when one is present.

## Verification

Run `node --import ./tests/register-ts.mjs --test tests/ebook-funnel.test.ts`.
The tests exercise successful, duplicate, malformed, and wrong-origin/window/
form/location messages; preview isolation; SDK queuing; and SDK failure handling.
They do not create a CRM contact or send production conversion events.

After deployment, verify the live SDK loads, then use Ads Manager's pixel Test
flow with an authorized signup. Confirm a single `lead_created` event is received
and the eBook delivery completes. A successful build and a loaded SDK do not prove
event ingestion. Test-labeled events still count in normal analytics.

## Server reporting remains unconfigured

No ChatGPT Ads CAPI key was configured in this Vercel project's environment at
the November 15, 2026 review. This change does not add a server event sender or
alter the Supabase database, Edge Functions, or HighLevel workflow.

To add CAPI, provision a dedicated Ads conversion credential as a server-only
secret, establish a trusted successful-signup source, and share the same event
ID between browser and server (`event_id` in Pixel, `id` in CAPI). Preserve
`oppref` where available, validate with `validate_only: true`, and confirm
deduplication before enabling delivery. Do not independently emit a second lead
with an unrelated ID or expose a credential through `NEXT_PUBLIC_` variables.

Official references:

- https://developers.openai.com/ads/measurement-pixel
- https://developers.openai.com/ads/conversions-api
