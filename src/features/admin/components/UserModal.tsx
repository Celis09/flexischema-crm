// @ts-nocheck
/**
 * modals/UserModal.tsx
 */

/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { ModalShell, FormField, Button, ErrorBanner } from "@/components/Primitives";

export const ROLE_OPTIONS = ["Editor", "Admin"];

export default function UserModal({
  open,
  editing,
  form,
  onChange,
  onSave,
  onClose,
  errors: serverErrors = {},
  lockRole = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  // Merge errors
  const errors = { ...serverErrors, ...localErrors };

  function handleSave(e) {
    if (e) e.preventDefault();
    const errs = {};
    if (!form.username?.trim()) errs.username = "Username is required.";
    if (!form.email?.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Invalid email format.";
    }
    if (!editing && !form.password?.trim()) {
      errs.password = "Password is required.";
    }
    if (!form.role) errs.role = "Role is required.";

    if (Object.keys(errs).length > 0) {
      setLocalErrors(errs);
      return;
    }
    setLocalErrors({});
    onSave(form);
  }

  function handleClose() {
    setLocalErrors({});
    onClose();
  }

  const footer = (
    <>
      <Button variant="cancel" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleSave}>
        {editing ? "Save Changes" : "Create User"}
      </Button>
    </>
  );

  return (
    <ModalShell
      open={open}
      title={editing ? "Edit User" : "Add User"}
      onClose={handleClose}
      maxWidth={420}
      footer={footer}
    >
      <form
        onSubmit={handleSave}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <ErrorBanner message={errors.general} />

        {/* Username */}
        <FormField label="Username" htmlFor="um-username" error={errors.username}>
          <input
            id="um-username"
            type="text"
            className={`fs-modal-input${errors.username ? " fs-modal-input--error" : ""}`}
            value={form.username ?? ""}
            onChange={e => onChange({ ...form, username: e.target.value })}
            placeholder="e.g. johndoe"
            autoComplete="off"
          />
        </FormField>

        {/* Email */}
        <FormField label="Email" htmlFor="um-email" error={errors.email}>
          <input
            id="um-email"
            type="email"
            className={`fs-modal-input${errors.email ? " fs-modal-input--error" : ""}`}
            value={form.email ?? ""}
            onChange={e => onChange({ ...form, email: e.target.value })}
            placeholder="email@example.com"
            autoComplete="off"
          />
        </FormField>

        {/* Password */}
        <FormField
          label="Password"
          htmlFor="um-password"
          labelHint={editing ? "— leave blank to keep current" : undefined}
          error={errors.password}
        >
          <div style={{ position: "relative" }}>
            <input
              id="um-password"
              type={showPassword ? "text" : "password"}
              className={`fs-modal-input${errors.password ? " fs-modal-input--error" : ""}`}
              value={form.password ?? ""}
              onChange={e => onChange({ ...form, password: e.target.value })}
              placeholder={editing ? "New password (optional)" : "Enter password"}
              autoComplete="new-password"
              style={{ paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--fs-text-dim)",
                cursor: "pointer",
                fontSize: "14px",
                padding: "4px",
                lineHeight: 1,
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
            </button>
          </div>
        </FormField>

        {/* Role */}
        {/* 
          SECURITY NOTE:
          We conditionally lock the role dropdown if the user is editing their own account.
          This mirrors backend constraints preventing users from accidentally (or maliciously) 
          demoting their own admin privileges and locking themselves out of the system.
        */}
        <FormField
          label={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Role
              {lockRole && (
                <span
                  title="You cannot change your own role."
                  style={{ cursor: "help", color: "var(--fs-text-dim)", fontSize: "11px", lineHeight: 1 }}
                >
                  <i className="fa-solid fa-lock" />
                </span>
              )}
            </span>
          }
          htmlFor="um-role"
          error={errors.role}
        >
          <select
            id="um-role"
            className={`fs-modal-select${errors.role ? " fs-modal-select--error" : ""}${lockRole ? " fs-modal-input--disabled" : ""}`}
            value={form.role ?? ""}
            onChange={e => onChange({ ...form, role: e.target.value })}
            disabled={lockRole}
            style={lockRole ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </FormField>
      </form>
    </ModalShell>
  );
}


