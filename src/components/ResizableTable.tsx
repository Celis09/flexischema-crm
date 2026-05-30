import { useState, useRef, useCallback, memo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const MIN_COL_WIDTH = 40;

const ResizeHandle = memo(function ResizeHandle(props: any) {
  const { colKey, onResizeStart } = props;
  return (
    <div
      className="fs-resize-handle"
      onMouseDown={e => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(colKey, e.clientX);
      }}
    />
  );
});

const HeaderCell = memo(function HeaderCell(props: any) {
  const { col, width, isLast, sortKey, sortOrder, onSort, onResizeStart } = props;
  const isSortable = col.sortable !== false;
  const activeKey  = col.backendKey ?? col.key;
  const isActive   = sortKey === activeKey;

  return (
    <div
      className={`fs-hcell${isActive ? " fs-hcell--sorted" : ""}`}
      style={{
        width:      isLast ? "100%" : width,
        minWidth:   width,
        maxWidth:   isLast ? "none" : width,
        cursor:     isSortable ? "pointer" : "default",
        flexShrink: 0,
      }}
      onClick={() => isSortable && onSort?.(col)}
    >
      {col.renderHeader ? (
        col.renderHeader()
      ) : (
        <>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {col.label}
          </span>
          {isSortable && (
            <span className={`fs-sort-icon${isActive ? " fs-active" : ""}`}>
              {isActive ? (sortOrder === "asc" ? "▲" : "▼") : "▲"}
            </span>
          )}
        </>
      )}
      {!isLast && (
        <ResizeHandle colKey={col.key} onResizeStart={onResizeStart} />
      )}
    </div>
  );
});

export default function ResizableTable(props: any) {
  const {
    columns = [],
    rows = [],
    rowKey,
    loading = false,
    emptyMessage = "No data found.",
    sortKey,
    sortOrder = "asc",
    onSort,
    selectedId,
    selectedIds,
    activeRowId,
    onRowClick,
    onRowDoubleClick,
    getRowStyle,
  } = props;
  const [colWidths,  setColWidths]  = useState({});
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const resizeRef = useRef(null);
  const parentRef = useRef(null);
  
  const colWidthsRef = useRef(colWidths);
  useEffect(() => {
    colWidthsRef.current = colWidths;
  }, [colWidths]);

  const getWidth = useCallback(
    (col) => colWidths[col.key] ?? col.width ?? 150,
    [colWidths],
  );

  const handleResizeStart = useCallback((colKey, startX) => {
    const col        = columns.find(c => c.key === colKey);
    const startWidth = colWidthsRef.current[colKey] ?? col?.width ?? 150;
    
    resizeRef.current = { colKey, startX, startWidth };

    const onMove = (e) => {
      if (!resizeRef.current) return;
      const { colKey: id, startX: sx, startWidth: sw } = resizeRef.current;
      setColWidths(prev => ({
        ...prev,
        [id]: Math.max(MIN_COL_WIDTH, sw + e.clientX - sx),
      }));
    };

    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
  }, [columns]);

  const gridTemplate = columns.map((col, i) => {
    const isLast = i === columns.length - 1;
    const w      = getWidth(col);
    return isLast ? `minmax(${w}px, 1fr)` : `${w}px`;
  }).join(" ");

  const isRowSelected = (row, key) => {
    const inBatch  = selectedIds  ? selectedIds.includes(key)   : false;
    const isSingle = selectedId !== undefined ? selectedId === key : false;
    return inBatch || isSingle;
  };

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
    initialRect: { width: 800, height: 800 },
  });

  return (
    <div className="fs-grid-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div 
        ref={parentRef} 
        className="fs-scroll-x" 
        style={{ flex: 1, overflow: 'auto' }}
      >
        <div style={{ minWidth: "max-content", width: "100%", position: 'relative' }}>
          
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: gridTemplate,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'var(--fs-bg-panel, #ffffff)',
            borderBottom: '1px solid var(--fs-border, #e5e7eb)'
          }}>
            {columns.map((col, i) => (
              <HeaderCell
                key={col.key}
                col={col}
                width={getWidth(col)}
                isLast={i === columns.length - 1}
                sortKey={sortKey}
                sortOrder={sortOrder}
                onSort={onSort}
                onResizeStart={handleResizeStart}
              />
            ))}
          </div>

          {loading && (
            <div className="fs-state-row" style={{ padding: '1rem', textAlign: 'center' }}>
              Loading…
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="fs-state-row" style={{ padding: '1rem', textAlign: 'center' }}>
              {emptyMessage}
            </div>
          )}

          {/* Data rows virtualized */}
          {!loading && rows.length > 0 && (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const ri = virtualRow.index;
                const row = rows[ri];
                const key = rowKey ? rowKey(row) : ri;
                const isHovered  = hoveredIdx === ri;
                const isSelected = isRowSelected(row, key);
                const isActive   = activeRowId !== undefined && activeRowId === key;
                const rowExtra   = getRowStyle?.(row) ?? {};

                return (
                  <div
                    key={key}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      display: "grid",
                      gridTemplateColumns: gridTemplate,
                    }}
                    onMouseEnter={() => setHoveredIdx(ri)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {columns.map((col, ci) => {
                      const isLast = ci === columns.length - 1;
                      const w      = getWidth(col);

                      const cellClass = [
                        "fs-cell",
                        isActive   ? "row-active"   :
                        isSelected ? "row-selected" :
                        isHovered  ? "row-hovered"  : "",
                      ].filter(Boolean).join(" ");

                      return (
                        <div
                          key={`${key}-${col.key}`}
                          className={cellClass}
                          style={{
                            width:    isLast ? "100%" : w,
                            minWidth: w,
                            maxWidth: isLast ? "none" : w,
                            ...rowExtra,
                          }}
                          onClick={col.skipRowClick ? undefined : () => onRowClick?.(row)}
                          onDoubleClick={col.skipRowClick ? undefined : () => onRowDoubleClick?.(row)}
                        >
                          {col.render(row, ri)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
