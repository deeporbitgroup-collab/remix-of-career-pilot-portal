/** Base64(UTF-8 bytes) — matches PostgreSQL talent_pool_hash_password / legacy btoa for ASCII. */
export function talentPoolPasswordHash(password: string): string {
  const trimmed = password.trim();
  const bytes = new TextEncoder().encode(trimmed);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function normalizeTalentPoolEmail(email: string): string {
  return email.trim().toLowerCase();
}
