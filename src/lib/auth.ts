import { supabase } from "@/integrations/supabase/client";

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
  canManageUsers: boolean; // Only super_admin
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
    role: profile.role as AdminRole,
    can_manage_schedule: profile.can_manage_schedule,
    can_manage_settings: profile.can_manage_settings,
    can_send_broadcasts: profile.can_send_broadcasts,
    created_at: profile.created_at,
  };
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

  const isSuperAdmin = profile.role === "super_admin";

  return {
    canManageSchedule: isSuperAdmin || profile.can_manage_schedule,
    canManageSettings: isSuperAdmin || profile.can_manage_settings,
    canSendBroadcasts: isSuperAdmin || profile.can_send_broadcasts,
    canManageUsers: isSuperAdmin,
  };
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  // Позволяваме вход само с потребителско име (напр. "admin")
  const identifier = email.trim();
  const loginEmail = identifier.includes("@") ? identifier : `${identifier}@admin.com`;

  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Грешно потребителско име или парола" };
    }
    return { error: error.message };
  }
  return { error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function createAdminUser(
  email: string,
  password: string,
  displayName: string,
  permissions: {
    canManageSchedule: boolean;
    canManageSettings: boolean;
    canSendBroadcasts: boolean;
  }
): Promise<{ error: string | null }> {
  // This requires the service role key, so we'll use an edge function
  const { data, error } = await supabase.functions.invoke("create-admin", {
    body: { email, password, displayName, permissions },
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return { error: null };
}

export async function updateAdminPermissions(
  userId: string,
  permissions: {
    canManageSchedule: boolean;
    canManageSettings: boolean;
    canSendBroadcasts: boolean;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({
      can_manage_schedule: permissions.canManageSchedule,
      can_manage_settings: permissions.canManageSettings,
      can_send_broadcasts: permissions.canSendBroadcasts,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function deleteAdmin(userId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("delete-admin", {
    body: { userId },
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return { error: null };
}

export async function getAllAdmins(): Promise<UserProfile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (!data) return [];

  return data.map((p) => ({
    id: p.id,
    email: p.email,
    display_name: p.display_name,
    role: p.role as AdminRole,
    can_manage_schedule: p.can_manage_schedule,
    can_manage_settings: p.can_manage_settings,
    can_send_broadcasts: p.can_send_broadcasts,
    created_at: p.created_at,
  }));
}
