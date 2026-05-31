// @ts-nocheck
import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { getUsers, createUser, updateUser, changeUserStatus } from "@/features/admin/api/UsersApi";
import UserModal from "@/features/admin/components/UserModal";
import ConfirmModal from "@/features/contacts/components/ConfirmModal";
import ResizableTable from "@/components/ResizableTable";
import Pagination from "@/components/Pagination";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getDateRangePresets } from "@/features/admin/api/DateRangePresets";
import "@/styles/fs-tokens.css";
import "@/components/ModalBase.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_STATUSES = ["Active", "Inactive", "Suspended"];

const CONFIRM_CLOSED = { open: false, title: "", message: "", confirmLabel: "Confirm", danger: false, onConfirm: () => {} };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d) ? val : d.toLocaleDateString();
}

function parseErrors(err) {
  if (err.errors && typeof err.errors === "object" && !Array.isArray(err.errors)) {
    const parsed = {};
    Object.entries(err.errors).forEach(([key, val]) => {
      const k = key.charAt(0).toLowerCase() + key.slice(1);
      parsed[k] = Array.isArray(val) ? val[0] : String(val);
    });
    return parsed;
  }
  if (Array.isArray(err.errors)) {
    const keyed = {};
    err.errors.forEach(msg => {
      const lower = msg.toLowerCase();
      if (lower.includes("username")) { keyed.username = keyed.username ?? msg; return; }
      if (lower.includes("email"))    { keyed.email    = keyed.email ? `${keyed.email} · ${msg}` : msg; return; }
      if (lower.includes("password")) { keyed.password = keyed.password ?? msg; return; }
      if (lower.includes("role"))     { keyed.role     = keyed.role ?? msg; return; }
      keyed.general = keyed.general ? `${keyed.general} · ${msg}` : msg;
    });
    return keyed;
  }
  return { general: err.message ?? "An error occurred." };
}

// ─── Protection helpers ───────────────────────────────────────────────────────

