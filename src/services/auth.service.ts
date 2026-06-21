import { getSupabaseClient } from "@/lib/supabase/client";

export const authService = {
  /**
   * Realiza login com e-mail e senha via Supabase Auth.
   */
  async signIn(email: string, password: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },

  /**
   * Realiza logout do usuário atual.
   */
  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Envia e-mail de recuperação de senha.
   */
  async resetPassword(email: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  /**
   * Retorna o usuário autenticado atual (ou null).
   */
  async getUser() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  },

  /**
   * Verifica se há sessão ativa.
   */
  async getSession() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
};
