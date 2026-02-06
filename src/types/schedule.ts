export interface Teacher {
  id: string;
  name: string;
}

export interface DutyAssignment {
  teacherId: string;
  day: string;
  location: string;
}

export interface ScheduleState {
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
  "Дежурни на III-ти етаж",
  "Дежурни на IV-ти етаж",
  "Училищен стол и пред кабинет по музика",
  "Главен дежурен – западен вход 07:30-08:40 ч.",
] as const;

export type Day = typeof DAYS[number];
export type Location = typeof LOCATIONS[number];
