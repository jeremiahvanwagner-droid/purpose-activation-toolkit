/**
 * The print books sold through Lulu — the store's own record of them.
 *
 * Everything else in the store comes from HighLevel. These ten paperbacks do
 * not: Lulu sets the price, takes the payment, prints the copy and ships it,
 * and this app only shows the book and hands the reader to Lulu's checkout.
 * So they live in their own manifest (lulu-books.data.json) and never pass
 * through getStore() — which is also what keeps them out of /api/meta-feed,
 * the ads-only catalog that must not change.
 *
 * The manifest is a reviewed snapshot, not a live sync. Lulu is the authority
 * on price and availability; when either changes there, the manifest changes
 * in the same release (docs/print-bookstore.md has the order of operations).
 * Each record was read from Lulu's own checkout for that Buy Button on the
 * date in metadataVerifiedAt.
 *
 * Nothing here trusts the file's shape. A TypeScript type says what a record
 * should be; validatePrintBooks() checks what it is, and a record marked
 * "published" that fails is an error for the whole manifest rather than a
 * book quietly dropped from the shelf.
 */

import manifest from "./lulu-books.data.json" with { type: "json" };
import { STORE_URL } from "@/lib/links";
import { ORGANIZATION_ID, PERSON_REF } from "@/lib/seo";

/** The manifest exactly as committed, before any checking. */
export const RAW_PRINT_BOOKS: unknown = manifest;

/** What the collection is called, in navigation, headings and breadcrumbs. */
export const PRINT_COLLECTION_TITLE = "Books in Print";

/**
 * How buying a printed book works, in the three lines every book page shows.
 * Each sentence restates Lulu's own description of the Buy Button (help
 * articles 64000311603 and 64000311712, read 2026-10-11): Lulu's checkout
 * takes the payment, shows shipping and the delivery estimate, appears on the
 * card statement, prints the copy and emails tracking. No delivery date, no
 * return window and no guarantee is promised here, because none is ours to
 * promise.
 */
export const PRINT_STEPS: [string, string, string] = [
  "Add the book to Lulu’s cart on its page, or open Lulu’s checkout directly. No account with us is needed.",
  "Pay on Lulu’s secure checkout. Shipping options, tax and the estimated delivery are shown there, and your card statement will show Lulu.",
  "Lulu prints your copy to order and ships it. A shipping email follows, with tracking when your shipping method includes it.",
];

export type Publication = "draft" | "published" | "retired";
export type Availability = "in_stock" | "out_of_stock";

export type PrintBookDraft = {
  /** Stable id for one saleable edition: tjb-lulu-<channelProductId>. The
   *  same string is the item id in the Meta print feed. */
  sku: string;
  slug: string;
  /** Lulu's id for the product in the "Truth J Blue Books" channel. */
  channelProductId: string;
  /** The Buy Button this edition is sold through. Public by design. */
  buyButtonId: string;
  checkoutUrl: string;
  title: string;
  publication: Publication;
  author?: string;
  description?: string;
  formatLabel?: string;
  language?: string;
  /** Only ever the ISBN of this physical edition, and only once confirmed. */
  isbn13?: string;
  /** A file under /store/books/, or Lulu's own cover image for the edition. */
  coverPath?: string;
  coverWidth?: number;
  coverHeight?: number;
  /** Integer cents. Never a formatted string, never a float. */
  priceMinor?: number;
  currency?: "USD";
  availability?: Availability;
  /** The day the fields above were read from Lulu. YYYY-MM-DD. */
  metadataVerifiedAt?: string;
  /** Whether this edition is released to the Meta print feed. Off until the
   *  edition has a cover large enough for a catalog and the pilot says go. */
  inMetaFeed?: boolean;
};

export type PublishedPrintBook = PrintBookDraft & {
  publication: "published";
  author: string;
  description: string;
  formatLabel: string;
  coverPath: string;
  coverWidth: number;
  coverHeight: number;
  priceMinor: number;
  currency: "USD";
  availability: Availability;
  metadataVerifiedAt: string;
};

