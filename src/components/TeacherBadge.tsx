import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherBadgeProps {
  id: string;
  name: string;
  count: number;
  onRemove?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
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
  showRemove = false,
  size = "md",
}: TeacherBadgeProps) {
  const { isAdmin } = useAuth();

  return (
    <div
      className={cn(
        "teacher-badge inline-flex items-center gap-2 select-none",
        getCountClass(count),
        size === "sm" && "px-2 py-1 text-xs",
        draggable && isAdmin && "hover:shadow-md hover:scale-105"
      )}
      draggable={draggable && isAdmin}
      onDragStart={onDragStart}
      data-teacher-id={id}
    >
      <span className="truncate max-w-[150px]">{name}</span>
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/50 text-xs font-bold">
        {count}
      </span>
      {showRemove && isAdmin && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
          aria-label={`Премахни ${name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
