/**
 * CONTACTS PAGE (FEATURE ROOT)
 * -----------------------------
 * The primary view for the Contacts feature. It acts as a "Smart Component" 
 * that orchestrates the data fetching hook (`useContacts`), handles role-based 
 * permissions, and renders the layout (Toolbar, Table, Modals). 
 */
// @ts-nocheck
import { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from "react";

import Pagination from "@/components/Pagination";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { useTheme } from "@/hooks/useTheme";
import useContacts from "@/features/contacts/hooks/useContacts";
import ContactsTable from "@/features/contacts/components/ContactsTable";
import ContactsToolbar from "@/features/contacts/components/ContactsToolbar";
import ContactModal from "@/features/contacts/components/ContactModal";
import ColumnManagerModal from "@/features/contacts/components/ColumnManagerModal";
import ImportModal from "@/features/contacts/components/ImportModal";
import ContactDrawer from "@/features/contacts/components/ContactDrawer";
import PrintSetupModal from "@/features/contacts/components/PrintSetupModal";
import ExportSetupModal from "@/features/contacts/components/ExportSetupModal";
import ConfirmModal from "@/features/contacts/components/ConfirmModal";

import { exportContacts } from "@/features/contacts/api/ContactsImportExportApi";
import { changeContactStatus } from "@/features/contacts/api/ContactsApi";
import { buildPrintHTML } from "@/lib/BuildPrintHTML";
import {
  useDebounce,
  useStatusMessage,
  loadColumnConfig,
  buildDefaultColumnOrder,
} from "@/lib/index";

// ─── Role constants ───────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  Admin:  { pinned: ["select", "sequence"], core: ["id", "name", "email", "status", "createdDate"], key: "admin"  },
  Editor: { pinned: ["sequence"],           core: ["name", "email"],                                key: "editor" },
  Viewer: { pinned: ["sequence"],           core: ["name", "email"],                                key: "viewer" },
};

const CONTACT_STATUSES = ["Active", "Inactive", "Archived"];

const MODAL_SYSTEM_COLS = new Set(["select", "sequence", "changeStatus"]);



// ─── Drawer config helpers ────────────────────────────────────────────────────

const DRAWER_STORAGE_PREFIX         = "fs-drawer-order-";
const DRAWER_ENABLED_STORAGE_PREFIX = "fs-drawer-enabled-";

function saveDrawerConfig(roleKey, order) {
  try {
    localStorage.setItem(DRAWER_STORAGE_PREFIX + roleKey, JSON.stringify(order));
  } catch { /* ignore */ }
}

