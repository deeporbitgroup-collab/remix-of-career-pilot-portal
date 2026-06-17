import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatSlot } from "@/lib/meeting-format";
import { Video, Link as LinkIcon, RefreshCw, ChevronDown, ChevronUp, CalendarClock } from "lucide-react";

interface Slot {
  datetime: string;
}

interface Meeting {
  id: string;
  title: string | null;
  confirmed_slot: Slot | null;
  timezone: string | null;
  status: string;
  meet_link: string | null;
  description: string | null;
  company: { company_name: string | null } | null;
  student: { first_name: string | null; last_name: string | null } | null;
}

// Admin fallback: set the interview link on a CONFIRMED meeting when the company
// hasn't done it yet. Shows the missing-link ones up front; existing links are in
// a collapsible list so they can still be corrected.
const AdminMeetingLinks = () => {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { meetLink: string; description: string }>>({});
  const [showWithLink, setShowWithLink] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-recruiting-meetings", { body: { all: true } });
      if (error) throw error;
      const list: Meeting[] = Array.isArray(data) ? data : [];
      setMeetings(list);
      // Seed each form with the current values so edits start from what's saved.
      const seed: Record<string, { meetLink: string; description: string }> = {};
      list.forEach((m) => { seed[m.id] = { meetLink: m.meet_link || "", description: m.description || "" }; });
      setForms(seed);
    } catch (e) {
      console.error("Error loading meetings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (id: string, field: "meetLink" | "description", value: string) =>
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const save = async (m: Meeting) => {
    const form = forms[m.id] || { meetLink: "", description: "" };
    if (!form.meetLink.trim()) {
      toast({ title: "Link required", description: "Paste the interview link first.", variant: "destructive" });
      return;
    }
    setSavingId(m.id);
    try {
      const { error } = await supabase.functions.invoke("recruiting-meeting-action", {
        body: {
          action: "set-link",
          by: "ADMIN",
          meetingId: m.id,
          meetLink: form.meetLink.trim(),
          description: form.description.trim() || null,
        },
      });
      if (error) throw error;
      toast({ title: "Interview link saved", description: "The candidate and company have been notified." });
      await load();
    } catch (e: any) {
      console.error("Admin set link error:", e);
      toast({ title: "Error", description: e.message || "Failed to save the link", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const partyLine = (m: Meeting) => {
    const company = m.company?.company_name || "Company";
    const student = `${m.student?.first_name ?? ""} ${m.student?.last_name ?? ""}`.trim() || "Candidate";
    return `${company} ↔ ${student}`;
  };

  const renderRow = (m: Meeting) => {
    const form = forms[m.id] || { meetLink: "", description: "" };
    const busy = savingId === m.id;
    return (
      <div key={m.id} className="rounded-md border p-3 space-y-2 bg-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{partyLine(m)}</p>
          <Badge variant="outline" className="text-[10px]">{m.title || "Meeting"}</Badge>
        </div>
        {m.confirmed_slot?.datetime && (
          <p className="text-xs text-muted-foreground">
            Confirmed: {formatSlot(m.confirmed_slot.datetime, m.timezone)}
          </p>
        )}
        <Input
          placeholder="https://meet.google.com/... or Zoom URL"
          value={form.meetLink}
          onChange={(e) => setField(m.id, "meetLink", e.target.value)}
        />
        <Textarea
          placeholder="Description (optional)"
          className="min-h-[60px]"
          value={form.description}
          onChange={(e) => setField(m.id, "description", e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => save(m)} disabled={busy}>
            <LinkIcon className="h-4 w-4 mr-1" />
            {busy ? "Saving..." : m.meet_link ? "Update link" : "Save link"}
          </Button>
        </div>
      </div>
    );
  };

  const confirmed = meetings.filter((m) => m.status === "CONFIRMED");
  const awaiting = confirmed.filter((m) => !m.meet_link);
  const withLink = confirmed.filter((m) => !!m.meet_link);

  return (
    <Card className="border-amber-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-5 w-5 text-amber-600" />
          Meetings awaiting an interview link ({awaiting.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} className="gap-1">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading meetings…</p>
        ) : awaiting.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" /> All confirmed meetings already have a link.
          </p>
        ) : (
          <div className="space-y-3">{awaiting.map(renderRow)}</div>
        )}

        {withLink.length > 0 && (
          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => setShowWithLink((v) => !v)}
            >
              {showWithLink ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Confirmed meetings with a link ({withLink.length})
            </Button>
            {showWithLink && <div className="mt-3 space-y-3">{withLink.map(renderRow)}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMeetingLinks;
