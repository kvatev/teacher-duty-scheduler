import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeacherBadge } from "@/components/TeacherBadge";
import { ScheduleCell } from "@/components/ScheduleCell";
import { ScheduleTable } from "@/components/ScheduleTable";
import { AuthProvider } from "@/contexts/AuthContext";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Day Conflict Check - Multiple Duties in Same Day", () => {
  it("renders red balloon with small '✕' when hasDayConflict is true", () => {
    const { container } = render(
      <AuthProvider>
        <TeacherBadge
          id="t-1"
          name="Яна Димова"
          count={2}
          hasDayConflict={true}
          dayConflictCount={2}
          dayName="Сряда"
        />
      </AuthProvider>
    );

    const badge = container.querySelector(".teacher-badge");
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain("!bg-red-600");
    expect(badge?.className).toContain("!text-white");

    // Must show small "✕" button
    const xButton = screen.getByRole("button", { name: /Внимание: Яна Димова се повтаря/i });
    expect(xButton).toBeTruthy();
    expect(xButton.textContent).toBe("✕");

    // Clicking small '✕' displays warning toast
    fireEvent.click(xButton);
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining("Яна Димова има 2 дежурства в ден Сряда!"),
      expect.anything()
    );
  });

  it("does NOT render red conflict balloon or small '✕' when hasDayConflict is false", () => {
    const { container } = render(
      <AuthProvider>
        <TeacherBadge
          id="t-2"
          name="Красимир Ватев"
          count={2}
          hasDayConflict={false}
          dayConflictCount={1}
          dayName="Понеделник"
        />
      </AuthProvider>
    );

    const badge = container.querySelector(".teacher-badge");
    expect(badge).toBeTruthy();
    expect(badge?.className).not.toContain("!bg-red-600");
    expect(badge?.className).toContain("teacher-badge-count-2");

    // Must NOT have conflict '✕' button
    const xButton = screen.queryByRole("button", { name: /се повтаря/i });
    expect(xButton).toBeNull();
  });

  it("identifies day conflict in ScheduleCell and highlights teacher with red balloon and small '✕'", () => {
    const mockTeacher = { id: "t-1", name: "Десислава Димитрова" };
    const getTeacherDayCount = vi.fn((teacherId: string, day: string) => {
      if (teacherId === "t-1" && day === "Четвъртък") return 2;
      return 1;
    });

    const { container } = render(
      <AuthProvider>
        <ScheduleCell
          day="Четвъртък"
          location="Дежурни на III-ти етаж"
          teachers={[mockTeacher]}
          counts={{ "t-1": 3 }}
          onAssign={vi.fn()}
          onUnassign={vi.fn()}
          onMove={vi.fn()}
          getTeacherDayCount={getTeacherDayCount}
        />
      </AuthProvider>
    );

    expect(getTeacherDayCount).toHaveBeenCalledWith("t-1", "Четвъртък");
    const badge = container.querySelector(".teacher-badge");
    expect(badge?.className).toContain("!bg-red-600");

    const xButton = screen.getByRole("button", { name: /Внимание: Десислава Димитрова се повтаря/i });
    expect(xButton).toBeDefined();
  });

  it("computes day conflicts in ScheduleTable across multiple locations for the same day", () => {
    const teachers = [
      { id: "t-1", name: "Яна Димова" },
      { id: "t-2", name: "Иван Иванов" },
    ];
    const assignments = [
      { id: "a-1", teacherId: "t-1", day: "Сряда", location: "Дежурни на IV-ти етаж", periodId: "p-1" },
      { id: "a-2", teacherId: "t-1", day: "Сряда", location: "Главен дежурен – западен вход 07:30-08:40 ч.", periodId: "p-1" },
      { id: "a-3", teacherId: "t-2", day: "Сряда", location: "Дежурен на 0 етаж", periodId: "p-1" },
    ];

    const getAssignmentsForCell = (day: string, location: string) => {
      return assignments
        .filter((a) => a.day === day && a.location === location)
        .map((a) => ({ id: a.teacherId, name: teachers.find((t) => t.id === a.teacherId)?.name || "" }));
    };

    const { container } = render(
      <AuthProvider>
        <ScheduleTable
          getAssignmentsForCell={getAssignmentsForCell}
          counts={{ "t-1": 2, "t-2": 1 }}
          assignments={assignments as any}
          onAssign={vi.fn()}
          onUnassign={vi.fn()}
          onMove={vi.fn()}
          currentPeriod={{ id: "p-1", year: "2026/2027", term: 1 }}
          teachers={teachers}
        />
      </AuthProvider>
    );

    // In Wednesday, t-1 appears twice, so both of t-1's badges must have !bg-red-600
    const allBadges = container.querySelectorAll(".teacher-badge");
    const dimovaBadges = Array.from(allBadges).filter((b) => b.textContent?.includes("Яна Димова"));
    expect(dimovaBadges.length).toBe(2);
    dimovaBadges.forEach((b) => {
      expect(b.className).toContain("!bg-red-600");
    });

    // t-2 is assigned once, so its badge must NOT be red
    const ivanovBadge = Array.from(allBadges).find((b) => b.textContent?.includes("Иван Иванов"));
    expect(ivanovBadge?.className).not.toContain("!bg-red-600");
  });
});
