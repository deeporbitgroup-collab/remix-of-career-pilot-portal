import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Archive, ArchiveRestore, Reply, CalendarPlus, Save, Loader2, ExternalLink,
  Star, Clock, Sparkles, Mail, Copy, Trash2, GitMerge, NotebookPen, Plus,
} from "lucide-react";
import { crmDb, crmInvoke } from "./client";
import {
  CrmContact, CrmMessage, BUCKET_BADGE, STAGES, STAGE_LABELS, OWNERS, fmtTime, fmtDate,
} from "./types";

interface Props {
  email: string;
  onBack: () => void;
  onChanged: () => void;
}

const now = () => Math.floor(Date.now() / 1000);

const ContactDetail = ({ email, onBack, onChanged }: Props) => {
  const [contact, setContact] = useState<CrmContact | null>(null);
  const [messages, setMessages] = useState<CrmMessage[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);

  // editable profile fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("");
  const [tags, setTags] = useState("");
  const [owner, setOwner] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const load = async () => {
    const { data: c } = await crmDb
      .from("crm_contacts_enriched").select("*").eq("email", email).single();
    const ct = c as CrmContact;
    setContact(ct);
    setNotes(ct?.notes ?? "");
    setName(ct?.name ?? "");
    setCompany(ct?.company ?? "");
    setStage(ct?.stage ?? "");
    setTags(ct?.tags ?? "");
    setOwner(ct?.call_owner ?? "");

    const { data: own } = await crmDb.from("crm_messages").select("thread_id").eq("contact_email", email);
    const threadIds = new Set<string>((own ?? []).map((r: { thread_id: string }) => r.thread_id));
    const { data: cc } = await crmDb.from("crm_message_contacts").select("message_id").eq("contact_email", email);
    if (cc?.length) {
      const { data: ccMsgs } = await crmDb.from("crm_messages")
        .select("thread_id").in("id", cc.map((r: { message_id: string }) => r.message_id));
      for (const m of (ccMsgs ?? []) as { thread_id: string }[]) threadIds.add(m.thread_id);
    }
    if (threadIds.size) {
      const { data: conv } = await crmDb.from("crm_messages")
        .select("*").in("thread_id", [...threadIds]).order("ts", { ascending: true });
      setMessages((conv as CrmMessage[]) ?? []);
    } else {
      setMessages([]);
    }
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [email]);

  const mutate = async (patch: Record<string, unknown>, msg: string) => {
    const { error } = await crmDb.from("crm_contacts").update(patch).eq("email", email);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: msg });
    await load();
    onChanged();
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await mutate({ notes }, "Notes saved");
    setSavingNotes(false);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    await mutate({
      name: name.trim() || null, company: company.trim() || null,
      stage, tags: tags.trim(), call_owner: owner, user_edited: 1,
    }, "Profile saved");
    setSavingProfile(false);
  };

  const snooze = (days: number) => mutate(
    { follow_up_at: now() + days * 86400 }, `Snoozed ${days} day${days > 1 ? "s" : ""}`);
  const clearSnooze = () => mutate({ follow_up_at: null }, "Reminder cleared");

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!contact) return null;

  const badge = BUCKET_BADGE[contact.status];
  const isArchived = contact.archived === 1;

  return (
    <div className="space-y-4">
      {/* Header + quick actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{contact.name || contact.email}</h2>
              <Badge variant="secondary" className={badge.className}>{badge.label}</Badge>
              {contact.priority === 1 && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              {contact.stage && <Badge variant="outline">{STAGE_LABELS[contact.stage] ?? contact.stage}</Badge>}
              {contact.follow_up_at && (
                <Badge variant="secondary" className="bg-secondary/10">
                  💤 {contact.follow_up_at <= now() ? "Follow-up due" : `Snoozed → ${fmtDate(contact.follow_up_at)}`}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {contact.email}{contact.company ? ` · ${contact.company}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={contact.priority === 1 ? "default" : "outline"} size="sm"
            onClick={() => mutate({ priority: contact.priority === 1 ? 0 : 1 }, contact.priority === 1 ? "Unstarred" : "Starred")}>
            <Star className={`h-4 w-4 ${contact.priority === 1 ? "fill-current" : ""}`} />
          </Button>
          {contact.status_override === "needs_reply" ? (
            <Button variant="outline" size="sm" onClick={() => mutate({ status_override: null }, "Cleared")}>Clear flag</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => mutate({ status_override: "needs_reply" }, "Flagged needs reply")}>
              <Reply className="mr-2 h-4 w-4" /> Flag
            </Button>
          )}
          <InviteDialog email={contact.email} />
          <MergeDialog email={contact.email} onMerged={onBack} />
          {isArchived ? (
            <Button variant="outline" size="sm" onClick={() => mutate({ archived: 0, archived_at: null }, "Unarchived")}>
              <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
            </Button>
          ) : (
            <Button variant="outline" size="sm"
              onClick={() => mutate({ archived: 1, archived_at: now() }, "Archived")}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversation */}
        <div className="lg:col-span-2 space-y-3">
          <AiPanel email={contact.email} initialSummary={contact.ai_summary} onChanged={load} />
          {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages.</div>}
          {messages.map((m) => (
            <div key={m.id} className={`rounded-lg border p-3 ${m.direction === "out" ? "bg-primary/5 ml-8" : "bg-muted/40 mr-8"}`}>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium">{m.direction === "out" ? "You" : (contact.name || contact.email)}</span>
                <span>{fmtTime(m.ts)}</span>
              </div>
              {m.subject && <div className="text-xs font-medium mb-1">{m.subject}</div>}
              <div className="text-sm whitespace-pre-wrap break-words">{m.body_text || m.snippet}</div>
            </div>
          ))}
        </div>

        {/* Sidebar: profile, follow-up, notes */}
        <div className="space-y-5">
          {/* Profile & pipeline */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="text-sm font-semibold">Profile & pipeline</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Company</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm">
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Owner (assigned to)</label>
              <select value={owner} onChange={(e) => setOwner(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm">
                {OWNERS.map((o) => <option key={o.email} value={o.email}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. warm, referral" />
            </div>
            <Button size="sm" onClick={saveProfile} disabled={savingProfile} className="w-full">
              {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save profile
            </Button>
          </div>

          {/* Follow-up / snooze */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Follow-up reminder</div>
            {contact.follow_up_at ? (
              <div className="text-xs text-muted-foreground">
                {contact.follow_up_at <= now() ? <b className="text-amber-600">Due now</b> : `Due ${fmtTime(contact.follow_up_at)}`}
              </div>
            ) : <div className="text-xs text-muted-foreground">No reminder set.</div>}
            <div className="flex flex-wrap gap-1.5">
              {([["1 day", 1], ["3 days", 3], ["1 week", 7], ["2 weeks", 14]] as Array<[string, number]>).map(([label, d]) => (
                <Button key={d} variant="outline" size="sm" onClick={() => snooze(d)}>{label}</Button>
              ))}
            </div>
            {contact.follow_up_at && (
              <Button variant="ghost" size="sm" onClick={clearSnooze} className="text-muted-foreground">Clear reminder</Button>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Private notes</div>
            <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes about this contact…" />
            <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save notes
            </Button>
          </div>

          {/* Meeting notes */}
          <MeetingNotesSection email={contact.email} />
        </div>
      </div>
    </div>
  );
};

// ── AI summary + draft reply ─────────────────────────────────────────────────
const AiPanel = ({ email, initialSummary, onChanged }: { email: string; initialSummary: string | null; onChanged: () => void }) => {
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"" | "sum" | "draft" | "save">("");

  const summarize = async () => {
    setBusy("sum");
    try {
      const r = await crmInvoke<{ summary: string }>("crm-ai", { action: "summarize", email });
      setSummary(r.summary);
      onChanged();
    } catch (e) { toast({ title: "AI error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(""); }
  };
  const makeDraft = async () => {
    setBusy("draft");
    try {
      const r = await crmInvoke<{ draft: string }>("crm-ai", { action: "draft", email });
      setDraft(r.draft);
    } catch (e) { toast({ title: "AI error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(""); }
  };
  const saveToGmail = async () => {
    setBusy("save");
    try {
      await crmInvoke("crm-ai", { action: "gmail_draft", email, body: draft });
      toast({ title: "Saved to Gmail drafts", description: "Open Gmail to review & send — nothing was sent." });
    } catch (e) { toast({ title: "Could not save draft", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(""); }
  };

  return (
    <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="h-4 w-4 text-primary" />
        <Button variant="outline" size="sm" onClick={summarize} disabled={!!busy}>
          {busy === "sum" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Summarize relationship
        </Button>
        <Button size="sm" onClick={makeDraft} disabled={!!busy}>
          {busy === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Draft reply
        </Button>
      </div>
      {summary && <div className="text-sm whitespace-pre-wrap bg-background rounded-md border p-2">{summary}</div>}
      {draft && (
        <div className="space-y-2">
          <Textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveToGmail} disabled={!!busy || !draft.trim()}>
              {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Save to Gmail drafts
            </Button>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(draft); toast({ title: "Copied" }); }}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={makeDraft} disabled={!!busy}>↻ Regenerate</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Schedule-a-call dialog ───────────────────────────────────────────────────
const InviteDialog = ({ email }: { email: string }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Intro call");
  const [startIso, setStartIso] = useState("");
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!startIso) { toast({ title: "Pick a date & time", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const res = await crmInvoke<{ meet: string; start: string }>("crm-create-invite", {
        contactEmail: email, title, startIso, durationMin: duration,
      });
      toast({ title: "Invite sent", description: `${res.start} — Meet link created.` });
      setOpen(false);
    } catch (e) {
      toast({ title: "Could not create invite", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><CalendarPlus className="mr-2 h-4 w-4" /> Schedule</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule a call with {email}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Start</label>
            <Input type="datetime-local" value={startIso} onChange={(e) => setStartIso(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Duration (min)</label>
            <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)} />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> A Google Meet link is created and invites emailed to the client + your team.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
            Create invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Meeting notes (port of crm_meeting_notes CRUD) ───────────────────────────
interface Note { id: string; title: string; html: string; created_at: number }
const MeetingNotesSection = ({ email }: { email: string }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await crmDb.from("crm_meeting_notes")
      .select("id, title, html, created_at").eq("contact_email", email).order("created_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [email]);

  const add = async () => {
    if (!body.trim()) { toast({ title: "Write something first", variant: "destructive" }); return; }
    setBusy(true);
    const { error } = await crmDb.from("crm_meeting_notes").insert({
      contact_email: email, title: title.trim(), html: body.trim(),
      created_at: Math.floor(Date.now() / 1000),
    });
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTitle(""); setBody(""); setAdding(false); toast({ title: "Note saved" });
    load();
  };
  const del = async (id: string) => {
    await crmDb.from("crm_meeting_notes").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-2"><NotebookPen className="h-4 w-4" /> Meeting notes</div>
        <Button variant="ghost" size="sm" onClick={() => setAdding((v) => !v)}><Plus className="h-4 w-4" /></Button>
      </div>
      {adding && (
        <div className="space-y-2 rounded-lg border p-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Intro call)" />
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What was discussed, next steps…" />
          <Button size="sm" onClick={add} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save note
          </Button>
        </div>
      )}
      {notes.length === 0 && !adding && <div className="text-xs text-muted-foreground">No meeting notes yet.</div>}
      {notes.map((n) => (
        <div key={n.id} className="rounded-lg border p-2 group">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {n.title && <div className="text-sm font-medium">{n.title}</div>}
              <div className="text-[11px] text-muted-foreground">{fmtTime(n.created_at)}</div>
            </div>
            <button onClick={() => del(n.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-sm whitespace-pre-wrap mt-1">{n.html}</div>
        </div>
      ))}
    </div>
  );
};

// ── Merge this contact into another ──────────────────────────────────────────
const MergeDialog = ({ email, onMerged }: { email: string; onMerged: () => void }) => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const t = target.trim().toLowerCase();
    if (!t) { toast({ title: "Enter the email to merge into", variant: "destructive" }); return; }
    setBusy(true);
    const { data, error } = await crmDb.rpc("crm_merge_contacts", { _source: email, _target: t });
    setBusy(false);
    if (error) { toast({ title: "Merge failed", description: error.message, variant: "destructive" }); return; }
    if (data === false) { toast({ title: "Could not merge", description: `'${t}' is not an existing contact.`, variant: "destructive" }); return; }
    toast({ title: "Merged", description: `${email} → ${t}` });
    setOpen(false);
    onMerged();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><GitMerge className="mr-2 h-4 w-4" /> Merge</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Merge {email} into another contact</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Folds this contact's emails, notes and meeting notes into the target, and files future mail there too. This can't be undone.
          </p>
          <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="target@email.com (must already exist)" />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy} variant="destructive">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitMerge className="mr-2 h-4 w-4" />}Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDetail;
