import React, { useState, useEffect } from "react";
import { Users, Plus, Trash2, Shield, ShieldCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { 
  UserProfile, 
  getAllAdmins, 
  createAdminUser, 
  updateAdminPermissions, 
  deleteAdmin 
} from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

export function AdminUsersPanel() {
  const { user: currentUser, refreshUser } = useAuth();
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New admin form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newCanSchedule, setNewCanSchedule] = useState(true);
  const [newCanSettings, setNewCanSettings] = useState(false);
  const [newCanBroadcasts, setNewCanBroadcasts] = useState(false);

  const fetchAdmins = async () => {
    setIsLoading(true);
    const data = await getAllAdmins();
    setAdmins(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) {
      toast.error("Имейл и парола са задължителни");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Паролата трябва да е поне 6 символа");
      return;
    }

    setIsCreating(true);
    const result = await createAdminUser(newEmail, newPassword, newDisplayName, {
      canManageSchedule: newCanSchedule,
      canManageSettings: newCanSettings,
      canSendBroadcasts: newCanBroadcasts,
    });
    setIsCreating(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Администраторът е създаден успешно");
    setIsCreateOpen(false);
    setNewEmail("");
    setNewPassword("");
    setNewDisplayName("");
    setNewCanSchedule(true);
    setNewCanSettings(false);
    setNewCanBroadcasts(false);
    fetchAdmins();
  };

  const handleUpdatePermissions = async (
    admin: UserProfile,
    permissions: { canManageSchedule: boolean; canManageSettings: boolean; canSendBroadcasts: boolean }
  ) => {
    const result = await updateAdminPermissions(admin.id, permissions);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Правата са обновени");
    fetchAdmins();
  };

  const handleDelete = async (admin: UserProfile) => {
    const result = await deleteAdmin(admin.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Администраторът е изтрит");
    fetchAdmins();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Управлявайте администраторските акаунти и техните права.
        </p>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Нов администратор
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Създаване на нов администратор</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">Имейл</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Парола</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Мин. 6 символа"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Име (по желание)</Label>
                <Input
                  id="new-name"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Име Фамилия"
                />
              </div>
              <div className="space-y-3">
                <Label>Права</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="perm-schedule"
                    checked={newCanSchedule}
                    onCheckedChange={(c) => setNewCanSchedule(!!c)}
                  />
                  <label htmlFor="perm-schedule" className="text-sm cursor-pointer">
                    Управление на графика
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="perm-settings"
                    checked={newCanSettings}
                    onCheckedChange={(c) => setNewCanSettings(!!c)}
                  />
                  <label htmlFor="perm-settings" className="text-sm cursor-pointer">
                    Настройки на приложението
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="perm-broadcasts"
                    checked={newCanBroadcasts}
                    onCheckedChange={(c) => setNewCanBroadcasts(!!c)}
                  />
                  <label htmlFor="perm-broadcasts" className="text-sm cursor-pointer">
                    Изпращане на съобщения
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Отказ
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Създаване..." : "Създай"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Зареждане...</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground">Няма администратори.</p>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <AdminUserRow
              key={admin.id}
              admin={admin}
              isCurrent={admin.id === currentUser?.id}
              onUpdatePermissions={handleUpdatePermissions}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminUserRow({
  admin,
  isCurrent,
  onUpdatePermissions,
  onDelete,
}: {
  admin: UserProfile;
  isCurrent: boolean;
  onUpdatePermissions: (admin: UserProfile, perms: any) => Promise<void>;
  onDelete: (admin: UserProfile) => Promise<void>;
}) {
  const [canSchedule, setCanSchedule] = useState(admin.can_manage_schedule);
  const [canSettings, setCanSettings] = useState(admin.can_manage_settings);
  const [canBroadcasts, setCanBroadcasts] = useState(admin.can_send_broadcasts);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      canSchedule !== admin.can_manage_schedule ||
      canSettings !== admin.can_manage_settings ||
      canBroadcasts !== admin.can_send_broadcasts;
    setHasChanges(changed);
  }, [canSchedule, canSettings, canBroadcasts, admin]);

  const handleSave = () => {
    onUpdatePermissions(admin, {
      canManageSchedule: canSchedule,
      canManageSettings: canSettings,
      canSendBroadcasts: canBroadcasts,
    });
    setHasChanges(false);
  };

  const isSuperAdmin = admin.role === "super_admin";

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <ShieldCheck className="w-4 h-4 text-primary" />
          ) : (
            <Shield className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-sm">
              {admin.display_name || admin.email}
              {isCurrent && <span className="text-muted-foreground ml-2">(Вие)</span>}
            </p>
            {admin.display_name && (
              <p className="text-xs text-muted-foreground">{admin.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <span className="text-xs text-primary font-medium">Главен админ</span>
          ) : (
            <>
              {hasChanges && (
                <Button size="sm" variant="outline" onClick={handleSave} className="h-7 gap-1">
                  <Save className="w-3 h-3" />
                  Запази
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Изтриване на администратор</AlertDialogTitle>
                    <AlertDialogDescription>
                      Сигурни ли сте, че искате да изтриете {admin.display_name || admin.email}? Това действие е необратимо.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отказ</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(admin)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Изтрий
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="flex flex-wrap gap-4 text-xs mt-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={canSchedule}
              onCheckedChange={(c) => setCanSchedule(!!c)}
            />
            График
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={canSettings}
              onCheckedChange={(c) => setCanSettings(!!c)}
            />
            Настройки
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={canBroadcasts}
              onCheckedChange={(c) => setCanBroadcasts(!!c)}
            />
            Съобщения
          </label>
        </div>
      )}
    </div>
  );
}
