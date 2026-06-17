import React, { useState } from "react";
import { CellTeacher } from "@/types/schedule";
import { TeacherBadge } from "./TeacherBadge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduleCellProps {
  day: string;
  location: string;
  teachers: CellTeacher[];
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
  isShiftLocation?: boolean;
  getTeacherName?: (teacherId: string) => string | undefined;
  isTeacherUnavailable?: (teacherId: string, day: string) => { note?: string | null } | null;
}


export function ScheduleCell({
  day,
  location,
  teachers,
  counts,
  onAssign,
  onUnassign,
  onMove,
  onUpdateShiftNumber,
  isShiftLocation = false,
  getTeacherName,
  isTeacherUnavailable,
}: ScheduleCellProps) {
  const { isAdmin } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);

  const notifyIfUnavailable = (teacherId: string) => {
    if (!isTeacherUnavailable) return;
    const u = isTeacherUnavailable(teacherId, day);
    if (u) {
      const name = getTeacherName?.(teacherId) || "Учителят";
      const noteSuffix = u.note ? ` (${u.note})` : "";
      toast.warning(
        `${name} не е свободен този ден да бъде дежурен${noteSuffix}`,
        { duration: 4500 }
      );
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isAdmin) return;
    // Only set to false if we're leaving the cell entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    setIsDragOver(false);

    const teacherId = e.dataTransfer.getData("teacherId");
    const source = e.dataTransfer.getData("source");

    if (!teacherId) return;

    // Check if teacher is already in this cell
    const alreadyInCell = teachers.some(t => t.id === teacherId);
    if (alreadyInCell) {
      toast.error("Този учител вече е в тази клетка!");
      return;
    }

    if (source === "list") {
      const success = await onAssign(teacherId, day, location);
      if (!success) {
        toast.error("Този учител вече е в тази клетка!");
      }
    } else if (source === "cell") {
      const fromDay = e.dataTransfer.getData("fromDay");
      const fromLocation = e.dataTransfer.getData("fromLocation");
      if (fromDay && fromLocation) {
        if (fromDay !== day || fromLocation !== location) {
          await onMove(teacherId, fromDay, fromLocation, day, location);
        }
      }
    }
  };

  const handleTeacherDragStart = (e: React.DragEvent, teacher: CellTeacher) => {
    e.dataTransfer.setData("teacherId", teacher.id);
    e.dataTransfer.setData("source", "cell");
    e.dataTransfer.setData("fromDay", day);
    e.dataTransfer.setData("fromLocation", location);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={cn(
        "drop-zone min-h-[80px] transition-all duration-200",
        isAdmin && "border-2 border-dashed border-muted-foreground/30",
        isDragOver && isAdmin && "border-primary bg-primary/10 scale-[1.02]"
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap gap-1.5">
        {teachers.map((teacher) => (
          <TeacherBadge
            key={teacher.id}
            id={teacher.id}
            name={teacher.name}
            count={counts[teacher.id] || 0}
            size="sm"
            draggable={isAdmin}
            onDragStart={(e) => handleTeacherDragStart(e, teacher)}
            showRemove={isAdmin}
            onRemove={() => onUnassign(teacher.id, day, location)}
            shiftNumber={isShiftLocation ? teacher.shiftNumber : undefined}
            onShiftNumberChange={
              isShiftLocation && isAdmin && onUpdateShiftNumber
                ? (sn) => onUpdateShiftNumber(teacher.id, day, location, sn)
                : undefined
            }
          />
        ))}
        {teachers.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            {isAdmin ? "Провлачете учител тук" : "Няма дежурен"}
          </span>
        )}
      </div>
    </div>
  );
}
