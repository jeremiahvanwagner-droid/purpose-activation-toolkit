/** Field-id formatting. No curriculum text. */

export function domainField(key: string): string {
  return `pa.s5.domain.${key}`;
}

export function domainAppField(key: string): string {
  return `dm.s7.${key}`;
}

export function deckField(key: string): string {
  return `ep.deck.${key}`;
}
