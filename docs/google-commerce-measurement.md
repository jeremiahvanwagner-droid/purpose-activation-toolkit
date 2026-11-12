# Google commerce measurement — 2026-11-12

## Implemented in this change

The existing Google tag receives `view_item` from product pages and
`begin_checkout` from a product's buy button. Booking and application buttons
do not produce checkout events. Book pages also report observed increases in
Lulu cart quantity as `add_to_cart`. Following a direct Lulu checkout link
reports that book's cart addition and checkout start.

The events contain only catalog fields: product ID, title, category, price,
quantity, currency, and the existing destination measurement ID. No customer
data or arbitrary checkout URL/query string is added. An unknown price stays
unknown; a free item retains an explicit zero price. The helper reuses the
existing tag and makes no additional tag configuration or identifier storage.
The existing tag's consent behavior continues to apply.

| Host | Existing GA4 destination |
| --- | --- |
| store.truthjblue.com, shop.truthjblue.com | G-JP0HS6X4S8 / property 512882981 |
| truthjblue.com, www.truthjblue.com, toolkit.truthjblue.com, media.truthjblue.com | G-4TF57DLDBH / brand property 513904830 |
| Preview, localhost, unknown host | No new ecommerce events |

This preserves `app/layout.tsx` routing. A store page visited under the `www`
host continues to belong to the brand property. The helper does not configure
a second property or attempt to merge the properties.

Toolkit events translate GHL product `696d7f574f705f240b0875fd` into Merchant
offer `696d7f574f705f3755087612`. Book events use `tjb-lulu-<channelProductId>`,
matching `/api/google-books-feed`; Meta retains its existing retailer IDs.

## Purchase reporting is still pending

The current `/api/ghl/order-webhook` sends Meta CAPI only. Inspection of
production environment **names**, without retrieving secret values, found no
store GA4 Measurement Protocol secret. Merchant Center's active GA4 link and
the existing `purchase` key-event definition do not establish a working
payment-to-Google connection.

HighLevel's transaction history returned 17 records: test payments, zero-value
orders, a pending live Toolkit checkout, one historical refunded live charge,
and one failed charge. No current positive-value, live, succeeded payment was
present in that response. This is the TJB HighLevel account's history, not a
statement about all sales or separate Lulu orders. No old record was replayed
to Analytics and no real payment was made during this work.

The workflow API returned `WORKFLOW_API_NOT_ENABLED_FOR_LOCATION` for TJB
location `TW8JsPW5NMnA3tfK2XLn`. Browser access was unavailable in this chat.
Therefore the live workflow trigger, actual webhook payload, hosted-checkout
tag, and completed-payment reporting have not been verified or changed.

## Next implementation requirements

1. Inspect the existing payment workflow in HighLevel and its actual payload.
   Use a successful-payment trigger; confirm first-payment-only renewal rules.
   Preserve working Meta reporting and all contact exclusions.
2. Capture consent-permitted GA client/session identifiers at checkout and
   carry them through to the paid transaction. Verify the tag on the hosted
   checkout and cross-domain configuration. Do not replace missing identifiers
   with a customer's email or fabricated session.
3. Create a Measurement Protocol API secret for the existing store web stream;
   keep it in a server-only Vercel secret. Do not put it in source, a public
   variable, URL examples, screenshots, or client code.
4. Add an independently configured Google purchase sender. Authenticate the
   webhook, verify the transaction against HighLevel, require live mode,
   succeeded status, a recognized payment source, and positive paid value.
   Exclude test, free, pending, failed, refunded, and renewal records.
   Read currency and value from the confirmed transaction, not generic payload
   fields. Use its stable transaction ID and original paid timestamp.
5. Implement durable duplicate protection and a bounded retry/reconciliation
   path. A Google failure must be visible without interrupting payment, access,
   or Meta. Do not mark a failed send as delivered.
6. Validate synthetic payloads with Google's debug validation endpoint, which
   does not add purchases to reports. Then verify a permitted completed-payment
   test against the payment processor and the correct GA4 property. Record the
   order ID, amount, mode, duplicate result, and report evidence before claiming
   end-to-end success. A real charge needs an agreed amount and refund handling.

Lulu needs its own verified order/receipt integration. The current modal
message and local cart are insufficient to establish a Google transaction ID
or actual charged subtotal after discounts; no Google purchase is inferred.

## Merchant book feed activation

The Google-only columns are `shipping_label=lulu_print`,
`return_policy_label=print_final_sale`, and
`excluded_destination=Shopping_ads`. Meta feed columns are unchanged.
Before connecting this feed to account 5681706436, create the matching print
policies, verify rates/delivery promises against Lulu, and verify every live
price and checkout. Attach as a separate scheduled file source for free
listings. Preserve existing product IDs and the approved digital listing.

Do not copy the digital product's free/instant shipping policy to the books.
Labels in a generated file do not establish Merchant Center configuration or
Google approval. The manifest's last metadata verification remains 2026-10-11;
this change does not pretend a new supplier verification occurred.

## References

- [Google ecommerce events](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtag)
- [Measurement Protocol prerequisites and client/session association](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag)
- [Validation endpoint](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
- [Product attributes](https://support.google.com/merchants/answer/7052112?hl=en)
- [Return policies and labels](https://support.google.com/merchants/answer/14011730)
- [Excluded destinations](https://support.google.com/merchants/answer/6324486?hl=en)
- [Unsupported content and the free-listing eBook exception](https://support.google.com/merchants/answer/6150006?hl=en)
