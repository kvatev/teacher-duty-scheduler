import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Teacher, DutyAssignment, SchoolPeriod, getCurrentPeriod, DAYS, LOCATIONS, CellTeacher } from "@/types/schedule";
import { useAppSettings } from "@/hooks/useAppSettings";
import { toast } from "sonner";

interface DBPeriod {
  id: string;
  year: string;
  term: number;
}

export function useScheduleDB() {
  const [currentPeriod, setCurrentPeriod] = useState<SchoolPeriod>(getCurrentPeriod);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availablePeriods, setAvailablePeriods] = useState<DBPeriod[]>([]);

  // Ensure period exists in DB and get its ID
  const ensurePeriod = useCallback(async (period: SchoolPeriod): Promise<string | null> => {
    try {
      // Try to find existing period
      const { data: existing, error: findError } = await supabase
        .from("school_periods")
        .select("id")
        .eq("year", period.year)
        .eq("term", period.term)
        .maybeSingle();

      if (findError) {
        console.error("Error finding period:", findError);
        return null;
      }

      if (existing) {
        return existing.id;
      }

      // Create new period
      const { data: created, error: createError } = await supabase
        .from("school_periods")
        .insert({ year: period.year, term: period.term })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating period:", createError);
        return null;
      }

      return created.id;
    } catch (e) {
      console.error("Error in ensurePeriod:", e);
      return null;
    }
  }, []);

  // Load available periods from DB
  const loadAvailablePeriods = useCallback(async () => {
    const { data, error } = await supabase
      .from("school_periods")
      .select("id, year, term")
      .order("year", { ascending: false })
      .order("term", { ascending: false });

    if (error) {
      console.error("Error loading periods:", error);
      return;
    }

    setAvailablePeriods(data || []);
  }, []);

  // Load periods on mount
  useEffect(() => {
    loadAvailablePeriods();
  }, [loadAvailablePeriods]);

  // Load data when period changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      const pId = await ensurePeriod(currentPeriod);
      if (!pId) {
        setIsLoading(false);
        return;
      }
      
      setPeriodId(pId);

      // Reload periods to include newly created ones
      await loadAvailablePeriods();

      // Load teachers and assignments in parallel
      const [teachersResult, assignmentsResult] = await Promise.all([
        supabase
          .from("teachers")
          .select("id, name")
          .eq("period_id", pId)
          .order("name"),
        supabase
          .from("duty_assignments")
          .select("teacher_id, day, location, shift_number")
          .eq("period_id", pId)
      ]);

      if (teachersResult.error) {
        console.error("Error loading teachers:", teachersResult.error);
      } else {
        setTeachers(teachersResult.data.map(t => ({ id: t.id, name: t.name })));
      }

      if (assignmentsResult.error) {
        console.error("Error loading assignments:", assignmentsResult.error);
      } else {
        setAssignments(assignmentsResult.data.map(a => ({
          teacherId: a.teacher_id,
          day: a.day,
          location: a.location,
          shiftNumber: (a as any).shift_number ?? null
        })));
      }

      setIsLoading(false);
    };

    loadData();
  }, [currentPeriod, ensurePeriod, loadAvailablePeriods]);

  const changePeriod = useCallback((newPeriod: SchoolPeriod) => {
    setCurrentPeriod(newPeriod);
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

  const addTeacher = useCallback(async (name: string): Promise<boolean> => {
    if (!periodId) return false;
    
    const trimmedName = name.trim();
    
    // Check if teacher exists (case-insensitive)
    const exists = teachers.some(
      (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (exists) {
      return false;
    }

    const { data, error } = await supabase
      .from("teachers")
      .insert({ period_id: periodId, name: trimmedName })
      .select("id, name")
      .single();

    if (error) {
      console.error("Error adding teacher:", error);
      toast.error("Грешка при добавяне на учител");
      return false;
    }

    setTeachers((prev) => [...prev, { id: data.id, name: data.name }]);
    return true;
  }, [periodId, teachers]);

  const removeTeacher = useCallback(async (teacherId: string) => {
    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("id", teacherId);

    if (error) {
      console.error("Error removing teacher:", error);
      toast.error("Грешка при премахване на учител");
      return;
    }

    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    setAssignments((prev) => prev.filter((a) => a.teacherId !== teacherId));
  }, []);

  const assignTeacher = useCallback(async (teacherId: string, day: string, location: string): Promise<boolean> => {
    if (!periodId) return false;

    // Check if already assigned
    const exists = assignments.some(
      (a) => a.teacherId === teacherId && a.day === day && a.location === location
    );
    
    if (exists) {
      return false;
    }

    const { error } = await supabase
      .from("duty_assignments")
      .insert({ period_id: periodId, teacher_id: teacherId, day, location });

    if (error) {
      console.error("Error assigning teacher:", error);
      return false;
    }

    setAssignments((prev) => [...prev, { teacherId, day, location }]);
    return true;
  }, [periodId, assignments]);

  const unassignTeacher = useCallback(async (teacherId: string, day: string, location: string) => {
    if (!periodId) return;

    const { error } = await supabase
      .from("duty_assignments")
      .delete()
      .eq("period_id", periodId)
      .eq("teacher_id", teacherId)
      .eq("day", day)
      .eq("location", location);

    if (error) {
      console.error("Error unassigning teacher:", error);
      toast.error("Грешка при премахване на назначение");
      return;
    }

    setAssignments((prev) =>
      prev.filter(
        (a) => !(a.teacherId === teacherId && a.day === day && a.location === location)
      )
    );
  }, [periodId]);

  const moveTeacher = useCallback(
    async (teacherId: string, fromDay: string, fromLocation: string, toDay: string, toLocation: string) => {
      if (!periodId) return;

      // Check if already at destination
      const existsAtDest = assignments.some(
        (a) => a.teacherId === teacherId && a.day === toDay && a.location === toLocation
      );
      
      if (existsAtDest) return;

      // Delete old, insert new
      const { error: deleteError } = await supabase
        .from("duty_assignments")
        .delete()
        .eq("period_id", periodId)
        .eq("teacher_id", teacherId)
        .eq("day", fromDay)
        .eq("location", fromLocation);

      if (deleteError) {
        console.error("Error moving teacher (delete):", deleteError);
        return;
      }

      const { error: insertError } = await supabase
        .from("duty_assignments")
        .insert({ period_id: periodId, teacher_id: teacherId, day: toDay, location: toLocation });

      if (insertError) {
        console.error("Error moving teacher (insert):", insertError);
        return;
      }

      setAssignments((prev) => {
        const filtered = prev.filter(
          (a) => !(a.teacherId === teacherId && a.day === fromDay && a.location === fromLocation)
        );
        return [...filtered, { teacherId, day: toDay, location: toLocation }];
      });
    },
    [periodId, assignments]
  );

  const getAssignmentsForCell = useCallback(
    (day: string, location: string): CellTeacher[] => {
      return assignments
        .filter((a) => a.day === day && a.location === location)
        .map((a) => {
          const teacher = teachers.find((t) => t.id === a.teacherId);
          if (!teacher) return null;
          return { ...teacher, shiftNumber: a.shiftNumber };
        })
        .filter(Boolean) as CellTeacher[];
    },
    [assignments, teachers]
  );

  const updateShiftNumber = useCallback(async (teacherId: string, day: string, location: string, shiftNumber: number | null) => {
    if (!periodId) return;

    const { error } = await supabase
      .from("duty_assignments")
      .update({ shift_number: shiftNumber } as any)
      .eq("period_id", periodId)
      .eq("teacher_id", teacherId)
      .eq("day", day)
      .eq("location", location);

    if (error) {
      console.error("Error updating shift number:", error);
      toast.error("Грешка при обновяване на смяната");
      return;
    }

    setAssignments(prev =>
      prev.map(a =>
        a.teacherId === teacherId && a.day === day && a.location === location
          ? { ...a, shiftNumber }
          : a
      )
    );
  }, [periodId]);

  const autoArrangeTeachers = useCallback(async () => {
    if (!periodId || teachers.length === 0) return;

    // Define teachers per location
    const getTeachersPerLocation = (location: string): number => {
      if (location.includes("III-ти етаж") || location.includes("IV-ти етаж")) {
        return 4;
      }
      // "Училищен стол" and "Главен дежурен" get 3 teachers
      return 3;
    };

    // Create all cell combinations with required teacher count
    const allSlots: { day: string; location: string }[] = [];
    DAYS.forEach((day) => {
      LOCATIONS.forEach((location) => {
        const count = getTeachersPerLocation(location);
        for (let i = 0; i < count; i++) {
          allSlots.push({ day, location });
        }
      });
    });

    // Shuffle slots for random distribution
    const shuffledSlots = [...allSlots].sort(() => Math.random() - 0.5);
    
    // Create a shuffled list of teachers
    const shuffledTeachers = [...teachers].sort(() => Math.random() - 0.5);
    
    const newAssignments: { period_id: string; teacher_id: string; day: string; location: string }[] = [];
    const assignedPairs = new Set<string>(); // Track teacher-day-location combos
    
    // Round-robin: assign teachers to slots, avoiding duplicates in same cell
    shuffledSlots.forEach((slot, index) => {
      // Try to find a teacher not already in this cell
      for (let attempt = 0; attempt < shuffledTeachers.length; attempt++) {
        const teacherIndex = (index + attempt) % shuffledTeachers.length;
        const teacher = shuffledTeachers[teacherIndex];
        const pairKey = `${teacher.id}-${slot.day}-${slot.location}`;
        
        if (!assignedPairs.has(pairKey)) {
          assignedPairs.add(pairKey);
          newAssignments.push({
            period_id: periodId,
            teacher_id: teacher.id,
            day: slot.day,
            location: slot.location,
          });
          break;
        }
      }
    });

    // Delete all existing assignments for this period
    const { error: deleteError } = await supabase
      .from("duty_assignments")
      .delete()
      .eq("period_id", periodId);

    if (deleteError) {
      console.error("Error clearing assignments:", deleteError);
      toast.error("Грешка при изчистване на назначенията");
      return;
    }

    // Insert new assignments
    const { error: insertError } = await supabase
      .from("duty_assignments")
      .insert(newAssignments);

    if (insertError) {
      console.error("Error inserting assignments:", insertError);
      toast.error("Грешка при създаване на назначенията");
      return;
    }

    setAssignments(newAssignments.map(a => ({
      teacherId: a.teacher_id,
      day: a.day,
      location: a.location
    })));
  }, [periodId, teachers]);

  // Add a new period (year + term)
  const addPeriod = useCallback(async (year: string, term: 1 | 2): Promise<boolean> => {
    // Check if already exists
    const exists = availablePeriods.some(p => p.year === year && p.term === term);
    if (exists) {
      toast.error("Този период вече съществува");
      return false;
    }

    const { error } = await supabase
      .from("school_periods")
      .insert({ year, term });

    if (error) {
      console.error("Error adding period:", error);
      toast.error("Грешка при добавяне на период");
      return false;
    }

    await loadAvailablePeriods();
    toast.success(`Добавен период: ${year}, ${term === 1 ? "I" : "II"} срок`);
    return true;
  }, [availablePeriods, loadAvailablePeriods]);

  // Delete a period and all its data
  const deletePeriod = useCallback(async (year: string, term: number): Promise<boolean> => {
    const period = availablePeriods.find(p => p.year === year && p.term === term);
    if (!period) {
      toast.error("Периодът не е намерен");
      return false;
    }

    // Delete the period (cascade will remove teachers and assignments due to FK)
    const { error } = await supabase
      .from("school_periods")
      .delete()
      .eq("id", period.id);

    if (error) {
      console.error("Error deleting period:", error);
      toast.error("Грешка при изтриване на период");
      return false;
    }

    await loadAvailablePeriods();
    toast.success(`Изтрит период: ${year}, ${term === 1 ? "I" : "II"} срок`);

    // If we deleted the current period, switch to another one
    if (currentPeriod.year === year && currentPeriod.term === term) {
      const remaining = availablePeriods.filter(p => !(p.year === year && p.term === term));
      if (remaining.length > 0) {
        setCurrentPeriod({ year: remaining[0].year, term: remaining[0].term as 1 | 2 });
      } else {
        // Create a new default period
        setCurrentPeriod(getCurrentPeriod());
      }
    }

    return true;
  }, [availablePeriods, currentPeriod, loadAvailablePeriods]);

  // Get unique years from available periods
  const availableYears = useMemo(() => {
    const years = [...new Set(availablePeriods.map(p => p.year))];
    return years.sort().reverse();
  }, [availablePeriods]);

  // Get available terms for a specific year
  const getTermsForYear = useCallback((year: string) => {
    return availablePeriods
      .filter(p => p.year === year)
      .map(p => p.term)
      .sort();
  }, [availablePeriods]);

  // Copy teachers (and optionally assignments) from another period to the current one
  const copyTeachersFromPeriod = useCallback(async (
    sourceYear: string, 
    sourceTerm: number,
    includeAssignments: boolean = false
  ): Promise<boolean> => {
    if (!periodId) return false;

    // Find source period ID
    const sourcePeriod = availablePeriods.find(p => p.year === sourceYear && p.term === sourceTerm);
    if (!sourcePeriod) {
      toast.error("Избраният период не е намерен");
      return false;
    }

    // Get teachers from source period
    const { data: sourceTeachers, error: fetchError } = await supabase
      .from("teachers")
      .select("id, name")
      .eq("period_id", sourcePeriod.id);

    if (fetchError) {
      console.error("Error fetching source teachers:", fetchError);
      toast.error("Грешка при извличане на учителите");
      return false;
    }

    if (!sourceTeachers || sourceTeachers.length === 0) {
      toast.error("Няма учители в избрания период");
      return false;
    }

    // Filter out teachers that already exist in current period (case-insensitive)
    const existingNames = new Set(teachers.map(t => t.name.toLowerCase()));
    const newTeachers = sourceTeachers.filter(t => !existingNames.has(t.name.toLowerCase()));

    // Build mapping from old teacher IDs to names (for all source teachers)
    const oldIdToName = new Map(sourceTeachers.map(t => [t.id, t.name]));

    let insertedTeachers: { id: string; name: string }[] = [];

    if (newTeachers.length > 0) {
      // Insert new teachers
      const { data: inserted, error: insertError } = await supabase
        .from("teachers")
        .insert(newTeachers.map(t => ({ period_id: periodId, name: t.name })))
        .select("id, name");

      if (insertError) {
        console.error("Error inserting teachers:", insertError);
        toast.error("Грешка при копиране на учителите");
        return false;
      }

      insertedTeachers = inserted || [];
      setTeachers(prev => [...prev, ...insertedTeachers.map(t => ({ id: t.id, name: t.name }))]);
    }

    // If we should copy assignments too
    if (includeAssignments) {
      // Get assignments from source period
      const { data: sourceAssignments, error: assignError } = await supabase
        .from("duty_assignments")
        .select("teacher_id, day, location")
        .eq("period_id", sourcePeriod.id);

      if (assignError) {
        console.error("Error fetching source assignments:", assignError);
        toast.error("Учителите са копирани, но възникна грешка при копиране на дежурствата");
        return true;
      }

      if (sourceAssignments && sourceAssignments.length > 0) {
        // Build name to new ID mapping (includes both existing and newly inserted teachers)
        const nameToNewId = new Map<string, string>();
        
        // Add existing teachers in current period
        teachers.forEach(t => nameToNewId.set(t.name.toLowerCase(), t.id));
        
        // Add newly inserted teachers
        insertedTeachers.forEach(t => nameToNewId.set(t.name.toLowerCase(), t.id));

        // Map old assignments to new teacher IDs
        const newAssignments: { period_id: string; teacher_id: string; day: string; location: string }[] = [];
        const existingAssignmentKeys = new Set(
          assignments.map(a => `${a.teacherId}-${a.day}-${a.location}`)
        );

        for (const assignment of sourceAssignments) {
          const teacherName = oldIdToName.get(assignment.teacher_id);
          if (!teacherName) continue;

          const newTeacherId = nameToNewId.get(teacherName.toLowerCase());
          if (!newTeacherId) continue;

          const assignmentKey = `${newTeacherId}-${assignment.day}-${assignment.location}`;
          if (existingAssignmentKeys.has(assignmentKey)) continue;

          newAssignments.push({
            period_id: periodId,
            teacher_id: newTeacherId,
            day: assignment.day,
            location: assignment.location
          });
          existingAssignmentKeys.add(assignmentKey);
        }

        if (newAssignments.length > 0) {
          const { error: insertAssignError } = await supabase
            .from("duty_assignments")
            .insert(newAssignments);

          if (insertAssignError) {
            console.error("Error inserting assignments:", insertAssignError);
            toast.error("Учителите са копирани, но възникна грешка при дежурствата");
            return true;
          }

          setAssignments(prev => [
            ...prev,
            ...newAssignments.map(a => ({
              teacherId: a.teacher_id,
              day: a.day,
              location: a.location
            }))
          ]);

          toast.success(
            `Копирани ${insertedTeachers.length} учители и ${newAssignments.length} дежурства`
          );
          return true;
        }
      }
    }

    if (insertedTeachers.length > 0) {
      toast.success(`Копирани ${insertedTeachers.length} учители от ${sourceYear}, ${sourceTerm === 1 ? "I" : "II"} срок`);
    } else {
      toast.info("Всички учители вече съществуват в текущия период");
    }
    return true;
  }, [periodId, availablePeriods, teachers, assignments]);

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
