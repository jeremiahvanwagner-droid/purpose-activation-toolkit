/**
 * What the storefront knows that GHL does not.
 *
 * GHL holds the product, its price, its image and its long description. It
 * does not know how the store is organised, which sentence goes on a card,
 * where "Buy" should go, or that a stock mockup on file is not fit for the
 * brand. That knowledge lives here, keyed by GHL product id, and is merged
 * with the live catalog in catalog.ts.
 *
 * Copy rules (from the brand): faith-first, calm, invitational. Gifts are
 * gifts. Nothing asserts a lack in the reader. No hype, no urgency, no
 * struck-through anchors, and the retired assessment name never appears.
 */

import type { CheckoutAction } from "@/components/store/CheckoutButton";
import { AUDIT_CHECKOUT_URL, BLUEPRINT_CHECKOUT_URL, CHECKOUT_URL, PAID_AUDIT_PATH, PAID_BLUEPRINT_PATH } from "@/lib/links";

export type CollectionKey =
  | "start-here"
  | "courses-workbooks"
  | "programs-mentorship"
  | "work-with-jeremiah"
  | "library";

export type Collection = {
  key: CollectionKey;
  /** GHL collection id — the store's navigation was designed there first. */
  ghlId: string;
  title: string;
  /** Short form for navigation and card kickers. */
  short: string;
  /** One italic line under the section title. */
  blurb: string;
  /** Search-result description. */
  seo: string;
};

export const COLLECTIONS: Collection[] = [
  {
    key: "start-here",
    ghlId: "6a9b42f44dd022c447c95739",
    title: "Start Here",
    short: "Start Here",
    blurb: "Two places to begin. The Audit shows you where you stand; the Toolkit walks you forward.",
    seo: "Begin with the Inner Alignment Audit or the Purpose Activation Toolkit — faith-first tools from Truth J Blue.",
  },
  {
    key: "courses-workbooks",
    ghlId: "6a9b42f4781b201d30e180bd",
    title: "Courses & Workbooks",
    short: "Courses",
    blurb: "Self-paced work you can begin this week — short, guided, and built to be lived rather than read.",
    seo: "Self-paced courses and written workbooks from Truth J Blue: the Inner-Work Integration Course, the Divine Alignment Blueprint, and First Step Through the Veil.",
  },
  {
    key: "programs-mentorship",
    ghlId: "6a9b42f4781b201d30e180bf",
    title: "Programs & Mentorship",
    short: "Programs",
    blurb: "Where we go deeper, together, over weeks. Each one begins with a conversation.",
    seo: "The Beyond the Veil Mentorship and the Ascension Intensive — guided programs from Truth J Blue.",
  },
  {
    key: "work-with-jeremiah",
    ghlId: "6a9b42f4a9ea305ae58d99be",
    title: "Work With Jeremiah",
    short: "Work With Jeremiah",
    blurb: "One-to-one, and in small rooms. By conversation first, always.",
    seo: "Sessions, coaching, the VIP Mastermind and strategic partnership with Jeremiah Van Wagner, Truth J Blue.",
  },
  {
    key: "library",
    ghlId: "69840153e4a1e0622868ac09",
    title: "The Library",
    short: "Library",
    blurb: "The Teachings of the Palace of Excellence — twelve books, one path. Read them on Amazon.",
    seo: "The twelve-book Palace of Excellence series by Jeremiah Van Wagner, available on Amazon.",
  },
];

export type ProductMeta = {
  id: string;
  collection: CollectionKey;
  order: number;
  featured?: boolean;
  badge?: string;
  kicker: string;
  tagline: string;
  /** Overrides the GHL slug where it is missing or carries a retired name. */
  slug?: string;
  /** Which GHL price to display; default is the highest one-time price. */
  priceId?: string;
  priceNote?: string;
  checkout: CheckoutAction;
  /** Small line under the checkout button. */
  note?: string;
  /** For products delivered inside this app: where a buyer opens what they own. */
  access?: { href: string; label: string };
  art:
    | { kind: "photo"; position?: string }
    | { kind: "plate"; title: string; accent?: string; variant?: 1 | 2 | 3 };
  /** Replaces the GHL description. Used only where the GHL copy is empty or
   *  still refers to the retired assessment by name. HTML. */
  description?: string;
  steps: [string, string, string];
};

