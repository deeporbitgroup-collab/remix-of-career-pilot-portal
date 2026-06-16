// The CRM tables/views aren't in the generated Database types, so we reuse the
// authenticated supabase client through an untyped view for crm_* access.
// (Same session/auth — just without compile-time table typing.)
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export const crmDb = supabase as unknown as SupabaseClient;

// Invoke a CRM edge function with the current admin session.
export async function crmInvoke<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}
