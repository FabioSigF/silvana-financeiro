import { getSupabaseClient } from "@/lib/supabase/client";
import type { UploadRecord } from "@/types";

export const uploadsService = {
  /**
   * Faz upload de um arquivo de imagem para o Supabase Storage.
   * Retorna a URL pública e o path interno do arquivo.
   */
  async uploadImage(
    file: File
  ): Promise<{ url: string; path: string }> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}.${ext}`;
    const storagePath = `${userData.user.id}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(storagePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(storagePath);

    return { url: urlData.publicUrl, path: storagePath };
  },

  /**
   * Registra um upload no banco de dados com status inicial.
   */
  async createRecord(params: {
    image_url: string;
    storage_path?: string;
    ocr_text?: string;
    processing_status?: UploadRecord["processing_status"];
  }): Promise<UploadRecord> {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("uploads")
      .insert({
        user_id: userData.user.id,
        image_url: params.image_url,
        storage_path: params.storage_path ?? null,
        ocr_text: params.ocr_text ?? null,
        processing_status: params.processing_status ?? "completed",
      })
      .select()
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      image_url: row.image_url,
      ocr_text: row.ocr_text ?? undefined,
      processing_status: row.processing_status as UploadRecord["processing_status"],
      created_at: row.created_at,
    };
  },

  /**
   * Busca todos os registros de upload do usuário.
   */
  async getAll(): Promise<UploadRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      image_url: row.image_url,
      ocr_text: row.ocr_text ?? undefined,
      processing_status: row.processing_status as UploadRecord["processing_status"],
      created_at: row.created_at,
    }));
  },
};