const CHECKOUT_HOST = "svc.lulu.com";
const LULU_COVER_HOST = "assets.lulu.com";
const SITE_ORIGIN = "https://www.truthjblue.com";

/** Meta rejects catalog images under 500px on the short side. */
export const META_MIN_IMAGE_PX = 500;

const ALLOWED_KEYS = new Set([
  "sku",
  "slug",
  "channelProductId",
  "buyButtonId",
  "checkoutUrl",
  "title",
  "publication",
  "author",
  "description",
  "formatLabel",
  "language",
  "isbn13",
  "coverPath",
  "coverWidth",
  "coverHeight",
  "priceMinor",
  "currency",
  "availability",
  "metadataVerifiedAt",
  "inMetaFeed",
]);

const REQUIRED_WHEN_PUBLISHED = [
  "author",
  "description",
  "formatLabel",
  "coverPath",
  "coverWidth",
  "coverHeight",
  "priceMinor",
  "currency",
  "availability",
  "metadataVerifiedAt",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCAL_COVER = /^\/store\/books\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpe?g|png|webp)$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isText(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v === v.trim();
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

/** The one checkout address a Buy Button has: https://svc.lulu.com/?items=<id>. */
function isCheckoutUrlFor(value: string, buyButtonId: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const params = [...url.searchParams.keys()];
  return (
    url.protocol === "https:" &&
    url.host === CHECKOUT_HOST &&
    url.pathname === "/" &&
    url.hash === "" &&
    url.username === "" &&
    url.password === "" &&
    params.length === 1 &&
    params[0] === "items" &&
    url.searchParams.get("items") === buyButtonId &&
    value === `https://${CHECKOUT_HOST}/?items=${buyButtonId}`
  );
}

function isCoverPath(value: string): boolean {
  if (LOCAL_COVER.test(value)) return true;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.host === LULU_COVER_HOST &&
    url.pathname.startsWith("/cover_thumbs/") &&
    /\.jpe?g$/.test(url.pathname) &&
    url.search === "" &&
    url.hash === ""
  );
}

/** Digits of a valid ISBN-13, or null. Hyphens and spaces are allowed in. */
export function isbn13Digits(value: string): string | null {
  const digits = value.replace(/[\s-]/g, "");
  if (!/^97[89]\d{10}$/.test(digits)) return null;
  const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0 ? digits : null;
}

function isRealDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Check a manifest. Returns the records that are structurally sound and every
 * problem found; callers that need a usable catalog use parsePrintBooks(),
 * which refuses the whole thing when there is any error at all.
 */
