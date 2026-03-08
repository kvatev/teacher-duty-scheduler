import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  isAdmin: boolean; // Backward compatible: true if user is logged in with any admin role
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
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await refreshUser();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await refreshUser();
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
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
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        permissions, 
        isLoading, 
        isAuthenticated, 
        isSuperAdmin,
        login, 
        logout, 
        refreshUser 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
