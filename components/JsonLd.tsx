import { jsonLd } from "@/lib/seo";

/** One structured-data block. Server-rendered, so it is in the HTML a
 *  crawler fetches — AI crawlers do not run scripts. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
