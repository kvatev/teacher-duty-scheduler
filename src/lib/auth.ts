import { localDB } from "./localDB";

export type AdminRole = "super_admin" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: AdminRole;
  can_manage_schedule: boolean;
  can_manage_settings: boolean;
  can_send_broadcasts: boolean;
  created_at: string;
}

export interface UserPermissions {
  canManageSchedule: boolean;
  canManageSettings: boolean;
  canSendBroadcasts: boolean;
  canManageUsers: boolean;
}

const DEFAULT_ADMIN_PROFILE: UserProfile = {
  id: "local-admin",
  email: "admin@school.local",
  display_name: "Администратор",
  role: "super_admin",
  can_manage_schedule: true,
  can_manage_settings: true,
  can_send_broadcasts: true,
  created_at: new Date().toISOString(),
};

export async function getCurrentUser(): Promise<UserProfile | null> {
  const isLogged = localDB.getAdminSession();
  if (!isLogged) return null;
  return DEFAULT_ADMIN_PROFILE;
}

export function getPermissions(profile: UserProfile | null): UserPermissions {
  if (!profile) {
    return {
      canManageSchedule: false,
      canManageSettings: false,
      canSendBroadcasts: false,
      canManageUsers: false,
    };
  }

  return {
    canManageSchedule: true,
    canManageSettings: true,
    canSendBroadcasts: true,
    canManageUsers: true,
  };
}

export async function signIn(username: string, password: string): Promise<{ error: string | null }> {
  const normalized = username.trim().toLowerCase();
  if (normalized !== "admin" && normalized !== "admin@school.local" && normalized !== "admin@school.bg") {
    return { error: "Грешно потребителско име или парола" };
  }

  const isValid = await localDB.checkAdminPassword(password);
  if (!isValid) {
    return { error: "Грешно потребителско име или парола" };
  }
  localDB.setAdminSession(true);
  return { error: null };
}

export async function signOut(): Promise<void> {
  localDB.setAdminSession(false);
}

export async function updateAdminPassword(newPass: string): Promise<{ error: string | null }> {
  try {
    await localDB.setAdminPassword(newPass);
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Грешка при смяна на паролата" };
  }
}

// Fallback compatibility functions
export async function getAllAdmins(): Promise<UserProfile[]> {
  return [DEFAULT_ADMIN_PROFILE];
}

export async function createAdminUser(): Promise<{ error: string | null }> {
  return { error: null };
}

export async function updateAdminPermissions(): Promise<{ error: string | null }> {
  return { error: null };
}

export async function deleteAdmin(): Promise<{ error: string | null }> {
  return { error: null };
}
