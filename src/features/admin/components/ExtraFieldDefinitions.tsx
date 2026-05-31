// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { useTheme } from "@/hooks/useTheme";
import useExtraFieldDefinitions from "@/features/admin/hooks/useExtraFieldDefinitions";
import DefinitionModal, { EMPTY_DEFINITION_FORM } from "@/features/admin/components/DefinitionModal";
import ConfirmModal from "@/features/contacts/components/ConfirmModal";
import { getAdminConfigInt } from "@/features/admin/api/AdminConfigApi";
import ResizableTable from "@/components/ResizableTable";
import Pagination from "@/components/Pagination";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_KEY  = "extraFieldDefs_pageSize";
const PAGE_SIZE_OPTS = [10, 20, 50, 100];

const CONFIRM_CLOSED = { open: false, title: "", message: "", confirmLabel: "Confirm", danger: false, onConfirm: () => {} };

function getStoredPageSize() {
  try {
    const raw = localStorage.getItem(PAGE_SIZE_KEY);
    const parsed = Number(raw);
    return PAGE_SIZE_OPTS.includes(parsed) ? parsed : PAGE_SIZE_OPTS[0];
  } catch {
    return PAGE_SIZE_OPTS[0];
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusPill({ active }) {
  return (
    <span style={{
      fontFamily:    "var(--fs-font-mono)",
      fontSize:      11,
      fontWeight:    600,
      letterSpacing: ".3px",
      display:       "inline-block",
      padding:       "3px 9px",
      borderRadius:  6,
      borderWidth:   1,
      borderStyle:   "solid",
      color:         active ? "var(--fs-success-text)" : "var(--fs-error-text)",
      background:    active ? "var(--fs-success-bg)"   : "var(--fs-error-bg)",
      borderColor:   active ? "var(--fs-success-border)" : "var(--fs-error-border)",
    }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RequiredPill({ required }) {
  return (
    <span style={{
      fontFamily:    "var(--fs-font-mono)",
      fontSize:      11,
      fontWeight:    600,
      letterSpacing: ".3px",
      display:       "inline-block",
      padding:       "3px 9px",
      borderRadius:  6,
      borderWidth:   1,
      borderStyle:   "solid",
      color:         required ? "var(--fs-warning-text, #92400E)" : "var(--fs-text-dim)",
      background:    required ? "var(--fs-warning-bg,  #FEF3C7)" : "transparent",
      borderColor:   required ? "var(--fs-warning-border, #FCD34D)" : "transparent",
    }}>
      {required ? "Required" : "Optional"}
    </span>
  );
}

const DEFINITION_STATUSES = ["Active", "Inactive"];
const REQUIRED_STATUSES   = ["Required", "Optional"];

function StatusDropdown({ currentStatus, onSelect }) {
  return (
    <select
      className="fs-status-select"
      value={currentStatus ? "Active" : "Inactive"}
      onChange={e => onSelect(e.target.value === "Active")}
      onClick={e => e.stopPropagation()}
    >
      {DEFINITION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function RequiredDropdown({ currentRequired, onSelect, disabled }) {
  return (
    <select
      className="fs-status-select"
      value={currentRequired ? "Required" : "Optional"}
      onChange={e => onSelect(e.target.value === "Required")}
      onClick={e => e.stopPropagation()}
      disabled={disabled}
    >
      {REQUIRED_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ExtraFieldDefinitions() {
  useFlexiSchemaCSS();
  const { theme } = useTheme();

  const {
    definitions, loading, error, load,
    createDefinition, saveDefinition,
    toggleDefinitionStatus, toggleDefinitionRequired,
    isActive,
  } = useExtraFieldDefinitions();

  const [maxFields,           setMaxFields]           = useState(null);
  const [selectedIds,         setSelectedIds]         = useState([]);
  const [dropOpen,            setDropOpen]            = useState(false);
  const [togglingIds,         setTogglingIds]         = useState(new Set());
  const [togglingRequiredIds, setTogglingRequiredIds] = useState(new Set());
  const [sortConfig,          setSortConfig]          = useState({ key: "extraFieldDefinitionId", direction: "asc" });
  const [searchTerm,          setSearchTerm]          = useState("");
  const [statusFilter,        setStatusFilter]        = useState("");
  const [isModalOpen,         setIsModalOpen]         = useState(false);
  const [isEditing,           setIsEditing]           = useState(false);
  const [form,                setForm]                = useState(EMPTY_DEFINITION_FORM);
  const [formErrors,          setFormErrors]          = useState({});
  const [statusMessage,       setStatusMessage]       = useState("");
  const [statusType,          setStatusType]          = useState("success");
  const [activeRowId,         setActiveRowId]         = useState(null);

  // ── Confirm modal ──────────────────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState(CONFIRM_CLOSED);

  function openConfirm({ title, message, confirmLabel = "Confirm", danger = false, onConfirm }) {
    setConfirmState({ open: true, title, message, confirmLabel, danger, onConfirm });
  }
  function closeConfirm() {
    setConfirmState(CONFIRM_CLOSED);
  }

  // ── Pagination state ──────────────────────────────────────────────────────
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(getStoredPageSize);

  useEffect(() => {
    try { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); } catch { /* ignore */ }
  }, [pageSize]);

  useEffect(() => { setPage(1); }, [searchTerm, statusFilter, sortConfig]);

  // ── Other effects ─────────────────────────────────────────────────────────

  useEffect(() => {
    getAdminConfigInt("MaxExtraFieldsPerContact", null).then(setMaxFields);
  }, []);

  useEffect(() => {
    const handler = () => setDropOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const activeCount = definitions.filter(d => d.isActive).length;
  const atLimit     = maxFields !== null && activeCount >= maxFields;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showStatus(msg, type = "success") {
    setStatusMessage(msg);
    setStatusType(type);
    setTimeout(() => setStatusMessage(""), 3000);
  }

  function openAdd() {
    if (atLimit) return;
    setIsEditing(false);
    setForm(EMPTY_DEFINITION_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEdit(rowArg) {
    const def = rowArg?.extraFieldDefinitionId
      ? rowArg
      : definitions.find(d => d.extraFieldDefinitionId === selectedIds[0]);

    if (!def) return;
    if (!rowArg?.extraFieldDefinitionId && selectedIds.length !== 1) return;

    setIsEditing(true);
    setForm({
      extraFieldDefinitionId: def.extraFieldDefinitionId,
      fieldName:  def.fieldName  ?? "",
      fieldType:  def.fieldType  ?? "",
      isRequired: def.isRequired ?? false,
      isActive:   def.isActive   ?? true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleSave(payload, { onSuccess } = {}) {
    try {
      let savedId;

      if (isEditing) {
        const original = definitions.find(
          d => d.extraFieldDefinitionId === payload.extraFieldDefinitionId
        );

        const hasChanges =
          payload.fieldName  !== (original?.fieldName  ?? "") ||
          payload.fieldType  !== (original?.fieldType  ?? "") ||
          payload.isRequired !== (original?.isRequired ?? false) ||
          payload.isActive   !== (original?.isActive   ?? true);

        if (!hasChanges) {
          setIsModalOpen(false);
          showStatus("No changes applied.", "success");
          return;
        }

        await saveDefinition(payload.extraFieldDefinitionId, payload);
        savedId = payload.extraFieldDefinitionId;
        showStatus("Field definition updated.");
      } else {
        savedId = await createDefinition(payload);
        showStatus("Field definition created.");
      }

      const freshDefs = await load({ isActive });
      const listToSearch = freshDefs || definitions; 

      if (payload.fieldType === "Option" && typeof onSuccess === "function") {
        const refreshed = listToSearch.find(
          d => d.extraFieldDefinitionId === savedId
        );
        const existingOptions = (refreshed?.options ?? []).map((val, idx) => ({
          extraFieldOptionId: null,
          optionValue:        val,
          displayOrder:       idx,
        }));
        onSuccess(savedId, existingOptions);
      } else {
        setIsModalOpen(false);
        setSelectedIds([]);
      }
    } catch (err) {
      const raw = err?.response?.data?.errors ?? err?.errors ?? {};

      if (typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw).length > 0) {
        const normalized = {};
        Object.entries(raw).forEach(([k, v]) => {
          const msg = Array.isArray(v) ? v[0] : v;
          if (k.startsWith("$") || k.includes(".")) {
            normalized.general = normalized.general
              ? `${normalized.general} · ${msg}`
              : msg;
          } else {
            const camel = k.charAt(0).toLowerCase() + k.slice(1);
            normalized[camel] = msg;
          }
        });
        setFormErrors(normalized);
      } else {
        setFormErrors({ general: err?.message ?? "Failed to save." });
      }

      showStatus("Save failed.", "error");
    }
  }

  async function handleToggle(def) {
    const id = def.extraFieldDefinitionId;
    if (togglingIds.has(id)) return;
    setTogglingIds(prev => new Set(prev).add(id));
    try {
      await toggleDefinitionStatus(id);
      await load({ isActive });
      showStatus(`"${def.fieldName}" ${!def.isActive ? "activated" : "deactivated"}.`);
    } catch (err) {
      showStatus(err?.message ?? "Status change failed.", "error");
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function handleToggleRequired(def, newValue) {
    const id = def.extraFieldDefinitionId;
    if (togglingRequiredIds.has(id)) return;
    setTogglingRequiredIds(prev => new Set(prev).add(id));
    try {
      await toggleDefinitionRequired(id, newValue);
      await load({ isActive });
      showStatus(`"${def.fieldName}" marked as ${newValue ? "Required" : "Optional"}.`);
    } catch (err) {
      showStatus(err?.message ?? "Required change failed.", "error");
    } finally {
      setTogglingRequiredIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  // ── ConfirmModal driven Bulk Actions ───────────────────────────────────────
  
  function handleBulkToggle(activate) {
    if (selectedIds.length === 0) return;
    setDropOpen(false);
    const label = activate ? "Activate" : "Deactivate";
    openConfirm({
      title:        `${label} Definitions`,
      message:      `${label} ${selectedIds.length} definition(s)?`,
      confirmLabel: label,
      danger:       !activate,
      onConfirm:    async () => {
        try {
          let changedCount = 0;
          
          for (const id of selectedIds) {
            const def = definitions.find(d => d.extraFieldDefinitionId === id);
            if (!def) continue;
            
            if (def.isActive !== activate) {
              await toggleDefinitionStatus(id);
              changedCount++;
            }
          }
          
          await load({ isActive });
          setSelectedIds([]);
          
          if (changedCount === 0) {
            showStatus(`No changes applied. Selected definition(s) are already ${activate ? "Active" : "Inactive"}.`, "success");
          } else {
            showStatus(`${changedCount} definition(s) ${activate ? "activated" : "deactivated"}.`);
          }
        } catch (err) {
          showStatus(err?.message ?? "Bulk action failed.", "error");
        }
      },
    });
  }

  function handleBulkToggleRequired(required) {
    if (selectedIds.length === 0) return;
    setDropOpen(false);
    const label = required ? "Mark as Required" : "Mark as Optional";
    openConfirm({
      title:        label,
      message:      `${label} for ${selectedIds.length} definition(s)?`,
      confirmLabel: label,
      danger:       false,
      onConfirm:    async () => {
        try {
          let changedCount = 0;
          
          for (const id of selectedIds) {
            const def = definitions.find(d => d.extraFieldDefinitionId === id);
            if (!def) continue;
            
            if (def.isRequired !== required) {
              await toggleDefinitionRequired(id, required);
              changedCount++;
            }
          }
          
          await load({ isActive });
          setSelectedIds([]);
          
          if (changedCount === 0) {
             showStatus(`No changes applied. Selected definition(s) are already ${required ? "Required" : "Optional"}.`, "success");
          } else {
             showStatus(`${changedCount} definition(s) marked as ${required ? "Required" : "Optional"}.`);
          }
        } catch (err) {
          showStatus(err?.message ?? "Bulk action failed.", "error");
        }
      },
    });
  }

  // ── Sorting + filtering ───────────────────────────────────────────────────

  const sorted = useMemo(() => [...definitions]
    .filter(d => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        d.fieldName?.toLowerCase().includes(q) ||
        d.fieldType?.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === ""     ? true :
        statusFilter === "true" ? d.isActive :
        !d.isActive;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const { key, direction } = sortConfig;
      if (key === "toggle" || key === "isActive") {
        const cmp = (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
        return direction === "asc" ? cmp : -cmp;
      }
      if (key === "isRequired") {
        const cmp = (b.isRequired ? 1 : 0) - (a.isRequired ? 1 : 0);
        return direction === "asc" ? cmp : -cmp;
      }
      const cmp = String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, { numeric: true });
      return direction === "asc" ? cmp : -cmp;
    }), [definitions, searchTerm, statusFilter, sortConfig]);

  // ── Pagination slice ──────────────────────────────────────────────────────

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSort = (col) => {
    if (col.key === "toggle" || col.key === "select" || col.key === "changeRequired") return;
    setSortConfig(prev => ({
      key:       col.key,
      direction: prev.key === col.key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handlePageChange     = useCallback((n) => setPage(n), []);
  const handlePageSizeChange = useCallback((n) => { setPageSize(n); setPage(1); }, []);

  // ── Selection helpers ─────────────────────────────────────────────────────

  const allSelected  = pagedRows.length > 0 && pagedRows.every(d => selectedIds.includes(d.extraFieldDefinitionId));
  const someSelected = pagedRows.some(d => selectedIds.includes(d.extraFieldDefinitionId));

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo(() => [
    {
      key:          "select",
      label:        "",
      width:        40,
      sortable:     false,
      skipRowClick: true,
      renderHeader: () => (
        <input
          type="checkbox"
          checked={allSelected}
          ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
          onChange={e => setSelectedIds(e.target.checked
            ? pagedRows.map(d => d.extraFieldDefinitionId)
            : []
          )}
          onClick={e => e.stopPropagation()}
          title="Select all on this page"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.extraFieldDefinitionId)}
          onChange={() => toggleSelect(row.extraFieldDefinitionId)}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      key: "extraFieldDefinitionId", label: "ID", width: 72,
      render: (row) => (
        <span className="fs-id-cell">#{String(row.extraFieldDefinitionId).padStart(4, "0")}</span>
      ),
    },
    {
      key: "fieldName", label: "Name", width: 220,
      render: (row) => <span className="fs-uname">{row.fieldName}</span>,
    },
    {
      key: "fieldType", label: "Type", width: 140,
      render: (row) => (
        <span className="fs-badge fs-badge--core" style={{ textTransform: "capitalize" }}>
          {row.fieldType}
        </span>
      ),
    },
    {
      key: "isRequired", label: "Required", width: 120,
      render: (row) => <RequiredPill required={row.isRequired} />,
    },
    {
      key: "changeRequired", label: "Change Required", width: 150,
      sortable: false, skipRowClick: true,
      render: (row) => (
        <RequiredDropdown
          currentRequired={row.isRequired}
          disabled={togglingRequiredIds.has(row.extraFieldDefinitionId)}
          onSelect={newValue => handleToggleRequired(row, newValue)}
        />
      ),
    },
    {
      key: "isActive", label: "Status", width: 120,
      render: (row) => <StatusPill active={row.isActive} />,
    },
    {
      key: "toggle", label: "Change Status", width: 140,
      sortable: false, skipRowClick: true,
      render: (row) => (
        <StatusDropdown
          currentStatus={row.isActive}
          onSelect={activate => {
            if (activate && !row.isActive && atLimit) {
              showStatus(
                `Cannot activate: limit of ${maxFields} active field${maxFields === 1 ? "" : "s"} reached.`,
                "error"
              );
              return;
            }
            handleToggle({ ...row, isActive: !activate });
          }}
        />
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [selectedIds, allSelected, someSelected, pagedRows, atLimit, maxFields, togglingRequiredIds]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fs-root" data-theme={theme}>

      <div className="fs-topbar">
        <div className="fs-logo">Flexi<span>Schema</span></div>
      </div>

      <div className="fs-action-bar">
        <div className="fs-left-g">

          <div className="fs-search-wrap">
            <i className="fa-solid fa-magnifying-glass fs-search-icon" />
            <input
              className="fs-input"
              type="text"
              placeholder="Search name or type…"
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

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="fs-select"
          >
            <option value="">All statuses</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>

          {statusFilter && (
            <button
              className="fs-btn"
              onMouseDown={e => { e.preventDefault(); setStatusFilter(""); }}
              title="Clear filter"
            >
              <i className="fa-solid fa-xmark" /> Clear Filters
            </button>
          )}

          {maxFields !== null && (
            <>
              <div className="fs-divider" />
              <span style={{
                fontSize:     12,
                fontFamily:   "var(--fs-font-mono)",
                color:        atLimit ? "var(--fs-error-text)" : "var(--fs-text-dim)",
                background:   atLimit ? "var(--fs-error-bg)"  : "transparent",
                border:       atLimit ? "1px solid var(--fs-error-border)" : "none",
                borderRadius: 6,
                padding:      atLimit ? "3px 9px" : 0,
              }}>
                {atLimit
                  ? `⚠ Limit reached (${activeCount}/${maxFields})`
                  : `${activeCount}/${maxFields} active`}
              </span>
            </>
          )}

        </div>

        <div className="fs-right-g">

          <div style={{ position: "relative" }}>
            <button
              className="fs-btn"
              disabled={selectedIds.length === 0}
              style={selectedIds.length > 0 ? {
                background:  "var(--fs-purple-tint, #EEEDFE)",
                color:       "var(--fs-purple-dark, #3C3489)",
                borderColor: "var(--fs-purple-mid,  #AFA9EC)",
              } : {}}
              onClick={e => { e.stopPropagation(); setDropOpen(o => !o); }}
            >
              Batch{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
              <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
            </button>
            <div className={`fs-drop${dropOpen ? " fs-open" : ""}`}>
              <div className="fs-drop-item" onClick={() => handleBulkToggle(true)}>
                Set to Active
              </div>
              <div className="fs-drop-item" onClick={() => handleBulkToggle(false)}>
                Set to Inactive
              </div>
              <hr className="fs-drop-hr" />
              <div className="fs-drop-item" onClick={() => handleBulkToggleRequired(true)}>
                Set to Required
              </div>
              <div className="fs-drop-item" onClick={() => handleBulkToggleRequired(false)}>
                Set to Optional
              </div>
            </div>
          </div>

          <div className="fs-divider" />

          <button className="fs-btn" onClick={() => load({ isActive })} disabled={loading}>
            <i className={`fa-solid fa-rotate-right${loading ? " fa-spin" : ""}`} /> Refresh
          </button>
          <button className="fs-btn" onClick={openEdit} disabled={selectedIds.length !== 1}>
            <i className="fa-solid fa-pen-to-square" /> Edit
          </button>
          <button className="fs-btn fs-btn--primary" onClick={openAdd} disabled={atLimit}>
            <i className="fa-solid fa-plus" /> Add
          </button>

        </div>
      </div>

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
        rows={pagedRows}
        rowKey={(row) => row.extraFieldDefinitionId}
        loading={loading}
        emptyMessage="No field definitions found."
        sortKey={sortConfig.key}
        sortOrder={sortConfig.direction}
        onSort={handleSort}
        activeRowId={activeRowId}
        selectedIds={selectedIds}
        onRowClick={(row) => {
          const id = row.extraFieldDefinitionId;
          setActiveRowId(prev => prev === id ? null : id);
        }}
        onRowDoubleClick={openEdit}
        getRowStyle={(row) => ({ opacity: row.isActive ? 1 : 0.55 })}
      />

      <Pagination
        page={page}
        totalCount={sorted.length}
        pageSize={pageSize}
        loading={loading}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={PAGE_SIZE_OPTS}
      />

      <DefinitionModal
        open={isModalOpen}
        editing={isEditing}
        form={form}
        onChange={setForm}
        onSave={handleSave}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedIds([]);
        }}
        errors={formErrors}
      />

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}

