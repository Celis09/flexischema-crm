import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import ConfirmModal from "@/features/contacts/components/ConfirmModal";
import "./Sidebar.css";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: "/admin/dashboard",        label: "Dashboard",          icon: "fa-solid fa-gauge" },
  { path: "/admin/contacts",         label: "Contacts Directory", icon: "fa-solid fa-address-book" },
  { path: "/admin/monitoring",       label: "Monitoring",         icon: "fa-solid fa-chart-line" },
  { path: "/admin/system",           label: "System Management",  icon: "fa-solid fa-sliders" },
  { path: "/admin/users",            label: "User Management",    icon: "fa-solid fa-users-gear" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  useFlexiSchemaCSS();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleToggle = () => {
    setCollapsed(c => {
      const newVal = !c;
      localStorage.setItem("sidebarCollapsed", String(newVal));
      return newVal;
    });
  };

  const executeLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    window.location.href = "/";
  };

  return (
    <>
      <div className={`fs-sidebar${collapsed ? " fs-sidebar--collapsed" : ""}`}>

        {/* Header */}
        <div className="fs-sidebar__header">
          <div className="fs-sidebar__logo">
            <div className="fs-sidebar__logo-icon">
              <i className="fa-solid fa-database" />
            </div>
            <span className="fs-sidebar__logo-text">Flexi<span style={{ color: "var(--fs-accent)" }}>Schema</span></span>
          </div>
          <button
            className="fs-sidebar__toggle"
            onClick={handleToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={`fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-left"}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="fs-sidebar__nav" aria-label="Main navigation">
          <div className="fs-sidebar__section-label">Menu</div>

          {NAV_ITEMS.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                className={`fs-nav-item${isActive ? " fs-nav-item--active" : ""}`}
                onClick={() => navigate(item.path)}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="fs-nav-item__icon"><i className={item.icon} /></span>
                <span className="fs-nav-item__label">{item.label}</span>
                <span className="fs-nav-item__tooltip">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="fs-sidebar__footer">
          <button
            className="fs-nav-item"
            onClick={() => setConfirmOpen(true)}
          >
            <span className="fs-nav-item__icon"><i className="fa-solid fa-right-from-bracket" /></span>
            <span className="fs-nav-item__label">Logout</span>
            <span className="fs-nav-item__tooltip">Logout</span>
          </button>
        </div>

      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        danger={true}
        onConfirm={executeLogout}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
