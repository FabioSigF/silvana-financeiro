import { getSupabaseClient } from "@/lib/supabase/client";

export interface AppSettings {
  companyName: string;
  logoUrl: string;
  userName: string;
  userEmail: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  companyName: "Silvana Uniformes",
  logoUrl: "",
  userName: "",
  userEmail: "",
};

export const settingsService = {
  /**
   * Busca as configurações do usuário autenticado.
   * Se não existirem ainda, retorna os valores padrão.
   */
  async get(): Promise<AppSettings> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return DEFAULT_SETTINGS;

    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", userData.user.id)
      .single();

    if (error || !data) {
      // Retorna defaults com e-mail do usuário autenticado
      return {
        ...DEFAULT_SETTINGS,
        userEmail: userData.user.email ?? "",
      };
    }

    const row = data as any;
    return {
      companyName: row.company_name,
      logoUrl: row.logo_url ?? "",
      userName: row.user_name,
      userEmail: userData.user.email ?? "",
    };
  },

  /**
   * Salva (upsert) as configurações do usuário.
   */
  async save(settings: Partial<AppSettings>): Promise<void> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          user_id: userData.user.id,
          company_name: settings.companyName ?? DEFAULT_SETTINGS.companyName,
          logo_url: settings.logoUrl ?? "",
          user_name: settings.userName ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) throw error;
  },
};
