import React, { useState } from "react";
import { Teacher } from "@/types/schedule";
import { TeacherBadge } from "./TeacherBadge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ScheduleCellProps {
  day: string;
  location: string;
  teachers: Teacher[];
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

export function ScheduleCell({
  day,
  location,
  teachers,
  counts,
  onAssign,
  onUnassign,
  onMove,
}: ScheduleCellProps) {
  const { isAdmin } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    setIsDragOver(false);

    const teacherId = e.dataTransfer.getData("teacherId");
    const source = e.dataTransfer.getData("source");

    if (!teacherId) return;

    if (source === "list") {
      onAssign(teacherId, day, location);
    } else {
      const fromDay = e.dataTransfer.getData("fromDay");
      const fromLocation = e.dataTransfer.getData("fromLocation");
      if (fromDay && fromLocation) {
        if (fromDay !== day || fromLocation !== location) {
          onMove(teacherId, fromDay, fromLocation, day, location);
        }
      }
    }
  };

  const handleTeacherDragStart = (e: React.DragEvent, teacher: Teacher) => {
    e.dataTransfer.setData("teacherId", teacher.id);
    e.dataTransfer.setData("source", "cell");
    e.dataTransfer.setData("fromDay", day);
    e.dataTransfer.setData("fromLocation", location);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={cn(
        "drop-zone min-h-[80px]",
        isAdmin && "drop-zone-active",
        isDragOver && "drop-zone-over"
      )}
      onDragOver={handleDragOver}
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
