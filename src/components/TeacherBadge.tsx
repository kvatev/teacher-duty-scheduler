import React, { useState, useEffect } from "react";
import { Ban, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CANTEEN_DUTY_PRESETS } from "@/types/schedule";

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
  hasDayConflict?: boolean;
  dayConflictCount?: number;
  dayName?: string;
  showRemove?: boolean;
  size?: "xs" | "sm" | "md";
  shiftNumber?: string | number | null;
  onShiftNumberChange?: (shiftNumber: string | number | null) => void;
  note?: string | null;
  allowNote?: boolean;
  onNoteChange?: (note: string | null) => void;
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
  hasDayConflict = false,
  dayConflictCount,
  dayName,
  shiftNumber,
  onShiftNumberChange,
  note,
  allowNote = false,
  onNoteChange,
}: TeacherBadgeProps) {
  const { isAdmin } = useAuth();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempNote, setTempNote] = useState(note || "");
  const [isShiftPopoverOpen, setIsShiftPopoverOpen] = useState(false);
  const [tempShift, setTempShift] = useState(shiftNumber !== null && shiftNumber !== undefined ? String(shiftNumber) : "");

  useEffect(() => {
    if (isPopoverOpen) {
      setTempNote(note || "");
    }
  }, [isPopoverOpen, note]);

  useEffect(() => {
    if (isShiftPopoverOpen) {
      setTempShift(shiftNumber !== null && shiftNumber !== undefined ? String(shiftNumber) : "");
    }
  }, [isShiftPopoverOpen, shiftNumber]);

  const canDrag = draggable && isAdmin && !isPopoverOpen && !isShiftPopoverOpen;
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

  const canEditNote = allowNote && isAdmin && !!onNoteChange;

  return (
    <div
      className={cn(
        "teacher-badge inline-flex items-center select-none transition-all",
        isXs ? "gap-1" : "gap-1.5",
        getCountClass(count),
        size === "sm" && "px-2 py-1 text-xs",
        isXs && "px-1.5 py-0.5 text-[10px] leading-tight",
        hasDayConflict && "!bg-red-600 !border-red-700 !text-white hover:!bg-red-700 shadow-xs ring-1 ring-red-400/50",
        unavailable && !hasDayConflict && "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground",
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
      {hasDayConflict && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            toast.warning(
              `Внимание: ${name} има ${dayConflictCount || 2} дежурства в ${dayName ? `ден ${dayName}` : "този ден"}!`,
              { duration: 4500 }
            );
          }}
          className={cn(
            "inline-flex items-center justify-center font-black rounded-full bg-white text-red-600 hover:bg-white/90 shrink-0 shadow-xs cursor-pointer border-0 p-0 leading-none transition-transform hover:scale-110",
            isXs ? "w-3 h-3 text-[9px]" : "w-3.5 h-3.5 text-[10px]"
          )}
          title={`Внимание: ${name} има ${dayConflictCount || 2} дежурства в ${dayName ? `ден ${dayName}` : "този ден"}!`}
          aria-label={`Внимание: ${name} се повтаря ${dayConflictCount || 2} пъти в този ден`}
        >
          ✕
        </button>
      )}
      {shiftNumber !== undefined && (
        isAdmin && onShiftNumberChange ? (
          <Popover open={isShiftPopoverOpen} onOpenChange={setIsShiftPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={cn(
                  "flex items-center justify-center rounded font-bold transition-all px-1 cursor-pointer border",
                  isXs ? "min-w-[16px] h-4 text-[10px]" : "min-w-[20px] h-5 text-xs",
                  shiftNumber
                    ? "bg-white/90 text-black border-white shadow-xs hover:bg-white"
                    : "bg-white/20 text-muted-foreground border-white/30 hover:bg-white/35"
                )}
                title={shiftNumber ? `Смяна: ${shiftNumber} (кликнете за промяна)` : "Задаване на смяна (1, 2 или 1,2)"}
              >
                {shiftNumber || "–"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-3 space-y-2.5 z-50 shadow-lg"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  Смяна: {name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Изберете или въведете цифрите 1, 2 или 1,2:
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {["1", "2", "1, 2", "1,2"].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="sm"
                    variant={tempShift.replace(/\s+/g, "") === preset.replace(/\s+/g, "") ? "default" : "outline"}
                    className="h-7 text-xs px-2.5 py-0 font-bold"
                    onClick={() => {
                      onShiftNumberChange(preset);
                      setIsShiftPopoverOpen(false);
                    }}
                  >
                    {preset}
                  </Button>
                ))}
              </div>

              <Input
                value={tempShift}
                onChange={(e) => setTempShift(e.target.value)}
                placeholder="1, 2 или 1,2"
                className="h-8 text-xs font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onShiftNumberChange(tempShift.trim() || null);
                    setIsShiftPopoverOpen(false);
                  }
                }}
              />

              <div className="flex items-center justify-between pt-1 border-t">
                {shiftNumber ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                    onClick={() => {
                      onShiftNumberChange(null);
                      setIsShiftPopoverOpen(false);
                    }}
                  >
                    Без смяна
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setIsShiftPopoverOpen(false)}
                  >
                    Отказ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => {
                      onShiftNumberChange(tempShift.trim() || null);
                      setIsShiftPopoverOpen(false);
                    }}
                  >
                    Запази
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span
            className={cn(
              "flex items-center justify-center rounded font-bold px-1 select-none",
              isXs ? "min-w-[16px] h-4 text-[10px]" : "min-w-[20px] h-5 text-xs",
              shiftNumber ? "bg-white/60 text-black" : "bg-white/20 text-muted-foreground"
            )}
          >
            {shiftNumber || "–"}
          </span>
        )
      )}
      <span className={cn("truncate", isXs ? "max-w-[85px]" : "max-w-[140px]")}>{name}</span>

      {/* Note / Sub-allocation (e.g. фоайе) */}
      {canEditNote ? (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className={cn(
                "rounded font-medium transition-all shrink-0 cursor-pointer border",
                note
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/80"
                  : "bg-white/30 hover:bg-white/50 text-muted-foreground hover:text-foreground border-dashed border-white/50",
                isXs ? "text-[9px] px-1 py-0" : "text-[10px] px-1.5 py-0.5"
              )}
              title={note ? `Пост: ${note} (кликнете за редакция)` : "Задай разпределение (напр. фоайе)"}
            >
              {note || "+ пост"}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-3 space-y-2.5 z-50 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground truncate">
                Разпределение: {name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Посочете разпределение / пост (напр. фоайе):
              </p>
            </div>

            <div className="flex flex-wrap gap-1">
              {CANTEEN_DUTY_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant={tempNote.toLowerCase() === preset.toLowerCase() ? "default" : "outline"}
                  className="h-6 text-[11px] px-2 py-0"
                  onClick={() => {
                    setTempNote(preset);
                  }}
                >
                  {preset}
                </Button>
              ))}
            </div>

            <Input
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="напр. фоайе"
              className="h-8 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onNoteChange(tempNote.trim() || null);
                  setIsPopoverOpen(false);
                }
              }}
            />

            <div className="flex items-center justify-between pt-1 border-t">
              {note ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                  onClick={() => {
                    onNoteChange(null);
                    setIsPopoverOpen(false);
                  }}
                >
                  Премахни
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setIsPopoverOpen(false)}
                >
                  Отказ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => {
                    onNoteChange(tempNote.trim() || null);
                    setIsPopoverOpen(false);
                  }}
                >
                  Запази
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        note && (
          <span
            className={cn(
              "font-medium rounded border shrink-0 bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/60",
              isXs ? "text-[9px] px-1 py-0 leading-tight" : "text-[10px] px-1.5 py-0.5"
            )}
          >
            {note}
          </span>
        )
      )}

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
        hasDayConflict || unavailable ? "bg-white/20 text-white" : "bg-white/50"
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
          className={cn(
            "rounded-full transition-colors",
            hasDayConflict ? "hover:bg-white/20 text-white/90 hover:text-white" : "hover:bg-destructive/20",
            isXs ? "p-0" : "ml-0.5 p-0.5"
          )}
          aria-label={`Премахни ${name}`}
        >
          <X className={isXs ? "w-2.5 h-2.5" : "w-3 h-3"} />
        </button>
      )}
    </div>
  );
}
