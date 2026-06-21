import { getSupabaseClient } from "@/lib/supabase/client";
import type { RecurringAccount } from "@/types";

export const recurringService = {
  /**
   * Busca todas as contas recorrentes do usuário, ordenadas pelo dia do vencimento.
   */
  async getAll(): Promise<RecurringAccount[]> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("recurring_accounts")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("day_of_month", { ascending: true });

    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      amount: Number(row.amount),
      category_id: row.category_id,
      day_of_month: row.day_of_month,
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  /**
   * Cria uma nova conta recorrente.
   */
  async create(
    account: Omit<RecurringAccount, "id" | "created_at" | "updated_at" | "user_id">
  ): Promise<RecurringAccount> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("recurring_accounts")
      .insert({
        user_id: userData.user.id,
        description: account.description,
        amount: account.amount,
        category_id: account.category_id,
        day_of_month: account.day_of_month,
        active: account.active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      amount: Number(row.amount),
      category_id: row.category_id,
      day_of_month: row.day_of_month,
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  /**
   * Atualiza uma conta recorrente existente.
   */
  async update(
    id: string,
    account: Partial<Omit<RecurringAccount, "id" | "created_at" | "updated_at" | "user_id">>
  ): Promise<RecurringAccount> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("recurring_accounts")
      .update({
        description: account.description,
        amount: account.amount,
        category_id: account.category_id,
        day_of_month: account.day_of_month,
        active: account.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      amount: Number(row.amount),
      category_id: row.category_id,
      day_of_month: row.day_of_month,
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  /**
   * Remove uma conta recorrente pelo ID.
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("recurring_accounts")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
