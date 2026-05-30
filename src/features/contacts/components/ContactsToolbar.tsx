/* eslint-disable react-hooks/refs */
import { useState, useRef, useMemo, useEffect } from "react";
import { getDateRangePresets } from "@/features/admin/api/DateRangePresets";

const CONTACT_STATUSES = ["Active", "Inactive", "Archived"];

// ─── DatePresetDropdown ───────────────────────────────────────────────────────
function DatePresetDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const presets = useMemo(() => getDateRangePresets(), []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="fs-btn"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        title="Date presets"
      >
        <i className="fa-solid fa-calendar-days" /> Presets
        <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
      </button>
      {open && (
        <div className="fs-drop fs-open" style={{ minWidth: 160 }}>
          {presets.map((p) => (
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
}

// ─── ContactsToolbar ──────────────────────────────────────────────────────────
export default function ContactsToolbar({
  filters,
  colConfig,
  selectedIds,
  isAdmin,
  canAdd,
  canEdit,
  loading,
  drawerEnabled,
  actions,
}) {
  const [dropOpen, setDropOpen] = useState(false);

  useEffect(() => {
    const handler = () => setDropOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <form className="fs-action-bar" onSubmit={filters.handleSearch}>
      {/* ── Left group ── */}
      <div className="fs-left-g">
        <div className="fs-search-wrap">
          <span className="fs-search-icon">⌕</span>
          <input
            className="fs-input"
            type="text"
            placeholder="Search contacts..."
            value={filters.searchTerm}
            onChange={(e) => filters.setSearchTerm(e.target.value)}
          />
          {filters.hasSearch && (
            <button
              type="button"
              className="fs-search-clear"
              onMouseDown={(e) => { e.preventDefault(); filters.clearSearch(); }}
              title="Clear search"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        {isAdmin && (
          <select
            className="fs-select"
            value={filters.filterStatus}
            onChange={(e) => filters.setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {isAdmin && <DatePresetDropdown onSelect={filters.applyPreset} />}

        {isAdmin && (
          <div className="fs-date-group">
            <span className="fs-date-sep">From</span>
            <input
              type="date"
              className="fs-date-input"
              value={filters.fromDate}
              onChange={(e) => filters.setFromDate(e.target.value)}
            />
            <span className="fs-date-sep">→</span>
            <input
              type="date"
              className="fs-date-input"
              value={filters.toDate}
              ref={filters.toDateInputRef}
              onChange={(e) => filters.setToDate(e.target.value)}
            />
          </div>
        )}

        {filters.hasFilters && (
          <button
            type="button"
            className="fs-btn"
            onMouseDown={(e) => { e.preventDefault(); filters.clearFilters(); }}
            title="Clear filters"
          >
            <i className="fa-solid fa-xmark" /> Clear Filters
          </button>
        )}
      </div>

      {/* ── Right group ── */}
      <div className="fs-right-g">
        {isAdmin && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="fs-btn"
              disabled={selectedIds.length === 0}
              style={
                selectedIds.length > 0
                  ? {
                      background: "var(--fs-purple-tint, #EEEDFE)",
                      color: "var(--fs-purple-dark, #3C3489)",
                      borderColor: "var(--fs-purple-mid,  #AFA9EC)",
                    }
                  : {}
              }
              onClick={(e) => { e.stopPropagation(); setDropOpen((o) => !o); }}
            >
              <i className="fa-solid fa-layer-group" />
              Batch{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
              <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
            </button>
            <div className={`fs-drop${dropOpen ? " fs-open" : ""}`}>
              {CONTACT_STATUSES.map((s) => (
                <div
                  key={s}
                  className="fs-drop-item"
                  onClick={() => { actions.handleBulkStatus(s); setDropOpen(false); }}
                >
                  Set to {s}
                </div>
              ))}
              <div style={{ height: 1, background: "var(--fs-border)", margin: "4px 0" }} />
              <div
                className="fs-drop-item"
                onClick={() => { actions.openExportModal(); setDropOpen(false); }}
              >
                <i className="fa-solid fa-download" style={{ marginRight: 6, opacity: 0.7 }} />
                Export selected
              </div>
            </div>
          </div>
        )}

        <div className="fs-divider" />

        <button
          type="button"
          className="fs-icon-btn"
          onClick={actions.triggerRefresh}
          disabled={loading}
          title="Refresh contacts"
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          <i className={`fa-solid fa-rotate-right${loading ? " fa-spin" : ""}`} />
        </button>

        <button
          type="button"
          className="fs-icon-btn"
          onClick={colConfig.openColumnManager}
          title="Manage columns"
        >
          ☰
        </button>

        <button
          type="button"
          className="fs-icon-btn"
          onClick={actions.toggleDrawerEnabled}
          title={drawerEnabled ? "Disable detail drawer" : "Enable detail drawer"}
          aria-pressed={drawerEnabled}
          style={{
            color: drawerEnabled ? "var(--fs-accent)" : "var(--fs-text-dim)",
            background: drawerEnabled ? "var(--fs-accent-dim)" : "transparent",
            border: drawerEnabled ? "1px solid var(--fs-accent)" : undefined,
            opacity: drawerEnabled ? 1 : 0.55,
          }}
        >
          ▷
        </button>

        {isAdmin && (
          <button type="button" className="fs-icon-btn" onClick={actions.openImportModal} title="Import CSV">
            ↑
          </button>
        )}

        {(isAdmin || canEdit) && (
          <button type="button" className="fs-icon-btn" onClick={actions.openExportModal} title="Export CSV">
            ↓
          </button>
        )}

        {(isAdmin || canEdit) && (
          <button type="button" className="fs-icon-btn" onClick={actions.handlePrint} title="Print">
            ⎙
          </button>
        )}

        <div className="fs-divider" />

        {canEdit && (
          <button
            type="button"
            className="fs-btn"
            onClick={actions.openEditModal}
            disabled={selectedIds.length !== 1}
          >
            <i className="fa-solid fa-pen-to-square" /> Edit
          </button>
        )}
        {canAdd && (
          <button type="button" className="fs-btn fs-btn--primary" onClick={actions.openAddModal}>
            <i className="fa-solid fa-plus" /> New Record
          </button>
        )}
      </div>
    </form>
  );
}
