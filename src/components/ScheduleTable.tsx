import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { AppSettings } from "@/hooks/useAppSettings";
import { DAYS, CellTeacher, SchoolPeriod, Teacher } from "@/types/schedule";
import { ScheduleCell } from "./ScheduleCell";
import { PrintableSchedule } from "./PrintableSchedule";
import { toast } from "sonner";
import { useUnavailability } from "@/hooks/useUnavailability";
import { Calendar, CalendarDays, LayoutGrid, Table as TableIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const DEFAULT_SHIFT_LOCATION = "Главен дежурен – западен вход 07:30-08:40 ч.";

function getTodayBgDay(): string {
  const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const map: Record<number, string> = {
    1: "Понеделник",
    2: "Вторник",
    3: "Сряда",
    4: "Четвъртък",
    5: "Петък",
  };
  return map[dayIndex] || "Понеделник";
}

interface ScheduleTableProps {
  getAssignmentsForCell: (day: string, location: string) => CellTeacher[];
  counts: Record<string, number>;
  onAssign: (teacherId: string, day: string, location: string) => boolean | Promise<boolean>;
  onUnassign: (teacherId: string, day: string, location: string) => void | Promise<void>;
  onMove: (
    teacherId: string,
    fromDay: string,
    fromLocation: string,
    toDay: string,
    toLocation: string
  ) => void | Promise<void>;
  onUpdateShiftNumber?: (teacherId: string, day: string, location: string, shiftNumber: number | null) => void;
  onClearSchedule?: () => Promise<boolean>;
  currentPeriod: SchoolPeriod;
  onExportReady?: (exportFn: () => Promise<void>) => void;
  settings?: AppSettings;
  teachers?: Teacher[];
}

export function ScheduleTable({
  getAssignmentsForCell,
  counts,
  onAssign,
  onUnassign,
  onMove,
  onUpdateShiftNumber,
  onClearSchedule,
  currentPeriod,
  onExportReady,
  settings,
  teachers = [],
}: ScheduleTableProps) {
  const { isAdmin } = useAuth();
  const tableRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const { isUnavailable } = useUnavailability();

  const [selectedDay, setSelectedDay] = useState<string>(getTodayBgDay);
  const [viewMode, setViewMode] = useState<"day" | "table">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "table"
  );

  const getTeacherName = (id: string) => teachers.find((t) => t.id === id)?.name;

  const locations = useMemo(() => {
    if (settings) {
      return [settings.location_1, settings.location_2, settings.location_3, settings.location_4];
    }
    return ["Дежурни на III-ти етаж", "Дежурни на IV-ти етаж", "Училищен стол и пред кабинет по музика", DEFAULT_SHIFT_LOCATION];
  }, [settings]);

  const shiftLocation = settings?.location_4 || DEFAULT_SHIFT_LOCATION;

  const handleExportPDF = useCallback(async () => {
    if (!printableRef.current) {
      toast.error("Грешка: Не може да се генерира PDF", { id: "pdf-export" });
      return;
    }

    try {
      toast.loading("Генериране на PDF...", { id: "pdf-export" });

      const printableElement = printableRef.current;
      
      const originalStyle = printableElement.parentElement?.getAttribute('style') || '';
      if (printableElement.parentElement) {
        printableElement.parentElement.style.cssText = 'position: absolute; left: 0; top: 0; z-index: -1;';
      }
      
      const canvas = await html2canvas(printableElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
        foreignObjectRendering: false,
      });
      
      if (printableElement.parentElement) {
        printableElement.parentElement.style.cssText = originalStyle;
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const margin = 5;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = margin;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      const fileName = `grafik-${currentPeriod.year.replace("/", "-")}-srok-${currentPeriod.term}.pdf`;
      pdf.save(fileName);
      toast.success("PDF файлът е изтеглен успешно!", { id: "pdf-export" });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Грешка при генериране на PDF", { id: "pdf-export" });
    }
  }, [currentPeriod]);

  // Expose export function to parent
  useEffect(() => {
    if (onExportReady) {
      onExportReady(handleExportPDF);
    }
  }, [onExportReady, handleExportPDF]);

  return (
    <div className="space-y-4">
      {/* Mobile View Toggle & Day Pills */}
      <div className="bg-card rounded-lg border shadow-xs p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Изглед на графика:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && onClearSchedule && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
                    title="Бързо изчистване на всички дежурства от графика"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Изчисти графика</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                      <RotateCcw className="w-5 h-5 text-amber-600" />
                      Изчистване на графика
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Искате ли бързо да изчистите всички поставени дежурства за периода{" "}
                      <strong>{currentPeriod.year}, {currentPeriod.term === 1 ? "I" : "II"} срок</strong>?
                      <br /><br />
                      <span className="text-muted-foreground">
                        ℹ️ <strong>Учителите в списъка остават запазени.</strong> Изчистват се само дежурствата в таблицата, за да можете бързо да поправите грешка или да започнете на чисто.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto mt-0">Отказ</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await onClearSchedule();
                      }}
                      className="bg-amber-600 text-white hover:bg-amber-700 w-full sm:w-auto"
                    >
                      Изчисти графика
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>По дни (Карти)</span>
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Пълна таблица</span>
            </Button>
          </div>
        </div>
      </div>

        {/* Day selection pills when in "day" view mode */}
        {viewMode === "day" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {DAYS.map((day) => (
              <Button
                key={day}
                variant={selectedDay === day ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(day)}
                className="h-8 text-xs shrink-0 rounded-full px-3.5"
              >
                {day}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Day Cards View (Mobile Optimized) */}
      {viewMode === "day" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <span>📅 {selectedDay}</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {locations.length} дежурни поста
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {locations.map((location, idx) => (
              <div
                key={`${selectedDay}-${location}`}
                className="bg-card rounded-lg border shadow-xs p-3.5 transition-all hover:border-primary/40 space-y-2.5"
              >
                <div className="flex items-start gap-2.5 pb-2 border-b">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold leading-snug">
                      {location}
                    </h4>
                    {location === shiftLocation && (
                      <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                        Смени 1 / 2
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <ScheduleCell
                    day={selectedDay}
                    location={location}
                    teachers={getAssignmentsForCell(selectedDay, location)}
                    counts={counts}
                    onAssign={onAssign}
                    onUnassign={onUnassign}
                    onMove={onMove}
                    onUpdateShiftNumber={onUpdateShiftNumber}
                    isShiftLocation={location === shiftLocation}
                    getTeacherName={getTeacherName}
                    isTeacherUnavailable={isUnavailable}
                    allTeachers={teachers}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Table View */}
      {viewMode === "table" && (
        <div ref={tableRef} className="bg-card rounded-lg border shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="block sm:hidden px-3 py-2 bg-muted/40 border-b text-xs text-muted-foreground flex items-center justify-between">
            <span>↔️ Плъзнете таблицата настрани</span>
            <span>5 дни • 4 локации</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full schedule-table border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-table-header text-table-header-foreground z-20 p-3 text-left font-semibold border-r border-primary/20 min-w-[110px] sm:min-w-[130px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]">
                    {settings?.day_column_header || "Ден от седмицата"}
                  </th>
                  {locations.map((location) => (
                    <th
                      key={location}
                      className="p-3 text-center font-semibold border-r border-primary/20 last:border-r-0 min-w-[180px]"
                    >
                      <div className="text-sm leading-tight">{location}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day} className="border-t border-table-border">
                    <td className="sticky left-0 z-10 p-2.5 sm:p-3 font-medium border-r border-table-border bg-card/95 backdrop-blur-sm shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
                      {day}
                    </td>
                    {locations.map((location) => (
                      <td
                        key={`${day}-${location}`}
                        className="p-2 border-r border-table-border last:border-r-0 align-top"
                      >
                        <ScheduleCell
                          day={day}
                          location={location}
                          teachers={getAssignmentsForCell(day, location)}
                          counts={counts}
                          onAssign={onAssign}
                          onUnassign={onUnassign}
                          onMove={onMove}
                          onUpdateShiftNumber={onUpdateShiftNumber}
                          isShiftLocation={location === shiftLocation}
                          getTeacherName={getTeacherName}
                          isTeacherUnavailable={isUnavailable}
                          allTeachers={teachers}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden printable version for PDF export */}
      <div 
        style={{ 
          position: "absolute", 
          left: "-9999px", 
          top: 0,
          opacity: 0,
          pointerEvents: "none",
          overflow: "visible"
        }}
      >
        <PrintableSchedule
          ref={printableRef}
          getAssignmentsForCell={getAssignmentsForCell}
          currentPeriod={currentPeriod}
          settings={settings!}
        />
      </div>
    </div>
  );
}
