import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton para uso client-side
// Tipado como any para contornar limitações de inferência de tipos
// na cadeia de chamadas do Supabase com o padrão singleton
let client: any = null;

export function getSupabaseClient(): any {
  if (!client) {
    client = createClient();
  }
  return client;
}