const STEPS_BUY: [string, string, string] = [
  "Secure checkout on HighLevel, our payments platform.",
  "Your access details arrive by email right after purchase.",
  "Need a hand? Write to support@truthjblue.com — a person answers.",
];
const STEPS_BOOK: [string, string, string] = [
  "Choose a time that suits you on the calendar.",
  "A confirmation arrives by email with everything you need.",
  "Need to move it? Reschedule from the same email.",
];
const STEPS_APPLY: [string, string, string] = [
  "Share a little about you and where you are.",
  "We reply by email with next steps.",
  "No pressure and no obligation — an honest conversation first.",
];

const PAYMENT_LINK = "https://site.truthjblue.com/payment-link/";
const booking = (calendarId: string) => `https://site.truthjblue.com/widget/booking/${calendarId}`;
const form = (formId: string) => `https://site.truthjblue.com/widget/form/${formId}`;


export const PRODUCTS: ProductMeta[] = [
  // ── Start here ──────────────────────────────────────────────────────────
  {
    id: "696d7e4ab83430aa974a7746",
    collection: "start-here",
    order: 1,
    kicker: "Self-diagnostic · four domains",
    tagline:
      "Twenty-eight honest statements across four domains of alignment, clear scoring, and a focused follow-up call to integrate what you find.",
    checkout: { kind: "buy", href: AUDIT_CHECKOUT_URL, label: "Get the Audit" },
    note: "Instant access · sign in with the email you use at checkout",
    access: { href: PAID_AUDIT_PATH, label: "Open your Audit" },
    art: { kind: "plate", title: "Inner Alignment", accent: "Audit", variant: 1 },
    steps: [
      "Secure checkout on HighLevel, our payments platform.",
      "Open your Audit at truthjblue.com/store/audit and sign in with the same email — it's waiting there.",
      "Once your profile is revealed, book your follow-up call from inside the Audit.",
    ],
  },
  {
    id: "696d7f574f705f240b0875fd",
    collection: "start-here",
    order: 2,
    featured: true,
    badge: "The core offer",
    kicker: "Interactive workbook · four modules",
    tagline:
      "Four interactive modules that turn spiritual clarity into daily, aligned action. Every answer saves as you write it; the finished workbook is yours for life.",
    checkout: { kind: "buy", href: CHECKOUT_URL, label: "Get the Toolkit" },
    note: "Lifetime access · no subscription",
    access: { href: "https://www.truthjblue.com/toolkit", label: "Sign in to the Toolkit" },
    art: { kind: "plate", title: "Purpose Activation", accent: "Toolkit", variant: 2 },
    steps: [
      "Secure checkout on HighLevel, our payments platform.",
      "Sign in at truthjblue.com/toolkit with the email you used — your modules are waiting.",
      "Your work saves as you go and follows you to any device.",
    ],
  },

  // ── Courses & workbooks ─────────────────────────────────────────────────
  {
    id: "699f939f4346b061ac834235",
    collection: "courses-workbooks",
    order: 1,
    kicker: "Self-paced mini-course",
    tagline:
      "Short teachings, guided exercises, and reflection prompts that help you actually do the inner work your Audit reveals.",
    checkout: { kind: "buy", href: `${PAYMENT_LINK}69909e6c35e5ef228f37e300`, label: "Get the course" },
    note: "Secure checkout · instant access by email",
    art: { kind: "plate", title: "Inner-Work", accent: "Integration Course", variant: 3 },
    steps: STEPS_BUY,
  },
  {
    id: "699fa003a14ffb50139b4b55",
    collection: "courses-workbooks",
    order: 2,
    kicker: "Personalised written report",
    tagline:
      "A written Blueprint that reads the story behind your Audit scores and lays out a practical seven-day plan to begin shifting into deeper alignment.",
    checkout: { kind: "buy", href: BLUEPRINT_CHECKOUT_URL, label: "Get your Blueprint" },
    note: "Instant access · sign in with the email you use at checkout",
    access: { href: PAID_BLUEPRINT_PATH, label: "Open your Blueprint" },
    art: { kind: "plate", title: "Divine Alignment", accent: "Blueprint", variant: 1 },
    description:
      "<p>Your Audit shows the numbers; the Blueprint reveals the story behind them. Using your responses, the Alignment Agent generates a personalised written Blueprint that interprets your four domain scores, identifies root patterns and blockages, and outlines a practical 7-day plan to begin shifting into deeper alignment.</p><p>You’ll receive a beautifully structured document you can pray through, journal with, and return to whenever you feel yourself drifting off-course.</p>",
    steps: [
      "Secure checkout on HighLevel, our payments platform.",
      "Open your Blueprint at truthjblue.com/store/blueprint and sign in with the same email — it is written from your Audit answers.",
      "Read it, save it as a PDF, and walk the seven days.",
    ],
  },
  {
    id: "6a4eb9eb6630447c7bd80f0d",
    collection: "courses-workbooks",
    order: 3,
    slug: "first-step-through-the-veil",
    kicker: "Beyond the Veil · the beginning",
    tagline:
      "The opening experience of the Beyond the Veil path — for seekers who are done collecting information and ready for embodiment.",
    checkout: { kind: "buy", href: `${PAYMENT_LINK}6a9bf241a7f78e147447f113`, label: "Take the first step" },
    note: "Secure checkout · instant access by email",
    art: { kind: "plate", title: "First Step", accent: "Through the Veil", variant: 2 },
    description:
      "<p>First Step Through the Veil is where the Beyond the Veil path begins: a guided opening for seekers who are no longer looking for information, but embodiment.</p><p>It introduces the ground the mentorship is built on — Identity, Purpose, Power, and Transformation — and gives you the first practices to walk it, so that when you are ready to go further, you arrive already in motion.</p>",
    steps: STEPS_BUY,
  },

  // ── Programs & mentorship ───────────────────────────────────────────────
  {
    id: "6975840bb327c56c389e903b",
    collection: "programs-mentorship",
    order: 1,
    kicker: "12-week mentorship",
    tagline:
      "A guided twelve-week journey through Identity, Purpose, Power, and Transformation — for those fully committed to their spiritual growth.",
    priceNote: "12 weeks · begins with an interview",
    checkout: { kind: "book", href: booking("I04z14pF1pX97tGFqMWH"), label: "Request an interview" },
    note: "Every mentorship begins with a conversation",
    art: { kind: "photo", position: "center" },
    steps: STEPS_BOOK,
  },
  {
    id: "698fb0e8b5e66112ca6e4a23",
    collection: "programs-mentorship",
    order: 2,
    kicker: "6-week intensive",
    tagline:
      "Six weeks of group coaching, Divine Blueprint mapping, and embodiment practice for purpose-driven leaders ready for the next step.",
    priceNote: "6 weeks · by application · payment plan available",
    checkout: { kind: "apply", href: form("lacusUojcMehUSAlo4ER"), label: "Apply for the Intensive" },
    note: "Short application · no obligation",
    art: { kind: "photo", position: "center 40%" },
    steps: STEPS_APPLY,
  },

  // ── Work with Jeremiah ──────────────────────────────────────────────────
  {
    id: "698fb04dfa4fc0dd1ef5c9b0",
    collection: "work-with-jeremiah",
    order: 1,
    slug: "deep-dive-call",
    kicker: "30-minute session",
    tagline: "Walk through your Inner Alignment Audit results together, and leave with the one place to begin.",
    priceNote: "30 minutes · paid as you book",
    checkout: { kind: "book", href: booking("3UdnVZdGVpvaiiRscsxR"), label: "Book your session" },
    note: "Choose a time · paid as you book",
    art: { kind: "plate", title: "Deep Dive", accent: "with Jeremiah", variant: 3 },
    description:
      "<p>A focused 30-minute session that goes through your Inner Alignment Audit results in depth. Together you’ll look at all four domains, name the primary lever, and leave with a clear first move for the next seven days.</p><p>Best taken alongside the Purpose Activation Toolkit, so the session lands on a plan you’re already working.</p>",
    steps: [
      "Choose a time that suits you on the calendar; payment is taken as you book.",
      "A confirmation arrives by email with the details of the call.",
      "Bring your Audit results — the session starts from them.",
    ],
  },
  {
    id: "698fc4bcb5e66117a871dfe1",
    collection: "work-with-jeremiah",
    order: 2,
    kicker: "Quarterly mastermind",
    tagline: "Twenty-five purpose-driven leaders, four intensives a year, and a room that holds you to your calling.",
    priceNote: "Limited to 25 members",
    checkout: { kind: "book", href: booking("HN6rnMWQxP7KNZ4PMJKo"), label: "Request an interview" },
    note: "Begins with an application interview",
    art: { kind: "photo", position: "center 30%" },
    steps: STEPS_BOOK,
  },
  {
    id: "698fc4e193a5513ba83d5581",
    collection: "work-with-jeremiah",
    order: 3,
    kicker: "One-to-one",
    tagline: "Thirteen weekly sessions a quarter, direct access between them, and a program designed around you.",
    priceNote: "Limited to 8 clients",
    checkout: { kind: "book", href: booking("H1cj6plFPLJ5x0YIv3s9"), label: "Book a discovery call" },
    note: "Discovery call · $20, paid as you book",
    art: { kind: "photo", position: "center 25%" },
    steps: STEPS_BOOK,
  },
  {
    id: "698fc5075e6a85c8105c04be",
    collection: "work-with-jeremiah",
    order: 4,
    kicker: "By invitation",
    tagline: "Co-creation at the highest level — joint ventures, shared platforms, and legacy work with at most three partners a year.",
    priceNote: "Maximum three partners a year",
    checkout: { kind: "book", href: booking("ZbqKfoi6yUtSVTR821Z7"), label: "Request an exploration call" },
    note: "An exploration call to see whether it fits",
    art: { kind: "photo", position: "center 30%" },
    steps: STEPS_BOOK,
  },
];

