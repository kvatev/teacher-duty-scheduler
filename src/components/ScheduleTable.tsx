import React from "react";
import { DAYS, LOCATIONS, Teacher } from "@/types/schedule";
import { ScheduleCell } from "./ScheduleCell";

interface ScheduleTableProps {
  getAssignmentsForCell: (day: string, location: string) => Teacher[];
  counts: Record<string, number>;
  onAssign: (teacherId: string, day: string, location: string) => void;
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
  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
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
  );
}
