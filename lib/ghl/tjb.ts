/**
 * Truth J Blue's server-only HighLevel client.
 *
 * The Private Integration Token and sub-account ID stay in Vercel environment
 * variables. This module is deliberately the only place that attaches the
 * authorization header, so callers cannot accidentally expose or duplicate
 * the TJB credentials.
 */
import "server-only";

const API_BASE = "https://services.leadconnectorhq.com";
const DEFAULT_API_VERSION = "2021-07-28";

export type TjbGhlCredentials = {
  locationId: string;
  token: string;
  apiVersion: string;
};

type NextFetchOptions = {
  revalidate?: number | false;
  tags?: string[];
};

export type TjbGhlRequestInit = RequestInit & {
  next?: NextFetchOptions;
};

/** Returns the TJB configuration only on the server, or null when it has not
 * been installed for that deployment. */
export function getTjbGhlCredentials(): TjbGhlCredentials | null {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN_TJB?.trim();
  const locationId = process.env.GHL_LOCATION_ID_TJB?.trim();
  if (!token || !locationId) return null;

  return {
    token,
    locationId,
    apiVersion: process.env.GHL_API_VERSION_TJB?.trim() || DEFAULT_API_VERSION,
  };
}

/** Makes an authenticated request in the TJB sub-account context.
 *
 * Callers may supply normal request headers, but Authorization and Version
 * are always set from the server-side configuration.
 */
export async function requestTjbGhl(
  path: string,
  init: TjbGhlRequestInit = {},
): Promise<Response | null> {
  const credentials = getTjbGhlCredentials();
  if (!credentials) return null;

  const { headers: suppliedHeaders, ...requestInit } = init;
  const headers = new Headers(suppliedHeaders);
  headers.set("Authorization", `Bearer ${credentials.token}`);
  headers.set("Version", credentials.apiVersion);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${API_BASE}${normalizedPath}`, {
    ...requestInit,
    headers,
  } as RequestInit);
}

/** Read-only credential verification for server-side diagnostics and tests. */
export async function verifyTjbGhlConnection(): Promise<{
  configured: boolean;
  authenticated: boolean;
  status: number | null;
}> {
  const credentials = getTjbGhlCredentials();
  if (!credentials) return { configured: false, authenticated: false, status: null };

  try {
    const response = await requestTjbGhl(
      `/locations/${encodeURIComponent(credentials.locationId)}`,
      { cache: "no-store" },
    );
    return {
      configured: true,
      authenticated: response?.ok ?? false,
      status: response?.status ?? null,
    };
  } catch {
    return { configured: true, authenticated: false, status: null };
  }
}
