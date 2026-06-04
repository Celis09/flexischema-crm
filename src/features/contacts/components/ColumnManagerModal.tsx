// @ts-nocheck
/**
 * modals/ColumnManagerModal.tsx
 *
 * Column visibility + order manager.
 * Class names aligned to fs-column-manager.css (fs-cm-* prefix).
 * Uses createPortal to escape parent stacking contexts.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { saveColumnConfig, arrayMove } from "@/lib/index";
import ConfirmModal from "@/features/contacts/components/ConfirmModal";
import "./ColumnManagerModal.css";

const CORE_IDS    = new Set(["id", "name", "email"]);
const CORE_LABELS = { id: "ID", name: "Name", email: "Email", status: "Status", changeStatus: "Change Status" };
const ADMIN_LOCKED = new Set(["status", "changeStatus"]);

export default function ColumnManagerModal({
  open,
  definitions,
  columnOrder,
  hiddenColumns,
  allColumnIds,
  defaultColumnIds,
  role,
  isAdmin,
  onSave,
  onClose,
}) {
  const extraFieldMap = useMemo(() => {
    const map = new Map();
    definitions.forEach(d => {
      map.set(`extra-${d.extraFieldDefinitionId}`, d.fieldName);
    });
    return map;
  }, [definitions]);

  const labelOf = useCallback((id) => {
    return CORE_LABELS[id] ?? extraFieldMap.get(id) ?? id;
  }, [extraFieldMap]);

  const buildItems = useCallback(() => {
    const inOrder    = new Set(columnOrder);
    const orderedIds = [
      ...columnOrder.filter(id => allColumnIds.includes(id)),
      ...allColumnIds.filter(id => !inOrder.has(id)),
    ];
    return orderedIds.map(id => ({
      id,
      label:   labelOf(id),
      visible: !hiddenColumns.has(id),
      isCore:  CORE_IDS.has(id),
    }));
  }, [columnOrder, hiddenColumns, allColumnIds, labelOf]);

  const [items, setItems] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  const [dragState, setDragState] = useState({ overIndex: null, isValid: true });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warning,    setWarning]    = useState("");
  
  const warnTimer = useRef(null);
  const dragRef   = useRef(null); 

  const showWarning = useCallback((msg) => {
    setWarning(msg);
    clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => setWarning(""), 2500);
  }, []);

  useEffect(() => () => clearTimeout(warnTimer.current), []);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setItems(buildItems());
      setDragState({ overIndex: null, isValid: true });
      setWarning("");
    }
  }

  // ── Visibility toggles ────────────────────────────────────────────────────
  const toggleVisible = useCallback((id) => {
    if (CORE_IDS.has(id) || (isAdmin && ADMIN_LOCKED.has(id))) return;

    setItems(prev => {
      const targetItem = prev.find(it => it.id === id);
      
      if (targetItem && targetItem.visible) {
        const extraVisibleCount = prev.filter(it => !it.isCore && it.visible).length;
        if (extraVisibleCount <= 1) {
          showWarning("At least one extra field must remain visible.");
          return prev;
        }
      }

      return prev.map(it => it.id === id ? { ...it, visible: !it.visible } : it);
    });
  }, [showWarning]);

  const showAll = () => setItems(prev => prev.map(it => ({ ...it, visible: true })));

  const hideAll = () => {
    setItems(prev => {
      let firstExtraFound = false;
      return prev.map(it => {
        if (it.isCore) return it;
        if (!firstExtraFound) {
          firstExtraFound = true;
          return { ...it, visible: true };
        }
        return { ...it, visible: false };
      });
    });
    showWarning("Kept one extra field visible to meet layout requirements.");
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, index) => {
    dragRef.current = { fromIndex: index, isCore: items[index]?.isCore ?? false };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, [items]);

  const handleDragOver = useCallback((e, toIndex) => {
    e.preventDefault();
    if (!dragRef.current) return;
    
    const crossSection = dragRef.current.isCore !== (items[toIndex]?.isCore ?? false);
    e.dataTransfer.dropEffect = crossSection ? "none" : "move";
    
    // Update state to reflect if it's an invalid drop zone
    setDragState(prev => {
      if (prev.overIndex === toIndex && prev.isValid === !crossSection) return prev;
      return { overIndex: toIndex, isValid: !crossSection };
    });
  }, [items]);

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault();
    setDragState({ overIndex: null, isValid: true });
    
    if (!dragRef.current) return;
    
    const { fromIndex, isCore } = dragRef.current;
    dragRef.current = null;
    
    if (fromIndex === toIndex) return;
    if (isCore !== (items[toIndex]?.isCore ?? false)) {
      showWarning(
        isCore
          ? "Core fields can only be reordered among other core fields."
          : "Extra fields can only be reordered among other extra fields."
      );
      return;
    }
    setItems(prev => arrayMove(prev, fromIndex, toIndex));
  }, [items, showWarning]);

  const handleDragEnd = useCallback(() => { 
    dragRef.current = null; 
    setDragState({ overIndex: null, isValid: true }); 
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleRestoreDefaults = () => {
    setConfirmOpen(true);
  };

  const executeRestoreDefaults = () => {
    const newOrder  = [...defaultColumnIds];
    const newHidden = new Set();
    saveColumnConfig(role, newOrder, newHidden);
    setConfirmOpen(false);
    onSave(newOrder, newHidden);
  };

  const handleSave = () => {
    const newOrder  = items.map(it => it.id);
    const newHidden = new Set(items.filter(it => !it.visible).map(it => it.id));
    saveColumnConfig(role, newOrder, newHidden);
    onSave(newOrder, newHidden);
  };

  if (!open) return null;

  const allVisible        = items.every(it => it.visible);
  const extraVisibleCount = items.filter(it => !it.isCore && it.visible).length;
  const visCount          = items.filter(it => it.visible).length;

  return createPortal(
    <>
      <div className="fs-cm-backdrop" />
      <div className="fs-cm-modal" role="dialog" aria-modal="true" aria-labelledby="fs-cm-title">

        {/* ── Header ── */}
        <div className="fs-cm-header">
          <div>
            <h2 id="fs-cm-title" className="fs-cm-header__title">Manage Columns</h2>
            <p className="fs-cm-header__subtitle">
              Check to show · uncheck to hide · drag ⠿ to reorder within section
            </p>
          </div>
          <button className="fs-cm-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* ── Warning ── */}
        {warning && <div className="fs-cm-warning">⚠ {warning}</div>}

        {/* ── Bulk actions ── */}
        <div className="fs-cm-bulk-row">
          <button className="fs-cm-bulk-btn" onClick={showAll} disabled={allVisible}>Show all</button>
          <button className="fs-cm-bulk-btn" onClick={hideAll} disabled={extraVisibleCount <= 1}>Hide all</button>
          <span className="fs-cm-bulk-count">{visCount} of {items.length} visible</span>
        </div>

        {/* ── List ── */}
        <div className="fs-cm-list">
          {items.map((item, index) => {
            // Determine active drag styles
            const isDragTarget = dragState.overIndex === index;
            let dragClass = "";
            if (isDragTarget) {
              dragClass = dragState.isValid ? "fs-cm-row--drag-over" : "fs-cm-row--drag-invalid";
            }

            return (
              <div
                key={item.id}
                className={[
                  "fs-cm-row",
                  item.isCore ? "fs-cm-row--core" : "",
                  !item.visible ? "fs-cm-row--hidden" : "",
                  dragClass
                ].filter(Boolean).join(" ")}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e  => handleDragOver(e, index)}
                onDrop={e      => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span className="fs-cm-row__handle" aria-hidden="true">⠿</span>
                <input
                  type="checkbox"
                  id={`fs-cm-chk-${item.id}`}
                  className="fs-cm-row__checkbox"
                  checked={item.visible}
                  disabled={item.isCore}
                  title={item.isCore ? "This field cannot be hidden" : undefined}
                  onChange={() => toggleVisible(item.id)}
                />
                <label 
                  htmlFor={`fs-cm-chk-${item.id}`} 
                  className="fs-cm-row__label"
                >
                  {item.label}
                </label>
                {item.isCore && <span className="fs-cm-row__core-badge">core</span>}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="fs-cm-footer" style={{ justifyContent: "space-between" }}>
          <button className="fs-cm-btn fs-cm-btn--cancel" onClick={handleRestoreDefaults}>
            Restore Defaults
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
             <button className="fs-cm-btn fs-cm-btn--cancel" onClick={onClose}>Cancel</button>
             <button className="fs-cm-btn fs-cm-btn--primary" onClick={handleSave}>
               Apply
             </button>
          </div>
        </div>

      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Restore Defaults"
        message="Reset all columns to default? This can't be undone."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        danger={true}
        zIndex={1500}
        onConfirm={executeRestoreDefaults}
        onClose={() => setConfirmOpen(false)}
      />
    </>,
    document.body
  );
}

