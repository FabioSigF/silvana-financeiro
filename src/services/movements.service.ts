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
};
