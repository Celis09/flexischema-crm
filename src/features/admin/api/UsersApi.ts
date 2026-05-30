import { apiFetch } from "../../../lib/HttpClient";

const BASE = "/api/v1/admin/users";

// Must match backend UserStatus enum order exactly:
// 0 = Active, 1 = Inactive, 2 = Suspended
const USER_STATUS_INDEX = { Active: 0, Inactive: 1, Suspended: 2 };

// GET /api/v1/admin/users?page&pageSize&search&status&fromDate&toDate&sortBy&sortOrder
export async function getUsers(params: any = {}) {
  const query = new URLSearchParams();
  if (params.page)      query.set("page",      params.page);
  if (params.pageSize)  query.set("pageSize",  params.pageSize);
  if (params.search)    query.set("search",    params.search);
  if (params.status)    query.set("status",    params.status);
  if (params.fromDate)  query.set("fromDate",  params.fromDate);
  if (params.toDate)    query.set("toDate",    params.toDate);
  if (params.sortBy)    query.set("sortBy",    params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return apiFetch(`${BASE}?${query.toString()}`);
}

// GET /api/v1/admin/users/:id
export async function getUserById(id) {
  return apiFetch(`${BASE}/${id}`);
}

// POST /api/v1/admin/users
export async function createUser(payload) {
  return apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// PUT /api/v1/admin/users/:id
export async function updateUser(id, payload) {
  return apiFetch(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// PATCH /api/v1/admin/users/:id/status
// Sends the enum as an integer because System.Text.Json defaults to numeric enums.
// Switch to JSON.stringify(status) if you add JsonStringEnumConverter in Program.cs.
export async function changeUserStatus(id, status) {
  const numericStatus = USER_STATUS_INDEX[status] ?? 0;
  return apiFetch(`${BASE}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(numericStatus),
  });
}
