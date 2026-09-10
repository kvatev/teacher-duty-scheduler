import { useState, useCallback, useMemo, useEffect } from "react";
import { localDB, DBPeriod, STORAGE_KEYS } from "@/lib/localDB";
import { Teacher, DutyAssignment, SchoolPeriod, getCurrentPeriod, DAYS, CellTeacher } from "@/types/schedule";
import { DAY_NAME_TO_WEEKDAY } from "@/hooks/useUnavailability";
import { useAppSettings } from "@/hooks/useAppSettings";
import { toast } from "sonner";

export function useScheduleDB() {
  const { settings } = useAppSettings();
  const [currentPeriod, setCurrentPeriod] = useState<SchoolPeriod>(getCurrentPeriod);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availablePeriods, setAvailablePeriods] = useState<DBPeriod[]>([]);

  // Load available periods from local database
  const loadAvailablePeriods = useCallback(() => {
    const periods = localDB.getPeriods();
    setAvailablePeriods(periods);
    return periods;
  }, []);

  // Ensure period exists and load its data
  const loadData = useCallback(() => {
    const pId = localDB.ensurePeriod(currentPeriod);
    setPeriodId(pId);
    loadAvailablePeriods();

    const dbTeachers = localDB.getTeachers(pId);
    setTeachers(dbTeachers.map((t) => ({ id: t.id, name: t.name })));

    const dbAssignments = localDB.getAssignments(pId);
    setAssignments(
      dbAssignments.map((a) => ({
        teacherId: a.teacherId,
        day: a.day,
        location: a.location,
        shiftNumber: a.shiftNumber ?? null,
      }))
    );

    setIsLoading(false);
  }, [currentPeriod, loadAvailablePeriods]);

  // Load on mount and period change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen to cross-component database changes (e.g. backup restore)
  useEffect(() => {
    const handleDbChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const key = customEvent.detail?.key;
      // Only reload schedule if it's relevant to schedule data or full restore
      if (
        key &&
        key !== "all" &&
        key !== STORAGE_KEYS.ASSIGNMENTS &&
        key !== STORAGE_KEYS.TEACHERS &&
        key !== STORAGE_KEYS.PERIODS
      ) {
        return;
      }
      loadData();
    };
    window.addEventListener("local-db-change", handleDbChange);
    return () => window.removeEventListener("local-db-change", handleDbChange);
  }, [loadData]);

  const changePeriod = useCallback((newPeriod: SchoolPeriod) => {
    setCurrentPeriod(newPeriod);
  }, []);

  const teacherAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teachers.forEach((t) => {
      counts[t.id] = 0;
    });
    const seenKeys = new Set<string>();
    assignments.forEach((a) => {
      const key = `${a.teacherId}-${a.day}-${a.location}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        if (counts[a.teacherId] !== undefined) {
          counts[a.teacherId]++;
        }
      }
    });
    return counts;
  }, [teachers, assignments]);

  const addTeacher = useCallback(
    async (name: string): Promise<boolean> => {
      if (!periodId) return false;
      const created = localDB.addTeacher(periodId, name);
      if (!created) {
        return false;
      }
      setTeachers((prev) => {
        if (prev.some((t) => t.id === created.id)) return prev;
        return [...prev, { id: created.id, name: created.name }];
      });
      return true;
    },
    [periodId]
  );

  const removeTeacher = useCallback(
    async (teacherId: string) => {
      localDB.removeTeacher(teacherId);
      setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
      setAssignments((prev) => prev.filter((a) => a.teacherId !== teacherId));
    },
    []
  );

  const assignTeacher = useCallback(
    async (teacherId: string, day: string, location: string): Promise<boolean> => {
      if (!periodId) return false;
      const success = localDB.assignTeacher(periodId, teacherId, day, location);
      if (!success) return false;

      // Deduplicate state in case loadData already updated or runs concurrently
      setAssignments((prev) => {
        if (prev.some((a) => a.teacherId === teacherId && a.day === day && a.location === location)) {
          return prev;
        }
        return [...prev, { teacherId, day, location, shiftNumber: null }];
      });
      return true;
    },
    [periodId]
  );

  const unassignTeacher = useCallback(
    async (teacherId: string, day: string, location: string) => {
      if (!periodId) return;
      localDB.unassignTeacher(periodId, teacherId, day, location);
      setAssignments((prev) =>
        prev.filter((a) => !(a.teacherId === teacherId && a.day === day && a.location === location))
      );
    },
    [periodId]
  );

  const moveTeacher = useCallback(
    async (
      teacherId: string,
      fromDay: string,
      fromLocation: string,
      toDay: string,
      toLocation: string
    ) => {
      if (!periodId) return;
      const existsAtDest = assignments.some(
        (a) => a.teacherId === teacherId && a.day === toDay && a.location === toLocation
      );
      if (existsAtDest) return;

      const currentAssignment = assignments.find(
        (a) => a.teacherId === teacherId && a.day === fromDay && a.location === fromLocation
      );
      const shiftNumber = currentAssignment?.shiftNumber ?? null;

      localDB.moveTeacher(periodId, teacherId, fromDay, fromLocation, toDay, toLocation);

      setAssignments((prev) => {
        const filtered = prev.filter(
          (a) => !(a.teacherId === teacherId && a.day === fromDay && a.location === fromLocation)
        );
        if (filtered.some((a) => a.teacherId === teacherId && a.day === toDay && a.location === toLocation)) {
          return filtered;
        }
        return [...filtered, { teacherId, day: toDay, location: toLocation, shiftNumber }];
      });
    },
    [periodId, assignments]
  );

  const getAssignmentsForCell = useCallback(
    (day: string, location: string): CellTeacher[] => {
      const cellAssignments = assignments.filter((a) => a.day === day && a.location === location);
      const seenTeacherIds = new Set<string>();
      const result: CellTeacher[] = [];

      for (const a of cellAssignments) {
        if (seenTeacherIds.has(a.teacherId)) continue;
        seenTeacherIds.add(a.teacherId);
        const teacher = teachers.find((t) => t.id === a.teacherId);
        if (teacher) {
          result.push({ ...teacher, shiftNumber: a.shiftNumber });
        }
      }
      return result;
    },
    [assignments, teachers]
  );

  const updateShiftNumber = useCallback(
    async (teacherId: string, day: string, location: string, shiftNumber: number | null) => {
      if (!periodId) return;
      localDB.updateShiftNumber(periodId, teacherId, day, location, shiftNumber);
      setAssignments((prev) =>
        prev.map((a) =>
          a.teacherId === teacherId && a.day === day && a.location === location
            ? { ...a, shiftNumber }
            : a
        )
      );
    },
    [periodId]
  );

  const autoArrangeTeachers = useCallback(async () => {
    if (!periodId || teachers.length === 0) return;

    const dynamicLocations = [
      settings.location_1,
      settings.location_2,
      settings.location_3,
      settings.location_4,
    ];

    const getTeachersPerLocation = (location: string, index: number): number => {
      if (index === 0 || index === 1 || location.includes("III-ти") || location.includes("IV-ти")) {
        return 4;
      }
      return 3;
    };

    // Unavailability lookup
    const unavailList = localDB.getUnavailabilities();
    const unavailSet = new Set<string>();
    unavailList.forEach((u) => {
      if (u.weekday) unavailSet.add(`${u.teacher_id}-${u.weekday}`);
    });

    const allSlots: { day: string; location: string }[] = [];
    DAYS.forEach((day) => {
      dynamicLocations.forEach((location, index) => {
        const count = getTeachersPerLocation(location, index);
        for (let i = 0; i < count; i++) {
          allSlots.push({ day, location });
        }
      });
    });

    const shuffledSlots = [...allSlots].sort(() => Math.random() - 0.5);
    const shuffledTeachers = [...teachers].sort(() => Math.random() - 0.5);

    const newAssignments: { periodId: string; teacherId: string; day: string; location: string; shiftNumber: number | null }[] = [];
    const assignedPairs = new Set<string>();

    shuffledSlots.forEach((slot, index) => {
      const weekdayKey = DAY_NAME_TO_WEEKDAY[slot.day];

      // First pass: find an available teacher
      let chosenTeacher: Teacher | null = null;
      for (let attempt = 0; attempt < shuffledTeachers.length; attempt++) {
        const teacherIndex = (index + attempt) % shuffledTeachers.length;
        const teacher = shuffledTeachers[teacherIndex];
        const pairKey = `${teacher.id}-${slot.day}-${slot.location}`;
        const isUnavailable = weekdayKey ? unavailSet.has(`${teacher.id}-${weekdayKey}`) : false;

        if (!assignedPairs.has(pairKey) && !isUnavailable) {
          chosenTeacher = teacher;
          assignedPairs.add(pairKey);
          break;
        }
      }

      // Fallback pass: any teacher not in cell
      if (!chosenTeacher) {
        for (let attempt = 0; attempt < shuffledTeachers.length; attempt++) {
          const teacherIndex = (index + attempt) % shuffledTeachers.length;
          const teacher = shuffledTeachers[teacherIndex];
          const pairKey = `${teacher.id}-${slot.day}-${slot.location}`;
          if (!assignedPairs.has(pairKey)) {
            chosenTeacher = teacher;
            assignedPairs.add(pairKey);
            break;
          }
        }
      }

      if (chosenTeacher) {
        newAssignments.push({
          periodId,
          teacherId: chosenTeacher.id,
          day: slot.day,
          location: slot.location,
          shiftNumber: null,
        });
      }
    });

    localDB.setAssignmentsForPeriod(periodId, newAssignments);
    setAssignments(
      newAssignments.map((a) => ({
        teacherId: a.teacherId,
        day: a.day,
        location: a.location,
        shiftNumber: null,
      }))
    );
  }, [periodId, teachers, settings]);

  const addPeriod = useCallback(
    async (year: string, term: 1 | 2): Promise<boolean> => {
      const periods = localDB.getPeriods();
      const exists = periods.some((p) => p.year === year && p.term === term);
      if (exists) {
        toast.error("Този период вече съществува");
        return false;
      }

      localDB.addPeriod(year, term);
      loadAvailablePeriods();
      toast.success(`Добавен период: ${year}, ${term === 1 ? "I" : "II"} срок`);
      return true;
    },
    [loadAvailablePeriods]
  );

  const deletePeriod = useCallback(
    async (year: string, term: number): Promise<boolean> => {
      const periods = localDB.getPeriods();
      const period = periods.find((p) => p.year === year && p.term === term);
      if (!period) {
        toast.error("Периодът не е намерен");
        return false;
      }

      localDB.deletePeriod(period.id);
      const updatedPeriods = loadAvailablePeriods();
      toast.success(`Изтрит период: ${year}, ${term === 1 ? "I" : "II"} срок`);

      if (currentPeriod.year === year && currentPeriod.term === term) {
        if (updatedPeriods.length > 0) {
          setCurrentPeriod({ year: updatedPeriods[0].year, term: updatedPeriods[0].term });
        } else {
          setCurrentPeriod(getCurrentPeriod());
        }
      }

      return true;
    },
    [currentPeriod, loadAvailablePeriods]
  );

  const availableYears = useMemo(() => {
    const years = [...new Set(availablePeriods.map((p) => p.year))];
    return years.sort().reverse();
  }, [availablePeriods]);

  const getTermsForYear = useCallback(
    (year: string) => {
      return availablePeriods
        .filter((p) => p.year === year)
        .map((p) => p.term)
        .sort();
    },
    [availablePeriods]
  );

  const copyTeachersFromPeriod = useCallback(
    async (
      sourceYear: string,
      sourceTerm: number,
      includeAssignments: boolean = false
    ): Promise<boolean> => {
      if (!periodId) return false;

      const sourcePeriod = availablePeriods.find(
        (p) => p.year === sourceYear && p.term === sourceTerm
      );
      if (!sourcePeriod) {
        toast.error("Избраният период не е намерен");
        return false;
      }

      const sourceTeachers = localDB.getTeachers(sourcePeriod.id);
      if (sourceTeachers.length === 0) {
        toast.error("Няма учители в избрания период");
        return false;
      }

      const existingNames = new Set(teachers.map((t) => t.name.toLowerCase()));
      const newTeachers = sourceTeachers.filter((t) => !existingNames.has(t.name.toLowerCase()));
      const oldIdToName = new Map(sourceTeachers.map((t) => [t.id, t.name]));

      const newlyInserted: Teacher[] = [];
      newTeachers.forEach((t) => {
        const created = localDB.addTeacher(periodId, t.name);
        if (created) {
          newlyInserted.push({ id: created.id, name: created.name });
          // Preserve unavailability settings for this teacher
          const sourceUnavail = localDB.getUnavailabilities(t.id);
          sourceUnavail.forEach((u) => {
            if (u.weekday) {
              localDB.addWeekdayUnavailability(created.id, u.weekday, u.note || undefined);
            } else if (u.specific_date) {
              localDB.addDateUnavailability(created.id, u.specific_date, u.note || undefined);
            }
          });
        }
      });

      if (newlyInserted.length > 0) {
        setTeachers((prev) => [...prev, ...newlyInserted]);
      }

      if (includeAssignments) {
        const sourceAssignments = localDB.getAssignments(sourcePeriod.id);
        if (sourceAssignments.length > 0) {
          const currentAllTeachers = localDB.getTeachers(periodId);
          const nameToNewId = new Map<string, string>();
          currentAllTeachers.forEach((t) => nameToNewId.set(t.name.toLowerCase(), t.id));

          const existingKeys = new Set(
            assignments.map((a) => `${a.teacherId}-${a.day}-${a.location}`)
          );

          let copiedCount = 0;
          sourceAssignments.forEach((sa) => {
            const teacherName = oldIdToName.get(sa.teacherId);
            if (!teacherName) return;
            const newTeacherId = nameToNewId.get(teacherName.toLowerCase());
            if (!newTeacherId) return;

            const key = `${newTeacherId}-${sa.day}-${sa.location}`;
            if (existingKeys.has(key)) return;

            localDB.assignTeacher(periodId, newTeacherId, sa.day, sa.location, sa.shiftNumber);
            existingKeys.add(key);
            copiedCount++;
          });

          if (copiedCount > 0) {
            const updated = localDB.getAssignments(periodId);
            setAssignments(
              updated.map((a) => ({
                teacherId: a.teacherId,
                day: a.day,
                location: a.location,
                shiftNumber: a.shiftNumber,
              }))
            );
            toast.success(
              `Копирани ${newlyInserted.length} учители и ${copiedCount} дежурства`
            );
            return true;
          }
        }
      }

      if (newlyInserted.length > 0) {
        toast.success(
          `Копирани ${newlyInserted.length} учители от ${sourceYear}, ${sourceTerm === 1 ? "I" : "II"} срок`
        );
      } else {
        toast.info("Всички учители вече съществуват в текущия период");
      }
      return true;
    },
    [periodId, availablePeriods, teachers, assignments]
  );

  return {
    teachers,
    assignments,
    teacherAssignmentCounts,
    currentPeriod,
    isLoading,
    availablePeriods,
    availableYears,
    getTermsForYear,
    changePeriod,
    addTeacher,
    removeTeacher,
    assignTeacher,
    unassignTeacher,
    moveTeacher,
    getAssignmentsForCell,
    updateShiftNumber,
    autoArrangeTeachers,
    addPeriod,
    deletePeriod,
    copyTeachersFromPeriod,
  };
}
