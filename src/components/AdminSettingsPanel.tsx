import React, { useState, useEffect, useRef } from "react";
import { Settings, Save, X, Upload, Image, KeyRound, Megaphone, Users, Download, Database, RefreshCw, GraduationCap, Backpack, GitBranch, Copy, Check, CloudDownload, CloudUpload, Sparkles, FileCheck } from "lucide-react";
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

function SettingInput({ id, label, value = "", onChange }: { id: string; label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SettingTextarea({ id, label, value = "", onChange, rows = 2 }: { id: string; label: string; value?: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows} />
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
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPublishingCloud, setIsPublishingCloud] = useState(false);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{ connected: boolean; activeStorage: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setLogoPreview(settings.logo_url || "");
      localDB.checkCloudStatus().then((status) => {
        setCloudStatus(status);
      }).catch(() => {});
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

  const handleDownloadScheduleJson = () => {
    const data = localDB.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedule-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Свален е файл schedule-data.json! Заменете го в public/schedule-data.json и качете в GitHub.");
  };

  const handleCopyScheduleJson = async () => {
    try {
      const data = localDB.exportBackup();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      toast.success("Графикът (JSON) е копиран в клипборда! Можете да го поставите в чата или в GitHub.");
    } catch {
      toast.error("Неуспешно копиране в клипборда");
    }
  };

  const handleSyncFromGitHub = async () => {
    setIsSyncingGitHub(true);
    try {
      const updated = await localDB.syncFromPublishedSchedule(true);
      if (updated) {
        toast.success("Графикът беше успешно синхронизиран от GitHub!");
        const newSettings = localDB.getSettings();
        setDraft(newSettings);
        setLogoPreview(newSettings.logo_url || "");
      } else {
        toast.info("Вече разполагате с най-новия публикуван график от GitHub.");
      }
    } catch {
      toast.error("Грешка при синхронизация от GitHub");
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  const handlePublishToCloud = async () => {
    setIsPublishingCloud(true);
    try {
      const res = await localDB.publishToCloud();
      if (res.success) {
        toast.success(res.message || "Графикът е публикуван успешно в базата данни!");
        setCloudStatus((prev) => ({
          connected: true,
          activeStorage: res.storageType || prev?.activeStorage || "Vercel Cloud",
        }));
      } else {
        toast.error(res.message || "Грешка при публикуване в базата данни.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Грешка при комуникация със сървъра.");
    } finally {
      setIsPublishingCloud(false);
    }
  };

  const handleCheckCloudStatus = async () => {
    setIsCheckingCloud(true);
    try {
      const status = await localDB.checkCloudStatus();
      setCloudStatus(status);
      if (status.connected) {
        toast.success(`Връзката с базата данни е активна: ${status.activeStorage}`);
      } else {
        toast.info("Няма свързана Vercel база данни (активен е локален fallback режим).");
      }
    } catch {
      toast.error("Грешка при проверка на връзката с базата данни.");
    } finally {
      setIsCheckingCloud(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
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
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      toast.error("Грешка при четене на файла");
      setIsImporting(false);
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

  const handleResetToOfficial = () => {
    localDB.resetToOfficialSchedule();
    const newSettings = localDB.getSettings();
    setDraft(newSettings);
    setLogoPreview(newSettings.logo_url || "");
    toast.success("Официалният утвърден график от директора е зареден успешно!");
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
      <DialogContent className="w-[95vw] sm:w-[92vw] md:w-full md:max-w-2xl lg:max-w-3xl max-h-[90dvh] sm:max-h-[85vh] p-0 gap-0 flex flex-col rounded-2xl sm:rounded-xl overflow-hidden shadow-2xl border bg-background duration-200">
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b bg-muted/30 shrink-0 pr-12">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-foreground">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <span>Настройки на приложението</span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <Tabs defaultValue={defaultTab} className="flex flex-col flex-1 min-h-0">
          <div className="px-3 sm:px-6 py-2.5 border-b bg-muted/15 shrink-0">
            <TabsList className="flex flex-wrap items-center justify-start gap-1 sm:gap-1.5 p-1 bg-muted/60 rounded-xl h-auto w-full">
              {canSettings && (
                <>
                  <TabsTrigger value="general" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">Общи</TabsTrigger>
                  <TabsTrigger value="logo" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">Лого</TabsTrigger>
                  <TabsTrigger value="locations" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">Локации</TabsTrigger>
                  <TabsTrigger value="pdf" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">PDF</TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs">Контакти</TabsTrigger>
                  <TabsTrigger value="backup" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                    <Database className="w-3.5 h-3.5" />
                    Архив
                  </TabsTrigger>
                </>
              )}
              {canBroadcast && (
                <TabsTrigger value="broadcast" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <Megaphone className="w-3.5 h-3.5" />
                  Съобщения
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="users" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <Users className="w-3.5 h-3.5" />
                  Админи
                </TabsTrigger>
              )}
              <TabsTrigger value="security" className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <KeyRound className="w-3.5 h-3.5" />
                Парола
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 overscroll-contain">
            {canSettings && (
              <>
                <TabsContent value="general" className="space-y-4 mt-0">
                  <SettingInput id="header_title" label="Заглавие в хедъра" value={draft.header_title} onChange={(v) => updateDraft("header_title", v)} />
                  <SettingInput id="header_subtitle" label="Подзаглавие в хедъра" value={draft.header_subtitle} onChange={(v) => updateDraft("header_subtitle", v)} />
                  <SettingTextarea id="footer_note" label="Бележка във футъра" value={draft.footer_note} onChange={(v) => updateDraft("footer_note", v)} />
                  <SettingInput id="day_column_header" label="Заглавие на колоната за дни" value={draft.day_column_header} onChange={(v) => updateDraft("day_column_header", v)} />
                  <SettingTextarea id="tip_text" label="Съвет за администратора (показва се под графика)" value={draft.tip_text} onChange={(v) => updateDraft("tip_text", v)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SettingInput id="term_1_label" label="Етикет за I-ви срок" value={draft.term_1_label} onChange={(v) => updateDraft("term_1_label", v)} />
                    <SettingInput id="term_2_label" label="Етикет за II-ри срок" value={draft.term_2_label} onChange={(v) => updateDraft("term_2_label", v)} />
                  </div>
                </TabsContent>

                <TabsContent value="logo" className="space-y-4 mt-0">
                  <p className="text-sm text-muted-foreground">Качете ново лого на училището. То ще се показва в хедъра и в PDF документа.</p>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Преглед на лого" className="w-20 h-20 object-contain border rounded-md p-1 bg-white shrink-0" />
                    ) : (
                      <div className="w-20 h-20 border-2 border-dashed rounded-md flex items-center justify-center bg-muted shrink-0">
                        <Image className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-2 w-full sm:flex-1">
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
                        className="gap-2 w-full sm:w-auto"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploading ? "Качване..." : "Качи ново лого"}
                      </Button>
                      {logoPreview && (
                        <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive w-full sm:w-auto">
                          Премахни логото
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="locations" className="space-y-6 mt-0">
                  <p className="text-sm text-muted-foreground">Редактирайте имената на колоните (локациите) в графика за дежурства според етапа.</p>

                  <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span>Прогимназиален и гимназиален етап (V – XII клас)</span>
                    </div>
                    <SettingInput id="location_5" label="Локация 1 (Етаж 0)" value={draft.location_5} onChange={(v) => updateDraft("location_5", v)} />
                    <SettingInput id="location_1" label="Локация 2 (III-ти етаж)" value={draft.location_1} onChange={(v) => updateDraft("location_1", v)} />
                    <SettingInput id="location_2" label="Локация 3 (IV-ти етаж)" value={draft.location_2} onChange={(v) => updateDraft("location_2", v)} />
                    <SettingInput id="location_3" label="Локация 4 (Училищен стол)" value={draft.location_3} onChange={(v) => updateDraft("location_3", v)} />
                    <SettingInput id="location_4" label="Локация 5 (Главен дежурен – западен вход)" value={draft.location_4} onChange={(v) => updateDraft("location_4", v)} />
                  </div>

                  <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                      <Backpack className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Начален етап (I – IV клас)</span>
                    </div>
                    <SettingInput id="primary_location_1" label="Локация 1 (Параден вход)" value={draft.primary_location_1} onChange={(v) => updateDraft("primary_location_1", v)} />
                    <SettingInput id="primary_location_2" label="Локация 2 (I етаж)" value={draft.primary_location_2} onChange={(v) => updateDraft("primary_location_2", v)} />
                    <SettingInput id="primary_location_3" label="Локация 3 (II етаж)" value={draft.primary_location_3} onChange={(v) => updateDraft("primary_location_3", v)} />
                  </div>
                </TabsContent>

                <TabsContent value="pdf" className="space-y-4 mt-0">
                  <SettingInput id="pdf_school_name" label="Име на училището (PDF)" value={draft.pdf_school_name} onChange={(v) => updateDraft("pdf_school_name", v)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SettingInput id="pdf_school_info1" label="Адрес и телефони (ред 1)" value={draft.pdf_school_info1} onChange={(v) => updateDraft("pdf_school_info1", v)} />
                    <SettingInput id="pdf_school_info2" label="Адрес и имейл (ред 2)" value={draft.pdf_school_info2} onChange={(v) => updateDraft("pdf_school_info2", v)} />
                  </div>
                  <SettingInput id="pdf_director_name" label="Име на директора" value={draft.pdf_director_name} onChange={(v) => updateDraft("pdf_director_name", v)} />
                  <SettingTextarea id="pdf_schedule_description" label="Описание на графика за V – XII клас (PDF)" value={draft.pdf_schedule_description} onChange={(v) => updateDraft("pdf_schedule_description", v)} />
                  <SettingTextarea id="pdf_schedule_description_primary" label="Описание на графика за I – IV клас (PDF)" value={draft.pdf_schedule_description_primary} onChange={(v) => updateDraft("pdf_schedule_description_primary", v)} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SettingInput id="schedule_title" label="Заглавие на графика" value={draft.schedule_title} onChange={(v) => updateDraft("schedule_title", v)} />
                    <SettingInput id="approval_text" label="Текст за утвърждаване" value={draft.approval_text} onChange={(v) => updateDraft("approval_text", v)} />
                    <SettingInput id="approval_role" label="Длъжност" value={draft.approval_role} onChange={(v) => updateDraft("approval_role", v)} />
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SettingInput id="admin_name" label="Име на администратора" value={draft.admin_name} onChange={(v) => updateDraft("admin_name", v)} />
                    <SettingInput id="admin_email" label="Имейл за връзка" value={draft.admin_email} onChange={(v) => updateDraft("admin_email", v)} />
                  </div>
                </TabsContent>

                <TabsContent value="backup" className="space-y-6 mt-0">
                  {/* Vercel Cloud Database Sync Section */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                          <CloudUpload className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-foreground">Облачна база данни (Vercel)</h4>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cloudStatus?.connected ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'}`}>
                              {cloudStatus?.connected ? `🟢 ${cloudStatus.activeStorage}` : "🟡 Локален режим / Очаква Vercel Storage"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Моментално синхронизиране на графика към всички учители и устройства в реално време.
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCheckCloudStatus}
                        disabled={isCheckingCloud}
                        className="text-xs h-8 shrink-0 self-start sm:self-center"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isCheckingCloud ? "animate-spin" : ""}`} />
                        {isCheckingCloud ? "Проверка..." : "Тествай връзка"}
                      </Button>
                    </div>

                    <div className="p-3 bg-background/80 rounded-xl border space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        Как работи облачното синхронизиране:
                      </p>
                      <p>
                        Когато кликнете <strong>„Публикувай за всички (Vercel)“</strong>, всички промени по дежурствата и учителите се записват веднага в облака. Всички потребители на телефони, таблети и лаптопи автоматично получават обновения график за 1-2 секунди, без да е нужно сваляне на файлове или чакане на нов билд във Vercel!
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <Button
                        size="sm"
                        onClick={handlePublishToCloud}
                        disabled={isPublishingCloud}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <CloudUpload className="w-4 h-4" />
                        {isPublishingCloud ? "Публикуване в базата данни..." : "🚀 Публикувай за всички (Vercel)"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isSyncingGitHub}
                        onClick={handleSyncFromGitHub}
                        className="gap-1.5 w-full sm:w-auto text-xs text-muted-foreground hover:text-foreground"
                      >
                        <CloudDownload className="w-3.5 h-3.5" />
                        {isSyncingGitHub ? "Проверка..." : "Презареди от облака сега"}
                      </Button>
                    </div>

                    {localDB.getLastPublishedSync() && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Последна синхронизация: {new Date(localDB.getLastPublishedSync()!).toLocaleString("bg-BG")}
                      </p>
                    )}
                  </div>

                  {/* Secondary GitHub Publishing Section */}
                  <div className="p-4 rounded-xl border border-muted bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                        <GitBranch className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">Резервен метод: Публикуване през GitHub</h4>
                        <p className="text-[11px] text-muted-foreground">
                          Опционален вариант за съхранение на архив на файла директно в GitHub хранилището.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadScheduleJson}
                        className="gap-1.5 w-full sm:w-auto text-xs shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Свали schedule-data.json
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyScheduleJson}
                        className="gap-1.5 w-full sm:w-auto text-xs shadow-2xs"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? "Копирано!" : "Копирай JSON за GitHub"}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold">Сваляне на пълно резервно копие (Експорт)</h4>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      Запазете архив с дата на всички графици, списъци с учители, отсъствия и настройки в един JSON файл на вашия компютър.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleExportBackup} className="gap-2 w-full sm:w-auto">
                      <Download className="w-4 h-4" />
                      Свали пълен архив (JSON)
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold">Възстановяване от резервно копие (Импорт)</h4>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      Възстановете данните от предварително изтеглен JSON файл. Всички текущи данни ще бъдат заменени!
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
                      disabled={isImporting}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Upload className="w-4 h-4" />
                      {isImporting ? "Възстановяване..." : "Избери файл за възстановяване"}
                    </Button>
                  </div>

                  <div className="border-t pt-4 bg-primary/5 p-3 rounded-lg border border-primary/20">
                    <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      Официален утвърден график от директора (I срок 2026/2027)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      Презарежда всички 79 официални дежурства и 45 учители (вкл. Екатерина Зафирова) точно по утвърдения от директора график.
                    </p>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleResetToOfficial}
                      className="gap-2 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Зареди официалния график от директора
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-destructive">Възстановяване на начални настройки</h4>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      Изтрива всички текущи данни и възстановява първоначалните настройки и учители по подразбиране.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2 w-full sm:w-auto">
                          <RefreshCw className="w-4 h-4" />
                          Възстанови по подразбиране
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Сигурни ли сте?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Това действие ще изтрие всички промени, графици и въведени учители и ще възстанови началните примерни данни. Препоръчваме първо да свалите архив!
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto mt-0">Отказ</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetDefaults} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
                            Възстанови
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TabsContent>
              </>
            )}

            <TabsContent value="security" className="space-y-4 mt-0">
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 text-xs sm:text-sm text-foreground/80 flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Сменете паролата си за достъп до системата. Новата парола трябва да е поне 6 символа.</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_pass" className="text-xs sm:text-sm font-medium">Нова парола</Label>
                <PasswordInput id="new_pass" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Въведете нова парола" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_pass" className="text-xs sm:text-sm font-medium">Потвърдете новата парола</Label>
                <PasswordInput id="confirm_pass" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Повторете новата парола" />
              </div>
              <div className="pt-1">
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
                  className="gap-2 w-full sm:w-auto"
                >
                  <KeyRound className="w-4 h-4" />
                  {isChangingPass ? "Смяна..." : "Смени паролата"}
                </Button>
              </div>
            </TabsContent>

            {canBroadcast && (
              <TabsContent value="broadcast" className="mt-0">
                <AdminBroadcastPanel />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="users" className="mt-0">
                <AdminUsersPanel />
              </TabsContent>
            )}
          </div>

          <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground hidden sm:block">
              {canSettings ? "💡 Промените влизат в сила веднага след запазване" : ""}
            </div>
            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                className="flex-1 sm:flex-initial h-9 text-xs sm:text-sm"
              >
                <X className="w-4 h-4 mr-1.5" />
                {canSettings ? "Отказ" : "Затвори"}
              </Button>
              {canSettings && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 sm:flex-initial h-9 text-xs sm:text-sm"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {isSaving ? "Запазване..." : "Запази"}
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
