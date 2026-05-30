/**
 * Header.tsx — owns the global theme toggle.
 * Class names aligned to Header.css (fs-header, fs-header__*, fs-header__btn).
 */

import { useTheme } from "@/hooks/useTheme";
import { useFlexiSchemaCSS } from "@/hooks/useFlexiSchemaCSS";
import "./Header.css";

export default function Header({ userRole, setUserRole, onLoginClick }) {
  useFlexiSchemaCSS();
  const { theme, toggleTheme } = useTheme();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    setUserRole(null);
  }

  return (
    <header className="fs-header">
      <h1 className="fs-header__title">
        Flexi<span>Schema</span>
      </h1>

      <div className="fs-header__auth">
        {userRole ? (
          <>
            <span className="fs-header__role">
              Logged in as <strong>{userRole}</strong>
            </span>
            <button className="fs-header__btn" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Logout
            </button>
          </>
        ) : (
          <button className="fs-header__btn fs-header__btn--login" onClick={onLoginClick}>
            <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Login
          </button>
        )}

        {/* ── Global theme toggle — always last ── */}
        <button
          className="fs-header__btn"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark"
            ? <i className="fa-solid fa-sun" aria-hidden="true" />
            : <i className="fa-solid fa-moon" aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
