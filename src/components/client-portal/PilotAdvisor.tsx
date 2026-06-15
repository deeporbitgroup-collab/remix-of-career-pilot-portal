import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  ChevronRight,
  ChevronLeft,
  PhoneCall,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ShoppingCart,
  Briefcase,
  GraduationCap,
  ArrowLeftRight,
  Check,
  Loader2,
  Download,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PilotService {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categorySubtitle?: string;
  image?: string;
  pdfPath?: string | null;
  requiresAssociate?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: PilotService[];
  onBookFreeCall: () => void;
  /** Called when user clicks "Select Associate" on a recommended service */
  onSelectAssociate: (serviceName: string, category: string) => void;
  onDirectAddToCart?: (serviceName: string, category: string) => void;
  onViewDetails?: (serviceName: string, category: string) => void;
  /** Called when user clicks "Download PDF overview" */
  onDownloadPdf?: (serviceName: string, category: string) => void;
  /** Called when the user closes/exits the advisor (X button). Should navigate away. */
  onExit?: () => void;
}

type AssistantPayload = {
  type: "question" | "recommendation" | "book_call";
  title?: string;
  message: string;
  multi_select?: boolean;
  options?: string[];
  service_names?: string[];
  services?: PilotService[];
  reasoning?: string;
};

const categoryIcon: Record<string, any> = {
  "Take Off": Plane,
  "Summit": GraduationCap,
  "Altitude": Briefcase,
  "Layover": ArrowLeftRight,
};

