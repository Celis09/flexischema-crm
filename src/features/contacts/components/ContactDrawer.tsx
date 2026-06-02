// @ts-nocheck
/**
 * features/contacts/components/ContactDrawer.tsx
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { parseContactErrors, getInputProps } from "@/lib/index";
import { StatusBadge, CloseButton } from "@/components/Primitives";

// ─── Helper: merge contact with definitions ───────────────────────────────────
function mergeContactWithDefinitions(contact, definitions) {
  const base = structuredClone(contact);
  const existingIds = new Set((base.extraFields ?? []).map(ef => ef.extraFieldDefinitionId));

  base.extraFields = [
    ...(base.extraFields ?? []),
    ...(definitions ?? [])
      .filter(d => d.isActive && !existingIds.has(d.extraFieldDefinitionId))
      .map(d => ({
        extraFieldDefinitionId: d.extraFieldDefinitionId,
        fieldName:  d.fieldName,
        fieldValue: "",
      })),
  ];

  return base;
}

function SectionLabel({ children, style, action }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, letterSpacing: "1px",
      textTransform: "uppercase", color: "var(--fs-accent)",
      marginBottom: 12, display: "flex", alignItems: "center", gap: 10, ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {children}
      </div>
      <div style={{ flex: 1, height: 1, background: "var(--fs-border)" }} />
      {action && (
        <div style={{ flexShrink: 0 }}>
          {action}
        </div>
      )}
    </div>
  );
}

// ─── DrawerField ──────────────────────────────────────────────────────────────
function DrawerField({
  label, value, fieldType, options,
  isEditing, showToggle, onToggle, onChange, onBlur,
  error, touched,
  dragHandleProps,
}) {
  const inputProps = getInputProps(fieldType);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  // Auto-focus and auto-select input text when editing is engaged
  const inputRef = useRef(null);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (fieldType !== "Option" && typeof inputRef.current.select === "function") {
        inputRef.current.select();
      }
    }
  }, [isEditing, fieldType]);

  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [value]);

  const displayed =
    fieldType === "url"   ? <a href={value} target="_blank" rel="noreferrer" style={{ color: "var(--fs-accent)" }}>{value || "—"}</a> :
    fieldType === "email" ? <a href={`mailto:${value}`} style={{ color: "var(--fs-accent)" }}>{value || "—"}</a> :
    null;

  const showError = !!error && touched;

  const sharedInputStyle = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", borderRadius: 8, fontSize: 13,
    fontFamily: "inherit", outline: "none",
    border: showError
      ? "1px solid var(--fs-error-text)"
      : "1px solid var(--fs-accent)",
    background: "var(--fs-accent-dim)",
    color: "var(--fs-text)",
    boxShadow: showError
      ? "0 0 0 3px var(--fs-error-glow, rgba(220,53,69,0.15))"
      : "0 0 0 3px var(--fs-accent-glow)",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  return (
    <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
      {/* Drag handle */}
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          style={{
            marginTop: 22, fontSize: 14, color: "var(--fs-text-dim)",
            cursor: "grab", userSelect: "none", flexShrink: 0, opacity: 0.5,
            lineHeight: 1,
          }}
          title="Drag to reorder"
        >
          ⠿
        </span>
      )}

      <div style={{ flex: 1 }}>
        {/* Label row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.8px",
            textTransform: "uppercase", color: "var(--fs-text-dim)",
          }}>
            {label}
          </span>

          {showToggle && (
            <button
              type="button"
              onClick={onToggle}
              style={{
                background: "none", border: "none", padding: "0 2px",
                fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                textTransform: "uppercase", cursor: "pointer",
                color: isEditing ? "var(--fs-error-text)" : "var(--fs-accent)",
              }}
            >
              {isEditing ? "Lock" : "Edit"}
            </button>
          )}
        </div>

        {/* Value / Input */}
        {isEditing ? (
          fieldType === "Option" ? (
            <select
              ref={inputRef}
              value={value ?? ""}
              onChange={e => onChange(e.target.value)}
              onBlur={onBlur}
              style={{ ...sharedInputStyle, cursor: "pointer" }}
            >
              <option value="" style={{ background: "var(--fs-surface-card)", color: "var(--fs-text-dim)" }}>
                Select {label}…
              </option>
              {(options ?? []).map(opt => (
                <option key={opt} value={opt} style={{ background: "var(--fs-surface-card)", color: "var(--fs-text)" }}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef}
              type={inputProps.type}
              placeholder={inputProps.placeholder}
              value={value ?? ""}
              onChange={e => onChange(e.target.value)}
              onBlur={onBlur}
              style={sharedInputStyle}
            />
          )
        ) : (
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 20 }}
          >
            <div style={{ fontSize: 13, color: "var(--fs-text)", flex: 1 }}>
              {displayed ?? (value || "—")}
            </div>

            {value && (
              <button
                type="button"
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy to clipboard"}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "2px 5px", borderRadius: 4,
                  color: copied ? "var(--fs-accent)" : "var(--fs-text-dim)",
                  opacity: hovered || copied ? 1 : 0,
                  transition: "opacity 0.15s, color 0.15s",
                  flexShrink: 0, lineHeight: 1,
                }}
              >
                <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} style={{ fontSize: 12 }} />
              </button>
            )}
          </div>
        )}

        {isEditing && inputProps.hint && !showError && (
          <div style={{
            marginTop: 4, fontSize: 11, color: "var(--fs-text-dim)", opacity: 0.75,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <i className="fa-solid fa-circle-info" style={{ fontSize: 10 }} aria-hidden="true" />
            {inputProps.hint}
          </div>
        )}

        {showError && (
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--fs-error-text)", display: "flex", alignItems: "center", gap: 4 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10 }} aria-hidden="true" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Client-side validation ──────────────────────────────────────────────────
function validateField(fieldType, value) {
  if (!value || value.trim() === "") return "";
  switch (fieldType) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Invalid email address";
    case "url":
      try { new URL(value); return ""; } catch { return "Invalid URL"; }
    case "date":
      return isNaN(Date.parse(value)) ? "Invalid date" : "";
    default:
      return "";
  }
}

// ─── ContactDrawer ────────────────────────────────────────────────────────────
const CORE_FIELDS = [
  { key: "name",  label: "Name",  fieldType: "text"  },
  { key: "email", label: "Email", fieldType: "email" },
];

export default function ContactDrawer({
  open,
  contact,
  definitions,
  onClose,
  canEdit,
  isAdmin = false,
  canReorder = false,
  onSave,
  drawerColumnOrder = [],
  hiddenColumns = new Set(),
  onDrawerReorder,
  onDrawerReset,
}) {
  const [local,         setLocal]         = useState(null);
  const [editingFields, setEditingFields] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [clientErrors,  setClientErrors]  = useState({});
  const [isDirty,       setIsDirty]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [serverErrors,  setServerErrors]  = useState({});
  const [dragOver,      setDragOver]      = useState(null);

  // Store drag context safely in a component-scoped instance ref
  const dragRef = useRef(null);

  const contactKey = contact
    ? (contact.id ?? contact.sequence ?? JSON.stringify(contact))
    : null;

  // Determine if any fields are currently unlocked for editing
  const isEditingAny = Object.values(editingFields).some(Boolean);

  useEffect(() => {
    if (!contact) return;
    setLocal(mergeContactWithDefinitions(contact, definitions));
    setEditingFields({});
    setTouchedFields({});
    setClientErrors({});
    setIsDirty(false);
    setServerErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactKey, definitions]);

  const parsedServerErrors = useMemo(
    () => parseContactErrors(serverErrors, local?.extraFields ?? []),
    [serverErrors, local?.extraFields]
  );

  const fieldErrors = useMemo(() => ({
    ...clientErrors,
    ...parsedServerErrors,
  }), [clientErrors, parsedServerErrors]);

  useEffect(() => {
    const serverKeys = Object.keys(parsedServerErrors);
    if (serverKeys.length === 0) return;
    setTouchedFields(prev => {
      const next = { ...prev };
      serverKeys.forEach(k => { next[k] = true; });
      return next;
    });
  }, [parsedServerErrors]);

  const patch = useCallback((key, value) => {
    setLocal(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const patchExtra = useCallback((defId, value) => {
    setLocal(prev => ({
      ...prev,
      extraFields: (prev.extraFields ?? []).map(ef =>
        ef.extraFieldDefinitionId === defId ? { ...ef, fieldValue: value } : ef
      ),
    }));
    setIsDirty(true);
  }, []);

  const toggleField = useCallback((key) => {
    setEditingFields(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleBlur = useCallback((key, fieldType, value) => {
    setTouchedFields(prev => ({ ...prev, [key]: true }));
    const err = validateField(fieldType, value);
    setClientErrors(prev => ({ ...prev, [key]: err }));
  }, []);

  const orderedExtraFields = useMemo(() => {
    if (!local?.extraFields) return [];

    const rankOf = (ef) => {
      const key = `extra-${ef.extraFieldDefinitionId}`;
      const idx = drawerColumnOrder.indexOf(key);
      return idx === -1 ? Infinity : idx;
    };

    return [...local.extraFields]
      .filter(ef => !hiddenColumns.has(`extra-${ef.extraFieldDefinitionId}`))
      .sort((a, b) => rankOf(a) - rankOf(b));
  }, [local?.extraFields, drawerColumnOrder, hiddenColumns]);

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, index) => {
    dragRef.current = { fromIndex: index };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback((e, toIndex) => {
    e.preventDefault();
    if (!dragRef.current) return;
    e.dataTransfer.dropEffect = "move";
    setDragOver(prev => prev === toIndex ? prev : toIndex);
  }, []);

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragRef.current) return;
    const { fromIndex } = dragRef.current;
    dragRef.current = null;
    if (fromIndex === toIndex) return;

    const reordered = [...orderedExtraFields];
    const [moved]   = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const visibleIds = reordered.map(ef => `extra-${ef.extraFieldDefinitionId}`);
    const hiddenIds  = (local?.extraFields ?? [])
      .filter(ef => hiddenColumns.has(`extra-${ef.extraFieldDefinitionId}`))
      .map(ef => `extra-${ef.extraFieldDefinitionId}`);

    onDrawerReorder?.([...visibleIds, ...hiddenIds]);

    setLocal(prev => {
      const reorderedIds = reordered.map(ef => ef.extraFieldDefinitionId);
      const hiddenFields = (prev.extraFields ?? []).filter(
        ef => hiddenColumns.has(`extra-${ef.extraFieldDefinitionId}`)
      );
      return {
        ...prev,
        extraFields: [
          ...reorderedIds.map(id =>
            (prev.extraFields ?? []).find(ef => ef.extraFieldDefinitionId === id)
          ).filter(Boolean),
          ...hiddenFields,
        ],
      };
    });
  }, [orderedExtraFields, hiddenColumns, local?.extraFields, onDrawerReorder]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setDragOver(null);
  }, []);

  // ── Save / Discard ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const newClientErrors = {};

    CORE_FIELDS.forEach(({ key, fieldType }) => {
      const err = validateField(fieldType, local?.[key]);
      if (err) newClientErrors[key] = err;
    });

    (local?.extraFields ?? []).forEach(ef => {
      const def = (definitions ?? []).find(d => d.extraFieldDefinitionId === ef.extraFieldDefinitionId);
      if (def) {
        const fieldKey = `extra-${ef.extraFieldDefinitionId}`;
        const err = validateField(def.fieldType, ef.fieldValue);
        if (err) newClientErrors[fieldKey] = err;
      }
    });

    if (Object.keys(newClientErrors).length > 0) {
      setClientErrors(newClientErrors);
      setTouchedFields(prev => {
        const next = { ...prev };
        Object.keys(newClientErrors).forEach(k => { next[k] = true; });
        return next;
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(local);
      setEditingFields({});
      setTouchedFields({});
      setClientErrors({});
      setIsDirty(false);
      setServerErrors({});
    } catch (err) {
      setServerErrors(err?.errors ?? { general: err?.message ?? "Save failed." });
    } finally {
      setSaving(false);
    }
  }, [local, onSave, definitions]);

  const handleDiscard = useCallback(() => {
    setLocal(mergeContactWithDefinitions(contact, definitions));
    setEditingFields({});
    setTouchedFields({});
    setClientErrors({});
    setIsDirty(false);
    setServerErrors({});
  }, [contact, definitions]);

  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
    onClose();
  }, [isDirty, onClose]);

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1050,
          background: open ? "rgba(0,0,0,0.35)" : "transparent",
          backdropFilter: open ? "blur(2px)" : "none",
          transition: "background 0.25s, backdrop-filter 0.25s",
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* ── Panel ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 380, zIndex: 1051,
          background: "var(--fs-surface-card)",
          borderLeft: "1px solid var(--fs-border-strong)",
          boxShadow: "var(--fs-shadow-modal)",
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
        }}
      >
        {contact && local ? (
          <>
            {/* ── Header ── */}
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--fs-border)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--fs-text)", display: "flex", alignItems: "center", gap: 8 }}>
                    {contact.name}
                  </h3>
                  <p style={{ margin: "3px 0 8px", fontSize: 12, color: "var(--fs-text-dim)" }}>
                    {contact.id ? `#${contact.id} · ` : ""}
                    {contact.createdDate ? new Date(contact.createdDate).toLocaleDateString() : ""}
                  </p>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge status={isAdmin ? contact.status : undefined} />
                    
                    {/* ── Dynamic Status Indicator ── */}
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "opacity 0.2s ease, background 0.2s ease, color 0.2s ease",
                      ...(
                        saving ? { background: "var(--fs-accent-dim)", color: "var(--fs-accent)", opacity: 1 } :
                        isDirty ? { background: "var(--fs-warning-bg, #FFFBEB)", color: "var(--fs-warning-text, #B45309)", opacity: 1 } :
                        isEditingAny ? { background: "var(--fs-surface-hover, #F3F4F6)", color: "var(--fs-text-dim, #6B7280)", opacity: 1 } :
                        { opacity: 0, pointerEvents: "none" }
                      )
                    }}>
                      {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11 }} /> Saving...</> :
                       isDirty ? <><i className="fa-solid fa-asterisk" style={{ fontSize: 9 }} /> Unsaved</> :
                       isEditingAny ? <><i className="fa-solid fa-pen" style={{ fontSize: 9 }} /> Editing</> :
                       null}
                    </div>
                  </div>
                </div>
                <CloseButton onClick={handleClose} />
              </div>

              {fieldErrors.general && (
                <div style={{
                  marginTop: 12, padding: "7px 12px", borderRadius: 8,
                  background: "var(--fs-warning-bg)",
                  border: "1px solid var(--fs-warning-border)",
                  color: "var(--fs-warning-text)", fontSize: 12,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 11 }} aria-hidden="true" />
                  {fieldErrors.general}
                </div>
              )}
            </div>

            {/* ── Body ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

              <SectionLabel>Contact Info</SectionLabel>
              {CORE_FIELDS.map(({ key, label, fieldType }) => (
                <DrawerField
                  key={key}
                  label={label}
                  fieldType={fieldType}
                  value={local[key]}
                  isEditing={!!editingFields[key]}
                  showToggle={canEdit}
                  onToggle={() => toggleField(key)}
                  onChange={val => patch(key, val)}
                  onBlur={() => handleBlur(key, fieldType, local[key])}
                  error={fieldErrors[key]}
                  touched={!!touchedFields[key]}
                />
              ))}

              {orderedExtraFields.length > 0 && (
                <>
                  <SectionLabel 
                    style={{ marginTop: 8 }}
                    action={
                      canReorder && onDrawerReset && drawerColumnOrder.length > 0 && (
                        <button
                          type="button"
                          onClick={onDrawerReset}
                          style={{
                            background: "var(--fs-surface-hover)", border: "1px solid var(--fs-border)", 
                            padding: "3px 8px", borderRadius: 4,
                            fontSize: 9, fontWeight: 700, color: "var(--fs-text)",
                            textTransform: "uppercase", cursor: "pointer", letterSpacing: 0,
                            transition: "background 0.2s"
                          }}
                          onMouseEnter={e => e.target.style.background = "var(--fs-btn-bg-hov)"}
                          onMouseLeave={e => e.target.style.background = "var(--fs-surface-hover)"}
                        >
                          Reset Order
                        </button>
                      )
                    }
                  >
                    <span>Extra Fields</span>
                    {canReorder && (
                      <span style={{
                        fontSize: 9, fontWeight: 600, color: "var(--fs-text-dim)",
                        opacity: 0.7, textTransform: "none", letterSpacing: 0,
                      }}>
                        drag ⠿ to reorder
                      </span>
                    )}
                  </SectionLabel>

                  {orderedExtraFields.map((ef, index) => {
                    const def       = (definitions ?? []).find(d => d.extraFieldDefinitionId === ef.extraFieldDefinitionId);
                    const fieldType = def?.fieldType ?? "text";
                    const fieldKey  = `extra-${ef.extraFieldDefinitionId}`;
                    const isOver    = dragOver === index;

                    return (
                      <div
                        key={ef.extraFieldDefinitionId}
                        draggable={canReorder}
                        onDragStart={canReorder ? e => handleDragStart(e, index) : undefined}
                        onDragOver={canReorder  ? e => handleDragOver(e, index)  : undefined}
                        onDrop={canReorder      ? e => handleDrop(e, index)      : undefined}
                        onDragEnd={canReorder   ? handleDragEnd                  : undefined}
                        style={{
                          borderRadius: 8,
                          outline: isOver ? "2px solid var(--fs-accent)" : "2px solid transparent",
                          outlineOffset: 2,
                          background: isOver ? "var(--fs-accent-dim)" : "transparent",
                          transition: "outline-color 0.15s, background 0.15s",
                        }}
                      >
                        <DrawerField
                          label={ef.fieldName}
                          fieldType={fieldType}
                          options={def?.options}
                          value={ef.fieldValue}
                          isEditing={!!editingFields[fieldKey]}
                          showToggle={canEdit}
                          onToggle={() => toggleField(fieldKey)}
                          onChange={val => patchExtra(ef.extraFieldDefinitionId, val)}
                          onBlur={() => handleBlur(fieldKey, fieldType, ef.fieldValue)}
                          error={fieldErrors[fieldKey]}
                          touched={!!touchedFields[fieldKey]}
                          dragHandleProps={canReorder ? {
                            draggable: false,
                            onMouseDown: e => e.stopPropagation(),
                          } : undefined}
                        />
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* ── Footer — only shown when dirty ── */}
            {canEdit && isDirty && (
              <div style={{
                padding: "14px 24px",
                borderTop: "1px solid var(--fs-border)",
                background: "var(--fs-surface-header)",
                display: "flex", justifyContent: "flex-end", gap: 8,
                flexShrink: 0,
              }}>
                <button
                  type="button"
                  onClick={handleDiscard}
                  style={{
                    background: "var(--fs-surface-card)",
                    border: "1px solid var(--fs-border)",
                    color: "var(--fs-text)", padding: "9px 20px", borderRadius: 10,
                    cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                  }}
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: "var(--fs-accent)", border: "none", color: "#fff",
                    padding: "9px 20px", borderRadius: 10,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                    opacity: saving ? 0.7 : 1,
                    boxShadow: "0 4px 15px var(--fs-accent-glow)",
                  }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1 }} />
        )}
      </div>
    </>,
    document.body
  );
}

