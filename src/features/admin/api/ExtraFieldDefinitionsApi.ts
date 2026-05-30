// @ts-nocheck
import { apiFetch } from "../../../lib/HttpClient";

const BASE = "/api/v1/admin/extra-fields";

// GET /api/v1/admin/extra-fields?roleFilter=&isActive=
export async function getExtraFieldDefinitions({ roleFilter, isActive } = {}) {
  const params = new URLSearchParams();
  if (roleFilter !== undefined && roleFilter !== "") params.append("roleFilter", roleFilter);
  if (isActive   !== undefined)                      params.append("isActive",   isActive);
  const query = params.toString();
  return apiFetch(`${BASE}${query ? `?${query}` : ""}`);
}

// GET /api/v1/admin/extra-fields/:id
export async function getExtraFieldDefinitionById(id) {
  return apiFetch(`${BASE}/${id}`);
}

// POST /api/v1/admin/extra-fields
export async function addExtraFieldDefinition(payload) {
  return apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// PUT /api/v1/admin/extra-fields/:id  (Admin only)
export async function updateExtraFieldDefinition(id, payload) {
  return apiFetch(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...payload, extraFieldDefinitionId: id }),
  });
}

// PATCH /api/v1/admin/extra-fields/:id/status  (Admin only)
export async function changeExtraFieldDefinitionStatus(id, isActive) {
  return apiFetch(`${BASE}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ extraFieldDefinitionId: id, isActive }),
  });
}

// PATCH /api/v1/admin/extra-fields/:id/required-status  (Admin only)
export async function changeExtraFieldDefinitionRequiredStatus(id, isRequired) {
  return apiFetch(`${BASE}/${id}/required-status`, {
    method: "PATCH",
    body: JSON.stringify({ extraFieldDefinitionId: id, isRequired }),
  });
}

// ── Options ───────────────────────────────────────────────────────────────────

// GET /api/v1/admin/extra-fields/:id/options
export async function getExtraFieldOptions(id) {
  return apiFetch(`${BASE}/${id}/options`);
}

// POST /api/v1/admin/extra-fields/:id/options
export async function addExtraFieldOption(id, optionValue) {
  return apiFetch(`${BASE}/${id}/options`, {
    method: "POST",
    body: JSON.stringify(optionValue),
  });
}

// DELETE /api/v1/admin/extra-fields/:id/options/:optionId
export async function deleteExtraFieldOption(id, optionId) {
  return apiFetch(`${BASE}/${id}/options/${optionId}`, {
    method: "DELETE",
  });
}

