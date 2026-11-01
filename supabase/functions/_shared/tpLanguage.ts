// Talent Pool email language helpers.
// Each Talent Pool student/company picks Italian or English on the site; the choice
// is stored in talent_pool_users.preferred_language ('en' | 'it'). Automatic emails
// resolve the RECIPIENT's language with these helpers.

export type TpLang = "en" | "it";

/** Italian is the product default: only an explicit 'en' → 'en', anything else → 'it'. */
export const DEFAULT_TP_LANG: TpLang = "it";
export const normalizeLang = (x: unknown): TpLang =>
  typeof x === "string" && x.trim().toLowerCase() === "en" ? "en" : "it";

/** Pick the string for the given language. */
export const pick = <T>(lang: TpLang, en: T, it: T): T => (lang === "it" ? it : en);

/**
 * Reads talent_pool_users.preferred_language by user id (preferred) or email.
 * Never throws: returns null when the user is missing, on any error, or when the
 * column does not exist yet (migration not applied).
 */
// deno-lint-ignore no-explicit-any
export async function getTpUserLanguage(
  supabase: any,
  { userId, email }: { userId?: string | null; email?: string | null }
): Promise<TpLang | null> {
  try {
    if (!supabase) return null;
    let query = supabase.from("talent_pool_users").select("preferred_language");
    if (userId) {
      query = query.eq("id", userId);
    } else if (email && email.trim()) {
      // Case-insensitive exact match (escape LIKE wildcards such as '_' in emails).
      const escaped = email.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
      query = query.ilike("email", escaped);
    } else {
      return null;
    }
    const { data, error } = await query.limit(1);
    if (error || !data || data.length === 0) return null;
    const value = data[0]?.preferred_language;
    if (value !== "it" && value !== "en") return null;
    return value;
  } catch (_err) {
    return null;
  }
}

/**
 * Batch version: one query for many user ids. Returns a Map id → language for the
 * users found (missing ids are simply absent — callers fall back to DEFAULT_TP_LANG). Never throws; empty map on error.
 */
// deno-lint-ignore no-explicit-any
export async function getTpUsersLanguages(supabase: any, userIds: string[]): Promise<Map<string, TpLang>> {
  const out = new Map<string, TpLang>();
  try {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (!supabase || ids.length === 0) return out;
    const { data, error } = await supabase
      .from("talent_pool_users")
      .select("id, preferred_language")
      .in("id", ids);
    if (error || !data) return out;
    for (const row of data as Array<{ id: string; preferred_language: string | null }>) {
      if (row.preferred_language === "it" || row.preferred_language === "en") {
        out.set(row.id, row.preferred_language);
      }
    }
  } catch (_err) {
    // ignore — fall back to defaults
  }
  return out;
}

/** Recipient language: DB value first, then the requester's body.language (only when the recipient is the requester), else Italian (default). */
export const resolveLang = (dbLang: TpLang | null, fallback?: unknown): TpLang =>
  dbLang ?? (fallback !== undefined && fallback !== null && fallback !== "" ? normalizeLang(fallback) : DEFAULT_TP_LANG);

/**
 * Language of an email recipient identified by user id and/or an address that may be
 * either the login email (talent_pool_users.email) or a company's notification address
 * (company_profiles.reference_email). Tries id → login email → reference_email.
 * Never throws; null when nothing is found.
 */
// deno-lint-ignore no-explicit-any
export async function getTpRecipientLanguage(
  supabase: any,
  { userId, email }: { userId?: string | null; email?: string | null }
): Promise<TpLang | null> {
  if (userId) {
    const byId = await getTpUserLanguage(supabase, { userId });
    if (byId) return byId;
  }
  if (!email || !email.trim()) return null;
  const byEmail = await getTpUserLanguage(supabase, { email });
  if (byEmail) return byEmail;
  try {
    const escaped = email.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data, error } = await supabase
      .from("company_profiles")
      .select("user_id")
      .ilike("reference_email", escaped)
      .limit(1);
    if (error || !data?.[0]?.user_id) return null;
    return await getTpUserLanguage(supabase, { userId: data[0].user_id });
  } catch (_err) {
    return null;
  }
}
