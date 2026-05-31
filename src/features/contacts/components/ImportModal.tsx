import { useState, useEffect } from "react";
import { ModalShell, Button, ErrorBanner } from "@/components/Primitives";
import { importContacts, previewImport } from "@/features/contacts/api/ContactsImportExportApi";

const STATUS_COLOR = {
  New:    "#16a34a",
  Update: "#ca8a04",
  Skip:   "#dc2626",
};

const BADGE_STYLES = {
  inactive:      { bg: "#7c3aed18", color: "#7c3aed", border: "#7c3aed40" },
  archived:      { bg: "#57534e18", color: "#57534e", border: "#57534e40" },
  inactiveField: { bg: "#7c3aed18", color: "#7c3aed", border: "#7c3aed40" },
  typeError:     { bg: "#ea580c18", color: "#ea580c", border: "#ea580c40" },
  duplicate:     { bg: "#0369a118", color: "#0369a1", border: "#0369a140" },
  limitError:    { bg: "#b4500818", color: "#b45008", border: "#b4500840" },
};

const NO_OP_REASON = "Contact exists; no new values to apply.";

function parseError(err) {
  try {
    const match = err.message?.match(/\{.*\}/s);
    if (match) {
      const body = JSON.parse(match[0]);
      if (Array.isArray(body.errors)) {
        const specific = body.errors.filter(e => e !== "An unexpected error occurred.");
        if (specific.length) return specific.join(" ");
      }
    }
  } catch { /* ignore */ }
  return err.message || "Something went wrong.";
}

// ── WarningBadge ──────────────────────────────────────────────────────────────

function WarningBadge({ row }) {
  if (row.isInactive)        return <span style={pill(BADGE_STYLES.inactive)}>⚠ Inactive Contact</span>;
  if (row.hasInactiveField)  return <span style={pill(BADGE_STYLES.inactiveField)}>⚠ Inactive Field</span>;
  if (row.isDuplicateInBatch) return <span style={pill(BADGE_STYLES.duplicate)}>⚠ Duplicate in CSV</span>;
  if (row.hasFieldTypeError) return <span style={pill(BADGE_STYLES.typeError)}>⚠ Type Mismatch</span>;
  if (row.hasLimitError)      return <span style={pill(BADGE_STYLES.limitError)}>⚠ Definition Limit Reached</span>;
  return null;
}

function pill({ bg, color, border }) {
  return {
    background: bg, color, border: `1px solid ${border}`,
    borderRadius: 20, padding: "1px 8px",
    fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    display: "inline-flex", alignItems: "center", gap: 3,
  };
}

// ── FieldChanges ──────────────────────────────────────────────────────────────

