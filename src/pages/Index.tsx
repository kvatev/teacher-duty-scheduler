import React, { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { TeacherList } from "@/components/TeacherList";
import { ScheduleTable } from "@/components/ScheduleTable";
import { Legend } from "@/components/Legend";
import { PeriodSelector } from "@/components/PeriodSelector";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { useScheduleDB } from "@/hooks/useScheduleDB";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";

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
    <div className="min-h-screen bg-background">
      <Header settings={settings} onSaveSettings={updateMultipleSettings} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Period selector */}
        <div className="mb-6">
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
        <div className="mb-6">
          <Legend onExportPDF={handleExportPDF} />
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Teacher list sidebar */}
          <aside className="w-full lg:w-[20%] lg:min-w-[240px] lg:max-w-[320px] flex-shrink-0">
            <TeacherList
              teachers={teachers}
              counts={teacherAssignmentCounts}
              onAddTeacher={addTeacher}
              onRemoveTeacher={removeTeacher}
              onAutoArrange={autoArrangeTeachers}
            />
          </aside>

          {/* Schedule table */}
          <section className="flex-1 min-w-0">
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
            />
            
            {isAdmin && settings.tip_text && (
              <p className="mt-4 text-sm text-muted-foreground text-center">
                {settings.tip_text}
              </p>
            )}
          </section>
        </div>

        {/* Footer note */}
        <footer className="mt-8 text-center text-sm text-muted-foreground space-y-1">
          <p>{settings.footer_note}</p>
          <p className="text-xs">Администратор на приложението е {settings.admin_name} | За връзка: <a href={`mailto:${settings.admin_email}`} className="underline hover:text-foreground transition-colors">{settings.admin_email}</a></p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
