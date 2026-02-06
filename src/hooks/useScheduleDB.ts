import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Teacher, DutyAssignment, SchoolPeriod, getCurrentPeriod, DAYS, LOCATIONS } from "@/types/schedule";
import { toast } from "sonner";

export function useScheduleDB() {
  const [currentPeriod, setCurrentPeriod] = useState<SchoolPeriod>(getCurrentPeriod);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      // Load teachers and assignments in parallel
      const [teachersResult, assignmentsResult] = await Promise.all([
        supabase
          .from("teachers")
          .select("id, name")
          .eq("period_id", pId)
          .order("name"),
        supabase
          .from("duty_assignments")
          .select("teacher_id, day, location")
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
          location: a.location
        })));
      }

      setIsLoading(false);
    };

    loadData();
  }, [currentPeriod, ensurePeriod]);

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
    (day: string, location: string) => {
      return assignments
        .filter((a) => a.day === day && a.location === location)
        .map((a) => teachers.find((t) => t.id === a.teacherId))
        .filter(Boolean) as Teacher[];
    },
    [assignments, teachers]
  );

  const autoArrangeTeachers = useCallback(async () => {
    if (!periodId || teachers.length === 0) return;

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
    
    const newAssignments: { period_id: string; teacher_id: string; day: string; location: string }[] = [];
    
    // Round-robin: assign one teacher to each cell
    shuffledCells.forEach((cell, index) => {
      const teacherIndex = index % shuffledTeachers.length;
      newAssignments.push({
        period_id: periodId,
        teacher_id: shuffledTeachers[teacherIndex].id,
        day: cell.day,
        location: cell.location,
      });
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
