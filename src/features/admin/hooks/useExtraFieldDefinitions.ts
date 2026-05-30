// @ts-nocheck
import { useEffect, useState, useCallback } from "react";
import {
  getExtraFieldDefinitions,
  addExtraFieldDefinition,
  updateExtraFieldDefinition,
  changeExtraFieldDefinitionStatus,
  changeExtraFieldDefinitionRequiredStatus, 
} from "@/features/admin/api/ExtraFieldDefinitionsApi";

export default function useExtraFieldDefinitions() {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const [roleFilter, setRoleFilter]   = useState("");
  const [isActive,   setIsActive]     = useState(undefined);

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExtraFieldDefinitions({
        roleFilter: opts.roleFilter ?? roleFilter,
        isActive:   opts.isActive   ?? isActive,
      });
      setDefinitions(data ?? []);
    } catch (err) {
      console.error("Failed to load extra field definitions:", err);
      setError(err?.message ?? "Failed to load definitions");
      setDefinitions([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, isActive]);

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createDefinition(payload) {
    const created = await addExtraFieldDefinition(payload);
    setDefinitions(prev => [...prev, created]);
    return created;
  }

  async function saveDefinition(id, payload) {
    await updateExtraFieldDefinition(id, payload);
    setDefinitions(prev =>
      prev.map(d => (d.extraFieldDefinitionId === id ? { ...d, ...payload } : d))
    );
  }

  async function toggleDefinitionStatus(id) {
    const definition = definitions.find(d => d.extraFieldDefinitionId === id);
    if (!definition) throw new Error(`Definition with id ${id} not found`);

    const newStatus = !definition.isActive;
    setDefinitions(prev =>
      prev.map(d =>
        d.extraFieldDefinitionId === id ? { ...d, isActive: newStatus } : d
      )
    );

    try {
      await changeExtraFieldDefinitionStatus(id, newStatus);
    } catch (err) {
      setDefinitions(prev =>
        prev.map(d =>
          d.extraFieldDefinitionId === id ? { ...d, isActive: definition.isActive } : d
        )
      );
      console.error("Failed to toggle definition status:", err);
      throw err;
    }
  }

  // ── New: mirrors toggleDefinitionStatus for isRequired ───────────────────
  async function toggleDefinitionRequired(id, isRequired) {
    const definition = definitions.find(d => d.extraFieldDefinitionId === id);
    if (!definition) throw new Error(`Definition with id ${id} not found`);

    // Optimistic update
    setDefinitions(prev =>
      prev.map(d =>
        d.extraFieldDefinitionId === id ? { ...d, isRequired } : d
      )
    );

    try {
      await changeExtraFieldDefinitionRequiredStatus(id, isRequired);
    } catch (err) {
      // Rollback on failure
      setDefinitions(prev =>
        prev.map(d =>
          d.extraFieldDefinitionId === id ? { ...d, isRequired: definition.isRequired } : d
        )
      );
      console.error("Failed to toggle definition required:", err);
      throw err;
    }
  }

  return {
    definitions,
    loading,
    error,
    load,
    createDefinition,
    saveDefinition,
    toggleDefinitionStatus,
    toggleDefinitionRequired,
    roleFilter, setRoleFilter,
    isActive,   setIsActive,
  };
}

