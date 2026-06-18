import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plane, GraduationCap, Briefcase, ArrowLeftRight, ChevronLeft, Info, Download, ArrowRight, Sparkles } from "lucide-react";

// Minimal service shape we need here (a row from client_services).
interface Svc {
  id: string;
  category: string;
  name: string;
  description: string;
}

interface Phase {
  key: string;
  category: string; // maps to a package vertical
  label: string;
  icon: typeof Plane;
}

interface Situation {
  label: string;
  // first service in the category whose name matches wins
  match: RegExp;
}

const PHASES: Phase[] = [
  { key: "university", category: "Take Off", label: "Highschool → University", icon: Plane },
  { key: "master", category: "Summit", label: "University → Master", icon: GraduationCap },
  { key: "work", category: "Altitude", label: "Internship / Work", icon: Briefcase },
  { key: "transfer", category: "Layover", label: "University Transfer", icon: ArrowLeftRight },
];

// Per-phase situations → the single product that fits. Order matters (first match wins).
const SITUATIONS: Record<string, Situation[]> = {
  university: [
    { label: "I know my target university and want an entry + study plan with material", match: /timeline|roadmap/i },
    { label: "I want in-depth info on one specific university", match: /in-?depth/i },
    { label: "I'm undecided between two universities", match: /comparative/i },
    { label: "I just want 1:1 time with a mentor who got in", match: /office hours/i },
  ],
  master: [
    { label: "I want an entry + study plan for my target master", match: /timeline|roadmap/i },
    { label: "I want my CV / cover letter rewritten", match: /cv|cover/i },
    { label: "I want in-depth info on one specific program", match: /in-?depth/i },
    { label: "I'm undecided between two programs", match: /comparative/i },
    { label: "I just want 1:1 time with a mentor", match: /office hours/i },
  ],
  work: [
    { label: "I want a full career roadmap to break into my field", match: /roadmap|timeline/i },
    { label: "I want my CV / cover letter rewritten", match: /cv|cover/i },
    { label: "I want insights on a specific role or company", match: /insight/i },
    { label: "I want a 1:1 session with an expert in the field", match: /expert|session/i },
    { label: "I want help landing interviews (outreach)", match: /outreach/i },
  ],
  transfer: [
    { label: "I want to check if I'm eligible to transfer", match: /eligibility/i },
    { label: "I want an entry + study plan for my target university", match: /timeline|roadmap/i },
    { label: "I want in-depth info on one specific university", match: /in-?depth/i },
    { label: "I'm undecided between two universities", match: /comparative/i },
  ],
};

interface IndividualProductsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicesByCategory: Record<string, Svc[]>;
  onInfo: (svc: Svc) => void;
  onChoose: (svc: Svc) => void;
  onDownloadDemo: (name: string, category: string) => void;
  hasDemo: (name: string, category: string) => boolean;
}

const IndividualProductsSheet = ({
  open,
  onOpenChange,
  servicesByCategory,
  onInfo,
  onChoose,
  onDownloadDemo,
  hasDemo,
}: IndividualProductsSheetProps) => {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [matched, setMatched] = useState<Svc | null>(null);

  const reset = () => {
    setPhase(null);
    setMatched(null);
  };

  const pickSituation = (sit: Situation) => {
    const list = servicesByCategory[phase!.category] || [];
    const found = list.find((s) => sit.match.test(s.name)) || list[0] || null;
    setMatched(found);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {matched ? "Your recommended product" : phase ? "What's your situation?" : "Individual products"}
          </SheetTitle>
        </SheetHeader>

        {/* STEP 1 — phase */}
        {!phase && (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-muted-foreground">Prefer a single service instead of a full package? Tell us where you are.</p>
            {PHASES.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  onClick={() => setPhase(p)}
                  className="flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-card px-4 py-3 text-left active:scale-[0.98] transition-transform"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-semibold text-foreground">{p.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 2 — situation */}
        {phase && !matched && (
          <div className="mt-2 space-y-2">
            <button onClick={() => setPhase(null)} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {(SITUATIONS[phase.key] || []).map((sit) => (
              <button
                key={sit.label}
                onClick={() => pickSituation(sit)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-left text-sm font-medium active:scale-[0.98] transition-transform"
              >
                {sit.label}
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* STEP 3 — matched product */}
        {phase && matched && (
          <div className="mt-2 space-y-3">
            <button onClick={() => setMatched(null)} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">{phase.label}</p>
              <h3 className="mt-0.5 text-lg font-extrabold text-primary">{matched.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{matched.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onInfo(matched)}>
                  <Info className="mr-1.5 h-4 w-4" /> Read info
                </Button>
                {hasDemo(matched.name, matched.category) && (
                  <Button variant="outline" size="sm" onClick={() => onDownloadDemo(matched.name, matched.category)}>
                    <Download className="mr-1.5 h-4 w-4" /> Demo
                  </Button>
                )}
              </div>
              <Button
                className="mt-3 w-full bg-gradient-to-r from-primary to-secondary font-bold"
                onClick={() => {
                  onChoose(matched);
                  onOpenChange(false);
                  reset();
                }}
              >
                Choose this service & pick your Associate
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default IndividualProductsSheet;
