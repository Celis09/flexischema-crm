/**
 * HTTP CLIENT (NETWORK ABSTRACTION)
 * ----------------------------------
 * A centralized wrapper around the native `fetch` API. It automatically attaches 
 * Authorization tokens to outgoing requests and standardizes error handling 
 * across the entire application.
 */
import API_BASE_URL from "../config";
import { refresh } from "../features/auth/api/AuthApi";

async function tryRefresh(): Promise<void> {
  await refresh();
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  let headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // If unauthorized, try refreshing once
  if (res.status === 401) {
    try {
      await tryRefresh();
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
    } catch {
      throw new Error("Unauthorized - refresh failed");
    }
  }

  // Handle error responses
  if (!res.ok) {
    // Read the raw body first — ASP.NET Core Forbid() / plain errors return
    // a plain string, not JSON, so we can't blindly call res.json().
    const text = await res.text().catch(() => "");

    let errorBody: any = null;
    try {
      errorBody = JSON.parse(text);
    } catch {
      // body is plain text (e.g. Forbid("Your account is inactive..."))
    }

    const err = new Error(
      errorBody?.message ||   // JSON body with a message field
      text ||                 // plain string body (Forbid, etc.)
      `Request failed: ${res.status}`
    ) as Error & { status?: number; errors?: any };
    err.status = res.status;

    if (errorBody?.errors) {
      err.errors = errorBody.errors; // field-specific validation errors
    }

    throw err;
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return null;
  }

  // Only parse JSON if body exists
  const text = await res.text();
  if (!text) return null;

  return JSON.parse(text);
}
