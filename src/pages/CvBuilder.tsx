import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { CvPreview } from "@/components/cv-builder/CvPreview";
import { CvEntryListEditor } from "@/components/cv-builder/CvEntryListEditor";
import { CvBuilderMode, CvChatTurn, CvData, EMPTY_CV_DATA } from "@/lib/cvBuilder/types";
import { FileEdit, Sparkles, Loader2, Send, Printer, RotateCcw, AlertTriangle } from "lucide-react";

type Step = "mode" | "paste" | "interview" | "result";

export default function CvBuilder() {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<CvBuilderMode | null>(null);
  const [rawCv, setRawCv] = useState("");
  const [history, setHistory] = useState<CvChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [cvData, setCvData] = useState<CvData>(EMPTY_CV_DATA);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history]);

  const [overflowing, setOverflowing] = useState(false);

  const startInterview = async (m: CvBuilderMode, initialRawCv?: string) => {
    setMode(m);
    setBusy(true);
    setStep("interview");
    try {
      const { data, error } = await supabase.functions.invoke("cv-ai", {
        body: { action: "ask", mode: m, history: [], rawCv: initialRawCv ?? "" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setQuestion(data.question);
    } catch (e) {
      toast({ title: "Errore", description: (e as Error).message, variant: "destructive" });
      setStep("mode");
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || busy) return;
    const newHistory = [...history, { role: "assistant" as const, text: question }, { role: "user" as const, text: answer }];
    setHistory(newHistory);
    setAnswer("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("cv-ai", {
        body: { action: "ask", mode, history: newHistory, rawCv },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data.isComplete) {
        await compile(newHistory);
      } else {
        setQuestion(data.question);
      }
    } catch (e) {
      toast({ title: "Errore", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const compile = async (finalHistory: CvChatTurn[]) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("cv-ai", {
        body: { action: "compile", mode, history: finalHistory, rawCv },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCvData(data.data);
      setStep("result");
    } catch (e) {
      toast({ title: "Errore nella compilazione", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep("mode");
    setMode(null);
    setRawCv("");
    setHistory([]);
    setQuestion("");
    setAnswer("");
    setCvData(EMPTY_CV_DATA);
  };

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> CV Builder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            L'AI intervista, tu rispondi: il CV viene compilato in un formato professionale a una pagina.
          </p>
        </div>

        {step === "mode" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-6 cursor-pointer hover:border-primary transition-colors" onClick={() => setStep("paste")}>
              <FileEdit className="h-6 w-6 mb-2 text-primary" />
              <h2 className="font-semibold mb-1">Migliora un CV esistente</h2>
              <p className="text-sm text-muted-foreground">
                Hai già un CV o degli appunti: incollali e l'AI li riscrive e riformatta nel nostro formato.
              </p>
            </Card>
            <Card className="p-6 cursor-pointer hover:border-primary transition-colors" onClick={() => startInterview("scratch")}>
              <Sparkles className="h-6 w-6 mb-2 text-primary" />
              <h2 className="font-semibold mb-1">Costruiscilo da zero</h2>
              <p className="text-sm text-muted-foreground">
                Non hai niente di pronto: rispondi alle domande e l'AI scrive tutto il CV per te.
              </p>
            </Card>
          </div>
        )}

        {step === "paste" && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Incolla il tuo CV o i tuoi testi</h2>
            <Textarea
              rows={12}
              placeholder="Incolla qui il testo del tuo CV attuale (anche disordinato, ci pensa l'AI a riscriverlo)..."
              value={rawCv}
              onChange={(e) => setRawCv(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("mode")}>Indietro</Button>
              <Button onClick={() => startInterview("improve", rawCv)}>Continua</Button>
            </div>
          </Card>
        )}

        {step === "interview" && (
          <Card className="p-0 overflow-hidden flex flex-col h-[70vh]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {history.map((t, i) => (
                <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      t.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {t.text}
                  </div>
                </div>
              ))}
              {question && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-muted">{question}</div>
                </div>
              )}
              {busy && (
                <div className="flex justify-start">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="border-t p-3 flex gap-2">
              <Input
                placeholder="Scrivi la tua risposta..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                disabled={busy}
              />
              <Button onClick={submitAnswer} disabled={busy || !answer.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === "result" && (
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
            <div className="order-2 lg:order-1">
              <Tabs defaultValue="preview">
                <div className="flex items-center justify-between mb-3">
                  <TabsList>
                    <TabsTrigger value="preview">Anteprima</TabsTrigger>
                    <TabsTrigger value="edit">Modifica</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={restart}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Ricomincia
                    </Button>
                    <Button size="sm" onClick={() => window.print()}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Scarica PDF
                    </Button>
                  </div>
                </div>
                <TabsContent value="preview">
                  {overflowing && (
                    <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Il contenuto è troppo lungo per stare leggibile su una pagina: alcune righe in fondo potrebbero non essere visibili. Accorcia qualche bullet in "Modifica".
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <CvPreview data={cvData} onOverflow={setOverflowing} />
                  </div>
                </TabsContent>
                <TabsContent value="edit">
                  <CvEditForm data={cvData} onChange={setCvData} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CvEditForm({ data, onChange }: { data: CvData; onChange: (d: CvData) => void }) {
  const set = <K extends keyof CvData>(key: K, value: CvData[K]) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Header</h3>
        <Input placeholder="Nome completo" value={data.header.fullName} onChange={(e) => set("header", { ...data.header, fullName: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Località" value={data.header.location} onChange={(e) => set("header", { ...data.header, location: e.target.value })} />
          <Input placeholder="Telefono" value={data.header.phone} onChange={(e) => set("header", { ...data.header, phone: e.target.value })} />
          <Input placeholder="Email" value={data.header.email} onChange={(e) => set("header", { ...data.header, email: e.target.value })} />
          <Input placeholder="LinkedIn" value={data.header.linkedin} onChange={(e) => set("header", { ...data.header, linkedin: e.target.value })} />
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Professional Summary</h3>
        <Textarea rows={3} value={data.summary} onChange={(e) => set("summary", e.target.value)} />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Education</h3>
        <CvEntryListEditor entries={data.education} onChange={(v) => set("education", v)} orgLabel="Istituzione" roleLabel="Corso / laurea" />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Professional Experience</h3>
        <CvEntryListEditor entries={data.experience} onChange={(v) => set("experience", v)} orgLabel="Azienda" roleLabel="Ruolo" />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Leadership & Entrepreneurship (opzionale)</h3>
        <CvEntryListEditor entries={data.leadership} onChange={(v) => set("leadership", v)} orgLabel="Organizzazione" roleLabel="Ruolo" />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Community & Volunteering (opzionale)</h3>
        <Textarea
          rows={3}
          placeholder="Una voce per riga"
          value={data.community.join("\n")}
          onChange={(e) => set("community", e.target.value.split("\n"))}
        />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Additional Information (opzionale)</h3>
        {data.additionalInfo.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
            <Input
              placeholder="Etichetta (es. Languages)"
              value={item.label}
              onChange={(e) =>
                set("additionalInfo", data.additionalInfo.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <Input
              placeholder="Testo"
              value={item.text}
              onChange={(e) =>
                set("additionalInfo", data.additionalInfo.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => set("additionalInfo", data.additionalInfo.filter((_, idx) => idx !== i))}
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => set("additionalInfo", [...data.additionalInfo, { label: "", text: "" }])}
        >
          Aggiungi voce
        </Button>
      </Card>
    </div>
  );
}
