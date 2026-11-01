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
import { useToast } from "@/hooks/use-toast";
import { formatSlot } from "@/lib/meeting-format";
import { CalendarClock, CalendarCheck2, CalendarX2, Hourglass, Building2, Video } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";

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

const getStatusBadge = (tx: (en: string, it: string) => string): Record<Meeting["status"], { label: string; className: string }> => ({
  PROPOSED: { label: tx("Awaiting response", "In attesa di risposta"), className: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: tx("Confirmed", "Confermato"), className: "bg-cbind-100 text-cbind-800 border-cbind-200" },
  DECLINED: { label: tx("Declined", "Rifiutato"), className: "bg-rose-100 text-rose-800 border-rose-200" },
  CANCELLED: { label: tx("Cancelled", "Annullato"), className: "bg-muted text-muted-foreground" },
  COMPLETED: { label: tx("Completed", "Completato"), className: "bg-cbsky-100 text-cbsky-800 border-cbsky-200" },
});

// Same output as formatSlot (wall-clock time + timezone label), with Italian day/month names when needed.
const formatSlotIt = (datetime?: string | null, timezone?: string | null): string => {
  if (!datetime) return "";
  let label = datetime;
  try {
    const d = parseISO(datetime);
    if (isValid(d)) label = format(d, "EEE d MMM yyyy · HH:mm", { locale: itLocale });
  } catch {
    /* keep the raw string */
  }
  return timezone ? `${label} (${timezone})` : label;
};

