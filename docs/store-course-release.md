# Store-to-course release checklist

Verified October 31, 2026. This is an activation checklist, not a completed release.

## Current buyer path

All three products already appear at https://store.truthjblue.com/courses-workbooks.
Product cards open product detail pages. The purchase buttons open existing
HighLevel payment links in a new tab. A product listing or working payment link
does not establish enrollment, a course invitation, or usable lessons.

| Product | Existing payment product / price | Current delivery evidence |
| --- | --- | --- |
| Inner-Work Integration Course, $47 once | `699f939f4346b061ac834235` / `699f939f4346b0658483423a` | Native course `1307f904-5b54-4e28-947d-82c648a885ad`: five written lessons, all draft, no recording content IDs; nine planned entries. No matching explicit Membership Offer in current listing. |
| Divine Alignment Blueprint, $27 once | `699fa003a14ffb50139b4b55` / `699fa003a14ffbe0d19b4b5a` | Personalized report remains at `https://www.truthjblue.com/store/blueprint`. Separate companion course `3651b42d-3467-4ef8-91c9-b8731edcaeb4`: six written lessons, all draft. No matching explicit Membership Offer in current listing. The report and companion hub are different delivery surfaces. |
| First Step Through the Veil, $247 once | `6a4eb9eb6630447c7bd80f0d` / price must be verified | No matching native course or explicit Membership Offer in the complete current listings. Fourteen planned entries remain in the course production scope. |

Evidence: current HighLevel course list (eight rows, no next cursor), explicit
Membership Offer list (six unrelated rows, no next cursor), and complete lesson
lists for Inner-Work and Blueprint. Default/system offers are excluded by the
offer API; absence here does not prove no legacy workflow or system offer exists.
The course-production checkpoint remains DESIGNED, with zero accepted products.

The repository's `app/api/ghl/order-webhook/route.ts` reports Meta purchase events;
it does not enroll course learners. Adding course IDs to that analytics webhook
would not repair fulfillment. Existing website entitlement sync for the Toolkit,
Audit and personalized Blueprint must remain separate from native course access.

## Change prepared with this checklist

The two LMS product pages gain an **Already purchased? Get course access help**
link. `/store/course-access` explains the separate portal sign-in and offers a
course-specific email link to the existing support address. It requires no second
purchase, sends no message automatically, grants no access, and makes no promise
that an invitation has been sent. Unknown/repeated course selections get a neutral
course chooser. No portal hostname or customer invitation token is invented.

This is recovery help, not an LMS integration. Existing prices, payment links,
Blueprint report route, Toolkit and Audit behavior are preserved.

## Required activation work

1. Finish and approve the required teaching and resources. Inner-Work retains
   seven original modules plus orientation/final integration, seven worksheets
   and integrated workbook, and the historical seven recorded 10–15-minute
   teachings plus one–two audios/text equivalents and welcome PDF pending exact
   promise/format reconciliation. Scripts are not recordings. Finish First Step's
   fourteen entries. Retain Blueprint's outstanding report-meaning, promise and
   learner-isolation checks. A publication toggle cannot substitute for this work.
2. Inspect existing system/default offers, workflows and payment-link settings
   before creating anything. Establish one enrollment authority per product and
   record the exact existing payment product and price → Membership Offer → native
   course mapping. Check First Step's price ID, $247 amount and one-time billing.
   Preserve legitimate prior entitlements and prevent duplicate enrollment paths.
3. Verify the public learner portal URL in GHL settings. It must be a stable
   learner sign-in address, never an admin course-creator URL or a live magic link.
   Add direct returning-learner links only after that address and permissions work.
4. Prepare the payment-success enrollment and invitation steps against those
   exact objects. Prove the correct product is granted once and only after the
   qualifying payment; declined/unpaid/wrong-product events must not unlock it.
   Audit current invitation and notification behavior before any change or test
   that could send email. Retain delivery errors and recovery instructions.
5. Complete draft/admin QA, then obtain the specific release/test authority needed.
   Exercise two authorized learner identities: correct enrollment, wrong-product
   isolation, invitation/sign-in, every lesson/resource, PDF download/open, progress,
   logout and return. Verify refunds/revocation rules separately without performing
   real refunds. No real charge, customer message or bulk access grant is implied.
6. Only after readiness and release authority, publish the intended course/offer,
   activate the single enrollment path, and verify the complete storefront →
   existing checkout → enrollment → invitation → learner course path. Preserve
   actual results and object IDs in PF-B01 before marking LIVE_VERIFIED/ACCEPTED.

## Current storefront wording needing reconciliation

Inner-Work and First Step currently promise instant access by email. The current
native evidence does not substantiate that promise. Do not treat this help page
as proof of instant delivery. Resolve the course readiness and applicable buyer
promises before describing either course as publicly deliverable. This PR does
not silently suspend existing checkout links or change historical buyer rights.

Public checkout fetching returned HTTP 403 for the two LMS payment links, so
checkout rendering/product/price/confirmation settings remain unverified; this
alone is not evidence that a real browser checkout is broken. No purchase, email
delivery, live enrollment or deployed-site verification was performed.

## Validation

Course-access regressions cover product-specific recovery links, unchanged LMS
checkout destinations, unsafe course parameters, the preserved report route and
store-host/www routing. Type checking and HTTP rendering checks are recorded in
the pull request. These checks do not establish actual learner delivery.