export function validatePrintBooks(raw: unknown): { books: PrintBookDraft[]; errors: string[] } {
  const errors: string[] = [];
  const books: PrintBookDraft[] = [];
  if (!Array.isArray(raw)) return { books, errors: ["manifest is not a list of books"] };

  const seen = {
    sku: new Map<string, number>(),
    slug: new Map<string, number>(),
    channelProductId: new Map<string, number>(),
    buyButtonId: new Map<string, number>(),
    isbn13: new Map<string, number>(),
  };

  raw.forEach((entry, index) => {
    const before = errors.length;
    const at = (msg: string) => errors.push(`book ${index + 1}: ${msg}`);
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      at("is not a record");
      return;
    }
    const r = entry as Record<string, unknown>;
    const label = isText(r.sku) ? r.sku : isText(r.title) ? r.title : `#${index + 1}`;
    const fail = (msg: string) => errors.push(`${label}: ${msg}`);

    for (const key of Object.keys(r)) {
      if (!ALLOWED_KEYS.has(key)) fail(`unknown field "${key}" — only public product fields belong in this file`);
    }

    for (const key of ["sku", "slug", "channelProductId", "buyButtonId", "checkoutUrl", "title", "publication"]) {
      if (!isText(r[key])) fail(`${key} is missing`);
    }
    if (errors.length > before) return;

    const sku = r.sku as string;
    const slug = r.slug as string;
    const channelProductId = r.channelProductId as string;
    const buyButtonId = r.buyButtonId as string;
    const checkoutUrl = r.checkoutUrl as string;
    const publication = r.publication as string;

    if (!/^\d+$/.test(channelProductId)) fail("channelProductId must be Lulu's numeric product id");
    if (sku !== `tjb-lulu-${channelProductId}`) fail(`sku must be tjb-lulu-${channelProductId}`);
    if (!SLUG.test(slug)) fail("slug must be lowercase words joined by hyphens");
    if (!UUID.test(buyButtonId)) fail("buyButtonId is not a Buy Button UUID");
    if (!isCheckoutUrlFor(checkoutUrl, buyButtonId)) {
      fail(`checkoutUrl must be exactly https://${CHECKOUT_HOST}/?items=<this book's buyButtonId>`);
    }
    if (publication !== "draft" && publication !== "published" && publication !== "retired") {
      fail(`publication "${publication}" is not draft, published or retired`);
    }

    for (const key of ["author", "description", "formatLabel", "language"] as const) {
      if (r[key] !== undefined && !isText(r[key])) fail(`${key} must be non-empty text with no stray whitespace`);
    }
    if (typeof r.description === "string" && r.description.length > 5000) fail("description is longer than 5000 characters");
    if (r.priceMinor !== undefined && !isPositiveInt(r.priceMinor)) {
      fail("priceMinor must be a whole number of cents greater than zero");
    }
    if (r.currency !== undefined && r.currency !== "USD") fail("currency must be USD");
    if (r.availability !== undefined && r.availability !== "in_stock" && r.availability !== "out_of_stock") {
      fail("availability must be in_stock or out_of_stock");
    }
    if (r.coverPath !== undefined && !(typeof r.coverPath === "string" && isCoverPath(r.coverPath))) {
      fail("coverPath must be a file under /store/books/ or a cover image on assets.lulu.com");
    }
    for (const key of ["coverWidth", "coverHeight"] as const) {
      if (r[key] !== undefined && !isPositiveInt(r[key])) fail(`${key} must be a whole number of pixels`);
    }
    if (r.metadataVerifiedAt !== undefined && !(typeof r.metadataVerifiedAt === "string" && isRealDay(r.metadataVerifiedAt))) {
      fail("metadataVerifiedAt must be a real date, YYYY-MM-DD");
    }
    if (r.inMetaFeed !== undefined && typeof r.inMetaFeed !== "boolean") fail("inMetaFeed must be true or false");

    let isbn: string | null = null;
    if (r.isbn13 !== undefined) {
      isbn = typeof r.isbn13 === "string" ? isbn13Digits(r.isbn13) : null;
      if (!isbn) fail("isbn13 is not a valid ISBN-13 — leave it out until this edition's ISBN is confirmed");
    }

    if (publication === "published") {
      for (const key of REQUIRED_WHEN_PUBLISHED) {
        if (r[key] === undefined) fail(`is published but ${key} is missing`);
      }
    }
    if (r.inMetaFeed === true) {
      if (publication !== "published") fail("is in the Meta feed but not published");
      const short = Math.min(Number(r.coverWidth) || 0, Number(r.coverHeight) || 0);
      if (short < META_MIN_IMAGE_PX) {
        fail(`is in the Meta feed but its cover is ${r.coverWidth}×${r.coverHeight}; a catalog image needs ${META_MIN_IMAGE_PX}px on the short side`);
      }
    }

    const claim = (kind: keyof typeof seen, value: string) => {
      const first = seen[kind].get(value);
      if (first !== undefined) fail(`${kind} "${value}" is already used by book ${first + 1}`);
      else seen[kind].set(value, index);
    };
    claim("sku", sku);
    claim("slug", slug);
    claim("channelProductId", channelProductId);
    claim("buyButtonId", buyButtonId);
    if (isbn) claim("isbn13", isbn);

    if (errors.length === before) books.push(r as unknown as PrintBookDraft);
  });

  return { books, errors };
}

