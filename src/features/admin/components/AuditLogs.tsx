// @ts-nocheck
import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { useTheme } from "@/hooks/useTheme";
import { getAuditLogs, getAuditLogActionTypes, getAuditLogEntityNames } from "@/features/admin/api/AuditLogsApi";
import { getDateRangePresets } from "@/features/admin/api/DateRangePresets";
import ResizableTable from "@/components/ResizableTable";
import Pagination from "@/components/Pagination";

const DEFAULT_PAGE_SIZE     = 20;
const PAGE_SIZE_STORAGE_KEY = "auditLogs:pageSize";

function getSavedPageSize() {
  try {
    const saved  = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    const parsed = Number(saved);
    return [10, 20, 50, 100].includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

function savePageSize(size) {
  try { localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size)); } catch { /* quota / SSR guard */ }
}

// ─── Date Preset Dropdown ─────────────────────────────────────────────────────

const DatePresetDropdown = memo(function DatePresetDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const presets         = getDateRangePresets();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
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
            <div key={p.label} className="fs-drop-item" onClick={() => { onSelect(p); setOpen(false); }}>
              {p.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Badges ───────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d) ? value : d.toLocaleString();
}

function RoleBadge({ role }) {
  if (!role) return <span style={{ color: "var(--fs-text-dim)" }}>—</span>;
  const isAdmin = role === "Admin";
  return (
    <span style={{
      fontFamily: "var(--fs-font-mono)", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.5px", textTransform: "uppercase",
      display: "inline-block", padding: "2px 7px", borderRadius: 5,
      color:      isAdmin ? "var(--fs-accent)"     : "var(--fs-text-dim)",
      background: isAdmin ? "var(--fs-accent-dim)" : "rgba(148,163,184,0.08)",
      border:     `1px solid ${isAdmin ? "rgba(124,106,247,0.25)" : "rgba(148,163,184,0.15)"}`,
    }}>
      {role}
    </span>
  );
}

function ActionTypeBadge({ value }) {
  if (!value) return <span style={{ color: "var(--fs-text-dim)" }}>—</span>;
  return (
    <span className="fs-badge fs-badge--core"
      style={{ textTransform: "uppercase", letterSpacing: "0.4px", fontSize: 9, padding: "2px 7px" }}>
      {value}
    </span>
  );
}

