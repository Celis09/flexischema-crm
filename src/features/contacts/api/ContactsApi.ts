/**
 * CONTACTS API (DATA ACCESS LAYER)
 * ---------------------------------
 * Encapsulates all backend HTTP requests for the Contacts domain. 
 * By isolating API calls here, components remain unaware of how data is 
 * fetched, making the app easier to test and refactor.
 */
// @ts-nocheck
import { apiFetch } from "@/lib/HttpClient";

const BASE = "/api/v1/contacts";

const CONTACT_STATUS_INDEX = { Active: 0, Inactive: 1, Archived: 2 };

// ✅ Normalize sortBy: extra field columns use "extra-{id}" in the table
//    but the backend expects "extra_{fieldName}" — map it here
function normalizeSortBy(sortBy) {
  if (!sortBy) return "name";
  // Frontend uses "extra-{definitionId}", backend expects "extra_{fieldName}"
  // This mapping needs fieldName, so we handle it in useContacts where definitions are available
  return sortBy.toLowerCase();
}

export async function getContacts({
  search = "",
  page = 1,
  pageSize = 20,
  sortBy = "name",
  sortOrder = "asc",
  status,
  fromDate,
  toDate,
}: { search?: string; page?: number; pageSize?: number; sortBy?: string; sortOrder?: string; status?: string | number; fromDate?: string; toDate?: string; } = {}) {
  const params = new URLSearchParams({
    search,
    page,
    pageSize,
    sortBy: normalizeSortBy(sortBy) as any,
    sortOrder,
  });
  if (status !== undefined && status !== "") {
    params.set("status", CONTACT_STATUS_INDEX[status] ?? status);
  }
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate)   params.set("toDate",   toDate);
  return apiFetch(`${BASE}?${params.toString()}`);
}

export async function addContact(contact) {
  return apiFetch(BASE, { method: "POST", body: JSON.stringify(contact) });
}

export async function updateContact(contact) {
  return apiFetch(`${BASE}/${contact.id}`, { method: "PUT", body: JSON.stringify(contact) });
}

export async function changeContactStatus(id, status) {
  const numericStatus = CONTACT_STATUS_INDEX[status] ?? 0;
  return apiFetch(`${BASE}/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ id, status: numericStatus }),
  });
}

export async function exportContacts(format = "csv") {
  return apiFetch(`${BASE}/export?format=${format}`);
}

