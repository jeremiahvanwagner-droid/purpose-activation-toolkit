/**
 * Lulu's Buy Button script, and the one id every page loads it under so
 * next/script fetches it once per document however many pages ask.
 *
 * Kept apart from lulu-books.ts on purpose: the purchase button is a client
 * component, and importing these from the manifest module would ship the
 * whole manifest and its validator to the browser.
 */
export const LULU_SCRIPT_SRC = "https://js.lulu.com/lulu-buy.js";
export const LULU_SCRIPT_ID = "lulu-buy-button-script";
