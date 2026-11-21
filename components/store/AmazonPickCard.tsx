import { amazonProductUrl, type AmazonPick } from "@/lib/store/amazon-picks";

/**
 * One book or tool from the Amazon storefront. The whole card is the link,
 * and it leaves the store: Amazon shows the price, takes the order and ships
 * it, so the card says only what the thing is and where it opens.
 *
 * rel="sponsored" because the link earns a commission (Google asks for it on
 * paid links). No "noreferrer": Amazon's Associates checks look at the page a
 * click came from, so the referrer is left on.
 *
 * The image is Amazon's, from Amazon's own host, inside a link to that
 * product — see lib/store/amazon-picks.ts for why it is a plain <img>. Its alt
 * is empty because the name beside it already says what it is.
 */
export default function AmazonPickCard({
  pick,
  listId,
  variant = "card",
}: {
  pick: AmazonPick;
  listId: string;
  /** "cover" is the series shelf: a 2:3 book cover, title and number only. */
  variant?: "card" | "cover";
}) {
  const track = { "data-affiliate": "amazon", "data-list": listId, "data-asin": pick.asin, "data-name": pick.name };
  if (variant === "cover") {
    return (
      <a className="st-book" href={amazonProductUrl(pick.asin)} target="_blank" rel="sponsored noopener" {...track}>
        <span className="st-book-cover st-book-cover-img">
          <img src={pick.image} alt="" loading="lazy" decoding="async" />
        </span>
        {pick.detail ? <span className="st-book-n">{pick.detail}</span> : null}
        <span className="st-book-title">{pick.name}</span>
        <span className="st-book-link">
          Read on Amazon <span aria-hidden="true">↗</span>
          <span className="st-sr"> (opens in a new tab)</span>
        </span>
      </a>
    );
  }
  return (
    <a className="st-pick" href={amazonProductUrl(pick.asin)} target="_blank" rel="sponsored noopener" {...track}>
      <span className="st-pick-art">
        <img src={pick.image} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="st-pick-by">{pick.byline}</span>
      <span className="st-pick-name">{pick.name}</span>
      {pick.detail ? <span className="st-pick-detail">{pick.detail}</span> : null}
      <span className="st-pick-cta">
        View on Amazon <span aria-hidden="true">↗</span>
        <span className="st-sr"> (opens in a new tab)</span>
      </span>
    </a>
  );
}
