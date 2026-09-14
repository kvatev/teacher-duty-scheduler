import { useState, useCallback, useMemo, useEffect } from "react";
import { Teacher, DutyAssignment, SchoolPeriod, getPeriodKey, getCurrentPeriod, DAYS, LOCATIONS } from "@/types/schedule";
import { getOfficialDefaultTeachers, getOfficialDefaultAssignments } from "@/data/defaultSchedule";

const STORAGE_PREFIX = "teacher-schedule-";
const CURRENT_PERIOD_KEY = "teacher-schedule-current-period";

const initialTeachers: Teacher[] = getOfficialDefaultTeachers("default").map((t) => ({
  id: t.id,
  name: t.name,
  stage: t.stage,
}));

const initialAssignments: DutyAssignment[] = getOfficialDefaultAssignments("default").map((a) => ({
  teacherId: a.teacherId,
  day: a.day,
  location: a.location,
  shiftNumber: a.shiftNumber,
  stage: a.stage,
  note: a.note,
}));

function loadPeriodFromStorage(period: SchoolPeriod): { teachers: Teacher[]; assignments: DutyAssignment[] } {
  try {
    const key = STORAGE_PREFIX + getPeriodKey(period);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.teachers)) {
        const seenNames = new Set<string>();
        const updatedTeachers: Teacher[] = [];
        parsed.teachers.forEach((t: Teacher) => {
          const normName = t.name.trim() === "Надя Калъбалъкова" ? "Надя Калъбалкова" : t.name.trim();
          const lower = normName.toLowerCase();
          if (!seenNames.has(lower)) {
            seenNames.add(lower);
            updatedTeachers.push({ ...t, name: normName });
          }
        });
        initialTeachers.forEach((initT) => {
          const lower = initT.name.trim().toLowerCase();
          if (!seenNames.has(lower)) {
            seenNames.add(lower);
            updatedTeachers.push({ ...initT, id: "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 7) });
          }
        });
        parsed.teachers = updatedTeachers;
      }
      return parsed;
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

  const addTeacher = useCallback((name: string): boolean => {
    const trimmedName = name.trim();
    
    // Check if teacher with same name already exists (case-insensitive)
    const exists = teachers.some(
      (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (exists) {
      return false;
    }
    
    const newTeacher: Teacher = {
      id: Date.now().toString(),
      name: trimmedName,
    };
    setTeachers((prev) => [...prev, newTeacher]);
    return true;
  }, [teachers]);

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

  const autoArrangeTeachers = useCallback(() => {
    if (teachers.length === 0) return;

    // Create all cell combinations
    const allCells: { day: string; location: string }[] = [];
    DAYS.forEach((day) => {
      LOCATIONS.forEach((location) => {
        allCells.push({ day, location });
      });
    });

    // Shuffle cells for random distribution
    const shuffledCells = [...allCells].sort(() => Math.random() - 0.5);
    
    // Create a shuffled list of teachers
    const shuffledTeachers = [...teachers].sort(() => Math.random() - 0.5);
    
    const newAssignments: DutyAssignment[] = [];
    
    // Round-robin: assign one teacher to each cell, cycling through teachers
    // This ensures each teacher gets roughly equal assignments
    shuffledCells.forEach((cell, index) => {
      // Use modulo to cycle through teachers evenly
      const teacherIndex = index % shuffledTeachers.length;
      newAssignments.push({
        teacherId: shuffledTeachers[teacherIndex].id,
        day: cell.day,
        location: cell.location,
      });
    });

    setAssignments(newAssignments);
  }, [teachers]);

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
    autoArrangeTeachers,
  };
}
