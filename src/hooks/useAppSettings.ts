import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AppSettings {
  header_title: string;
  header_subtitle: string;
  footer_note: string;
  admin_name: string;
  admin_email: string;
  pdf_school_name: string;
  pdf_school_info1: string;
  pdf_school_info2: string;
  pdf_director_name: string;
  pdf_schedule_description: string;
  location_1: string;
  location_2: string;
  location_3: string;
  location_4: string;
}

const DEFAULTS: AppSettings = {
  header_title: "График за дежурства",
  header_subtitle: 'СУ "Константин Петканов", град Бургас',
  footer_note: "*Забележка: 1 - дежури от 07:30-08:00 ч.; 2 - дежури от 08:00 до 08:40",
  admin_name: "Красимир Ватев",
  admin_email: "kvatev@outlook.com",
  pdf_school_name: 'СУ „КОНСТАНТИН ПЕТКАНОВ" – БУРГАС',
  pdf_school_info1: "гр. Бургас тел: 0876335444; тел:852-709; 854-704",
  pdf_school_info2: 'ж.к. „Меден рудник" e-mail: info-200232@edu.mon.bg',
  pdf_director_name: "ИВАЙЛО МАРКОВ",
  pdf_schedule_description: "за дежурство на учителите от прогимназиален и гимназиален етап",
  location_1: "Дежурни на III-ти етаж",
  location_2: "Дежурни на IV-ти етаж",
  location_3: "Училищен стол и пред кабинет по музика",
  location_4: "Главен дежурен – западен вход 07:30-08:40 ч.",
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value");

    if (error) {
      console.error("Error fetching settings:", error);
      return;
    }

    if (data) {
      const merged = { ...DEFAULTS };
      data.forEach((row) => {
        if (row.key in merged) {
          (merged as any)[row.key] = row.value;
        }
      });
      setSettings(merged);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    const { error } = await supabase
      .from("app_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (error) {
      console.error("Error updating setting:", error);
      toast.error("Грешка при запазване на настройката");
      return false;
    }

    setSettings((prev) => ({ ...prev, [key]: value }));
    return true;
  }, []);

  const updateMultipleSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const promises = Object.entries(updates).map(([key, value]) =>
      supabase
        .from("app_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key)
    );

    const results = await Promise.all(promises);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      toast.error("Грешка при запазване на някои настройки");
      return false;
    }

    setSettings((prev) => ({ ...prev, ...updates }));
    toast.success("Настройките са запазени успешно");
    return true;
  }, []);

  return { settings, isLoading, updateSetting, updateMultipleSettings, refetch: fetchSettings };
}
