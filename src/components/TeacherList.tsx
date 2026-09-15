import React, { useState } from "react";
import { Plus, Users, Shuffle, Search, CalendarOff, RotateCcw, Pencil, Check, X } from "lucide-react";
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

import { Teacher, SchoolStage } from "@/types/schedule";

interface TeacherListProps {
  teachers: Teacher[];
  counts: Record<string, number>;
  onAddTeacher: (name: string) => boolean | Promise<boolean>;
  onRemoveTeacher: (id: string) => void | Promise<void>;
  onRenameTeacher?: (id: string, newName: string) => boolean | Promise<boolean>;
  onAutoArrange?: () => void | Promise<void>;
  onClearSchedule?: () => Promise<boolean>;
  currentStage?: SchoolStage;
}

export function TeacherList({
  teachers,
  counts,
  onAddTeacher,
  onRemoveTeacher,
  onRenameTeacher,
  onAutoArrange,
  onClearSchedule,
  currentStage = "secondary",
}: TeacherListProps) {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const enableDrag = isAdmin && !isMobile;

  const [newTeacherName, setNewTeacherName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unavailTeacher, setUnavailTeacher] = useState<Teacher | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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

  const startEditing = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setEditingName(teacher.name);
  };

  const cancelEditing = () => {
    setEditingTeacherId(null);
    setEditingName("");
  };

  const confirmRename = async (teacherId: string) => {
    if (!editingName.trim()) {
      cancelEditing();
      return;
    }
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher && editingName.trim() === teacher.name) {
      cancelEditing();
      return;
    }
    if (onRenameTeacher) {
      const success = await onRenameTeacher(teacherId, editingName.trim());
      if (success) {
        toast.success(`Преименуван на "${editingName.trim()}"`);
      } else {
        toast.error("Учител с това име вече съществува!");
      }
    }
    cancelEditing();
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
    <div className="bg-card rounded-lg border shadow-sm flex flex-col h-[calc(100svh-160px)] lg:h-[calc(100svh-130px)]">
      <div className="p-4 border-b bg-table-header rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2 text-table-header-foreground">
          <Users className="w-5 h-5" />
          <h2 className="font-semibold text-sm sm:text-base">
            {currentStage === "primary" ? "Учители I – IV клас" : "Учители V – XII клас"}
          </h2>
          <span className="ml-auto text-xs sm:text-sm opacity-85 font-mono">
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
                  {/* Inline rename editor */}
                  {isAdmin && editingTeacherId === teacher.id ? (
                    <div className="flex items-center gap-1 bg-background border rounded-md px-2 py-1 shadow-sm">
                      <input
                        autoFocus
                        className="flex-1 min-w-0 text-sm bg-transparent outline-none"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename(teacher.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                      <button
                        onClick={() => confirmRename(teacher.id)}
                        className="text-green-600 hover:text-green-700 shrink-0 p-0.5 rounded"
                        title="Запази"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-muted-foreground hover:text-destructive shrink-0 p-0.5 rounded"
                        title="Отказ"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {isAdmin && onRenameTeacher && (
                        <button
                          onClick={() => startEditing(teacher)}
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
                          title="Преименувай учителя"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <TeacherBadge
                          id={teacher.id}
                          name={teacher.name}
                          count={counts[teacher.id] || 0}
                          draggable={enableDrag}
                          onDragStart={enableDrag ? (e) => handleDragStart(e, teacher) : undefined}
                          showRemove={isAdmin}
                          onRemove={() => onRemoveTeacher(teacher.id)}
                        />
                      </div>
                    </div>
                  )}
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

          {onClearSchedule && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs sm:text-sm font-medium"
                  title="Бързо изчистване на всички дежурства от графика"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Изчисти графика
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                    <RotateCcw className="w-5 h-5 text-amber-600" />
                    Изчистване на графика ({currentStage === "primary" ? "I – IV клас" : "V – XII клас"})
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Сигурни ли сте, че искате бързо да изчистите всички поставени дежурства за{" "}
                    <strong>{currentStage === "primary" ? "начален етап (I – IV клас)" : "прогимназиален/гимназиален етап (V – XII клас)"}</strong>?
                    <br /><br />
                    <span className="text-muted-foreground">
                      ℹ️ <strong>Учителите в списъка ще се запазят непокътнати.</strong> Изчистват се само попълнените дежурства в таблицата за този етап.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto mt-0">Отказ</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await onClearSchedule();
                    }}
                    className="bg-amber-600 text-white hover:bg-amber-700 w-full sm:w-auto"
                  >
                    Изчисти графика
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Добави учител
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full max-w-sm">
              <DialogHeader>
                <DialogTitle>
                  Добави учител ({currentStage === "primary" ? "Начален етап I – IV клас" : "V – XII клас"})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Име на учителя</label>
                  <Input
                    placeholder={
                      currentStage === "primary"
                        ? "напр. Мария Иванова (начален учител)"
                        : "напр. Иван Иванов"
                    }
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddTeacher();
                      }
                    }}
                  />
                </div>
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

