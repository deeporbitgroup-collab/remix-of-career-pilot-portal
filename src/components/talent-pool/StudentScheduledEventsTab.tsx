import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { formatSlot } from "@/lib/meeting-format";
import { CalendarClock, CalendarCheck2, CalendarX2, Hourglass, Building2, Video } from "lucide-react";

interface Slot {
  datetime: string;
  label?: string;
}

interface Meeting {
  id: string;
  company_id: string;
  student_id: string;
  title: string | null;
  proposed_slots: Slot[] | null;
  confirmed_slot: Slot | null;
  timezone: string | null;
  status: "PROPOSED" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  proposed_by: "COMPANY" | "STUDENT" | null;
  meet_link: string | null;
  description: string | null;
  company: { user_id: string; company_name: string | null; logo_url: string | null } | null;
  student: { user_id: string; first_name: string | null; last_name: string | null; photo_url: string | null } | null;
}

const statusBadge: Record<Meeting["status"], { label: string; className: string }> = {
  PROPOSED: { label: "Awaiting response", className: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  DECLINED: { label: "Declined", className: "bg-rose-100 text-rose-800 border-rose-200" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  COMPLETED: { label: "Completed", className: "bg-sky-100 text-sky-800 border-sky-200" },
};

const StudentScheduledEventsTab = ({ studentId }: { studentId: string }) => {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  // Accept dialog state
  const [acceptFor, setAcceptFor] = useState<Meeting | null>(null);
  const [acceptSlot, setAcceptSlot] = useState<string>("");

  // Counter dialog state
  const [counterFor, setCounterFor] = useState<Meeting | null>(null);
  const [counterForm, setCounterForm] = useState({ slot1: "", slot2: "", timezone: "" });

  const load = useCallback(async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase.functions.invoke("get-recruiting-meetings", {
        body: { studentId },
      });
      if (error) throw error;
      setMeetings(Array.isArray(data) ? (data as Meeting[]) : []);
    } catch (e) {
      console.error("Error loading meetings:", e);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const openAccept = (m: Meeting) => {
    setAcceptFor(m);
    setAcceptSlot(m.proposed_slots?.[0]?.datetime ?? "");
  };

  const handleAccept = async () => {
    if (!acceptFor || !acceptSlot) return;
    setWorking(acceptFor.id);
    try {
      const { error } = await supabase.functions.invoke("recruiting-meeting-action", {
        body: { action: "accept", meetingId: acceptFor.id, acceptedSlot: { datetime: acceptSlot } },
      });
      if (error) throw error;
      toast({ title: "Meeting confirmed", description: "The company and Career Pilot have been notified." });
      setAcceptFor(null);
      await load();
    } catch (e: any) {
      console.error("Accept meeting error:", e);
      toast({ title: "Error", description: e.message || "Failed to confirm meeting", variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const openCounter = (m: Meeting) => {
    setCounterFor(m);
    setCounterForm({ slot1: "", slot2: "", timezone: m.timezone ?? "" });
  };

  const handleCounter = async () => {
    if (!counterFor) return;
    if (!counterForm.slot1 || !counterForm.slot2) {
      toast({ title: "Two slots required", description: "Please propose two date + time options.", variant: "destructive" });
      return;
    }
    if (!counterForm.timezone.trim()) {
      toast({ title: "Timezone required", description: "Add the timezone label shown next to the times.", variant: "destructive" });
      return;
    }
    setWorking(counterFor.id);
    try {
      const { error } = await supabase.functions.invoke("recruiting-meeting-action", {
        body: {
          action: "counter",
          by: "STUDENT",
          meetingId: counterFor.id,
          proposedSlots: [{ datetime: counterForm.slot1 }, { datetime: counterForm.slot2 }],
          timezone: counterForm.timezone.trim(),
        },
      });
      if (error) throw error;
      toast({ title: "New times proposed", description: "The company and Career Pilot have been notified." });
      setCounterFor(null);
      await load();
    } catch (e: any) {
      console.error("Counter meeting error:", e);
      toast({ title: "Error", description: e.message || "Failed to propose new times", variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const handleDecline = async (m: Meeting) => {
    setWorking(m.id);
    try {
      const { error } = await supabase.functions.invoke("recruiting-meeting-action", {
        body: { action: "decline", meetingId: m.id },
      });
      if (error) throw error;
      toast({ title: "Meeting declined" });
      await load();
    } catch (e: any) {
      console.error("Decline meeting error:", e);
      toast({ title: "Error", description: e.message || "Failed to decline meeting", variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const companyName = (m: Meeting) => m.company?.company_name || "A company";
  // Student can act only when it's a live proposal the company put on the table.
  const studentMustRespond = (m: Meeting) => m.status === "PROPOSED" && m.proposed_by === "COMPANY";

  const renderCard = (m: Meeting) => {
    const badge = statusBadge[m.status];
    const busy = working === m.id;
    return (
      <div key={m.id} className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={m.company?.logo_url || undefined} />
              <AvatarFallback><Building2 className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{m.title || "Meeting"}</p>
              <p className="text-sm text-muted-foreground truncate">{companyName(m)}</p>
            </div>
          </div>
          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
        </div>

        {m.status === "CONFIRMED" && m.confirmed_slot ? (
          <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3 text-sm">
            <p className="font-medium text-emerald-900">
              Confirmed: {formatSlot(m.confirmed_slot.datetime, m.timezone)}
            </p>
            {m.meet_link ? (
              <a href={m.meet_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <Video className="h-4 w-4" /> Join link
              </a>
            ) : (
              <p className="text-muted-foreground">The company will share the link soon.</p>
            )}
            {m.description && <p className="mt-1 text-muted-foreground">{m.description}</p>}
          </div>
        ) : (
          <div className="text-sm">
            <p className="text-muted-foreground">
              {m.proposed_by === "STUDENT" ? "You proposed:" : `${companyName(m)} proposed:`}
            </p>
            <ul className="list-disc list-inside">
              {(m.proposed_slots || []).map((s, i) => (
                <li key={i}>{formatSlot(s.datetime, m.timezone)}{s.label ? ` — ${s.label}` : ""}</li>
              ))}
            </ul>
          </div>
        )}

        {studentMustRespond(m) && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => openAccept(m)} disabled={busy}>
              <CalendarCheck2 className="h-4 w-4 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => openCounter(m)} disabled={busy}>
              <CalendarClock className="h-4 w-4 mr-1" /> Propose new times
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}>
                  <CalendarX2 className="h-4 w-4 mr-1" /> Decline
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline this meeting?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {companyName(m)} will be notified that you declined the meeting{m.title ? ` "${m.title}"` : ""}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDecline(m)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Yes, decline
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {m.status === "PROPOSED" && m.proposed_by === "STUDENT" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5" /> Waiting for {companyName(m)} to respond
          </p>
        )}
      </div>
    );
  };

  const actionable = meetings.filter(studentMustRespond);
  const waiting = meetings.filter((m) => m.status === "PROPOSED" && m.proposed_by === "STUDENT");
  const confirmed = meetings.filter((m) => m.status === "CONFIRMED" || m.status === "COMPLETED");
  const closed = meetings.filter((m) => m.status === "DECLINED" || m.status === "CANCELLED");

  const Section = ({ title, items }: { title: string; items: Meeting[] }) =>
    items.length ? (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">{title} ({items.length})</p>
        {items.map(renderCard)}
      </div>
    ) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" /> Scheduled events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading meetings…</p>
        ) : meetings.length === 0 ? (
          <div className="text-center py-8">
            <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No meetings yet. When a company proposes a meeting, it will appear here.
            </p>
          </div>
        ) : (
          <>
            <Section title="Action needed" items={actionable} />
            <Section title="Waiting on company" items={waiting} />
            <Section title="Confirmed" items={confirmed} />
            <Section title="Closed" items={closed} />
          </>
        )}
      </CardContent>

      {/* Accept dialog — pick one of the proposed slots */}
      <Dialog open={!!acceptFor} onOpenChange={(o) => { if (!o) setAcceptFor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept meeting{acceptFor?.title ? ` — ${acceptFor.title}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pick the time that works for you:</p>
            <RadioGroup value={acceptSlot} onValueChange={setAcceptSlot}>
              {(acceptFor?.proposed_slots || []).map((s, i) => (
                <Label
                  key={i}
                  htmlFor={`slot-${i}`}
                  className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={s.datetime} id={`slot-${i}`} />
                  <span>{formatSlot(s.datetime, acceptFor?.timezone)}{s.label ? ` — ${s.label}` : ""}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptFor(null)} disabled={!!working}>Cancel</Button>
            <Button onClick={handleAccept} disabled={!acceptSlot || !!working}>
              {working ? "Confirming…" : "Confirm meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter dialog — propose 2 new date+time options */}
      <Dialog open={!!counterFor} onOpenChange={(o) => { if (!o) setCounterFor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Propose new times{counterFor?.title ? ` — ${counterFor.title}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Option 1 (date &amp; time)</Label>
                <Input
                  type="datetime-local"
                  value={counterForm.slot1}
                  onChange={(e) => setCounterForm({ ...counterForm, slot1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Option 2 (date &amp; time)</Label>
                <Input
                  type="datetime-local"
                  value={counterForm.slot2}
                  onChange={(e) => setCounterForm({ ...counterForm, slot2: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                placeholder="e.g. CET, GMT, EST"
                value={counterForm.timezone}
                onChange={(e) => setCounterForm({ ...counterForm, timezone: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Shown next to the times as a label — no automatic conversion.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterFor(null)} disabled={!!working}>Cancel</Button>
            <Button onClick={handleCounter} disabled={!!working}>
              {working ? "Sending…" : "Propose new times"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default StudentScheduledEventsTab;
