import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Weekday,
  WEEKDAY_TO_BG,
  UnavailabilityEntry,
} from "@/hooks/useUnavailability";

const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName: string;
  entries: UnavailabilityEntry[];
  onAddWeekday: (teacherId: string, weekday: Weekday, note?: string) => Promise<boolean>;
  onAddDate: (teacherId: string, date: string, note?: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

export function TeacherUnavailabilityDialog({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  entries,
  onAddWeekday,
  onAddDate,
  onRemove,
}: Props) {
  const [note, setNote] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);

  const weekdayEntries = entries.filter((e) => e.weekday);
  const dateEntries = entries
    .filter((e) => e.specific_date)
    .sort((a, b) => (a.specific_date! < b.specific_date! ? -1 : 1));

  const hasWeekday = (wd: Weekday) =>
    weekdayEntries.find((e) => e.weekday === wd);

  const toggleWeekday = async (wd: Weekday) => {
    const existing = hasWeekday(wd);
    if (existing) {
      const ok = await onRemove(existing.id);
      if (!ok) toast.error("Грешка при премахване");
    } else {
      const ok = await onAddWeekday(teacherId, wd, note.trim() || undefined);
      if (!ok) toast.error("Грешка при добавяне");
    }
  };

  const handleAddDate = async () => {
    if (!selectedDate) return;
    const iso = format(selectedDate, "yyyy-MM-dd");
    if (dateEntries.some((e) => e.specific_date === iso)) {
      toast.error("Тази дата вече е добавена");
      return;
    }
    const ok = await onAddDate(teacherId, iso, note.trim() || undefined);
    if (ok) {
      setSelectedDate(undefined);
      setPickerOpen(false);
    } else {
      toast.error("Грешка при добавяне");
    }
  };

  const formatDateSafe = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Достъпност: {teacherName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label className="text-sm">Бележка (по желание)</Label>
            <Input
              placeholder="напр. отпуск, болничен..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Прилага се само за следващия добавен запис.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Недостъпни дни от седмицата
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {WEEKDAYS.map((wd) => {
                const active = !!hasWeekday(wd);
                return (
                  <label
                    key={wd}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors",
                      active
                        ? "border-destructive bg-destructive/10"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => toggleWeekday(wd)}
                    />
                    <span className="text-sm">{WEEKDAY_TO_BG[wd]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Конкретни дати</Label>
            <div className="flex gap-2">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "dd.MM.yyyy")
                      : "Избери дата"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Button
                onClick={handleAddDate}
                disabled={!selectedDate}
                size="icon"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {dateEntries.length > 0 ? (
              <ul className="space-y-1 mt-2">
                {dateEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between p-2 rounded-md border bg-muted/40 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {formatDateSafe(e.specific_date!)}
                      </span>
                      {e.note && (
                        <span className="text-muted-foreground ml-2">
                          — {e.note}
                        </span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onRemove(e.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Няма добавени конкретни дати.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Затвори
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