const StudentScheduledEventsTab = ({ studentId, onMeetingsChange }: { studentId: string; onMeetingsChange?: () => void }) => {
  const { toast } = useToast();
  const { tx, language } = useTalentPoolLanguage();
  const statusBadge = getStatusBadge(tx);
  const fmtSlot = (datetime?: string | null, timezone?: string | null) =>
    language === "it" ? formatSlotIt(datetime, timezone) : formatSlot(datetime, timezone);
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
      onMeetingsChange?.();
    } catch (e) {
      console.error("Error loading meetings:", e);
    } finally {
      setLoading(false);
    }
  }, [studentId, onMeetingsChange]);

  useEffect(() => {
    load();
  }, [load]);

  // Accept ONE specific proposed time (each time has its own "Accept" button)
  const openAccept = (m: Meeting, slotDatetime: string) => {
    setAcceptFor(m);
    setAcceptSlot(slotDatetime);
  };

  const handleAccept = async () => {
    if (!acceptFor || !acceptSlot) return;
    setWorking(acceptFor.id);
    try {
      const { error } = await supabase.functions.invoke("recruiting-meeting-action", {
        body: { action: "accept", meetingId: acceptFor.id, acceptedSlot: { datetime: acceptSlot } },
      });
      if (error) throw error;
      toast({ title: tx("Meeting confirmed", "Colloquio confermato"), description: tx("The company and CareerBoost have been notified.", "L'azienda e CareerBoost sono stati avvisati.") });
      setAcceptFor(null);
      await load();
    } catch (e: any) {
      console.error("Accept meeting error:", e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to confirm meeting", "Impossibile confermare il colloquio"), variant: "destructive" });
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
      toast({ title: tx("Two slots required", "Servono due opzioni"), description: tx("Please propose two date + time options.", "Proponi due opzioni di data e orario."), variant: "destructive" });
      return;
    }
    if (!counterForm.timezone.trim()) {
      toast({ title: tx("Timezone required", "Fuso orario obbligatorio"), description: tx("Add the timezone label shown next to the times.", "Aggiungi il fuso orario da mostrare accanto agli orari."), variant: "destructive" });
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
      toast({ title: tx("New times proposed", "Nuovi orari proposti"), description: tx("The company and CareerBoost have been notified.", "L'azienda e CareerBoost sono stati avvisati.") });
      setCounterFor(null);
      await load();
    } catch (e: any) {
      console.error("Counter meeting error:", e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to propose new times", "Impossibile proporre nuovi orari"), variant: "destructive" });
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
      toast({ title: tx("Meeting declined", "Colloquio rifiutato") });
      await load();
    } catch (e: any) {
      console.error("Decline meeting error:", e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to decline meeting", "Impossibile rifiutare il colloquio"), variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const companyName = (m: Meeting) => m.company?.company_name || tx("A company", "Un'azienda");
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
              <p className="font-medium truncate">{m.title || tx("Meeting", "Colloquio")}</p>
              <p className="text-sm text-muted-foreground truncate">{companyName(m)}</p>
            </div>
          </div>
          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
        </div>

        {m.status === "CONFIRMED" && m.confirmed_slot ? (
          <div className="rounded-md bg-cbind-50 border border-cbind-100 p-3 text-sm">
            <p className="font-medium text-cbind-900">
              {tx("Confirmed:", "Confermato:")} {fmtSlot(m.confirmed_slot.datetime, m.timezone)}
            </p>
            {m.meet_link ? (
              <a href={m.meet_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <Video className="h-4 w-4" /> {tx("Join link", "Link per partecipare")}
              </a>
            ) : (
              <p className="text-muted-foreground">{tx("The company will share the link soon.", "L'azienda condividerà il link a breve.")}</p>
            )}
            {m.description && <p className="mt-1 text-muted-foreground">{m.description}</p>}
          </div>
        ) : (
          <div className="text-sm">
            <p className="text-muted-foreground">
              {m.proposed_by === "STUDENT" ? tx("You proposed:", "Hai proposto:") : tx(`${companyName(m)} proposed:`, `${companyName(m)} ha proposto:`)}
            </p>
            {studentMustRespond(m) ? (
              <ul className="mt-2 space-y-2">
                {(m.proposed_slots || []).map((s, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/60 px-3 py-2">
                    <span className="font-medium">{fmtSlot(s.datetime, m.timezone)}{s.label ? ` — ${s.label}` : ""}</span>
                    <Button size="sm" onClick={() => openAccept(m, s.datetime)} disabled={busy}>
                      <CalendarCheck2 className="h-4 w-4 mr-1" /> {tx("Accept this time", "Accetta questo orario")}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc list-inside">
                {(m.proposed_slots || []).map((s, i) => (
                  <li key={i}>{fmtSlot(s.datetime, m.timezone)}{s.label ? ` — ${s.label}` : ""}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {studentMustRespond(m) && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => openCounter(m)} disabled={busy}>
              <CalendarClock className="h-4 w-4 mr-1" /> {tx("Propose new times", "Proponi nuovi orari")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}>
                  <CalendarX2 className="h-4 w-4 mr-1" /> {tx("Decline", "Rifiuta")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{tx("Decline this meeting?", "Rifiutare questo colloquio?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tx(
                      `${companyName(m)} will be notified that you declined the meeting${m.title ? ` "${m.title}"` : ""}.`,
                      `${companyName(m)} riceverà una notifica che hai rifiutato il colloquio${m.title ? ` "${m.title}"` : ""}.`
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tx("Cancel", "Annulla")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDecline(m)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {tx("Yes, decline", "Sì, rifiuta")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {m.status === "PROPOSED" && m.proposed_by === "STUDENT" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5" /> {tx(`Waiting for ${companyName(m)} to respond`, `In attesa della risposta di ${companyName(m)}`)}
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
          <CalendarClock className="h-5 w-5 text-primary" /> {tx("Interviews", "Colloqui")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">{tx("Loading meetings…", "Caricamento colloqui…")}</p>
        ) : meetings.length === 0 ? (
          <div className="text-center py-8">
            <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {tx(
                "No meetings yet. When a company proposes a meeting, it will appear here.",
                "Ancora nessun colloquio. Quando un'azienda ti proporrà un colloquio, lo troverai qui."
              )}
            </p>
          </div>
        ) : (
          <>
            <Section title={tx("Action needed", "Azione richiesta")} items={actionable} />
            <Section title={tx("Waiting on company", "In attesa dell'azienda")} items={waiting} />
            <Section title={tx("Confirmed", "Confermati")} items={confirmed} />
            <Section title={tx("Closed", "Chiusi")} items={closed} />
          </>
        )}
      </CardContent>

      {/* Accept dialog — confirm the single time chosen on the card */}
      <Dialog open={!!acceptFor} onOpenChange={(o) => { if (!o) setAcceptFor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("Accept meeting", "Accetta il colloquio")}{acceptFor?.title ? ` — ${acceptFor.title}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx("You're confirming only this time:", "Stai confermando solo questo orario:")}
            </p>
            <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-primary/5 p-3 font-medium">
              <CalendarCheck2 className="h-4 w-4 text-primary" />
              {acceptSlot ? fmtSlot(acceptSlot, acceptFor?.timezone) : ""}
            </div>
            <p className="text-xs text-muted-foreground">
              {tx("The other proposed time will be released.", "L'altro orario proposto verrà liberato.")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptFor(null)} disabled={!!working}>{tx("Cancel", "Annulla")}</Button>
            <Button onClick={handleAccept} disabled={!acceptSlot || !!working}>
              {working ? tx("Confirming…", "Conferma in corso…") : tx("Confirm meeting", "Conferma il colloquio")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter dialog — propose 2 new date+time options */}
      <Dialog open={!!counterFor} onOpenChange={(o) => { if (!o) setCounterFor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("Propose new times", "Proponi nuovi orari")}{counterFor?.title ? ` — ${counterFor.title}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{tx("Option 1 (date & time)", "Opzione 1 (data e orario)")}</Label>
                <Input
                  type="datetime-local"
                  value={counterForm.slot1}
                  onChange={(e) => setCounterForm({ ...counterForm, slot1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tx("Option 2 (date & time)", "Opzione 2 (data e orario)")}</Label>
                <Input
                  type="datetime-local"
                  value={counterForm.slot2}
                  onChange={(e) => setCounterForm({ ...counterForm, slot2: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tx("Timezone", "Fuso orario")}</Label>
              <Input
                placeholder={tx("e.g. CET, GMT, EST", "es. CET, GMT, EST")}
                value={counterForm.timezone}
                onChange={(e) => setCounterForm({ ...counterForm, timezone: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{tx("Shown next to the times as a label — no automatic conversion.", "Viene mostrato accanto agli orari come etichetta — nessuna conversione automatica.")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterFor(null)} disabled={!!working}>{tx("Cancel", "Annulla")}</Button>
            <Button onClick={handleCounter} disabled={!!working}>
              {working ? tx("Sending…", "Invio in corso…") : tx("Propose new times", "Proponi nuovi orari")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default StudentScheduledEventsTab;
