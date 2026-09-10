import React, { useState } from "react";
import { Plus, Users, Shuffle, Search, CalendarOff } from "lucide-react";
import { Teacher } from "@/types/schedule";
import { TeacherBadge } from "./TeacherBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUnavailability, WEEKDAY_TO_BG } from "@/hooks/useUnavailability";
import { TeacherUnavailabilityDialog } from "./TeacherUnavailabilityDialog";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TeacherListProps {
  teachers: Teacher[];
  counts: Record<string, number>;
  onAddTeacher: (name: string) => boolean | Promise<boolean>;
  onRemoveTeacher: (id: string) => void | Promise<void>;
  onAutoArrange?: () => void | Promise<void>;
}

export function TeacherList({
  teachers,
  counts,
  onAddTeacher,
  onRemoveTeacher,
  onAutoArrange,
}: TeacherListProps) {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const enableDrag = isAdmin && !isMobile;

  const [newTeacherName, setNewTeacherName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unavailTeacher, setUnavailTeacher] = useState<Teacher | null>(null);

  const {
    getTeacherEntries,
    addWeekday,
    addDate,
    remove: removeUnavail,
  } = useUnavailability();


  const handleAutoArrange = async () => {
    if (teachers.length === 0) {
      toast.error("Няма учители за разпределяне!");
      return;
    }
    await onAutoArrange?.();
    toast.success("Учителите са разпределени равномерно!");
  };

  const handleAddTeacher = async () => {
    if (newTeacherName.trim()) {
      const success = await onAddTeacher(newTeacherName.trim());
      if (success) {
        setNewTeacherName("");
        setIsDialogOpen(false);
        toast.success("Учителят е добавен успешно!");
      } else {
        toast.error("Учител с това име вече съществува!");
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, teacher: Teacher) => {
    // Important: if effectAllowed is "copy" but dropEffect is "move",
    // many browsers will block the drop entirely.
    e.dataTransfer.setData("teacherId", teacher.id);
    e.dataTransfer.setData("source", "list");
    e.dataTransfer.effectAllowed = "move";
  };

  const sortedTeachers = [...teachers].sort((a, b) => 
    a.name.localeCompare(b.name, "bg")
  );

  const filteredTeachers = sortedTeachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-card rounded-lg border shadow-sm flex flex-col h-[500px] lg:h-[600px]">
      <div className="p-4 border-b bg-table-header rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2 text-table-header-foreground">
          <Users className="w-5 h-5" />
          <h2 className="font-semibold">Учители</h2>
          <span className="ml-auto text-sm opacity-80">
            ({filteredTeachers.length}/{teachers.length})
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div className="p-3 border-b flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Търси учител..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto min-h-0 overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="p-3 space-y-2">
          {filteredTeachers.map((teacher) => {
            const teacherUnavail = getTeacherEntries(teacher.id);
            const weekdays = teacherUnavail
              .filter((e) => e.weekday && WEEKDAY_TO_BG[e.weekday])
              .map((e) => WEEKDAY_TO_BG[e.weekday!].slice(0, 2))
              .join(", ");
            return (
              <div key={teacher.id} className="flex items-start gap-2">
                {isAdmin && (
                  <div className="shrink-0 relative z-30 w-9 flex items-center justify-center pt-0.5">
                    <Button
                      size="icon"
                      variant="outline"
                      className={cn(
                        "h-8 w-8 shrink-0 relative z-50 transition-all",
                        teacherUnavail.length > 0
                          ? "bg-destructive/15 text-destructive border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/10 bg-background/80 backdrop-blur-sm"
                      )}
                      title={
                        teacherUnavail.length > 0
                          ? `Конфигурирана достъпност (${teacherUnavail.length} записа). Натиснете за редакция.`
                          : "Задай дни на достъпност/недостъпност"
                      }
                      onClick={() => setUnavailTeacher(teacher)}
                    >
                      <CalendarOff className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <TeacherBadge
                    id={teacher.id}
                    name={teacher.name}
                    count={counts[teacher.id] || 0}
                    draggable={enableDrag}
                    onDragStart={enableDrag ? (e) => handleDragStart(e, teacher) : undefined}
                    showRemove={isAdmin}
                    onRemove={() => onRemoveTeacher(teacher.id)}
                  />
                  {teacherUnavail.length > 0 && (
                    <p className="text-[10px] text-destructive/80 mt-0.5 ml-1 flex items-center gap-1">
                      <CalendarOff className="w-2.5 h-2.5" />
                      Не е свободен: {weekdays}
                      {teacherUnavail.some((e) => e.specific_date) &&
                        ` +${teacherUnavail.filter((e) => e.specific_date).length} дата(и)`}
                    </p>
                  )}
                </div>
              </div>
            );

          })}
          {filteredTeachers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Няма намерени учители
            </p>
          )}
        </div>
      </div>


      {isAdmin && (
        <div className="p-3 border-t space-y-2">
          <Button 
            variant="default" 
            className="w-full gap-2"
            onClick={handleAutoArrange}
          >
            <Shuffle className="w-4 h-4" />
            Автоматично разпределение
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Добави учител
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full max-w-sm">
              <DialogHeader>
                <DialogTitle>Добави нов учител</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Име на учителя"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTeacher();
                  }}
                />
                <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Отказ
                  </Button>
                  <Button onClick={handleAddTeacher} className="w-full sm:w-auto">Добави</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {unavailTeacher && (
        <TeacherUnavailabilityDialog
          open={!!unavailTeacher}
          onOpenChange={(o) => !o && setUnavailTeacher(null)}
          teacherId={unavailTeacher.id}
          teacherName={unavailTeacher.name}
          entries={getTeacherEntries(unavailTeacher.id)}
          onAddWeekday={addWeekday}
          onAddDate={addDate}
          onRemove={removeUnavail}
        />
      )}
    </div>
  );
}

