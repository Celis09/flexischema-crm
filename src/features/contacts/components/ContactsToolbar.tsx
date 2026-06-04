/* eslint-disable react-hooks/refs */
import { useState, useRef, useMemo, useEffect } from "react";
import { getDateRangePresets } from "@/features/admin/api/DateRangePresets";

const CONTACT_STATUSES = ["Active", "Inactive", "Archived"];

const MODE_SWITCH_STYLE: any = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
  cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
  border: "1px solid var(--fs-border)",
  transition: "all 0.15s", flexShrink: 0,
};

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
  aiSearchMode,
  onAiSearchModeChange,
  onAiSearch,
  onAiClear,
  aiSearchInput,
  onAiSearchInputChange,
  isAiFallback,
  aiTotalCount,
  recentAiSearches,
}) {
  const [dropOpen, setDropOpen] = useState(false);

  useEffect(() => {
    const handler = () => setDropOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <>
    <form className="fs-action-bar" onSubmit={aiSearchMode ? (e) => e.preventDefault() : filters.handleSearch}>
      {/* ── Left group ── */}
      <div className="fs-left-g">
        {/* ── AI / Regular toggle ── */}
        <div
          onClick={() => onAiSearchModeChange?.(!aiSearchMode)}
          style={{
            ...MODE_SWITCH_STYLE,
            color: aiSearchMode ? "var(--fs-text)" : "var(--fs-text-dim)",
            background: aiSearchMode ? "var(--fs-accent-dim)" : "transparent",
          }}
        >
          <i className={`fa-solid ${aiSearchMode ? "fa-robot" : "fa-magnifying-glass"}`} style={{ fontSize: 11 }} />
          {aiSearchMode ? "AI" : "Regular"}
        </div>

        {!aiSearchMode && (
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
        )}

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

    {aiSearchMode && isAiFallback && (
      <div style={{
        padding: "6px 16px", background: "var(--fs-warning-bg, #FFFBEB)",
        borderBottom: "1px solid var(--fs-warning-border, #FDE68A)",
        color: "var(--fs-warning-text, #B45309)", fontSize: 12,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 11 }} />
        AI search unavailable — showing standard results
      </div>
    )}

    {aiSearchMode && (
      <div style={{
        padding: "10px 16px",
        background: "var(--fs-glass)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--fs-border)",
        borderRadius: "var(--fs-radius-lg)",
        marginBottom: 16,
        boxShadow: "var(--fs-shadow)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa-solid fa-robot" style={{ fontSize: 16, color: "var(--fs-accent)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder='Ask AI to find contacts… e.g. "contacts added last week"'
            value={aiSearchInput}
            onChange={(e) => onAiSearchInputChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && aiSearchInput?.trim()) {
                e.preventDefault();
                onAiSearch?.(aiSearchInput.trim());
              }
            }}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "var(--fs-radius)", fontSize: 14,
              fontFamily: "inherit",
              border: "1px solid var(--fs-accent)",
              background: "var(--fs-surface-input)",
              color: "var(--fs-text)",
              outline: "none",
              boxShadow: "0 0 0 3px var(--fs-accent-glow)",
            }}
          />
          {aiSearchInput && (
            <button
              type="button"
              onClick={() => { onAiSearchInputChange?.(""); onAiClear?.(); }}
              style={{
                background: "none", border: "none", color: "var(--fs-text-dim)",
                cursor: "pointer", padding: 6, fontSize: 16, flexShrink: 0,
              }}
              title="Clear"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
          <button
            type="button"
            onClick={() => aiSearchInput?.trim() && onAiSearch?.(aiSearchInput.trim())}
            disabled={!aiSearchInput?.trim() || loading}
            style={{
              background: "var(--fs-accent)", border: "none", color: "#fff",
              padding: "10px 22px", borderRadius: "var(--fs-radius)", fontSize: 14, fontWeight: 700,
              cursor: loading ? "not-allowed" : (aiSearchInput?.trim() ? "pointer" : "not-allowed"),
              fontFamily: "inherit", opacity: (loading || !aiSearchInput?.trim()) ? 0.5 : 1,
              boxShadow: aiSearchInput?.trim() && !loading ? "0 4px 15px var(--fs-accent-glow)" : "none",
              flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {loading ? (
              <i className="fa-solid fa-circle-notch fa-spin" />
            ) : (
              <i className="fa-solid fa-robot" />
            )}
            {loading ? "Searching…" : "AI Search"}
          </button>
        </div>

        {!aiSearchInput && !aiTotalCount && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              display: "flex", gap: 6,
              fontSize: 11, color: "var(--fs-text-dim)", alignItems: "center",
            }}>
              <span>Try:</span>
              {["contacts added last week", "manager is Marco", "recent contacts"].map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { onAiSearchInputChange?.(ex); onAiSearch?.(ex); }}
                  style={{
                    background: "var(--fs-accent-dim)", border: "1px solid var(--fs-border)",
                    color: "var(--fs-accent)", borderRadius: 12, padding: "2px 10px",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
            {recentAiSearches?.length > 0 && (
              <div style={{
                display: "flex", gap: 6, marginTop: 6,
                fontSize: 11, color: "var(--fs-text-dim)", alignItems: "center",
              }}>
                <span style={{ opacity: 0.6 }}>Recent:</span>
                {recentAiSearches.slice(0, 3).map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onAiSearchInputChange?.(ex); onAiSearch?.(ex); }}
                    style={{
                      background: "none", border: "1px solid var(--fs-border)",
                      color: "var(--fs-text-dim)", borderRadius: 12, padding: "2px 10px",
                      fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {aiTotalCount > 0 && (
          <div style={{
            marginTop: 6, fontSize: 12, color: "var(--fs-text-dim)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <i className="fa-solid fa-robot" style={{ fontSize: 10, color: "var(--fs-accent)" }} />
            AI found <strong style={{ color: "var(--fs-text)" }}>{aiTotalCount}</strong> contact{aiTotalCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    )}
  </>);
}
