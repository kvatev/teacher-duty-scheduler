import React, { useState } from "react";
import { Calendar, Plus, Trash2, Copy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

interface DBPeriod {
  id: string;
  year: string;
  term: number;
}

interface PeriodSelectorProps {
  currentPeriod: SchoolPeriod;
  availableYears: string[];
  availablePeriods: DBPeriod[];
  getTermsForYear: (year: string) => number[];
  onPeriodChange: (period: SchoolPeriod) => void;
  onAddPeriod: (year: string, term: 1 | 2) => Promise<boolean>;
  onDeletePeriod: (year: string, term: number) => Promise<boolean>;
  onCopyTeachers: (sourceYear: string, sourceTerm: number, includeAssignments: boolean) => Promise<boolean>;
}

export function PeriodSelector({
  currentPeriod,
  availableYears,
  availablePeriods,
  getTermsForYear,
  onPeriodChange,
  onAddPeriod,
  onDeletePeriod,
  onCopyTeachers,
}: PeriodSelectorProps) {
  const { isAdmin } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [newTerm, setNewTerm] = useState<1 | 2>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState("");
  const [copySourceTerm, setCopySourceTerm] = useState<number>(1);
  const [includeAssignments, setIncludeAssignments] = useState(false);

  const handleYearChange = (year: string) => {
    const terms = getTermsForYear(year);
    const term = terms.includes(currentPeriod.term) ? currentPeriod.term : (terms[0] as 1 | 2 || 1);
    onPeriodChange({ year, term });
  };

  const handleTermChange = (term: string) => {
    onPeriodChange({ ...currentPeriod, term: parseInt(term) as 1 | 2 });
  };

  const handleAddPeriod = async () => {
    if (!newYear.trim()) {
      toast.error("Моля, въведете учебна година");
      return;
    }
    
    const yearPattern = /^\d{4}\/\d{4}$/;
    if (!yearPattern.test(newYear.trim())) {
      toast.error("Невалиден формат на учебната година. Използвайте формат: 2025/2026");
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

  const handleCopyTeachers = async () => {
    if (!copySourceYear) return;
    
    setIsCopying(true);
    const success = await onCopyTeachers(copySourceYear, copySourceTerm, includeAssignments);
    setIsCopying(false);

    if (success) {
      setIsCopyDialogOpen(false);
      setCopySourceYear("");
      setCopySourceTerm(1);
      setIncludeAssignments(false);
    }
  };

  // Get available periods excluding current one (for copy source)
  const otherPeriods = availablePeriods.filter(
    p => !(p.year === currentPeriod.year && p.term === currentPeriod.term)
  );

  const copySourceTerms = copySourceYear ? getTermsForYear(copySourceYear) : [];
  const availableTermsForCurrentYear = getTermsForYear(currentPeriod.year);

  const displayedYears = availableYears.length > 0
    ? (availableYears.includes(currentPeriod.year) ? availableYears : [currentPeriod.year, ...availableYears])
    : [currentPeriod.year];

  const displayedTerms = availableTermsForCurrentYear.length > 0
    ? TERMS.filter(term => availableTermsForCurrentYear.includes(term.value))
    : TERMS;

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
            {displayedYears.map((year) => (
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
            {displayedTerms.map((term) => (
              <SelectItem key={term.value} value={term.value.toString()}>
                {term.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <div className="flex items-center gap-1 ml-2">
            {/* Add period */}
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

            {/* Copy teachers from another period */}
            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9" 
                  title="Копирай учители от друг период"
                  disabled={otherPeriods.length === 0}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Копиране на учители</DialogTitle>
                  <DialogDescription>
                    Изберете период, от който да копирате учителите в текущия период ({currentPeriod.year}, {currentPeriod.term === 1 ? "I" : "II"} срок).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Учебна година</label>
                    <Select 
                      value={copySourceYear} 
                      onValueChange={(year) => {
                        setCopySourceYear(year);
                        const terms = getTermsForYear(year);
                        if (terms.length > 0) {
                          setCopySourceTerm(terms[0]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Изберете година" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set(otherPeriods.map(p => p.year))].sort().reverse().map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {copySourceYear && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Срок</label>
                      <Select 
                        value={copySourceTerm.toString()} 
                        onValueChange={(v) => setCopySourceTerm(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {copySourceTerms
                            .filter(term => !(copySourceYear === currentPeriod.year && term === currentPeriod.term))
                            .map((term) => (
                              <SelectItem key={term} value={term.toString()}>
                                {term === 1 ? "I срок" : "II срок"}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Checkbox for including assignments */}
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeAssignments" 
                      checked={includeAssignments}
                      onCheckedChange={(checked) => setIncludeAssignments(checked === true)}
                    />
                    <label 
                      htmlFor="includeAssignments" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Копирай и дежурствата
                    </label>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Учителите, които вече съществуват в текущия период, няма да бъдат дублирани.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
                      Отказ
                    </Button>
                    <Button 
                      onClick={handleCopyTeachers} 
                      disabled={isCopying || !copySourceYear}
                    >
                      {isCopying ? "Копиране..." : "Копирай"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete period */}
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