import { useMemo } from "react";
import { UserRole } from "@/types";

// Reads the stored user info from localStorage and exposes the current user's
// id, username, and role. These are set by LoginModal on successful login and
// cleared on logout. Auth tokens are now stored in httpOnly cookies.
//
// Returns { currentUser: { userId, username, role } | null }
// null means the user is not logged in.

export function useCurrentUser() {
  const userIdStr = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role") as UserRole;

  const currentUser = useMemo(() => {
    if (!username || !role) return null;

    return { 
      userId: userIdStr ? parseInt(userIdStr, 10) : null, 
      username, 
      role 
    };
  }, [userIdStr, username, role]);

  return { currentUser };
}
