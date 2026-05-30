import { apiFetch } from "../../../lib/HttpClient";

const BASE = "/api/v1/admin/metrics";

// GET /api/v1/admin/metrics → metrics object
export async function getMetrics() {
  return apiFetch(BASE);
}

// GET /api/v1/admin/metrics/health → { status: "Healthy" } (no auth required)
export async function getHealthCheck() {
  return apiFetch(`${BASE}/health`);
}
