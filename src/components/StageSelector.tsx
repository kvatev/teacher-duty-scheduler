import React from "react";
import { SchoolStage } from "@/types/schedule";
import { GraduationCap, Backpack } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageSelectorProps {
  currentStage: SchoolStage;
  onStageChange: (stage: SchoolStage) => void;
  className?: string;
}

export function StageSelector({
  currentStage,
  onStageChange,
  className,
}: StageSelectorProps) {
  return (
    <div
      className={cn(
        "flex items-center p-1 rounded-xl bg-muted/80 border shadow-xs gap-1 w-full sm:w-auto",
        className
      )}
      role="tablist"
      aria-label="Избор на образователен етап"
    >
      <button
        type="button"
        role="tab"
        aria-selected={currentStage === "secondary"}
        onClick={() => onStageChange("secondary")}
        className={cn(
          "flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
          currentStage === "secondary"
            ? "bg-card text-foreground shadow-xs ring-1 ring-border/50"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <GraduationCap
          className={cn(
            "w-4 h-4 transition-colors shrink-0",
            currentStage === "secondary" ? "text-primary" : "text-muted-foreground"
          )}
        />
        <div className="flex flex-col items-start leading-tight">
          <span className="truncate">Прогимназиален / Гимназиален</span>
          <span className="text-[10px] font-normal text-muted-foreground">
            V – XII клас
          </span>
        </div>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={currentStage === "primary"}
        onClick={() => onStageChange("primary")}
        className={cn(
          "flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
          currentStage === "primary"
            ? "bg-card text-foreground shadow-xs ring-1 ring-border/50"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <Backpack
          className={cn(
            "w-4 h-4 transition-colors shrink-0",
            currentStage === "primary" ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"
          )}
        />
        <div className="flex flex-col items-start leading-tight">
          <span className="truncate">Начален етап</span>
          <span className="text-[10px] font-normal text-muted-foreground">
            I – IV клас
          </span>
        </div>
      </button>
    </div>
  );
}
