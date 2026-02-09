import React, { useState } from "react";
import { Calendar, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SchoolPeriod, TERMS } from "@/types/schedule";
import { useAuth } from "@/contexts/AuthContext";

interface PeriodSelectorProps {
  currentPeriod: SchoolPeriod;
  availableYears: string[];
  getTermsForYear: (year: string) => number[];
  onPeriodChange: (period: SchoolPeriod) => void;
  onAddPeriod: (year: string, term: 1 | 2) => Promise<boolean>;
  onDeletePeriod: (year: string, term: number) => Promise<boolean>;
}

export function PeriodSelector({
  currentPeriod,
  availableYears,
  getTermsForYear,
  onPeriodChange,
  onAddPeriod,
  onDeletePeriod,
}: PeriodSelectorProps) {
  const { isAdmin } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [newTerm, setNewTerm] = useState<1 | 2>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleYearChange = (year: string) => {
    // When changing year, select first available term for that year
    const terms = getTermsForYear(year);
    const term = terms.includes(currentPeriod.term) ? currentPeriod.term : (terms[0] as 1 | 2 || 1);
    onPeriodChange({ year, term });
  };

  const handleTermChange = (term: string) => {
    onPeriodChange({ ...currentPeriod, term: parseInt(term) as 1 | 2 });
  };

  const handleAddPeriod = async () => {
    if (!newYear.trim()) return;
    
    // Validate year format (YYYY/YYYY)
    const yearPattern = /^\d{4}\/\d{4}$/;
    if (!yearPattern.test(newYear.trim())) {
      return;
    }

    setIsAdding(true);
    const success = await onAddPeriod(newYear.trim(), newTerm);
    setIsAdding(false);

    if (success) {
      setIsAddDialogOpen(false);
      setNewYear("");
      setNewTerm(1);
    }
  };

  const handleDeletePeriod = async () => {
    setIsDeleting(true);
    await onDeletePeriod(currentPeriod.year, currentPeriod.term);
    setIsDeleting(false);
  };

  const availableTermsForCurrentYear = getTermsForYear(currentPeriod.year);

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-5 h-5" />
        <span className="font-medium text-foreground">Период:</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <Select value={currentPeriod.year} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Учебна година" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
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
            {TERMS.filter(term => availableTermsForCurrentYear.includes(term.value)).map((term) => (
              <SelectItem key={term.value} value={term.value.toString()}>
                {term.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <div className="flex items-center gap-1 ml-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Добави период">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добави нов период</DialogTitle>
                  <DialogDescription>
                    Въведете учебна година и изберете срок за новия период.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Учебна година</label>
                    <Input
                      placeholder="напр. 2026/2027"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Формат: ГГГГ/ГГГГ (напр. 2025/2026)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Срок</label>
                    <Select value={newTerm.toString()} onValueChange={(v) => setNewTerm(parseInt(v) as 1 | 2)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">I срок</SelectItem>
                        <SelectItem value="2">II срок</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Отказ
                    </Button>
                    <Button onClick={handleAddPeriod} disabled={isAdding || !newYear.trim()}>
                      {isAdding ? "Добавяне..." : "Добави"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" title="Изтрий текущия период">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Изтриване на период</AlertDialogTitle>
                  <AlertDialogDescription>
                    Сигурни ли сте, че искате да изтриете периода{" "}
                    <strong>{currentPeriod.year}, {currentPeriod.term === 1 ? "I" : "II"} срок</strong>?
                    <br /><br />
                    <span className="text-destructive font-medium">
                      Това ще изтрие всички учители и дежурства за този период. Действието е необратимо!
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отказ</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeletePeriod}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Изтриване..." : "Изтрий"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}
