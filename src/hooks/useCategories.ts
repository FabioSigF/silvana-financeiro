"use client";

import { useState, useEffect, useCallback } from "react";
import { categoriesService } from "@/services/categories.service";
import type { Category } from "@/types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (category: Omit<Category, "id" | "created_at" | "user_id">) => {
      const newItem = await categoriesService.create(category);
      setCategories((prev) => [...prev, newItem]);
      return newItem;
    },
    []
  );

  const update = useCallback(
    async (id: string, category: Partial<Omit<Category, "id" | "created_at" | "user_id">>) => {
      const updated = await categoriesService.update(id, category);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string, name: string) => {
    const result = await categoriesService.deleteOrDeactivate(id, name);
    if (result.action === 'deleted') {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      // Deactivated: updates local state
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active: false } : c)));
    }
    return result;
  }, []);

  return {
    categories,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
  };
}
