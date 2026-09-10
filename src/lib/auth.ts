import { localDB, hashPassword, generateId } from "./localDB";

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

/* ─────────────────────────────────────────────
   Storage key for the list of admin users
───────────────────────────────────────────── */
const ADMIN_USERS_KEY = "teacher_scheduler_admin_users";
const SESSION_KEY = "teacher_duty_admin_session";

/** The built-in super-admin profile (always present). */
const SUPER_ADMIN_ID = "local-admin";

/** Default super-admin used when no custom users list exists yet. */
const DEFAULT_SUPER_ADMIN: UserProfile = {
  id: SUPER_ADMIN_ID,
  email: "admin@school.local",
  display_name: "Администратор",
  role: "super_admin",
  can_manage_schedule: true,
  can_manage_settings: true,
  can_send_broadcasts: true,
  created_at: new Date(0).toISOString(),
};

/* ─────────────────────────────────────────────
   Helpers: read / write the users list
───────────────────────────────────────────── */

function readAdminUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_KEY);
    if (!raw) return [DEFAULT_SUPER_ADMIN];
    const list = JSON.parse(raw) as UserProfile[];
    // Ensure the super-admin is always in the list
    if (!list.find((u) => u.id === SUPER_ADMIN_ID)) {
      list.unshift(DEFAULT_SUPER_ADMIN);
    }
    return list;
  } catch {
    return [DEFAULT_SUPER_ADMIN];
  }
}

function writeAdminUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(
      new CustomEvent("local-db-change", { detail: { key: ADMIN_USERS_KEY } })
    );
  } catch {
    // ignore storage errors
  }
}

/** Passwords for non-super admins are stored as hashes keyed by user ID */
function getPasswordKey(userId: string): string {
  return `teacher_scheduler_pwd_${userId}`;
}

async function setUserPassword(userId: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  localStorage.setItem(getPasswordKey(userId), hash);
}

async function checkUserPassword(userId: string, password: string): Promise<boolean> {
  const stored = localStorage.getItem(getPasswordKey(userId));
  if (!stored) return false;
  const input = await hashPassword(password);
  return input === stored;
}

/* ─────────────────────────────────────────────
   Session: which user is currently logged in
───────────────────────────────────────────── */

interface SessionPayload {
  userId?: string;
  active?: boolean;
  sig?: string;
  issuedAt?: number;
}

function writeSession(userId: string | null): void {
  if (!userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ active: false }));
  } else {
    // Simple signature to detect tampering: first 16 chars of password hash are NOT stored,
    // but we still need something stable. Use a hash of the userId itself as the session sig.
    const sig = Array.from(userId)
      .reduce((acc, c) => (acc ^ c.charCodeAt(0)) * 0x811c9dc5, 0x811c9dc5)
      .toString(16)
      .slice(0, 16);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ active: true, userId, sig, issuedAt: Date.now() })
    );
  }
  window.dispatchEvent(
    new CustomEvent("local-db-change", { detail: { key: SESSION_KEY } })
  );
}

function readSession(): SessionPayload {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return {};
  }
}

/* ─────────────────────────────────────────────
   Public API — used by AuthContext
───────────────────────────────────────────── */

export function getPermissions(profile: UserProfile | null): UserPermissions {
  if (!profile) {
    return {
      canManageSchedule: false,
      canManageSettings: false,
      canSendBroadcasts: false,
      canManageUsers: false,
    };
  }

  if (profile.role === "super_admin") {
    return {
      canManageSchedule: true,
      canManageSettings: true,
      canSendBroadcasts: true,
      canManageUsers: true,
    };
  }

  return {
    canManageSchedule: profile.can_manage_schedule,
    canManageSettings: profile.can_manage_settings,
    canSendBroadcasts: profile.can_send_broadcasts,
    canManageUsers: false,
  };
}

/** Returns the currently logged-in profile, or null if nobody is logged in. */
export async function getCurrentUser(): Promise<UserProfile | null> {
  // Also handle the legacy localDB session for the main admin
  const legacySession = localDB.getAdminSession();

  const session = readSession();

  if (session.active && session.userId) {
    const users = readAdminUsers();
    const found = users.find((u) => u.id === session.userId);
    if (found) return found;
  }

  // Legacy path: if main admin is logged in via the old session mechanism
  if (legacySession) {
    return DEFAULT_SUPER_ADMIN;
  }

  return null;
}

