// @ts-nocheck
/**
 * features/contacts/components/ContactModal.tsx
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { parseContactErrors, getInputProps } from "@/lib/index";
import { CloseButton } from "@/components/Primitives";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELDS_PER_PAGE = 5;

const LABEL_STYLE = {
  display: "block", marginBottom: 6,
  fontSize: 11, fontWeight: 700,
  letterSpacing: "0.8px", textTransform: "uppercase",
  color: "var(--fs-text-dim)",
};

function inputStyle(hasError) {
  return {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px", borderRadius: 9, fontSize: 13,
    fontFamily: "inherit", outline: "none",
    background: "var(--fs-surface-header)",
    color: "var(--fs-text)",
    border: hasError ? "1px solid var(--fs-error-text)" : "1px solid var(--fs-border)",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

function ProgressBar({ total, current, pageErrorCounts, onDotClick }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => {
        const hasError  = pageErrorCounts[i] > 0;
        const isCurrent = i === current;
        const isPast    = i < current;
        return (
          <div
            key={i}
            title={hasError
              ? `Page ${i + 1}: ${pageErrorCounts[i]} error${pageErrorCounts[i] > 1 ? "s" : ""}`
              : `Page ${i + 1}`}
            onClick={() => onDotClick(i)}
            style={{
              position: "relative",
              width: 28, height: 8, borderRadius: 4,
              cursor: "pointer",
              transition: "background 0.2s, transform 0.15s",
              transform: isCurrent ? "scaleY(1.4)" : "scaleY(1)",
              background: hasError
                ? "var(--fs-error-text)"
                : isCurrent  ? "var(--fs-accent)"
                : isPast     ? "var(--fs-accent-dim)"
                             : "var(--fs-border)",
            }}
          >
            {hasError && (
              <span style={{
                position: "absolute", top: -7, right: -4,
                background: "var(--fs-error-text)", color: "#fff",
                fontSize: 9, fontWeight: 700, lineHeight: 1,
                padding: "1px 3px", borderRadius: 3,
                minWidth: 12, textAlign: "center", pointerEvents: "none",
              }}>
                {pageErrorCounts[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── CrossPageErrorBanner ─────────────────────────────────────────────────────

function CrossPageErrorBanner({ pageErrorCounts, currentPage, onGoToPage }) {
  const others = pageErrorCounts
    .map((count, i) => ({ page: i, count }))
    .filter(({ page, count }) => count > 0 && page !== currentPage);

  if (others.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
      padding: "7px 12px", marginBottom: 12,
      background: "var(--fs-warning-bg)", border: "1px solid var(--fs-warning-border)",
      borderRadius: 8, fontSize: 12, color: "var(--fs-warning-text)",
    }}>
      <span>⚠</span>
      <span>Errors on:</span>
      {others.map(({ page, count }) => (
        <button
          key={page}
          type="button"
          onClick={() => onGoToPage(page)}
          style={{
            background: "none", border: "1px solid var(--fs-warning-border)",
            borderRadius: 4, padding: "1px 8px",
            fontSize: 11, fontWeight: 700,
            color: "var(--fs-warning-text)", cursor: "pointer",
          }}
        >
          Page {page + 1} ({count})
        </button>
      ))}
    </div>
  );
}

// ─── ExtraFieldRow ────────────────────────────────────────────────────────────

function ExtraFieldRow({ ef, def, error, onChange, autoFocusRef }) {
  const inputRef   = useRef(null);
  const inputProps = getInputProps(def?.fieldType); // handles PascalCase via .toLowerCase()

  useEffect(() => {
    if (autoFocusRef) autoFocusRef.current = inputRef.current;
  }, [autoFocusRef]);

  const sharedStyle = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", borderRadius: 8, fontSize: 13,
    fontFamily: "inherit", outline: "none",
    transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
    border: error
      ? "1px solid var(--fs-error-text)"
      : "1px solid var(--fs-accent)",
    background: "var(--fs-accent-dim)",
    color: "var(--fs-text)",
    boxShadow: "0 0 0 3px var(--fs-accent-glow)",
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <label htmlFor={`ef-${ef.extraFieldDefinitionId}`} style={LABEL_STYLE}>
          {ef.fieldName}
        </label>
      </div>

      {/* ── Option → dropdown; everything else → typed input ── */}
      {def?.fieldType === "Option" ? (
        <select
          ref={inputRef}
          id={`ef-${ef.extraFieldDefinitionId}`}
          value={ef.fieldValue ?? ""}
          onChange={e => onChange(ef.extraFieldDefinitionId, e.target.value)}
          style={{ ...sharedStyle, cursor: "pointer" }}
        >
          <option value="" style={{ background: "var(--fs-surface-card)", color: "var(--fs-text-dim)" }}>Select {ef.fieldName}…</option>
          {(def.options ?? []).map(opt => (
            <option key={opt} value={opt} style={{ background: "var(--fs-surface-card)", color: "var(--fs-text)" }}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef}
          id={`ef-${ef.extraFieldDefinitionId}`}
          name={`extra-${ef.extraFieldDefinitionId}`}
          type={inputProps.type}
          placeholder={inputProps.placeholder}
          value={ef.fieldValue ?? ""}
          onChange={e => onChange(ef.extraFieldDefinitionId, e.target.value)}
          style={{ ...sharedStyle, cursor: "text" }}
        />
      )}

      {/* ── Field type hint (shown only when there is no error) ── */}
      {inputProps.hint && !error && (
        <div style={{
          marginTop: 4, fontSize: 11,
          color: "var(--fs-text-dim)", opacity: 0.75,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          ℹ️ {inputProps.hint}
        </div>
      )}

      {/* ── Validation error ── */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 11, color: "var(--fs-error-text)" }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPageErrorCounts(fieldErrors, extraFields, totalPages) {
  const counts = Array(totalPages).fill(0);
  if (fieldErrors.name)  counts[0]++;
  if (fieldErrors.email) counts[0]++;
  extraFields.forEach((ef, idx) => {
    const key = `extra-${ef.extraFieldDefinitionId}`;
    if (fieldErrors[key]) {
      const p = Math.floor(idx / FIELDS_PER_PAGE);
      if (p < totalPages) counts[p]++;
    }
  });
  return counts;
}

// ─── ContactModal ─────────────────────────────────────────────────────────────

export default function ContactModal({
  open, editing, contact, definitions,
  onClose, onChange, onSave, errors: serverErrors = {},
}) {
  const extraFields = contact.extraFields ?? [];
  const totalPages  = Math.max(1, Math.ceil(extraFields.length / FIELDS_PER_PAGE));

  const [page,    setPage]    = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  const snapshotRef   = useRef(null);
  const firstFieldRef = useRef(null);

  const isFirstPage = page === 0;
  const isLastPage  = page === totalPages - 1;
  const hasExtras   = extraFields.length > 0;
  const isMultiPage = totalPages > 1;
  const pageFields  = extraFields.slice(page * FIELDS_PER_PAGE, (page + 1) * FIELDS_PER_PAGE);

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setIsDirty(false);
    setLocalErrors({});
    snapshotRef.current = JSON.stringify(contact);
  }, [open, contact?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((updated) => {
    onChange(updated);
    setIsDirty(JSON.stringify(updated) !== snapshotRef.current);
  }, [onChange]);

  const handleField = (field, value) => {
    setLocalErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    handleChange({ ...contact, [field]: value });
  };
  const handleExtra = (defId, value) => {
    setLocalErrors(prev => { const next = { ...prev }; delete next[`extra-${defId}`]; return next; });
    handleChange({
      ...contact,
      extraFields: contact.extraFields.map(ef =>
        ef.extraFieldDefinitionId === defId ? { ...ef, fieldValue: value } : ef
      ),
    });
  };

  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
    onClose();
  }, [isDirty, onClose]);

  const navigateTo = useCallback((next) => {
    setPage(next);
    setTimeout(() => firstFieldRef.current?.focus(), 50);
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    if (!contact.name?.trim()) errs.name = "Name is required.";
    if (contact.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      errs.email = "Invalid email format.";
    }

    extraFields.forEach((ef) => {
      const def = definitions.find(d => d.extraFieldDefinitionId === ef.extraFieldDefinitionId);
      if (!def) return;
      const key = `extra-${ef.extraFieldDefinitionId}`;
      const val = ef.fieldValue?.trim();

      if (def.isRequired && !val) {
        errs[key] = "This field is required.";
      } else if (val && def.fieldType === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errs[key] = "Invalid email format.";
      } else if (val && def.fieldType === "Url") {
        try { new URL(val); } catch { errs[key] = "Invalid URL format (include http:// or https://)."; }
      }
    });
    return errs;
  }, [contact, extraFields, definitions]);

  const handleSaveClick = useCallback(() => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setLocalErrors(errs);
      
      const pageErrCounts = buildPageErrorCounts(errs, extraFields, totalPages);
      const firstErrorPage = pageErrCounts.findIndex(c => c > 0);
      if (firstErrorPage !== -1 && firstErrorPage !== page) {
        navigateTo(firstErrorPage);
      }
      return;
    }
    setLocalErrors({});
    onSave(contact);
  }, [validate, onSave, contact, extraFields, totalPages, page, navigateTo]);

  const parsedServerErrors = parseContactErrors(serverErrors, extraFields);
  const fieldErrors = { ...parsedServerErrors, ...localErrors };
  
  const pageErrorCounts = useMemo(
    () => buildPageErrorCounts(fieldErrors, extraFields, totalPages),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(fieldErrors), extraFields.length, totalPages]
  );
  const totalErrorCount = pageErrorCounts.reduce((sum, n) => sum + n, 0);

  if (!open) return null;

  return createPortal(
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1200, backdropFilter: "blur(4px)",
    }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "90%", maxWidth: 500,
          background: "var(--fs-surface-card)",
          border: "1px solid var(--fs-border-strong)",
          borderRadius: 16,
          boxShadow: "var(--fs-shadow-modal)",
          display: "flex", flexDirection: "column",
          maxHeight: "90vh", overflow: "hidden",
          color: "var(--fs-text)", fontFamily: "inherit",
        }}
      >

        {/* ── Header ── */}
        <div style={{ padding: "20px 24px 18px", borderBottom: "1px solid var(--fs-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px", color: "var(--fs-text)" }}>
                {editing ? "Edit Contact" : "Add Contact"}
              </h3>
              {hasExtras && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--fs-text-dim)" }}>
                  {extraFields.length} extra field{extraFields.length !== 1 ? "s" : ""}
                  {isMultiPage ? ` — page ${page + 1} of ${totalPages}` : ""}
                  {totalErrorCount > 0 && (
                    <span style={{ marginLeft: 8, fontWeight: 700, color: "var(--fs-error-text)" }}>
                      · {totalErrorCount} error{totalErrorCount > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isMultiPage && (
                <ProgressBar
                  total={totalPages} current={page}
                  pageErrorCounts={pageErrorCounts} onDotClick={navigateTo}
                />
              )}
              <CloseButton onClick={handleClose} />
            </div>
          </div>

          {fieldErrors.general && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 12px", marginBottom: 12, borderRadius: 8,
              background: "var(--fs-warning-bg)", border: "1px solid var(--fs-warning-border)",
              color: "var(--fs-warning-text)", fontSize: 12,
            }}>
              ⚠ {fieldErrors.general}
            </div>
          )}

          <CrossPageErrorBanner
            pageErrorCounts={pageErrorCounts}
            currentPage={page}
            onGoToPage={navigateTo}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { id: "cm-name",  field: "name",  type: "text",  label: "Name",  hint: "Full name of the contact"  },
              { id: "cm-email", field: "email", type: "email", label: "Email", hint: "e.g. name@example.com" },
            ].map(({ id, field, type, label, hint }) => (
              <div key={field}>
                <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
                <input
                  id={id}
                  type={type}
                  name={field}
                  value={contact[field] ?? ""}
                  onChange={e => handleField(field, e.target.value)}
                  style={inputStyle(!!fieldErrors[field])}
                  onFocus={e => { e.target.style.borderColor = "var(--fs-accent)"; e.target.style.boxShadow = "0 0 0 3px var(--fs-accent-glow)"; }}
                  onBlur={e  => { e.target.style.borderColor = fieldErrors[field] ? "var(--fs-error-text)" : "var(--fs-border)"; e.target.style.boxShadow = "none"; }}
                />
                {hint && !fieldErrors[field] && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "var(--fs-text-dim)", opacity: 0.75, display: "flex", alignItems: "center", gap: 4 }}>
                    ℹ️ {hint}
                  </div>
                )}
                {fieldErrors[field] && (
                  <div style={{ marginTop: 5, fontSize: 11, color: "var(--fs-error-text)" }}>⚠ {fieldErrors[field]}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable Extra Fields Body ── */}
        {hasExtras && (
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 24px 16px" }}>
            <div style={{
              position: "sticky", top: 0, zIndex: 1,
              padding: "12px 0 6px", background: "var(--fs-surface-card)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "var(--fs-accent)" }}>
                Extra Fields
              </span>
              {isMultiPage && (
                <span style={{ fontSize: 11, color: "var(--fs-text-dim)" }}>
                  {page * FIELDS_PER_PAGE + 1}–{Math.min((page + 1) * FIELDS_PER_PAGE, extraFields.length)} of {extraFields.length}
                </span>
              )}
              <div style={{ flex: 1, height: 1, background: "var(--fs-border)" }} />
            </div>

            {pageFields.map((ef, idx) => {
              const def = definitions.find(d => d.extraFieldDefinitionId === ef.extraFieldDefinitionId);
              return (
                <ExtraFieldRow
                  key={ef.extraFieldDefinitionId}
                  ef={ef}
                  def={def}
                  error={fieldErrors[`extra-${ef.extraFieldDefinitionId}`]}
                  onChange={handleExtra}
                  autoFocusRef={idx === 0 ? firstFieldRef : null}
                />
              );
            })}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--fs-border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
          background: "var(--fs-surface-header)",
          borderRadius: "0 0 16px 16px",
        }}>
          <button
            type="button"
            onClick={() => navigateTo(page - 1)}
            style={{
              visibility: (!hasExtras || !isMultiPage || isFirstPage) ? "hidden" : "visible",
              background: "none", border: "1px solid var(--fs-border)",
              color: "var(--fs-text-dim)", padding: "8px 16px", borderRadius: 9,
              cursor: "pointer", fontSize: 13, fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fs-accent)"; e.currentTarget.style.color = "var(--fs-accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--fs-border)"; e.currentTarget.style.color = "var(--fs-text-dim)"; }}
          >
            ← Previous
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "var(--fs-surface-card)", border: "1px solid var(--fs-border)",
                color: "var(--fs-text)", padding: "9px 20px", borderRadius: 10,
                cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--fs-accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--fs-border)"}
            >
              Cancel
            </button>

            {isMultiPage && !isLastPage ? (
              <button
                type="button"
                onClick={() => navigateTo(page + 1)}
                style={{
                  background: "var(--fs-accent)", border: "none", color: "#fff",
                  padding: "9px 20px", borderRadius: 10,
                  cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  boxShadow: "0 4px 15px var(--fs-accent-glow)", transition: "opacity 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Next Page →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveClick}
                style={{
                  background: "var(--fs-accent)", border: "none", color: "#fff",
                  padding: "9px 20px", borderRadius: 10,
                  cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  boxShadow: "0 4px 15px var(--fs-accent-glow)", transition: "opacity 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                {editing ? "Save All" : "Create"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

