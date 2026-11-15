const PDF_HREF = 'href="/downloads/You-Were-Created-to-Serve.pdf"';
const EPUB_HREF =
  'href="https://aagqvfwuixpxtdcrdxmv.supabase.co/storage/v1/object/public/project-assets/truth-j-blue/you-were-created-to-serve.epub?download=You-Were-Created-to-Serve.epub"';
const PDF_API = 'href="/api/ebook?f=pdf"';
const EPUB_API = 'href="/api/ebook?f=epub"';

/** Points the two download buttons at the cookie-gated API. Copy stays as written. */
export function gateResourceHtml(html: string): string {
  const pdfCount = html.split(PDF_HREF).length - 1;
  const epubCount = html.split(EPUB_HREF).length - 1;
  if (pdfCount === 1 && epubCount === 1) {
    return html.replace(PDF_HREF, PDF_API).replace(EPUB_HREF, EPUB_API);
  }
  if (pdfCount === 0 && epubCount === 0 && html.includes(PDF_API) && html.includes(EPUB_API)) return html;
  throw new Error("ebook resource download markup changed");
}
