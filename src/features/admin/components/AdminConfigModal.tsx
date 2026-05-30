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

      {/* Value — toggle for booleans, text input otherwise */}
      <FormField label="Value" htmlFor="ac-value" error={errors.value}>
        {isBool ? (
          <ToggleSwitch
            id="ac-value"
            checked={form.value === "true"}
            onChange={() => onChange({ ...form, value: form.value === "true" ? "false" : "true" })}
            label={form.value}
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

      {/* Description — read-only info; no htmlFor needed as child is a <p> */}
      {form.description && (
        <FormField label="Description">
          <p className="fs-modal-desc">{form.description}</p>
        </FormField>
      )}
    </ModalShell>
  );
}

