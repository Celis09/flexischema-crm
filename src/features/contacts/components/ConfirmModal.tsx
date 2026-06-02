// ConfirmModal.tsx
// Lightweight confirmation dialog that replaces native confirm().
// Supports a "danger" variant for destructive actions.

import { useEffect } from "react";
import { ModalShell, Button } from "@/components/Primitives";

/**
 * @param {object}   props
 * @param {boolean}  props.open          - Whether the modal is visible
 * @param {string}   props.title         - Modal heading
 * @param {string}   props.message       - Body text / question
 * @param {string}   [props.confirmLabel="Confirm"] - Text for the confirm button
 * @param {string}   [props.cancelLabel="Cancel"]   - Text for the cancel button
 * @param {boolean}  [props.danger=false]           - Red confirm button for destructive actions
 * @param {function} props.onConfirm     - Called when the user confirms
 * @param {function} props.onClose       - Called when the user cancels or closes
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  danger       = false,
  zIndex,
  onConfirm,
  onClose,
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalShell
      open={open}
      title={title}
      onClose={onClose}
      maxWidth={380}
      zIndex={zIndex}
      footerStyle={{ justifyContent: "center" }}
      footer={
        <>
          <Button variant="cancel" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => { onConfirm(); onClose(); }}
            style={danger ? {
              background:   "var(--fs-error-bg,   #FEE2E2)",
              color:        "var(--fs-error-text,  #991B1B)",
              borderColor:  "var(--fs-error-border,#FECACA)",
              fontWeight:   700,
            } : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{
        fontSize:   13,
        color:      "var(--fs-text-dim)",
        lineHeight: 1.6,
        margin:     0,
      }}>
        {message}
      </div>
    </ModalShell>
  );
} 
