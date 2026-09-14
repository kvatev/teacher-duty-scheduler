import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Legend } from "@/components/Legend";
import { Header } from "@/components/Header";
import { TeacherBadge } from "@/components/TeacherBadge";
import { AppSettings } from "@/hooks/useAppSettings";
import { AuthProvider } from "@/contexts/AuthContext";
import { MobileInstallButton } from "@/components/PWAInstallPrompt";
import { AdminSettingsPanel } from "@/components/AdminSettingsPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StageSelector } from "@/components/StageSelector";
import { ScheduleTable } from "@/components/ScheduleTable";
import { PrintableSchedule } from "@/components/PrintableSchedule";

const mockSettings: AppSettings = {
  header_title: "График за дежурства",
  header_subtitle: 'СУ "Константин Петканов", град Бургас',
  footer_note: "*Забележка",
  admin_name: "Красимир Ватев",
  admin_email: "kvatev@outlook.com",
  pdf_school_name: 'СУ „КОНСТАНТИН ПЕТКАНОВ"',
  pdf_school_info1: "гр. Бургас",
  pdf_school_info2: "ж.к. Меден рудник",
  pdf_director_name: "ИВАЙЛО МАРКОВ",
  pdf_schedule_description: "за дежурство на учителите",
  location_1: "Дежурни на III-ти етаж",
  location_2: "Дежурни на IV-ти етаж",
  location_3: "Училищен стол",
  location_4: "Главен дежурен",
  location_5: "Дежурен на 0 етаж",
  logo_url: "",
  schedule_title: "ГРАФИК",
  approval_text: "УТВЪРЖДАВАМ:",
  approval_role: "ДИРЕКТОР",
  day_column_header: "Ден от седмицата",
  tip_text: "💡 Съвет",
  term_1_label: "I учебен срок",
  term_2_label: "II учебен срок",
  primary_location_1: "Главен дежурен параден вход - 07:00 ч.",
  primary_location_2: "Дежурен на I етаж - 07:30 ч.",
  primary_location_3: "Дежурен на II етаж - 07:30 ч.",
  pdf_schedule_description_primary: "за дежурство на учителите от начален етап (I - IV клас)",
};

