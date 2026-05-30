/**
 * ADMIN DASHBOARD (ANALYTICS & MONITORING)
 * -----------------------------------------
 * The main overview page for administrators. It aggregates data from multiple 
 * endpoints (metrics, audit logs, user summaries) to provide a high-level 
 * system status.
 */
// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { getMetrics }               from "@/features/admin/api/MetricsApi";
import { getActionSummaries }       from "@/features/admin/api/ActionSummariesApi";
import { getAuditLogs }             from "@/features/admin/api/AuditLogsApi";
import { getContacts }              from "@/features/contacts/api/ContactsApi";
import { getUsers }                 from "@/features/admin/api/UsersApi";
import { getExtraFieldDefinitions } from "@/features/admin/api/ExtraFieldDefinitionsApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_TYPES = [
  { key: "bar",   label: "Bar — Action counts"    },
  { key: "line",  label: "Line — Audit log trend" },
  { key: "donut", label: "Donut — Field status"   },
];

const ACCENT       = "#7c6af7";
const SUCCESS_CLR  = "#4ade80";
const WARN_CLR     = "#f87171";
const DONUT_COLORS = [ACCENT, "#2a2a30"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

function safeNum(val) {
  if (val === null || val === undefined) return "—";
  return Number(val).toLocaleString();
}

function buildLineSeries(logs) {
  const map = {};
  logs.forEach(log => {
    if (!log.timestamp) return;
    const date = new Date(log.timestamp).toLocaleDateString();
    if (!map[date]) map[date] = { date, success: 0, failed: 0 };
    if (log.success) map[date].success++;
    else             map[date].failed++;
  });
  return Object.values(map).reverse();
}

// ─── Chart tooltip style ──────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background:   "#16161a",
    border:       "1px solid #2a2a30",
    borderRadius: 6,
    fontSize:     12,
    color:        "#e8e8ec",
  },
  itemStyle:  { color: "#e8e8ec" },
  labelStyle: { color: "#6b6b7a", marginBottom: 4 },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background:    "var(--fs-surface-card)",
      border:        "1px solid var(--fs-border)",
      borderRadius:  8,
      padding:       "16px 20px",
      display:       "flex",
      flexDirection: "column",
      gap:           6,
    }}>
      <span style={{
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        color:         "var(--fs-text-dim)",
      }}>
        {label}
      </span>
      <span style={{
        fontSize:           28,
        fontWeight:         700,
        color:              color ?? "var(--fs-text)",
        fontVariantNumeric: "tabular-nums",
        lineHeight:         1,
      }}>
        {value}
      </span>
    </div>
  );
}

