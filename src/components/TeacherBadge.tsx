import React from "react";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherBadgeProps {
  id: string;
  name: string;
  count: number;
  onRemove?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  showRemove?: boolean;
  size?: "sm" | "md";
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
}: TeacherBadgeProps) {
  const { isAdmin } = useAuth();
  const canDrag = draggable && isAdmin;

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
        "teacher-badge inline-flex items-center gap-1.5 select-none",
        getCountClass(count),
        size === "sm" && "px-2 py-1 text-xs",
        canDrag && "hover:shadow-md hover:scale-105 cursor-grab active:cursor-grabbing"
      )}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      data-teacher-id={id}
    >
      {canDrag && (
        <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0" />
      )}
      <span className="truncate max-w-[120px]">{name}</span>
      <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-white/50 text-xs font-bold px-1">
        {count}
      </span>
      {showRemove && isAdmin && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
          aria-label={`Премахни ${name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
