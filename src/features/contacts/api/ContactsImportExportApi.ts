// @ts-nocheck
import API_BASE_URL from "@/config";
const API_BASE = API_BASE_URL;

async function postCsvFile(endpoint, file, options: any = {}) {
  const { autoCreateDefinitions = false, overwriteExisting = false } = options;

  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams({
    autoCreateDefinitions: String(autoCreateDefinitions),
    overwriteExisting:     String(overwriteExisting),
  });

  const res = await fetch(`${API_BASE}${endpoint}?${params}`, {
    method: "POST",
    body:   formData,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${res.status} ${text}`);
  }

  return res.json();
}

// Dry-run — nothing is saved
export async function previewImport(file, options: any = {}) {
  return postCsvFile("/api/v1/contacts/import/preview", file, options);
}

// Real import — saves to DB
export async function importContacts(file, options: any = {}) {
  return postCsvFile("/api/v1/contacts/import", file, options);
}

/**
 * Triggers a CSV (or JSON) download from the server.
 *
 * @param {"csv"|"json"} format
 * @param {{ columns?: string[], ids?: (string|number)[] }} [opts]
 */
export async function exportContacts(format = "csv", opts = {}) {
  const params = new URLSearchParams({ format });

  if (opts.columns?.length) {
    params.set("columns", opts.columns.join(","));
  }

  if (opts.ids?.length) {
    params.set("ids", opts.ids.join(","));
  }

  const res = await fetch(`${API_BASE}/api/v1/contacts/export?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Export failed.");
    throw new Error(text);
  }

  // Derive filename from Content-Disposition if present, otherwise fall back
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match       = disposition.match(/filename[^;=\n]*=['"]?([^'";\n]+)['"]?/i);
  const fileName    = match?.[1] ?? `contacts-${new Date().toISOString().slice(0, 10)}.${format}`;

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

