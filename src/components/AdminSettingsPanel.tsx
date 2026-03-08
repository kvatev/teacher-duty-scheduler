import React, { useState, useEffect } from "react";
import { Settings, Save, X } from "lucide-react";
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

interface AdminSettingsPanelProps {
  settings: AppSettings;
  onSave: (updates: Partial<AppSettings>) => Promise<boolean>;
}

export function AdminSettingsPanel({ settings, onSave }: AdminSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Общи</TabsTrigger>
            <TabsTrigger value="locations">Локации</TabsTrigger>
            <TabsTrigger value="pdf">PDF документ</TabsTrigger>
            <TabsTrigger value="contact">Контакти</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="header_title">Заглавие в хедъра</Label>
              <Input
                id="header_title"
                value={draft.header_title}
                onChange={(e) => updateDraft("header_title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="header_subtitle">Подзаглавие в хедъра</Label>
              <Input
                id="header_subtitle"
                value={draft.header_subtitle}
                onChange={(e) => updateDraft("header_subtitle", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer_note">Бележка във футъра</Label>
              <Textarea
                id="footer_note"
                value={draft.footer_note}
                onChange={(e) => updateDraft("footer_note", e.target.value)}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Редактирайте имената на колоните в графика за дежурства.</p>
            <div className="space-y-2">
              <Label htmlFor="location_1">Локация 1</Label>
              <Input
                id="location_1"
                value={draft.location_1}
                onChange={(e) => updateDraft("location_1", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_2">Локация 2</Label>
              <Input
                id="location_2"
                value={draft.location_2}
                onChange={(e) => updateDraft("location_2", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_3">Локация 3</Label>
              <Input
                id="location_3"
                value={draft.location_3}
                onChange={(e) => updateDraft("location_3", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_4">Локация 4 (дежурен с номерация)</Label>
              <Input
                id="location_4"
                value={draft.location_4}
                onChange={(e) => updateDraft("location_4", e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="pdf" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="pdf_school_name">Име на училището (PDF)</Label>
              <Input
                id="pdf_school_name"
                value={draft.pdf_school_name}
                onChange={(e) => updateDraft("pdf_school_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf_school_info1">Адрес и телефони (ред 1)</Label>
              <Input
                id="pdf_school_info1"
                value={draft.pdf_school_info1}
                onChange={(e) => updateDraft("pdf_school_info1", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf_school_info2">Адрес и имейл (ред 2)</Label>
              <Input
                id="pdf_school_info2"
                value={draft.pdf_school_info2}
                onChange={(e) => updateDraft("pdf_school_info2", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf_director_name">Име на директора</Label>
              <Input
                id="pdf_director_name"
                value={draft.pdf_director_name}
                onChange={(e) => updateDraft("pdf_director_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf_schedule_description">Описание на графика (PDF)</Label>
              <Textarea
                id="pdf_schedule_description"
                value={draft.pdf_schedule_description}
                onChange={(e) => updateDraft("pdf_schedule_description", e.target.value)}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="admin_name">Име на администратора</Label>
              <Input
                id="admin_name"
                value={draft.admin_name}
                onChange={(e) => updateDraft("admin_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_email">Имейл за връзка</Label>
              <Input
                id="admin_email"
                type="email"
                value={draft.admin_email}
                onChange={(e) => updateDraft("admin_email", e.target.value)}
              />
            </div>
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
