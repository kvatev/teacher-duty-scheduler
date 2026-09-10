import React, { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { TeacherList } from "@/components/TeacherList";
import { ScheduleTable } from "@/components/ScheduleTable";
import { Legend } from "@/components/Legend";
import { PeriodSelector } from "@/components/PeriodSelector";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { initBroadcastListener } from "@/lib/notifications";
import { toast } from "sonner";
import { useScheduleDB } from "@/hooks/useScheduleDB";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const {
    teachers,
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
    autoArrangeTeachers,
    addPeriod,
    deletePeriod,
    copyTeachersFromPeriod,
    updateShiftNumber,
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
    return unsubscribe;
  }, []);

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
      <Header settings={settings} onExportPDF={handleExportPDF} />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Broadcast banner for announcements */}
        <BroadcastBanner />

        {/* Top Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card rounded-lg border p-3 shadow-xs">
          <PeriodSelector
            currentPeriod={currentPeriod}
            availablePeriods={availablePeriods}
            availableYears={availableYears}
            getTermsForYear={getTermsForYear}
            onChangePeriod={changePeriod}
            onAddPeriod={addPeriod}
            onDeletePeriod={deletePeriod}
            onCopyTeachers={copyTeachersFromPeriod}
            settings={settings}
          />
          <Legend />
        </div>

        {/* Mobile Section Switcher */}
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
            <span>Учители ({teachers.length})</span>
          </button>
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Teacher list sidebar */}
          <aside
            className={cn(
              "w-full lg:w-[22%] lg:min-w-[250px] lg:max-w-[320px] flex-shrink-0 animate-in fade-in duration-200",
              mobileSection !== "teachers" && "hidden lg:block"
            )}
          >
            <TeacherList
              teachers={teachers}
              counts={teacherAssignmentCounts}
              onAddTeacher={addTeacher}
              onRemoveTeacher={removeTeacher}
              onAutoArrange={autoArrangeTeachers}
            />
          </aside>

          {/* Schedule table */}
          <section
            className={cn(
              "flex-1 min-w-0 animate-in fade-in duration-200",
              mobileSection !== "schedule" && "hidden lg:block"
            )}
          >
            <ScheduleTable
              getAssignmentsForCell={getAssignmentsForCell}
              counts={teacherAssignmentCounts}
              onAssign={assignTeacher}
              onUnassign={unassignTeacher}
              onMove={moveTeacher}
              currentPeriod={currentPeriod}
              onExportReady={handleExportReady}
              onUpdateShiftNumber={updateShiftNumber}
              settings={settings}
              teachers={teachers}
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
