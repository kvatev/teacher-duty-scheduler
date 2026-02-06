import React, { useRef } from "react";
import { Download } from "lucide-react";
import { DAYS, LOCATIONS, Teacher } from "@/types/schedule";
import { ScheduleCell } from "./ScheduleCell";
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
}

export function ScheduleTable({
  getAssignmentsForCell,
  counts,
  onAssign,
  onUnassign,
  onMove,
}: ScheduleTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!tableRef.current) return;

    try {
      toast.loading("Генериране на PDF...", { id: "pdf-export" });

      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

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
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      // Add title
      pdf.setFontSize(16);
      pdf.text("График за дежурство на учители", pdfWidth / 2, 8, { align: "center" });

      pdf.addImage(imgData, "PNG", imgX, imgY + 5, imgWidth * ratio, imgHeight * ratio);

      // Add footer
      pdf.setFontSize(10);
      pdf.text(
        "*Забележка: 1 - дежури от 07:30-08:00 ч.; 2 - дежури от 08:00 до 08:40",
        pdfWidth / 2,
        pdfHeight - 5,
        { align: "center" }
      );

      pdf.save("grafik-dezhurstva.pdf");
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
    </div>
  );
}