export type BookMeta = { n: number; id: string; title: string; asin: string };

/** The Teachings of the Palace of Excellence — sold on Amazon (verified ASINs). */
export const BOOKS: BookMeta[] = [
  { n: 1, id: "6a9b43ff781b201d30e1a40b", title: "Discovering Your Purpose", asin: "B0DBNRCZ6W" },
  { n: 2, id: "6a9b44008b0f3acdde90f503", title: "Designing Your Life Plan", asin: "B0DBR6FMD1" },
  { n: 3, id: "6a9b4401781b201d30e1a421", title: "Mindset Mastery", asin: "B0DBR5HCV7" },
  { n: 4, id: "6a9b4402d25a64f62077eb9e", title: "Health and Wellness", asin: "B0DBTV7Z41" },
  { n: 5, id: "6a9b44034acc6c1e94574284", title: "Building Meaningful Relationships", asin: "B0DBTT4XTS" },
  { n: 6, id: "6a9b44043bda2fe47ba8e81d", title: "Career and Purpose", asin: "B0DBZ49GYY" },
  { n: 7, id: "6a9b4406d25a64f62077ebaa", title: "Financial Freedom", asin: "B0DC8J2875" },
  { n: 8, id: "6a9b440770cdb64b961de8f3", title: "Overcoming Challenges", asin: "B0DC98MVQB" },
  { n: 9, id: "6a9b44083bda2fe47ba8e833", title: "Spiritual Growth", asin: "B0DD5TL3TZ" },
  { n: 10, id: "6a9b440970cdb64b961de90c", title: "Creativity and Innovation", asin: "B0DD6NBWBS" },
  { n: 11, id: "6a9b440a4dd022c447c96cdd", title: "Purposeful Leadership", asin: "B0DD6MJHLK" },
  { n: 12, id: "6a9b440ba9aeb58c782b84e6", title: "Legacy and Impact", asin: "B0DD9ZGPHZ" },
];

export const amazonUrl = (asin: string) => `https://www.amazon.com/dp/${asin}`;

export const SERIES_TITLE = "The Teachings of the Palace of Excellence";
