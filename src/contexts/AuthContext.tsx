import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { 
  UserProfile, 
  UserPermissions, 
  getCurrentUser, 
  getPermissions, 
  signIn as authSignIn, 
  signOut as authSignOut 
} from "@/lib/auth";

interface AuthContextType {
  user: UserProfile | null;
  permissions: UserPermissions;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const profile = await getCurrentUser();
    setUser(profile);
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));

    const handleDbChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (customEvent.detail?.key === "all" || customEvent.detail?.key === "teacher_duty_admin_session") {
        refreshUser();
      }
    };

    window.addEventListener("local-db-change", handleDbChange);
    return () => window.removeEventListener("local-db-change", handleDbChange);
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authSignIn(email, password);
    if (!result.error) {
      await refreshUser();
    }
    return result;
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await authSignOut();
    setUser(null);
  }, []);

  const permissions = getPermissions(user);
  const isAuthenticated = user !== null;
  const isSuperAdmin = isAuthenticated;
  const isAdmin = isAuthenticated;

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        permissions, 
        isLoading, 
        isAuthenticated, 
        isSuperAdmin, 
        isAdmin, 
        login, 
        logout, 
        refreshUser 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
