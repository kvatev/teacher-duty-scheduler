import React from "react";
import { Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegendProps {
  onExportPDF?: () => void;
}

export function Legend({ onExportPDF }: LegendProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      {/* Mobile: stack vertically | Desktop: single row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Легенда - брой дежурства</span>
        </div>

        {/* Color indicators - horizontal wrap */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm lg:flex-1 lg:justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-muted border border-border" />
            <span className="text-muted-foreground">0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600" />
            <span>1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-blue-500 border border-blue-600" />
            <span>2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-orange-500 border border-orange-600" />
            <span>3</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-500 border border-red-600" />
            <span>4+</span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-border" title="Учителят има 2 или повече дежурства в един и същи ден">
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 border border-red-700 text-white text-[11px] font-medium leading-none shadow-xs">
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-white text-red-600 text-[9px] font-black leading-none">✕</span>
              <span>2+ в деня</span>
            </div>
          </div>
        </div>

        {/* PDF button - full width on mobile */}
        {onExportPDF && (
          <Button
            onClick={onExportPDF}
            variant="outline"
            size="sm"
            className="gap-2 w-full lg:w-auto lg:shrink-0"
          >
            <Download className="w-4 h-4" />
            Изтегли като PDF
          </Button>
        )}
      </div>
    </div>
  );
}
