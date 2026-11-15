import { lookupAccess, serveAccessPage } from "@/lib/ebook/serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return serveAccessPage();
}

export function POST(req: Request): Promise<Response> {
  return lookupAccess(req);
}
