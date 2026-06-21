import { getSupabaseClient } from "@/lib/supabase/client";
import type { AccountPayable } from "@/types";

export const accountsService = {
  /**
   * Busca todas as contas a pagar do usuário, ordenadas por data de vencimento.
   */
  async getAll(): Promise<AccountPayable[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("accounts_payable")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      due_date: row.due_date,
      status: row.status as AccountPayable["status"],
      created_at: row.created_at,
    }));
  },

  /**
   * Cria uma nova conta a pagar.
   */
  async create(
    account: Omit<AccountPayable, "id" | "created_at">
  ): Promise<AccountPayable> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("accounts_payable")
      .insert({
        user_id: userData.user.id,
        description: account.description,
        amount: account.amount,
        due_date: account.due_date,
        status: account.status,
      })
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      due_date: row.due_date,
      status: row.status as AccountPayable["status"],
      created_at: row.created_at,
    };
  },

  /**
   * Atualiza uma conta a pagar existente.
   */
  async update(
    id: string,
    account: Partial<Omit<AccountPayable, "id" | "created_at">>
  ): Promise<AccountPayable> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("accounts_payable")
      .update({
        description: account.description,
        amount: account.amount,
        due_date: account.due_date,
        status: account.status,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      due_date: row.due_date,
      status: row.status as AccountPayable["status"],
      created_at: row.created_at,
    };
  },

  /**
   * Remove uma conta a pagar pelo ID.
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("accounts_payable")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
