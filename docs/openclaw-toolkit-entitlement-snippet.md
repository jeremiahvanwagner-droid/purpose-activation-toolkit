# OpenClaw · Toolkit entitlement snippet

Drop this into `~/.openclaw/ghl-webhook-handler.mjs` inside `handlePayment(data)` — just after the "Mark abandoned cart as completed" block, before the eBook automation gate at line ~483. It writes one row to Supabase `public.entitlements` whenever GHL fires `payment.received` for the Purpose Activation Toolkit payment link.

Two match strategies — either works, or use both for belt-and-braces:

- **By product name** — matches "Purpose Activation Toolkit" (case-insensitive substring).
- **By payment link id** — matches the specific GHL payment link `696ec80453f21b434dfae38d`. Reliable if the payload carries it.

The snippet is idempotent (unique key on `(email, product_id)` in the table). Repeated webhooks won't create duplicates.

---

## Prereqs (env vars are already in `.openclaw/.env`)

- `SUPABASE_URL` — already set
- `SUPABASE_SERVICE_ROLE_KEY` — already set

The service role key bypasses RLS, which is what we want on the server side. Do NOT use the anon key here.

## The code

At the top of `ghl-webhook-handler.mjs` where imports live (if not already present):

```js
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supaAdmin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;
```

Inside `handlePayment(data)`, immediately after the "Mark abandoned cart as completed" try/catch (about line 481):

```js
// Toolkit entitlement — writes public.entitlements so the toolkit app
// unlocks paid routes for the buyer's email. Idempotent (unique key
// on email + product_id).
try {
  const product = (data.product?.name || data.productName || "").toLowerCase();
  const paymentLinkId =
    data.paymentLinkId ||
    data.payment?.paymentLinkId ||
    data.payment?.paymentLink ||
    data.payment_link_id ||
    "";
  const email =
    data.contact?.email ||
    data.email ||
    data.customer?.email ||
    data.payment?.customer?.email;

  const isToolkit =
    product.includes("purpose activation toolkit") ||
    paymentLinkId === "696ec80453f21b434dfae38d";

  if (isToolkit && email && supaAdmin) {
    const { error } = await supaAdmin.from("entitlements").upsert(
      {
        email: String(email).toLowerCase().trim(),
        product_id: "purpose-activation-toolkit",
        source: `ghl:${paymentLinkId || "unknown-link"}`,
        gross_amount: Number(amount) || null,
        contact_id: contact.id || null,
        raw: data,
      },
      { onConflict: "email,product_id" }
    );
    if (error) {
      console.error("[ENTITLEMENT ERROR]", error.message);
    } else {
      console.log(`[ENTITLEMENT] Toolkit unlocked for ${email}`);
    }
  }
} catch (err) {
  console.error("[ENTITLEMENT EXCEPTION]", err.message);
}
```

## What the app does with it

The toolkit's paywall runs client-side:

1. User signs in via magic-link (Supabase auth) with the same email they used at GHL checkout.
2. `useEntitlement("purpose-activation-toolkit")` queries `public.entitlements` for their email + product.
3. RLS lets each user see only their own row (matched on JWT email claim).
4. If a row exists → paywall passes through, modules render.
5. If no row → paywall shows the unlock screen with the buy button.

## Manual grant (for comps, testers, or edge cases)

You can hand out access without going through checkout by inserting a row directly:

```sql
insert into public.entitlements (email, product_id, source)
values (
  lower(trim('someone@example.com')),
  'purpose-activation-toolkit',
  'manual:comp'
)
on conflict (email, product_id) do nothing;
```

Or revoke:

```sql
delete from public.entitlements
where email = lower(trim('someone@example.com'))
  and product_id = 'purpose-activation-toolkit';
```
