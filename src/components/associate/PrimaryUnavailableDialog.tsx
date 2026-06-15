import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PrimaryUnavailableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  language: string;
  onDone: () => void;
}

interface CounterSlotInput {
  date?: Date;
  time: string;
}

const PrimaryUnavailableDialog = ({ open, onOpenChange, projectId, language, onDone }: PrimaryUnavailableDialogProps) => {
  const [step, setStep] = useState<"choose" | "propose" | "confirm_decline">("choose");
  const [slots, setSlots] = useState<CounterSlotInput[]>([{ time: "" }, { time: "" }]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("choose");
    setSlots([{ time: "" }, { time: "" }]);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const updateSlot = (index: number, patch: Partial<CounterSlotInput>) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const submitProposal = async () => {
    if (slots.some((s) => !s.date || !s.time)) {
      toast.error(language === "it" ? "Compila entrambi gli slot" : "Fill in both slots");
      return;
    }
    if (format(slots[0].date!, "yyyy-MM-dd") === format(slots[1].date!, "yyyy-MM-dd")) {
      toast.error(language === "it" ? "I 2 slot devono essere in giorni diversi" : "Slots must be on different days");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("handle-primary-response", {
        body: {
          projectId,
          action: "propose_new",
          counterSlots: slots.map((s) => ({
            date: format(s.date!, "yyyy-MM-dd"),
            time: s.time,
          })),
        },
      });
      if (error) throw error;
      toast.success(language === "it" ? "Proposta inviata al cliente" : "Counter-proposal sent to client");
      onDone();
      handleClose(false);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const submitDecline = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-primary-response", {
        body: { projectId, action: "decline_all" },
      });
      if (error) throw error;
      if ((data as any)?.noBackup) {
        toast.success(language === "it" ? "Team Career Pilot avvisato" : "Career Pilot team notified");
      } else {
        toast.success(language === "it" ? "Backup associate attivato" : "Backup associate activated");
      }
      onDone();
      handleClose(false);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            {language === "it" ? "Non disponibile" : "Not available"}
          </DialogTitle>
          <DialogDescription>
            {language === "it"
              ? "Cosa vuoi fare?"
              : "What would you like to do?"}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setStep("propose")}
            >
              <div className="text-left">
                <div className="font-semibold">
                  {language === "it" ? "Proponi 2 nuove fasce orarie" : "Propose 2 alternative time slots"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {language === "it"
                    ? "In giorni diversi. Il cliente potrà accettarne una."
                    : "On different days. The client can accept one."}
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setStep("confirm_decline")}
            >
              <div className="text-left">
                <div className="font-semibold text-destructive">
                  {language === "it" ? "Sono totalmente non disponibile" : "I'm completely unavailable"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {language === "it"
                    ? "L'associate di backup verrà attivato."
                    : "The backup associate will be activated."}
                </div>
              </div>
            </Button>
          </div>
        )}

        {step === "propose" && (
          <div className="space-y-4 pt-2">
            {slots.map((slot, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-3">
                <div className="font-semibold text-sm">
                  {language === "it" ? `Slot ${i + 1}` : `Slot ${i + 1}`}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{language === "it" ? "Data" : "Date"}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal mt-1">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {slot.date ? format(slot.date, "PPP") : (language === "it" ? "Seleziona" : "Pick")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={slot.date}
                          onSelect={(d) => updateSlot(i, { date: d || undefined })}
                          disabled={(d) => d < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs">{language === "it" ? "Orario" : "Time"}</Label>
                    <Input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateSlot(i, { time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("choose")} className="flex-1">
                {language === "it" ? "Indietro" : "Back"}
              </Button>
              <Button onClick={submitProposal} disabled={submitting} className="flex-1">
                {submitting ? "..." : (language === "it" ? "Invia proposta" : "Send proposal")}
              </Button>
            </div>
          </div>
        )}

        {step === "confirm_decline" && (
          <div className="space-y-4 pt-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-md text-sm">
              {language === "it"
                ? "Confermando, il progetto verrà passato all'associate di backup (se presente). Non potrai più gestire questo cliente."
                : "By confirming, the project will be passed to the backup associate (if any). You will no longer manage this client."}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("choose")} className="flex-1">
                {language === "it" ? "Indietro" : "Back"}
              </Button>
              <Button variant="destructive" onClick={submitDecline} disabled={submitting} className="flex-1">
                {submitting ? "..." : (language === "it" ? "Conferma indisponibilità" : "Confirm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrimaryUnavailableDialog;
