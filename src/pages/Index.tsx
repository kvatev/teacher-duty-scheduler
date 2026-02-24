import React, { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { TeacherList } from "@/components/TeacherList";
import { ScheduleTable } from "@/components/ScheduleTable";
import { Legend } from "@/components/Legend";
import { PeriodSelector } from "@/components/PeriodSelector";
import { useScheduleDB } from "@/hooks/useScheduleDB";
import { useAuth } from "@/contexts/AuthContext";

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
      <Header />
      
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
          {/* Teacher list sidebar - matches schedule table height */}
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
            />
            
            {isAdmin && (
              <p className="mt-4 text-sm text-muted-foreground text-center">
                💡 Съвет: Провлачете учител от списъка вляво в желаната клетка, или преместете между клетки
              </p>
            )}
          </section>
        </div>

        {/* Footer note */}
        <footer className="mt-8 text-center text-sm text-muted-foreground space-y-1">
          <p>*Забележка: 1 - дежури от 07:30-08:00 ч.; 2 - дежури от 08:00 до 08:40</p>
          <p className="text-xs">Администратор на приложението е Красимир Ватев | За връзка: <a href="mailto:kvatev@outlook.com" className="underline hover:text-foreground transition-colors">kvatev@outlook.com</a></p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
