// @ts-nocheck
/**
 * modals/AdminConfigModal.tsx
 *
 * Relies entirely on fs-modal-base.css — no local stylesheet needed.
 */

import { ModalShell, FormField, Button, ErrorBanner, ToggleSwitch } from "@/components/Primitives";

const BOOL_VALUES = ["true", "false"];

export default function AdminConfigModal({
  open,
  form,
  onChange,
  onSave,
  onClose,
  errors = {},
}) {
  // Allow saving intentionally empty strings; only block null/undefined.
  function handleSave() {
    if (form.value == null) return;
    onSave(form);
  }

  const isBool = BOOL_VALUES.includes(form.value);

  const footer = (
    <>
      <Button variant="cancel" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={handleSave}>Save</Button>
    </>
  );

  return (
    <ModalShell
      open={open}
      title="Edit Config"
      onClose={onClose}
      maxWidth={460}
      footer={footer}
    >
      <ErrorBanner message={errors.general} />

      {/* Key — read only (disabled removed to allow text selection/copying) */}
      <FormField label="Key" htmlFor="ac-key">
        <input
          id="ac-key"
          className="fs-modal-input fs-modal-input--readonly"
          value={form.key ?? ""}
          readOnly
        />
      </FormField>

      {/* Description — read-only info; moved above value for context */}
      {form.description && (
        <FormField label="Description">
          {isBool && form.value === "false" ? (
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
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong>Warning:</strong> {form.description}
              </div>
            </div>
          ) : (
            <p className="fs-modal-desc">{form.description}</p>
          )}
        </FormField>
      )}

      {/* Value — toggle for booleans, text input otherwise */}
      <FormField label="Value" htmlFor="ac-value" error={errors.value}>
        {isBool ? (
          <ToggleSwitch
            id="ac-value"
            checked={form.value === "true"}
            onChange={() => onChange({ ...form, value: form.value === "true" ? "false" : "true" })}
            label={form.value === "true" ? "Enabled" : "Disabled"}
          />
        ) : (
          <input
            id="ac-value"
            className={`fs-modal-input${errors.value ? " fs-modal-input--error" : ""}`}
            value={form.value ?? ""}
            onChange={e => onChange({ ...form, value: e.target.value })}
            placeholder="Enter value"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          />
        )}
      </FormField>
    </ModalShell>
  );
}

