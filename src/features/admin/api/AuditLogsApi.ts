import { apiFetch } from "@/lib/HttpClient";

const BASE = "/api/v1/admin/audit-logs";

export async function getAuditLogs(params: any = {}) {
  const query = new URLSearchParams();

  if (params.userId)      query.set("userId",      params.userId);
  if (params.username)    query.set("username",     params.username);
  if (params.success)     query.set("success",      params.success);
  if (params.actionType)  query.set("actionType",   params.actionType);
  if (params.entityName)  query.set("entityName",   params.entityName);
  if (params.fromDate)    query.set("fromDate",      params.fromDate);
  if (params.toDate)      query.set("toDate",        params.toDate);
  if (params.page)        query.set("page",          params.page);
  if (params.pageSize)    query.set("pageSize",      params.pageSize);
  if (params.sortBy)      query.set("sortBy",        params.sortBy);
  if (params.sortOrder)   query.set("sortOrder",     params.sortOrder);

  return apiFetch(`${BASE}?${query.toString()}`);
}

export async function getAuditLogActionTypes() {
  return apiFetch(`${BASE}/action-types`);
}

export async function getAuditLogEntityNames() {
  return apiFetch(`${BASE}/entity-names`);
}
