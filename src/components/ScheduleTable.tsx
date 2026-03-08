import React, { useRef, useEffect } from "react";
import { AppSettings } from "@/hooks/useAppSettings";
import { DAYS, LOCATIONS, CellTeacher, SchoolPeriod } from "@/types/schedule";
import { ScheduleCell } from "./ScheduleCell";
import { PrintableSchedule } from "./PrintableSchedule";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const SHIFT_LOCATION = "Главен дежурен – западен вход 07:30-08:40 ч.";

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
  currentPeriod: SchoolPeriod;
  onExportReady?: (exportFn: () => Promise<void>) => void;
}

export function ScheduleTable({
  getAssignmentsForCell,
  counts,
  onAssign,
  onUnassign,
  onMove,
  onUpdateShiftNumber,
  currentPeriod,
  onExportReady,
}: ScheduleTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!printableRef.current) {
      toast.error("Грешка: Не може да се генерира PDF", { id: "pdf-export" });
      return;
    }

    try {
      toast.loading("Генериране на PDF...", { id: "pdf-export" });

      const printableElement = printableRef.current;
      
      // Temporarily make visible for capture
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
      
      // Restore hidden style
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
  };

  // Expose export function to parent
  useEffect(() => {
    if (onExportReady) {
      onExportReady(handleExportPDF);
    }
  }, [onExportReady, currentPeriod]);

  return (
    <div className="space-y-4">
      <div ref={tableRef} className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full schedule-table border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left font-semibold border-r border-primary/20 min-w-[120px]">
                  Ден от седмицата
                </th>
                {LOCATIONS.map((location) => (
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
                  <td className="p-3 font-medium border-r border-table-border bg-secondary/50">
                    {day}
                  </td>
                  {LOCATIONS.map((location) => (
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
                        isShiftLocation={location === SHIFT_LOCATION}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
        />
      </div>
    </div>
  );
}
