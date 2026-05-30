// ─── dateRangePresets.js ──────────────────────────────────────────────────────
// Generates date range presets for any dynamic date field (e.g. created_at).
// Returns { label, fromDate, toDate } where dates are "YYYY-MM-DD" strings.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a Date object → "YYYY-MM-DD"
 */
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns a fresh "today" Date with time zeroed out (local midnight).
 */
function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Preset builders ──────────────────────────────────────────────────────────

function todayPreset() {
  const d = toISO(today());
  return { label: "Today", fromDate: d, toDate: d };
}

function yesterday() {
  const d = new Date(today());
  d.setDate(d.getDate() - 1);
  const iso = toISO(d);
  return { label: "Yesterday", fromDate: iso, toDate: iso };
}

function last7Days() {
  const end   = today();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { label: "Last 7 Days", fromDate: toISO(start), toDate: toISO(end) };
}

function thisMonth() {
  const now   = today();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { label: "This Month", fromDate: toISO(start), toDate: toISO(now) };
}

function lastMonth() {
  const now   = today();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end   = new Date(now.getFullYear(), now.getMonth(), 0);
  return { label: "Last Month", fromDate: toISO(start), toDate: toISO(end) };
}

// ─── Master preset list ───────────────────────────────────────────────────────

/**
 * Returns all available date range presets.
 * Each entry: { label: string, fromDate: "YYYY-MM-DD", toDate: "YYYY-MM-DD" }
 *
 * Usage:
 *   const presets = getDateRangePresets();
 *   const { fromDate, toDate } = presets.find(p => p.label === "Last 7 Days");
 */
export function getDateRangePresets() {
  return [
    todayPreset(),
    yesterday(),
    last7Days(),
    thisMonth(),
    lastMonth(),
  ];
}

/**
 * Returns a single preset by label (case-insensitive).
 * Returns null if not found.
 *
 * Usage:
 *   const range = getPresetByLabel("last 7 days");
 *   filters.setFromDate(range.fromDate);
 *   filters.setToDate(range.toDate);
 */
export function getPresetByLabel(label) {
  return getDateRangePresets().find(
    p => p.label.toLowerCase() === label.toLowerCase()
  ) ?? null;
}
