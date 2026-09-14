export type SchoolStage = "secondary" | "primary";

export interface Teacher {
  id: string;
  name: string;
  stage?: SchoolStage;
}

export interface DutyAssignment {
  teacherId: string;
  day: string;
  location: string;
  shiftNumber?: number | null;
  stage?: SchoolStage;
  note?: string | null;
}

export interface CellTeacher extends Teacher {
  shiftNumber?: number | null;
  note?: string | null;
}

export interface ScheduleState {
  teachers: Teacher[];
  assignments: DutyAssignment[];
}

// Period types for history feature
export interface SchoolPeriod {
  year: string; // e.g., "2024/2025"
  term: 1 | 2; // 1 = I срок, 2 = II срок
}

export interface SchedulePeriodData {
  period: SchoolPeriod;
  teachers: Teacher[];
  assignments: DutyAssignment[];
}

export const DAYS = [
  "Понеделник",
  "Вторник",
  "Сряда",
  "Четвъртък",
  "Петък",
] as const;

export const LOCATIONS = [
  "Дежурен на 0 етаж",
  "Дежурни на III-ти етаж",
  "Дежурни на IV-ти етаж",
  "Училищен стол и пред кабинет по музика",
  "Главен дежурен – западен вход 07:30-08:40 ч.",
] as const;

export const PRIMARY_LOCATIONS = [
  "Главен дежурен параден вход - 07:00 ч.",
  "Дежурен на I етаж - 07:30 ч.",
  "Дежурен на II етаж - 07:30 ч.",
] as const;

export type Day = typeof DAYS[number];
export type Location = typeof LOCATIONS[number];
export type PrimaryLocation = typeof PRIMARY_LOCATIONS[number];

// Available school years (can be extended)
export const SCHOOL_YEARS = [
  "2025/2026",
  "2024/2025",
  "2023/2024",
  "2022/2023",
] as const;

export const TERMS = [
  { value: 1 as const, label: "I срок" },
  { value: 2 as const, label: "II срок" },
] as const;

export function getPeriodKey(period: SchoolPeriod): string {
  return `${period.year}-term${period.term}`;
}

export function getCurrentPeriod(): SchoolPeriod {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  
  // School year logic: Sept-Dec = first half of year, Jan-Aug = second half
  // Term 1: September - January, Term 2: February - June
  if (month >= 8) {
    // September onwards - start of new school year, term 1
    return { year: `${year}/${year + 1}`, term: 1 };
  } else if (month === 0) {
    // January - still term 1 of the ongoing school year
    return { year: `${year - 1}/${year}`, term: 1 };
  } else {
    // February - August: term 2 of the school year (or summer break)
    return { year: `${year - 1}/${year}`, term: 2 };
  }
}
