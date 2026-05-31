// @ts-nocheck
/* eslint-disable react-refresh/only-export-components */
/**
 * modals/DefinitionModal.tsx
 *
 * Two-phase modal:
 * Phase 1 — Definition form  (fieldName, fieldType, isRequired, isActive)
 * Phase 2 — Options manager  (only shown when fieldType === "Option", after save)
 */

import { useState, useEffect, useRef } from "react";
import { ModalShell, FormField, Button, ErrorBanner, ToggleSwitch } from "@/components/Primitives";
import {
  getExtraFieldOptions,
  addExtraFieldOption,
  deleteExtraFieldOption,
} from "@/features/admin/api/ExtraFieldDefinitionsApi";

// ─── Constants ────────────────────────────────────────────────────────────────

export const FIELD_TYPE_OPTIONS = [
  { value: "Text",   label: "Text"              },
  { value: "Email",  label: "Email"             },
  { value: "Date",   label: "Date"              },
  { value: "Phone",  label: "Phone Number"      },
  { value: "Number", label: "Number"            },
  { value: "Url",    label: "URL"               },
  { value: "Option", label: "Option (Dropdown)" },
];

export const EMPTY_DEFINITION_FORM = {
  fieldName:  "",
  fieldType:  "",
  isRequired: false,
  isActive:   true,
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form) {
  const errors = {};
  if (!form.fieldName?.trim()) errors.fieldName = "Field name is required.";
  if (!form.fieldType)         errors.fieldType  = "Field type is required.";
  return errors;
}

// ─── OptionsManager (Phase 2) ─────────────────────────────────────────────────

