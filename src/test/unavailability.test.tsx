import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { localDB } from "@/lib/localDB";
import { TeacherUnavailabilityDialog } from "@/components/TeacherUnavailabilityDialog";
import { AuthProvider } from "@/contexts/AuthContext";
import { UnavailabilityEntry } from "@/hooks/useUnavailability";
import { ScheduleCell } from "@/components/ScheduleCell";

describe("Teacher Unavailability & Duty Settings - Full Validation", () => {
  beforeEach(() => {
    localStorage.clear();
    localDB.resetToDefaults();
  });

  it("adds, updates note, retrieves, and removes weekday unavailability in localDB", () => {
    const teachers = localDB.getTeachers();
    expect(teachers.length).toBeGreaterThan(0);
    const teacherId = teachers[0].id;

    // 1. Add weekday unavailability for Monday
    const entry1 = localDB.addWeekdayUnavailability(teacherId, "monday", "Методически ден");
    expect(entry1.id).toBeDefined();
    expect(entry1.teacher_id).toBe(teacherId);
    expect(entry1.weekday).toBe("monday");
    expect(entry1.note).toBe("Методически ден");

    // Check persistence
    let list = localDB.getUnavailabilities(teacherId);
    expect(list.length).toBe(1);
    expect(list[0].weekday).toBe("monday");
    expect(list[0].note).toBe("Методически ден");

    // 2. Update note for Monday without duplicating
    const updated = localDB.addWeekdayUnavailability(teacherId, "monday", "Свободен ден по разписание");
    expect(updated.id).toBe(entry1.id);
    expect(updated.note).toBe("Свободен ден по разписание");

    list = localDB.getUnavailabilities(teacherId);
    expect(list.length).toBe(1);
    expect(list[0].note).toBe("Свободен ден по разписание");

    // 3. Add Wednesday
    const entry2 = localDB.addWeekdayUnavailability(teacherId, "wednesday");
    list = localDB.getUnavailabilities(teacherId);
    expect(list.length).toBe(2);

    // 4. Remove Monday
    localDB.removeUnavailability(entry1.id);
    list = localDB.getUnavailabilities(teacherId);
    expect(list.length).toBe(1);
    expect(list[0].weekday).toBe("wednesday");
  });

  it("handles specific date unavailabilities properly without duplicates", () => {
    const teachers = localDB.getTeachers();
    const teacherId = teachers[0].id;

    const dateEntry = localDB.addDateUnavailability(teacherId, "2026-09-15", "Командировка");
    expect(dateEntry.specific_date).toBe("2026-09-15");
    expect(dateEntry.note).toBe("Командировка");

    let list = localDB.getUnavailabilities(teacherId);
    expect(list.length).toBe(1);
    expect(list[0].specific_date).toBe("2026-09-15");

    // Update note on same date
    localDB.addDateUnavailability(teacherId, "2026-09-15", "Обучение");
    list = localDB.getUnavailabilities(teacherId);
    expect(list.length).toBe(1);
    expect(list[0].note).toBe("Обучение");

    // Remove date
    localDB.removeUnavailability(dateEntry.id);
    expect(localDB.getUnavailabilities(teacherId).length).toBe(0);
  });

  it("cleans up unavailabilities when teacher is removed", () => {
    const teachers = localDB.getTeachers();
    const teacherId = teachers[0].id;

    localDB.addWeekdayUnavailability(teacherId, "friday", "Отпуск");
    expect(localDB.getUnavailabilities(teacherId).length).toBe(1);

    localDB.removeTeacher(teacherId);
    expect(localDB.getUnavailabilities(teacherId).length).toBe(0);
  });

  it("exports and imports unavailabilities in database backup", () => {
    const teachers = localDB.getTeachers();
    const teacher1 = teachers[0].id;
    const teacher2 = teachers[1].id;

    localDB.addWeekdayUnavailability(teacher1, "tuesday", "Тест 1");
    localDB.addWeekdayUnavailability(teacher2, "thursday", "Тест 2");

    const backup = localDB.exportBackup();
    expect(backup.unavailability.length).toBe(2);

    // Reset database
    localDB.resetToDefaults();
    expect(localDB.getUnavailabilities().length).toBe(0);

    // Import backup
    const success = localDB.importBackup(backup);
    expect(success).toBe(true);
    expect(localDB.getUnavailabilities().length).toBe(2);
    expect(localDB.getUnavailabilities(teacher1)[0].weekday).toBe("tuesday");
    expect(localDB.getUnavailabilities(teacher2)[0].weekday).toBe("thursday");
  });

  it("renders TeacherUnavailabilityDialog and toggles weekdays with clear callbacks", async () => {
    const mockAddWeekday = vi.fn().mockResolvedValue(true);
    const mockAddDate = vi.fn().mockResolvedValue(true);
    const mockRemove = vi.fn().mockResolvedValue(true);
    const mockOpenChange = vi.fn();

    const initialEntries: UnavailabilityEntry[] = [
      {
        id: "unavail-1",
        teacher_id: "teacher-1",
        weekday: "monday",
        specific_date: null,
        note: "Свободен по разписание",
      },
    ];

    render(
      <AuthProvider>
        <TeacherUnavailabilityDialog
          open={true}
          onOpenChange={mockOpenChange}
          teacherId="teacher-1"
          teacherName="Красимир Ватев"
          entries={initialEntries}
          onAddWeekday={mockAddWeekday}
          onAddDate={mockAddDate}
          onRemove={mockRemove}
        />
      </AuthProvider>
    );

    // Check dialog title and description
    expect(screen.getByText(/Достъпност за дежурства: Красимир Ватев/i)).toBeInTheDocument();
    expect(screen.getByText(/Понеделник/i)).toBeInTheDocument();
    expect(screen.getByText(/Сряда/i)).toBeInTheDocument();
    expect(screen.getByText(/Свободен по разписание/i)).toBeInTheDocument();

    // Monday is currently active (unavailable), so clicking it should remove unavailability
    const mondayButton = screen.getByRole("button", { name: /Понеделник/i });
    fireEvent.click(mondayButton);
    expect(mockRemove).toHaveBeenCalledWith("unavail-1");

    // Wednesday is currently inactive (available), so clicking it should add unavailability
    const wednesdayButton = screen.getByRole("button", { name: /Сряда/i });
    fireEvent.click(wednesdayButton);
    expect(mockAddWeekday).toHaveBeenCalledWith("teacher-1", "wednesday", undefined);
  });

  it("identifies unavailable teachers in ScheduleCell and marks badge with warning", () => {
    const handleAssign = vi.fn().mockResolvedValue(true);
    const handleUnassign = vi.fn();
    const handleMove = vi.fn();

    const mockIsUnavailable = vi.fn().mockImplementation((teacherId: string, day: string) => {
      if (teacherId === "t-1" && day === "Понеделник") {
        return { note: "Методически ден" };
      }
      return null;
    });

    const cellTeachers = [
      { id: "t-1", name: "Иван Иванов", shiftNumber: null },
      { id: "t-2", name: "Мария Петрова", shiftNumber: null },
    ];

    render(
      <AuthProvider>
        <ScheduleCell
          day="Понеделник"
          location="Дежурни на III-ти етаж"
          teachers={cellTeachers}
          counts={{ "t-1": 1, "t-2": 1 }}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          onMove={handleMove}
          isTeacherUnavailable={mockIsUnavailable}
        />
      </AuthProvider>
    );

    // Ivan Ivanov should be marked as unavailable
    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    expect(screen.getByText("Мария Петрова")).toBeInTheDocument();

    const unavailableBadge = screen.getByText("Иван Иванов").closest(".teacher-badge");
    expect(unavailableBadge).toHaveClass("bg-destructive");
  });
});
