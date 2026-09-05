/**
 * The Truth J Blue constellation mark — the same paths as the marketing site's
 * glyph, so the store and truthjblue.com share one identity. Colour comes from
 * currentColor; size from the className.
 */
export default function Glyph({ className = "st-glyph" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 26 L18 9 L26 22 L33 13" strokeOpacity="0.55" />
      </g>
      <g fill="currentColor">
        <circle cx="8" cy="26" r="2.1" />
        <circle cx="18" cy="9" r="2.6" />
        <circle cx="26" cy="22" r="2.1" />
        <circle cx="33" cy="13" r="1.8" />
      </g>
      <circle cx="18" cy="9" r="5.5" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}

/**
 * A larger composition of the same mark for the storefront hero: a path of
 * seven stars rising left to right, the brightest ringed. Purely decorative.
 */
export function Constellation({ className = "st-constellation" }: { className?: string }) {
  const stars: Array<[number, number, number]> = [
    [34, 300, 3.2],
    [92, 236, 2.4],
    [150, 262, 2.8],
    [206, 170, 4.6],
    [262, 208, 2.6],
    [318, 118, 3.4],
    [366, 62, 2.2],
  ];
  const path = stars.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="206" cy="170" r="150" fill="none" stroke="currentColor" strokeOpacity="0.10" strokeWidth="1" />
      <circle cx="206" cy="170" r="96" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" />
      <path d={path} fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" />
      {stars.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="currentColor" />
      ))}
      <circle cx="206" cy="170" r="12" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="206" cy="170" r="22" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
      <g fill="currentColor" fillOpacity="0.45">
        <circle cx="70" cy="90" r="1.2" />
        <circle cx="330" cy="330" r="1.4" />
        <circle cx="120" cy="360" r="1" />
        <circle cx="380" cy="200" r="1.1" />
        <circle cx="250" cy="40" r="1.3" />
      </g>
    </svg>
  );
}