function FieldChanges({ changes }) {
  if (!changes?.length) return null;
  return (
    <div style={{ marginTop: 6, borderRadius: 6, overflow: "hidden", border: "1px solid var(--fs-border)", fontSize: 11 }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        background: "var(--fs-th-bg, #f3f4f6)", padding: "4px 8px",
        fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px",
        color: "var(--fs-text-dim)", fontSize: 10,
      }}>
        <span>Field</span><span>Before</span><span>After</span>
      </div>
      {changes.map((c, i) => {
        const isAdded    = c.oldValue === null;
        const isBlank    = c.oldValue === "";
        const isReplaced = !isAdded && !isBlank;
        return (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            padding: "5px 8px", borderTop: i > 0 ? "1px solid var(--fs-border)" : "none",
            alignItems: "center", background: i % 2 === 0 ? "transparent" : "var(--fs-th-bg, #f9fafb)",
          }}>
            <span style={{ fontWeight: 600, color: "var(--fs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.fieldName}
            </span>
            <span style={{
              color: isAdded ? "var(--fs-text-dim)" : STATUS_COLOR.Skip,
              fontStyle: isAdded ? "italic" : "normal",
              textDecoration: isReplaced ? "line-through" : "none",
              opacity: isReplaced ? 0.7 : 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {isAdded ? "—" : (c.oldValue || <em style={{ color: "var(--fs-text-dim)" }}>empty</em>)}
            </span>
            <span style={{ color: STATUS_COLOR.New, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.newValue || "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── RowWarnings ───────────────────────────────────────────────────────────────

function RowWarnings({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div style={{
      marginTop: 6, padding: "6px 10px",
      background: "#ea580c08", border: "1px solid #ea580c30",
      borderRadius: 6, fontSize: 11,
    }}>
      <div style={{ fontWeight: 700, color: "#ea580c", marginBottom: 3, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.4px" }}>
        ⚠ Field warnings (row imported with these issues)
      </div>
      {warnings.map((w, i) => (
        <div key={i} style={{ color: "#92400e", lineHeight: 1.5 }}>• {w}</div>
      ))}
    </div>
  );
}

// ── ExpandableRow ─────────────────────────────────────────────────────────────

function ExpandableRow({ row, idx, total }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges  = row.changes?.length > 0;
  const hasWarnings = row.warnings?.length > 0;
  const isExpandable = hasChanges || hasWarnings;

  const reasonColor =
    row.isInactive || row.hasInactiveField ? BADGE_STYLES.inactive.color :
    row.isDuplicateInBatch                 ? BADGE_STYLES.duplicate.color :
    STATUS_COLOR.Skip;

  return (
    <>
      <tr
        style={{
          borderBottom: !expanded && idx < total - 1 ? "1px solid var(--fs-border)" : "none",
          background:
            row.status === "New"    ? STATUS_COLOR.New    + "0a" :
            row.status === "Update" ? STATUS_COLOR.Update + "0a" :
            row.status === "Skip"   ? STATUS_COLOR.Skip   + "0a" : "transparent",
          cursor: isExpandable ? "pointer" : "default",
        }}
        onClick={() => isExpandable && setExpanded(e => !e)}
        title={isExpandable ? "Click to see details" : undefined}
      >
        <td style={{ padding: "6px 12px", color: "var(--fs-text-dim)", fontSize: 12, whiteSpace: "nowrap" }}>{row.rowNumber}</td>
        <td style={{ padding: "6px 12px" }}>{row.name  || "—"}</td>
        <td style={{ padding: "6px 12px" }}>{row.email || "—"}</td>
        <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
          <span style={{ color: STATUS_COLOR[row.status] ?? "inherit", fontWeight: 700, fontSize: 12 }}>
            ● {row.status}
          </span>
        </td>
        <td style={{ padding: "6px 12px", fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <WarningBadge row={row} />
            {row.reason ? (
              <span style={{ color: reasonColor }}>{row.reason}</span>
            ) : isExpandable ? (
              <span style={{ color: "var(--fs-text-dim)" }}>
                {hasChanges && `${row.changes.length} field${row.changes.length !== 1 ? "s" : ""}`}
                {hasChanges && hasWarnings && " · "}
                {hasWarnings && `${row.warnings.length} warning${row.warnings.length !== 1 ? "s" : ""}`}
                {" "}
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fs-text-dim)", border: "1px solid var(--fs-border)", borderRadius: 4, padding: "1px 5px" }}>
                  {expanded ? "▲ hide" : "▼ show"}
                </span>
              </span>
            ) : null}
          </div>
        </td>
      </tr>

      {expanded && isExpandable && (
        <tr style={{ borderBottom: idx < total - 1 ? "1px solid var(--fs-border)" : "none" }}>
          <td colSpan={5} style={{
            padding: "0 12px 10px 32px",
            background:
              row.status === "New"    ? STATUS_COLOR.New    + "0a" :
              row.status === "Update" ? STATUS_COLOR.Update + "0a" : "transparent",
          }}>
            <FieldChanges changes={row.changes} />
            <RowWarnings  warnings={row.warnings} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── ImportModal ───────────────────────────────────────────────────────────────

export default function ImportModal({ open, onClose, onConfirm }) {
  const [file,              setFile]              = useState(null);
  const [autoCreateDefs,    setAutoCreateDefs]    = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [preview,           setPreview]           = useState(null);
  const [previewing,        setPreviewing]        = useState(false);
  const [confirming,        setConfirming]        = useState(false);
  const [error,             setError]             = useState("");
  const [showNoOp,          setShowNoOp]          = useState(false);
  const [visibleStatuses,   setVisibleStatuses]   = useState(["New", "Update", "Skip"]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setAutoCreateDefs(false);
      setOverwriteExisting(false);
      setPreview(null);
      setError("");
      setShowNoOp(false);
      setVisibleStatuses(["New", "Update", "Skip"]);
    }
  }, [open]);

  useEffect(() => {
    setVisibleStatuses(["New", "Update", "Skip"]);
    setShowNoOp(false);
  }, [preview]);

  function toggleStatus(status) {
    setVisibleStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  }

  async function handlePreview() {
    if (!file) return;
    setPreviewing(true);
    setError("");
    setPreview(null);
    try {
      const result = await previewImport(file, { autoCreateDefinitions: autoCreateDefs, overwriteExisting });
      setPreview(result);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setConfirming(true);
    setError("");
    try {
      const result = await importContacts(file, { autoCreateDefinitions: autoCreateDefs, overwriteExisting });
      onConfirm(result);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setConfirming(false);
    }
  }

  const steps = [
    { step: 1, label: "Choose a CSV or Excel file", done: !!file    },
    { step: 2, label: "Preview changes",   done: !!preview },
    { step: 3, label: "Confirm import",    done: false      },
  ];

  const noOpCount        = preview?.rowPreviews.filter(r => r.reason === NO_OP_REASON).length ?? 0;
  const inactiveCount    = preview?.rowPreviews.filter(r => r.isInactive).length ?? 0;
  const archivedCount    = preview?.rowPreviews.filter(r => r.isArchived).length ?? 0;
  const inactiveFieldCount = preview?.rowPreviews.filter(r => r.hasInactiveField).length ?? 0;
  const typeErrorCount   = preview?.rowPreviews.filter(r => r.hasFieldTypeError).length ?? 0;
  const duplicateCount   = preview?.rowPreviews.filter(r => r.isDuplicateInBatch).length ?? 0;
  const limitErrorCount  = preview?.rowPreviews.filter(r => r.hasLimitError).length ?? 0;
  const definitionLimitReached     = preview?.definitionLimitReached ?? false;
  const definitionLimit            = preview?.definitionLimit ?? 0;
  const definitionSlotsRemaining   = preview?.definitionSlotsRemaining ?? 0;

  const statusCounts = preview
    ? {
        New:    preview.rowPreviews.filter(r => r.status === "New").length,
        Update: preview.rowPreviews.filter(r => r.status === "Update").length,
        Skip:   preview.rowPreviews.filter(r => r.status === "Skip").length,
      }
    : { New: 0, Update: 0, Skip: 0 };

  const visibleRows = preview
    ? preview.rowPreviews.filter(r => {
        if (!showNoOp && r.reason === NO_OP_REASON) return false;
        return visibleStatuses.includes(r.status);
      })
    : [];

  return (
    <ModalShell
      open={open}
      title="Import Contacts"
      subtitle="Preview your CSV before committing changes."
      onClose={onClose}
      maxWidth={720}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!file || !preview || confirming}>
            {confirming ? "Importing…" : "Confirm Import"}
          </Button>
        </>
      }
    >
      {/* Steps indicator */}
      <div style={{ display: "flex", alignItems: "center", margin: "4px 0 8px" }}>
        {steps.map((s, i) => (
          <div key={s.step} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: s.done ? "#16a34a" : "var(--fs-border)",
                color:      s.done ? "#fff"    : "var(--fs-text-dim)",
                border:     s.done ? "none"    : "1px solid var(--fs-border)",
              }}>
                {s.done ? "✓" : s.step}
              </span>
              <span style={{ fontSize: 12, fontWeight: s.done ? 600 : 400, color: s.done ? "var(--fs-text)" : "var(--fs-text-dim)" }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, margin: "0 8px", background: s.done ? "#16a34a40" : "var(--fs-border)" }} />
            )}
          </div>
        ))}
      </div>

      {/* File picker */}
      <div className="fs-field">
        <label className="fs-label">CSV or Excel File</label>
        <input
          type="file" accept=".csv, .xlsx, .xls" className="fs-modal-input"
          style={{ height: "auto", padding: "8px 14px", cursor: "pointer" }}
          onChange={async e => {
            let selectedFile = e.target.files[0] || null;
            if (selectedFile && (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls"))) {
              try {
                const XLSX = await import("xlsx");
                const data = await selectedFile.arrayBuffer();
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const csvString = XLSX.utils.sheet_to_csv(worksheet);
                const blob = new Blob([csvString], { type: "text/csv" });
                selectedFile = new File([blob], selectedFile.name.replace(/\.[^/.]+$/, ".csv"), { type: "text/csv" });
              } catch (err) {
                setError("Failed to parse Excel file.");
                selectedFile = null;
              }
            }
            setFile(selectedFile);
            setPreview(null);
            if (!error) setError("");
          }}
        />
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { label: "Auto-create missing field definitions", value: autoCreateDefs,    set: setAutoCreateDefs    },
          { label: "Overwrite existing field values",       value: overwriteExisting, set: setOverwriteExisting },
        ].map(({ label, value, set }) => (
          <label key={label} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={value} onChange={e => { set(e.target.checked); setPreview(null); }} />
            {label}
          </label>
        ))}
      </div>

      {/* Preview button */}
      {file && (
        <div>
          <Button variant="cancel" onClick={handlePreview} disabled={previewing}>
            {previewing ? "Loading…" : preview ? "Re-preview" : "Preview"}
          </Button>
        </div>
      )}

      <ErrorBanner message={error} />

      {/* Preview results */}
      {preview && (
        <div>
          {/* ── Definition limit banner ── */}
          {definitionLimitReached && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 14px", marginBottom: 12,
              background: "#b4500810", border: "1px solid #b4500840",
              borderRadius: 8, fontSize: 13,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1.4 }}>⚠</span>
              <div>
                <span style={{ fontWeight: 700, color: "#b45008" }}>
                  Field definition limit reached ({definitionLimit} max)
                </span>
                <span style={{ color: "#92400e", marginLeft: 6 }}>
                  {limitErrorCount} row{limitErrorCount !== 1 ? "s were" : " was"} skipped because new field definitions could not be created.
                  {definitionSlotsRemaining > 0
                    ? ` ${definitionSlotsRemaining} slot${definitionSlotsRemaining !== 1 ? "s" : ""} remaining.`
                    : " No slots remaining — remove an existing definition to free up space."}
                </span>
              </div>
            </div>
          )}
          {/* ── Status + issue pills ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>

            {/* Status filter pills */}
            {(["New", "Update", "Skip"]).map(status => {
              const active = visibleStatuses.includes(status);
              const count  = statusCounts[status];
              const color  = STATUS_COLOR[status];
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  title={active ? `Hide ${status} rows` : `Show ${status} rows`}
                  style={{
                    background:   active ? color + "18" : "var(--fs-th-bg, #f3f4f6)",
                    color:        active ? color        : "var(--fs-text-dim)",
                    border:       `1px solid ${active ? color + "40" : "var(--fs-border)"}`,
                    borderRadius: 20, padding: "2px 12px",
                    fontSize: 12, fontWeight: 700,
                    cursor: "pointer",
                    opacity: count === 0 ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {count} {status}
                </button>
              );
            })}

            {/* Informational issue badges */}
            {inactiveCount > 0 && (
              <span style={pill(BADGE_STYLES.inactive)}>{inactiveCount} Inactive Contact{inactiveCount !== 1 ? "s" : ""}</span>
            )}
            {archivedCount > 0 && (
              <span style={pill(BADGE_STYLES.archived)}>{archivedCount} Archived Contact{archivedCount !== 1 ? "s" : ""}</span>
            )}
            {inactiveFieldCount > 0 && (
              <span style={pill(BADGE_STYLES.inactiveField)}>{inactiveFieldCount} Inactive Field{inactiveFieldCount !== 1 ? "s" : ""}</span>
            )}
            {typeErrorCount > 0 && (
              <span style={pill(BADGE_STYLES.typeError)}>{typeErrorCount} Type Mismatch{typeErrorCount !== 1 ? "es" : ""}</span>
            )}
            {duplicateCount > 0 && (
              <span style={pill(BADGE_STYLES.duplicate)}>{duplicateCount} Duplicate{duplicateCount !== 1 ? "s" : ""} in CSV</span>
            )}
            {limitErrorCount > 0 && (
              <span style={pill(BADGE_STYLES.limitError)}>{limitErrorCount} Definition Limit Exceeded</span>
            )}

            {/* No-op toggle */}
            {noOpCount > 0 && visibleStatuses.includes("Skip") && (
              <button
                onClick={() => setShowNoOp(o => !o)}
                style={{
                  marginLeft: 4, fontSize: 11, fontWeight: 600,
                  color: "var(--fs-text-dim)", background: "none",
                  border: "1px solid var(--fs-border)", borderRadius: 4,
                  padding: "2px 8px", cursor: "pointer",
                }}
              >
                {showNoOp ? "▲ Hide" : "▼ Show"} {noOpCount} unchanged
              </button>
            )}

            {/* Expand hint */}
            {visibleRows.some(r => r.changes?.length > 0 || r.warnings?.length > 0) && (
              <span style={{ color: "var(--fs-text-dim)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ border: "1px solid var(--fs-border)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 600 }}>▼ show</span>
                rows to see field changes or warnings
              </span>
            )}
          </div>

          {/* Row table */}
          {visibleRows.length > 0 ? (
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--fs-border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--fs-th-bg, #f3f4f6)" }}>
                    {["Row", "Name", "Email", "Status", "Details"].map(h => (
                      <th key={h} style={{
                        padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11,
                        textTransform: "uppercase", letterSpacing: "0.5px",
                        color: "var(--fs-text-dim)", whiteSpace: "nowrap",
                        borderBottom: "1px solid var(--fs-border)",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, idx) => (
                    <ExpandableRow key={row.rowNumber} row={row} idx={idx} total={visibleRows.length} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--fs-text-dim)", fontSize: 13 }}>
              {visibleStatuses.length === 0
                ? "No status filters selected."
                : "All contacts are already up to date."}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
