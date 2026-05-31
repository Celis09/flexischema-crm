import { useState } from "react";
import AdminConfigs from "@/features/admin/components/AdminConfigs";
import ExtraFieldDefinitions from "@/features/admin/components/ExtraFieldDefinitions";
import Metrics from "@/features/admin/components/Metrics";

const TABS = [
  { key: "AdminConfigs",          label: <>Admin <span style={{ color: "var(--fs-accent)" }}>Configs</span></> },
  { key: "ExtraFieldDefinitions", label: <>Extra Field <span style={{ color: "var(--fs-accent)" }}>Definitions</span></> },
  { key: "Metrics",               label: "Metrics" },
];

export default function SystemManagementPage() {
  const [tab, setTab] = useState("AdminConfigs");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Tab bar ── */}
      <div style={{
        display:      "flex",
        gap:          4,
        padding:      "12px 16px 0",
        borderBottom: "1px solid var(--fs-border-strong)",
        flexShrink:   0,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding:         "7px 16px",
              fontSize:        12,
              fontWeight:      600,
              fontFamily:      "var(--fs-font)",
              border:          "none",
              borderRadius:    "var(--fs-radius-sm) var(--fs-radius-sm) 0 0",
              cursor:          "pointer",
              transition:      "background 0.15s, color 0.15s",
              background:      tab === t.key ? "var(--fs-surface-card)"     : "transparent",
              color:           tab === t.key ? "var(--fs-text)"           : "var(--fs-text-dim)",
              borderBottom:    tab === t.key ? "2px solid var(--fs-accent)" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "AdminConfigs"          && <AdminConfigs />}
        {tab === "ExtraFieldDefinitions" && <ExtraFieldDefinitions />}
        {tab === "Metrics"               && <Metrics />}
      </div>

    </div>
  );
}
