// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { useTheme } from "@/hooks/useTheme";
import { getAdminConfigs, updateAdminConfig } from "@/features/admin/api/AdminConfigApi";
import AdminConfigModal from "@/features/admin/components/AdminConfigModal";
import ResizableTable from "@/components/ResizableTable";
import "@/styles/fs-tokens.css";
import "@/styles/fs-base.css";
import "./AdminConfigs.css";

function parseErrors(err) {
  if (err.errors && typeof err.errors === "object" && !Array.isArray(err.errors)) {
    const parsed = {};
    Object.entries(err.errors).forEach(([key, val]) => {
      const k = key.charAt(0).toLowerCase() + key.slice(1);
      parsed[k] = Array.isArray(val) ? val[0] : String(val);
    });
    return parsed;
  }
  if (Array.isArray(err.errors)) return { general: err.errors.join(" · ") };
  return { general: err.message ?? "An error occurred." };
}

function ValueBadge({ value }) {
  return (
    <span className="fs-config-value">{value ?? "—"}</span>
  );
}

export default function AdminConfigs() {
  useFlexiSchemaCSS();
  const { theme } = useTheme();

  const [configs,       setConfigs]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [searchTerm,    setSearchTerm]    = useState("");
  const [selectedId,    setSelectedId]    = useState(null);
  const [sortConfig,    setSortConfig]    = useState({ key: "id", direction: "asc" });
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType,    setStatusType]    = useState("success");
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [form,          setForm]          = useState({});
  const [formErrors,    setFormErrors]    = useState({});

  const toastTimerRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminConfigs();
      setConfigs(data ?? []);
    } catch (err) {
      setError(err?.message ?? "Failed to load configs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showStatus(msg, type = "success") {
    setStatusMessage(msg);
    setStatusType(type);
    
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    
    toastTimerRef.current = setTimeout(() => {
      setStatusMessage("");
    }, 3000);
  }

  // ── Accept an optional row so double-click works before state flushes ──
  const openEdit = useCallback((rowOrEvent) => {
    const target =
      rowOrEvent?.id
        ? rowOrEvent
        : configs.find(c => c.id === selectedId);
    if (!target) return;
    setForm({
      id:          target.id,
      key:         target.key         ?? "",
      value:       target.value       ?? "",
      description: target.description ?? "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  }, [selectedId, configs]);

  // ── Guard against saving when nothing has changed ───────────────────
  async function handleSave(payload) {
    try {
      const original = configs.find(c => c.id === payload.id);

      const hasChanges =
        payload.key         !== (original?.key         ?? "") ||
        payload.value       !== (original?.value       ?? "") ||
        payload.description !== (original?.description ?? "");

      if (!hasChanges) {
        setIsModalOpen(false);
        showStatus("No changes applied.", "success");
        return;
      }

      await updateAdminConfig(payload.id, payload);
      setConfigs(prev => prev.map(c => c.id === payload.id ? { ...c, ...payload } : c));
      showStatus("Config updated.");
      setIsModalOpen(false);
      setSelectedId(null);
    } catch (err) {
      setFormErrors(parseErrors(err));
      showStatus("Save failed.", "error");
    }
  }

  // ── Inline boolean toggle — no modal needed ───────────────────────────────
  async function handleToggle(config) {
    const newValue = config.value === "true" ? "false" : "true";
    const payload  = { ...config, value: newValue };
    try {
      await updateAdminConfig(config.id, payload);
      setConfigs(prev => prev.map(c => c.id === config.id ? payload : c));
      showStatus(`${config.key} set to ${newValue}.`);
    } catch {
      showStatus("Toggle failed.", "error");
    }
  }

  const sorted = useMemo(() => [...configs]
    .filter(c => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        c.key?.toLowerCase().includes(q) ||
        c.value?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const { key, direction } = sortConfig;
      const cmp = String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, { numeric: true });
      return direction === "asc" ? cmp : -cmp;
    }), [configs, searchTerm, sortConfig]);

  const handleSort = useCallback((col) => {
    setSortConfig(prev => ({
      key:       col.key,
      direction: prev.key === col.key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const columns = useMemo(() => [
    {
      key: "id", label: "ID", width: 72,
      render: (row) => <span className="fs-id-cell">#{String(row.id).padStart(4, "0")}</span>,
    },
    {
      key: "key", label: "Key", width: 280,
      render: (row) => <span className="fs-config-key">{row.key}</span>,
    },
    {
      key: "value", label: "Value", width: 130,
      render: (row) => {
        const isBool = row.value === "true" || row.value === "false";
        if (isBool) {
          const isOn = row.value === "true";
          return (
            <button
              className={`fs-toggle${isOn ? " fs-toggle--on" : ""}`}
              onClick={e => { e.stopPropagation(); handleToggle(row); }}
              title={`Click to set ${isOn ? "false" : "true"}`}
              aria-checked={isOn}
              role="switch"
            >
              <span className="fs-toggle-thumb" />
            </button>
          );
        }
        return <ValueBadge value={row.value} />;
      },
    },
    {
      key: "description", label: "Description", width: 260,
      render: (row) => <span className="fs-config-desc">{row.description}</span>,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [configs]);  // configs dep needed so handleToggle closure is fresh

  return (
    <div className="fs-root" data-theme={theme}>

      <div className="fs-topbar">
        <div className="fs-logo">FlexiSchema <span>CRM</span></div>
      </div>

      {/* ── Action bar ── */}
      <div className="fs-action-bar">
        <div className="fs-left-g">
          <div className="fs-search-wrap">
            <i className="fa-solid fa-magnifying-glass fs-search-icon" />
            <input
              className="fs-input"
              type="text"
              placeholder="Search key, value or description…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="fs-btn-clear"
                onMouseDown={e => { e.preventDefault(); setSearchTerm(""); }}
                title="Clear search"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        <div className="fs-right-g">
          <button className="fs-btn" onClick={load} disabled={loading}>
            <i className={`fa-solid fa-rotate-right${loading ? " fa-spin" : ""}`} /> Refresh
          </button>
          <div className="fs-divider" />
          <button className="fs-btn" onClick={() => openEdit()} disabled={!selectedId}>
            <i className="fa-solid fa-pen-to-square" /> Edit
          </button>
        </div>
      </div>

      {/* ── Status toasts ── */}
      {statusMessage && (
        <div className={`fs-toast ${statusType === "error" ? "fs-toast--error" : "fs-toast--success"}`}>
          {statusType === "error"
            ? <i className="fa-solid fa-circle-xmark" />
            : <i className="fa-solid fa-circle-check" />}
          {statusMessage}
        </div>
      )}
      {error && !statusMessage && (
        <div className="fs-toast fs-toast--error">
          <i className="fa-solid fa-circle-xmark" /> {error}
        </div>
      )}

      <ResizableTable
        columns={columns}
        rows={sorted}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No configs found."
        sortKey={sortConfig.key}
        sortOrder={sortConfig.direction}
        onSort={handleSort}
        selectedId={selectedId}
        onRowClick={(row) => setSelectedId(prev => prev === row.id ? null : row.id)}
        onRowDoubleClick={(row) => openEdit(row)}
      />

      {/* ── Pagination / result count ── */}
      <div className="fs-pagination">
        <span className="fs-page-info">
          {sorted.length} config{sorted.length !== 1 ? "s" : ""}
          {searchTerm ? ` matching "${searchTerm}"` : ""}
        </span>
      </div>

      <AdminConfigModal
        open={isModalOpen}
        form={form}
        onChange={setForm}
        onSave={handleSave}
        onClose={() => { setIsModalOpen(false); setFormErrors({}); }}
        errors={formErrors}
      />
    </div>
  );
}

