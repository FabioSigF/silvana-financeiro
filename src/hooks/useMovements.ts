"use client";

import { useState, useEffect, useCallback } from "react";
import { movementsService } from "@/services/movements.service";
import type { Movement } from "@/types";

export function useMovements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await movementsService.getAll();
      setMovements(data);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar movimentações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (movement: Omit<Movement, "id" | "created_at">) => {
      const newItem = await movementsService.create(movement);
      setMovements((prev) => [newItem, ...prev]);
      return newItem;
    },
    []
  );

  const update = useCallback(
    async (id: string, movement: Partial<Omit<Movement, "id" | "created_at">>) => {
      const updated = await movementsService.update(id, movement);
      setMovements((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await movementsService.delete(id);
    setMovements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const createBatch = useCallback(
    async (items: Omit<Movement, "id" | "created_at">[]) => {
      const created = await movementsService.createBatch(items);
      setMovements((prev) => [...created, ...prev]);
      return created;
    },
    []
  );

  return {
    movements,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
    createBatch,
  };
}
