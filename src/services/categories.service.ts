import { getSupabaseClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

export const categoriesService = {
  /**
   * Busca todas as categorias visíveis para o usuário (globais + do próprio usuário).
   */
  async getAll(): Promise<Category[]> {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      active: row.active,
      created_at: row.created_at,
    }));
  },

  /**
   * Busca apenas as categorias ativas visíveis para o usuário.
   */
  async getActive(): Promise<Category[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      active: row.active,
      created_at: row.created_at,
    }));
  },

  /**
   * Cria uma nova categoria customizada.
   */
  async create(category: Omit<Category, "id" | "created_at" | "user_id">): Promise<Category> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userData.user.id,
        name: category.name,
        color: category.color,
        active: category.active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      active: row.active,
      created_at: row.created_at,
    };
  },

  /**
   * Atualiza uma categoria existente.
   */
  async update(id: string, category: Partial<Omit<Category, "id" | "created_at" | "user_id">>): Promise<Category> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: category.name,
        color: category.color,
        active: category.active,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      active: row.active,
      created_at: row.created_at,
    };
  },

  /**
   * Exclui ou desativa uma categoria.
   * Se a categoria estiver em uso por alguma movimentação ou conta recorrente, 
   * ela será apenas desativada (active = false). Caso contrário, será excluída.
   */
  async deleteOrDeactivate(id: string, name: string): Promise<{ action: 'deleted' | 'deactivated' }> {
    const supabase = getSupabaseClient();
    
    // 1. Verifica se está em uso em movements (busca por string de nome da categoria)
    const { count: movementsCount, error: movementsErr } = await supabase
      .from("movements")
      .select("*", { count: "exact", head: true })
      .eq("category", name);
      
    if (movementsErr) throw movementsErr;

    // 2. Verifica se está em uso em recurring_accounts (busca por ID)
    const { count: recurringCount, error: recurringErr } = await supabase
      .from("recurring_accounts")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id);

    if (recurringErr) throw recurringErr;

    const isInUse = (movementsCount ?? 0) > 0 || (recurringCount ?? 0) > 0;

    if (isInUse) {
      // Em uso: desativa
      await supabase
        .from("categories")
        .update({ active: false })
        .eq("id", id);
      return { action: 'deactivated' };
    } else {
      // Fora de uso: exclui fisicamente
      const { error: deleteErr } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      if (deleteErr) throw deleteErr;
      return { action: 'deleted' };
    }
  },
};
