import Image from "next/image";
import Link from "next/link";
import { storeHref } from "@/lib/store/base";
import { formatMinor, printBookPath, type PublishedPrintBook } from "@/lib/store/lulu-books";

/**
 * One print book on a shelf. Like ProductCard, the whole card is the link and
 * the purchase lives on the book's page — a card says what the edition is and
 * what it costs. The cover is shown whole, never cropped: it is how a reader
 * tells one edition from another.
 */
export default function PrintBookCard({
  book,
  base,
  sizes = "(max-width: 720px) 45vw, 190px",
}: {
  book: PublishedPrintBook;
  base: string;
  sizes?: string;
}) {
  return (
    <Link className="st-print" href={storeHref(base, printBookPath(book))}>
      <span className="st-print-cover">
        <Image
          src={book.coverPath}
          alt={`Cover of ${book.title} by ${book.author}`}
          width={book.coverWidth}
          height={book.coverHeight}
          sizes={sizes}
        />
      </span>
      <span className="st-print-title">{book.title}</span>
      <span className="st-print-meta">
        <span>{book.formatLabel}</span>
        <span className="st-price">{formatMinor(book.priceMinor)}</span>
      </span>
      {book.availability === "out_of_stock" ? <span className="st-print-note">Currently unavailable</span> : null}
    </Link>
  );
}
