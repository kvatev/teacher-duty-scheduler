import React from "react";
import { Ban, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";


interface TeacherBadgeProps {
  id: string;
  name: string;
  count: number;
  onRemove?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  unavailable?: boolean;
  unavailableNote?: string | null;
  showRemove?: boolean;
  size?: "xs" | "sm" | "md";
  shiftNumber?: number | null;
  onShiftNumberChange?: (shiftNumber: number | null) => void;

}

function getCountClass(count: number): string {
  if (count === 0) return "teacher-badge-count-0";
  if (count === 1) return "teacher-badge-count-1";
  if (count === 2) return "teacher-badge-count-2";
  if (count === 3) return "teacher-badge-count-3";
  return "teacher-badge-count-4";
}

export function TeacherBadge({
  id,
  name,
  count,
  onRemove,
  draggable = false,
  onDragStart,
  onDragEnd,
  showRemove = false,
  size = "md",
  unavailable = false,
  unavailableNote,
  shiftNumber,
  onShiftNumberChange,
}: TeacherBadgeProps) {
  const { isAdmin } = useAuth();
  const canDrag = draggable && isAdmin;
  const isXs = size === "xs";

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    onDragStart?.(e);
  };

  return (
    <div
      className={cn(
        "teacher-badge inline-flex items-center select-none transition-all",
        isXs ? "gap-1" : "gap-1.5",
        getCountClass(count),
        size === "sm" && "px-2 py-1 text-xs",
        isXs && "px-1.5 py-0.5 text-[10px] leading-tight",
        unavailable && "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground",
        canDrag && !unavailable && "hover:shadow-md hover:scale-105 cursor-grab active:cursor-grabbing"
      )}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      data-teacher-id={id}
    >
      {canDrag && !isXs && (
        <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0" />
      )}
      {shiftNumber !== undefined && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!onShiftNumberChange) return;
            // Cycle: null -> 1 -> 2 -> null
            if (shiftNumber === null || shiftNumber === undefined) onShiftNumberChange(1);
            else if (shiftNumber === 1) onShiftNumberChange(2);
            else onShiftNumberChange(null);
          }}
          className={cn(
            "flex items-center justify-center rounded font-bold transition-colors",
            isXs ? "min-w-[14px] h-4 text-[10px]" : "min-w-[18px] h-5 text-xs",
            onShiftNumberChange ? "cursor-pointer hover:bg-white/30" : "cursor-default",
            shiftNumber ? "bg-white/60 text-black" : "bg-white/20 text-muted-foreground"
          )}
          title={onShiftNumberChange ? "Натиснете за смяна: 1 → 2 → без" : undefined}
          disabled={!onShiftNumberChange}
        >
          {shiftNumber || "–"}
        </button>
      )}
      <span className={cn("truncate", isXs ? "max-w-[92px]" : "max-w-[150px]")}>{name}</span>
      {unavailable && (
        <span className="relative inline-flex items-center justify-center shrink-0">
          <Ban className={cn("flex-shrink-0", isXs ? "w-2 h-2 sm:w-2.5 sm:h-2.5" : "w-2.5 h-2.5 sm:w-3 sm:h-3")} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (unavailableNote) {
                toast.error(`Не е свободен: ${unavailableNote}`, { duration: 3000 });
              } else {
                toast.error("Учителят не е свободен този ден", { duration: 3000 });
              }
            }}
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation border-0 bg-transparent p-0",
              isXs ? "w-8 h-8 sm:w-4 sm:h-4" : "w-11 h-11 sm:w-5 sm:h-5"
            )}
            aria-label={`Не е свободен${unavailableNote ? `: ${unavailableNote}` : ""}`}
            title={unavailableNote || "Не е свободен този ден"}
          />
        </span>
      )}
      <span className={cn(
        "flex items-center justify-center rounded-full font-bold px-1",
        isXs ? "min-w-[16px] h-4 text-[10px]" : "min-w-[20px] h-5 text-xs",
        unavailable ? "bg-white/20 text-destructive-foreground" : "bg-white/50"
      )}>
        {count}
      </span>
      {showRemove && isAdmin && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
          className={cn("rounded-full hover:bg-destructive/20 transition-colors", isXs ? "p-0" : "ml-0.5 p-0.5")}
          aria-label={`Премахни ${name}`}
        >
          <X className={isXs ? "w-2.5 h-2.5" : "w-3 h-3"} />
        </button>
      )}
    </div>
  );
}