function loadDrawerConfig(roleKey) {
  try {
    const raw = localStorage.getItem(DRAWER_STORAGE_PREFIX + roleKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadDrawerEnabled(roleKey) {
  try {
    const saved = localStorage.getItem(DRAWER_ENABLED_STORAGE_PREFIX + roleKey);
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

function saveDrawerEnabled(roleKey, value) {
  try {
    localStorage.setItem(DRAWER_ENABLED_STORAGE_PREFIX + roleKey, String(value));
  } catch { /* ignore */ }
}

// ─── Custom Hooks ─────────────────────────────────────────────────────────────

// Helper to keep a mutable ref synced with state automatically
function useStateWithRef(initialValue) {
  const [state, setState] = useState(initialValue);
  const ref = useRef(state);
  const setSyncState = useCallback((valOrFn) => {
    setState(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      ref.current = next;
      return next;
    });
  }, []);
  return [state, setSyncState, ref];
}

// ─── useColumnConfig ──────────────────────────────────────────────────────────

function useColumnConfig(roleConfig, activeDefinitions, isAdmin) {
  const { pinned: PINNED, core: CORE, key: roleKey } = roleConfig;

  const allColumnIds = useMemo(
    () => buildDefaultColumnOrder(CORE, activeDefinitions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleKey, activeDefinitions]
  );

  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = loadColumnConfig(roleKey);
    return saved?.columnOrder?.length ? saved.columnOrder : [...CORE];
  });

  const [hiddenColumns, setHiddenColumns] = useState(() => {
    const saved = loadColumnConfig(roleKey);
    return saved ? new Set(saved.hiddenColumns) : new Set();
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved     = loadColumnConfig(roleKey);
    const available = new Set(allColumnIds);
    if (saved?.columnOrder?.length) {
      const filtered    = saved.columnOrder.filter(id => available.has(id));
      const filteredSet = new Set(filtered);
      const merged      = [...filtered, ...allColumnIds.filter(id => !filteredSet.has(id))];
      setColumnOrder(merged);
      setHiddenColumns(new Set((saved.hiddenColumns ?? []).filter(id => available.has(id))));
    } else {
      setColumnOrder([...allColumnIds]);
      setHiddenColumns(new Set());
    }
  }, [roleKey, allColumnIds]);

  const effectiveColumnOrder = useMemo(() => {
    const allowed     = new Set(allColumnIds);
    const dataColumns = columnOrder.filter(id => !hiddenColumns.has(id) && allowed.has(id));
    const base        = [...PINNED, ...dataColumns];

    if (isAdmin) {
      const statusIdx = base.indexOf("status");
      if (!base.includes("changeStatus")) {
        if (statusIdx !== -1) base.splice(statusIdx + 1, 0, "changeStatus");
        else base.push("changeStatus");
      }
    }

    return base;
  }, [PINNED, columnOrder, hiddenColumns, allColumnIds, isAdmin]);

  const handleSave = useCallback((newOrder, newHidden) => {
    setColumnOrder(newOrder);
    setHiddenColumns(newHidden);
    setIsOpen(false);
  }, []);

  return {
    allColumnIds,
    defaultColumnIds: allColumnIds,
    columnOrder,
    hiddenColumns,
    effectiveColumnOrder,
    isColumnManagerOpen: isOpen,
    openColumnManager:   () => setIsOpen(true),
    closeColumnManager:  () => setIsOpen(false),
    handleColumnManagerSave: handleSave,
    PINNED_COLUMNS: PINNED,
  };
}

// ─── useDrawerConfig ──────────────────────────────────────────────────────────

function useDrawerConfig(roleKey, allColumnIds) {
  const [drawerColumnOrder, setDrawerColumnOrder] = useState(() => {
    return loadDrawerConfig(roleKey) ?? [];
  });

  useEffect(() => {
    const saved     = loadDrawerConfig(roleKey);
    const available = new Set(allColumnIds);

    if (saved?.length) {
      const filtered = saved.filter(id => available.has(id));
      const known    = new Set(filtered);
      const merged   = [...filtered, ...allColumnIds.filter(id => !known.has(id))];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrawerColumnOrder(merged);
    } else {
      setDrawerColumnOrder([...allColumnIds]);
    }
  }, [roleKey, allColumnIds]);

  const handleDrawerReorder = useCallback((newOrder) => {
    setDrawerColumnOrder(newOrder);
    saveDrawerConfig(roleKey, newOrder);
  }, [roleKey]);

  return { drawerColumnOrder, handleDrawerReorder };
}

// ─── useContactFilters ────────────────────────────────────────────────────────

function useContactFilters(loadContacts, setPage, getSort, isAdmin) {
  const [searchTerm,   setSearchTerm]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");

  const toDateInputRef  = useRef(null);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const hasSearch       = !!searchTerm;
  const hasFilters      = !!(filterStatus || fromDate || toDate);

  const filterRef = useRef({ searchTerm: "", filterStatus: "", fromDate: "", toDate: "" });
  useLayoutEffect(() => {
    filterRef.current = { searchTerm, filterStatus, fromDate, toDate };
  }, [searchTerm, filterStatus, fromDate, toDate]);

  const refresh = useCallback(() => {
    const { searchTerm: st, filterStatus: status, fromDate: fd, toDate: td } = filterRef.current;
    const { key: sortBy, direction: sortOrder } = getSort();
    loadContacts(st, {
      status:   isAdmin ? (status || undefined) : "Active",
      fromDate: isAdmin ? (fd || undefined) : undefined,
      toDate:   isAdmin ? (td || undefined) : undefined,
    }, { sortBy, sortOrder });
  }, [loadContacts, getSort, isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]); // eslint-disable-line

  function clearSearch() {
    setSearchTerm("");
    filterRef.current.searchTerm = "";
    setPage(1);
    const { key: sortBy, direction: sortOrder } = getSort();
    loadContacts("", {
      status:   isAdmin ? (filterRef.current.filterStatus || undefined) : "Active",
      fromDate: isAdmin ? (filterRef.current.fromDate || undefined) : undefined,
      toDate:   isAdmin ? (filterRef.current.toDate || undefined) : undefined,
    }, { sortBy, sortOrder });
  }

  function clearFilters() {
    const currentSearch = filterRef.current.searchTerm;
    setFilterStatus("");
    setFromDate("");
    setToDate("");
    filterRef.current = { searchTerm: currentSearch, filterStatus: "", fromDate: "", toDate: "" };
    setPage(1);
    const { key: sortBy, direction: sortOrder } = getSort();
    loadContacts(currentSearch, {
      status:   isAdmin ? undefined : "Active",
      fromDate: undefined,
      toDate:   undefined,
    }, { sortBy, sortOrder });
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    refresh();
  }

  function patchStatus(val) {
    setFilterStatus(val);
    filterRef.current.filterStatus = val;
    setPage(1);
    const { key: sortBy, direction: sortOrder } = getSort();
    loadContacts(filterRef.current.searchTerm, {
      status:   isAdmin ? (val || undefined) : "Active",
      fromDate: isAdmin ? (filterRef.current.fromDate || undefined) : undefined,
      toDate:   isAdmin ? (filterRef.current.toDate || undefined) : undefined,
    }, { sortBy, sortOrder });
  }

  function patchFrom(val) {
    setFromDate(val);
    filterRef.current.fromDate = val;
    if (val) {
      setTimeout(() => {
        try { toDateInputRef.current?.showPicker(); } catch { /* ignore */ }
      }, 50);
    }
  }

  function patchTo(val) {
    setToDate(val);
    filterRef.current.toDate = val;
    if (val) {
      setPage(1);
      const { key: sortBy, direction: sortOrder } = getSort();
      loadContacts(filterRef.current.searchTerm, {
        status:   isAdmin ? (filterRef.current.filterStatus || undefined) : "Active",
        fromDate: isAdmin ? (filterRef.current.fromDate || undefined) : undefined,
        toDate:   isAdmin ? (val || undefined) : undefined,
      }, { sortBy, sortOrder });
    }
  }

  function applyPreset({ fromDate: fd, toDate: td }) {
    setFromDate(fd);
    setToDate(td);
    filterRef.current.fromDate = fd;
    filterRef.current.toDate   = td;
    setPage(1);
    const { key: sortBy, direction: sortOrder } = getSort();
    loadContacts(filterRef.current.searchTerm, {
      status:   isAdmin ? (filterRef.current.filterStatus || undefined) : "Active",
      fromDate: isAdmin ? (fd || undefined) : undefined,
      toDate:   isAdmin ? (td || undefined) : undefined,
    }, { sortBy, sortOrder });
  }

  const loadWithSortImplRef = useRef(null);
  useLayoutEffect(() => {
    loadWithSortImplRef.current = (sortBy, sortOrder) => {
      const { searchTerm: st, filterStatus: status, fromDate: fd, toDate: td } = filterRef.current;
      loadContacts(st, {
        status:   isAdmin ? (status || undefined) : "Active",
        fromDate: isAdmin ? (fd || undefined) : undefined,
        toDate:   isAdmin ? (td || undefined) : undefined,
      }, { sortBy, sortOrder });
    };
  });

  const loadWithSort = useCallback((sortBy, sortOrder) => {
    loadWithSortImplRef.current(sortBy, sortOrder);
  }, []);

  return {
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus: patchStatus,
    fromDate, setFromDate: patchFrom,
    toDate,   setToDate: patchTo,
    applyPreset,
    toDateInputRef,
    debouncedSearch,
    hasSearch,  clearSearch,
    hasFilters, clearFilters,
    handleSearch,
    refresh,
    loadWithSort,
  };
}

// ─── useImportExport ──────────────────────────────────────────────────────────

function useImportExport(refresh, setPage, showStatus, reloadDefinitions) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const openImportModal  = useCallback(() => setImportModalOpen(true),  []);
  const closeImportModal = useCallback(() => setImportModalOpen(false), []);
  const openExportModal  = useCallback(() => setExportModalOpen(true),  []);
  const closeExportModal = useCallback(() => setExportModalOpen(false), []);

  const handleImportConfirm = useCallback(async (result) => {
    setImportModalOpen(false);
    showStatus(
      `${result.importedCount} imported, ${result.updatedCount} updated, ${result.skippedCount} skipped.`
    );
    setPage(1);
    await reloadDefinitions();
    refresh();
  }, [refresh, setPage, showStatus, reloadDefinitions]);

  const handleExportConfirm = useCallback(async ({ columns, exportSelected, format }, selectedIds) => {
    setExportModalOpen(false);
    try {
      await exportContacts(format || "csv", {
        columns,
        ids: exportSelected && selectedIds?.length ? selectedIds : undefined,
      });
      showStatus("Export started.");
    } catch (err) {
      showStatus(err?.message ?? "Export failed.", "error");
    }
  }, [showStatus]);

  return {
    importModalOpen, openImportModal, closeImportModal, handleImportConfirm,
    exportModalOpen, openExportModal, closeExportModal, handleExportConfirm,
  };
}

// ─── ContactsPage ─────────────────────────────────────────────────────────────

export default function ContactsPage({ userRole, requireLogin }) {
  useFlexiSchemaCSS();

  const { theme } = useTheme();

  const roleConfig = ROLE_CONFIG[userRole] ?? ROLE_CONFIG.Viewer;
  const isAdmin    = userRole === "Admin";
  const canAdd     = ["Admin", "Editor"].includes(userRole);
  const canEdit    = canAdd;

  const [statusMessage, setStatusMessage] = useState("");
  const [statusType,    setStatusType]    = useState<"success"|"error">("success");
  const showStatus = useStatusMessage(setStatusMessage, setStatusType);

  const showStatusRef = useRef(showStatus);
  useEffect(() => { showStatusRef.current = showStatus; }, [showStatus]);

  const {
    definitions, contacts,
    page, totalCount, setPage,
    pageSize, setPageSize,
    loadContacts, createContact, saveContact,
    loadDefinitions,
    loading,
  } = useContacts(roleConfig.key, 1, { status: isAdmin ? undefined : "Active" }, (msg) => {
    showStatusRef.current(msg, "error");
  });

  const activeDefinitions = useMemo(
    () => definitions.filter(d => d.isActive),
    [definitions]
  );

  const colConfig = useColumnConfig(roleConfig, activeDefinitions, isAdmin);

  const orderedExportableIds = useMemo(() => {
    return colConfig.columnOrder.filter(
      id => !colConfig.hiddenColumns.has(id) && !MODAL_SYSTEM_COLS.has(id)
    );
  }, [colConfig.columnOrder, colConfig.hiddenColumns]);

  // ─── State ────────────────────────────────────────────────────────────────

  const [selectedIds, setSelectedIds, selectedIdsRef] = useStateWithRef([]);
  const [activeRow,   setActiveRow]                   = useStateWithRef(null);
  
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

  // ─── Drawer state ─────────────────────────────────────────────────────────

  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [drawerContact, setDrawerContact] = useState(null);

  // ─── Drawer enabled toggle ────────────────────────────────────────────────

  const [drawerEnabled, setDrawerEnabled] = useState(() => loadDrawerEnabled(roleConfig.key));

  const toggleDrawerEnabled = useCallback(() => {
    setDrawerEnabled(prev => {
      const next = !prev;
      saveDrawerEnabled(roleConfig.key, next);
      if (!next) {
        setDrawerOpen(false);
        setDrawerContact(null);
      }
      return next;
    });
  }, [roleConfig.key]);

  const [prevRoleKey, setPrevRoleKey] = useState(roleConfig.key);
  if (roleConfig.key !== prevRoleKey) {
    setPrevRoleKey(roleConfig.key);
    setDrawerEnabled(loadDrawerEnabled(roleConfig.key));
    setDrawerOpen(false);
    setDrawerContact(null);
  }

  // ─── Refs ─────────────────────────────────────────────────────────────────

  const sortConfigRef = useRef(sortConfig);
  const contactsRef   = useRef(contacts);

  const filters = useContactFilters(loadContacts, setPage, () => sortConfigRef.current, isAdmin);

  useLayoutEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  const { drawerColumnOrder, handleDrawerReorder } = useDrawerConfig(
    roleConfig.key,
    colConfig.allColumnIds,
  );

  // ─── Drawer handlers ──────────────────────────────────────────────────────

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    filters.loadWithSort(sortConfig.key, sortConfig.direction);
  }, [page, pageSize, sortConfig, filters.loadWithSort, filters.debouncedSearch]); // eslint-disable-line

  const prevContactsRef = useRef(contacts);
  
  useEffect(() => {
    if (contacts === prevContactsRef.current) return;
    if (contacts.length === 0) {
      prevContactsRef.current = contacts;
      return;
    }

    const prev = prevContactsRef.current;
    
    // Lightweight check: if the count changes, or the first item is different, 
    // it's considered a new page/filter view.
    const isDifferentDataset =
      prev.length !== contacts.length ||
      (prev.length > 0 && prev[0].id !== contacts[0].id);

    if (isDifferentDataset) {
      setSelectedIds([]);
      setActiveRow(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrawerOpen(false);
      setDrawerContact(null);
    }
    
    prevContactsRef.current = contacts;
  }, [contacts, setSelectedIds, setActiveRow]);

  const wasLoadingRef      = useRef(false);
  const isManualRefreshRef = useRef(false);

  useEffect(() => {
    if (wasLoadingRef.current && !loading && isManualRefreshRef.current) {
      showStatusRef.current("Contacts refreshed.");
      isManualRefreshRef.current = false;
    }
    wasLoadingRef.current = loading;
  }, [loading]); 

  // ─── Drawer handlers ──────────────────────────────────────────────────────

  const handleRowOpen = useCallback((contact) => {
    if (!contact) {
      setDrawerOpen(false);
    } else {
      setDrawerContact(contact);
      setDrawerOpen(true);
    }
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleDrawerSave = useCallback(async (payload) => {
    if (!requireLogin()) return;
    await saveContact(payload);
    filters.refresh();
    setDrawerContact(payload);
  }, [requireLogin, saveContact, filters]);

  // ─── Import / Export ──────────────────────────────────────────────────────

  const {
    importModalOpen, openImportModal, closeImportModal, handleImportConfirm,
    exportModalOpen, openExportModal, closeExportModal, handleExportConfirm,
  } = useImportExport(filters.refresh, setPage, showStatus, loadDefinitions);

  // ─── Sort ─────────────────────────────────────────────────────────────────

  const handleSort = useCallback((key, direction) => {
    const next = { key, direction };
    setSortConfig(next);
    sortConfigRef.current = next;
    setPage(1);
  }, [setPage]);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1);
  }, [setPageSize, setPage]);

  // ─── Confirm modal state ──────────────────────────────────────────────────

  const [confirmOpen,    setConfirmOpen]    = useState(false);
  const [confirmConfig,  setConfirmConfig]  = useState({ title: "", message: "", confirmLabel: "Confirm", danger: false, onConfirm: () => {} });

  const openConfirm = useCallback(({ title, message, confirmLabel, danger, onConfirm }) => {
    setConfirmConfig({ title, message, confirmLabel, danger, onConfirm });
    setConfirmOpen(true);
  }, []);

