// Shared CRM types + bucket metadata (mirrors the Python tool's tabs).

export type Bucket =
  | "needs_reply" | "waiting" | "no_reply"
  | "scheduled" | "called" | "snoozed" | "archived";

export interface CrmContact {
  email: string;
  name: string | null;
  company: string | null;
  domain: string | null;
  last_message_at: number | null;
  last_direction: string | null;
  status_override: string | null;
  status: Bucket;
  due: boolean;
  replied: number;
  archived: number;
  next_call_at: number | null;
  last_call_at: number | null;
  follow_up_at: number | null;
  notes: string | null;
  stage: string | null;
  tags: string | null;
  priority: number;
  call_owner: string | null;
  ai_summary: string | null;
  last_snippet: string | null;
}

// Pipeline stages + labels (mirror db.py STAGES / STAGE_LABELS).
export const STAGES = ["", "lead", "contacted", "call_booked", "proposal", "won", "lost"];
export const STAGE_LABELS: Record<string, string> = {
  "": "No stage", lead: "Lead", contacted: "Contacted",
  call_booked: "Call booked", proposal: "Proposal", won: "Won", lost: "Lost",
};

// Call owners you can assign a client to (mirror config.py PEOPLE).
export const OWNERS: Array<{ email: string; label: string }> = [
  { email: "", label: "Unassigned" },
  { email: "aandreaa@mit.edu", label: "Me (Andrea)" },
  { email: "elisabettafabris.work@gmail.com", label: "Elisabetta Fabris" },
];
export const ownerLabel = (email: string | null): string =>
  OWNERS.find((o) => o.email === (email || ""))?.label ?? email ?? "";

export interface CrmMessage {
  id: string;
  thread_id: string;
  contact_email: string;
  from_email: string;
  to_emails: string;
  subject: string;
  snippet: string;
  body_text: string;
  direction: "in" | "out";
  ts: number;
  attachments: string;
}

export interface CrmCounts {
  all: number; needs: number; waiting: number; no_reply: number;
  scheduled: number; called: number; snoozed: number; archived: number; due: number;
}

export interface CrmAccount {
  id: string;
  email: string;
  last_sync_at: number | null;
  last_error: string | null;
  history_id: string | null;
}

// tab key → { label, bucket it maps to }. Order matches the original UI.
export const TABS: Array<{ key: keyof CrmCounts; label: string; bucket: Bucket | "all" }> = [
  { key: "needs", label: "Needs reply", bucket: "needs_reply" },
  { key: "waiting", label: "Waiting on them", bucket: "waiting" },
  { key: "no_reply", label: "No reply yet", bucket: "no_reply" },
  { key: "scheduled", label: "Call scheduled", bucket: "scheduled" },
  { key: "called", label: "Completed calls", bucket: "called" },
  { key: "snoozed", label: "Snoozed", bucket: "snoozed" },
  { key: "all", label: "All", bucket: "all" },
  { key: "archived", label: "Archived", bucket: "archived" },
];

export const BUCKET_BADGE: Record<Bucket, { label: string; className: string }> = {
  needs_reply: { label: "Needs reply", className: "bg-destructive/10 text-destructive" },
  waiting:     { label: "Waiting",     className: "bg-amber-500/10 text-amber-600" },
  no_reply:    { label: "No reply",    className: "bg-muted text-muted-foreground" },
  scheduled:   { label: "Scheduled",   className: "bg-primary/10 text-primary" },
  called:      { label: "Completed",   className: "bg-green-500/10 text-green-600" },
  snoozed:     { label: "Snoozed",     className: "bg-secondary/10 text-secondary" },
  archived:    { label: "Archived",    className: "bg-muted text-muted-foreground" },
};

export function fmtDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function fmtTime(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
