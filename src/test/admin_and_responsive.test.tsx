import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { localDB, STORAGE_KEYS } from "@/lib/localDB";
import { ScheduleTable } from "@/components/ScheduleTable";
import { PeriodSelector } from "@/components/PeriodSelector";
import { StageSelector } from "@/components/StageSelector";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { DEFAULT_APP_SETTINGS } from "@/lib/localDB";

describe("Admin Panel Corrections & Reflection on the Site", () => {
  beforeEach(() => {
    localStorage.clear();
    localDB.resetToDefaults();
  });

  it("migrates existing duty assignments when an admin renames a location in settings", () => {
    const periodId = "period-test";
    const oldLocation = "Дежурни на III-ти етаж";
    const newLocation = "Трети етаж (Ново име)";

    // Add an assignment with the old location
    localDB.assignTeacher(periodId, "t-1", "Понеделник", oldLocation, null, "secondary");

    let assignments = localDB.getAssignments(periodId, "secondary");
    expect(assignments.some((a) => a.location === oldLocation)).toBe(true);

    // Admin updates location_1 setting
    localDB.saveSettings({ location_1: newLocation });

    // Verify assignment location was migrated
    assignments = localDB.getAssignments(periodId, "secondary");
    expect(assignments.some((a) => a.location === oldLocation)).toBe(false);
    expect(assignments.some((a) => a.location === newLocation)).toBe(true);
    expect(assignments.find((a) => a.location === newLocation)?.teacherId).toBe("t-1");
  });

  it("migrates primary stage location assignments when primary locations are renamed", () => {
    const periodId = "period-test";
    const oldPrimaryLoc = "Главен дежурен параден вход - 07:00 ч.";
    const newPrimaryLoc = "Централен параден вход";

    localDB.assignTeacher(periodId, "t-primary-1", "Вторник", oldPrimaryLoc, null, "primary");

    localDB.saveSettings({ primary_location_1: newPrimaryLoc });

    const assignments = localDB.getAssignments(periodId, "primary");
    expect(assignments.some((a) => a.location === oldPrimaryLoc)).toBe(false);
    expect(assignments.some((a) => a.location === newPrimaryLoc)).toBe(true);
  });

  it("PeriodSelector reflects custom term labels from admin settings", () => {
    const dummyPeriod = { year: "2026/2027", term: 1 as const };
    const dummyPeriods = [{ id: "p-1", year: "2026/2027", term: 1 }];

    render(
      <AuthProvider>
        <PeriodSelector
          currentPeriod={dummyPeriod}
          availableYears={["2026/2027"]}
          availablePeriods={dummyPeriods}
          getTermsForYear={() => [1, 2]}
          onPeriodChange={vi.fn()}
          onAddPeriod={vi.fn()}
          onDeletePeriod={vi.fn()}
          onCopyTeachers={vi.fn()}
          term1Label="Есенен срок (I)"
          term2Label="Пролетен срок (II)"
        />
      </AuthProvider>
    );

    // The select trigger should display the custom term label
    expect(screen.getByText("Есенен срок (I)")).toBeInTheDocument();
  });

  it("Header immediately displays updated school title and subtitle from admin settings", () => {
    const customSettings = {
      ...DEFAULT_APP_SETTINGS,
      header_title: "СУ „Св. Климент Охридски“",
      header_subtitle: "Седмичен график за дежурства на педагогическия персонал",
    };

    render(
      <AuthProvider>
        <Header settings={customSettings} onSaveSettings={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText("СУ „Св. Климент Охридски“")).toBeInTheDocument();
    expect(screen.getByText("Седмичен график за дежурства на педагогическия персонал")).toBeInTheDocument();
  });
});

describe("Responsive & Mobile Site Structure Verification", () => {
  beforeEach(() => {
    localStorage.clear();
    localDB.resetToDefaults();
  });

  it("ScheduleTable allows switching between mobile 'day' view and 'table' view", () => {
    const period = { year: "2026/2027", term: 1 as const };
    const teachers = [
      { id: "t-1", name: "Иван Иванов" },
      { id: "t-2", name: "Мария Петрова" },
    ];

    const getAssignments = (day: string, location: string) => {
      if (day === "Понеделник" && location.includes("0 етаж")) {
        return [{ id: "t-1", name: "Иван Иванов" }];
      }
      return [];
    };

    render(
      <AuthProvider>
        <ScheduleTable
          currentPeriod={period}
          getAssignmentsForCell={getAssignments}
          counts={{ "t-1": 1, "t-2": 0 }}
          onAssign={vi.fn()}
          onUnassign={vi.fn()}
          onMove={vi.fn()}
          teachers={teachers}
          currentStage="secondary"
        />
      </AuthProvider>
    );

    // Buttons to toggle views exist
    const dayViewBtn = screen.getByRole("button", { name: /По дни \(Карти\)/i });
    const tableViewBtn = screen.getByRole("button", { name: /Пълна таблица/i });

    expect(dayViewBtn).toBeInTheDocument();
    expect(tableViewBtn).toBeInTheDocument();

    // Switch to Day view
    fireEvent.click(dayViewBtn);
    expect(screen.getByText("Изглед на графика:")).toBeInTheDocument();

    // Switch to Table view
    fireEvent.click(tableViewBtn);
    expect(screen.getAllByText(/Ден от седмицата/i).length).toBeGreaterThanOrEqual(1);
  });

  it("StageSelector smoothly toggles educational stages", () => {
    const handleStageChange = vi.fn();

    render(
      <StageSelector currentStage="secondary" onStageChange={handleStageChange} />
    );

    const primaryTab = screen.getByRole("tab", { name: /Начален етап/i });
    fireEvent.click(primaryTab);

    expect(handleStageChange).toHaveBeenCalledWith("primary");
  });

  it("Broadcast banner displays announcement and dismisses upon clicking close button", async () => {
    localDB.addBroadcast("Внимание: Педагогически съвет в петък от 14:00 ч.!", "urgent");

    render(<BroadcastBanner />);

    expect(screen.getByText(/Внимание: Педагогически съвет в петък/i)).toBeInTheDocument();
    expect(screen.getByText("🚨 СПЕШНО СЪОБЩЕНИЕ")).toBeInTheDocument();

    const closeBtn = screen.getAllByTitle("Скрий съобщението")[0];
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Внимание: Педагогически съвет в петък/i)).not.toBeInTheDocument();
    });
  });
});
