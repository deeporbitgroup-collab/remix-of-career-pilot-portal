import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, CalendarClock, User, Mail, Briefcase, MapPin } from "lucide-react";

const sb = supabase as any;

const TIME_RANGES = [
  "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00",
  "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00",
];

export interface OutreachCheckinDialogProps {
  open: boolean;
  onClose: () => void;
  clientId?: string | null;
  defaultName?: string;
  defaultEmail?: string;
  /** Called after the check-in is successfully requested (e.g. to add the item to the cart). */
  onConfirmed?: () => void;
}

const minDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const OutreachCheckinDialog = ({ open, onClose, clientId, defaultName, defaultEmail, onConfirmed }: OutreachCheckinDialogProps) => {
  const [name, setName] = useState(defaultName || "");
  const [email, setEmail] = useState(defaultEmail || "");
  const [sectors, setSectors] = useState("");
  const [cities, setCities] = useState("");
  const [slots, setSlots] = useState([
    { date: "", time: "" }, { date: "", time: "" }, { date: "", time: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const setSlot = (i: number, field: "date" | "time", value: string) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    const filled = slots.filter((s) => s.date && s.time);
    if (filled.length < 3) {
      toast.error("Please pick 3 time slots for your check-in.");
      return;
    }
    const days = filled.map((s) => s.date);
    if (new Set(days).size < 3) {
      toast.error("Please choose 3 different days.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await sb.functions.invoke("outreach-checkin", {
        body: {
          action: "request",
          clientId: clientId || null,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          sectors: sectors.trim() || null,
          cities: cities.trim() || null,
          slots: filled,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Check-in requested! We'll confirm a time by email shortly.");
      onConfirmed?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[94vw] max-w-[460px] mx-auto max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-4 text-white">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Megaphone className="h-4 w-4" />
              </span>
              Book your free Outreach check-in
            </DialogTitle>
            <p className="text-[12px] leading-snug text-white/90">
              The Outreach Power Pack is <strong>pay-per-interview</strong> — €250 only when we secure an interview in your target sectors &amp; cities, no upfront fee. First, a quick free call to explain how it works.
            </p>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-medium"><User className="h-3.5 w-3.5" /> Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="h-10 rounded-lg text-[16px]" />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-medium"><Mail className="h-3.5 w-3.5" /> Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="h-10 rounded-lg text-[16px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-medium"><Briefcase className="h-3.5 w-3.5" /> Sectors of interest <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={sectors} onChange={(e) => setSectors(e.target.value)} placeholder="e.g. consulting, finance" className="h-10 rounded-lg text-[16px]" />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-medium"><MapPin className="h-3.5 w-3.5" /> Cities of interest <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="e.g. London, Milan" className="h-10 rounded-lg text-[16px]" />
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
            <Label className="flex items-center gap-1.5 text-xs font-semibold mb-2">
              <CalendarClock className="h-3.5 w-3.5" /> Pick 3 time slots (different days · Italian time)
            </Label>
            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={s.date}
                    min={minDate}
                    onChange={(e) => setSlot(i, "date", e.target.value)}
                    className="h-10 rounded-lg text-[15px]"
                  />
                  <Select value={s.time} onValueChange={(v) => setSlot(i, "time", v)}>
                    <SelectTrigger className="h-10 rounded-lg text-[15px]"><SelectValue placeholder="Time" /></SelectTrigger>
                    <SelectContent>
                      {TIME_RANGES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-4 text-[15px]">Cancel</Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-11 text-[15px] font-semibold bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Request free check-in"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">No payment now. You only pay €250 per secured interview.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OutreachCheckinDialog;
