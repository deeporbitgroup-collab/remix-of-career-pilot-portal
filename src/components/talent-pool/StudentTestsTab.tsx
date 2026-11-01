import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ClipboardCheck, ExternalLink, Building2, Hourglass, CheckCircle2, Clock } from "lucide-react";
import { useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";

interface Test {
  id: string;
  title: string | null;
  instructions: string | null;
  link: string | null;
  due_at: string | null;
  timezone: string | null;
  status: "SENT" | "SUBMITTED" | "PASSED" | "FAILED" | "CANCELLED";
  outcome: string | null;
  company: { company_name: string | null; logo_url: string | null } | null;
}

const getStatusBadge = (tx: (en: string, it: string) => string): Record<Test["status"], { label: string; className: string }> => ({
  SENT: { label: tx("To do", "Da fare"), className: "bg-amber-100 text-amber-800 border-amber-200" },
  SUBMITTED: { label: tx("Submitted", "Inviato"), className: "bg-cbsky-100 text-cbsky-800 border-cbsky-200" },
  PASSED: { label: tx("Passed", "Superato"), className: "bg-cbind-100 text-cbind-800 border-cbind-200" },
  FAILED: { label: tx("Not passed", "Non superato"), className: "bg-rose-100 text-rose-800 border-rose-200" },
  CANCELLED: { label: tx("Cancelled", "Annullato"), className: "bg-muted text-muted-foreground" },
});

const fmtDeadline = (value?: string | null, tz?: string | null, locale?: string) => {
  if (!value) return "";
  const d = new Date(value);
  const label = isNaN(d.getTime()) ? value : d.toLocaleDateString(locale);
  return tz ? `${label} (${tz})` : label;
};

const StudentTestsTab = ({ studentId, onTestsChange }: { studentId: string; onTestsChange?: () => void }) => {
  const { toast } = useToast();
  const { tx, language } = useTalentPoolLanguage();
  const statusBadge = getStatusBadge(tx);
  const dateLocale = language === "it" ? "it-IT" : "en-US";
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase.functions.invoke("get-recruiting-tests", { body: { studentId } });
      if (error) throw error;
      setTests(Array.isArray(data) ? (data as Test[]) : []);
      onTestsChange?.();
    } catch (e) {
      console.error("Error loading tests:", e);
    } finally {
      setLoading(false);
    }
  }, [studentId, onTestsChange]);

  useEffect(() => { load(); }, [load]);

  const submit = async (t: Test) => {
    setWorking(t.id);
    try {
      const { error } = await supabase.functions.invoke("recruiting-test-action", {
        body: { action: "submit", testId: t.id },
      });
      if (error) throw error;
      toast({ title: tx("Marked as completed", "Segnato come completato"), description: tx("The company and CareerBoost have been notified.", "L'azienda e CareerBoost sono stati avvisati.") });
      await load();
    } catch (e: any) {
      console.error("Submit test error:", e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Could not submit the test", "Impossibile inviare il test"), variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const companyName = (t: Test) => t.company?.company_name || tx("A company", "Un'azienda");

  const renderCard = (t: Test) => {
    const badge = statusBadge[t.status];
    const busy = working === t.id;
    return (
      <div key={t.id} className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={t.company?.logo_url || undefined} />
              <AvatarFallback><Building2 className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{t.title || tx("Test", "Test")}</p>
              <p className="text-sm text-muted-foreground truncate">{companyName(t)}</p>
            </div>
          </div>
          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
        </div>

        {t.due_at && (
          <p className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {tx("Deadline:", "Scadenza:")} <strong>{fmtDeadline(t.due_at, t.timezone, dateLocale)}</strong>
          </p>
        )}
        {t.instructions && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.instructions}</p>}
        {t.outcome && <p className="text-sm text-muted-foreground">{t.outcome}</p>}

        {t.link && t.status !== "CANCELLED" && (
          <a
            href={t.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> {tx("Open test", "Apri il test")}
          </a>
        )}

        {t.status === "SENT" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={busy} className="w-full sm:w-auto">
                <CheckCircle2 className="h-4 w-4 mr-1" /> {tx("I've completed it", "L'ho completato")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{tx("Mark this test as completed?", "Segnare questo test come completato?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {tx(
                    `${companyName(t)} and CareerBoost will be notified that you finished the test${t.title ? ` "${t.title}"` : ""}.`,
                    `${companyName(t)} e CareerBoost riceveranno una notifica che hai completato il test${t.title ? ` "${t.title}"` : ""}.`
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tx("Cancel", "Annulla")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => submit(t)}>{tx("Yes, I've completed it", "Sì, l'ho completato")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {t.status === "SUBMITTED" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5" /> {tx(`Waiting for ${companyName(t)} to review it`, `In attesa della valutazione di ${companyName(t)}`)}
          </p>
        )}
      </div>
    );
  };

  const todo = tests.filter((t) => t.status === "SENT");
  const submitted = tests.filter((t) => t.status === "SUBMITTED");
  const closed = tests.filter((t) => ["PASSED", "FAILED", "CANCELLED"].includes(t.status));

  const Section = ({ title, items }: { title: string; items: Test[] }) =>
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
          <ClipboardCheck className="h-5 w-5 text-primary" /> {tx("Assessments", "Test di valutazione")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">{tx("Loading tests…", "Caricamento test…")}</p>
        ) : tests.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {tx(
                "No tests yet. When a company assigns you a test or assessment, it will appear here.",
                "Ancora nessun test. Quando un'azienda ti assegnerà un test o una prova di valutazione, lo troverai qui."
              )}
            </p>
          </div>
        ) : (
          <>
            <Section title={tx("To complete", "Da completare")} items={todo} />
            <Section title={tx("Submitted", "Inviati")} items={submitted} />
            <Section title={tx("Closed", "Chiusi")} items={closed} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentTestsTab;
