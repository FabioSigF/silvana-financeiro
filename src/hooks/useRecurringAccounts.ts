"use client";

import { useState, useEffect, useCallback } from "react";
import { recurringService } from "@/services/recurring.service";
import type { RecurringAccount } from "@/types";

export function useRecurringAccounts() {
  const [recurringAccounts, setRecurringAccounts] = useState<RecurringAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recurringService.getAll();
      setRecurringAccounts(data);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar contas recorrentes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (account: Omit<RecurringAccount, "id" | "created_at" | "updated_at" | "user_id">) => {
      const newItem = await recurringService.create(account);
      setRecurringAccounts((prev) => [...prev, newItem]);
      return newItem;
    },
    []
  );

  const update = useCallback(
    async (id: string, account: Partial<Omit<RecurringAccount, "id" | "created_at" | "updated_at" | "user_id">>) => {
      const updated = await recurringService.update(id, account);
      setRecurringAccounts((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await recurringService.delete(id);
    setRecurringAccounts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    recurringAccounts,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
  };
}
