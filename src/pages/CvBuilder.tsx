import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { CvPreview } from "@/components/cv-builder/CvPreview";
import { CvEntryListEditor } from "@/components/cv-builder/CvEntryListEditor";
import { CvBuilderMode, CvData, EMPTY_CV_DATA } from "@/lib/cvBuilder/types";
import { FileEdit, Sparkles, Loader2, Download, RotateCcw, AlertTriangle } from "lucide-react";

type Step = "mode" | "paste" | "form" | "result";

async function downloadCvPdf(data: CvData) {
  const el = document.getElementById("cv-print-root");
  if (!el) return;
  // scale 2 + JPEG keeps the file crisp but small (PNG at scale 3 produced
  // ~24MB for a single page — way too heavy to download/email).
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidth, pageHeight);
  const fileName = (data.header.fullName || "CV").trim().replace(/\s+/g, "_") || "CV";
  pdf.save(`${fileName}_CV.pdf`);
}

export default function CvBuilder() {
  const [step, setStep] = useState<Step>("mode");
  const [rawCv, setRawCv] = useState("");
  const [draft, setDraft] = useState<CvData>(EMPTY_CV_DATA);
  const [busy, setBusy] = useState(false);
  const [cvData, setCvData] = useState<CvData>(EMPTY_CV_DATA);
  const [overflowing, setOverflowing] = useState(false);
  const autoDownloadedRef = useRef(false);

  const compile = async (mode: CvBuilderMode, body: { rawCv?: string; rawData?: CvData }) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("cv-ai", {
        body: { action: "compile", mode, ...body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCvData(data.data);
      setStep("result");
      autoDownloadedRef.current = false;
      // Let the preview mount and auto-fit to one page before capturing it.
      setTimeout(async () => {
        if (autoDownloadedRef.current) return;
        autoDownloadedRef.current = true;
        try {
          await downloadCvPdf(data.data);
        } catch {
          // Silent — the user can still use the manual "Download PDF" button.
        }
      }, 500);
    } catch (e) {
      toast({ title: "Something went wrong", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep("mode");
    setRawCv("");
    setDraft(EMPTY_CV_DATA);
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
            Give us your information and our AI will write it up and format it into a polished, professional one-page CV.
          </p>
        </div>

        {step === "mode" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-6 cursor-pointer hover:border-primary transition-colors" onClick={() => setStep("paste")}>
              <FileEdit className="h-6 w-6 mb-2 text-primary" />
              <h2 className="font-semibold mb-1">Improve an existing CV</h2>
              <p className="text-sm text-muted-foreground">
                Already have a CV or some notes? Paste them in and our AI will rewrite and reformat them for you.
              </p>
            </Card>
            <Card className="p-6 cursor-pointer hover:border-primary transition-colors" onClick={() => setStep("form")}>
              <Sparkles className="h-6 w-6 mb-2 text-primary" />
              <h2 className="font-semibold mb-1">Build from scratch</h2>
              <p className="text-sm text-muted-foreground">
                Nothing ready yet? Fill in your information in the form and our AI will write your whole CV for you.
              </p>
            </Card>
          </div>
        )}

        {step === "paste" && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Paste your CV or your notes</h2>
            <Textarea
              rows={12}
              placeholder="Paste your current CV text here (even messy — our AI will rewrite it)..."
              value={rawCv}
              onChange={(e) => setRawCv(e.target.value)}
              disabled={busy}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("mode")} disabled={busy}>Back</Button>
              <Button onClick={() => compile("improve", { rawCv })} disabled={busy || !rawCv.trim()}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Rewrite with AI
              </Button>
            </div>
          </Card>
        )}

        {step === "form" && (
          <div className="space-y-4">
            <CvEditForm data={draft} onChange={setDraft} />
            <div className="flex gap-2 max-w-2xl">
              <Button variant="outline" onClick={() => setStep("mode")} disabled={busy}>Back</Button>
              <Button onClick={() => compile("scratch", { rawData: draft })} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Generate my CV
              </Button>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
            <div className="order-2 lg:order-1">
              <Tabs defaultValue="preview">
                <div className="flex items-center justify-between mb-3">
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={restart}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Start over
                    </Button>
                    <Button size="sm" onClick={() => downloadCvPdf(cvData)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                    </Button>
                  </div>
                </div>
                <TabsContent value="preview">
                  {overflowing && (
                    <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Your content is too long to stay readable on one page — some lines near the bottom may be cut off. Try shortening a few bullets in "Edit".
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
        <Input placeholder="Full name" value={data.header.fullName} onChange={(e) => set("header", { ...data.header, fullName: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Location" value={data.header.location} onChange={(e) => set("header", { ...data.header, location: e.target.value })} />
          <Input placeholder="Phone" value={data.header.phone} onChange={(e) => set("header", { ...data.header, phone: e.target.value })} />
          <Input placeholder="Email" value={data.header.email} onChange={(e) => set("header", { ...data.header, email: e.target.value })} />
          <Input placeholder="LinkedIn" value={data.header.linkedin} onChange={(e) => set("header", { ...data.header, linkedin: e.target.value })} />
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Professional Summary</h3>
        <Textarea
          rows={3}
          placeholder="Leave blank to have the AI write it based on the rest of your CV"
          value={data.summary}
          onChange={(e) => set("summary", e.target.value)}
        />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Education</h3>
        <CvEntryListEditor entries={data.education} onChange={(v) => set("education", v)} orgLabel="Institution" roleLabel="Degree / program" />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Professional Experience</h3>
        <CvEntryListEditor entries={data.experience} onChange={(v) => set("experience", v)} orgLabel="Company" roleLabel="Role" />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Leadership & Entrepreneurship (optional)</h3>
        <CvEntryListEditor entries={data.leadership} onChange={(v) => set("leadership", v)} orgLabel="Organization" roleLabel="Role" />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Community & Volunteering (optional)</h3>
        <Textarea
          rows={3}
          placeholder="One entry per line"
          value={data.community.join("\n")}
          onChange={(e) => set("community", e.target.value.split("\n"))}
        />
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Additional Information (optional)</h3>
        {data.additionalInfo.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
            <Input
              placeholder="Label (e.g. Languages)"
              value={item.label}
              onChange={(e) =>
                set("additionalInfo", data.additionalInfo.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <Input
              placeholder="Text"
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
          Add entry
        </Button>
      </Card>
    </div>
  );
}