function buildProtectionHelpers(users, currentUserId) {
  const activeAdminCount = users.filter(
    u => u.role === "Admin" && u.status === "Active"
  ).length;

  const isSelf            = (userId) => String(userId) === String(currentUserId);
  const isDemoAccount     = (userId) => [1, 2].includes(Number(userId));
  const isLastActiveAdmin = (user)   =>
    user.role === "Admin" && user.status === "Active" && activeAdminCount === 1;

  function protectionReason(user, action = "edit") {
    if (isDemoAccount(user.userId)) {
      if (action === "status") return "The status of seeded demo accounts cannot be changed.";
      return "Seeded demo accounts cannot be modified.";
    }

    if (isSelf(user.userId)) {
      if (action === "status") return "You cannot set your own status to Inactive or Suspended.";
      if (action === "role")   return "You cannot change your own role.";
    }

    if (isLastActiveAdmin(user)) {
      if (action === "status" || action === "role") return "At least one active Admin must remain.";
    }

    return null;
  }

  return { isSelf, isDemoAccount, isLastActiveAdmin, protectionReason };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = memo(function StatusBadge({ status }) {
  const s = status?.toLowerCase();
  const cls =
    s === "active"    ? "fs-badge fs-badge--active"    :
    s === "inactive"  ? "fs-badge fs-badge--inactive"  :
    s === "suspended" ? "fs-badge fs-badge--suspended" :
                        "fs-badge fs-badge--inactive";
  return <span className={cls}>{status ?? "—"}</span>;
});

const RoleBadge = memo(function RoleBadge({ role }) {
  const cls = role === "Admin" ? "fs-role fs-role--admin" : "fs-role";
  return <span className={cls}>{role?.toUpperCase()}</span>;
});

const StatusDropdown = memo(function StatusDropdown({ currentStatus, onSelect, disabled, disabledTitle }) {
  return (
    <select
      className="fs-status-select"
      value={currentStatus ?? ""}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      onChange={e => onSelect(e.target.value)}
      onClick={e => e.stopPropagation()}
    >
      {USER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
});

// ─── Date Preset Dropdown ─────────────────────────────────────────────────────

const DatePresetDropdown = memo(function DatePresetDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const presets         = getDateRangePresets();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
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

// ─── Column definitions ───────────────────────────────────────────────────────

function buildColumns(onStatusChange, protectionReason) {
  return [
    {
      key:      "userId",
      label:    "ID",
      width:    80,
      sortable: true,
      render:   (user) => (
        <span className="fs-id-cell">#{String(user.userId).padStart(4, "0")}</span>
      ),
    },
    {
      key:      "username",
      label:    "User",
      width:    180,
      sortable: true,
      render:   (user) => <span className="fs-uname">{user.username}</span>,
    },
    {
      key:      "email",
      label:    "Email",
      width:    220,
      sortable: true,
      render:   (user) => <span className="fs-email">{user.email ?? "—"}</span>,
    },
    {
      key:      "role",
      label:    "Role",
      width:    110,
      sortable: true,
      render:   (user) => <RoleBadge role={user.role} />,
    },
    {
      key:      "status",
      label:    "Status",
      width:    110,
      sortable: true,
      render:   (user) => <StatusBadge status={user.status} />,
    },
    {
      key:      "createdDate",
      label:    "Created",
      width:    130,
      sortable: true,
      render:   (user) => (
        <span className="fs-date-val">{formatDate(user.createdDate)}</span>
      ),
    },
    {
      key:          "changeStatus",
      label:        "Change Status",
      width:        150,
      sortable:     false,
      skipRowClick: true,
      render:       (user) => {
        const reason = protectionReason(user, "status");
        return (
          <StatusDropdown
            currentStatus={user.status}
            onSelect={newStatus => onStatusChange(user.userId, newStatus)}
            disabled={!!reason}
            disabledTitle={reason}
          />
        );
      },
    },
  ];
}

// ─── UsersTable ───────────────────────────────────────────────────────────────

const UsersTable = memo(function UsersTable({
  users, loading, selectedIds, onSelect,
  sortKey, sortOrder, onSort, onStatusChange,
  activeRowId, onActiveRow, onRowDoubleClick,
  protectionReason,
}) {
  const allSelected  = users.length > 0 && users.every(u => selectedIds.includes(u.userId));
  const someSelected = users.some(u => selectedIds.includes(u.userId));

  const toggleSelect = useCallback((id) => {
    onSelect(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, [onSelect]);

  const selectColumn = {
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
        onChange={e => onSelect(e.target.checked ? users.map(u => u.userId) : [])}
        onClick={e => e.stopPropagation()}
        title="Select all"
      />
    ),
    render: (user) => (
      <input
        type="checkbox"
        checked={selectedIds.includes(user.userId)}
        onChange={() => toggleSelect(user.userId)}
        onClick={e => e.stopPropagation()}
      />
    ),
  };

  const columns = [selectColumn, ...buildColumns(onStatusChange, protectionReason)];

  const getRowStyle = useCallback((user) => {
    const s = user.status?.toLowerCase();
    if (s === "inactive")  return { opacity: 0.6 };
    if (s === "suspended") return { opacity: 0.5, filter: "grayscale(0.4)", textDecoration: "line-through" };
    return {};
  }, []);

  return (
    <ResizableTable
      columns={columns}
      rows={users}
      rowKey={u => u.userId}
      loading={loading}
      emptyMessage="No users found."
      sortKey={sortKey}
      sortOrder={sortOrder}
      onSort={col => onSort(col.key)}
      selectedIds={selectedIds}
      activeRowId={activeRowId}
      onRowClick={user => onActiveRow(user.userId)}
      onRowDoubleClick={onRowDoubleClick}
      getRowStyle={getRowStyle}
    />
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

const LS_PAGE_SIZE_KEY = "userMgmt_pageSize";

export default function UserManagementPage() {
  useFlexiSchemaCSS();

  const { theme }       = useTheme();
  const { currentUser } = useCurrentUser();

  const [dropOpen,      setDropOpen]      = useState(false);
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [selectedIds,   setSelectedIds]   = useState([]);
  const [activeRowId,   setActiveRowId]   = useState(null);
  const [sortConfig,    setSortConfig]    = useState({ key: "userId", direction: "asc" });
  const [page,          setPage]          = useState(1);
  const [totalCount,    setTotalCount]    = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType,    setStatusType]    = useState("success");

  const [confirmState, setConfirmState] = useState(CONFIRM_CLOSED);

  function openConfirm({ title, message, confirmLabel = "Confirm", danger = false, onConfirm }) {
    setConfirmState({ open: true, title, message, confirmLabel, danger, onConfirm });
  }
  function closeConfirm() {
    setConfirmState(CONFIRM_CLOSED);
  }

  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem(LS_PAGE_SIZE_KEY);
    const parsed = Number(saved);
    return [10, 20, 50, 100].includes(parsed) ? parsed : 10;
  });

  const [searchTerm,        setSearchTerm]        = useState("");
  const [debouncedSearch,   setDebouncedSearch]   = useState("");
  const [filterStatus,      setFilterStatus]      = useState("");
  const [fromDate,          setFromDate]          = useState("");
  const [toDate,            setToDate]            = useState("");
  const toDateInputRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing,   setIsEditing]   = useState(false);
  const [form,        setForm]        = useState({ username: "", email: "", password: "", role: "Editor" });
  const [formErrors,  setFormErrors]  = useState({});

  const toastTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const batchDropRef = useRef(null);

  const { isSelf, protectionReason } = useMemo(
    () => buildProtectionHelpers(users, currentUser?.userId),
    [users, currentUser?.userId]
  );

  function clearSelection() {
    setSelectedIds([]);
    setActiveRowId(null);
  }

  // Close batch dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (batchDropRef.current && !batchDropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounce Search Term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== searchTerm) {
          setPage(1); 
          return searchTerm;
        }
        return prev;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const load = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setLoading(true);
    setError(null);
    try {
      const data = await getUsers({
        page,
        pageSize,
        search:    debouncedSearch,
        status:    filterStatus || undefined,
        fromDate:  fromDate     || undefined,
        toDate:    toDate       || undefined,
        sortBy:    sortConfig.key,
        sortOrder: sortConfig.direction,
      });

      if (signal.aborted) return; 

      const items = data.items ?? data ?? [];
      setUsers(items);

      if (data.totalCount != null) {
        setTotalCount(data.totalCount);
      } else if (data.totalPages != null) {
        setTotalCount(data.totalPages * pageSize);
      } else {
        setTotalCount(items.length);
      }
    } catch (err) {
      if (signal.aborted) return; 
      if (err.errors && typeof err.errors === "object") {
        setError(Object.values(err.errors).flat().join(" • "));
      } else {
        setError(err?.message ?? "Failed to load users");
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, pageSize, debouncedSearch, filterStatus, fromDate, toDate, sortConfig]);

  useEffect(() => {
    load();
    return () => abortControllerRef.current?.abort();
  }, [load]);

  function showStatus(msg, type = "success") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setStatusMessage(msg);
    setStatusType(type);
    toastTimerRef.current = setTimeout(() => {
      setStatusMessage("");
      toastTimerRef.current = null;
    }, 3000);
  }

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  const hasFilters = filterStatus || fromDate || toDate;

  function clearFilters() {
    setFilterStatus("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  function handleFilterStatus(val) {
    setFilterStatus(val);
    setPage(1);
  }

  function patchFrom(val) {
    setFromDate(val);
    setPage(1);
    if (val) {
      setTimeout(() => {
        try { toDateInputRef.current?.showPicker(); } catch { /* ignore */ }
      }, 50);
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

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }, []);

  function handlePageSizeChange(newSize) {
    setPageSize(newSize);
    localStorage.setItem(LS_PAGE_SIZE_KEY, String(newSize));
    setPage(1);
  }

  async function handleStatusChange(userId, newStatus) {
    const user = users.find(u => u.userId === userId);
    
    const reason = protectionReason(user, "status");
    if (reason) { showStatus(reason, "error"); return; }
    
    if (user.status === newStatus) { 
      showStatus(`User is already set to ${newStatus}.`); 
      return; 
    }

    const proceed = async () => {
      try {
        await changeUserStatus(userId, newStatus);
        setUsers(prev => prev.map(u => u.userId === userId ? { ...u, status: newStatus } : u));
        showStatus(`User set to ${newStatus}.`);
      } catch (err) {
        showStatus(err?.message ?? "Status change failed.", "error");
      }
    };

    if (newStatus === "Suspended") {
      openConfirm({
        title:        "Suspend User",
        message:      `Suspend ${user?.username}?`,
        confirmLabel: "Suspend",
        danger:       true,
        onConfirm:    proceed,
      });
      return;
    }
    await proceed();
  }

  function handleBulkStatus(newStatus) {
    if (selectedIds.length === 0) return;
    setDropOpen(false);

    const actionableUsers = selectedIds
      .map(id => users.find(u => u.userId === id))
      .filter(Boolean);

    const safeUsers = actionableUsers.filter(u => !protectionReason(u, "status") && u.status !== newStatus);
    const safeIds = safeUsers.map(u => u.userId);

    const alreadyUpdated = actionableUsers.filter(u => u.status === newStatus).length;
    const protectedCount = actionableUsers.filter(u => protectionReason(u, "status")).length;

    if (safeIds.length === 0) {
      if (alreadyUpdated > 0) {
        showStatus(`All eligible users are already set to ${newStatus}.`);
        clearSelection();
      } else {
        const firstProtected = actionableUsers.find(u => protectionReason(u, "status"));
        const reasonStr = firstProtected ? protectionReason(firstProtected, "status") : "No eligible users to update.";
        showStatus(reasonStr, "error");
      }
      return;
    }

    const skipNotes = [];
    if (alreadyUpdated > 0) skipNotes.push(`${alreadyUpdated} already ${newStatus}`);
    if (protectedCount > 0) skipNotes.push(`${protectedCount} protected`);
    const skipString = skipNotes.length > 0 ? ` (${skipNotes.join(" and ")})` : "";

    openConfirm({
      title:        "Change Status",
      message:      `Set ${safeIds.length} user(s) to ${newStatus}?${skipString}`,
      confirmLabel: `Set to ${newStatus}`,
      danger:       newStatus === "Suspended",
      onConfirm:    async () => {
        try {
          await Promise.all(safeIds.map(id => changeUserStatus(id, newStatus)));
          clearSelection();
          const skippedNote = skipNotes.length > 0 ? ` · ${alreadyUpdated + protectedCount} skipped.` : "";
          showStatus(`${safeIds.length} user(s) set to ${newStatus}.${skippedNote}`);
          load();
        } catch (err) {
          showStatus(err?.message ?? "Bulk status change failed.", "error");
        }
      },
    });
  }

  function handleBulkRole(newRole) {
    if (selectedIds.length === 0) return;
    setDropOpen(false);

    const actionableUsers = selectedIds
      .map(id => users.find(u => u.userId === id))
      .filter(Boolean);

    const safeUsers = actionableUsers.filter(u => !protectionReason(u, "role") && u.role !== newRole);
    const safeIds = safeUsers.map(u => u.userId);

    const alreadyUpdated = actionableUsers.filter(u => u.role === newRole).length;
    const protectedCount = actionableUsers.filter(u => protectionReason(u, "role")).length;

    if (safeIds.length === 0) {
      if (alreadyUpdated > 0) {
        showStatus(`All eligible users are already ${newRole}s.`);
        clearSelection();
      } else {
        const firstProtected = actionableUsers.find(u => protectionReason(u, "role"));
        const reasonStr = firstProtected ? protectionReason(firstProtected, "role") : "No eligible users to update.";
        showStatus(reasonStr, "error");
      }
      return;
    }

    const skipNotes = [];
    if (alreadyUpdated > 0) skipNotes.push(`${alreadyUpdated} already ${newRole}`);
    if (protectedCount > 0) skipNotes.push(`${protectedCount} protected`);
    const skipString = skipNotes.length > 0 ? ` (${skipNotes.join(" and ")})` : "";

    openConfirm({
      title:        "Change Role",
      message:      `Set ${safeIds.length} user(s) to ${newRole}?${skipString}`,
      confirmLabel: `Set as ${newRole}`,
      danger:       false,
      onConfirm:    async () => {
        try {
          await Promise.all(safeIds.map(async id => {
            const user = users.find(u => u.userId === id);
            if (!user) return;
            return updateUser(id, { ...user, role: newRole, password: undefined });
          }));
          clearSelection();
          const skippedNote = skipNotes.length > 0 ? ` · ${alreadyUpdated + protectedCount} skipped.` : "";
          showStatus(`${safeIds.length} user(s) set to ${newRole}.${skippedNote}`);
          load();
        } catch (err) {
          showStatus(err?.message ?? "Bulk role change failed.", "error");
        }
      },
    });
  }

  function openAdd() {
    setIsEditing(false);
    setForm({ username: "", email: "", password: "", role: "Editor" });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEdit() {
    if (selectedIds.length !== 1) return;
    const user = users.find(u => u.userId === selectedIds[0]);
    if (!user) return;

    const reason = protectionReason(user, "edit");
    if (reason) { showStatus(reason, "error"); return; }

    setIsEditing(true);
    setForm({ userId: user.userId, username: user.username, email: user.email, role: user.role, password: "" });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleRowDoubleClick(user) {
    const reason = protectionReason(user, "edit");
    if (reason) { showStatus(reason, "error"); return; }

    setSelectedIds([user.userId]);
    setIsEditing(true);
    setForm({ userId: user.userId, username: user.username, email: user.email, role: user.role, password: "" });
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleSave(payload) {
    try {
      if (isEditing) {
        if (isSelf(payload.userId) && payload.role !== "Admin") {
          setFormErrors({ role: "You cannot change your own role." });
          return;
        }
        const original = users.find(u => u.userId === payload.userId);
        const hasChanges =
          payload.username !== original?.username ||
          payload.email    !== original?.email    ||
          payload.role     !== original?.role     ||
          !!payload.password;

        if (!hasChanges) {
          setIsModalOpen(false);
          clearSelection();
          showStatus("No changes detected.", "success");
          return;
        }

        await updateUser(payload.userId, { ...payload, password: payload.password || undefined });
        showStatus("User updated.");
        load();
      } else {
        await createUser({
          username: payload.username,
          email:    payload.email,
          password: payload.password,
          role:     payload.role,
        });
        showStatus("User created.");
        if (page === 1) load(); else setPage(1);
      }
      setIsModalOpen(false);
      setFormErrors({});
      clearSelection();
    } catch (err) {
      setFormErrors(parseErrors(err));
      showStatus(isEditing ? "Update failed." : "Create failed.", "error");
    }
  }

  return (
    <div className="fs-root" data-theme={theme}>
      <div className="fs-page-header">
        <h1 className="fs-page-title">User <span>Management</span></h1>
      </div>

      <div className="fs-action-bar">
        <div className="fs-left-g">
          <div className="fs-search-wrap">
            <i className="fa-solid fa-magnifying-glass fs-search-icon" />
            <input
              className="fs-input"
              type="text"
              placeholder="Live search…"
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
            className="fs-select"
            value={filterStatus}
            onChange={e => handleFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            {USER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <DatePresetDropdown onSelect={handlePreset} />

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
              onChange={e => patchTo(e.target.value)}
            />
          </div>

          {hasFilters && (
            <button
              className="fs-btn"
              onMouseDown={e => { e.preventDefault(); clearFilters(); }}
              title="Clear filters"
            >
              <i className="fa-solid fa-xmark" /> Clear Filters
            </button>
          )}
        </div>

        <div className="fs-right-g">
          <div style={{ position: "relative" }} ref={batchDropRef}> 
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
              <i className="fa-solid fa-layer-group" />
              Batch{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
              <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
            </button>
            <div className={`fs-drop${dropOpen ? " fs-open" : ""}`}>
              {USER_STATUSES.map(s => (
                <div key={s} className="fs-drop-item" onClick={() => handleBulkStatus(s)}>
                  Set to {s}
                </div>
              ))}
              <hr className="fs-drop-hr" />
              <div className="fs-drop-item" onClick={() => handleBulkRole("Admin")}>Set as Admin</div>
              <div className="fs-drop-item" onClick={() => handleBulkRole("Editor")}>Set as Editor</div>
            </div>
          </div>

          <div className="fs-divider" />

          <button className="fs-btn" onClick={() => load()} disabled={loading}>
            <i className={`fa-solid fa-rotate-right${loading ? " fa-spin" : ""}`} /> Refresh
          </button>

          <div className="fs-divider" />

          <button className="fs-btn" onClick={openEdit} disabled={selectedIds.length !== 1}>
            <i className="fa-solid fa-pen-to-square" /> Edit
          </button>
          <button className="fs-btn fs-btn--primary" onClick={openAdd}>
            <i className="fa-solid fa-plus" /> New User
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

      <div className="fs-scroll-x">
        <UsersTable
          users={users}
          loading={loading}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          sortKey={sortConfig.key}
          sortOrder={sortConfig.direction}
          onSort={handleSort}
          onStatusChange={handleStatusChange}
          activeRowId={activeRowId}
          onActiveRow={setActiveRowId}
          onRowDoubleClick={handleRowDoubleClick}
          protectionReason={protectionReason}
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

      <UserModal
        open={isModalOpen}
        editing={isEditing}
        form={form}
        onChange={setForm}
        onSave={handleSave}
        onClose={() => setIsModalOpen(false)}
        errors={formErrors}
        lockRole={isEditing && isSelf(form.userId)}
      />

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