const PilotAdvisor = ({
  open,
  onOpenChange,
  services,
  onBookFreeCall,
  onSelectAssociate,
  onDirectAddToCart,
  onViewDetails,
  onDownloadPdf,
  onExit,
}: Props) => {
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [current, setCurrent] = useState<AssistantPayload | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const totalSteps = 2;

  const hydratePayload = (payload: AssistantPayload): AssistantPayload => {
    if (payload.type !== "recommendation") return payload;
    const requested = payload.services || [];
    const names = payload.service_names || requested.map((s) => s.name);
    const hydrated = requested.length > 0
      ? requested.map((item) => services.find((s) => s.name === item.name && s.category === item.category) || item)
      : names
          .map((name) => services.find((s) => s.name === name))
          .filter(Boolean) as PilotService[];
    return { ...payload, services: hydrated, service_names: hydrated.map((s) => s.name) };
  };

  const callAdvisor = async (
    nextHistory: { role: "user" | "assistant"; content: string }[],
  ) => {
    setLoading(true);
    setSelected([]);
    try {
      const { data, error } = await supabase.functions.invoke("service-advisor-chat", {
        body: { services, history: nextHistory },
      });
      if (error) throw error;
      const payload = hydratePayload(data as AssistantPayload);
      setCurrent(payload);
      setHistory([...nextHistory, { role: "assistant", content: JSON.stringify(payload) }]);
    } catch (e) {
      console.error(e);
      toast.error("The Pilot Advisor is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !current && !loading) {
      setStep(0);
      callAdvisor([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleReset = () => {
    setHistory([]);
    setCurrent(null);
    setSelected([]);
    setStep(0);
    setTimeout(() => callAdvisor([]), 0);
  };

  const handleBack = () => {
    // Drop the last user turn + last assistant turn, re-call advisor
    const trimmed = [...history];
    // remove trailing assistant
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") trimmed.pop();
    // remove last user
    if (trimmed.length && trimmed[trimmed.length - 1].role === "user") trimmed.pop();
    // remove preceding assistant (the previous question) so we re-ask cleanly
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") trimmed.pop();
    setStep((s) => Math.max(0, s - 1));
    setSelected([]);
    setHistory(trimmed);
    callAdvisor(trimmed);
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      setHistory([]);
      setCurrent(null);
      setSelected([]);
      setStep(0);
      onOpenChange(false);
      if (onExit) onExit();
      return;
    }
    onOpenChange(o);
  };

  const handleToggle = (opt: string) => {
    if (!current || current.type !== "question") return;
    if (current.multi_select) {
      setSelected((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
      );
    } else {
      setSelected([opt]);
      // auto-advance on single-select
      setTimeout(() => submitAnswer([opt]), 200);
    }
  };

  const submitAnswer = async (answers?: string[]) => {
    const ans = answers ?? selected;
    if (ans.length === 0) return;
    const userContent = ans.join(" • ");
    const nextHistory = [...history, { role: "user" as const, content: userContent }];
    setStep((s) => Math.min(s + 1, totalSteps));
    await callAdvisor(nextHistory);
  };

  const userAnswerCount = history.filter((h) => h.role === "user").length;
  const canGoBack = userAnswerCount > 0 && current?.type === "question";

  const progressPct = useMemo(() => {
    if (current?.type === "recommendation" || current?.type === "book_call") return 100;
    return Math.min(100, (step / totalSteps) * 100);
  }, [step, current]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-screen h-[100dvh] sm:h-screen max-w-none p-0 gap-0 border-0 rounded-none overflow-hidden bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(223,83%,18%)] to-[hsl(215,80%,30%)]"
      >
        <DialogTitle className="sr-only">Pilot Advisor</DialogTitle>
        <DialogDescription className="sr-only">
          Answer a few questions and we'll match you with the perfect CareerPilot service.
        </DialogDescription>

        {/* Animated sky background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-secondary/25 blur-3xl animate-pulse" />
          <div
            className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-primary/30 blur-3xl animate-pulse"
            style={{ animationDelay: "1.2s" }}
          />
          <div
            className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-white/5 blur-3xl animate-pulse"
            style={{ animationDelay: "0.6s" }}
          />
          {/* twinkling stars */}
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white/70 animate-pulse"
              style={{
                top: `${(i * 53) % 100}%`,
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 7) * 0.3}s`,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 sm:px-10 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md ring-1 ring-white/30 shadow-2xl">
                <Plane className="h-6 w-6 text-white -rotate-12" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-[hsl(222,47%,11%)] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Pilot Advisor
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 ring-1 ring-white/25">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                </span>
              </div>
              <p className="text-xs text-white/70 hidden sm:block">
                Your personal co-pilot — let's find your perfect service.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={loading}
                className="text-white/80 hover:text-white hover:bg-white/10 text-xs h-9"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
            )}
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-white/80 hover:text-white hover:bg-white/10 text-xs h-9"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restart
              </Button>
            )}
            <button
              onClick={() => handleClose(false)}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 px-5 sm:px-10">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-secondary via-white to-primary transition-all duration-700 ease-out shadow-[0_0_12px_hsl(var(--secondary)/0.8)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] uppercase tracking-widest text-white/50 font-semibold">
            <span>Take off</span>
            <span>{current?.type === "recommendation" ? "Landed" : `Step ${Math.min(step + 1, totalSteps)}/${totalSteps}`}</span>
            <span>Destination</span>
          </div>
        </div>

        {/* Body */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-10 py-8 sm:py-12">
          <div className="mx-auto max-w-3xl">
            {loading && !current && (
              <div className="flex flex-col items-center justify-center py-20 text-white/80 gap-4">
                <div className="relative">
                  <Plane className="h-10 w-10 text-white animate-[pilot-fly_2s_ease-in-out_infinite] -rotate-12" />
                </div>
                <p className="text-sm">Preparing your flight plan…</p>
              </div>
            )}

            {current?.type === "question" && (
              <QuestionStep
                payload={current}
                selected={selected}
                loading={loading}
                onToggle={handleToggle}
                onSubmit={() => submitAnswer()}
                onBack={handleBack}
                canGoBack={canGoBack}
              />
            )}

            {current?.type === "recommendation" && current.services && (
              <RecommendationStep
                payload={current}
                onSelectAssociate={(name) => {
                  const service = current.services?.find((s) => s.name === name);
                  // Keep advisor mounted — parent opens GuestAssociateSelector on top
                  // and navigates to checkout after the associate is picked.
                  onSelectAssociate(name, service?.category || "");
                }}
                onDownloadPdf={onDownloadPdf}
                onViewDetails={onViewDetails}
                onDirectAddToCart={onDirectAddToCart}
                onBookCall={onBookFreeCall}
                onReset={handleReset}
                onBack={handleBack}
              />
            )}

            {current?.type === "book_call" && (
              <BookCallStep payload={current} onBookCall={onBookFreeCall} onReset={handleReset} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur px-5 sm:px-10 py-3 text-xs text-white/70 flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-1.5">
            <Plane className="h-3 w-3 text-white" />
            Recommendations come exclusively from CareerPilot's verified catalog.
          </span>
          <button
            onClick={onBookFreeCall}
            className="inline-flex items-center gap-1 text-white hover:underline font-semibold"
          >
            <PhoneCall className="h-3 w-3" /> Talk to our team
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ---------- Question step ---------- */

const QuestionStep = ({
  payload,
  selected,
  loading,
  onToggle,
  onSubmit,
  onBack,
  canGoBack,
}: {
  payload: AssistantPayload;
  selected: string[];
  loading: boolean;
  onToggle: (opt: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  canGoBack: boolean;
}) => {
  return (
    <div className="animate-fade-in">
      <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
        {payload.title || payload.message}
      </h3>
      {payload.title && (
        <p className="mt-3 text-white/75 text-base sm:text-lg max-w-2xl">{payload.message}</p>
      )}
      {payload.multi_select && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/20 text-white/90 text-[11px] font-semibold uppercase tracking-wider px-3 py-1">
          <Check className="h-3 w-3" /> Select all that apply
        </p>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {payload.options?.map((opt, i) => {
          const active = selected.includes(opt);
          return (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => onToggle(opt)}
              className={[
                "group relative flex items-center justify-between gap-3 text-left rounded-2xl px-5 py-4 transition-all duration-300",
                "ring-1 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed",
                active
                  ? "bg-white text-[hsl(223,83%,18%)] ring-white shadow-[0_10px_40px_hsl(var(--secondary)/0.5)] scale-[1.02]"
                  : "bg-white/10 text-white ring-white/20 hover:bg-white/20 hover:ring-white/40 hover:-translate-y-0.5",
              ].join(" ")}
            >
              <span className="font-semibold text-base">{opt}</span>
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/15 text-white/70 group-hover:bg-white/30",
                ].join(" ")}
              >
                {active ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>

      {payload.multi_select && (
        <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
          {canGoBack ? (
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              disabled={loading}
              className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : <span />}
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-white/70 text-sm">{selected.length} selected</span>
            <Button
              size="lg"
              onClick={onSubmit}
              disabled={loading || selected.length === 0}
              className="bg-white text-[hsl(223,83%,18%)] hover:bg-white/90 font-bold shadow-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-1" />
              )}
              Continue
            </Button>
          </div>
        </div>
      )}

      {!payload.multi_select && canGoBack && (
        <div className="mt-8 flex">
          <Button
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={loading}
            className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to previous question
          </Button>
        </div>
      )}

      {loading && !payload.multi_select && (
        <div className="mt-8 flex items-center gap-2 text-white/70 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Charting your path…
        </div>
      )}
    </div>
  );
};

/* ---------- Recommendation step ---------- */

const RecommendationStep = ({
  payload,
  onSelectAssociate,
  onDirectAddToCart,
  onDownloadPdf,
  onViewDetails,
  onBookCall,
  onReset,
  onBack,
}: {
  payload: AssistantPayload;
  onSelectAssociate: (name: string) => void;
  onDirectAddToCart?: (serviceName: string, category: string) => void;
  onDownloadPdf?: (serviceName: string, category: string) => void;
  onViewDetails?: (serviceName: string, category: string) => void;
  onBookCall: () => void;
  onReset: () => void;
  onBack: () => void;
}) => {
  const list = payload.services || [];
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-[hsl(223,83%,18%)] text-[11px] font-extrabold px-3 py-1.5 shadow">
          <CheckCircle2 className="h-3.5 w-3.5" /> YOUR MATCH{list.length > 1 ? "ES" : ""}
        </span>
      </div>
      <h3 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
        {payload.title || "We found your fit"}
      </h3>
      <p className="mt-3 text-white/80 text-base sm:text-lg max-w-2xl">
        {payload.reasoning || payload.message}
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {list.map((s, idx) => {
          const Icon = categoryIcon[s.category] || Plane;
          return (
            <Card
              key={`${s.category}-${s.name}-${idx}`}
              className="group relative overflow-hidden flex flex-col border-primary/20 bg-card shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-primary/20"
            >
              <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/15 via-primary/10 to-secondary/15">
                {s.image ? (
                  <>
                    <img
                      src={s.image}
                      alt={`${s.name} preview`}
                      className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="h-20 w-20 text-primary/30" />
                  </div>
                )}
                <div className="absolute top-3 left-3 z-10">
                  <Badge variant="secondary" className="backdrop-blur-md bg-background/80 border border-primary/20 text-foreground font-semibold gap-1.5 shadow-sm">
                    <Icon className="h-3.5 w-3.5 text-primary" /> {s.category}
                  </Badge>
                </div>
                <div className="absolute bottom-3 right-3 z-10">
                  <Badge className="text-base font-bold whitespace-nowrap bg-primary text-primary-foreground shadow-lg px-3 py-1.5">
                    {s.price > 0 ? `€${s.price.toFixed(2)}` : "On request"}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors">
                  {s.name}
                </CardTitle>
                <CardDescription className="text-sm line-clamp-3 mt-1">
                  {s.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 mt-auto pt-0">
                <div className="flex gap-2">
                  {s.pdfPath && onDownloadPdf && (
                    <Button
                      variant="outline"
                      onClick={() => onDownloadPdf(s.name, s.category)}
                      className="flex-1 border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Download className="h-4 w-4 mr-2" /> PDF overview
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => onViewDetails?.(s.name, s.category)}
                    className="flex-1 border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Info className="h-4 w-4 mr-2" /> Full Details
                  </Button>
                </div>
                {s.requiresAssociate === false ? (
                  <Button
                    onClick={() => onDirectAddToCart?.(s.name, s.category)}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md font-bold text-base"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart
                  </Button>
                ) : (
                  <Button
                    onClick={() => onSelectAssociate(s.name)}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md font-bold text-base"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" /> Select Associate
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
          className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 hover:text-white"
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Start over
        </Button>
        <Button
          variant="outline"
          onClick={onBookCall}
          className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 hover:text-white"
        >
          <PhoneCall className="h-4 w-4 mr-2" /> Not sure? Talk to our team
        </Button>
      </div>
    </div>
  );
};

/* ---------- Book call fallback ---------- */

const BookCallStep = ({
  payload,
  onBookCall,
  onReset,
}: {
  payload: AssistantPayload;
  onBookCall: () => void;
  onReset: () => void;
}) => (
  <div className="animate-fade-in max-w-xl">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 mb-6">
      <PhoneCall className="h-8 w-8 text-white" />
    </div>
    <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
      {payload.title || "Let's talk it through"}
    </h3>
    <p className="mt-3 text-white/80 text-base sm:text-lg">
      {payload.message}
    </p>
    <div className="mt-8 flex flex-wrap gap-3">
      <Button
        size="lg"
        onClick={onBookCall}
        className="bg-white text-[hsl(223,83%,18%)] hover:bg-white/90 font-bold shadow-xl"
      >
        <PhoneCall className="h-4 w-4 mr-2" /> Book a free call
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={onReset}
        className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 hover:text-white"
      >
        <RotateCcw className="h-4 w-4 mr-2" /> Try again
      </Button>
    </div>
  </div>
);

export default PilotAdvisor;
