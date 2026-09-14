import { useState, useEffect, useCallback } from "react";
import { localDB, DEFAULT_APP_SETTINGS } from "@/lib/localDB";
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
  primary_location_1: string;
  primary_location_2: string;
  primary_location_3: string;
  logo_url: string;
  schedule_title: string;
  approval_text: string;
  approval_role: string;
  day_column_header: string;
  tip_text: string;
  term_1_label: string;
  term_2_label: string;
  pdf_schedule_description_primary: string;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => localDB.getSettings());
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = useCallback(() => {
    const loaded = localDB.getSettings();
    setSettings(loaded);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
    const handleDbChange = () => fetchSettings();
    window.addEventListener("local-db-change", handleDbChange);
    return () => window.removeEventListener("local-db-change", handleDbChange);
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    const updated = localDB.saveSettings({ [key]: value });
    setSettings(updated);
    return true;
  }, []);

  const updateMultipleSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const updated = localDB.saveSettings(updates);
    setSettings(updated);
    toast.success("Настройките са запазени успешно");
    return true;
  }, []);

  return {
    settings,
    isLoading,
    updateSetting,
    updateMultipleSettings,
    refetch: fetchSettings,
  };
}
