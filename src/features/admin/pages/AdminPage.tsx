// @ts-nocheck
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/features/admin/components/Sidebar";
import Dashboard from "@/features/admin/pages/Dashboard";
import MonitoringPage from "@/features/admin/pages/MonitoringPage";
import SystemManagementPage from "@/features/admin/pages/SystemManagementPage";
import UserManagementPage from "@/features/admin/pages/UserManagementPage";
import ContactsPage from "@/features/contacts/pages/ContactsPage";

export default function AdminPage({ userRole, setUserRole, requireLogin }) {
  if (userRole !== "Admin") return null;

  return (
    <div style={{
      display: "flex",
      width: "100%",         
      height: "calc(100vh - 56px)", 
      overflow: "hidden",
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        padding: 16,
        overflow: "auto",   
      }}>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contacts" element={<ContactsPage userRole={userRole} setUserRole={setUserRole} requireLogin={requireLogin} />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="system" element={<SystemManagementPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

