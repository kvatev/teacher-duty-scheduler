import React, { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { TeacherList } from "@/components/TeacherList";
import { ScheduleTable } from "@/components/ScheduleTable";
import { Legend } from "@/components/Legend";
import { PeriodSelector } from "@/components/PeriodSelector";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header settings={settings} onSaveSettings={updateMultipleSettings} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1">
        {/* Broadcast messages */}
        <div className="mb-4">
          <BroadcastBanner />
        </div>

        {/* Period selector */}
        <div className="mb-4 sm:mb-6">
          <PeriodSelector 
            currentPeriod={currentPeriod}
            availableYears={availableYears}
            availablePeriods={availablePeriods}
            getTermsForYear={getTermsForYear}
            onPeriodChange={changePeriod}
            onAddPeriod={addPeriod}
            onDeletePeriod={deletePeriod}
            onCopyTeachers={copyTeachersFromPeriod}
          />
        </div>

        {/* Legend with PDF export */}
        <div className="mb-4 sm:mb-6">
          <Legend onExportPDF={handleExportPDF} />
        </div>

        {/* Mobile View Switcher: Schedule vs Teachers */}
        <div className="flex lg:hidden items-center p-1 bg-muted/80 rounded-xl mb-4 text-sm border shadow-xs">
          <button
            type="button"
            onClick={() => setMobileSection("schedule")}
            className={cn(
              "flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
              mobileSection === "schedule"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="w-4 h-4 text-primary" />
            <span>График за дежурства</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileSection("teachers")}
            className={cn(
              "flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
              mobileSection === "teachers"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-4 h-4 text-primary" />
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
    </div>
  );
};

export default Index;
