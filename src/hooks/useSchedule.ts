import { useState, useCallback, useMemo } from "react";
import { Teacher, DutyAssignment, DAYS, LOCATIONS } from "@/types/schedule";

const STORAGE_KEY = "teacher-schedule";

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

function loadFromStorage(): { teachers: Teacher[]; assignments: DutyAssignment[] } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading from storage:", e);
  }
  return { teachers: initialTeachers, assignments: initialAssignments };
}

function saveToStorage(teachers: Teacher[], assignments: DutyAssignment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ teachers, assignments }));
  } catch (e) {
    console.error("Error saving to storage:", e);
  }
}

export function useSchedule() {
  const stored = loadFromStorage();
  const [teachers, setTeachers] = useState<Teacher[]>(stored.teachers);
  const [assignments, setAssignments] = useState<DutyAssignment[]>(stored.assignments);

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
    setTeachers((prev) => {
      const updated = [...prev, newTeacher];
      saveToStorage(updated, assignments);
      return updated;
    });
  }, [assignments]);

  const removeTeacher = useCallback((teacherId: string) => {
    setTeachers((prev) => {
      const updated = prev.filter((t) => t.id !== teacherId);
      const updatedAssignments = assignments.filter((a) => a.teacherId !== teacherId);
      saveToStorage(updated, updatedAssignments);
      setAssignments(updatedAssignments);
      return updated;
    });
  }, [assignments]);

  const assignTeacher = useCallback((teacherId: string, day: string, location: string) => {
    setAssignments((prev) => {
      // Check if already assigned to this cell
      const exists = prev.some(
        (a) => a.teacherId === teacherId && a.day === day && a.location === location
      );
      if (exists) return prev;

      const updated = [...prev, { teacherId, day, location }];
      saveToStorage(teachers, updated);
      return updated;
    });
  }, [teachers]);

  const unassignTeacher = useCallback((teacherId: string, day: string, location: string) => {
    setAssignments((prev) => {
      const updated = prev.filter(
        (a) => !(a.teacherId === teacherId && a.day === day && a.location === location)
      );
      saveToStorage(teachers, updated);
      return updated;
    });
  }, [teachers]);

  const moveTeacher = useCallback(
    (teacherId: string, fromDay: string, fromLocation: string, toDay: string, toLocation: string) => {
      setAssignments((prev) => {
        // Remove from old position
        const filtered = prev.filter(
          (a) => !(a.teacherId === teacherId && a.day === fromDay && a.location === fromLocation)
        );
        // Check if already exists at destination
        const existsAtDest = filtered.some(
          (a) => a.teacherId === teacherId && a.day === toDay && a.location === toLocation
        );
        if (existsAtDest) {
          saveToStorage(teachers, filtered);
          return filtered;
        }
        // Add to new position
        const updated = [...filtered, { teacherId, day: toDay, location: toLocation }];
        saveToStorage(teachers, updated);
        return updated;
      });
    },
    [teachers]
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
    addTeacher,
    removeTeacher,
    assignTeacher,
    unassignTeacher,
    moveTeacher,
    getAssignmentsForCell,
  };
}
