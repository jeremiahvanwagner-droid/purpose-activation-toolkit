import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Doc, RemoteFailure, RemoteResult, WorkbookRemote } from "./workbookSync";

/**
 * public.workbooks, spoken to the way lib/sync/workbookSync.ts needs.
 *
 * Every call inspects the error Supabase returns instead of reading `data`
 * alone — a failed read used to look exactly like "no row yet" and was
 * answered by writing an empty workbook over the real one.
 *
 * Writes are conditional. `updated_at` is re-stamped by the
 * workbooks_touch_updated_at trigger on every UPDATE, so it serves as the
 * row's version: an update filtered on the version this device merged with
 * matches zero rows if anything else wrote in between, and the sync cycle
 * re-reads and merges instead of overwriting. The version is passed back
 * exactly as PostgREST returned it (microsecond precision), never through a
 * JavaScript Date.
 *
 * The row-level policies already restrict each call to the signed-in user's
 * own row; the user_id filter is there so a request can never be ambiguous.
 */

export const WORKBOOK_TABLE = "workbooks";

function failure(error: PostgrestError | null, status: number, fallback: string): RemoteFailure {
  const code = error?.code ?? "";
  const message = error?.message || fallback;
  if (status === 401 || status === 403 || code === "42501" || code === "PGRST301" || code === "PGRST303") {
    return { ok: false, kind: "denied", message };
  }
  if (code === "23505" || status === 409) return { ok: false, kind: "exists", message };
  if (status === 0 || status >= 500) return { ok: false, kind: "network", message };
  return { ok: false, kind: "unknown", message };
}

function thrown(err: unknown): RemoteFailure {
  return { ok: false, kind: "network", message: err instanceof Error ? err.message : "Network request failed" };
}

function asDoc(v: unknown): Doc {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Doc) : {};
}

export function supabaseWorkbookRemote(supa: SupabaseClient): WorkbookRemote {
  return {
    async read(userId): Promise<RemoteResult<{ data: Doc; version: string } | null>> {
      try {
        const { data, error, status } = await supa
          .from(WORKBOOK_TABLE)
          .select("data, updated_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) return failure(error, status, "Couldn't read your workbook.");
        if (!data) return { ok: true, value: null };
        return { ok: true, value: { data: asDoc(data.data), version: String(data.updated_at) } };
      } catch (err) {
        return thrown(err);
      }
    },

    async create(userId, doc): Promise<RemoteResult<string>> {
      try {
        const { data, error, status } = await supa
          .from(WORKBOOK_TABLE)
          .insert({ user_id: userId, data: doc })
          .select("updated_at")
          .single();
        if (error) return failure(error, status, "Couldn't save your workbook.");
        return { ok: true, value: String(data.updated_at) };
      } catch (err) {
        return thrown(err);
      }
    },

    async update(userId, doc, expectedVersion): Promise<RemoteResult<string>> {
      try {
        const { data, error, status } = await supa
          .from(WORKBOOK_TABLE)
          .update({ data: doc })
          .eq("user_id", userId)
          .eq("updated_at", expectedVersion)
          .select("updated_at");
        if (error) return failure(error, status, "Couldn't save your workbook.");
        if (!data || data.length === 0) {
          return { ok: false, kind: "stale", message: "Your workbook changed on another device." };
        }
        return { ok: true, value: String(data[0].updated_at) };
      } catch (err) {
        return thrown(err);
      }
    },
  };
}
