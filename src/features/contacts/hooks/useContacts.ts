/**
 * USECONTACTS HOOK (STATE ORCHESTRATOR)
 * --------------------------------------
 * A custom hook that manages the complex state for the Contacts feature. 
 * It bridges the asynchronous API calls (fetching contacts, definitions, 
 * columns) and manages pagination, search, filters, and caching to 
 * prevent race conditions.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import {
  getContacts,
  addContact,
  updateContact,
} from "@/features/contacts/api/ContactsApi";
import { getExtraFieldDefinitions } from "@/features/admin/api/ExtraFieldDefinitionsApi";

/**
 * Custom hook to manage contacts state, server pagination, sorting, 
 * dynamic backend column mappings, and CRUD mutations.
 * * Includes race-condition handling for rapid-fire API requests.
 */
let cachedDefinitions = null;
try {
  const local = localStorage.getItem('fs-cached-definitions');
  if (local) cachedDefinitions = JSON.parse(local);
} catch { /* ignore */ }

export default function useContacts(roleKey = "default", initialPage = 1, defaultFilters = {}, onError = null) {
  const pageSizeKey = `fs-contacts-page-size-${roleKey}`;
  const [definitions, setDefinitions] = useState(cachedDefinitions || []);
  const [contacts, setContacts] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem(pageSizeKey);
    if (saved) {
      const n = Number(saved);
      if ([10, 20, 50, 100].includes(n)) return n;
    }
    return 20;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const lastFiltersRef = useRef({ search: "", filters: {}, sortBy: "name", sortOrder: "asc" });
  const cancelRef = useRef(null);

  // Synchronous tracking refs to bypass asynchronous React state closures in API calls
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const definitionsRef = useRef(definitions);

  /**
   * Fetches schema definitions for extra custom fields.
   */
  const loadDefinitions = useCallback(async () => {
    try {
      const defs = await getExtraFieldDefinitions();
      const resolved = defs || [];
      cachedDefinitions = resolved;
      try { localStorage.setItem('fs-cached-definitions', JSON.stringify(resolved)); } catch {}
      setDefinitions(resolved);
      definitionsRef.current = resolved;
      return resolved;
    } catch (err) {
      console.error("Failed to load definitions:", err);
      const fallback = cachedDefinitions || [];
      setDefinitions(fallback);
      definitionsRef.current = fallback;
      return fallback;
    }
  }, []);

  /**
   * Resolves frontend column sort keys to expected backend database columns.
   * Auto-prepends custom fields with the 'extra_' namespace safely.
   */
  const resolveBackendSortBy = useCallback((sortBy, defs) => {
    if (!sortBy) return "name";
    const cleanSortBy = sortBy.toLowerCase();

    // Case 1: Frontend sent explicit dynamic identifier (e.g., extra-5)
    if (cleanSortBy.startsWith("extra-")) {
      const defId = cleanSortBy.replace("extra-", "");
      const match = defs.find(d => String(d.extraFieldDefinitionId) === defId || String(d.id) === defId);
      return match ? `extra_${match.fieldName.toLowerCase()}` : "name";
    }

    // Case 2: Already formatted correctly
    if (cleanSortBy.startsWith("extra_")) {
      return cleanSortBy;
    }

    // Case 3: Auto-detect fallback using fetched schema definition matches
    const isCustomField = defs.some(d => d.fieldName?.toLowerCase() === cleanSortBy);
    if (isCustomField) {
      return `extra_${cleanSortBy}`;
    }

    return cleanSortBy;
  }, []);

  /**
   * Fetches paginated contact records with applied filters and sorting options.
   * Handles request cancellation tokens natively to protect against component unmounts/race conditions.
   */
  const loadContacts = useCallback(async (
    search = "",
    filters: any = {},
    options: any = {}
  ) => {
    const {
      sortBy = "name",
      sortOrder = "asc",
      page: pageNum = pageRef.current,
      pageSize: size = pageSizeRef.current,
      explicitDefs = null
    } = options;

    lastFiltersRef.current = { search, filters, sortBy, sortOrder };

    const activeDefs = explicitDefs || definitionsRef.current || [];
    const resolvedSortBy = resolveBackendSortBy(sortBy, activeDefs);

    // Enforce API cancellation mechanics for rapid-fire typing or filter interactions
    if (cancelRef.current) cancelRef.current();
    let cancelled = false;
    cancelRef.current = () => { cancelled = true; };

    setLoading(true);
    try {
      const data = await getContacts({
        search,
        page: pageNum,
        pageSize: size,
        sortBy: resolvedSortBy,
        sortOrder,
        status: filters.status,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });
      
      if (cancelled) return;
      
      const items = data.items || [];
      setContacts(items);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);

      // --- Dynamic Schema Recovery ---
      // If backend blocks getExtraFieldDefinitions (e.g. for Editors), harvest them from the data payload!
      const currentDefs = definitionsRef.current || [];
      let newDefsFound = false;
      const recoveredDefs = new Map(currentDefs.map(d => [d.extraFieldDefinitionId, d]));

      items.forEach(contact => {
        (contact.extraFields || []).forEach(ef => {
          if (!recoveredDefs.has(ef.extraFieldDefinitionId)) {
            newDefsFound = true;
            recoveredDefs.set(ef.extraFieldDefinitionId, {
              extraFieldDefinitionId: ef.extraFieldDefinitionId,
              fieldName: ef.fieldName || `Field ${ef.extraFieldDefinitionId}`,
              isActive: true, // assume active if backend sent it
            });
          }
        });
      });

      if (newDefsFound) {
        const merged = Array.from(recoveredDefs.values());
        cachedDefinitions = merged;
        try { localStorage.setItem('fs-cached-definitions', JSON.stringify(merged)); } catch {}
        setDefinitions(merged);
        definitionsRef.current = merged;
      }
      // -------------------------------
    } catch (err: any) {
      if (cancelled) return;
      console.error("Failed to load contacts:", err);
      if (onError) {
        if (err.errors) {
          const firstKey = Object.keys(err.errors)[0];
          onError(err.errors[firstKey][0]);
        } else {
          onError(err.message || "Failed to load contacts.");
        }
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }, [resolveBackendSortBy]);

  // Synchronous state wrappers ensuring refs are modified alongside state transitions
  const stableSetPage = useCallback((val) => {
    const next = typeof val === "function" ? val(pageRef.current) : val;
    pageRef.current = next;
    setPage(next);
  }, []);

  const stableSetPageSize = useCallback((val) => {
    const next = typeof val === "function" ? val(pageSizeRef.current) : val;
    pageSizeRef.current = next;
    localStorage.setItem(pageSizeKey, String(next));
    setPageSize(next);
  }, [pageSizeKey]);

  // Orchestrated lifecycle configuration on mount
  useEffect(() => {
    async function initializeData() {
      const freshDefs = await loadDefinitions();
      await loadContacts("", defaultFilters, { 
        page: pageRef.current, 
        pageSize: pageSizeRef.current,
        explicitDefs: freshDefs 
      });
    }
    initializeData();
  }, [loadDefinitions, loadContacts]);

  const createContact = useCallback(async (payload) => {
    const created = await addContact(payload);
    setContacts(prev => [...prev, created]);
    return created;
  }, []);

  const saveContact = useCallback(async (payload) => {
    await updateContact(payload);
    setContacts(prev =>
      prev.map(c => (c.id === payload.id ? { ...c, ...payload } : c))
    );
  }, []);

  return {
    definitions,
    contacts,
    page,
    pageSize,
    totalPages,
    totalCount,
    loading,
    setPage: stableSetPage,
    setPageSize: stableSetPageSize,
    loadContacts,
    loadDefinitions,
    createContact,
    saveContact,
  };
}
