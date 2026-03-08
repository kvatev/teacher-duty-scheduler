import React, { useState, useEffect, useRef } from "react";
import { Settings, Save, X, Upload, Image, KeyRound } from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { changeAdminPassword } from "@/lib/auth";

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
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPass, setCurrentPass] = useState("");
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Моля, изберете файл с изображение");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файлът е твърде голям (макс. 5MB)");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("school-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("school-assets")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setLogoPreview(publicUrl);
      updateDraft("logo_url", publicUrl);
      toast.success("Логото е качено успешно");
    } catch (err) {
      console.error("Logo upload error:", err);
      toast.error("Грешка при качване на логото");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview("");
    updateDraft("logo_url", "");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/80">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Настройки</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Настройки на приложението
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">Общи</TabsTrigger>
            <TabsTrigger value="logo">Лого</TabsTrigger>
            <TabsTrigger value="locations">Локации</TabsTrigger>
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="contact">Контакти</TabsTrigger>
          </TabsList>

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
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            <X className="w-4 h-4 mr-1" />
            Отказ
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? "Запазване..." : "Запази"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
