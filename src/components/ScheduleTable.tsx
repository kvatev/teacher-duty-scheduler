import React, { useRef, useState } from "react";
import { Download } from "lucide-react";
import { DAYS, LOCATIONS, Teacher, SchoolPeriod } from "@/types/schedule";
import { ScheduleCell } from "./ScheduleCell";
import { PrintableSchedule } from "./PrintableSchedule";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ScheduleTableProps {
  getAssignmentsForCell: (day: string, location: string) => Teacher[];
  counts: Record<string, number>;
  onAssign: (teacherId: string, day: string, location: string) => boolean;
  onUnassign: (teacherId: string, day: string, location: string) => void;
  onMove: (
    teacherId: string,
    fromDay: string,
    fromLocation: string,
    toDay: string,
    toLocation: string
  ) => void;
  currentPeriod: SchoolPeriod;
}

export function ScheduleTable({
  getAssignmentsForCell,
  counts,
  onAssign,
  onUnassign,
  onMove,
  currentPeriod,
}: ScheduleTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!printableRef.current) return;

    try {
      toast.loading("Генериране на PDF...", { id: "pdf-export" });

      // Temporarily make the printable element visible
      const printableElement = printableRef.current;
      printableElement.style.position = "absolute";
      printableElement.style.left = "-9999px";
      printableElement.style.top = "0";
      printableElement.style.display = "block";

      const canvas = await html2canvas(printableElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 1200,
      });

      // Hide it again
      printableElement.style.display = "none";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExportPDF} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Изтегли като PDF
        </Button>
      </div>

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
      <div style={{ display: "none" }}>
        <PrintableSchedule
          ref={printableRef}
          getAssignmentsForCell={getAssignmentsForCell}
          currentPeriod={currentPeriod}
        />
      </div>
    </div>
  );
}
