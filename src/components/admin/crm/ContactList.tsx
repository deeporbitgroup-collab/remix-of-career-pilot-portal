import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2, Inbox, Archive, ArchiveRestore, Star, X, Download } from "lucide-react";
import { crmDb } from "./client";
import { CrmContact, CrmCounts, TABS, fmtDate, ownerLabel, STAGE_LABELS } from "./types";

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function exportCsv(rows: CrmContact[]) {
  const headers = ["Name", "Email", "Company", "Status", "Stage", "Owner", "Tags", "Last activity"];
  const lines = [headers.join(",")];
  for (const c of rows) {
    lines.push([
      c.name, c.email, c.company, c.status, STAGE_LABELS[c.stage ?? ""] ?? c.stage,
      ownerLabel(c.call_owner), c.tags, fmtDate(c.last_message_at),
    ].map(csvCell).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `crm-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  onOpen: (email: string) => void;
  refreshKey: number;
}

const emptyCounts: CrmCounts = {
  all: 0, needs: 0, waiting: 0, no_reply: 0, scheduled: 0, called: 0, snoozed: 0, archived: 0, due: 0,
};

const ContactList = ({ onOpen, refreshKey }: Props) => {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [counts, setCounts] = useState<CrmCounts>(emptyCounts);
  const [tab, setTab] = useState<keyof CrmCounts>("needs");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [localKey, setLocalKey] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: c }] = await Promise.all([
        crmDb.from("crm_contacts_enriched").select("*").order("last_message_at", { ascending: false }),
        crmDb.rpc("crm_counts"),
      ]);
      setContacts((data as CrmContact[]) ?? []);
      if (c) setCounts(c as CrmCounts);
      setSelected(new Set());
      setLoading(false);
    })();
  }, [refreshKey, localKey]);

  const activeBucket = TABS.find((t) => t.key === tab)!.bucket;

  const visible = useMemo(() => {
    let list = contacts;
    if (activeBucket === "all") list = list.filter((c) => c.status !== "archived");
    else list = list.filter((c) => c.status === activeBucket);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.email, c.company, c.tags, c.last_snippet, ownerLabel(c.call_owner)].filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(needle)),
      );
    }
    return list;
  }, [contacts, activeBucket, q]);

  const toggle = (email: string) => setSelected((s) => {
    const next = new Set(s);
    next.has(email) ? next.delete(email) : next.add(email);
    return next;
  });

  const bulk = async (patch: Record<string, unknown>, label: string) => {
    setBulkBusy(true);
    const { error } = await crmDb.from("crm_contacts").update(patch).in("email", [...selected]);
    setBulkBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${label} ${selected.size} contact${selected.size > 1 ? "s" : ""}` });
    setLocalKey((k) => k + 1);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, company, tag, owner…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCsv(visible)} title="Export the visible list to CSV">
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(new Set()); }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
            <Badge variant="secondary" className={`${tab === t.key ? "bg-primary-foreground/20 text-primary-foreground" : ""}`}>
              {counts[t.key] ?? 0}
            </Badge>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 flex-wrap">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          {activeBucket === "archived" ? (
            <Button size="sm" variant="outline" disabled={bulkBusy}
              onClick={() => bulk({ archived: 0, archived_at: null }, "Unarchived")}>
              <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={bulkBusy}
              onClick={() => bulk({ archived: 1, archived_at: now }, "Archived")}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Inbox className="h-8 w-8 mb-2" />
          <p className="text-sm">Nothing here.</p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {visible.map((c) => (
            <div key={c.email} className="flex w-full items-center gap-2 p-3 hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 flex-shrink-0 accent-[hsl(var(--primary))]"
                checked={selected.has(c.email)}
                onChange={() => toggle(c.email)}
                onClick={(e) => e.stopPropagation()}
              />
              <button onClick={() => onOpen(c.email)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {(c.name || c.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{c.name || c.email}</span>
                    {c.priority === 1 && <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />}
                    {c.due && <Badge variant="destructive" className="text-[10px]">Due</Badge>}
                    {c.call_owner && <Badge variant="outline" className="text-[10px]">{ownerLabel(c.call_owner)}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.company ? `${c.company} — ` : ""}{c.last_snippet || c.email}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex-shrink-0">{fmtDate(c.last_message_at)}</div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactList;