// ─── Status change ────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(async (contactId, newStatus) => {
    if (!requireLogin()) return;
    
    // 1. Check if the status is actually changing before firing the API
    const contact = contactsRef.current.find(c => String(c.id) === String(contactId));
    if (contact && contact.status === newStatus) {
      showStatus(`Contact is already set to ${newStatus}.`);
      return;
    }

    const proceed = async () => {
      try {
        await changeContactStatus(contactId, newStatus);
        showStatus(`Contact set to ${newStatus}.`);
        filters.refresh();
      } catch (err) {
        showStatus(err?.message ?? "Status change failed.", "error");
      }
    };

    if (newStatus === "Inactive" || newStatus === "Archived") {
      const isArchived = newStatus === "Archived";
      const consequence = isArchived
        ? "This contact will be hidden from normal views and functionally deactivated."
        : "This contact will be deactivated until restored.";

      openConfirm({
        title:   `Set to ${newStatus}`,
        message: (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>Are you sure you want to change <strong>{contact?.name || contact?.firstName || "this contact"}</strong> ({contact?.email || "No email"})'s status to {newStatus}?</div>
            <div>{consequence}</div>
          </div>
        ),
        confirmLabel: isArchived ? "Archive" : "Set to Inactive",
        danger:       isArchived,
        onConfirm:    proceed,
      });
      return;
    }

    await proceed();
  }, [requireLogin, showStatus, filters, openConfirm]);

  const handleBulkStatus = useCallback((newStatus) => {
    if (!requireLogin() || selectedIdsRef.current.length === 0) return;

    // 2. Filter out contacts that already have the target status
    const idsToUpdate = selectedIdsRef.current.filter(id => {
      const contact = contactsRef.current.find(c => String(c.id) === String(id));
      return contact && contact.status !== newStatus;
    });

    if (idsToUpdate.length === 0) {
      showStatus(`Selected contacts are already set to ${newStatus}.`);
      return;
    }

    const proceed = async () => {
      try {
        await Promise.all(
          idsToUpdate.map(id => {
            const contact = contactsRef.current.find(c => String(c.id) === String(id));
            return changeContactStatus(contact?.id ?? id, newStatus);
          })
        );
        setSelectedIds([]);
        filters.refresh();
        showStatus(`${idsToUpdate.length} contact(s) set to ${newStatus}.`);
      } catch (err) {
        showStatus(err?.message ?? "Bulk status change failed.", "error");
      }
    };

    if (newStatus === "Active") {
      proceed();
      return;
    }

    const isArchived = newStatus === "Archived";
    const consequence = isArchived
      ? "These contacts will be hidden from normal views and functionally deactivated."
      : "These contacts will be deactivated until restored.";

    const safeContacts = idsToUpdate.map(id => contactsRef.current.find(c => String(c.id) === String(id))).filter(Boolean);

    openConfirm({
      title:   `Set to ${newStatus}`,
      message: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>Are you sure you want to change the status of the following contacts to {newStatus}?</div>
          {safeContacts.length <= 5 ? (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {safeContacts.map(c => (
                <li key={c.id}><strong>{c.name || c.firstName || "Unknown"}</strong> ({c.email || "No email"})</li>
              ))}
            </ul>
          ) : (
            <div><strong>{safeContacts.length} contacts selected</strong></div>
          )}
          <div>{consequence}</div>
        </div>
      ),
      confirmLabel: isArchived ? "Archive" : "Set to Inactive",
      danger:       isArchived,
      onConfirm:    proceed,
    });
  }, [requireLogin, showStatus, filters, setSelectedIds, openConfirm, selectedIdsRef]);

  // ─── Print ────────────────────────────────────────────────────────────────

  const [printSetupOpen, setPrintSetupOpen] = useState(false);

  const handlePrint = useCallback(() => {
    setPrintSetupOpen(true);
  }, []);

  const handlePrintConfirm = useCallback(({ columns, printSelected }) => {
    setPrintSetupOpen(false);

    const contactsToPrint = printSelected && selectedIdsRef.current.length > 0
      ? contacts.filter(c => selectedIdsRef.current.includes(String(c.id)))
      : contacts;

    const html = buildPrintHTML(columns, contactsToPrint, activeDefinitions);
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }, [contacts, activeDefinitions, selectedIdsRef]);

  // ─── Manual refresh ───────────────────────────────────────────────────────

  const triggerRefresh = useCallback(() => {
    isManualRefreshRef.current = true;
    filters.refresh();
  }, [filters]);

  // ─── Modal state ──────────────────────────────────────────────────────────

  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [isEditing,    setIsEditing]    = useState(false);
  const [modalContact, setModalContact] = useState({ id: null, name: "", email: "", extraFields: [] });
  const [formErrors,   setFormErrors]   = useState({});

  const originalContactRef = useRef(null);

  const openAddModal = useCallback(() => {
    if (!requireLogin()) return;
    setIsEditing(false);
    setModalContact({
      id: null, name: "", email: "",
      extraFields: activeDefinitions.map(d => ({
        extraFieldDefinitionId: d.extraFieldDefinitionId,
        fieldName:  d.fieldName,
        fieldValue: "",
      })),
    });
    setFormErrors({});
    setIsModalOpen(true);
  }, [requireLogin, activeDefinitions]);

  const openEditModal = useCallback(() => {
    if (!requireLogin()) return;
    const ids = selectedIdsRef.current;
    if (ids.length !== 1) return;
    const targetId      = String(ids[0]);
    const contactToEdit = contactsRef.current.find(c => String(c.id) === targetId);
    if (!contactToEdit) return;

    const mapped = {
      ...contactToEdit,
      extraFields: activeDefinitions.map(d => {
        const existing = (contactToEdit.extraFields ?? []).find(
          ef => ef.extraFieldDefinitionId === d.extraFieldDefinitionId
        );
        return {
          extraFieldDefinitionId: d.extraFieldDefinitionId,
          fieldName:  d.fieldName,
          fieldValue: existing?.fieldValue ?? "",
        };
      }),
    };

    originalContactRef.current = mapped;

    setIsEditing(true);
    setModalContact(mapped);
    setFormErrors({});
    setIsModalOpen(true);
  }, [requireLogin, activeDefinitions, selectedIdsRef]);

  const handleSave = useCallback(async (payload) => {
    if (!requireLogin()) return;
    try {
      const cleaned = {
        ...payload,
        extraFields: (payload.extraFields ?? []).map(ef => ({
          ...ef,
          fieldValue: ef.fieldValue?.trim() ?? "",
        })),
      };

      if (isEditing) {
        const orig       = originalContactRef.current;
        const hasChanges = orig == null
          || cleaned.name.trim()  !== (orig.name?.trim()  ?? "")
          || cleaned.email.trim() !== (orig.email?.trim() ?? "")
          || cleaned.extraFields.some(ef => {
               const origEf = (orig.extraFields ?? []).find(
                 o => o.extraFieldDefinitionId === ef.extraFieldDefinitionId
               );
               return (ef.fieldValue ?? "") !== (origEf?.fieldValue?.trim() ?? "");
             });

        if (!hasChanges) {
          setIsModalOpen(false);
          setFormErrors({});
          showStatus("No changes applied.");
          return;
        }

        await saveContact(cleaned);
        filters.refresh();
      } else {
        const created = await createContact(cleaned);
        if (created?.id != null) setSelectedIds([String(created.id)]);
        if (page === 1) filters.refresh(); else setPage(1);
      }

      setIsModalOpen(false);
      setIsEditing(false);
      setModalContact({ id: null, name: "", email: "", extraFields: [] });
      setFormErrors({});
      showStatus("Save successful.");
    } catch (err) {
      if (err.errors) {
        setFormErrors({ errors: err.errors });
      } else {
        setFormErrors({ general: err.message || "Failed to save contact." });
      }
      showStatus("Save failed.", "error");
    }
  }, [requireLogin, isEditing, saveContact, createContact, page, setPage, showStatus, filters, setSelectedIds]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fs-root" data-theme={theme} data-density="compact">

      <div className="fs-page-header">
        <h1 className="fs-page-title">Contacts <span>Directory</span></h1>
      </div>

      <ContactsToolbar
        filters={filters}
        colConfig={colConfig}
        selectedIds={selectedIds}
        isAdmin={isAdmin}
        canAdd={canAdd}
        canEdit={canEdit}
        loading={loading}
        drawerEnabled={drawerEnabled}
        actions={{
          handleBulkStatus,
          triggerRefresh,
          toggleDrawerEnabled,
          openImportModal,
          openExportModal,
          handlePrint,
          openEditModal,
          openAddModal,
        }}
      />

      {statusMessage && (
        <div className={`fs-toast fs-toast--${statusType}`}>
          {statusMessage}
        </div>
      )}

      <div className="fs-grid-card" style={{ display: 'flex', flexDirection: 'column', width: "100%", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
          <ContactsTable
            contacts={contacts}
            definitions={activeDefinitions}
            columnOrder={colConfig.effectiveColumnOrder}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            activeRow={activeRow}
            onActiveRowChange={setActiveRow}
            sortConfig={sortConfig}
            onSort={handleSort}
            isAdmin={isAdmin}
            onStatusChange={handleStatusChange}
            onRowOpen={drawerEnabled ? handleRowOpen : undefined}
            loading={loading}
          />
        </div>
        {!loading && contacts.length === 0 && (
          <div className="fs-state-row" style={{
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--fs-text-dim, #6b7280)',
            fontStyle: 'italic',
            borderTop: '1px solid var(--fs-border, #e5e7eb)'
          }}>
            No contacts found.
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {canAdd && (
        <ContactModal
          open={isModalOpen} editing={isEditing}
          contact={modalContact} definitions={activeDefinitions}
          onClose={() => setIsModalOpen(false)}
          onChange={setModalContact}
          onSave={handleSave} errors={formErrors}
        />
      )}

      <ColumnManagerModal
        open={colConfig.isColumnManagerOpen}
        definitions={activeDefinitions}
        columnOrder={colConfig.columnOrder.filter(id => !colConfig.PINNED_COLUMNS.includes(id))}
        hiddenColumns={colConfig.hiddenColumns}
        allColumnIds={colConfig.allColumnIds}
        defaultColumnIds={colConfig.defaultColumnIds}
        role={roleConfig.key}
        onSave={colConfig.handleColumnManagerSave}
        onClose={colConfig.closeColumnManager}
      />

      {isAdmin && (
        <ImportModal
          open={importModalOpen}
          onClose={closeImportModal}
          onConfirm={handleImportConfirm}
        />
      )}

      <ConfirmModal
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel || "Confirm"}
        danger={confirmConfig.danger || false}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmOpen(false)}
      />

      <PrintSetupModal
        open={printSetupOpen}
        allColumnIds={orderedExportableIds}
        definitions={activeDefinitions}
        roleKey={roleConfig.key}
        selectedCount={selectedIds.length}
        onConfirm={handlePrintConfirm}
        onClose={() => setPrintSetupOpen(false)}
      />

      <ExportSetupModal
        open={exportModalOpen}
        allColumnIds={orderedExportableIds}
        definitions={activeDefinitions}
        roleKey={roleConfig.key}
        selectedCount={selectedIds.length}
        onConfirm={(opts) => handleExportConfirm(opts, selectedIds)}
        onClose={closeExportModal}
      />

      {drawerEnabled && (
        <ContactDrawer
          open={drawerOpen}
          contact={drawerContact}
          definitions={activeDefinitions}
          onClose={handleDrawerClose}
          canEdit={canEdit}
          canReorder={true}
          onSave={handleDrawerSave}
          drawerColumnOrder={drawerColumnOrder}
          hiddenColumns={colConfig.hiddenColumns}
          onDrawerReorder={handleDrawerReorder}
        />
      )}

    </div>
  );
}