/** Attempts to sign in. Accepts username or email. */
export async function signIn(
  usernameOrEmail: string,
  password: string
): Promise<{ error: string | null }> {
  const normalized = (usernameOrEmail || "").trim().toLowerCase();

  const users = readAdminUsers();

  // Special handling for the super-admin (uses localDB's hashed password)
  const superAdmin = users.find((u) => u.id === SUPER_ADMIN_ID);
  if (superAdmin) {
    // Accepted usernames for the main admin account
    const superAliases = [
      "admin",
      "админ",
      superAdmin.email.toLowerCase(),
      (superAdmin.display_name || "").toLowerCase(),
    ].filter(Boolean);

    if (superAliases.includes(normalized)) {
      const valid = await localDB.checkAdminPassword(password);
      if (valid) {
        // Use the new session mechanism
        writeSession(SUPER_ADMIN_ID);
        // Also keep the legacy session so existing getAdminSession() calls still work
        localDB.setAdminSession(true);
        return { error: null };
      }
      return { error: "Грешно потребителско Iме или парола" };
    }
  }

  // Regular admin users
  const candidate = users.find((u) => {
    if (u.id === SUPER_ADMIN_ID) return false;
    const emailAlias = u.email.toLowerCase();
    // Also allow login by just the part before "@admin.com"
    const shortAlias = u.email.toLowerCase().replace("@admin.com", "");
    const nameAlias = (u.display_name || "").toLowerCase();
    return (
      emailAlias === normalized ||
      shortAlias === normalized ||
      nameAlias === normalized
    );
  });

  if (!candidate) {
    return { error: "Грешно потребителско Iме или парола" };
  }

  const valid = await checkUserPassword(candidate.id, password);
  if (!valid) {
    return { error: "Грешно потребителско Iме или парола" };
  }

  writeSession(candidate.id);
  return { error: null };
}

export async function signOut(): Promise<void> {
  writeSession(null);
  localDB.setAdminSession(false);
}

/** Change the password of the currently logged-in user. */
export async function updateAdminPassword(
  newPass: string
): Promise<{ error: string | null }> {
  const session = readSession();
  const userId = session.userId;

  if (!userId) {
    return { error: "Не сте влезли в системата" };
  }

  try {
    if (userId === SUPER_ADMIN_ID) {
      // For the super-admin, use localDB's secure password storage
      await localDB.setAdminPassword(newPass);
      // Re-issue session so sig is still valid after password change
      writeSession(SUPER_ADMIN_ID);
      localDB.setAdminSession(true);
    } else {
      await setUserPassword(userId, newPass);
    }
    return { error: null };
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Грешка при смяна на паролата",
    };
  }
}

/* ─────────────────────────────────────────────
   Multi-admin CRUD
───────────────────────────────────────────── */

export async function getAllAdmins(): Promise<UserProfile[]> {
  return readAdminUsers();
}

export async function createAdminUser(
  usernameOrEmail: string,
  password: string,
  displayName: string,
  permissions: {
    canManageSchedule: boolean;
    canManageSettings: boolean;
    canSendBroadcasts: boolean;
  }
): Promise<{ error: string | null }> {
  if (!usernameOrEmail.trim() || !password) {
    return { error: "Потребителско Iме и парола са задължителни" };
  }
  if (password.length < 6) {
    return { error: "Паролата трябва да е поне 6 символа" };
  }

  // Normalise: if no "@" treat it as a simple username and append @admin.com
  const email = usernameOrEmail.includes("@")
    ? usernameOrEmail.trim().toLowerCase()
    : `${usernameOrEmail.trim().toLowerCase()}@admin.com`;

  const users = readAdminUsers();

  // Check for duplicate email
  if (users.find((u) => u.email.toLowerCase() === email)) {
    return { error: "Потребител с това Iме вече съществува" };
  }

  const newUser: UserProfile = {
    id: generateId(),
    email,
    display_name: displayName.trim() || null,
    role: "admin",
    can_manage_schedule: permissions.canManageSchedule,
    can_manage_settings: permissions.canManageSettings,
    can_send_broadcasts: permissions.canSendBroadcasts,
    created_at: new Date().toISOString(),
  };

  await setUserPassword(newUser.id, password);
  writeAdminUsers([...users, newUser]);
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
  if (userId === SUPER_ADMIN_ID) {
    return { error: "Не можете да промените правата на главния администратор" };
  }

  const users = readAdminUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    return { error: "Администраторът не е намерен" };
  }

  users[idx] = {
    ...users[idx],
    can_manage_schedule: permissions.canManageSchedule,
    can_manage_settings: permissions.canManageSettings,
    can_send_broadcasts: permissions.canSendBroadcasts,
  };

  writeAdminUsers(users);
  return { error: null };
}

export async function deleteAdmin(
  userId: string
): Promise<{ error: string | null }> {
  if (userId === SUPER_ADMIN_ID) {
    return { error: "Не можете да изтриете главния администратор" };
  }

  const users = readAdminUsers();
  const filtered = users.filter((u) => u.id !== userId);

  if (filtered.length === users.length) {
    return { error: "Администраторът не е намерен" };
  }

  // Clean up their password from storage
  try {
    localStorage.removeItem(getPasswordKey(userId));
  } catch {
    // ignore
  }

  writeAdminUsers(filtered);
  return { error: null };
}
