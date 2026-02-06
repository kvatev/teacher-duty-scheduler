import React from "react";
import { Header } from "@/components/Header";
import { TeacherList } from "@/components/TeacherList";
import { ScheduleTable } from "@/components/ScheduleTable";
import { Legend } from "@/components/Legend";
import { PeriodSelector } from "@/components/PeriodSelector";
import { useSchedule } from "@/hooks/useSchedule";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const {
    teachers,
    teacherAssignmentCounts,
    currentPeriod,
    isLoading,
    changePeriod,
    addTeacher,
    removeTeacher,
    assignTeacher,
    unassignTeacher,
    moveTeacher,
    getAssignmentsForCell,
    autoArrangeTeachers,
  } = useSchedule();

  const { isAdmin } = useAuth();

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
            onPeriodChange={changePeriod} 
          />
        </div>

        {/* Legend */}
        <div className="mb-6">
          <Legend />
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Teacher list sidebar */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-6 pt-[52px]">
              <TeacherList
                teachers={teachers}
                counts={teacherAssignmentCounts}
                onAddTeacher={addTeacher}
                onRemoveTeacher={removeTeacher}
                onAutoArrange={autoArrangeTeachers}
              />
            </div>
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
            />
            
            {isAdmin && (
              <p className="mt-4 text-sm text-muted-foreground text-center">
                💡 Съвет: Провлачете учител от списъка вляво в желаната клетка, или преместете между клетки
              </p>
            )}
          </section>
        </div>

        {/* Footer note */}
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>*Забележка: 1 - дежури от 07:30-08:00 ч.; 2 - дежури от 08:00 до 08:40</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
