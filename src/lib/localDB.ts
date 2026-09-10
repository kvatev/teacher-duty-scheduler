import { AppSettings } from "@/hooks/useAppSettings";
import { SchoolPeriod, getCurrentPeriod } from "@/types/schedule";
import { Weekday } from "@/hooks/useUnavailability";

export interface DBPeriod {
  id: string;
  year: string;
  term: 1 | 2;
}

export interface DBTeacher {
  id: string;
  name: string;
  periodId: string;
}

export interface DBAssignment {
  id: string;
  teacherId: string;
  day: string;
  location: string;
  shiftNumber: number | null;
  periodId: string;
}

export interface DBUnavailability {
  id: string;
  teacher_id: string;
  weekday: Weekday | null;
  specific_date: string | null;
  note: string | null;
}

export interface DBBroadcast {
  id: string;
  message: string;
  priority: "info" | "warning" | "urgent";
  created_at: string;
}

export interface FullDatabaseBackup {
  version: number;
  exportedAt: string;
  periods: DBPeriod[];
  teachers: DBTeacher[];
  assignments: DBAssignment[];
  unavailability: DBUnavailability[];
  settings: AppSettings;
  broadcasts: DBBroadcast[];
}

export const STORAGE_KEYS = {
  PERIODS: "teacher_scheduler_periods",
  TEACHERS: "teacher_scheduler_teachers",
  ASSIGNMENTS: "teacher_scheduler_assignments",
  UNAVAILABILITY: "teacher_scheduler_unavailability",
  SETTINGS: "teacher_scheduler_settings",
  BROADCASTS: "teacher_scheduler_broadcasts",
  AUTH: "teacher_scheduler_auth",
  DISMISSED_BROADCASTS: "dismissedBroadcasts",
} as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  header_title: "График за дежурства",
  header_subtitle: 'СУ "Константин Петканов", град Бургас',
  footer_note: "*Забележка: 1 - дежури от 07:30-08:00 ч.; 2 - дежури от 08:00 до 08:40",
  admin_name: "Красимир Ватев",
  admin_email: "kvatev@outlook.com",
  pdf_school_name: 'СУ „КОНСТАНТИН ПЕТКАНОВ" – БУРГАС',
  pdf_school_info1: "гр. Бургас тел: 0876335444; тел:852-709; 854-704",
  pdf_school_info2: 'ж.к. „Меден рудник" e-mail: info-200232@edu.mon.bg',
  pdf_director_name: "ИВАЙЛО МАРКОВ",
  pdf_schedule_description: "за дежурство на учителите от прогимназиален и гимназиален етап",
  location_1: "Дежурни на III-ти етаж",
  location_2: "Дежурни на IV-ти етаж",
  location_3: "Училищен стол и пред кабинет по музика",
  location_4: "Главен дежурен – западен вход 07:30-08:40 ч.",
  logo_url: "",
  schedule_title: "ГРАФИК",
  approval_text: "УТВЪРЖДАВАМ:",
  approval_role: "ДИРЕКТОР",
  day_column_header: "Ден от седмицата",
  tip_text: "💡 Съвет: Провлачете учител от списъка вляво в желаната клетка, или преместете между клетки",
  term_1_label: "I учебен срок",
  term_2_label: "II учебен срок",
};

const INITIAL_TEACHER_NAMES = [
  "Десислава Димитрова",
  "Илияна Филипова",
  "Красимир Ватев",
  "Албена Гарабедян",
  "Станимир Христов",
  "Надя Калъбалъкова",
  "Даниела Кирякова",
  "Станка Андонова",
  "Силвия Инджова",
  "Нина Николова",
  "Павлина Стоянова",
  "Ивелин Тонев",
  "Жулиета Дросева",
  "Нина Василева",
  "Мирослава Петрова",
];

// Helper to generate simple unique IDs
export function generateId(): string {
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 9);
}

const SECURITY_SALT = "tds_su_petkanov_salt_secure_2026_k8v9";
// Pre-computed salted cryptographic hash for default administrator credentials.
// The plaintext password is NEVER stored anywhere in the codebase, bundle, or localStorage.
const INITIAL_ADMIN_HASH = "e548dff393af38d5da031f7fb1f6590472b267fae12c25312e213449babd5ff5";
const INITIAL_ADMIN_FALLBACK = "h-1ed41819";
const CURRENT_AUTH_SCHEMA_VERSION = 2;

