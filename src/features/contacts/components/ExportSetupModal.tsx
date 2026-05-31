// ExportSetupModal.tsx
// Lets the user pick which columns to include before triggering a CSV export.
// Persists choices to localStorage per role, independently from print preferences.

import { useState, useEffect, useCallback } from "react";
import { ModalShell, Button } from "@/components/Primitives";

// ─── Constants ────────────────────────────────────────────────────────────────

// Columns that are structural/interactive and make no sense in an export file.
const SYSTEM_COLS = new Set(["select", "sequence", "changeStatus"]);

const EXPORT_STORAGE_PREFIX = "fs-export-cols-";

const BUILTIN_LABELS = {
  id:          "ID",
  name:        "Name",
  email:       "Email",
  status:      "Status",
  createdDate: "Created Date",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeColId(colId) {
  return colId.startsWith("extra-") ? colId.slice(6) : colId;
}

function getLabel(colId, definitions) {
  if (BUILTIN_LABELS[colId]) return BUILTIN_LABELS[colId];
  const normalized = normalizeColId(colId);
  const def = definitions.find(
    d =>
      d.fieldName === colId ||
      String(d.extraFieldDefinitionId) === normalized ||
      String(d.extraFieldDefinitionId) === colId
  );
  return def?.fieldName ?? colId;
}

function loadExportCols(roleKey) {
  try {
    const raw = localStorage.getItem(EXPORT_STORAGE_PREFIX + roleKey);
    return raw ? JSON.parse(raw) : null;
  } catch { /* ignore */ }
}

function saveExportCols(roleKey, cols) {
  try {
    localStorage.setItem(EXPORT_STORAGE_PREFIX + roleKey, JSON.stringify(cols));
  } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {object}        props
 * @param {boolean}       props.open           - Whether the modal is visible
 * @param {string[]}      props.allColumnIds   - Full ordered list of column IDs (incl. system cols)
 * @param {Array}         props.definitions    - Active extra-field definitions (for labels)
 * @param {string}        props.roleKey        - "admin" | "editor" | "viewer" (for localStorage)
 * @param {number}        props.selectedCount  - Number of currently selected rows (0 = export all)
 * @param {function}      props.onConfirm      - Called with { columns: string[], exportSelected: boolean }
 * @param {function}      props.onClose        - Called when the modal is dismissed
 */
export default function ExportSetupModal({
  open,
  allColumnIds,
  definitions,
  roleKey,
  selectedCount = 0,
  onConfirm,
  onClose,
}) {
  // Exportable = everything except structural system columns
  const exportable = (allColumnIds ?? []).filter(id => !SYSTEM_COLS.has(id));

  const resolveInitial = useCallback(() => {
    const saved     = loadExportCols(roleKey);
    const available = new Set(exportable);
    if (saved?.length) {
      return new Set(saved.filter(id => available.has(id)));
    }
    return new Set(exportable); // default: all on
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKey, exportable.join(",")]);

  const [selected,       setSelected]       = useState(resolveInitial);
  const [exportSelected, setExportSelected] = useState(false);

  // Re-resolve whenever the modal opens (role may have changed, new columns added)
  useEffect(() => {
    if (open) {
      setSelected(resolveInitial());
      // Default scope to "selected" only for admins when rows are checked; otherwise "all"
      setExportSelected(selectedCount > 0 && roleKey === "admin");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggle = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll   = () => setSelected(new Set(exportable));
  const deselectAll = () => setSelected(new Set());

  const handleConfirm = (format) => {
    const ordered = exportable.filter(id => selected.has(id));
    saveExportCols(roleKey, ordered);
    onConfirm({ columns: ordered, exportSelected, format });
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const allChecked  = exportable.every(id => selected.has(id));
  const noneChecked = selected.size === 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <ModalShell
      open={open}
      title="↓  Export Setup"
      subtitle="Choose which columns to include. Preferences are saved per role."
      onClose={onClose}
      maxWidth={400}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="cancel" onClick={() => handleConfirm("csv")} disabled={noneChecked}>
            Download CSV
          </Button>
          <Button variant="primary" onClick={() => handleConfirm("xlsx")} disabled={noneChecked}>
            Download Excel →
          </Button>
        </>
      }
    >

      {/* ── Scope selector — only shown for admins when rows are selected ── */}
      {selectedCount > 0 && roleKey === "admin" && (
        <div style={{
          display:      "flex",
          gap:          6,
          padding:      "8px 10px",
          borderRadius: "var(--fs-radius-sm)",
          background:   "var(--fs-surface-input)",
          border:       "1px solid var(--fs-border-strong)",
        }}>
          <label style={{
            display:    "flex",
            alignItems: "center",
            gap:        7,
            flex:       1,
            cursor:     "pointer",
            fontSize:   13,
            fontWeight: !exportSelected ? 600 : 400,
            color:      !exportSelected ? "var(--fs-text)" : "var(--fs-text-dim)",
          }}>
            <input
              type="radio"
              name="exportScope"
              checked={!exportSelected}
              onChange={() => setExportSelected(false)}
              style={{ accentColor: "var(--fs-accent)" }}
            />
            All contacts
          </label>
          <label style={{
            display:    "flex",
            alignItems: "center",
            gap:        7,
            flex:       1,
            cursor:     "pointer",
            fontSize:   13,
            fontWeight: exportSelected ? 600 : 400,
            color:      exportSelected ? "var(--fs-text)" : "var(--fs-text-dim)",
          }}>
            <input
              type="radio"
              name="exportScope"
              checked={exportSelected}
              onChange={() => setExportSelected(true)}
              style={{ accentColor: "var(--fs-accent)" }}
            />
            Selected ({selectedCount})
          </label>
        </div>
      )}

      {/* ── Select-all / deselect-all row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button
          variant="cancel"
          onClick={selectAll}
          disabled={allChecked}
          style={{ height: 30, fontSize: 11, padding: "0 12px" }}
        >
          Select all
        </Button>
        <Button
          variant="cancel"
          onClick={deselectAll}
          disabled={noneChecked}
          style={{ height: 30, fontSize: 11, padding: "0 12px" }}
        >
          Deselect all
        </Button>
        <span style={{
          marginLeft: "auto",
          fontSize:   11,
          fontWeight: 600,
          color:      "var(--fs-text-dim)",
          fontFamily: "var(--fs-font-mono)",
        }}>
          {selected.size}&thinsp;/&thinsp;{exportable.length}
        </span>
      </div>

      {/* ── Column checklist ── */}
      <div style={{
        display:       "flex",
        flexDirection: "column",
        gap:           2,
        maxHeight:     300,
        overflowY:     "auto",
        border:        "1px solid var(--fs-border-strong)",
        borderRadius:  "var(--fs-radius)",
        padding:       4,
        background:    "var(--fs-surface-input)",
      }}>
        {exportable.map(id => {
          const checked = selected.has(id);
          return (
            <label
              key={id}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          10,
                padding:      "6px 10px",
                borderRadius: "var(--fs-radius-sm)",
                cursor:       "pointer",
                fontSize:     13,
                fontWeight:   checked ? 600 : 400,
                color:        checked ? "var(--fs-text)" : "var(--fs-text-dim)",
                background:   checked ? "var(--fs-accent-sel)" : "transparent",
                border:       `1px solid ${checked ? "var(--fs-accent-dim)" : "transparent"}`,
                transition:   "background 0.12s, color 0.12s, border-color 0.12s",
                userSelect:   "none",
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(id)}
                style={{
                  accentColor: "var(--fs-accent)",
                  width:       14,
                  height:      14,
                  flexShrink:  0,
                }}
              />
              {getLabel(id, definitions)}
            </label>
          );
        })}
      </div>

      {/* ── No-column warning ── */}
      {noneChecked && (
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          padding:      "9px 13px",
          borderRadius: "var(--fs-radius-sm)",
          fontSize:     12,
          fontWeight:   600,
          background:   "var(--fs-error-bg)",
          border:       "1px solid var(--fs-error-border)",
          color:        "var(--fs-error-text)",
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
          Select at least one column to enable export.
        </div>
      )}

    </ModalShell>
  );
}
