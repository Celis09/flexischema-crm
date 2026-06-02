/**
 * modals/LoginModal.tsx
 */

import { useState, useRef } from "react";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import { login } from "@/features/auth/api/AuthApi";
import { parseLoginErrors } from "@/lib/index";
import "./LoginModal.css";

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "Password@123";

export default function LoginModal({ open, onClose, onSuccess }) {
  useFlexiSchemaCSS();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const passwordRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function patch(key, value) {
    setCredentials(prev => ({ ...prev, [key]: value }));
    // Clear errors when user starts retyping
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      delete next.general;
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Client-side empty field validation
    const validationErrors: Record<string, string> = {};
    if (!credentials.username.trim()) validationErrors.username = "Username is required.";
    if (!credentials.password.trim()) validationErrors.password = "Password is required.";
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const data = await login(credentials);

      // Read username/role/userId from the login response JSON
      const role = data.role
        ? data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase()
        : null;

      if (!role) {
        setErrors({ general: "No role found in login response." });
        return;
      }

      // Store user info in localStorage for UI display only
      // (auth tokens are now in httpOnly cookies)
      localStorage.setItem("role", role);
      if (data.username) localStorage.setItem("username", data.username);
      if (data.userId != null) localStorage.setItem("userId", String(data.userId));

      onSuccess(role);
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
      <div className="fs-login-overlay">
        <div className="fs-login-card">

          <button
            type="button"
            className="fs-login-btn-close"
            onClick={onClose}
            disabled={loading}
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
              <div className="fs-login-input-wrap">
                <i className="fa-solid fa-user" />
                <input
                  id="lm-username"
                  type="text"
                  placeholder="e.g. admin@core.io"
                  value={credentials.username}
                  autoComplete="username"
                  onChange={e => patch("username", e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      passwordRef.current?.focus();
                    }
                  }}
                />
              </div>
              {errors.username && (
                <span className="fs-login-field-error">
                  <i className="fa-solid fa-triangle-exclamation" />
                  {errors.username}
                </span>
              )}
            </div>

            <div className="fs-login-field">
              <label htmlFor="lm-password">Password</label>
              <div className="fs-login-input-wrap">
                <i className="fa-solid fa-lock" />
                <input
                  id="lm-password"
                  ref={passwordRef}
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} style={{ position: "static", pointerEvents: "auto" }} />
                </button>
              </div>
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
                onClick={() => setCredentials({ username: "admin", password: DEMO_PASSWORD })}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setCredentials({ username: "editor", password: DEMO_PASSWORD })}
              >
                Editor
              </button>
            </div>
          </div>

        </div>
      </div>
  );
}