export interface AuthStoragePayload {
  hash?: string;
  version?: number;
  updatedAt?: string;
}

// Salted cryptographic hash with 1000 rounds of SHA-256 key stretching
export async function hashPassword(password: string): Promise<string> {
  const normalized = password.trim();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      let data = enc.encode(normalized + SECURITY_SALT);
      for (let i = 0; i < 1000; i++) {
        const hashBuf = await crypto.subtle.digest("SHA-256", data);
        data = new Uint8Array(hashBuf);
      }
      return Array.from(data)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fallback below
    }
  }
  // Deterministic fallback hash with salt
  let hash = 0;
  const combined = normalized + SECURITY_SALT;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return "h-" + Math.abs(hash).toString(16);
}

// Ensure stale or legacy credentials from previous versions are automatically cleaned up
export function getSanitizedAuthData(): AuthStoragePayload {
  const authData = getFromStorage<AuthStoragePayload>(STORAGE_KEYS.AUTH, {});
  if (!authData || !authData.hash) {
    return {};
  }

  // Any legacy schema v1 or known old un-salted hash of "admin"
  const isLegacy =
    authData.version !== CURRENT_AUTH_SCHEMA_VERSION ||
    authData.hash === "c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd4" ||
    authData.hash.startsWith("local-hash-");

  if (isLegacy) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.AUTH);
        localStorage.removeItem("teacher_duty_admin_session");
      }
    } catch {
      // ignore
    }
    return {};
  }

  return authData;
}

