import React from "react";
import { Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegendProps {
  onExportPDF?: () => void;
}

export function Legend({ onExportPDF }: LegendProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Легенда - брой назначения</span>
        </div>
        
        <div className="flex flex-wrap gap-3 text-sm flex-1 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted border border-border" />
            <span className="text-muted-foreground">0 места</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600" />
            <span>1 място</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500 border border-blue-600" />
            <span>2 места</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500 border border-orange-600" />
            <span>3 места</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500 border border-red-600" />
            <span>4+ места</span>
          </div>
        </div>

        {onExportPDF && (
          <Button onClick={onExportPDF} variant="outline" size="sm" className="gap-2 shrink-0">
            <Download className="w-4 h-4" />
            Изтегли като PDF
          </Button>
        )}
      </div>
    </div>
  );
}
