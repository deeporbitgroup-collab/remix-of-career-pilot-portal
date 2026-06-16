// Gmail payload parsing — direct port of client_tracker/gmail_client.py.
// Pure functions: header lookup, body decode, address parsing (RFC getaddresses
// equivalent that respects quoted display names), quote stripping, bulk/bot
// detection, and flattening a thread into normalized message rows.

const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com",
  "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "live.com",
]);

export interface GHeader { name: string; value: string }

export function header(headers: GHeader[], name: string): string {
  const lower = name.toLowerCase();
  for (const h of headers) if (h.name.toLowerCase() === lower) return h.value;
  return "";
}

function decodeB64Url(data: string): string {
  let s = data.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

// deno-lint-ignore no-explicit-any
export function decodeBody(payload: any): string {
  // deno-lint-ignore no-explicit-any
  function walk(part: any): string {
    const mime = part.mimeType ?? "";
    const data = part.body?.data;
    if (mime === "text/plain" && data) return decodeB64Url(data);
    let text = "";
    for (const sub of part.parts ?? []) text += walk(sub);
    if (!text && mime === "text/html" && data) {
      text = decodeB64Url(data).replace(/<[^>]+>/g, " ");
    }
    return text;
  }
  return walk(payload).trim();
}

// RFC 2822 getaddresses equivalent: split a header into [displayName, addr]
// pairs, honoring commas inside quoted display names, e.g.
//   "Bonizzi, Rosangela" <rosangela.bonizzi@cbreim.com>, other@x.com
export function getAddresses(value: string): Array<[string, string]> {
  if (!value) return [];
  const parts: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (const ch of value) {
    if (ch === '"') { inQuotes = !inQuotes; buf += ch; }
    else if (ch === "," && !inQuotes) { parts.push(buf); buf = ""; }
    else buf += ch;
  }
  if (buf.trim()) parts.push(buf);

  const out: Array<[string, string]> = [];
  for (const raw of parts) {
    const token = raw.trim();
    if (!token) continue;
    const m = token.match(/^(.*?)<([^>]+)>\s*$/);
    let name = "", addr = "";
    if (m) {
      name = m[1].trim().replace(/^"|"$/g, "").trim();
      addr = m[2].trim();
    } else {
      addr = token;
    }
    out.push([name, addr.toLowerCase()]);
  }
  return out;
}

export function parseAddr(value: string): [string, string] {
  const pairs = getAddresses(value);
  if (pairs.length === 0) return ["", ""];
  return [pairs[0][0], pairs[0][1]];
}

// deno-lint-ignore no-explicit-any
export function attachmentNames(payload: any): string[] {
  const names: string[] = [];
  // deno-lint-ignore no-explicit-any
  function walk(part: any) {
    if (part.filename) names.push(part.filename);
    for (const sub of part.parts ?? []) walk(sub);
  }
  walk(payload);
  return names;
}

export function isBulk(headers: GHeader[]): boolean {
  if (header(headers, "List-Unsubscribe")) return true;
  const prec = header(headers, "Precedence").toLowerCase();
  return prec === "bulk" || prec === "list" || prec === "junk";
}

// Quote stripping — mirrors strip_quoted() (EN/IT/FR/ES/DE attribution lines).
const QUOTE_START = /^\s*(On|Il giorno|Le|El|Am|El día)\b/i;
const QUOTE_VERB = /(wrote:|ha scritto:|a écrit\s*:|escribió:|schrieb:)/i;
const QUOTE_MARKERS = [
  /^\s*-{2,}\s*(Original Message|Messaggio originale)\s*-{2,}/i,
  /^\s*_{5,}\s*$/,
  /^\s*(From|Da|De|Von):\s.+@.+/i,
];

export function stripQuoted(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  let cut = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith(">")) { cut = i; break; }
    if (QUOTE_START.test(line)) {
      const window = lines.slice(i, i + 3).join(" ");
      if (QUOTE_VERB.test(window)) { cut = i; break; }
    }
    if (QUOTE_MARKERS.some((p) => p.test(line))) { cut = i; break; }
  }
  return lines.slice(0, cut).join("\n").trim().replace(/\n{3,}/g, "\n\n");
}

export function companyFromDomain(domain: string): string {
  if (!domain || FREE_DOMAINS.has(domain)) return "";
  return domain.split(".")[0].replace(/^./, (c) => c.toUpperCase());
}

export interface MsgRow {
  id: string;
  thread_id: string;
  contact_email: string;
  from_email: string;
  to_emails: string;
  subject: string;
  snippet: string;
  body_text: string;
  direction: string;
  ts: number;
  attachments: string;
  is_bulk: number;
  contact_name: string;
  contact_company: string;
  contact_domain: string;
  extra_contacts: Array<[string, string]>;
}

// Flatten one full thread payload into normalized message rows — port of
// _thread_to_rows(). Direction is 'out' when From is you; contact is the other.
// deno-lint-ignore no-explicit-any
export function threadToRows(
  full: any, threadId: string, myAddr: string, internalEmails: string[],
): MsgRow[] {
  const internal = new Set([...internalEmails.map((a) => a.toLowerCase()), myAddr]);
  const rows: MsgRow[] = [];
  for (const msg of full.messages ?? []) {
    const payload = msg.payload ?? {};
    const headers: GHeader[] = payload.headers ?? [];
    const [fromName, fromAddr] = parseAddr(header(headers, "From"));
    const toRaw = header(headers, "To");
    const ccRaw = header(headers, "Cc");
    const toPairs = toRaw ? getAddresses(toRaw) : [];
    const ccPairs = ccRaw ? getAddresses(ccRaw) : [];
    const toAddrs = toPairs.map(([, a]) => a).filter(Boolean);

    const direction = fromAddr === myAddr ? "out" : "in";
    let contactAddr = "", contactName = "";
    if (direction === "out") {
      contactAddr = toAddrs[0] ?? "";
      contactName = toPairs[0]?.[0] ?? "";
    } else {
      contactName = fromName;
      contactAddr = fromAddr;
    }
    if (!contactAddr || contactAddr === myAddr) continue;

    const extras: Array<[string, string]> = [];
    for (const [nm, addr] of [...toPairs, ...ccPairs]) {
      const a = addr.trim().toLowerCase();
      if (a && !internal.has(a) && a !== contactAddr && a.includes("@")) {
        extras.push([nm.trim(), a]);
      }
    }

    const ts = Math.floor(parseInt(msg.internalDate ?? "0", 10) / 1000);
    const domain = contactAddr.includes("@") ? contactAddr.split("@").pop()! : "";

    rows.push({
      id: msg.id,
      thread_id: threadId,
      contact_email: contactAddr,
      from_email: fromAddr,
      to_emails: toAddrs.join(", "),
      subject: header(headers, "Subject"),
      snippet: msg.snippet ?? "",
      body_text: stripQuoted(decodeBody(payload)),
      direction,
      ts,
      attachments: attachmentNames(payload).join(", "),
      is_bulk: isBulk(headers) ? 1 : 0,
      contact_name: contactName,
      contact_company: companyFromDomain(domain),
      contact_domain: domain,
      extra_contacts: extras,
    });
  }
  return rows;
}
