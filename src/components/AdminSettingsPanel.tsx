import React, { useState, useEffect, useRef } from "react";
import { Settings, Save, X, Upload, Image, KeyRound, Megaphone, Users, Download, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AppSettings } from "@/hooks/useAppSettings";
import { localDB, FullDatabaseBackup } from "@/lib/localDB";
import { updateAdminPassword } from "@/lib/auth";
import { toast } from "sonner";
import { AdminBroadcastPanel } from "@/components/AdminBroadcastPanel";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";

interface AdminSettingsPanelProps {
  settings: AppSettings;
  onSave: (updates: Partial<AppSettings>) => Promise<boolean>;
}

function SettingInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SettingTextarea({ id, label, value, onChange, rows = 2 }: { id: string; label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
    </div>
  );
}

export function AdminSettingsPanel({ settings, onSave }: AdminSettingsPanelProps) {
  const { isSuperAdmin, permissions } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setLogoPreview(settings.logo_url || "");
    }
  }, [isOpen, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    const changes: Partial<AppSettings> = {};
    (Object.keys(draft) as (keyof AppSettings)[]).forEach((key) => {
      if (draft[key] !== settings[key]) {
        changes[key] = draft[key];
      }
    });

    if (Object.keys(changes).length === 0) {
      setIsOpen(false);
      setIsSaving(false);
      return;
    }

    const success = await onSave(changes);
    setIsSaving(false);
    if (success) {
      setIsOpen(false);
    }
  };

  const updateDraft = (key: keyof AppSettings, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Моля, изберете файл с изображение");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Файлът е твърде голям за локално съхранение (макс. 2MB)");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setLogoPreview(base64);
        updateDraft("logo_url", base64);
        toast.success("Логото е заредено успешно");
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast.error("Грешка при четене на изображението");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview("");
    updateDraft("logo_url", "");
  };

  const handleExportBackup = () => {
    const data = localDB.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-duty-scheduler-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Архивът е свален успешно");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (fileEvent) => {
      try {
        const parsed = JSON.parse(fileEvent.target?.result as string) as FullDatabaseBackup;
        const ok = localDB.importBackup(parsed);
        if (ok) {
          toast.success("Данните са възстановени успешно!");
          const newSettings = localDB.getSettings();
          setDraft(newSettings);
          setLogoPreview(newSettings.logo_url || "");
        } else {
          toast.error("Невалиден файл с архив");
        }
      } catch {
        toast.error("Грешка при четене на JSON файла");
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    localDB.resetToDefaults();
    const newSettings = localDB.getSettings();
    setDraft(newSettings);
    setLogoPreview(newSettings.logo_url || "");
    toast.success("Възстановени са началните училищни данни");
  };

  const canSettings = isSuperAdmin || permissions.canManageSettings;
  const canBroadcast = isSuperAdmin || permissions.canSendBroadcasts;
  const defaultTab = canSettings ? "general" : canBroadcast ? "broadcast" : isSuperAdmin ? "users" : "security";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/80">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Настройки</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full h-full rounded-none overflow-y-auto p-4 sm:p-6 max-w-none sm:max-w-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-90 data-[state=open]:zoom-in-90 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Настройки на приложението
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="mt-4">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="inline-flex w-max min-w-full gap-1">
              {canSettings && (
                <>
                  <TabsTrigger value="general" className="text-xs sm:text-sm px-2 sm:px-3">Общи</TabsTrigger>
                  <TabsTrigger value="logo" className="text-xs sm:text-sm px-2 sm:px-3">Лого</TabsTrigger>
                  <TabsTrigger value="locations" className="text-xs sm:text-sm px-2 sm:px-3">Локации</TabsTrigger>
                  <TabsTrigger value="pdf" className="text-xs sm:text-sm px-2 sm:px-3">PDF</TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs sm:text-sm px-2 sm:px-3">Контакти</TabsTrigger>
                  <TabsTrigger value="backup" className="text-xs sm:text-sm px-2 sm:px-3 gap-1">
                    <Database className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Архив</span>
                  </TabsTrigger>
                </>
              )}
              {canBroadcast && (
                <TabsTrigger value="broadcast" className="text-xs sm:text-sm px-2 sm:px-3 gap-1">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Съобщения</span>
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3 gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Админи</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="security" className="text-xs sm:text-sm px-2 sm:px-3">Парола</TabsTrigger>
            </TabsList>
          </div>

          {canSettings && (
            <>
              <TabsContent value="general" className="space-y-4 mt-4">
                <SettingInput id="header_title" label="Заглавие в хедъра" value={draft.header_title} onChange={(v) => updateDraft("header_title", v)} />
                <SettingInput id="header_subtitle" label="Подзаглавие в хедъра" value={draft.header_subtitle} onChange={(v) => updateDraft("header_subtitle", v)} />
                <SettingTextarea id="footer_note" label="Бележка във футъра" value={draft.footer_note} onChange={(v) => updateDraft("footer_note", v)} />
                <SettingInput id="day_column_header" label="Заглавие на колоната за дни" value={draft.day_column_header} onChange={(v) => updateDraft("day_column_header", v)} />
                <SettingTextarea id="tip_text" label="Съвет за администратора (показва се под графика)" value={draft.tip_text} onChange={(v) => updateDraft("tip_text", v)} />
                <SettingInput id="term_1_label" label="Етикет за I-ви срок" value={draft.term_1_label} onChange={(v) => updateDraft("term_1_label", v)} />
                <SettingInput id="term_2_label" label="Етикет за II-ри срок" value={draft.term_2_label} onChange={(v) => updateDraft("term_2_label", v)} />
              </TabsContent>

              <TabsContent value="logo" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">Качете ново лого на училището. То ще се показва в хедъра и в PDF документа.</p>
                
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Преглед на лого" className="w-20 h-20 object-contain border rounded-md p-1 bg-white" />
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed rounded-md flex items-center justify-center bg-muted">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {isUploading ? "Качване..." : "Качи ново лого"}
                    </Button>
                    {logoPreview && (
                      <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive">
                        Премахни логото
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="locations" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">Редактирайте имената на колоните в графика за дежурства.</p>
                <SettingInput id="location_1" label="Локация 1" value={draft.location_1} onChange={(v) => updateDraft("location_1", v)} />
                <SettingInput id="location_2" label="Локация 2" value={draft.location_2} onChange={(v) => updateDraft("location_2", v)} />
                <SettingInput id="location_3" label="Локация 3" value={draft.location_3} onChange={(v) => updateDraft("location_3", v)} />
                <SettingInput id="location_4" label="Локация 4 (дежурен с номерация)" value={draft.location_4} onChange={(v) => updateDraft("location_4", v)} />
              </TabsContent>

              <TabsContent value="pdf" className="space-y-4 mt-4">
                <SettingInput id="pdf_school_name" label="Име на училището (PDF)" value={draft.pdf_school_name} onChange={(v) => updateDraft("pdf_school_name", v)} />
                <SettingInput id="pdf_school_info1" label="Адрес и телефони (ред 1)" value={draft.pdf_school_info1} onChange={(v) => updateDraft("pdf_school_info1", v)} />
                <SettingInput id="pdf_school_info2" label="Адрес и имейл (ред 2)" value={draft.pdf_school_info2} onChange={(v) => updateDraft("pdf_school_info2", v)} />
                <SettingInput id="pdf_director_name" label="Име на директора" value={draft.pdf_director_name} onChange={(v) => updateDraft("pdf_director_name", v)} />
                <SettingTextarea id="pdf_schedule_description" label="Описание на графика (PDF)" value={draft.pdf_schedule_description} onChange={(v) => updateDraft("pdf_schedule_description", v)} />
                <SettingInput id="schedule_title" label="Заглавие на графика в PDF (напр. ГРАФИК)" value={draft.schedule_title} onChange={(v) => updateDraft("schedule_title", v)} />
                <SettingInput id="approval_text" label="Текст за утвърждаване (напр. УТВЪРЖДАВАМ:)" value={draft.approval_text} onChange={(v) => updateDraft("approval_text", v)} />
                <SettingInput id="approval_role" label="Длъжност (напр. ДИРЕКТОР)" value={draft.approval_role} onChange={(v) => updateDraft("approval_role", v)} />
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <SettingInput id="admin_name" label="Име на администратора" value={draft.admin_name} onChange={(v) => updateDraft("admin_name", v)} />
                <SettingInput id="admin_email" label="Имейл за връзка" value={draft.admin_email} onChange={(v) => updateDraft("admin_email", v)} />
              </TabsContent>

              <TabsContent value="backup" className="space-y-6 mt-4">
                <div>
                  <h4 className="text-sm font-semibold">Сваляне на резервно копие (Експорт)</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Запазете пълен архив на всички графици, списъци с учители, отсъствия и настройки в един JSON файл на вашия компютър.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleExportBackup} className="gap-2">
                    <Download className="w-4 h-4" />
                    Свали пълен архив (JSON)
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold">Възстановяване от резервно копие (Импорт)</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Заредете запазен JSON архив, за да прехвърлите данните си на друго устройство или браузър.
                  </p>
                  <input
                    ref={backupInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportBackup}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => backupInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Избери файл с архив (.json)
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-destructive">Възстановяване на първоначални данни</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Възстановява списъка с учители и стандартните настройки на училището.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Начални настройки
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Възстановяване на първоначалните данни?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Това ще върне учителите и настройките към началните училищни шаблони. Препоръчително е първо да свалите резервно копие (JSON).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отказ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetDefaults} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Възстанови
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TabsContent>
            </>
          )}

          <TabsContent value="security" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Сменете паролата си за достъп до системата.</p>
            <div className="space-y-2">
              <Label htmlFor="new_pass">Нова парола</Label>
              <PasswordInput id="new_pass" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_pass">Потвърдете новата парола</Label>
              <PasswordInput id="confirm_pass" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
            </div>
            <Button
              disabled={isChangingPass || !newPass || !confirmPass}
              onClick={async () => {
                if (newPass !== confirmPass) {
                  toast.error("Новата парола и потвърждението не съвпадат");
                  return;
                }
                if (newPass.length < 6) {
                  toast.error("Паролата трябва да е поне 6 символа");
                  return;
                }
                setIsChangingPass(true);
                const result = await updateAdminPassword(newPass);
                setIsChangingPass(false);
                if (!result.error) {
                  toast.success("Паролата е сменена успешно");
                  setNewPass("");
                  setConfirmPass("");
                } else {
                  toast.error(result.error || "Грешка при смяна на паролата");
                }
              }}
              className="gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {isChangingPass ? "Смяна..." : "Смени паролата"}
            </Button>
          </TabsContent>

          {canBroadcast && (
            <TabsContent value="broadcast" className="mt-4">
              <AdminBroadcastPanel />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="users" className="mt-4">
              <AdminUsersPanel />
            </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            <X className="w-4 h-4 mr-1" />
            {canSettings ? "Отказ" : "Затвори"}
          </Button>
          {canSettings && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? "Запазване..." : "Запази"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