function SectionCard({ title, children, loading, error, headerRight }) {
  return (
    <div style={{
      background:   "var(--fs-surface-card)",
      border:       "1px solid var(--fs-border)",
      borderRadius: 8,
      overflow:     "hidden",
    }}>
      <div style={{
        padding:        "12px 16px",
        borderBottom:   "1px solid var(--fs-border)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
      }}>
        <h3 style={{
          margin:        0,
          fontSize:      11,
          fontWeight:    700,
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          color:         "var(--fs-text-dim)",
        }}>
          {title}
        </h3>
        {headerRight}
      </div>
      <div style={{ padding: "12px 16px" }}>
        {loading && (
          <p style={{ fontSize: 13, color: "var(--fs-text-dim)", margin: 0 }}>Loading…</p>
        )}
        {!loading && error && (
          <p style={{ fontSize: 13, color: "var(--fs-error-text)", margin: 0 }}>{error}</p>
        )}
        {!loading && !error && children}
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div style={{
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
      padding:        "5px 0",
      borderBottom:   "1px solid var(--fs-border-item)",
    }}>
      <span style={{ fontSize: 13, color: "var(--fs-text-dim)" }}>{label}</span>
      <span style={{
        fontSize:           13,
        fontWeight:         600,
        color:              color ?? "var(--fs-text)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {safeNum(value)}
      </span>
    </div>
  );
}

function MiniBar({ count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div style={{
        flex:         1,
        height:       4,
        background:   "var(--fs-border-item)",
        borderRadius: 2,
        overflow:     "hidden",
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: ACCENT, borderRadius: 2 }} />
      </div>
      <span style={{
        fontSize:           12,
        color:              ACCENT,
        fontWeight:         600,
        minWidth:           32,
        textAlign:          "right",
        fontVariantNumeric: "tabular-nums",
      }}>
        {count.toLocaleString()}
      </span>
    </div>
  );
}

function StatusBadge({ success }) {
  return (
    <span style={{
      display:      "inline-block",
      padding:      "1px 7px",
      borderRadius: 4,
      fontSize:     11,
      fontWeight:   600,
      letterSpacing:"0.4px",
      background:   success ? "var(--fs-success-bg)"     : "var(--fs-error-bg)",
      color:        success ? "var(--fs-success-text)"   : "var(--fs-error-text)",
      border:       `1px solid ${success ? "var(--fs-success-border)" : "var(--fs-error-border)"}`,
    }}>
      {success ? "OK" : "Fail"}
    </span>
  );
}

function RoleBadge({ role }) {
  return (
    <span style={{
      display:      "inline-block",
      padding:      "1px 7px",
      borderRadius: 4,
      fontSize:     11,
      fontWeight:   600,
      letterSpacing:"0.4px",
      background:   "var(--fs-badge-core-bg)",
      color:        "var(--fs-badge-core-text)",
    }}>
      {role}
    </span>
  );
}

function ChartToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {CHART_TYPES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            fontSize:   11,
            padding:    "3px 10px",
            borderRadius: 4,
            border:     "1px solid var(--fs-border-item)",
            background: value === key ? ACCENT : "var(--fs-surface-item)",
            color:      value === key ? "#fff" : "var(--fs-text-dim)",
            cursor:     "pointer",
            fontWeight: value === key ? 600 : 400,
            transition: "background 0.12s, color 0.12s",
          }}
          title={label}
        >
          {key === "bar" ? "Bar" : key === "line" ? "Line" : "Donut"}
        </button>
      ))}
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function EmptyChart() {
  return (
    <div style={{
      height:          200,
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      color:           "var(--fs-text-dim)",
      fontSize:        13,
      fontStyle:       "italic",
    }}>
      No data available
    </div>
  );
}

