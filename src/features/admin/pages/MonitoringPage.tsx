import { useState } from "react";
import ActionSummaries from "@/features/admin/components/ActionSummaries";
import AuditLogs from "@/features/admin/components/AuditLogs";

const TABS = [
  { key: "ActionSummaries", label: "Action Summaries" },
  { key: "AuditLogs",       label: "Audit Logs" },
];

export default function MonitoringPage() {
  const [tab, setTab] = useState("ActionSummaries");

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
              background:      tab === t.key ? "var(--fs-surface-card)"  : "transparent",
              color:           tab === t.key ? "var(--fs-accent)"        : "var(--fs-text-dim)",
              borderBottom:    tab === t.key ? "2px solid var(--fs-accent)" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "ActionSummaries" && <ActionSummaries />}
        {tab === "AuditLogs"       && <AuditLogs />}
      </div>

    </div>
  );
}