describe("Legend Component", () => {
  it("renders legend title and duty count items", () => {
    render(<Legend />);
    expect(screen.getByText("Легенда - брой дежурства")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4+")).toBeInTheDocument();
  });

  it("triggers onExportPDF when export button is clicked", () => {
    const handleExport = vi.fn();
    render(<Legend onExportPDF={handleExport} />);

    const button = screen.getByRole("button", { name: /Изтегли като PDF/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleExport).toHaveBeenCalledTimes(1);
  });
});

describe("Header Component", () => {
  it("renders header title and subtitle from settings", () => {
    const handleSave = vi.fn().mockResolvedValue(true);
    render(
      <AuthProvider>
        <Header settings={mockSettings} onSaveSettings={handleSave} />
      </AuthProvider>
    );

    expect(screen.getByText("График за дежурства")).toBeInTheDocument();
    expect(
      screen.getByText('СУ "Константин Петканов", град Бургас')
    ).toBeInTheDocument();
    expect(screen.getByText(/Вход за админ/i)).toBeInTheDocument();
  });

  it("does NOT render NotificationHeaderButton for regular unauthenticated users", () => {
    const handleSave = vi.fn().mockResolvedValue(true);
    render(
      <AuthProvider>
        <Header settings={mockSettings} onSaveSettings={handleSave} />
      </AuthProvider>
    );

    // Notification test button must NOT be visible to regular users
    expect(screen.queryByRole("button", { name: /Известия/i })).not.toBeInTheDocument();
  });
});

describe("TeacherBadge Component", () => {
  it("renders teacher name and count badge", () => {
    render(
      <AuthProvider>
        <TeacherBadge id="1" name="Иван Иванов" count={2} />
      </AuthProvider>
    );

    expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders unavailable state when teacher is marked unavailable", () => {
    render(
      <AuthProvider>
        <TeacherBadge
          id="1"
          name="Мария Петрова"
          count={0}
          unavailable={true}
          unavailableNote="Отпуск"
        />
      </AuthProvider>
    );

    expect(screen.getByText("Мария Петрова")).toBeInTheDocument();
    expect(screen.getByLabelText(/Не е свободен/i)).toBeInTheDocument();
  });

  it("renders allocation note when provided (e.g. фоайе)", () => {
    render(
      <AuthProvider>
        <TeacherBadge
          id="1"
          name="Красимир Ватев"
          count={1}
          note="фоайе"
          allowNote={true}
        />
      </AuthProvider>
    );

    expect(screen.getByText("Красимир Ватев")).toBeInTheDocument();
    expect(screen.getByText("фоайе")).toBeInTheDocument();
  });

  it("renders allocation notes for 'столова' and 'столова/фоайе'", () => {
    const { rerender } = render(
      <AuthProvider>
        <TeacherBadge
          id="1"
          name="Красимир Ватев"
          count={1}
          note="столова"
          allowNote={true}
        />
      </AuthProvider>
    );
    expect(screen.getByText("столова")).toBeInTheDocument();

    rerender(
      <AuthProvider>
        <TeacherBadge
          id="1"
          name="Красимир Ватев"
          count={1}
          note="столова/фоайе"
          allowNote={true}
        />
      </AuthProvider>
    );
    expect(screen.getByText("столова/фоайе")).toBeInTheDocument();
  });

  it("renders shift numbers '1', '2', '1, 2', and '1,2' on badge", () => {
    const { rerender } = render(
      <AuthProvider>
        <TeacherBadge
          id="1"
          name="Иван Иванов"
          count={1}
          shiftNumber="1,2"
        />
      </AuthProvider>
    );
    expect(screen.getByText("1,2")).toBeInTheDocument();

    rerender(
      <AuthProvider>
        <TeacherBadge
          id="1"
          name="Иван Иванов"
          count={1}
          shiftNumber="1, 2"
        />
      </AuthProvider>
    );
    expect(screen.getByText("1, 2")).toBeInTheDocument();
  });
});

describe("PWA Components", () => {
  it("renders mobile install button without throwing", () => {
    const { container } = render(<MobileInstallButton />);
    expect(container).toBeDefined();
  });
});

describe("AdminSettingsPanel Component", () => {
  it("renders Settings button without throwing any reference error", () => {
    const handleSave = vi.fn().mockResolvedValue(true);
    const { container } = render(
      <AuthProvider>
        <AdminSettingsPanel settings={mockSettings} onSave={handleSave} />
      </AuthProvider>
    );
    expect(screen.getByRole("button", { name: /Настройки/i })).toBeInTheDocument();
  });
});

describe("ErrorBoundary Component", () => {
  it("catches errors and renders fallback UI", () => {
    const ProblemChild = () => {
      throw new Error("Test intentional crash");
    };

    // Suppress console.error in vitest for this expected error test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Възникна непредвидена грешка")).toBeInTheDocument();
    expect(screen.getByText("Test intentional crash")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Презареди страницата/i })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});

describe("StageSelector Component", () => {
  it("renders both educational stages with badges", () => {
    const handleChange = vi.fn();
    render(<StageSelector currentStage="secondary" onStageChange={handleChange} />);

    expect(screen.getByText("Прогимназиален / Гимназиален")).toBeInTheDocument();
    expect(screen.getByText("V – XII клас")).toBeInTheDocument();
    expect(screen.getByText("Начален етап")).toBeInTheDocument();
    expect(screen.getByText("I – IV клас")).toBeInTheDocument();
  });

  it("calls onStageChange with 'primary' when primary tab is clicked", () => {
    const handleChange = vi.fn();
    render(<StageSelector currentStage="secondary" onStageChange={handleChange} />);

    const primaryButton = screen.getByRole("tab", { name: /Начален етап/i });
    fireEvent.click(primaryButton);

    expect(handleChange).toHaveBeenCalledWith("primary");
  });

  it("calls onStageChange with 'secondary' when secondary tab is clicked", () => {
    const handleChange = vi.fn();
    render(<StageSelector currentStage="primary" onStageChange={handleChange} />);

    const secondaryButton = screen.getByRole("tab", { name: /Прогимназиален/i });
    fireEvent.click(secondaryButton);

    expect(handleChange).toHaveBeenCalledWith("secondary");
  });
});

describe("ScheduleTable Component with Stages", () => {
  const dummyPeriod = { year: "2025/2026", term: 1 as const };

  it("renders 3 primary stage location columns when currentStage='primary'", () => {
    render(
      <AuthProvider>
        <ScheduleTable
          currentPeriod={dummyPeriod}
          currentStage="primary"
          getAssignmentsForCell={() => []}
          counts={{}}
          onAssign={vi.fn()}
          onUnassign={vi.fn()}
          onMove={vi.fn()}
          settings={mockSettings}
          teachers={[]}
        />
      </AuthProvider>
    );

    expect(screen.getAllByText("Главен дежурен параден вход - 07:00 ч.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Дежурен на I етаж - 07:30 ч.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Дежурен на II етаж - 07:30 ч.").length).toBeGreaterThan(0);
    // Secondary location should NOT be present
    expect(screen.queryAllByText("Дежурни на III-ти етаж").length).toBe(0);
  });

  it("renders 5 secondary stage location columns when currentStage='secondary'", () => {
    render(
      <AuthProvider>
        <ScheduleTable
          currentPeriod={dummyPeriod}
          currentStage="secondary"
          getAssignmentsForCell={() => []}
          counts={{}}
          onAssign={vi.fn()}
          onUnassign={vi.fn()}
          onMove={vi.fn()}
          settings={mockSettings}
          teachers={[]}
        />
      </AuthProvider>
    );

    expect(screen.getAllByText("Дежурен на 0 етаж").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Дежурни на III-ти етаж").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Дежурни на IV-ти етаж").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Училищен стол").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Главен дежурен").length).toBeGreaterThan(0);
    // Primary location should NOT be present
    expect(screen.queryAllByText("Дежурен на I етаж - 07:30 ч.").length).toBe(0);
  });
});

describe("PrintableSchedule Component with Allocation Notes", () => {
  const dummyPeriod = { year: "2025/2026", term: 1 as const };

  it("renders teacher with duty allocation note in parentheses (e.g. фоайе)", () => {
    render(
      <PrintableSchedule
        currentPeriod={dummyPeriod}
        settings={mockSettings}
        currentStage="secondary"
        getAssignmentsForCell={(day, loc) => {
          if (day === "Понеделник" && loc === mockSettings.location_3) {
            return [{ id: "1", name: "Красимир Ватев", shiftNumber: null, note: "фоайе" }];
          }
          return [];
        }}
      />
    );

    expect(screen.getByText(/Красимир Ватев \(фоайе\)/i)).toBeInTheDocument();
  });

  it("renders teacher with shift number '1, 2' (e.g. 1, 2. Красимир Ватев)", () => {
    render(
      <PrintableSchedule
        currentPeriod={dummyPeriod}
        settings={mockSettings}
        currentStage="secondary"
        getAssignmentsForCell={(day, loc) => {
          if (day === "Понеделник" && loc === mockSettings.location_4) {
            return [{ id: "1", name: "Красимир Ватев", shiftNumber: "1, 2", note: null }];
          }
          return [];
        }}
      />
    );

    expect(screen.getByText(/1, 2\. Красимир Ватев/i)).toBeInTheDocument();
  });
});