export class PrintBookManifestError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Print-book manifest is invalid:\n- ${problems.join("\n- ")}`);
    this.name = "PrintBookManifestError";
    this.problems = problems;
  }
}

/** A manifest that is entirely valid, or an error naming every problem. */
export function parsePrintBooks(raw: unknown): PrintBookDraft[] {
  const { books, errors } = validatePrintBooks(raw);
  if (errors.length) throw new PrintBookManifestError(errors);
  return books;
}

export function publishedOf(books: PrintBookDraft[]): PublishedPrintBook[] {
  return books.filter((b): b is PublishedPrintBook => b.publication === "published");
}

let committed: PrintBookDraft[] | null = null;

/** Every record in the committed manifest, in shelf order. Throws if invalid. */
export function allPrintBooks(): PrintBookDraft[] {
  committed ??= parsePrintBooks(RAW_PRINT_BOOKS);
  return committed;
}

/** The books the store shows and sells. */
export function publishedPrintBooks(): PublishedPrintBook[] {
  return publishedOf(allPrintBooks());
}

export function printBookBySlug(slug: string): PublishedPrintBook | null {
  return publishedPrintBooks().find((b) => b.slug === slug) ?? null;
}

/** "24.99" — the amount as a plain decimal, for feeds and structured data. */
export function minorToDecimal(minor: number): string {
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}

/** "$24.99" — always with cents, because these prices have them. */
export function formatMinor(minor: number): string {
  return `$${minorToDecimal(minor)}`;
}

/** The store path of a book's page, before the host-aware base is applied. */
export function printBookPath(book: Pick<PrintBookDraft, "slug">): string {
  return `/books/${book.slug}`;
}

/** The canonical public address of a book's page. */
export function printBookUrl(book: Pick<PrintBookDraft, "slug">): string {
  return `${STORE_URL}${printBookPath(book)}`;
}

/** An absolute address for the cover, wherever it is kept. */
export function coverUrl(book: Pick<PublishedPrintBook, "coverPath">): string {
  return book.coverPath.startsWith("/") ? `${SITE_ORIGIN}${book.coverPath}` : book.coverPath;
}

/**
 * Product + Book for one edition. The offer repeats the price on the page,
 * which is the price in Lulu's checkout; the ISBN appears only when this
 * edition's own ISBN has been confirmed. Nothing is claimed that the page
 * does not show: no ratings, no stock count, no return terms.
 */
export function printBookSchema(book: PublishedPrintBook) {
  const url = printBookUrl(book);
  const isbn = book.isbn13 ? isbn13Digits(book.isbn13) : null;
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Book"],
    "@id": `${url}#book`,
    name: book.title,
    description: book.description,
    url,
    image: coverUrl(book),
    author: book.author === PERSON_REF.name ? PERSON_REF : { "@type": "Person", name: book.author },
    brand: { "@id": ORGANIZATION_ID },
    ...(/^paperback$/i.test(book.formatLabel) ? { bookFormat: "https://schema.org/Paperback" } : {}),
    ...(book.language ? { inLanguage: book.language } : {}),
    ...(isbn ? { isbn, gtin13: isbn } : {}),
    sku: book.sku,
    offers: {
      "@type": "Offer",
      url,
      price: minorToDecimal(book.priceMinor),
      priceCurrency: book.currency,
      availability: book.availability === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORGANIZATION_ID },
    },
  };
}

/** Breadcrumb trail for a book page, as search engines read it. */
export function printBookBreadcrumbs(book: PublishedPrintBook) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "The Store", item: `${STORE_URL}/` },
      { "@type": "ListItem", position: 2, name: PRINT_COLLECTION_TITLE, item: `${STORE_URL}/books` },
      { "@type": "ListItem", position: 3, name: book.title, item: printBookUrl(book) },
    ],
  };
}