function StatusBadge({ success }) {
  return (
    <span style={{
      fontFamily: "var(--fs-font-mono)", fontSize: 10, fontWeight: 600,
      display: "inline-block", padding: "2px 7px", borderRadius: 5,
      color:      success ? "var(--fs-success-text)" : "var(--fs-error-text)",
      background: success ? "var(--fs-success-bg)"   : "var(--fs-error-bg)",
      border:     `1px solid ${success ? "var(--fs-success-border)" : "var(--fs-error-border)"}`,
    }}>
      {success ? "✓ OK" : "✕ Fail"}
    </span>
  );
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: "auditLogId", label: "ID", backendKey: "AuditLogId", width: 70,
    render: (row) => (
      <span className="fs-id-cell" style={{ fontSize: 11 }}>#{String(row.auditLogId ?? "—").padStart(4, "0")}</span>
    ),
  },
  {
    key: "timestamp", label: "Timestamp", backendKey: "Timestamp", width: 150,
    render: (row) => (
      <span style={{ fontFamily: "var(--fs-font-mono)", fontSize: 11 }}>{formatDate(row.timestamp)}</span>
    ),
  },
  {
    key: "userId", label: "User ID", backendKey: "UserId", width: 90,
    render: (row) => (
      <span className="fs-id-cell" style={{ fontSize: 11 }}>
        {row.userId != null ? `#${String(row.userId).padStart(4, "0")}` : "—"}
      </span>
    ),
  },
  {
    key: "username", label: "Username", backendKey: "Username", width: 120,
    render: (row) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="fs-avatar fs-avatar--sm">
          {(row.performedByUsername || "—")[0].toUpperCase()}
        </div>
        {row.performedByUsername || "—"}
      </div>
    ),
  },
  {
    key: "userRole", label: "Role", backendKey: "UserRole", width: 85,
    render: (row) => <RoleBadge role={row.userRole} />,
  },
  {
    key: "actionType", label: "Action Type", backendKey: "ActionType", width: 190,
    render: (row) => <ActionTypeBadge value={row.actionType} />,
  },
  {
    key: "entityName", label: "Entity", backendKey: "EntityName", width: 150,
    render: (row) => (
      <span style={{ fontFamily: "var(--fs-font-mono)", fontSize: 11, color: "var(--fs-text-dim)" }}>
        {row.entityName || "—"}
      </span>
    ),
  },
  {
    key: "success", label: "Status", backendKey: "Success", width: 90,
    render: (row) => <StatusBadge success={row.success} />,
  },
  {
    key: "errorMessage", label: "Error", backendKey: "ErrorMessage", width: 170,
    render: (row) => (
      <span style={{
        fontFamily: "var(--fs-font-mono)", fontSize: 10,
        color: row.errorMessage ? "var(--fs-error-text)" : "var(--fs-text-dim)",
      }}>
        {row.errorMessage || "—"}
      </span>
    ),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditLogs() {
  useFlexiSchemaCSS();
  const { theme } = useTheme();

  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(getSavedPageSize);
  const [totalCount,  setTotalCount]  = useState(0);
  const [activeRowId, setActiveRowId] = useState(null);

  const [sortBy,    setSortBy]    = useState("Timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  const [userId,     setUserId]     = useState("");
  const [username,   setUsername]   = useState("");
  const [success,    setSuccess]    = useState("");
  const [actionType, setActionType] = useState("");
  const [entityName, setEntityName] = useState("");
  const [fromDate,   setFromDate]   = useState("");
  const [toDate,     setToDate]     = useState("");
  const toDateInputRef = useRef(null);

  const [actionTypes, setActionTypes] = useState([]);
  const [entityNames, setEntityNames] = useState([]);

  useEffect(() => {
    getAuditLogActionTypes().then(setActionTypes).catch(() => {});
    getAuditLogEntityNames().then(setEntityNames).catch(() => {});
  }, []);

  const hasFilters = success || actionType || entityName || fromDate || toDate;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs({
        userId:     userId     || undefined,
        username:   username   || undefined,
        success:    success    || undefined,
        actionType: actionType || undefined,
        entityName: entityName || undefined,
        fromDate:   fromDate   || undefined,
        toDate:     toDate     || undefined,
        page, pageSize, sortBy, sortOrder,
      });
      setLogs(data.items ?? []);
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      if (err.errors && typeof err.errors === "object") {
        setError(Object.values(err.errors).flat().join(" • "));
      } else {
        setError(err?.message ?? "Failed to load audit logs");
      }
    } finally {
      setLoading(false);
    }
  }, [userId, username, fromDate, toDate, success, actionType, entityName, page, pageSize, sortBy, sortOrder]);

  // Reload when page, pageSize, or sort changes
  useEffect(() => { load(); }, [page, pageSize, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 1 and reload when any filter changes
  useEffect(() => {
    setPage(1);
    load();
  }, [userId, username, success, actionType, entityName, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = useCallback((col) => {
    if (sortBy === col.backendKey) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col.backendKey);
      setSortOrder("desc");
    }
    setPage(1);
  }, [sortBy]);

  function handlePageSizeChange(newSize) {
    savePageSize(newSize);
    setPageSize(newSize);
    setPage(1);
  }

  function patchFrom(val) {
    setFromDate(val);
    if (val) setTimeout(() => { try { toDateInputRef.current?.showPicker(); } catch { /* ignore */ } }, 50);
  }

  function handlePreset({ fromDate: f, toDate: t }) {
    setFromDate(f);
    setToDate(t);
    setPage(1);
  }

  function clearFilters() {
    setSuccess("");
    setActionType("");
    setEntityName("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  return (
    <div className="fs-root" data-theme={theme} data-density="compact">

      <div className="fs-page-header">
        <h1 className="fs-page-title">Audit <span>Logs</span></h1>
      </div>

      {/* ── Action bar ── */}
      <form className="fs-action-bar">
        <div className="fs-left-g">

          {/* User ID */}
          <div className="fs-search-wrap">
            <span className="fs-search-icon">⌕</span>
            <input
              className="fs-input"
              type="text"
              placeholder="User ID…"
              value={userId}
              onChange={e => { setUserId(e.target.value); setPage(1); }}
              style={{ width: 115 }}
            />
            {userId && (
              <button
                type="button"
                className="fs-search-clear"
                onMouseDown={e => { e.preventDefault(); setUserId(""); setPage(1); }}
                title="Clear user ID"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Username */}
          <div className="fs-search-wrap">
            <span className="fs-search-icon">⌕</span>
            <input
              className="fs-input"
              type="text"
              placeholder="Username…"
              value={username}
              onChange={e => { setUsername(e.target.value); setPage(1); }}
              style={{ width: 134 }}
            />
            {username && (
              <button
                type="button"
                className="fs-search-clear"
                onMouseDown={e => { e.preventDefault(); setUsername(""); setPage(1); }}
                title="Clear username"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Status */}
          <select
            className="fs-select"
            value={success}
            onChange={e => { setSuccess(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="true">✓ Success</option>
            <option value="false">✕ Failed</option>
          </select>

          {/* Action Type */}
          <select
            className="fs-select"
            value={actionType}
            onChange={e => { setActionType(e.target.value); setPage(1); }}
            style={{ width: 140, minWidth: 0 }}
          >
            <option value="">All Actions</option>
            {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Entity Name */}
          <select
            className="fs-select"
            value={entityName}
            onChange={e => { setEntityName(e.target.value); setPage(1); }}
            style={{ width: 140, minWidth: 0 }}
          >
            <option value="">All Entities</option>
            {entityNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Date presets */}
          <DatePresetDropdown onSelect={handlePreset} />

          {/* Date range */}
          <div className="fs-date-group">
            <span className="fs-date-sep">From</span>
            <input
              type="date"
              className="fs-date-input"
              value={fromDate}
              onChange={e => patchFrom(e.target.value)}
            />
            <span className="fs-date-sep">→</span>
            <input
              type="date"
              className="fs-date-input"
              value={toDate}
              ref={toDateInputRef}
              onChange={e => setToDate(e.target.value)}
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              className="fs-btn"
              onMouseDown={e => { e.preventDefault(); clearFilters(); }}
              title="Clear filters"
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
            onClick={() => { setPage(1); load(); }}
            disabled={loading}
            title="Refresh audit logs"
            aria-label="Refresh audit logs"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <i className={`fa-solid fa-rotate-right${loading ? " fa-spin" : ""}`} />
          </button>
        </div>
      </form>

      {error && (
        <div className="fs-toast fs-toast--error">
          <i className="fa-solid fa-circle-xmark" /> {error}
        </div>
      )}

      <div style={{ width: "100%", overflowX: "auto" }}>
        <ResizableTable
          columns={COLUMNS} rows={logs} rowKey={(row) => row.auditLogId}
          loading={loading} emptyMessage="No audit logs found."
          sortKey={sortBy} sortOrder={sortOrder} onSort={handleSort}
          activeRowId={activeRowId}
          onRowClick={(row) => setActiveRowId(row.auditLogId)}
          compact
        />
      </div>

      <Pagination
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

    </div>
  );
}

