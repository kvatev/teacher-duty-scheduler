import React, { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { TeacherList } from "@/components/TeacherList";
import { ScheduleTable } from "@/components/ScheduleTable";
import { Legend } from "@/components/Legend";
import { PeriodSelector } from "@/components/PeriodSelector";
import { StageSelector } from "@/components/StageSelector";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { initBroadcastListener } from "@/lib/notifications";
import { toast } from "sonner";
import { useScheduleDB } from "@/hooks/useScheduleDB";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import type { DBBroadcast } from "@/lib/localDB";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const {
    teachers,
    assignments,
    teacherAssignmentCounts,
    currentPeriod,
    currentStage,
    changeStage,
    isLoading,
    availablePeriods,
    availableYears,
    getTermsForYear,
    changePeriod,
    addTeacher,
    removeTeacher,
    renameTeacher,
    assignTeacher,
    unassignTeacher,
    moveTeacher,
    getAssignmentsForCell,
    autoArrangeTeachers,
    addPeriod,
    deletePeriod,
    copyTeachersFromPeriod,
    updateShiftNumber,
    updateAssignmentNote,
    clearSchedule,
  } = useScheduleDB();

  const { isAdmin } = useAuth();
  const { settings, updateMultipleSettings } = useAppSettings();
  const [exportPDFFn, setExportPDFFn] = useState<(() => Promise<void>) | null>(null);
  const [mobileSection, setMobileSection] = useState<"schedule" | "teachers">("schedule");

  // Listen for broadcast messages from other tabs and background
  useEffect(() => {
    const unsubscribe = initBroadcastListener((broadcast) => {
      const title =
        broadcast.priority === "urgent"
          ? "🚨 СПЕШНО СЪОБЩЕНИЕ"
          : broadcast.priority === "warning"
          ? "⚠️ ВАЖНО СЪОБЩЕНИЕ"
          : "📢 Ново съобщение";

      toast(title, {
        description: broadcast.message,
        duration: 9000,
      });
    });

    const handleScheduleCloudUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ isActualUpdate?: boolean; newBroadcasts?: DBBroadcast[] }>;
      if (custom.detail?.isActualUpdate && (!custom.detail.newBroadcasts || custom.detail.newBroadcasts.length === 0)) {
        toast.info("📅 Графикът за дежурства беше автоматично обновен с последните промени!", {
          duration: 6000,
        });
      }
    };
    window.addEventListener("schedule-cloud-updated", handleScheduleCloudUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener("schedule-cloud-updated", handleScheduleCloudUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setMobileSection("schedule");
    }
  }, [isAdmin]);

  const handleExportReady = useCallback((fn: () => Promise<void>) => {
    setExportPDFFn(() => fn);
  }, []);

  const handleExportPDF = useCallback(() => {
    if (exportPDFFn) {
      exportPDFFn();
    }
  }, [exportPDFFn]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      <Header settings={settings} onSaveSettings={updateMultipleSettings} />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Broadcast banner for announcements */}
        <BroadcastBanner />

        {/* Top Controls Bar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-card rounded-lg border p-3 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <PeriodSelector
              currentPeriod={currentPeriod}
              availablePeriods={availablePeriods}
              availableYears={availableYears}
              getTermsForYear={getTermsForYear}
              onPeriodChange={changePeriod}
              onAddPeriod={addPeriod}
              onDeletePeriod={deletePeriod}
              onCopyTeachers={copyTeachersFromPeriod}
              term1Label={settings.term_1_label}
              term2Label={settings.term_2_label}
            />
            <div className="hidden sm:block w-px h-8 bg-border/60" />
            <StageSelector
              currentStage={currentStage}
              onStageChange={changeStage}
            />
          </div>
          <Legend onExportPDF={handleExportPDF} />
        </div>

        {/* Mobile Section Switcher - only for admin */}
        {isAdmin && (
          <div className="flex sm:hidden rounded-lg bg-muted p-1 gap-1">
            <button
              type="button"
              onClick={() => setMobileSection("schedule")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all",
                mobileSection === "schedule"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>График</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileSection("teachers")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all",
                mobileSection === "teachers"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {currentStage === "primary" ? "Учители I–IV" : "Учители V–XII"} ({teachers.length})
              </span>
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Teacher list sidebar - only visible for administrators */}
          {isAdmin && (
            <aside
              className={cn(
                "w-full lg:w-[22%] lg:min-w-[250px] lg:max-w-[320px] flex-shrink-0 animate-in fade-in duration-200 lg:sticky lg:top-4 lg:self-start",
                mobileSection !== "teachers" && "hidden lg:block"
              )}
            >
              <TeacherList
                teachers={teachers}
                counts={teacherAssignmentCounts}
                onAddTeacher={addTeacher}
                onRemoveTeacher={removeTeacher}
                onRenameTeacher={renameTeacher}
                onAutoArrange={autoArrangeTeachers}
                onClearSchedule={clearSchedule}
                currentStage={currentStage}
              />
            </aside>
          )}

          {/* Schedule table */}
          <section
            className={cn(
              "flex-1 min-w-0 animate-in fade-in duration-200",
              isAdmin && mobileSection !== "schedule" && "hidden lg:block"
            )}
          >
            <ScheduleTable
              getAssignmentsForCell={getAssignmentsForCell}
              counts={teacherAssignmentCounts}
              assignments={assignments}
              onAssign={assignTeacher}
              onUnassign={unassignTeacher}
              onMove={moveTeacher}
              currentPeriod={currentPeriod}
              onExportReady={handleExportReady}
              onUpdateShiftNumber={updateShiftNumber}
              onUpdateNote={updateAssignmentNote}
              settings={settings}
              teachers={teachers}
              currentStage={currentStage}
            />

            {isAdmin && settings.tip_text && (
              <p className="mt-4 text-xs sm:text-sm text-muted-foreground text-center">
                {settings.tip_text}
              </p>
            )}
          </section>
        </div>

        {/* Footer note */}
        <footer className="mt-8 text-center text-xs sm:text-sm text-muted-foreground space-y-1 pb-16 sm:pb-6">
          <p>{settings.footer_note}</p>
          <p className="text-[11px] sm:text-xs">
            Администратор: {settings.admin_name} | За връзка:{" "}
            <a
              href={`mailto:${settings.admin_email}`}
              className="underline hover:text-foreground transition-colors"
            >
              {settings.admin_email}
            </a>
          </p>
        </footer>
      </main>

      {/* Floating PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Floating Notification Permission Prompt */}
      <NotificationPrompt />
    </div>
  );
};

export default Index;
