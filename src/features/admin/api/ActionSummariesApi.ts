import { apiFetch } from "../../../lib/HttpClient";

const BASE = "/api/v1/admin/action-summaries";

// GET /api/v1/admin/action-summaries
export async function getActionSummaries(params: any = {}) {
  const query = new URLSearchParams();
  if (params.role)      query.set("role",      params.role);
  if (params.fromDate)  query.set("fromDate",  params.fromDate);
  if (params.toDate)    query.set("toDate",    params.toDate);
  if (params.page)      query.set("page",      params.page);
  if (params.pageSize)  query.set("pageSize",  params.pageSize);
  if (params.sortBy)    query.set("sortBy",    params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return apiFetch(`${BASE}?${query.toString()}`);
}
