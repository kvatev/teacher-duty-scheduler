import React, { useState, useRef } from "react";
import { CellTeacher, Teacher } from "@/types/schedule";
import { TeacherBadge } from "./TeacherBadge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  allTeachers?: Teacher[];
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
  allTeachers = [],
}: ScheduleCellProps) {
  const { isAdmin } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchTeacher, setSearchTeacher] = useState("");
  const isDroppingRef = useRef(false);

  const notifyIfUnavailable = (teacherId: string) => {
    if (!isTeacherUnavailable) return;
    const u = isTeacherUnavailable(teacherId, day);
    if (u) {
      const name = getTeacherName?.(teacherId) || "Учителят";
      const noteSuffix = u.note ? ` (${u.note})` : "";
      toast.error(
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
    e.stopPropagation();
    setIsDragOver(false);

    if (isDroppingRef.current) return;
    isDroppingRef.current = true;

    try {
      const teacherId = e.dataTransfer.getData("teacherId");
      const source = e.dataTransfer.getData("source");

      if (!teacherId) return;

      // Check if teacher is already in this cell
      const alreadyInCell = teachers.some((t) => t.id === teacherId);
      if (alreadyInCell) {
        toast.error("Този учител вече е в тази клетка!");
        return;
      }

      if (source === "list") {
        const success = await onAssign(teacherId, day, location);
        if (!success) {
          toast.error("Този учител вече е в тази клетка!");
        } else {
          notifyIfUnavailable(teacherId);
        }
      } else if (source === "cell") {
        const fromDay = e.dataTransfer.getData("fromDay");
        const fromLocation = e.dataTransfer.getData("fromLocation");
        if (fromDay && fromLocation) {
          if (fromDay !== day || fromLocation !== location) {
            await onMove(teacherId, fromDay, fromLocation, day, location);
            notifyIfUnavailable(teacherId);
          }
        }
      }
    } finally {
      setTimeout(() => {
        isDroppingRef.current = false;
      }, 150);
    }
  };


  const handleTeacherDragStart = (e: React.DragEvent, teacher: CellTeacher) => {
    e.dataTransfer.setData("teacherId", teacher.id);
    e.dataTransfer.setData("source", "cell");
    e.dataTransfer.setData("fromDay", day);
    e.dataTransfer.setData("fromLocation", location);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleQuickAssign = async (teacherId: string) => {
    const alreadyInCell = teachers.some((t) => t.id === teacherId);
    if (alreadyInCell) {
      toast.error("Този учител вече е в тази клетка!");
      return;
    }
    const success = await onAssign(teacherId, day, location);
    if (success) {
      notifyIfUnavailable(teacherId);
      setIsPickerOpen(false);
      setSearchTeacher("");
    } else {
      toast.error("Грешка при назначаване на дежурен");
    }
  };

  const availableTeachers = allTeachers
    .filter((t) => !teachers.some((assigned) => assigned.id === t.id))
    .filter((t) => t.name.toLowerCase().includes(searchTeacher.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "bg"));

  return (
    <>
      <div
        className={cn(
          "drop-zone min-h-[70px] sm:min-h-[80px] p-1.5 rounded-md transition-all duration-200",
          isAdmin && "border-2 border-dashed border-muted-foreground/30 hover:border-primary/50",
          isDragOver && isAdmin && "border-primary bg-primary/10 scale-[1.02]"
        )}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={cn("flex flex-wrap items-center", teachers.length >= 4 ? "gap-1" : "gap-1.5")}>
          {teachers.map((teacher) => {
            const unavail = isTeacherUnavailable?.(teacher.id, day);
            return (
              <div
                key={teacher.id}
                className={cn(unavail && "rounded-md")}
                title={
                  unavail
                    ? `Не е свободен този ден${unavail.note ? ` (${unavail.note})` : ""}`
                    : undefined
                }
              >
                <TeacherBadge
                  id={teacher.id}
                  name={teacher.name}
                  count={counts[teacher.id] || 0}
                  size={teachers.length >= 4 ? "xs" : "sm"}
                  unavailable={!!unavail}
                  unavailableNote={unavail?.note}
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
              </div>
            );
          })}

          {isAdmin && teachers.length > 0 && allTeachers.length > 0 && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setIsPickerOpen(true)}
              className="h-6 w-6 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="Добави още дежурен в тази клетка"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}

          {teachers.length === 0 && (
            isAdmin ? (
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 py-1.5 px-2 rounded transition-colors border border-dashed border-muted-foreground/30 hover:border-primary/50 w-full justify-center bg-muted/20 hover:bg-primary/5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добави дежурен</span>
              </button>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Няма дежурен
              </span>
            )
          )}
        </div>
      </div>

      {isAdmin && (
        <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Добавяне на дежурен учител</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {day} • {location}
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Търси учител по име..."
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="overflow-y-auto flex-1 max-h-[300px] mt-3 divide-y border rounded-md">
              {availableTeachers.map((t) => {
                const unavail = isTeacherUnavailable?.(t.id, day);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleQuickAssign(t.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      {unavail && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                          Не е свободен{unavail.note ? ` (${unavail.note})` : ""}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary shrink-0">
                      {counts[t.id] || 0} деж.
                    </span>
                  </button>
                );
              })}
              {availableTeachers.length === 0 && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  Няма свободни учители
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
