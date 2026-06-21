import { getSupabaseClient } from "@/lib/supabase/client";
import type { Movement } from "@/types";

export const movementsService = {
  /**
   * Busca todas as movimentações do usuário autenticado, ordenadas por data.
   */
  async getAll(): Promise<Movement[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      type: row.type as Movement["type"],
      description: row.description,
      amount: Number(row.amount),
      date: row.date,
      category: row.category,
      created_at: row.created_at,
    }));
  },

  /**
   * Cria uma nova movimentação.
   */
  async create(
    movement: Omit<Movement, "id" | "created_at">
  ): Promise<Movement> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("movements")
      .insert({
        user_id: userData.user.id,
        type: movement.type,
        description: movement.description,
        amount: movement.amount,
        date: movement.date,
        category: movement.category,
      })
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      type: row.type as Movement["type"],
      description: row.description,
      amount: Number(row.amount),
      date: row.date,
      category: row.category,
      created_at: row.created_at,
    };
  },

  /**
   * Atualiza uma movimentação existente.
   */
  async update(
    id: string,
    movement: Partial<Omit<Movement, "id" | "created_at">>
  ): Promise<Movement> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("movements")
      .update({
        type: movement.type,
        description: movement.description,
        amount: movement.amount,
        date: movement.date,
        category: movement.category,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      type: row.type as Movement["type"],
      description: row.description,
      amount: Number(row.amount),
      date: row.date,
      category: row.category,
      created_at: row.created_at,
    };
  },

  /**
   * Remove uma movimentação pelo ID.
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("movements")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Cria múltiplas movimentações de uma vez (importação em lote via OCR).
   */
  async createBatch(
    movements: Omit<Movement, "id" | "created_at">[]
  ): Promise<Movement[]> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const rows = movements.map((m) => ({
      user_id: userData.user!.id,
      type: m.type,
      description: m.description,
      amount: m.amount,
      date: m.date,
      category: m.category,
    }));

    const { data, error } = await supabase
      .from("movements")
      .insert(rows)
      .select();

    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      type: row.type as Movement["type"],
      description: row.description,
      amount: Number(row.amount),
      date: row.date,
      category: row.category,
      created_at: row.created_at,
    }));
  },

  /**
   * Busca movimentações paginadas e filtradas no Supabase.
   */
  async getPaginated(params: {
    page: number;
    pageSize: number;
    search?: string;
    type?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: Movement[]; count: number }> {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from("movements")
      .select("*", { count: "exact" });

    // Aplica filtros se existirem
    if (params.search) {
      query = query.or(`description.ilike.%${params.search}%,category.ilike.%${params.search}%`);
    }
    if (params.type && params.type !== "todos") {
      query = query.eq("type", params.type);
    }
    if (params.category && params.category !== "todos") {
      query = query.eq("category", params.category);
    }
    if (params.startDate) {
      query = query.gte("date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("date", params.endDate);
    }

    // Ordenação decrescente por data e criação
    query = query
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    // Calcula os índices da paginação no Supabase (inclusivo, 0-indexed)
    const from = (params.page - 1) * params.pageSize;
    const to = from + params.pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const mapped: Movement[] = ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      type: row.type as Movement["type"],
      description: row.description,
      amount: Number(row.amount),
      date: row.date,
      category: row.category,
      created_at: row.created_at,
    }));

    return {
      data: mapped,
      count: count ?? 0,
    };
  },
};
