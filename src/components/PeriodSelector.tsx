import React from "react";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchoolPeriod, SCHOOL_YEARS, TERMS } from "@/types/schedule";

interface PeriodSelectorProps {
  currentPeriod: SchoolPeriod;
  onPeriodChange: (period: SchoolPeriod) => void;
}

export function PeriodSelector({ currentPeriod, onPeriodChange }: PeriodSelectorProps) {
  const handleYearChange = (year: string) => {
    onPeriodChange({ ...currentPeriod, year });
  };

  const handleTermChange = (term: string) => {
    onPeriodChange({ ...currentPeriod, term: parseInt(term) as 1 | 2 });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-5 h-5" />
        <span className="font-medium text-foreground">Период:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Select value={currentPeriod.year} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Учебна година" />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_YEARS.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentPeriod.term.toString()} onValueChange={handleTermChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Срок" />
          </SelectTrigger>
          <SelectContent>
            {TERMS.map((term) => (
              <SelectItem key={term.value} value={term.value.toString()}>
                {term.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
