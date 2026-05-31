/**
 * modals/LoginModal.tsx
 */

import { useState } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { login } from "@/features/auth/api/AuthApi";
import { jwtDecode } from "jwt-decode";
import { parseLoginErrors } from "@/lib/index";
import "./LoginModal.css";

export default function LoginModal({ open, onClose, onSuccess }) {
  useFlexiSchemaCSS();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  function patch(key, value) {
    setCredentials(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const { token, refreshToken } = await login(credentials);

      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);

      const decoded = jwtDecode(token);
      const rawRole = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

      if (!rawRole) {
        setErrors({ general: "No role found in token." });
        return;
      }

      const normalizedRole =
        rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

      localStorage.setItem("role", normalizedRole);
      onSuccess(normalizedRole);
      onClose();
    } catch (err) {
      // err.errors may be a string[] from the backend, or err.message a plain string
      const raw = err?.errors ?? err?.message ?? "Login failed. Please try again.";
      setErrors(parseLoginErrors(raw));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      <div className="fs-login-overlay">
        <div className="fs-login-card">

          <button
            type="button"
            className="fs-login-btn-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>

          <div className="fs-login-logo">Flexi<span>Schema</span> CRM</div>
          <p className="fs-login-subtitle">Please enter your credentials to continue</p>

          {errors.general && (
            <div className="fs-login-error">
              <i className="fa-solid fa-triangle-exclamation" />
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="fs-login-field">
              <label htmlFor="lm-username">Username</label>
              <i className="fa-solid fa-user" />
              <input
                id="lm-username"
                type="text"
                placeholder="e.g. admin@core.io"
                value={credentials.username}
                autoComplete="username"
                onChange={e => patch("username", e.target.value)}
              />
              {errors.username && (
                <span className="fs-login-field-error">
                  <i className="fa-solid fa-triangle-exclamation" />
                  {errors.username}
                </span>
              )}
            </div>

            <div className="fs-login-field">
              <label htmlFor="lm-password">Password</label>
              <i className="fa-solid fa-lock" />
              <input
                id="lm-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={credentials.password}
                autoComplete="current-password"
                onChange={e => patch("password", e.target.value)}
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: "absolute",
                  right: "12px",
                  bottom: "12px",
                  background: "transparent",
                  border: "none",
                  color: "var(--fs-text-dim)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "4px"
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ position: "static", pointerEvents: "auto" }} />
              </button>
              {errors.password && (
                <span className="fs-login-field-error">
                  <i className="fa-solid fa-triangle-exclamation" style={{ position: "static", pointerEvents: "auto" }} />
                  {errors.password}
                </span>
              )}
            </div>

            <div className="fs-login-actions">
              <button type="submit" className="fs-login-btn-submit" disabled={loading}>
                {loading && <span className="fs-login-spinner" />}
                {loading ? "Signing in…" : "Access Portal"}
              </button>
            </div>
          </form>

          <div className="fs-login-demo-accounts">
            <p>Demo Accounts</p>
            <div className="fs-login-demo-actions">
              <button
                type="button"
                onClick={() => setCredentials({ username: "admin", password: "Password@123" })}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setCredentials({ username: "editor", password: "Password@123" })}
              >
                Editor
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
