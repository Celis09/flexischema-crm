import { useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import { UserRole } from "@/types";

// Reads the stored JWT and exposes the current user's id, username, and role.
// Mirrors the claim names the backend sets in AuthController and reads in
// AuditLoggingBehavior — no separate API call needed.
//
// Returns { currentUser: { userId, username, role } | null }
// null means the token is absent or malformed (i.e. the user is not logged in).

export function useCurrentUser() {
  const token = localStorage.getItem("token");
  const now = Date.now();

  const currentUser = useMemo(() => {
    if (!token) return null;

    try {
      const decoded = jwtDecode<any>(token);

      // Check expiry
      if (decoded.exp && decoded.exp * 1000 < now) {
        return null;
      }

      // ClaimTypes.NameIdentifier — set by AuthController as the user's integer PK
      const rawId = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
        ?? decoded["sub"];
      const userId = parseInt(rawId, 10);

      // ClaimTypes.Name — set in AuthController login claims
      const username = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]
        ?? "Unknown";

      // Role is already normalised and stored in localStorage by LoginModal
      const role = (localStorage.getItem("role") as UserRole) ?? "Viewer";

      return { userId, username, role };
    } catch {
      // Malformed token — treat as unauthenticated
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { currentUser };
}
