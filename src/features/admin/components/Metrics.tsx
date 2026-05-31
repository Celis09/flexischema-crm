import { useState, useEffect, useCallback } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { useTheme } from "@/hooks/useTheme";
import { getMetrics } from "@/features/admin/api/MetricsApi";

const METRIC_CARDS = [
  { key: "validationValidTotal",     label: "Valid Validations",    icon: "fa-solid fa-circle-check",        color: "var(--fs-success-text)", bg: "var(--fs-success-bg)",  border: "var(--fs-success-border)"  },
  { key: "validationInvalidTotal",   label: "Invalid Validations",  icon: "fa-solid fa-circle-xmark",        color: "var(--fs-error-text)",   bg: "var(--fs-error-bg)",    border: "var(--fs-error-border)"    },
  { key: "auditLogsTotal",           label: "Audit Logs",           icon: "fa-solid fa-scroll",               color: "var(--fs-accent)",       bg: "var(--fs-accent-dim)",  border: "rgba(124,106,247,0.25)"    },
  { key: "exceptionsHandledTotal",   label: "Handled Exceptions",   icon: "fa-solid fa-triangle-exclamation", color: "#fb923c",                bg: "rgba(251,146,60,0.10)", border: "rgba(251,146,60,0.25)"     },
  { key: "exceptionsUnhandledTotal", label: "Unhandled Exceptions", icon: "fa-solid fa-bug",                  color: "var(--fs-error-text)",   bg: "var(--fs-error-bg)",    border: "var(--fs-error-border)"    },
  { key: "exportSuccessTotal",       label: "Exports Succeeded",    icon: "fa-solid fa-file-arrow-down",      color: "var(--fs-success-text)", bg: "var(--fs-success-bg)",  border: "var(--fs-success-border)"  },
  { key: "exportFailedTotal",        label: "Exports Failed",       icon: "fa-solid fa-file-circle-xmark",   color: "var(--fs-error-text)",   bg: "var(--fs-error-bg)",    border: "var(--fs-error-border)"    },
];

function MetricCard({ label, value, icon, color, bg, border }) {
  return (
    <div
      style={{
        background:    "var(--fs-surface)",
        border:        "1px solid var(--fs-border)",
        borderRadius:  "var(--fs-radius)",
        padding:       "20px 22px",
        display:       "flex",
        alignItems:    "center",
        gap:           16,
        minWidth:      0,
        transition:    "border-color .18s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--fs-border)"}
    >
      <div style={{
        width:          44,
        height:         44,
        borderRadius:   10,
        background:     bg,
        border:         `1px solid ${border}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       18,
        color,
        flexShrink:     0,
      }}>
        <i className={icon} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize:      10,
          fontWeight:    800,
          letterSpacing: "0.9px",
          textTransform: "uppercase",
          color:         "var(--fs-text-dim)",
          marginBottom:  5,
          whiteSpace:    "nowrap",
          overflow:      "hidden",
          textOverflow:  "ellipsis",
          fontFamily:    "var(--fs-font)",
        }}>
          {label}
        </div>
        <div style={{
          fontSize:           28,
          fontWeight:         700,
          color,
          letterSpacing:      "-0.5px",
          lineHeight:         1,
          fontFamily:         "var(--fs-font-mono)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {value ?? "—"}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background:   "var(--fs-surface)",
      border:       "1px solid var(--fs-border)",
      borderRadius: "var(--fs-radius)",
      padding:      "20px 22px",
      height:       86,
      opacity:      0.35,
      animation:    "fsPulse 1.4s ease-in-out infinite",
    }} />
  );
}

export default function Metrics() {
  useFlexiSchemaCSS();
  const { theme } = useTheme();

  const [metrics,     setMetrics]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMetrics();
      setMetrics(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err?.message ?? "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="fs-root" data-theme={theme}>

      <div className="fs-topbar">
        <div className="fs-logo">Flexi<span>Schema</span></div>
      </div>

      <div className="fs-action-bar">
        <div className="fs-left-g">
          {lastRefresh && (
            <span style={{ fontSize: 12, color: "var(--fs-text-dim)", fontFamily: "var(--fs-font)" }}>
              <i className="fa-regular fa-clock" style={{ marginRight: 5 }} />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="fs-right-g">
          <button className="fs-btn" onClick={load} disabled={loading}>
            <i className={`fa-solid fa-rotate-right${loading ? " fa-spin" : ""}`} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="fs-toast fs-toast--error">
          <i className="fa-solid fa-circle-xmark" /> {error}
        </div>
      )}

      <div style={{
        display:               "grid",
        gridTemplateColumns:   "repeat(auto-fill, minmax(240px, 1fr))",
        gap:                   14,
        padding:               "0 0 20px",
      }}>
        {loading && !metrics
          ? METRIC_CARDS.map(c => <SkeletonCard key={c.key} />)
          : METRIC_CARDS.map(card => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={metrics?.[card.key]}
                icon={card.icon}
                color={card.color}
                bg={card.bg}
                border={card.border}
              />
            ))
        }
      </div>

      <div className="fs-pagination">
        <span className="fs-page-info">{METRIC_CARDS.length} metrics tracked</span>
      </div>

    </div>
  );
}
