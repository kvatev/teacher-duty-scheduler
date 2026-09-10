import { useEffect, useState, useCallback } from "react";
import { localDB } from "@/lib/localDB";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface UnavailabilityEntry {
  id: string;
  teacher_id: string;
  weekday: Weekday | null;
  specific_date: string | null;
  note: string | null;
}

export const DAY_NAME_TO_WEEKDAY: Record<string, Weekday> = {
  Понеделник: "monday",
  Вторник: "tuesday",
  Сряда: "wednesday",
  Четвъртък: "thursday",
  Петък: "friday",
  Събота: "saturday",
  Неделя: "sunday",
};

export const WEEKDAY_TO_BG: Record<Weekday, string> = {
  monday: "Понеделник",
  tuesday: "Вторник",
  wednesday: "Сряда",
  thursday: "Четвъртък",
  friday: "Петък",
  saturday: "Събота",
  sunday: "Неделя",
};

export function useUnavailability() {
  const [entries, setEntries] = useState<UnavailabilityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(() => {
    const items = localDB.getUnavailabilities();
    setEntries(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const handleDbChange = () => fetchAll();
    window.addEventListener("local-db-change", handleDbChange);
    return () => window.removeEventListener("local-db-change", handleDbChange);
  }, [fetchAll]);

  const isUnavailable = useCallback(
    (teacherId: string, dayLabel: string): UnavailabilityEntry | null => {
      const weekday = DAY_NAME_TO_WEEKDAY[dayLabel];
      if (!weekday) return null;
      const match = entries.find(
        (e) => e.teacher_id === teacherId && e.weekday === weekday
      );
      return match || null;
    },
    [entries]
  );

  const getTeacherEntries = useCallback(
    (teacherId: string) => entries.filter((e) => e.teacher_id === teacherId),
    [entries]
  );

  const addWeekday = async (teacherId: string, weekday: Weekday, note?: string) => {
    localDB.addWeekdayUnavailability(teacherId, weekday, note);
    fetchAll();
    return true;
  };

  const addDate = async (teacherId: string, date: string, note?: string) => {
    localDB.addDateUnavailability(teacherId, date, note);
    fetchAll();
    return true;
  };

  const remove = async (id: string) => {
    localDB.removeUnavailability(id);
    fetchAll();
    return true;
  };

  return {
    entries,
    loading,
    isUnavailable,
    getTeacherEntries,
    addWeekday,
    addDate,
    remove,
    refresh: fetchAll,
  };
}
