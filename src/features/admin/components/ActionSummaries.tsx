// @ts-nocheck
import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { useTheme } from "@/hooks/useTheme";
import { getActionSummaries } from "@/features/admin/api/ActionSummariesApi";
import { getDateRangePresets } from "@/features/admin/api/DateRangePresets";
import ResizableTable from "@/components/ResizableTable";

const ROLE_OPTIONS = ["Admin", "Editor"];
const PAGE_SIZE    = 20;

// ─── Date Preset Dropdown ─────────────────────────────────────────────────────

const DatePresetDropdown = memo(function DatePresetDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const presets         = getDateRangePresets();

  useEffect(() => {
    const handler = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); 
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="fs-btn"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Date presets"
      >
        <i className="fa-solid fa-calendar-days" /> Presets
        <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
      </button>
      {open && (
        <div className="fs-drop fs-open" style={{ minWidth: 160 }}>
          {presets.map(p => (
            <div
              key={p.label}
              className="fs-drop-item"
              onClick={() => { onSelect(p); setOpen(false); }}
            >
              {p.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActionSummaries() {
  useFlexiSchemaCSS();
  const { theme } = useTheme();

  const [summaries,  setSummaries]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy,     setSortBy]     = useState("Count");
  const [sortOrder,  setSortOrder]  = useState("desc");

  const [role,       setRole]       = useState("");
  const [fromDate,   setFromDate]   = useState("");
  const [toDate,     setToDate]     = useState("");
  
  const toDateInputRef = useRef(null);

  const hasFilters = role || fromDate || toDate;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActionSummaries({
        role:     role     || undefined,
        fromDate: fromDate || undefined,
        toDate:   toDate   || undefined,
        page, pageSize: PAGE_SIZE, sortBy, sortOrder,
      });
      const fetchedItems = data.items ?? data ?? [];
      setSummaries(fetchedItems);
      // Ensure totalPages is never 0 to prevent "Page 1 of 0" display
      const total = data.totalCount ?? data.total ?? fetchedItems.length;
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch (err) {
      const msg = err?.message ?? "";
      if (msg.includes("Unauthorized") || msg.includes("401") || msg.includes("refresh failed")) {
        setError(null);
        setSummaries([]);
      } else if (err.errors && typeof err.errors === "object") {
        setError(Object.values(err.errors).flat().join(" • "));
      } else {
        setError(msg || "Failed to load action summaries");
      }
    } finally {
      setLoading(false);
    }
  }, [role, fromDate, toDate, page, sortBy, sortOrder]);

  // SINGLE data-fetching effect. 
  // Because `load` is correctly memoized above, this handles ALL updates cleanly.
  useEffect(() => { 
    load(); 
  }, [load]); 

  const handleSort = useCallback((col) => {
    if (sortBy === col.backendKey) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col.backendKey);
      setSortOrder("desc");
    }
    setPage(1);
  }, [sortBy]);

  function handleRoleChange(e) {
    setRole(e.target.value);
    setPage(1);
  }

  function patchFrom(val) {
    setFromDate(val);
    setPage(1);
    
    if (val) {
      try { 
        if (toDateInputRef.current) {
          toDateInputRef.current.showPicker(); 
        }
      } catch {
        if (toDateInputRef.current) {
          toDateInputRef.current.focus(); 
        }
      }
    }
  }

  function patchTo(val) {
    setToDate(val);
    setPage(1);
  }

  function handlePreset({ fromDate: f, toDate: t }) {
    setFromDate(f);
    setToDate(t);
    setPage(1);
  }

  function clearFilters() {
    setRole("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  const columns = useMemo(() => [
    {
      key:        "actionType",
      label:      "Action Type",
      backendKey: "ActionType",
      width:      300,
      render: (row) => (
        <span className="fs-badge fs-badge--core" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {row.actionType}
        </span>
      ),
    },
    {
      key:        "count",
      label:      "Count",
      backendKey: "Count",
      width:      150,
      render: (row) => (
        <span style={{
          fontFamily:         "var(--fs-font-mono)",
          fontVariantNumeric: "tabular-nums",
          fontWeight:         700,
          fontSize:           14,
          color:              "var(--fs-text)",
        }}>
          {row.count.toLocaleString()}
        </span>
      ),
    },
  ], []);

  return (
    <div className="fs-root" data-theme={theme} data-density="compact">



      {/* ── Action bar ── */}
      <div className="fs-action-bar">
        <div className="fs-left-g">

          {/* ── Role filter ── */}
          <select
            className="fs-select"
            value={role}
            onChange={handleRoleChange}
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* ── Date presets ── */}
          <DatePresetDropdown onSelect={handlePreset} />

          {/* ── Date range ── */}
          <div className="fs-date-group">
            <span className="fs-date-sep">From</span>
            <input
              type="date" className="fs-date-input"
              value={fromDate}
              onChange={e => patchFrom(e.target.value)}
            />
            <span className="fs-date-sep">→</span>
            <input
              type="date" className="fs-date-input"
              value={toDate}
              ref={toDateInputRef}
              onChange={e => patchTo(e.target.value)}
              title="To date"
            />
          </div>

          {/* ── Clear all filters ── */}
          {hasFilters && (
            <button
              type="button"
              className="fs-btn"
              onMouseDown={e => { e.preventDefault(); clearFilters(); }}
              title="Clear all filters"
            >
              <i className="fa-solid fa-xmark" /> Clear Filters
            </button>
          )}

        </div>

        <div className="fs-right-g">
          <div className="fs-divider" />
          <button
            type="button"
            className="fs-icon-btn"
            onClick={() => load()}
            disabled={loading}
            title="Refresh action summaries"
            aria-label="Refresh action summaries"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <i className={`fa-solid fa-rotate-right${loading ? " fa-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="fs-toast fs-toast--error">
          <i className="fa-solid fa-circle-xmark" /> {error}
        </div>
      )}

      <div style={{ width: "100%", overflowX: "auto" }}>
        <ResizableTable
          columns={columns}
          rows={summaries}
          rowKey={(row) => row.actionType}
          loading={loading}
          emptyMessage="No action summaries found."
          sortKey={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          compact
        />
      </div>

      <div className="fs-pagination">
        <button
          className="fs-page-btn"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          <i className="fa-solid fa-chevron-left" /> Prev
        </button>
        <span className="fs-page-info">Page {page} of {totalPages}</span>
        <button
          className="fs-page-btn"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
        >
          Next <i className="fa-solid fa-chevron-right" />
        </button>
      </div>

    </div>
  );
}

