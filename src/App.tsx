/**
 * APP ENTRY & ROUTER
 * -------------------
 * This is the main shell of the application. It manages the global 
 * authentication state (userRole) and handles top-level routing 
 * depending on whether the user is an Admin or a regular user.
 */
// @ts-nocheck
import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./styles/fs-tokens.css";
import "./index.css";

import { ThemeProvider } from "@/hooks/useTheme";
import ContactsPage from "@/features/contacts/pages/ContactsPage";
import AdminPage from "./features/admin/pages/AdminPage";
import Header from "./components/Header";
import LoginModal from "./features/auth/components/LoginModal";
import NotFoundPage from "./components/NotFoundPage";

export default function App() {
  const [userRole, setUserRole] = useState(localStorage.getItem("role"));
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const navigate = useNavigate();

  function requireLogin() {
    if (!userRole) {
      setIsLoginOpen(true);
      return false;
    }
    return true;
  }

  return (
    <ThemeProvider>
      <div style={{
        display:       "flex",
        flexDirection: "column",
        height:        "100vh",
        width:         "100%",
        overflow:      "hidden",
      }}>
        <Header
          userRole={userRole}
          setUserRole={setUserRole}
          onLoginClick={() => setIsLoginOpen(true)}
        />

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <Routes>
            <Route path="/admin/*" element={
              userRole === "Admin" ? (
                <AdminPage userRole={userRole} setUserRole={setUserRole} requireLogin={requireLogin} />
              ) : (
                <Navigate to="/contacts" replace />
              )
            } />
            <Route path="/contacts/*" element={
              userRole === "Admin" ? (
                <Navigate to="/admin/contacts" replace />
              ) : (
                <ContactsPage
                  key={userRole ?? "guest"}
                  userRole={userRole}
                  setUserRole={setUserRole}
                  requireLogin={requireLogin}
                />
              )
            } />
            <Route path="/" element={
              <Navigate to={userRole === "Admin" ? "/admin" : "/contacts"} replace />
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>

        <LoginModal
          open={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onSuccess={role => {
            setUserRole(role);
            setIsLoginOpen(false);
            if (role === "Admin") {
              navigate("/admin/dashboard");
            }
          }}
        />
      </div>
    </ThemeProvider>
  );
}

