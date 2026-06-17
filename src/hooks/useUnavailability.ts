import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("teacher_unavailability")
      .select("*");
    if (!error && data) {
      setEntries(data as UnavailabilityEntry[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
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
    const { error } = await supabase
      .from("teacher_unavailability")
      .insert({ teacher_id: teacherId, weekday, note: note || null });
    if (!error) await fetchAll();
    return !error;
  };

  const addDate = async (teacherId: string, date: string, note?: string) => {
    const { error } = await supabase
      .from("teacher_unavailability")
      .insert({ teacher_id: teacherId, specific_date: date, note: note || null });
    if (!error) await fetchAll();
    return !error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("teacher_unavailability")
      .delete()
      .eq("id", id);
    if (!error) await fetchAll();
    return !error;
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