function OptionsManager({ definitionId, onOptionsChange }) {
  const [options,    setOptions]    = useState([]);
  const [newValue,   setNewValue]   = useState("");
  const [adding,     setAdding]     = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const inputRef = useRef(null);

  // Fetch on mount
  useEffect(() => {
    fetchOptions();
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionId]);

  function showFeedback(msg, isError = false) {
    if (isError) { setError(msg); setSuccess(""); }
    else         { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  }

  async function fetchOptions() {
    try {
      const data = await getExtraFieldOptions(definitionId);
      const fetchedOptions = Array.isArray(data) ? data : [];
      setOptions(fetchedOptions);
      if (onOptionsChange) onOptionsChange(fetchedOptions.length);
    } catch {
      showFeedback("Couldn't load existing options.", true);
    }
  }

  async function handleAdd() {
    const trimmed = newValue.trim();
    if (!trimmed) { setError("Option value cannot be empty."); return; }

    const duplicate = options.some(
      o => o.optionValue.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) { setError(`"${trimmed}" already exists.`); return; }

    setAdding(true);
    setError("");
    try {
      await addExtraFieldOption(definitionId, trimmed);
      setNewValue("");
      await fetchOptions();
      showFeedback(`"${trimmed}" added.`);
      inputRef.current?.focus();
    } catch (err) {
      // 409 Conflict = duplicate on the server side
      showFeedback(
        err?.status === 409
          ? `"${trimmed}" already exists.`
          : (err?.message ?? "Failed to add option."),
        true
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(option) {
    if (deletingId !== null) return;
    setDeletingId(option.extraFieldOptionId);
    try {
      await deleteExtraFieldOption(definitionId, option.extraFieldOptionId);
      await fetchOptions();
      showFeedback(`"${option.optionValue}" removed.`);
    } catch (err) {
      showFeedback(err?.message ?? "Failed to delete option.", true);
    } finally {
      setDeletingId(null);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { 
      e.preventDefault(); 
      if (!newValue.trim()) return;
      handleAdd(); 
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      <p style={{ margin: 0, fontSize: 13, color: "var(--fs-text-dim)", lineHeight: 1.5 }}>
        Define the choices that will appear in the dropdown when a contact fills in this field.
        At least one option is recommended before activating this field.
      </p>

      {/* Feedback */}
      {error   && (
        <div className="fs-toast fs-toast--error" style={{ position: "static", marginBottom: 0 }}>
          <i className="fa-solid fa-circle-xmark" /> {error}
        </div>
      )}
      {success && (
        <div className="fs-toast fs-toast--success" style={{ position: "static", marginBottom: 0 }}>
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}

      {/* Add input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          ref={inputRef}
          className="fs-modal-input"
          style={{ flex: 1 }}
          placeholder="e.g. Referral, Website, Cold Call…"
          value={newValue}
          onChange={e => { setNewValue(e.target.value); setError(""); }}
          onKeyDown={handleKeyDown}
          maxLength={100}
          disabled={adding}
        />
        <button
          className="fs-btn fs-btn--primary"
          onClick={handleAdd}
          disabled={adding || !newValue.trim()}
          style={{ whiteSpace: "nowrap" }}
        >
          {adding
            ? <><i className="fa-solid fa-spinner fa-spin" /> Adding…</>
            : <><i className="fa-solid fa-plus" /> Add</>}
        </button>
      </div>

      {/* Options list */}
      {options.length === 0 ? (
        <div style={{
          padding:      "20px 0",
          textAlign:    "center",
          fontSize:     13,
          color:        "var(--fs-text-dim)",
          borderRadius: 8,
          border:       "1px dashed var(--fs-border)",
        }}>
          No options yet — add your first one above.
        </div>
      ) : (
        <ul style={{
          margin:        0,
          padding:       0,
          listStyle:     "none",
          display:       "flex",
          flexDirection: "column",
          gap:           6,
          maxHeight:     220,
          overflowY:     "auto",
        }}>
          {options.map((opt, idx) => (
            <li
              key={opt.extraFieldOptionId}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                padding:        "7px 10px",
                borderRadius:   6,
                background:     "var(--fs-row-alt, rgba(0,0,0,.03))",
                border:         "1px solid var(--fs-border)",
                fontSize:       13,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontFamily: "var(--fs-font-mono)",
                  fontSize:   10,
                  color:      "var(--fs-text-dim)",
                  minWidth:   18,
                  textAlign:  "right",
                }}>
                  {idx + 1}.
                </span>
                <span style={{ color: "var(--fs-text)" }}>{opt.optionValue}</span>
              </span>

              <button
                className="fs-btn"
                style={{
                  padding:     "2px 8px",
                  fontSize:    11,
                  color:       "var(--fs-error-text)",
                  borderColor: "var(--fs-error-border)",
                  background:  "var(--fs-error-bg)",
                  opacity:     deletingId === opt.extraFieldOptionId ? 0.5 : 1,
                }}
                disabled={deletingId !== null}
                onClick={() => handleDelete(opt)}
                title={`Remove "${opt.optionValue}"`}
              >
                {deletingId === opt.extraFieldOptionId
                  ? <i className="fa-solid fa-spinner fa-spin" />
                  : <i className="fa-solid fa-xmark" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p style={{ margin: 0, fontSize: 11, color: "var(--fs-text-dim)" }}>
        {options.length} option{options.length !== 1 ? "s" : ""} defined.
        Changes are saved immediately.
      </p>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function DefinitionModal({
  open,
  editing,
  form,
  onChange,
  onSave,
  onClose,
  errors: serverErrors = {},
}) {
  const [phase,       setPhase]       = useState("definition");
  const [localErrors, setLocalErrors] = useState({});
  const [savedId,     setSavedId]     = useState(null);
  const [optionsCount, setOptionsCount] = useState(0);

  // Reset phase whenever modal opens/closes
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setPhase("definition");
      setLocalErrors({});
      setSavedId(null);
    }
  }

  // Merge: local errors take precedence over server errors
  const errors = { ...serverErrors, ...localErrors };

  function handleChange(updated) {
    onChange(updated);
    const changedKey = Object.keys(updated).find(k => updated[k] !== form[k]);
    if (changedKey && localErrors[changedKey]) {
      setLocalErrors(prev => {
        const next = { ...prev };
        delete next[changedKey];
        return next;
      });
    }
  }

  async function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setLocalErrors(errs);
      return;
    }
    setLocalErrors({});

    await onSave(form, {
      onSuccess: (id) => {
        if (form.fieldType === "Option") {
          setSavedId(id);
          setPhase("options");
        }
      },
    });
  }

  function handleClose() {
    setLocalErrors({});
    setPhase("definition");
    setSavedId(null);
    onClose();
  }

  // ── Phase 1: Definition form ──────────────────────────────────────────────

  if (phase === "definition") {
    const footer = (
      <>
        <Button variant="cancel" onClick={handleClose}>Cancel</Button>

        {/* Direct jump to Phase 2 — only when editing an already-saved Option field */}
        {editing && form.fieldType === "Option" && form.extraFieldDefinitionId && (
          <Button
            variant="cancel"
            onClick={() => {
              setSavedId(form.extraFieldDefinitionId);
              setPhase("options");
            }}
          >
            Manage Options →
          </Button>
        )}

        <Button variant="primary" onClick={handleSubmit}>
          {editing
            ? "Save Changes"
            : (form.fieldType === "Option" ? "Create & Add Options →" : "Create")}
        </Button>
      </>
    );

    return (
      <ModalShell
        open={open}
        title={editing ? "Edit Field Definition" : "Add Field Definition"}
        onClose={handleClose}
        maxWidth={440}
        footer={footer}
      >
        <ErrorBanner message={errors.general} />

        {/* Field Name */}
        <FormField label="Field Name" htmlFor="efd-fieldName" error={errors.fieldName}>
          <input
            id="efd-fieldName"
            className={`fs-modal-input${errors.fieldName ? " fs-modal-input--error" : ""}`}
            value={form.fieldName}
            onChange={e => handleChange({ ...form, fieldName: e.target.value })}
            placeholder="e.g. Department"
            maxLength={50}
          />
        </FormField>

        {/* Field Type */}
        <FormField label="Field Type" htmlFor="efd-fieldType" error={errors.fieldType}>
          <select
            id="efd-fieldType"
            className={`fs-modal-select${errors.fieldType ? " fs-modal-select--error" : ""}`}
            value={form.fieldType}
            onChange={e => handleChange({ ...form, fieldType: e.target.value })}
            style={{
              cursor: "pointer",
              color: form.fieldType ? "var(--fs-text)" : "var(--fs-text-dim)",
            }}
          >
            <option value="" disabled>Select a type…</option>
            {FIELD_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FormField>

        {/* Option hint */}
        {form.fieldType === "Option" && (
          <div style={{
            display:      "flex",
            alignItems:   "flex-start",
            gap:          8,
            padding:      "9px 12px",
            borderRadius: 6,
            background:   "var(--fs-warning-bg, #FEF3C7)",
            border:       "1px solid var(--fs-warning-border, #FCD34D)",
            fontSize:     12,
            color:        "var(--fs-warning-text, #92400E)",
            marginTop:    -4,
          }}>
            <i className="fa-solid fa-circle-info" style={{ marginTop: 2, flexShrink: 0 }} />
            After saving, you'll be able to add the dropdown choices for this field.
          </div>
        )}

        {/* Required */}
        <FormField label="Required" htmlFor="efd-isRequired">
          <ToggleSwitch
            id="efd-isRequired"
            checked={form.isRequired}
            onChange={e => handleChange({ ...form, isRequired: e?.target?.checked ?? !form.isRequired })}
            label={form.isRequired ? "Required" : "Optional"}
          />
        </FormField>

        {/* Status */}
        <FormField label="Status" htmlFor="efd-isActive">
          <ToggleSwitch
            id="efd-isActive"
            checked={form.isActive}
            onChange={e => handleChange({ ...form, isActive: e?.target?.checked ?? !form.isActive })}
            label={form.isActive ? "Active" : "Inactive"}
          />
        </FormField>
      </ModalShell>
    );
  }

  // ── Phase 2: Options manager ──────────────────────────────────────────────

  function handlePhase2Done() {
    if (optionsCount === 0) {
      setLocalErrors({ general: "You must add at least one option for a dropdown field before proceeding." });
      return;
    }
    setLocalErrors({});
    handleClose();
  }

  return (
    <ModalShell
      open={open}
      title={`Manage Options — "${form.fieldName}"`}
      onClose={handlePhase2Done}
      maxWidth={480}
      footer={<Button variant="primary" onClick={handlePhase2Done}>Done</Button>}
    >
      <ErrorBanner message={errors.general} />
      <OptionsManager
        definitionId={savedId ?? form.extraFieldDefinitionId}
        onOptionsChange={setOptionsCount}
      />
    </ModalShell>
  );
}

