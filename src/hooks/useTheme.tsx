/* eslint-disable react-refresh/only-export-components */
/**
 * ThemeContext.tsx
 *
 * Global light/dark theme provider.
 * - Reads initial value from localStorage ("theme" key), defaults to "dark".
 * - Writes back to localStorage on every toggle.
 * - Applies data-theme attribute to <html> so CSS variables work app-wide
 *   without needing per-component data-theme props.
 *
 * Usage:
 *   // Wrap your app root (App.tsx / main.tsx):
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 *
 *   // Consume anywhere:
 *   import { useTheme } from "./ThemeContext";
 *   const { theme, toggleTheme } = useTheme();
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(() => {
    // Read from localStorage on first render; fall back to "dark".
    try {
      return localStorage.getItem("theme") || "dark";
    } catch {
      return "dark";
    }
  });

  // Keep <html data-theme="..."> and localStorage in sync.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // localStorage unavailable (private browsing, etc.) — fail silently.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
