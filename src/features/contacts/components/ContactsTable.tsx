/**
 * CONTACTS TABLE (VIRTUALIZED)
 * -----------------------------
 * A highly optimized "Dumb Component" for displaying thousands of contact rows 
 * efficiently. It uses `@tanstack/react-virtual` for row virtualization and 
 * handles drag-and-drop column reordering.
 */
// @ts-nocheck
import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from "react";
import { StatusBadge } from "@/components/Primitives";
import { useVirtualizer } from "@tanstack/react-virtual";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_EXTRA_WIDTH = 150;
const CONTACT_STATUSES    = ["Active", "Inactive", "Archived"];

// Columns that live in the frozen (left) grid
const FROZEN_COL_IDS = new Set(["select", "sequence", "id", "name", "email"]);

// Columns that are never sortable regardless of position
const NON_SORTABLE_COLS = new Set(["select", "sequence", "changeStatus"]);

// ─── Column metadata ──────────────────────────────────────────────────────────

const CORE_META = {
  admin: {
    labels: {
      select: "", sequence: "#", id: "ID", status: "Status",
      changeStatus: "Change Status", createdDate: "Created", name: "Name", email: "Email",
    },
    widths: {
      select: 40, sequence: 52, id: 60, status: 100,
      changeStatus: 140, createdDate: 140, name: 180, email: 220,
    },
    maxWidths: {
      select: 48, sequence: 80, id: 80, status: 120,
      changeStatus: 180, createdDate: 160, name: 220, email: 280,
    },
  },
  public: {
    labels:    { sequence: "Seq#", name: "Name", email: "Email" },
    widths:    { sequence: 64, name: 200, email: 260 },
    maxWidths: { sequence: 80, name: 320, email: 400 },
  },
};

function getCoreMeta(isAdmin) {
  return isAdmin ? CORE_META.admin : CORE_META.public;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRowStyle(contact) {
  const s = contact.status?.toLowerCase();
  if (s === "inactive") return { opacity: 0.45, color: "#9ca3af" };
  if (s === "archived") return { textDecoration: "line-through", opacity: 0.55, color: "#6b7280" };
  return {};
}

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d) ? val : d.toLocaleDateString();
}

function getExtraFieldValue(contact, colId) {
  const defId = colId.replace("extra-", "");
  return (contact.extraFields ?? []).find(
    ef => String(ef.extraFieldDefinitionId) === defId
  )?.fieldValue ?? "";
}

// ─── Stable ID normalizer ─────────────────────────────────────────────────────

const sid = (id) => (id == null ? null : String(id));

// ─── Row key ──────────────────────────────────────────────────────────────────

const getRowKey = (contact) => {
  if (contact.id       != null) return String(contact.id);
  if (contact.sequence != null) return `seq-${contact.sequence}`;
  return null;
};

// ─── Status Dropdown ──────────────────────────────────────────────────────────

const StatusDropdown = memo(function StatusDropdown(props: any) {
  const { currentStatus, onSelect } = props;
  return (
    <select
      className="fs-status-select"
      value={currentStatus ?? ""}
      onChange={e => {
        e.stopPropagation();
        onSelect(e.target.value);
      }}
      onClick={e => e.stopPropagation()}
    >
      {CONTACT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
});

// ─── Resize Handle ────────────────────────────────────────────────────────────

const ResizeHandle = memo(function ResizeHandle(props: any) {
  const { colId, onResizeStart } = props;
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onResizeStart(colId, e.clientX);
  }, [colId, onResizeStart]);

  return (
    <div
      className="fs-resize-handle"
      onMouseDown={handleMouseDown}
      title="Drag to resize column"
      aria-hidden="true"
    />
  );
});

// ─── Header Cell ──────────────────────────────────────────────────────────────

