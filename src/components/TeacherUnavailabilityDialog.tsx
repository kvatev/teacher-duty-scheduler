import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { bg } from "date-fns/locale";
import { CalendarIcon, Plus, X, CalendarOff, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  const [togglingDay, setTogglingDay] = useState<Weekday | null>(null);

  const weekdayEntries = entries.filter((e) => e.weekday);
  const dateEntries = entries
    .filter((e) => e.specific_date)
    .sort((a, b) => (a.specific_date! < b.specific_date! ? -1 : 1));

  const getWeekdayEntry = (wd: Weekday) =>
    weekdayEntries.find((e) => e.weekday === wd);

  const toggleWeekday = async (wd: Weekday) => {
    if (togglingDay === wd) return;
    setTogglingDay(wd);

    try {
      const existing = getWeekdayEntry(wd);
      const bgDay = WEEKDAY_TO_BG[wd];

      if (existing) {
        const ok = await onRemove(existing.id);
        if (ok) {
          toast.success(`${teacherName} е маркиран като СВОБОДЕН за ${bgDay}`);
        } else {
          toast.error("Грешка при запазване");
        }
      } else {
        const trimmedNote = note.trim() || undefined;
        const ok = await onAddWeekday(teacherId, wd, trimmedNote);
        if (ok) {
          const noteSuffix = trimmedNote ? ` (${trimmedNote})` : "";
          toast.success(`${teacherName} НЕ МОЖЕ да бъде дежурен в ${bgDay}${noteSuffix}`);
          setNote("");
        } else {
          toast.error("Грешка при запазване");
        }
      }
    } finally {
      setTogglingDay(null);
    }
  };

  const handleAddDate = async () => {
    if (!selectedDate) return;
    const iso = format(selectedDate, "yyyy-MM-dd");
    if (dateEntries.some((e) => e.specific_date === iso)) {
      toast.error("Тази дата вече е отбелязана в списъка");
      return;
    }
    const trimmedNote = note.trim() || undefined;
    const ok = await onAddDate(teacherId, iso, trimmedNote);
    if (ok) {
      toast.success(`Добавена е дата на отсъствие: ${formatDateDisplay(iso)}`);
      setSelectedDate(undefined);
      setPickerOpen(false);
      setNote("");
    } else {
      toast.error("Грешка при запазване на датата");
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const parsed = parseISO(dateStr);
      if (!isNaN(parsed.getTime())) {
        const formattedDate = format(parsed, "dd.MM.yyyy");
        const weekdayName = format(parsed, "EEEE", { locale: bg });
        const capitalizedWeekday =
          weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);
        return `${formattedDate} (${capitalizedWeekday})`;
      }
    } catch {
      // fallback
    }
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  const unavailableWeekdaysCount = weekdayEntries.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground font-bold">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CalendarOff className="w-4 h-4" />
            </div>
            <span>Достъпност за дежурства: {teacherName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Посочете в кои дни от седмицата или конкретни дати учителят <strong>НЕ МОЖЕ</strong> да бъде дежурен.
            Системата автоматично ще съобразява тези настройки при разпределение.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Note Input */}
          <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border">
            <Label htmlFor="unavail-note" className="text-xs sm:text-sm font-semibold text-foreground">
              Бележка / Причина (по желание)
            </Label>
            <Input
              id="unavail-note"
              placeholder="напр. методически ден, свободен по разписание, отпуск..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={100}
              className="h-9 text-xs sm:text-sm bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              💡 Ако попълните бележка преди да изберете ден, тя ще се запази към него.
            </p>
          </div>

          {/* Weekday Toggles */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm font-bold text-foreground">
                Дни от седмицата
              </Label>
              <span className="text-xs text-muted-foreground">
                {unavailableWeekdaysCount > 0 ? (
                  <span className="text-destructive font-medium">
                    Недостъпен в {unavailableWeekdaysCount} {unavailableWeekdaysCount === 1 ? "ден" : "дни"}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Свободен през всички дни
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WEEKDAYS.map((wd) => {
                const entry = getWeekdayEntry(wd);
                const isUnavailable = !!entry;

                return (
                  <div
                    key={wd}
                    role="button"
                    tabIndex={0}
                    aria-label={`${WEEKDAY_TO_BG[wd]} - ${isUnavailable ? "недостъпен" : "свободен"}`}
                    onClick={() => toggleWeekday(wd)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleWeekday(wd);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2.5 p-3 rounded-xl border text-left transition-all duration-150 select-none shadow-xs cursor-pointer",
                      isUnavailable
                        ? "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15 ring-1 ring-destructive/30"
                        : "border-border/80 hover:bg-accent/60 hover:border-primary/40 text-foreground bg-card"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                          isUnavailable
                            ? "bg-destructive border-destructive text-destructive-foreground"
                            : "border-muted-foreground/40 bg-background"
                        )}
                      >
                        {isUnavailable && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold block leading-tight">
                          {WEEKDAY_TO_BG[wd]}
                        </span>
                        {entry?.note && (
                          <span className="text-[11px] text-destructive/90 block truncate mt-0.5 font-normal">
                            📝 {entry.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 tracking-wide",
                        isUnavailable
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isUnavailable ? "НЕ МОЖЕ" : "СВОБОДЕН"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specific Dates */}
          <div className="space-y-2.5 pt-1 border-t">
            <Label className="text-xs sm:text-sm font-bold text-foreground">
              Конкретни дати (напр. еднократен отпуск или болничен)
            </Label>
            <div className="flex gap-2">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-9 text-xs sm:text-sm",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "dd.MM.yyyy")
                      : "Изберете дата от календара..."}
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
                size="sm"
                className="h-9 px-3 gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Добави дата</span>
              </Button>
            </div>

            {dateEntries.length > 0 ? (
              <ul className="space-y-1.5 mt-2">
                {dateEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/30 text-xs sm:text-sm"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-semibold text-foreground">
                        {formatDateDisplay(e.specific_date!)}
                      </span>
                      {e.note && (
                        <span className="text-muted-foreground ml-2 truncate inline-block max-w-[200px] align-bottom">
                          — {e.note}
                        </span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => onRemove(e.id)}
                      title="Премахни датата"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Няма въведени конкретни извънредни дати.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              💾 Промените се запазват автоматично
            </span>
            <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
              Готово
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
