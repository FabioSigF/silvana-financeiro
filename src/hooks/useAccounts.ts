"use client";

import { useState, useEffect, useCallback } from "react";
import { accountsService } from "@/services/accounts.service";
import type { AccountPayable } from "@/types";

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountsService.getAll();
      setAccounts(data);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar contas a pagar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (account: Omit<AccountPayable, "id" | "created_at">) => {
      const newItem = await accountsService.create(account);
      setAccounts((prev) => [...prev, newItem].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      ));
      return newItem;
    },
    []
  );

  const update = useCallback(
    async (id: string, account: Partial<Omit<AccountPayable, "id" | "created_at">>) => {
      const updated = await accountsService.update(id, account);
      setAccounts((prev) =>
        prev
          .map((a) => (a.id === id ? updated : a))
          .sort(
            (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          )
      );
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await accountsService.delete(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    accounts,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
  };
}
