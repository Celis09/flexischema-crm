/**
 * utils/index.js
 *
 * Pure utility functions and hooks shared across the whole app.
 * No React component, DOM dependency, or CSS import lives here — only logic.
 */

import { useState, useEffect, useRef } from "react";
import { ExtraFieldDefinition, UserRole } from "@/types/index";

// ─── Error parsers ────────────────────────────────────────────────────────────

/**
 * Converts a flat string[] from the backend into a keyed error object,
 * routing each message to the field it most likely belongs to.
 *
 * Used by: UserModal, AdminConfigModal
 */
export function parseUserErrors(errors: any) {
  if (!errors) return {};
  if (!Array.isArray(errors)) return errors;

  const keyed: Record<string, string> = {};
  errors.forEach(msg => {
    const l = msg.toLowerCase();
    if (l.includes("username")) { keyed.username = keyed.username ?? msg; return; }
    if (l.includes("email"))    { keyed.email    = keyed.email ? `${keyed.email} · ${msg}` : msg; return; }
    if (l.includes("password")) { keyed.password = keyed.password ?? msg; return; }
    if (l.includes("role"))     { keyed.role     = keyed.role ?? msg; return; }
    keyed.general = keyed.general ? `${keyed.general} · ${msg}` : msg;
  });
  return keyed;
}

/**
 * Maps backend validation messages for a Contact form to per-field keys,
 * including dynamic extra field routing.
 *
 * Accepts:
 *   - { errors: { "ExtraFields[N]": ["msg"], "Name": ["msg"] } }  ← new backend shape
 *   - string[]                                                     ← legacy flat array
 *
 * Used by: ContactModal
 */
