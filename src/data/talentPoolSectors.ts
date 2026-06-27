/** Canonical company sectors — used in company registration, profile, admin, and student filters. */
export const TALENT_POOL_COMPANY_SECTORS = [
  "Consulting",
  "Finance",
  "Technology",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Education",
  "Energy",
  "Real Estate",
  "Telecommunications",
  "Transportation",
  "Fashion",
  "Media & Entertainment",
  "Legal",
  "Marketing",
  "Altro",
] as const;

export type TalentPoolCompanySector = (typeof TALENT_POOL_COMPANY_SECTORS)[number];

/** Unique non-empty sector values from loaded company profiles (includes admin free-text). */
export function sectorsFromCompanies(
  companies: Array<{ sector?: string | null }>
): string[] {
  const seen = new Set<string>();
  for (const c of companies) {
    const s = c.sector?.trim();
    if (s) seen.add(s);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
