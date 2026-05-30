import { apiFetch } from "../../../lib/HttpClient";

const BASE = "/api/v1/admin/configs";

// GET /api/v1/admin/configs → List<AdminConfigDto>
export async function getAdminConfigs() {
  return apiFetch(BASE);
}

// PUT /api/v1/admin/configs/:id
export async function updateAdminConfig(id, payload) {
  return apiFetch(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Helper: get a single config value by key (case-insensitive), parsed as int
export async function getAdminConfigInt(key, fallback = null) {
  try {
    const configs = await getAdminConfigs();
    const match = configs.find(
      c => c.key?.toLowerCase() === key.toLowerCase()
    );
    if (!match) return fallback;
    const parsed = parseInt(match.value, 10);
    return isNaN(parsed) ? fallback : parsed;
  } catch {
    return fallback;
  }
}
