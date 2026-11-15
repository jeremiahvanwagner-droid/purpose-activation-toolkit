import { serveResource } from "@/lib/ebook/serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request): Promise<Response> {
  return serveResource(req);
}
