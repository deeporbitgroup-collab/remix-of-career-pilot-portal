import { useEffect, useState } from "react";
import {
  X,
  ArrowRight,
  Plane,
  GraduationCap,
  Briefcase,
  Users,
  Compass,
  Newspaper,
  BookOpen,
  Sparkles,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileType2,
  Mail,
  Video,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import JobHubInfoDialog from "./JobHubInfoDialog";

interface EcosystemOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const EcosystemOverlay = ({ isOpen, onClose }: EcosystemOverlayProps) => {
  const { language } = useLanguage();
  const [jobHubOpen, setJobHubOpen] = useState(false);
  const it = language === "it";

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const goToCategory = (cat: string) => {
    window.location.href = `/knowledge-base?category=${encodeURIComponent(cat)}&from=ecosystem`;
  };

  const knowledgeBlocks = [
    {
      title: "Take Off",
      subtitle: it ? "Liceo → Università" : "High School → University",
      desc: it
        ? "Guide, transfer e ammissioni alle migliori università."
        : "Guides, transfers and admissions to top universities.",
      icon: Plane,
      cat: "Take Off & Layover",
    },
    {
      title: "Summit",
      subtitle: it ? "Università → Master" : "University → Master",
      desc: it
        ? "Materiali per applicazioni Master e MBA di prestigio."
        : "Materials for prestigious Master & MBA applications.",
      icon: GraduationCap,
      cat: "Summit",
    },
    {
      title: "Altitude",
      subtitle: it ? "Internship & Carriera" : "Internship & Career",
      desc: it
        ? "Modelli Excel, casi e prep per finance e consulting."
        : "Excel models, cases and prep for finance & consulting.",
      icon: Briefcase,
      cat: "Altitude",
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-background animate-fade-in flex flex-col overflow-hidden">
        {/* Premium atmospheric background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, hsl(var(--secondary) / 0.22), transparent 70%)" }}
          />
          <div
            className="absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.22), transparent 70%)" }}
          />
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-15"
            style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.15), transparent 70%)" }}
          />
        </div>

        {/* Refined header */}
        <div className="relative z-10 shrink-0 bg-background/80 backdrop-blur-md border-b border-border/60">
          <div className="max-w-7xl mx-auto px-4 md:px-10 h-14 md:h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
                <Compass className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[15px] font-bold text-foreground tracking-tight">
                  Career Pilot Ecosystem
                </span>
                <span className="text-[11px] text-muted-foreground font-medium hidden sm:block">
                  Software & Preparation
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 rounded-full bg-card border border-border/60 hover:bg-muted text-foreground flex items-center justify-center transition-all hover:scale-105 shadow-sm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body — fills viewport, NO scroll */}
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
          <div className="h-full max-w-6xl mx-auto px-4 md:px-10 py-4 md:py-6 flex flex-col gap-4 md:gap-6">
            {/* Hero strip */}
            <div className="text-center shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.22em]">
                <Sparkles className="h-3 w-3" />
                {it ? "Il nostro ecosistema" : "Our ecosystem"}
              </span>
              <h1 className="mt-2 md:mt-3 text-2xl md:text-[34px] font-light text-primary tracking-tight leading-[1.1]">
                {it ? "Tutto ciò che ti serve, " : "Everything you need, "}
                <span className="font-semibold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                  {it ? "in un'unica piattaforma." : "in one platform."}
                </span>
              </h1>
              <p className="mt-1.5 text-xs md:text-sm text-muted-foreground max-w-xl mx-auto hidden md:block">
                {it
                  ? "Strumenti curati e community esclusiva per accelerare il tuo percorso."
                  : "Curated tools and an exclusive community to accelerate your journey."}
              </p>
              <div className="mt-3 md:mt-4 inline-flex items-center gap-2.5 px-3.5 md:px-4 py-1.5 md:py-2 rounded-full bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-secondary/30 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                <span className="text-[11px] md:text-xs font-semibold text-primary tracking-tight">
                  {it
                    ? "Un unico abbonamento per accedere a tutto il nostro ecosistema"
                    : "One subscription to unlock our entire ecosystem"}
                </span>
              </div>
            </div>


            {/* PLATFORMS row — balanced premium cards */}
            <section className="shrink-0">
              <SectionLabel icon={Compass} text={it ? "Le Nostre Piattaforme" : "Our Platforms"} />
              <div className="grid grid-cols-2 gap-3 md:gap-5 mt-3">
                <PlatformCard
                  icon={Users}
                  title="Talent Pool"
                  desc={
                    it
                      ? "Community esclusiva. Le aziende vengono a cercarti."
                      : "Exclusive community. Companies come to find you."
                  }
                  onClick={() => (window.location.href = "/talent-pool")}
                  cta={it ? "Esplora" : "Explore"}
                  wip={it ? "In sviluppo" : "Work in progress"}
                />
                <PlatformCard
                  icon={Compass}
                  title="Pathways"
                  desc={
                    it
                      ? "Percorsi formativi guidati e materiali strutturati."
                      : "Guided learning pathways and structured materials."
                  }
                  onClick={() => (window.location.href = "/platforms/pathways")}
                  cta={it ? "Scopri" : "Discover"}
                  wip={it ? "In sviluppo" : "Work in progress"}
                />
              </div>
            </section>

            {/* JOB HUB — premium banner */}
            <section className="shrink-0">
              <button
                onClick={() => setJobHubOpen(true)}
                className="group relative w-full text-left rounded-xl overflow-hidden border border-border/60 bg-gradient-to-r from-card via-card to-secondary/5 hover:border-secondary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3.5 px-4 md:px-5 py-3 md:py-3.5">
                  <div className="h-10 w-10 md:h-11 md:w-11 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-sm">
                    <Newspaper className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] md:text-base font-semibold text-primary tracking-tight">Job Updates Hub</h3>
                      <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-secondary bg-secondary/10 border border-secondary/20 px-1.5 py-[2px] rounded-full">
                        WhatsApp
                      </span>
                    </div>
                    <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {it
                        ? "Le migliori opportunità di lavoro & stage, ogni settimana."
                        : "Best curated job & internship opportunities, every week."}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs md:text-[13px] font-semibold text-secondary group-hover:gap-2 transition-all shrink-0">
                    {it ? "Iscriviti" : "Join"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </button>
            </section>

            {/* KNOWLEDGE BASE — premium 3-up grid */}
            <section className="flex-1 min-h-0 flex flex-col">
              <SectionLabel icon={BookOpen} text="Knowledge Base" />
              <div className="grid grid-cols-3 gap-3 md:gap-5 mt-3 flex-1 min-h-0">
                {knowledgeBlocks.map((b) => (
                  <button
                    key={b.title}
                    onClick={() => goToCategory(b.cat)}
                    className="group relative rounded-xl overflow-hidden border border-border/60 bg-card text-left hover:border-secondary/40 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
                  >
                    <div className="p-4 md:p-5 flex-1 flex flex-col">
                      <div className="inline-flex h-10 w-10 md:h-11 md:w-11 rounded-lg bg-gradient-to-br from-primary to-secondary items-center justify-center mb-3 shadow-sm">
                        <b.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-base md:text-lg font-semibold text-primary tracking-tight leading-tight">{b.title}</h3>
                      <p className="text-[11px] md:text-xs text-secondary font-medium mt-0.5">{b.subtitle}</p>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-2 leading-snug line-clamp-2 hidden md:block">{b.desc}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <FormatChip icon={FileText} label="CV" />
                        <FormatChip icon={Mail} label={it ? "Cover Letter" : "Cover Letter"} />
                        <FormatChip icon={FileType2} label="PDF" />
                        <FormatChip icon={FileSpreadsheet} label="Excel" />
                        <FormatChip icon={Video} label={it ? "Meeting on demand" : "Meeting on demand"} />
                      </div>
                      <div className="mt-auto pt-3 inline-flex items-center gap-1 text-[11px] md:text-xs font-semibold text-secondary group-hover:gap-1.5 transition-all">
                        {it ? "Apri" : "Open"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-secondary/40 to-transparent group-hover:via-secondary/70 transition-colors" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <JobHubInfoDialog isOpen={jobHubOpen} onClose={() => setJobHubOpen(false)} />
    </>
  );
};

const SectionLabel = ({ icon: Icon, text }: { icon: typeof Compass; text: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-3.5 w-3.5 text-secondary" />
    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">{text}</span>
    <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
  </div>
);

const FormatChip = ({ icon: Icon, label }: { icon: typeof Compass; label: string }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[10px] md:text-[11px] font-medium text-foreground/80">
    <Icon className="h-2.5 w-2.5 text-secondary" />
    {label}
  </span>
);

const PlatformCard = ({
  icon: Icon,
  title,
  desc,
  onClick,
  cta,
  wip,
}: {
  icon: typeof Compass;
  title: string;
  desc: string;
  onClick: () => void;
  cta: string;
  wip?: string;
}) => (
  <button
    onClick={onClick}
    className="group relative text-left rounded-xl overflow-hidden border border-border/60 bg-card hover:border-secondary/40 hover:shadow-md hover:-translate-y-0.5 transition-all"
  >
    {wip && (
      <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/25 text-secondary text-[9px] md:text-[10px] font-semibold uppercase tracking-wider">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        {wip}
      </span>
    )}
    <div className="p-4 md:p-5">
      <div className="flex items-start gap-3.5">
        <div className="inline-flex h-11 w-11 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-primary to-secondary items-center justify-center shrink-0 shadow-sm">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-semibold text-primary tracking-tight leading-tight">{title}</h3>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">{desc}</p>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] md:text-xs font-semibold text-secondary group-hover:gap-1.5 transition-all">
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </div>
    <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-secondary/40 to-transparent group-hover:via-secondary/70 transition-colors" />
  </button>
);

export default EcosystemOverlay;
