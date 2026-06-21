"use client";

import { useState, useEffect, useCallback } from "react";
import { movementsService } from "@/services/movements.service";
import type { Movement } from "@/types";

export function useMovements(initialParams?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (params?: {
    page: number;
    pageSize: number;
    search?: string;
    type?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      if (params) {
        const { data, count } = await movementsService.getPaginated(params);
        setMovements(data);
        setTotalCount(count);
      } else {
        const data = await movementsService.getAll();
        setMovements(data);
        setTotalCount(data.length);
      }
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar movimentações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialParams) {
      load({
        page: initialParams.page ?? 1,
        pageSize: initialParams.pageSize ?? 10,
        search: initialParams.search,
        type: initialParams.type,
        category: initialParams.category,
        startDate: initialParams.startDate,
        endDate: initialParams.endDate,
      });
    } else {
      load();
    }
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
    totalCount,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
    createBatch,
  };
}
