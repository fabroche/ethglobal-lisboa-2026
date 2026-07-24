import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";

/**
 * Cliente Supabase para el navegador (componentes `"use client"`).
 * Usa la anon key (segura para el cliente); el acceso lo restringe RLS.
 */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
