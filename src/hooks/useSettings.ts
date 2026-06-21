"use client";

import { useState, useEffect, useCallback } from "react";
import { settingsService, type AppSettings } from "@/services/settings.service";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    companyName: "Silvana Uniformes",
    logoUrl: "",
    userName: "",
    userEmail: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsService.get();
      setSettings(data);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (newSettings: Partial<AppSettings>) => {
    setSaving(true);
    try {
      await settingsService.save(newSettings);
      setSettings((prev) => ({ ...prev, ...newSettings }));
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    settings,
    setSettings,
    loading,
    saving,
    error,
    save,
  };
}