function BarChartView({ data }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
        <XAxis dataKey="actionType" tick={{ fill: "#6b6b7a", fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: "#6b6b7a", fontSize: 11 }} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ data }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "#6b6b7a", fontSize: 11 }} />
        <YAxis tick={{ fill: "#6b6b7a", fontSize: 11 }} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#6b6b7a" }} />
        <Line type="monotone" dataKey="success" name="Success" stroke={SUCCESS_CLR} strokeWidth={2} dot={{ r: 3, fill: SUCCESS_CLR }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="failed"  name="Failed"  stroke={WARN_CLR}    strokeWidth={2} dot={{ r: 3, fill: WARN_CLR }}    activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DonutChartView({ active, inactive }) {
  const data = [
    { name: "Active",   value: active   },
    { name: "Inactive", value: inactive },
  ];
  if (active + inactive === 0) return <EmptyChart />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: DONUT_COLORS[i], flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--fs-text-dim)" }}>{d.name}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: DONUT_COLORS[i], marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
              {d.value}
            </span>
          </div>
        ))}
        <div style={{
          marginTop:    4,
          fontSize:     11,
          color:        "var(--fs-text-dim)",
          borderTop:    "1px solid var(--fs-border-item)",
          paddingTop:   8,
        }}>
          Total: {active + inactive} field{active + inactive !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  useFlexiSchemaCSS();
  const [metrics,     setMetrics]     = useState(null);
  const [actions,     setActions]     = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [contacts,    setContacts]    = useState(null);
  const [users,       setUsers]       = useState(null);
  const [extraDefs,   setExtraDefs]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [errors,      setErrors]      = useState({});
  const [chartType,   setChartType]   = useState("bar");

  // Track component mount status to prevent setting state on unmounted components
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrors({});

    // Define setErr locally inside useCallback so it doesn't violate exhaustive-deps rules
    const setErr = (key, msg) => {
      if (isMounted.current) {
        setErrors(prev => ({ ...prev, [key]: msg }));
      }
    };

    await Promise.allSettled([
      getMetrics()
        .then(d => isMounted.current && setMetrics(d))
        .catch(() => setErr("metrics", "Failed to load metrics")),
      getActionSummaries({ pageSize: 8, sortBy: "Count", sortOrder: "desc" })
        .then(d => isMounted.current && setActions(d.items ?? d ?? []))
        .catch(() => setErr("actions", "Failed to load action summaries")),
      getAuditLogs({ pageSize: 50, sortBy: "Timestamp", sortOrder: "desc" })
        .then(d => isMounted.current && setLogs(d.items ?? d ?? []))
        .catch(() => setErr("logs", "Failed to load audit logs")),
      getContacts({ page: 1, pageSize: 1 })
        .then(d => isMounted.current && setContacts(d))
        .catch(() => setErr("contacts", null)),
      getUsers({ page: 1, pageSize: 1 })
        .then(d => isMounted.current && setUsers(d))
        .catch(() => setErr("users", null)),
      getExtraFieldDefinitions()
        .then(d => isMounted.current && setExtraDefs(d ?? []))
        .catch(() => setErr("defs", null)),
    ]);

    if (isMounted.current) {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const totalContacts  = contacts?.totalCount ?? "—";
  const totalUsers     = users?.totalCount    ?? "—";
  const activeFields   = extraDefs ? extraDefs.filter(d =>  d.isActive).length : 0;
  const inactiveFields = extraDefs ? extraDefs.filter(d => !d.isActive).length : 0;
  const auditTotal     = metrics?.auditLogsTotal;
  
  // Memoize heavy derived data so it only runs when the underlying array actually changes
  const maxAction  = useMemo(() => actions.length > 0 ? Math.max(...actions.map(a => a.count)) : 1, [actions]);
  const lineSeries = useMemo(() => buildLineSeries(logs.slice(0, 50)), [logs]);

  const chartSubtitle = {
    bar:   "Top action types by frequency",
    line:  "Audit log outcomes over time (last 50 entries grouped by date)",
    donut: "Extra field definitions — active vs inactive",
  }[chartType];

  return (
    <div style={{ padding: 20 }}>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <button className="fs-btn" onClick={load} disabled={loading}>
          <i className={`fa-solid fa-rotate-right${loading ? " fa-spin" : ""}`} />
          {loading ? "Refreshing…" : " Refresh"}
        </button>
        {lastRefresh && (
          <span style={{ fontSize: 12, color: "var(--fs-text-dim)" }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap:                 10,
        marginBottom:        14,
      }}>
        <StatCard label="Total contacts"      value={loading ? "…" : safeNum(totalContacts)} />
        <StatCard label="Total users"         value={loading ? "…" : safeNum(totalUsers)} />
        <StatCard label="Active extra fields" value={loading ? "…" : (extraDefs ? safeNum(activeFields) : "—")} color={ACCENT} />
        <StatCard label="Audit logs"          value={loading ? "…" : safeNum(auditTotal)} color="var(--fs-text-dim)" />
      </div>

      {/* System health + Top actions */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap:                 10,
        marginBottom:        10,
      }}>
        <SectionCard title="System health" loading={loading && !metrics} error={errors.metrics}>
          {metrics && (
            <div>
              <MetricRow label="Valid validations"    value={metrics.validationValidTotal}     color="var(--fs-success-text)" />
              <MetricRow label="Invalid validations"  value={metrics.validationInvalidTotal}   color="var(--fs-error-text)" />
              <MetricRow label="Handled exceptions"   value={metrics.exceptionsHandledTotal}   color="var(--fs-error-text)" />
              <MetricRow label="Unhandled exceptions" value={metrics.exceptionsUnhandledTotal} color={WARN_CLR} />
              <MetricRow label="Exports succeeded"    value={metrics.exportSuccessTotal}       color="var(--fs-success-text)" />
              <MetricRow label="Exports failed"       value={metrics.exportFailedTotal}        color="var(--fs-error-text)" />
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top action types" loading={loading && actions.length === 0} error={errors.actions}>
          {actions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {actions.map(a => (
                <div key={a.actionType} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{
                    fontSize:      12,
                    color:         "var(--fs-text-dim)",
                    flex:          "0 0 140px",
                    overflow:      "hidden",
                    textOverflow:  "ellipsis",
                    whiteSpace:    "nowrap",
                  }}>
                    {a.actionType}
                  </span>
                  <MiniBar count={a.count} max={maxAction} />
                </div>
              ))}
            </div>
          )}
          {!loading && actions.length === 0 && !errors.actions && (
            <p style={{ fontSize: 13, color: "var(--fs-text-dim)", margin: 0, fontStyle: "italic" }}>No data.</p>
          )}
        </SectionCard>
      </div>

      {/* Chart section */}
      <div style={{ marginBottom: 10 }}>
        <SectionCard
          title="Analytics"
          loading={loading}
          error={null}
          headerRight={<ChartToggle value={chartType} onChange={setChartType} />}
        >
          <p style={{ fontSize: 11, color: "var(--fs-text-dim)", margin: "0 0 12px", fontStyle: "italic" }}>
            {chartSubtitle}
          </p>
          {chartType === "bar"   && <BarChartView  data={actions} />}
          {chartType === "line"  && <LineChartView data={lineSeries} />}
          {chartType === "donut" && <DonutChartView active={activeFields} inactive={inactiveFields} />}
        </SectionCard>
      </div>

      {/* Recent audit logs */}
      <SectionCard title="Recent audit logs" loading={loading && logs.length === 0} error={errors.logs}>
        {logs.slice(0, 5).length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 50  }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 80  }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 60  }} />
                <col />
              </colgroup>
              <thead>
                <tr style={{ background: "var(--fs-surface-header)" }}>
                  {["ID", "Time", "Username", "Role", "Action", "Status", "Error"].map(h => (
                    <th key={h} style={{
                      padding:       "6px 8px",
                      textAlign:     "left",
                      fontSize:      10,
                      fontWeight:    700,
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      color:         "var(--fs-text-dim)",
                      borderBottom:  "1px solid var(--fs-border-item)",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 5).map((log, i) => (
                  <tr key={log.auditLogId ?? i} style={{ borderBottom: "1px solid var(--fs-border-item)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--fs-text-dim)" }}>{log.auditLogId}</td>
                    <td style={{ padding: "6px 8px", color: "var(--fs-text-dim)", whiteSpace: "nowrap" }}>{formatTime(log.timestamp)}</td>
                    <td style={{ padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.username || "—"}</td>
                    <td style={{ padding: "6px 8px" }}>{log.userRole ? <RoleBadge role={log.userRole} /> : "—"}</td>
                    <td style={{ padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: ACCENT }}>{log.actionType || "—"}</td>
                    <td style={{ padding: "6px 8px" }}><StatusBadge success={log.success} /></td>
                    <td style={{ padding: "6px 8px", color: "var(--fs-error-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && logs.length === 0 && !errors.logs && (
          <p style={{ fontSize: 13, color: "var(--fs-text-dim)", margin: 0, fontStyle: "italic" }}>No recent logs.</p>
        )}
      </SectionCard>

    </div>
  );
}