// Safe storage access
function getFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === "undefined") return fallback;
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    console.warn(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
    // Dispatch custom event for cross-hook reactivity
    window.dispatchEvent(new CustomEvent("local-db-change", { detail: { key } }));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

// Initialize seed data if empty
function initializeSeedData(): { period: DBPeriod } {
  const current = getCurrentPeriod();
  let periods = getFromStorage<DBPeriod[]>(STORAGE_KEYS.PERIODS, []);
  
  if (periods.length === 0) {
    const defaultPeriod: DBPeriod = {
      id: generateId(),
      year: current.year,
      term: current.term,
    };
    periods = [defaultPeriod];
    setToStorage(STORAGE_KEYS.PERIODS, periods);

    const initialTeachers: DBTeacher[] = INITIAL_TEACHER_NAMES.map((name, i) => ({
      id: String(i + 1),
      name,
      periodId: defaultPeriod.id,
    }));
    setToStorage(STORAGE_KEYS.TEACHERS, initialTeachers);

    const initialAssignments: DBAssignment[] = [
      { id: generateId(), teacherId: "1", day: "Понеделник", location: "Дежурни на III-ти етаж", shiftNumber: null, periodId: defaultPeriod.id },
      { id: generateId(), teacherId: "2", day: "Понеделник", location: "Дежурни на III-ти етаж", shiftNumber: null, periodId: defaultPeriod.id },
      { id: generateId(), teacherId: "5", day: "Понеделник", location: "Дежурни на IV-ти етаж", shiftNumber: null, periodId: defaultPeriod.id },
      { id: generateId(), teacherId: "9", day: "Понеделник", location: "Училищен стол и пред кабинет по музика", shiftNumber: null, periodId: defaultPeriod.id },
      { id: generateId(), teacherId: "11", day: "Понеделник", location: "Главен дежурен – западен вход 07:30-08:40 ч.", shiftNumber: 1, periodId: defaultPeriod.id },
    ];
    setToStorage(STORAGE_KEYS.ASSIGNMENTS, initialAssignments);
    return { period: defaultPeriod };
  }

  return { period: periods[0] };
}

// Check initial seed and clean legacy auth data on module load
if (typeof window !== "undefined") {
  getSanitizedAuthData();
  initializeSeedData();
}

/* ============================================================
   LOCAL DATABASE API
============================================================ */

export const localDB = {
  // Periods
  getPeriods(): DBPeriod[] {
    const periods = getFromStorage<DBPeriod[]>(STORAGE_KEYS.PERIODS, []);
    if (periods.length === 0) {
      const { period } = initializeSeedData();
      return [period];
    }
    return periods;
  },

  ensurePeriod(period: SchoolPeriod): string {
    const periods = this.getPeriods();
    const existing = periods.find((p) => p.year === period.year && p.term === period.term);
    if (existing) return existing.id;

    const newPeriod: DBPeriod = {
      id: generateId(),
      year: period.year,
      term: period.term,
    };
    setToStorage(STORAGE_KEYS.PERIODS, [newPeriod, ...periods]);
    return newPeriod.id;
  },

  addPeriod(year: string, term: 1 | 2): DBPeriod {
    const periods = this.getPeriods();
    const existing = periods.find((p) => p.year === year && p.term === term);
    if (existing) return existing;

    const newPeriod: DBPeriod = {
      id: generateId(),
      year,
      term,
    };
    setToStorage(STORAGE_KEYS.PERIODS, [newPeriod, ...periods]);
    return newPeriod;
  },

  deletePeriod(id: string): void {
    const periods = this.getPeriods().filter((p) => p.id !== id);
    setToStorage(STORAGE_KEYS.PERIODS, periods);

    // Cascade delete teachers and assignments for this period
    const teachers = this.getTeachers().filter((t) => t.periodId !== id);
    setToStorage(STORAGE_KEYS.TEACHERS, teachers);

    const assignments = this.getAssignments().filter((a) => a.periodId !== id);
    setToStorage(STORAGE_KEYS.ASSIGNMENTS, assignments);
  },

  // Teachers
  getTeachers(periodId?: string): DBTeacher[] {
    let teachers = getFromStorage<DBTeacher[]>(STORAGE_KEYS.TEACHERS, []);
    if (teachers.length === 0) {
      this.getPeriods();
      teachers = getFromStorage<DBTeacher[]>(STORAGE_KEYS.TEACHERS, []);
    }
    if (!periodId) return teachers;
    return teachers.filter((t) => t.periodId === periodId);
  },

  addTeacher(periodIdOrName: string, maybeName?: string): DBTeacher | null {
    let periodId: string;
    let name: string;
    if (maybeName !== undefined) {
      periodId = periodIdOrName;
      name = maybeName;
    } else {
      const periods = this.getPeriods();
      periodId = periods[0]?.id || "default";
      name = periodIdOrName;
    }

    const trimmed = name.trim();
    const teachers = this.getTeachers();
    const exists = teachers.some(
      (t) => t.periodId === periodId && t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return null;

    const newTeacher: DBTeacher = {
      id: generateId(),
      name: trimmed,
      periodId,
    };
    setToStorage(STORAGE_KEYS.TEACHERS, [...teachers, newTeacher]);
    return newTeacher;
  },

  removeTeacher(teacherId: string): void {
    const teachers = this.getTeachers().filter((t) => t.id !== teacherId);
    setToStorage(STORAGE_KEYS.TEACHERS, teachers);

    const assignments = this.getAssignments().filter((a) => a.teacherId !== teacherId);
    setToStorage(STORAGE_KEYS.ASSIGNMENTS, assignments);

    const unavail = this.getUnavailabilities().filter((u) => u.teacher_id !== teacherId);
    setToStorage(STORAGE_KEYS.UNAVAILABILITY, unavail);
  },

  // Assignments
  getAssignments(periodId?: string): DBAssignment[] {
    const raw = getFromStorage<DBAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
    const seen = new Set<string>();
    const deduplicated: DBAssignment[] = [];
    let hadDuplicates = false;

    for (const a of raw) {
      const key = `${a.periodId}-${a.teacherId}-${a.day}-${a.location}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(a);
      } else {
        hadDuplicates = true;
      }
    }

    if (hadDuplicates && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(deduplicated));
      } catch (e) {
        console.error("Error cleaning duplicate assignments:", e);
      }
    }

    if (!periodId) return deduplicated;
    return deduplicated.filter((a) => a.periodId === periodId);
  },

  assignTeacher(periodId: string, teacherId: string, day: string, location: string, shiftNumber: number | null = null): boolean {
    const assignments = this.getAssignments();
    const exists = assignments.some(
      (a) => a.periodId === periodId && a.teacherId === teacherId && a.day === day && a.location === location
    );
    if (exists) return false;

    const newAssignment: DBAssignment = {
      id: generateId(),
      teacherId,
      day,
      location,
      shiftNumber,
      periodId,
    };
    setToStorage(STORAGE_KEYS.ASSIGNMENTS, [...assignments, newAssignment]);
    return true;
  },

  unassignTeacher(periodId: string, teacherId: string, day: string, location: string): void {
    const assignments = this.getAssignments().filter(
      (a) => !(a.periodId === periodId && a.teacherId === teacherId && a.day === day && a.location === location)
    );
    setToStorage(STORAGE_KEYS.ASSIGNMENTS, assignments);
  },

  moveTeacher(
    periodId: string,
    teacherId: string,
    fromDay: string,
    fromLocation: string,
    toDay: string,
    toLocation: string
  ): void {
    const assignments = this.getAssignments();
    const oldAssignment = assignments.find(
      (a) => a.periodId === periodId && a.teacherId === teacherId && a.day === fromDay && a.location === fromLocation
    );
    const shiftNumber = oldAssignment?.shiftNumber ?? null;

    const filtered = assignments.filter(
      (a) => !(a.periodId === periodId && a.teacherId === teacherId && a.day === fromDay && a.location === fromLocation)
    );

    filtered.push({
      id: generateId(),
      periodId,
      teacherId,
      day: toDay,
      location: toLocation,
      shiftNumber,
    });
    setToStorage(STORAGE_KEYS.ASSIGNMENTS, filtered);
  },

  updateShiftNumber(periodId: string, teacherId: string, day: string, location: string, shiftNumber: number | null): void {
    const assignments = this.getAssignments().map((a) => {
      if (a.periodId === periodId && a.teacherId === teacherId && a.day === day && a.location === location) {
        return { ...a, shiftNumber };
      }
      return a;
    });
    setToStorage(STORAGE_KEYS.ASSIGNMENTS, assignments);
  },

  setAssignmentsForPeriod(periodId: string, newAssignments: Omit<DBAssignment, "id">[]): void {
    const otherAssignments = this.getAssignments().filter((a) => a.periodId !== periodId);
    const withIds = newAssignments.map((a) => ({ ...a, id: generateId() }));
    setToStorage(STORAGE_KEYS.ASSIGNMENTS, [...otherAssignments, ...withIds]);
  },

  saveAssignments(periodId: string, newAssignments: Omit<DBAssignment, "id">[]): void {
    this.setAssignmentsForPeriod(periodId, newAssignments);
  },

  // Unavailability
  getUnavailabilities(teacherId?: string): DBUnavailability[] {
    const items = getFromStorage<DBUnavailability[]>(STORAGE_KEYS.UNAVAILABILITY, []);
    if (!teacherId) return items;
    return items.filter((u) => u.teacher_id === teacherId);
  },

  addWeekdayUnavailability(teacherId: string, weekday: Weekday, note?: string): DBUnavailability {
    const items = this.getUnavailabilities();
    const existingIndex = items.findIndex((u) => u.teacher_id === teacherId && u.weekday === weekday);
    if (existingIndex >= 0) {
      const updated = { ...items[existingIndex], note: note !== undefined ? (note || null) : items[existingIndex].note };
      items[existingIndex] = updated;
      setToStorage(STORAGE_KEYS.UNAVAILABILITY, [...items]);
      return updated;
    }

    const entry: DBUnavailability = {
      id: generateId(),
      teacher_id: teacherId,
      weekday,
      specific_date: null,
      note: note || null,
    };
    setToStorage(STORAGE_KEYS.UNAVAILABILITY, [...items, entry]);
    return entry;
  },

  addDateUnavailability(teacherId: string, dateStr: string, note?: string): DBUnavailability {
    const items = this.getUnavailabilities();
    const existingIndex = items.findIndex((u) => u.teacher_id === teacherId && u.specific_date === dateStr);
    if (existingIndex >= 0) {
      const updated = { ...items[existingIndex], note: note !== undefined ? (note || null) : items[existingIndex].note };
      items[existingIndex] = updated;
      setToStorage(STORAGE_KEYS.UNAVAILABILITY, [...items]);
      return updated;
    }

    const entry: DBUnavailability = {
      id: generateId(),
      teacher_id: teacherId,
      weekday: null,
      specific_date: dateStr,
      note: note || null,
    };
    setToStorage(STORAGE_KEYS.UNAVAILABILITY, [...items, entry]);
    return entry;
  },

  removeUnavailability(id: string): void {
    const items = this.getUnavailabilities().filter((u) => u.id !== id);
    setToStorage(STORAGE_KEYS.UNAVAILABILITY, items);
  },

  // App Settings
  getSettings(): AppSettings {
    return getFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_APP_SETTINGS);
  },

  saveSettings(updates: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const merged = { ...current, ...updates };
    setToStorage(STORAGE_KEYS.SETTINGS, merged);
    return merged;
  },

  // Broadcasts
  getBroadcasts(): DBBroadcast[] {
    return getFromStorage<DBBroadcast[]>(STORAGE_KEYS.BROADCASTS, [
      {
        id: "b-welcome",
        message: "Добре дошли в училищната система за дежурства!",
        priority: "info",
        created_at: new Date().toISOString(),
      },
    ]);
  },

  addBroadcast(message: string, priority: "info" | "warning" | "urgent"): DBBroadcast {
    const broadcasts = this.getBroadcasts();
    const entry: DBBroadcast = {
      id: generateId(),
      message,
      priority,
      created_at: new Date().toISOString(),
    };
    setToStorage(STORAGE_KEYS.BROADCASTS, [entry, ...broadcasts].slice(0, 15));
    return entry;
  },

  deleteBroadcast(id: string): void {
    const broadcasts = this.getBroadcasts().filter((b) => b.id !== id);
    setToStorage(STORAGE_KEYS.BROADCASTS, broadcasts);
  },

  // Auth / Admin Password
  async checkAdminPassword(password: string): Promise<boolean> {
    const authData = getSanitizedAuthData();
    const inputHash = await hashPassword(password);

    const targetHash = authData.hash || INITIAL_ADMIN_HASH;
    const targetFallback = authData.hash ? authData.hash : INITIAL_ADMIN_FALLBACK;

    const matches = inputHash === targetHash || inputHash === targetFallback;
    return matches;
  },

  async setAdminPassword(newPassword: string): Promise<void> {
    const hash = await hashPassword(newPassword);
    setToStorage<AuthStoragePayload>(STORAGE_KEYS.AUTH, {
      hash,
      version: CURRENT_AUTH_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    });
  },

  getAdminSession(): boolean {
    const session = getFromStorage<{ active?: boolean; sig?: string }>("teacher_duty_admin_session", {});
    const authData = getSanitizedAuthData();
    const currentHash = authData.hash || INITIAL_ADMIN_HASH;
    return !!(session.active && session.sig === currentHash.slice(0, 16));
  },

  setAdminSession(active: boolean): void {
    if (!active) {
      setToStorage("teacher_duty_admin_session", { active: false });
    } else {
      const authData = getSanitizedAuthData();
      const currentHash = authData.hash || INITIAL_ADMIN_HASH;
      setToStorage("teacher_duty_admin_session", {
        active: true,
        issuedAt: Date.now(),
        sig: currentHash.slice(0, 16),
      });
    }
    window.dispatchEvent(new CustomEvent("local-db-change", { detail: { key: "teacher_duty_admin_session" } }));
  },

  // Export / Import Full Database
  exportBackup(): FullDatabaseBackup {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      periods: this.getPeriods(),
      teachers: this.getTeachers(),
      assignments: this.getAssignments(),
      unavailability: this.getUnavailabilities(),
      settings: this.getSettings(),
      broadcasts: this.getBroadcasts(),
    };
  },

  importBackup(backup: FullDatabaseBackup): boolean {
    try {
      if (!backup || !backup.periods || !backup.teachers) {
        throw new Error("Invalid backup format");
      }
      setToStorage(STORAGE_KEYS.PERIODS, backup.periods);
      setToStorage(STORAGE_KEYS.TEACHERS, backup.teachers);
      setToStorage(STORAGE_KEYS.ASSIGNMENTS, backup.assignments || []);
      setToStorage(STORAGE_KEYS.UNAVAILABILITY, backup.unavailability || []);
      if (backup.settings) {
        setToStorage(STORAGE_KEYS.SETTINGS, { ...DEFAULT_APP_SETTINGS, ...backup.settings });
      }
      if (backup.broadcasts) {
        setToStorage(STORAGE_KEYS.BROADCASTS, backup.broadcasts);
      }
      window.dispatchEvent(new CustomEvent("local-db-change", { detail: { key: "all" } }));
      return true;
    } catch (e) {
      console.error("Failed to import backup:", e);
      return false;
    }
  },

  resetToDefaults(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.PERIODS);
    localStorage.removeItem(STORAGE_KEYS.TEACHERS);
    localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS);
    localStorage.removeItem(STORAGE_KEYS.UNAVAILABILITY);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.BROADCASTS);
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_BROADCASTS);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem("teacher_duty_admin_session");
    // Trigger initialization of default seed data
    this.getPeriods();
    this.getTeachers();
    this.getSettings();
    window.dispatchEvent(new CustomEvent("local-db-change", { detail: { key: "all" } }));
  },
};
