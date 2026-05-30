// @ts-nocheck
import API_BASE_URL from "../../../config";

async function throwWithBody(res) {
  const text = await res.text().catch(() => "");
  let message;
  try {
    const json = JSON.parse(text);
    message =
      json?.error ||           // { error: "..." }  ← backend format
      json?.message ||         // { message: "..." }
      (Array.isArray(json?.errors) ? json.errors[0] : null) ||
      text;
  } catch {
    message = text;
  }
  const err = new Error(message || `Request failed: ${res.status}`);
  err.status = res.status;
  throw err;
}

export async function login(credentials) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) await throwWithBody(res);
  return res.json();
}

export async function refresh(refreshToken) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error("Refresh failed");
  return res.json();
}

export async function logout(refreshToken) {
  await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}