export function parseContactErrors(raw: any, extraFields: ExtraFieldDefinition[] = []) {
  // Unwrap { errors: { ... } } if the full response data was passed
  const input = raw?.errors ?? raw;
  if (!input) return {};

  const keyed: Record<string, string> = {};

  // ── Dictionary format: { "ExtraFields[8]": ["msg"], "Name": ["msg"] } ───────
  if (!Array.isArray(input) && typeof input === "object") {
    Object.entries(input).forEach(([key, value]) => {
      const msgs = Array.isArray(value) ? value : [String(value)];

      // ExtraFields[N] → map by index to extraFieldDefinitionId
      const indexMatch = key.match(/ExtraFields\[(\d+)\]/i);
      if (indexMatch) {
        const idx = parseInt(indexMatch[1], 10);
        const ef  = extraFields[idx];
        if (ef) {
          const k = `extra-${ef.extraFieldDefinitionId}`;
          msgs.forEach(msg => {
            keyed[k] = keyed[k] ? `${keyed[k]} · ${msg}` : msg;
          });
          return;
        }
      }

      // Named core fields
      msgs.forEach((msg: any) => {
        const k = key.toLowerCase();
        const l = msg.toLowerCase();
        if (k === "name"  || l.includes("name"))
          { keyed.name  = keyed.name  ?? msg; return; }
        if (k === "email" || l.includes("email"))
          { keyed.email = keyed.email ? `${keyed.email} · ${msg}` : msg; return; }
        keyed.general = keyed.general ? `${keyed.general}\n${msg}` : msg;
      });
    });
    return keyed;
  }

  // ── Flat string[] (legacy) ────────────────────────────────────────────────
  const list = Array.isArray(input) ? input : [String(input)];
  list.forEach(msg => {
    const l = msg.toLowerCase();
    if (l.includes("name"))
      { keyed.name  = keyed.name  ?? msg; return; }
    if (l.includes("email"))
      { keyed.email = keyed.email ? `${keyed.email} · ${msg}` : msg; return; }

    // "Field 'Phone' must be a valid phone number"
    const fieldMatch = msg.match(/field ['"](.+?)['"]/i);
    if (fieldMatch) {
      const name = fieldMatch[1].toLowerCase();
      const hit  = extraFields.find(ef => ef.fieldName?.toLowerCase() === name);
      if (hit) {
        const k = `extra-${hit.extraFieldDefinitionId}`;
        keyed[k] = keyed[k] ? `${keyed[k]} · ${msg}` : msg;
        return;
      }
    }
    keyed.general = keyed.general ? `${keyed.general}\n${msg}` : msg;
  });
  return keyed;
}

/**
 * Maps backend validation messages for the Login form to per-field keys.
 * Accepts a string, string[], or { error: "..." } object.
 *
 * Used by: LoginModal
 */
export function parseLoginErrors(errors: any) {
  if (!errors) return {};

  if (typeof errors === "object" && !Array.isArray(errors)) {
    if (errors.error) return { general: errors.error };
    return errors;
  }

  const list = Array.isArray(errors) ? errors : [errors];
  const keyed: Record<string, string> = {};
  list.forEach(msg => {
    const l = msg.toLowerCase();

    // "Invalid username or password" is a general auth failure, not a field error
    if (l.includes("username or password") || l.includes("invalid username")) {
      keyed.general = keyed.general ? `${keyed.general} · ${msg}` : msg; return;
    }
    if (l.includes("username") || l.includes("user"))
      { keyed.username = keyed.username ?? msg; return; }
    if (l.includes("password"))
      { keyed.password = keyed.password ?? msg; return; }
    keyed.general = keyed.general ? `${keyed.general} · ${msg}` : msg;
  });
  return keyed;
}

// ─── Column config persistence ────────────────────────────────────────────────

const COL_KEY = (role: UserRole) => `contacts_col_config_${role}`;

/** Load column config from localStorage for the given role. Returns null if absent. */
export function loadColumnConfig(role: UserRole): { columnOrder: string[]; hiddenColumns: string[] } | null {
  try {
    const raw = localStorage.getItem(COL_KEY(role));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Persist column config to localStorage for the given role. */
export function saveColumnConfig(role: UserRole, columnOrder: string[], hiddenColumns: string[] | Set<string>) {
  try {
    localStorage.setItem(
      COL_KEY(role),
      JSON.stringify({ columnOrder, hiddenColumns: [...hiddenColumns] })
    );
  } catch { /* fail silently */ }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Delays updating the returned value until `delay` ms after the last change.
 * Usage: const debouncedSearch = useDebounce(searchTerm, 300);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Returns a stable callback that shows a timed status message.
 * Usage: const showStatus = useStatusMessage(setMsg, setType);
 *
 * Returns: (message: string, type?: "success" | "error") => void
 */
export function useStatusMessage(
  setMessage: (msg: string) => void,
  setType: (type: "success" | "error") => void,
  duration = 3000
) {
  const timerRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  return (msg: string, type: "success" | "error" = "success") => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    setMessage(msg);
    setType(type);
    timerRef.current = setTimeout(() => setMessage(""), duration);
  };
}

// ─── Field type → input props map ────────────────────────────────────────────

export const FIELD_TYPE_INPUT: Record<string, { type: string; placeholder: string; hint: string | null }> = {
  text:   { type: "text",   placeholder: "Enter text",          hint: null },
  email:  { type: "email",  placeholder: "Enter email address", hint: "e.g. name@example.com" },
  date:   { type: "date",   placeholder: "",                    hint: "Pick a date" },
  phone:  { type: "tel",    placeholder: "Enter phone number",  hint: "e.g. +1 555 000 0000" },
  url:    { type: "url",    placeholder: "https://",            hint: "Must start with https://" },
  number: { type: "number", placeholder: "Enter a number",      hint: "Numeric values only" },
};

export function getInputProps(fieldType: string) {
  return FIELD_TYPE_INPUT[fieldType?.toLowerCase()] ?? FIELD_TYPE_INPUT.text;
}

// ─── Column helpers ───────────────────────────────────────────────────────────

export function buildDefaultColumnOrder(coreColumns: string[], activeDefinitions: ExtraFieldDefinition[]) {
  return [
    ...coreColumns,
    ...activeDefinitions.map(d => `extra-${d.extraFieldDefinitionId}`),
  ];
}

/** Inserts an array element from fromIndex to toIndex (immutable). */
export function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...arr];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