const HeaderCell = memo(function HeaderCell(props: any) {
  const { colId, label, style, sortConfig, onSort, onResizeStart, isLastScrollable } = props;
  const isSortable = !NON_SORTABLE_COLS.has(colId);
  const isActive   = sortConfig?.key === colId;
  const sortAttr   = isActive ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none";

  const handleClick = useCallback(() => {
    if (!isSortable) return;
    const dir = isActive && sortConfig.direction === "asc" ? "desc" : "asc";
    onSort?.(colId, dir);
  }, [isSortable, isActive, sortConfig, onSort, colId]);

  return (
    <div
      className={`fs-hcell${isActive ? " fs-hcell--sorted" : ""}`}
      style={{ ...style, position: "relative" }}
      onClick={handleClick}
      role={isSortable ? "columnheader" : undefined}
      aria-sort={isSortable ? sortAttr : undefined}
      tabIndex={isSortable ? 0 : undefined}
      onKeyDown={e => {
        if (isSortable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {colId === "select" ? null : (
        <>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          {isSortable && (
            <span className={`fs-sort-icon${isActive ? " fs-active" : ""}`}>
              {isActive ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
            </span>
          )}
        </>
      )}
      {colId !== "select" && !isLastScrollable && onResizeStart && (
        <ResizeHandle colId={colId} onResizeStart={onResizeStart} />
      )}
    </div>
  );
});

// ─── ContactsTable ────────────────────────────────────────────────────────────

const ContactsTable = memo(function ContactsTable(props: any) {
  const {
    contacts,
    definitions,
    columnOrder,
    selectedIds,
    onSelect,
    activeRow,
    onActiveRowChange,
    sortConfig,
    onSort,
    isAdmin = false,
    onStatusChange,
    onRowOpen,
    loading = false,
  } = props;
  const { labels: coreLabels, widths: coreWidths } = getCoreMeta(isAdmin);

  // ── Column widths state ────────────────────────────────────────────────────

  const [colWidthOverrides, setColWidthOverrides] = useState({});

  const colWidthOverridesRef = useRef(colWidthOverrides);
  useEffect(() => {
    colWidthOverridesRef.current = colWidthOverrides;
  }, [colWidthOverrides]);

  const resizeStateRef = useRef(null);

  const handleResizeStart = useCallback((colId, startX) => {
    const currentWidth =
      colWidthOverridesRef.current[colId] ?? coreWidths[colId] ?? DEFAULT_EXTRA_WIDTH;
    resizeStateRef.current = { colId, startX, startWidth: currentWidth, rafId: null };

    const onMouseMove = (e) => {
      if (!resizeStateRef.current) return;
      
      if (resizeStateRef.current.rafId) {
        cancelAnimationFrame(resizeStateRef.current.rafId);
      }
      
      resizeStateRef.current.rafId = requestAnimationFrame(() => {
        if (!resizeStateRef.current) return;
        const { colId: id, startX: sx, startWidth: sw } = resizeStateRef.current;
        const newW = Math.max(40, sw + (e.clientX - sx));
        setColWidthOverrides(prev => ({ ...prev, [id]: newW }));
      });
    };

    const onMouseUp = () => {
      if (resizeStateRef.current?.rafId) {
        cancelAnimationFrame(resizeStateRef.current.rafId);
      }
      resizeStateRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor    = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor    = "col-resize";
    document.body.style.userSelect = "none";
  }, [coreWidths]);

  const frozenCols = useMemo(
    () => columnOrder.filter(id => FROZEN_COL_IDS.has(id)),
    [columnOrder]
  );
  const scrollableCols = useMemo(
    () => columnOrder.filter(id => !FROZEN_COL_IDS.has(id)),
    [columnOrder]
  );

  const getColWidth = useCallback((colId) => {
    if (colWidthOverrides[colId] !== undefined) return colWidthOverrides[colId];
    if (coreWidths[colId]        !== undefined) return coreWidths[colId];
    return DEFAULT_EXTRA_WIDTH;
  }, [colWidthOverrides, coreWidths]);

  const getColLabel = useCallback((colId) => {
    if (coreLabels[colId] !== undefined) return coreLabels[colId];
    const defId = colId.replace("extra-", "");
    return definitions.find(
      d => String(d.extraFieldDefinitionId) === defId
    )?.fieldName ?? colId;
  }, [coreLabels, definitions]);

  const frozenTotalWidth = useMemo(
    () => frozenCols.reduce((sum, id) => sum + getColWidth(id), 0),
    [frozenCols, getColWidth]
  );

  const hasScrollableCols = scrollableCols.length > 0;

  const frozenGridCols = useMemo(
    () => frozenCols.map(id => `${getColWidth(id)}px`).join(" "),
    [frozenCols, getColWidth]
  );

  const scrollGridCols = useMemo(
    () => scrollableCols
      .map((id, index) => {
        const isLast = index === scrollableCols.length - 1;
        const width  = getColWidth(id);
        return isLast ? `minmax(${width}px, 1fr)` : `${width}px`;
      })
      .join(" "),
    [scrollableCols, getColWidth]
  );

  const makeCellStyle = useCallback((colId, extra = {}) => {
    const isLastScrollable = colId === scrollableCols[scrollableCols.length - 1];
    const w = getColWidth(colId);
    if (isLastScrollable) {
      return { minWidth: w, width: "100%", maxWidth: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...extra };
    }
    return { width: w, minWidth: w, maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...extra };
  }, [getColWidth, scrollableCols]);

  const frozenPaneStyle = useMemo(() => {
    if (!hasScrollableCols) return { width: "100%", borderRight: "none", flexShrink: 0 };
    return { flexShrink: 0, width: `${frozenTotalWidth}px` };
  }, [hasScrollableCols, frozenTotalWidth]);

  const scrollContainerStyle = useMemo(() => {
    if (!hasScrollableCols) return { display: "none" };
    return { flex: "1 1 0", minWidth: 0, overflowX: "auto" };
  }, [hasScrollableCols]);

  const scrollGridStyle = useMemo(() => ({
    width: "100%",
    minWidth: "max-content",
  }), []);

  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);

  const displayContacts = contacts;

  const selectedSet = useMemo(
    () => new Set((selectedIds ?? []).map(sid).filter(v => v !== null)),
    [selectedIds]
  );

  const validContacts = useMemo(
    () => contacts.filter(c => sid(c.id) !== null),
    [contacts]
  );

  const allSelected = useMemo(
    () => validContacts.length > 0 && validContacts.every(c => selectedSet.has(sid(c.id))),
    [validContacts, selectedSet]
  );

  const someSelected = useMemo(
    () => validContacts.some(c => selectedSet.has(sid(c.id))),
    [validContacts, selectedSet]
  );

  const toggleSelect = useCallback((id) => {
    const key = sid(id);
    if (key === null) return;
    onSelect(prev => {
      const prevStrs = (prev ?? []).map(sid).filter(v => v !== null);
      return prevStrs.includes(key)
        ? prevStrs.filter(s => s !== key)
        : [...prevStrs, key];
    });
  }, [onSelect]);

  const makeRowHandlers = (contact, rowIndex) => {
    const contactKey    = getRowKey(contact);
    const alreadyActive = activeRow != null && activeRow === contactKey;

    return {
      onMouseEnter: () => setHoveredRowIndex(rowIndex),
      onMouseLeave: () => setHoveredRowIndex(null),
      onClick: () => {
        if (contactKey === null) return;
        if (isAdmin) {
          onActiveRowChange?.(alreadyActive ? null : contactKey);
        } else {
          const nextKey = alreadyActive ? null : contactKey;
          onActiveRowChange?.(nextKey);
          onSelect(nextKey !== null ? [nextKey] : []);
        }
        onRowOpen?.(alreadyActive ? null : contact);
      },
      style: { cursor: "pointer" },
    };
  };

  const rowCls = (contact, rowIndex) => {
    const contactKey  = getRowKey(contact);
    const hasValidKey = contactKey !== null;
    return [
      "fs-cell",
      hoveredRowIndex === rowIndex ? "row-hovered" : "",
      hasValidKey && activeRow != null && activeRow === contactKey ? "row-active" : "",
      isAdmin && hasValidKey && selectedSet.has(sid(contact.id)) ? "row-selected" : "",
    ].filter(Boolean).join(" ");
  };

  const renderFrozenCell = (colId, contact, rowIndex, handlers) => {
    const cls      = rowCls(contact, rowIndex);
    const rowStyle = getRowStyle(contact);

    switch (colId) {
      case "select":
        return (
          <div
            key={`${contact.id}-select`}
            className={cls}
            style={makeCellStyle(colId, { justifyContent: "center", cursor: "pointer" })}
            onClick={e => { e.stopPropagation(); toggleSelect(contact.id); }}
          >
            <input
              type="checkbox"
              checked={selectedSet.has(sid(contact.id))}
              onChange={() => {}}
              style={{ pointerEvents: "none" }}
            />
          </div>
        );
      case "sequence":
        return (
          <div key={`${contact.id}-seq`} className={cls}
            style={{ ...makeCellStyle(colId), ...rowStyle, ...handlers.style }}
            onClick={handlers.onClick}>
            {contact.sequence}
          </div>
        );
      case "id":
        return (
          <div key={`${contact.id}-id`} className={`${cls} fs-id-cell`}
            style={{ ...makeCellStyle(colId), ...rowStyle, ...handlers.style }}
            onClick={handlers.onClick}>
            #{contact.id}
          </div>
        );
      case "name":
        return (
          <div key={`${contact.id}-name`} className={`${cls} fs-uname`}
            style={{ ...makeCellStyle(colId), ...rowStyle, ...handlers.style }}
            onClick={handlers.onClick}>
            {contact.name}
          </div>
        );
      case "email":
        return (
          <div key={`${contact.id}-email`} className={`${cls} fs-email`}
            style={{ ...makeCellStyle(colId), ...rowStyle, ...handlers.style }}
            onClick={handlers.onClick}>
            {contact.email ?? "—"}
          </div>
        );
      default:
        return (
          <div key={`${contact.id}-${colId}`} className={cls}
            style={{ ...makeCellStyle(colId), ...rowStyle, ...handlers.style }}
            onClick={handlers.onClick}>
            {getExtraFieldValue(contact, colId)}
          </div>
        );
    }
  };

  const renderScrollableCell = (colId, contact, rowIndex, handlers) => {
    const cls      = rowCls(contact, rowIndex);
    const rowStyle = getRowStyle(contact);

    switch (colId) {
      case "status":
        return (
          <div key={`${contact.id}-status`} className={cls}
            style={{ ...makeCellStyle(colId), ...handlers.style }}
            onClick={handlers.onClick}>
            <StatusBadge status={contact.status} />
          </div>
        );
      case "changeStatus":
        return (
          <div key={`${contact.id}-changeStatus`} className={cls}
            style={makeCellStyle(colId)}
            onClick={e => e.stopPropagation()}
          >
            <StatusDropdown
              currentStatus={contact.status}
              onSelect={ns => onStatusChange?.(contact.id, ns)}
            />
          </div>
        );
      case "createdDate":
        return (
          <div key={`${contact.id}-date`} className={`${cls} fs-date-val`}
            style={{ ...makeCellStyle(colId), ...rowStyle, ...handlers.style }}
            onClick={handlers.onClick}>
            {formatDate(contact.createdDate)}
          </div>
        );
      default:
        return (
          <div key={`${contact.id}-${colId}`} className={cls}
            style={{ ...makeCellStyle(colId), ...rowStyle, ...handlers.style }}
            onClick={handlers.onClick}>
            {getExtraFieldValue(contact, colId)}
          </div>
        );
    }
  };

  const lastScrollableColId = scrollableCols[scrollableCols.length - 1];

  // ── Virtualization ─────────────────────────────────────────────────────────

  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: displayContacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
    initialRect: { width: 800, height: 800 },
  });

  return (
    <div
      className="fs-grid-wrapper"
      ref={parentRef}
      style={{
        width: "100%", 
        height: "100%", // Required for virtualization
        overflowY: "auto", // Vertical scroll on the wrapper
        overflowX: "hidden", // Scrollable pane handles horizontal scroll
        display: "flex", 
        position: "relative",
        transition: "opacity 150ms ease",
        pointerEvents: loading ? "none" : "auto",
      }}
    >
      {/* ── Frozen Grid ── */}
      <div
        className="fs-frozen-grid"
        style={{ 
          ...frozenPaneStyle,
          position: "relative",
          height: `${rowVirtualizer.getTotalSize() + 40}px` 
        }}
      >
        <div style={{
          display: "grid", 
          gridTemplateColumns: frozenGridCols,
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--fs-bg-panel, #ffffff)',
          borderBottom: '1px solid var(--fs-border, #e5e7eb)',
          borderRight: '1px solid var(--fs-border, #e5e7eb)',
          height: '40px'
        }}>
          {frozenCols.map(colId => {
            if (colId === "select") {
              return (
                <div
                  key="frozen-h-select"
                  className="fs-hcell"
                  style={{ ...makeCellStyle(colId, { justifyContent: "center" }), position: "relative", cursor: "pointer" }}
                  onClick={e => { e.stopPropagation(); onSelect(allSelected ? [] : validContacts.map(c => sid(c.id))); }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                    title="Select all"
                  />
                  <ResizeHandle colId={colId} onResizeStart={handleResizeStart} />
                </div>
              );
            }
            return (
              <HeaderCell
                key={`frozen-h-${colId}`}
                colId={colId}
                label={getColLabel(colId)}
                style={makeCellStyle(colId)}
                sortConfig={sortConfig}
                onSort={onSort}
                onResizeStart={handleResizeStart}
                isLastScrollable={false}
              />
            );
          })}
        </div>

        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const rowIndex = virtualRow.index;
          const contact = displayContacts[rowIndex];
          const handlers = makeRowHandlers(contact, rowIndex);
          const rowKey   = getRowKey(contact) ?? rowIndex;
          return (
            <div 
              key={rowKey} 
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%',
                transform: `translateY(${virtualRow.start + 40}px)`,
                display: 'grid',
                gridTemplateColumns: frozenGridCols,
                borderRight: '1px solid var(--fs-border, #e5e7eb)'
              }}
              onMouseEnter={handlers.onMouseEnter}
              onMouseLeave={handlers.onMouseLeave}
            >
              {frozenCols.map(colId => renderFrozenCell(colId, contact, rowIndex, handlers))}
            </div>
          );
        })}
      </div>

      {/* ── Scrollable Grid ── */}
      <div className="fs-scroll-container" style={{ ...scrollContainerStyle, overflowY: "hidden" }}>
        <div className="fs-scroll-grid" style={{ 
          ...scrollGridStyle,
          position: "relative",
          height: `${rowVirtualizer.getTotalSize() + 40}px`
        }}>
          <div style={{
            display: "grid", 
            gridTemplateColumns: scrollGridCols,
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: 'var(--fs-bg-panel, #ffffff)',
            borderBottom: '1px solid var(--fs-border, #e5e7eb)',
            height: '40px'
          }}>
            {scrollableCols.map(colId => (
              <HeaderCell
                key={`scroll-h-${colId}`}
                colId={colId}
                label={getColLabel(colId)}
                style={makeCellStyle(colId)}
                sortConfig={sortConfig}
                onSort={onSort}
                onResizeStart={handleResizeStart}
                isLastScrollable={colId === lastScrollableColId}
              />
            ))}
          </div>

          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const rowIndex = virtualRow.index;
            const contact = displayContacts[rowIndex];
            const handlers = makeRowHandlers(contact, rowIndex);
            const rowKey   = getRowKey(contact) ?? rowIndex;
            return (
              <div 
                key={rowKey} 
                style={{
                  position: 'absolute',
                  top: 0, left: 0, width: '100%',
                  transform: `translateY(${virtualRow.start + 40}px)`,
                  display: 'grid',
                  gridTemplateColumns: scrollGridCols,
                }}
                onMouseEnter={handlers.onMouseEnter}
                onMouseLeave={handlers.onMouseLeave}
              >
                {scrollableCols.map(colId => renderScrollableCell(colId, contact, rowIndex, handlers))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ContactsTable;

