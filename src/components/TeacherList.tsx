import React, { useState } from "react";
import { Plus, Users, GripVertical } from "lucide-react";
import { Teacher } from "@/types/schedule";
import { TeacherBadge } from "./TeacherBadge";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onAddTeacher: (name: string) => void;
  onRemoveTeacher: (id: string) => void;
}

export function TeacherList({
  teachers,
  counts,
  onAddTeacher,
  onRemoveTeacher,
}: TeacherListProps) {
  const { isAdmin } = useAuth();
  const [newTeacherName, setNewTeacherName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddTeacher = () => {
    if (newTeacherName.trim()) {
      onAddTeacher(newTeacherName.trim());
      setNewTeacherName("");
      setIsDialogOpen(false);
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

  return (
    <div className="bg-card rounded-lg border shadow-sm h-full flex flex-col">
      <div className="p-4 border-b bg-table-header rounded-t-lg">
        <div className="flex items-center gap-2 text-table-header-foreground">
          <Users className="w-5 h-5" />
          <h2 className="font-semibold">Учители</h2>
          <span className="ml-auto text-sm opacity-80">
            ({teachers.length})
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin max-h-[60vh]">
        {sortedTeachers.map((teacher) => (
          <div key={teacher.id} className="flex items-center">
            <TeacherBadge
              id={teacher.id}
              name={teacher.name}
              count={counts[teacher.id] || 0}
              draggable={isAdmin}
              onDragStart={(e) => handleDragStart(e, teacher)}
              showRemove={isAdmin}
              onRemove={() => onRemoveTeacher(teacher.id)}
            />
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="p-3 border-t">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Добави учител
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Отказ
                  </Button>
                  <Button onClick={handleAddTeacher}>Добави</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
