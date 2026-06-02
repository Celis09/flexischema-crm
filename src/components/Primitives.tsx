/**
 * components/Primitives.tsx
 *
 * Shared, zero-dependency UI building blocks used across the app.
 * Each primitive reads from the CSS variables defined in fs-tokens.css.
 *
 * Exports:
 *   ModalShell   — backdrop + card + header + footer scaffold
 *   FormField    — label + input/select/children + inline error
 *   Button       — cancel / primary / danger variants
 *   ErrorBanner  — full-width error/warning strip
 *   ToggleSwitch — accessible on/off toggle
 *   StatusBadge  — Active / Inactive / Archived pill
 *   CloseButton  — animated ✕ icon button
 */

import { useEffect, useState, memo } from "react";
import { createPortal } from "react-dom";

// ─── ModalShell ───────────────────────────────────────────────────────────────

export function ModalShell(props: any) {
  const {
    open,
    title,
    subtitle,
    onClose,
    maxWidth = 480,
    zIndex,
    headerRight,
    footer,
    children,
  } = props;
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fs-modal-overlay" style={zIndex ? { zIndex } : undefined}>
      <div className="fs-modal-card" style={{ maxWidth }}>

        {/* Header */}
        <div className="fs-modal-header">
          <div>
            <h3 className="fs-modal-title">{title}</h3>
            {subtitle && <p className="fs-modal-subtitle">{subtitle}</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {headerRight}
            <button
              type="button"
              className="fs-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="fs-modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="fs-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────

export function FormField(props: any) {
  const { label, labelHint, htmlFor, error, children } = props;
  return (
    <div className="fs-field">
      {label && (
        <label htmlFor={htmlFor} className="fs-label">
          {label}
          {labelHint && <span className="fs-label-hint">{labelHint}</span>}
        </label>
      )}
      {children}
      {error && <span className="fs-field-error">{error}</span>}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function Button(props: any) {
  const { variant = "cancel", onClick, type = "button", disabled, children, style } = props;
  return (
    <button
      type={type}
      className={`fs-modal-btn fs-modal-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

// ─── ErrorBanner ──────────────────────────────────────────────────────────────

export function ErrorBanner(props: any) {
  const { message } = props;
  if (!message) return null;
  return (
    <div className="fs-modal-error">
      <span>✕</span>
      <span>{message}</span>
    </div>
  );
}

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────

export function ToggleSwitch(props: any) {
  const { id, checked, onChange, label } = props;
  return (
    <label
      htmlFor={id}
      style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      {/* Track */}
      <span style={{
        position: "relative", display: "inline-block",
        width: 38, height: 22, borderRadius: 999,
        background: checked ? "var(--fs-accent-dim)" : "var(--fs-btn-bg)",
        border: `1px solid ${checked ? "var(--fs-accent)" : "var(--fs-border)"}`,
        transition: "background 0.2s, border-color 0.2s",
        flexShrink: 0,
      }}>
        {/* Thumb */}
        <span style={{
          position: "absolute", top: 3, left: checked ? 18 : 3,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }} />
      </span>
      {label !== undefined && (
        <span style={{
          fontSize: 13, fontWeight: 600, fontFamily: "var(--fs-font-mono)",
          color: checked ? "var(--fs-accent)" : "var(--fs-text-dim)",
          transition: "color 0.2s",
        }}>
          {label ?? (checked ? "Active" : "Inactive")}
        </span>
      )}
    </label>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export const StatusBadge = memo(function StatusBadge(props: any) {
  const { status } = props;
  const key = status?.toLowerCase();
  const cls =
    key === "active"   ? "fs-badge fs-badge--active"    :
    key === "inactive" ? "fs-badge fs-badge--inactive"  :
    key === "archived" ? "fs-badge fs-badge--suspended" :
                         "fs-badge fs-badge--inactive";
  return <span className={cls}>{status ?? "—"}</span>;
});

// ─── CloseButton ──────────────────────────────────────────────────────────────

export function CloseButton(props: any) {
  const { onClick } = props;
  const [hovered, setHovered] = useState(false);

  const base = {
    width: 32, height: 32,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--fs-btn-bg)",
    border: "1px solid var(--fs-border)",
    borderRadius: "50%", cursor: "pointer",
    color: "var(--fs-text-dim)", fontSize: 14, padding: 0, flexShrink: 0,
    transition: "background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s",
  };

  const hover = {
    background: "var(--fs-btn-bg-hov)",
    borderColor: "var(--fs-accent)",
    color: "var(--fs-text)",
    transform: "rotate(90deg)",
  };

  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      style={hovered ? { ...base, ...hover } : base}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      ✕
    </button>
  );
}
