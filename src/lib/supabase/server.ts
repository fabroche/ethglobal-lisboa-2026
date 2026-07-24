import "@/lib/server-guard";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/config/env";

/**
 * Cliente Supabase para Server Components / Server Actions / Route Handlers.
 * Lee y escribe la sesión desde las cookies de la request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` desde un Server Component: se ignora (lo refresca el middleware).
          }
        },
      },
    },
  );
}
