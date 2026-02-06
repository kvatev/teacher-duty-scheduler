import { useState, useCallback, useMemo, useEffect } from "react";
import { Teacher, DutyAssignment, SchoolPeriod, getPeriodKey, getCurrentPeriod } from "@/types/schedule";

const STORAGE_PREFIX = "teacher-schedule-";
const CURRENT_PERIOD_KEY = "teacher-schedule-current-period";

const initialTeachers: Teacher[] = [
  { id: "1", name: "Десислава Димитрова" },
  { id: "2", name: "Илияна Филипова" },
  { id: "3", name: "Красимир Ватев" },
  { id: "4", name: "Албена Гарабедян" },
  { id: "5", name: "Станимир Христов" },
  { id: "6", name: "Надя Калъбалъкова" },
  { id: "7", name: "Даниела Кирякова" },
  { id: "8", name: "Станка Андонова" },
  { id: "9", name: "Силвия Инджова" },
  { id: "10", name: "Нина Николова" },
  { id: "11", name: "Павлина Стоянова" },
  { id: "12", name: "Ивелин Тонев" },
  { id: "13", name: "Жулиета Дросева" },
  { id: "14", name: "Нина Василева" },
  { id: "15", name: "Мирослава Петрова" },
];

const initialAssignments: DutyAssignment[] = [
  { teacherId: "1", day: "Понеделник", location: "Дежурни на III-ти етаж" },
  { teacherId: "2", day: "Понеделник", location: "Дежурни на III-ти етаж" },
  { teacherId: "5", day: "Понеделник", location: "Дежурни на IV-ти етаж" },
  { teacherId: "9", day: "Понеделник", location: "Училищен стол и пред кабинет по музика" },
  { teacherId: "11", day: "Понеделник", location: "Главен дежурен – западен вход 07:30-08:40 ч." },
];

function loadPeriodFromStorage(period: SchoolPeriod): { teachers: Teacher[]; assignments: DutyAssignment[] } {
  try {
    const key = STORAGE_PREFIX + getPeriodKey(period);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Check for legacy data (old single-period storage)
    const legacyKey = "teacher-schedule";
    const legacyData = localStorage.getItem(legacyKey);
    if (legacyData) {
      // Migrate legacy data to current period
      const parsed = JSON.parse(legacyData);
      savePeriodToStorage(period, parsed.teachers, parsed.assignments);
      // Remove legacy key after migration
      localStorage.removeItem(legacyKey);
      return parsed;
    }
  } catch (e) {
    console.error("Error loading from storage:", e);
  }
  return { teachers: initialTeachers, assignments: initialAssignments };
}

function savePeriodToStorage(period: SchoolPeriod, teachers: Teacher[], assignments: DutyAssignment[]) {
  try {
    const key = STORAGE_PREFIX + getPeriodKey(period);
    localStorage.setItem(key, JSON.stringify({ teachers, assignments }));
  } catch (e) {
    console.error("Error saving to storage:", e);
  }
}

function loadCurrentPeriod(): SchoolPeriod {
  try {
    const stored = localStorage.getItem(CURRENT_PERIOD_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading current period:", e);
  }
  return getCurrentPeriod();
}

function saveCurrentPeriod(period: SchoolPeriod) {
  try {
    localStorage.setItem(CURRENT_PERIOD_KEY, JSON.stringify(period));
  } catch (e) {
    console.error("Error saving current period:", e);
  }
}

export function useSchedule() {
  const [currentPeriod, setCurrentPeriod] = useState<SchoolPeriod>(loadCurrentPeriod);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data when period changes
  useEffect(() => {
    setIsLoading(true);
    const data = loadPeriodFromStorage(currentPeriod);
    setTeachers(data.teachers);
    setAssignments(data.assignments);
    setIsLoading(false);
  }, [currentPeriod]);

  // Save to storage whenever teachers or assignments change
  useEffect(() => {
    if (!isLoading) {
      savePeriodToStorage(currentPeriod, teachers, assignments);
    }
  }, [teachers, assignments, currentPeriod, isLoading]);

  const changePeriod = useCallback((newPeriod: SchoolPeriod) => {
    setCurrentPeriod(newPeriod);
    saveCurrentPeriod(newPeriod);
  }, []);

  const teacherAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teachers.forEach((t) => {
      counts[t.id] = 0;
    });
    assignments.forEach((a) => {
      if (counts[a.teacherId] !== undefined) {
        counts[a.teacherId]++;
      }
    });
    return counts;
  }, [teachers, assignments]);

  const addTeacher = useCallback((name: string) => {
    const newTeacher: Teacher = {
      id: Date.now().toString(),
      name: name.trim(),
    };
    setTeachers((prev) => [...prev, newTeacher]);
  }, []);

  const removeTeacher = useCallback((teacherId: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    setAssignments((prev) => prev.filter((a) => a.teacherId !== teacherId));
  }, []);

  const assignTeacher = useCallback((teacherId: string, day: string, location: string): boolean => {
    let success = false;
    setAssignments((prev) => {
      const exists = prev.some(
        (a) => a.teacherId === teacherId && a.day === day && a.location === location
      );
      if (exists) {
        success = false;
        return prev;
      }
      success = true;
      return [...prev, { teacherId, day, location }];
    });
    return success;
  }, []);

  const unassignTeacher = useCallback((teacherId: string, day: string, location: string) => {
    setAssignments((prev) =>
      prev.filter(
        (a) => !(a.teacherId === teacherId && a.day === day && a.location === location)
      )
    );
  }, []);

  const moveTeacher = useCallback(
    (teacherId: string, fromDay: string, fromLocation: string, toDay: string, toLocation: string) => {
      setAssignments((prev) => {
        const existsAtDest = prev.some(
          (a) => a.teacherId === teacherId && a.day === toDay && a.location === toLocation
        );
        if (existsAtDest) {
          return prev;
        }
        const filtered = prev.filter(
          (a) => !(a.teacherId === teacherId && a.day === fromDay && a.location === fromLocation)
        );
        return [...filtered, { teacherId, day: toDay, location: toLocation }];
      });
    },
    []
  );

  const getAssignmentsForCell = useCallback(
    (day: string, location: string) => {
      return assignments
        .filter((a) => a.day === day && a.location === location)
        .map((a) => teachers.find((t) => t.id === a.teacherId))
        .filter(Boolean) as Teacher[];
    },
    [assignments, teachers]
  );

  return {
    teachers,
    assignments,
    teacherAssignmentCounts,
    currentPeriod,
    isLoading,
    changePeriod,
    addTeacher,
    removeTeacher,
    assignTeacher,
    unassignTeacher,
    moveTeacher,
    getAssignmentsForCell,
  };
}
