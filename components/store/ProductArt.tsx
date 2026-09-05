import Image from "next/image";
import Glyph from "@/components/store/Glyph";

/**
 * Product artwork.
 *
 * Two kinds. "photo" renders the image on the GHL product record through
 * next/image, which turns the multi-megabyte originals into sized WebP. "plate"
 * is a typographic cover set in the brand tokens — navy ground, gold rule,
 * serif title — used wherever there is no image, or where the image on file
 * is a stock mockup that would put generic imagery on the brand.
 */
export type ArtSpec =
  | { kind: "photo"; src: string; alt: string; position?: string }
  | { kind: "plate"; kicker: string; title: string; accent?: string; variant?: 1 | 2 | 3 };

export default function ProductArt({ art, sizes, priority }: { art: ArtSpec; sizes: string; priority?: boolean }) {
  if (art.kind === "photo") {
    return (
      <Image
        src={art.src}
        alt={art.alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: "cover", objectPosition: art.position ?? "center" }}
      />
    );
  }
  return (
    <div className={`st-plate st-plate-v${art.variant ?? 1}`}>
      <div className="st-plate-kicker">{art.kicker}</div>
      <div className="st-plate-title">
        {art.title}
        {art.accent ? (
          <>
            {" "}
            <em>{art.accent}</em>
          </>
        ) : null}
      </div>
      <div className="st-plate-foot">
        <Glyph />
        <span>Truth J Blue</span>
      </div>
    </div>
  );
}
