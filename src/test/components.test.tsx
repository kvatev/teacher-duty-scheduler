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
  logo_url: "",
  schedule_title: "ГРАФИК",
  approval_text: "УТВЪРЖДАВАМ:",
  approval_role: "ДИРЕКТОР",
  day_column_header: "Ден от седмицата",
  tip_text: "💡 Съвет",
  term_1_label: "I учебен срок",
  term_2_label: "II учебен срок",
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

