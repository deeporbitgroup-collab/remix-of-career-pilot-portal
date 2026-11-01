import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Briefcase,
  GraduationCap,
  Linkedin,
  Mail,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";
import { MENTOR_BIOS, MENTOR_BIOS_IT } from "@/data/boost/mentorBios";
import careerBoostMark from "@/assets/careerboost-mark-white.png";

/*
 * Boost Resources — CareerBoost's offer brought inside the student area:
 * masterclasses, the curated mentor bench and the two services (CV & cover
 * letter rewrite, Outreach Power Pack). Content mirrors careerboost-new
 * (CBPrograms, CBAboutMentoring + curatedMentors/mentorBios, CBServices,
 * CBAboutOutreachPowerPack); requests go to info@careerboost.it, the Outreach
 * application uses its existing standalone page.
 */

const CAREERBOOST_EMAIL = "info@careerboost.it";
const OUTREACH_URL = "https://outreach-power-pack.vercel.app";

// Hand-picked mentors shown in the Talent Pool, by area (profiles.id).
// A mentor can sit in more than one area (e.g. Alessandro Olivetti: IB + PE).
const MENTOR_GROUPS: { key: string; label: { en: string; it: string }; ids: string[] }[] = [
  {
    key: "ib",
    label: { en: "Investment Banking", it: "Investment Banking" },
    ids: [
      "d4bad5a3-f4aa-4c34-bbdb-e6b18f21b7fb", // Alessandro Olivetti
      "a074a3a1-4146-4a99-a5a2-bc6328605139", // Riccardo Rubolino
      "b6234538-5532-4d7f-bd4d-2c593969fe2d", // Antoine Falch
      "c8e64191-c5a7-482c-bbe9-55641245817e", // Gianluca De Goyzueta
      "f995d43f-0f58-4c47-b55c-ffba4767dd9c", // Kitty Farrell
    ],
  },
  {
    key: "pe",
    label: { en: "Private Equity", it: "Private Equity" },
    ids: [
      "7a67b6b3-5fc4-4eb0-b659-fc6f34137034", // Riccardo Ciardelli
      "d4bad5a3-f4aa-4c34-bbdb-e6b18f21b7fb", // Alessandro Olivetti
    ],
  },

  {
    key: "consulting",
    label: { en: "Consulting", it: "Consulting" },
    ids: [
      "12a629f9-4504-4844-9f2c-208aef10daeb", // Paolo Arnanno
      "80fe19ad-bd96-4316-b6f0-5c8f064f7a04", // Andrea Alivernini
      "e532fa10-1a48-4963-8efe-e2a90b304681", // Pietro Garibbo
      "d3c0e2ce-1ccc-4317-b09c-7e0db8f2dcc5", // Luca Tissone
    ],
  },
  {
    key: "am",
    label: { en: "Markets", it: "Markets" },
    ids: [
      "1f9d9258-8f96-4871-9782-5c4912c7e288", // Arturo Alaimo
      "4da5d163-209e-41d0-a80c-0f8cc8335942", // Leone Fassio
    ],
  },
];
const MENTOR_IDS = [...new Set(MENTOR_GROUPS.flatMap((g) => g.ids))];

// Companies shown under each mentor's name (current first), taken from their bios.
const MENTOR_COMPANIES: Record<string, string[]> = {
  "d4bad5a3-f4aa-4c34-bbdb-e6b18f21b7fb": ["BlackRock", "J.P. Morgan"], // Alessandro Olivetti
  "a074a3a1-4146-4a99-a5a2-bc6328605139": ["J.P. Morgan", "KPMG"], // Riccardo Rubolino
  "b6234538-5532-4d7f-bd4d-2c593969fe2d": ["J.P. Morgan", "Rothschild & Co"], // Antoine Falch
  "c8e64191-c5a7-482c-bbe9-55641245817e": ["Piper Sandler", "Accenture"], // Gianluca De Goyzueta
  "f995d43f-0f58-4c47-b55c-ffba4767dd9c": ["Goldman Sachs", "Rothschild & Co"], // Kitty Farrell
  "1f9d9258-8f96-4871-9782-5c4912c7e288": ["Nevastar Finance", "9fin"], // Arturo Alaimo
  "4da5d163-209e-41d0-a80c-0f8cc8335942": ["Acer Tree", "Nevastar Finance"], // Leone Fassio
  "12a629f9-4504-4844-9f2c-208aef10daeb": ["Deloitte"], // Paolo Arnanno
  "80fe19ad-bd96-4316-b6f0-5c8f064f7a04": ["Bain & Company", "Innovis VC"], // Andrea Alivernini
  "e532fa10-1a48-4963-8efe-e2a90b304681": ["Deloitte"], // Pietro Garibbo
  "d3c0e2ce-1ccc-4317-b09c-7e0db8f2dcc5": ["Accenture", "Agicap"], // Luca Tissone
  "7a67b6b3-5fc4-4eb0-b659-fc6f34137034": ["Synova", "Obsidian Capital"], // Riccardo Ciardelli
};

// Dark brand surfaces use fixed colours (not the theme tokens) so they stay dark
// inside the always-light student area.
const BRAND_GRADIENT =
  "linear-gradient(135deg, #05060D 0%, #0A0A1F 42%, #142C8A 78%, #2430D4 112%)";
const RIBBONS =
  "repeating-linear-gradient(125deg, transparent 0px, transparent 46px, rgba(91,155,255,0.06) 46px, rgba(36,48,212,0.10) 92px, transparent 92px, transparent 150px)";

type Mentor = {
  id: string;
  name: string;
  photo: string;
  university?: string;
  masterProgram?: string;
  sector?: string;
  linkedinUrl?: string;
  bio?: string;
};

type RequestTarget = { service: string; detail?: string };

const SectionHeader = ({ id, kicker, title, subtitle }: { id: string; kicker: string; title: string; subtitle: string }) => (
  <div id={id} className="scroll-mt-24 flex flex-col gap-1.5">
    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cbind-600">{kicker}</span>
    <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
  </div>
);

const BoostResources = () => {
  const { tx, language } = useTalentPoolLanguage();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [group, setGroup] = useState<string>(MENTOR_GROUPS[0].key);
  const [request, setRequest] = useState<RequestTarget | null>(null);
  // Mentor interest form (no booking yet: the CareerBoost team follows up)
  const [interestMentor, setInterestMentor] = useState<Mentor | null>(null);
  // Service request (CV / cover letter / Outreach) uses the same contact form
  const [serviceTarget, setServiceTarget] = useState<null | { service: "cv" | "cover" | "cvcover" | "outreach"; title: string }>(null);
  const [interestForm, setInterestForm] = useState({ firstName: "", lastName: "", email: "", whatsapp: "" });
  const [interestState, setInterestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [note, setNote] = useState("");

  const studentName = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("talentPoolUser") || "null");
      const p = user?.student_profiles?.[0];
      return [p?.first_name, p?.last_name].filter(Boolean).join(" ");
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    (supabase as any)
      .from("profiles")
      .select("id, first_name, last_name, photo_url, sector, university, master_program, linkedin_url")
      .eq("role", "ASSOCIATE")
      .eq("status", "approved")
      .not("photo_url", "is", null)
      .in("id", MENTOR_IDS)
      .then(({ data }: { data: any[] | null }) => {
        const items: Mentor[] = (data || [])
          .filter((p) => p.photo_url?.trim())
          .map((p) => ({
            id: p.id,
            name: `${(p.first_name || "").trim()} ${(p.last_name || "").trim()}`.trim(),
            photo: p.photo_url,
            university: p.university?.trim() || undefined,
            masterProgram: p.master_program?.trim() || undefined,
            sector: p.sector?.trim() || undefined,
            linkedinUrl: p.linkedin_url?.trim() || undefined,
            bio: (language === "it" ? MENTOR_BIOS_IT[p.id] : undefined) || MENTOR_BIOS[p.id] || undefined,
          }))
          .filter((m) => m.name.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        setMentors(items);
        setMentorsLoading(false);
      });
  }, [language]);

  const byId = useMemo(() => new Map(mentors.map((m) => [m.id, m])), [mentors]);
  const activeGroup = MENTOR_GROUPS.find((g) => g.key === group) || MENTOR_GROUPS[0];
  const visibleMentors = activeGroup.ids.map((id) => byId.get(id)).filter(Boolean) as Mentor[];

  const masterclasses = [
    {
      image: "/boost/masterclass/ib.png",
      title: "Investment Banking Masterclass",
      tag: "IB",
      description: tx(
        "An all-in-one course that accelerates your entry and success in IB, from accounting to advanced corporate finance topics, through to taxation and the legal profiles of extraordinary transactions.",
        "Un corso all-in-one che accelera il tuo ingresso e successo nel mondo dell'IB, da accounting a temi avanzati di corporate finance, fino alla tassazione e profili legali delle operazioni straordinarie."
      ),
    },
    {
      image: "/boost/masterclass/pe.png",
      title: "Private Equity Masterclass",
      tag: "PE",
      description: tx(
        "From case study to deal room: the practical path to breaking into leading PE funds and advisory boutiques.",
        "Dal caso studio alla deal room: il percorso pratico per entrare nei principali fondi di PE e boutique di advisory."
      ),
    },
    {
      image: "/boost/masterclass/awm.png",
      title: "Asset & Wealth Management Masterclass",
      tag: "AWM",
      description: tx(
        "From markets to portfolio: build the skills to join leading asset managers and private banks in Italy and across Europe.",
        "Dai mercati al portafoglio: acquisisci le competenze per entrare nelle principali SGR e private bank in Italia e in Europa."
      ),
    },
  ];

  const cvBullets = [
    tx("CV rewritten by an expert in your sector of interest", "CV riscritto da un esperto del tuo settore di interesse"),
    tx("Personalized cover letter with an effective narrative", "Cover letter personalizzata e narrativa efficace"),
    tx("Positioning optimized for ATS and recruiters", "Posizionamento ottimizzato per ATS e recruiter"),
    tx("Feedback and revisions included through to the final result", "Feedback e revisioni inclusi fino al risultato finale"),
  ];

  const outreachSteps = [
    {
      icon: Users,
      title: tx("A database built for you", "Un database su misura per te"),
      desc: tx(
        "Contacts selected for your sectors and cities — London, Milan, Paris, Dubai and the United States — all from public sources.",
        "Contatti selezionati sui tuoi settori e sulle tue città — Londra, Milano, Parigi, Dubai e Stati Uniti — tutti da fonti pubbliche."
      ),
    },
    {
      icon: FileText,
      title: tx("A format built for you", "Formato su misura"),
      desc: tx(
        "Standardized structure, content that adapts automatically to each recipient — with your CV attached.",
        "Struttura standardizzata, contenuto che si adatta automaticamente a ogni destinatario — con il tuo CV in allegato."
      ),
    },
    {
      icon: ShieldCheck,
      title: tx("Automatic, protected sending", "Invio automatico e protetto"),
      desc: tx(
        "Our software sends the emails for you through an anti-spam system designed to land in the inbox.",
        "Il nostro software invia le email per te con un sistema anti-spam pensato per arrivare davvero in casella."
      ),
    },
  ];

  const prefillContact = () => {
    let prefill = { firstName: "", lastName: "", email: "", whatsapp: "" };
    try {
      const user = JSON.parse(localStorage.getItem("talentPoolUser") || "null");
      const p = user?.student_profiles?.[0];
      prefill = {
        firstName: p?.first_name || "",
        lastName: p?.last_name || "",
        email: user?.email || "",
        whatsapp: p?.phone || "",
      };
    } catch {
      // no stored session: empty form
    }
    setInterestForm(prefill);
    setInterestState("idle");
  };

  const openInterest = (m: Mentor) => {
    prefillContact();
    setServiceTarget(null);
    setInterestMentor(m);
  };

  const openService = (service: "cv" | "cover" | "cvcover" | "outreach", title: string) => {
    prefillContact();
    setInterestMentor(null);
    setServiceTarget({ service, title });
  };

  const sendInterest = async () => {
    if (!interestMentor && !serviceTarget) return;
    const { firstName, lastName, email, whatsapp } = interestForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !whatsapp.trim()) return;
    setInterestState("sending");
    const contact = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      language,
      source: "Talent Pool — Boost Resources",
    };
    const { error } = await supabase.functions.invoke("send-mentor-booking-email", {
      body: interestMentor
        ? { ...contact, requestType: "interest", mentorId: interestMentor.id }
        : { ...contact, requestType: "service", service: serviceTarget!.service },
    });
    if (error) {
      console.error("Mentor interest error:", error);
      setInterestState("error");
      return;
    }
    setInterestState("sent");
  };

  const openRequest = (service: string, detail?: string) => {
    setNote("");
    setRequest({ service, detail });
  };

  const sendRequest = () => {
    if (!request) return;
    const subject = `${tx("Request", "Richiesta")} — ${request.service}${request.detail ? ` (${request.detail})` : ""}`;
    const body = [
      tx("Hi CareerBoost team,", "Ciao team CareerBoost,"),
      "",
      tx(
        `I'm a Talent Pool student and I'd like more information about: ${request.service}${request.detail ? ` — ${request.detail}` : ""}.`,
        `Sono uno studente della Talent Pool e vorrei maggiori informazioni su: ${request.service}${request.detail ? ` — ${request.detail}` : ""}.`
      ),
      note.trim() ? `\n${note.trim()}` : "",
      "",
      studentName,
    ].join("\n");
    window.location.href = `mailto:${CAREERBOOST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setRequest(null);
  };

  const anchors = [
    { id: "boost-mentor", label: "Mentor" },
    { id: "boost-services", label: tx("Automations", "Automazioni") },
    { id: "boost-masterclass", label: "Masterclass" },
  ];

  return (
    <div className="space-y-10 md:space-y-12">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden rounded-3xl px-6 py-8 md:px-10 md:py-10 shadow-xl shadow-cbind-900/10"
        style={{ background: BRAND_GRADIENT }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-80" style={{ backgroundImage: RIBBONS }} />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(91,155,255,0.35), transparent 65%)" }}
        />
        <img
          src={careerBoostMark}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 right-4 md:right-10 h-48 md:h-64 w-auto opacity-[0.08] select-none"
        />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <img src={careerBoostMark} alt="CareerBoost" className="h-7 w-auto" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#85B3FF" }}>
              CareerBoost
            </span>
          </div>
          <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight" style={{ color: "#FFFFFF" }}>
            Boost Resources
          </h2>
          <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: "rgba(234,242,255,0.75)" }}>
            {tx(
              "Everything CareerBoost offers to get you ready: specialised masterclasses, mentors who already work where you want to go, and services that put your profile in front of the right people.",
              "Tutto ciò che CareerBoost mette a disposizione per prepararti: masterclass specializzate, mentor che lavorano già dove vuoi arrivare e servizi che portano il tuo profilo davanti alle persone giuste."
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {anchors.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => document.getElementById(a.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                style={{ background: "rgba(255,255,255,0.10)", color: "#EAF2FF", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suggested product — Outreach Power Pack */}
        <aside
          className="relative rounded-2xl p-5 backdrop-blur-md"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "linear-gradient(90deg, #F5B841, #F59E0B)", color: "#1A1205" }}
          >
            <Sparkles className="h-3 w-3" /> {tx("Suggested for you", "Consigliato per te")}
          </span>
          <h3 className="mt-3 text-xl font-semibold" style={{ color: "#FFFFFF" }}>Outreach Power Pack</h3>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgba(234,242,255,0.78)" }}>
            {tx(
              "The fastest way to multiply your interviews: we reach the decision-makers at the companies you're targeting, on your behalf.",
              "Il modo più rapido per moltiplicare i colloqui: contattiamo per te i decision-maker delle aziende che ti interessano."
            )}
          </p>
          <ul className="mt-3 space-y-1.5">
            {[
              tx("Contacts tailored to your sectors and cities", "Contatti su misura per i tuoi settori e le tue città"),
              tx("Automatic sending, with your CV attached", "Invio automatico, con il tuo CV in allegato"),
              tx("London, Milan, Paris, Dubai, United States", "Londra, Milano, Parigi, Dubai, Stati Uniti"),
            ].map((b) => (
              <li key={b} className="flex items-start gap-2 text-xs" style={{ color: "#EAF2FF" }}>
                <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" style={{ color: "#85B3FF" }} /> {b}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => openService("outreach", "Outreach Power Pack")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#FFFFFF", color: "#0A0A1F" }}
            >
              {tx("Request info", "Richiedi informazioni")} <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("boost-services")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ color: "#EAF2FF", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              {tx("Details", "Dettagli")}
            </button>
          </div>
        </aside>
        </div>
      </section>

      {/* ── Mentor ── */}
      <section className="space-y-5">
        <SectionHeader
          id="boost-mentor"
          kicker="Mentor"
          title={tx("Mentors who've been where you want to go", "Mentor che sono già dove vuoi arrivare")}
          subtitle={tx(
            "A hand-picked bench of analysts and professionals from top banks, funds and consultancies. Choose your mentor: after a free check-in we'll schedule a short- or long-term mentoring plan based on what you need.",
            "Una squadra selezionata di analyst e professionisti di banche, fondi e società di consulenza di primo piano. Scegli il tuo mentor: dopo un check-in gratuito pianifichiamo insieme un percorso di mentoring, breve o lungo, in base a ciò di cui hai bisogno."
          )}
        />

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {MENTOR_GROUPS.map((g) => {
            const active = group === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {g.label[language]}
              </button>
            );
          })}
        </div>

        {mentorsLoading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-60 animate-pulse rounded-2xl border bg-muted" />
            ))}
          </div>
        ) : visibleMentors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tx("Mentors will appear here soon.", "I mentor saranno presto disponibili qui.")}</p>
        ) : (
          <>
            {/* Editorial grid — no cards, left to right (3 per row on desktop):
                photo with the profile on its right, the booking button underneath */}
            <div className="grid gap-x-8 gap-y-10 pt-2 sm:grid-cols-2 lg:grid-cols-3 max-md:gap-x-3 max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain max-md:px-4 max-md:scroll-px-4 max-md:pb-2 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
              {visibleMentors.map((m) => (
                <div key={m.id} className="flex h-full flex-col max-md:w-[42vw] max-md:shrink-0 max-md:snap-start">
                  <div className="flex flex-1 items-start gap-4 max-md:flex-col max-md:gap-2.5">
                    <img
                      src={m.photo}
                      alt={m.name}
                      loading="lazy"
                      className="aspect-[4/5] max-md:aspect-square w-32 md:w-36 max-md:w-full shrink-0 rounded-lg object-cover object-top grayscale contrast-[1.05]"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">
                        {activeGroup.label[language]}
                      </span>
                      <h4
                        className="mt-1 text-lg leading-tight text-foreground"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                      >
                        {m.name}
                        {m.linkedinUrl && (
                          <a
                            href={m.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`LinkedIn — ${m.name}`}
                            title="LinkedIn"
                            className="ml-1.5 inline-block align-[-2px] text-muted-foreground transition-colors hover:text-primary"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                      </h4>
                      {MENTOR_COMPANIES[m.id]?.length ? (
                        <p className="mt-1 flex items-start gap-1 text-[11px] font-medium text-muted-foreground">
                          <Briefcase className="mt-px h-3 w-3 shrink-0" />
                          <span>{MENTOR_COMPANIES[m.id].join(" · ")}</span>
                        </p>
                      ) : null}
                      {m.bio && <p className="mt-2 text-xs leading-relaxed text-foreground/75 max-md:line-clamp-5">{m.bio}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    aria-label={tx(`Request an introduction to ${m.name}`, `Richiedi un'introduzione con ${m.name}`)}
                    className="mt-4 self-start rounded-full px-4 max-md:w-full max-md:px-2 max-md:text-xs"
                    onClick={() => openInterest(m)}
                  >
                    <span className="max-md:hidden">{tx("Request an introduction", "Richiedi un'introduzione")}</span>
                    <span className="md:hidden">{tx("Get introduced", "Introduzione")}</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Services ── */}
      <section className="space-y-5">
        <SectionHeader
          id="boost-services"
          kicker={tx("Automations", "Automazioni")}
          title={tx("Software that works for you", "Software che lavorano per te")}
          subtitle={tx(
            "Tools that do the work for you: they sharpen your profile and get it to the people who are hiring.",
            "Strumenti che fanno il lavoro al posto tuo: rendono più forte il tuo profilo e lo portano a chi sta assumendo."
          )}
        />

        <div className="grid gap-5 lg:grid-cols-2 max-md:gap-3 max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain max-md:px-4 max-md:scroll-px-4 max-md:pb-2 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          {/* CV & Cover Letter */}
          <article className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm max-md:w-[78vw] max-md:shrink-0 max-md:snap-center">
            <div className="relative overflow-hidden">
              <img src="/boost/cv-cover.png" alt={tx("CV & Cover Letter", "CV e Cover Letter")} loading="lazy" className="w-full h-auto max-md:h-36 max-md:object-cover" />
              <span
                className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{ background: "rgba(255,255,255,0.14)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(6px)" }}
              >
                <Sparkles className="h-3.5 w-3.5" /> {tx("Rewritten by an expert", "Riscritto da un esperto")}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h4 className="text-lg font-semibold text-foreground">{tx("CV & Cover Letter", "CV e Cover Letter")}</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-md:line-clamp-3">
                {tx(
                  "Your CV is the first impression you make on the most selective companies. Our experts — active professionals in finance, consulting and legal — rewrite your CV and/or cover letter around your story and your target companies.",
                  "Il CV è la prima impressione che dai alle aziende più selettive. I nostri esperti — professionisti attivi in finanza, consulenza e legal — riscrivono il tuo CV e/o la cover letter sulla tua storia e sulle aziende che punti."
                )}
              </p>
              <ul className="mt-4 space-y-2 max-md:hidden">
                {cvBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {b}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Button className="w-full rounded-full" onClick={() => openService("cvcover", tx("CV & Cover Letter", "CV e Cover Letter"))}>
                  {tx("Request more information", "Richiedi maggiori informazioni")} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </article>

          {/* Outreach Power Pack */}
          <article className="relative flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm max-md:w-[78vw] max-md:shrink-0 max-md:snap-center">
            {/* "Most requested" corner ribbon */}
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-28 w-28 overflow-hidden">
              <span
                className="absolute right-[-38px] top-[22px] w-[150px] rotate-45 py-1 text-center text-[10px] font-bold uppercase tracking-wider shadow-md"
                style={{ background: "linear-gradient(90deg, #F5B841, #F59E0B)", color: "#1A1205" }}
              >
                {tx("Most requested", "Più richiesto")}
              </span>
            </div>
            <div className="relative overflow-hidden p-6" style={{ background: BRAND_GRADIENT }}>
              <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: RIBBONS }} />
              {/* mock email preview */}
              <div className="relative mx-auto max-w-sm rounded-2xl p-4 shadow-2xl max-md:hidden" style={{ background: "#FFFFFF", color: "#0A0A1F" }}>
                <div className="flex items-center justify-between text-[11px]" style={{ color: "#646E92" }}>
                  <span className="inline-flex items-center gap-1 font-semibold"><Mail className="h-3.5 w-3.5" /> Gmail</span>
                  <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "#15803D" }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> {tx("Delivered", "Consegnata")}
                  </span>
                </div>
                <p className="mt-3 text-[11px]" style={{ color: "#646E92" }}>{tx("To: j.smith@company.com", "A: j.smith@azienda.com")}</p>
                <p className="mt-1 text-xs font-semibold">
                  {tx("Subject: Application — Investment Banking Summer Analyst", "Oggetto: Candidatura — Investment Banking Summer Analyst")}
                </p>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "#434C6E" }}>
                  {tx(
                    "Hi James, I came across your profile and wanted to reach out directly given your experience in...",
                    "Ciao James, ho visto il tuo profilo e volevo contattarti direttamente vista la tua esperienza in..."
                  )}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium" style={{ background: "#EEF0F7", color: "#2430D4" }}>
                  <Paperclip className="h-3 w-3" /> CV_NomeCognome.pdf
                </div>
              </div>
              <div className="relative mt-4 flex flex-wrap justify-center gap-1.5 max-md:mt-0">
                {[tx("London", "Londra"), tx("Milan", "Milano"), tx("Paris", "Parigi"), "Dubai", tx("United States", "Stati Uniti")].map((c) => (
                  <span key={c} className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.12)", color: "#EAF2FF" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h4 className="text-lg font-semibold text-foreground">Outreach Power Pack</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-md:line-clamp-3">
                {tx(
                  "We build a database of email contacts tailored to you, then give you the software that sends your applications automatically.",
                  "Costruiamo un database di contatti email su misura per te, poi ti diamo il software che invia le tue candidature in automatico."
                )}
              </p>
              <div className="mt-4 space-y-3">
                {outreachSteps.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground max-md:hidden">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-6">
                <Button className="w-full rounded-full" onClick={() => openService("outreach", "Outreach Power Pack")}>
                  {tx("Request more information", "Richiedi maggiori informazioni")} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ── Masterclass ── */}
      <section className="space-y-5">
        <SectionHeader
          id="boost-masterclass"
          kicker="Masterclass"
          title={tx("Specialised masterclasses", "Masterclass specializzate")}
          subtitle={tx(
            "Sector-specific programmes built by professionals, from technical foundations to the questions you'll face in interviews.",
            "Percorsi verticali per settore costruiti da professionisti, dalle basi tecniche alle domande che troverai ai colloqui."
          )}
        />
        <div className="grid gap-5 md:grid-cols-3 max-md:gap-3 max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain max-md:px-4 max-md:scroll-px-4 max-md:pb-2 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          {masterclasses.map((m) => (
            <article
              key={m.title}
              className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cbind-900/10 max-md:w-[72vw] max-md:shrink-0 max-md:snap-center"
            >
              <div className="relative overflow-hidden">
                <img
                  src={m.image}
                  alt={m.title}
                  loading="lazy"
                  className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
                  style={{ background: "rgba(5,6,13,0.75)", color: "#EAF2FF", backdropFilter: "blur(6px)" }}
                >
                  {m.tag}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h4 className="text-base font-semibold leading-snug text-foreground">{m.title}</h4>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                <Button
                  className="mt-5 w-full rounded-full"
                  onClick={() => openRequest("Masterclass", m.title)}
                >
                  {tx("Request information", "Richiedi informazioni")} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Mentor interest dialog ── */}
      <Dialog open={!!interestMentor || !!serviceTarget} onOpenChange={(o) => { if (!o) { setInterestMentor(null); setServiceTarget(null); } }}>
        <DialogContent className="max-w-md">
          {interestState === "sent" ? (
            <div className="space-y-4 py-2 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <DialogTitle>{tx("Request received", "Richiesta ricevuta")}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {interestMentor
                  ? tx(
                      `The CareerBoost team will contact you to understand your needs and arrange a session or a plan with ${interestMentor?.name}, who has already been told about your interest.`,
                      `Il team di CareerBoost ti contatterà per capire le tue esigenze e organizzare una sessione o un piano con ${interestMentor?.name}, che è già stato avvisato del tuo interesse.`
                    )
                  : tx(
                      `Thank you! The CareerBoost team will contact you shortly about: ${serviceTarget?.title}. We've sent you a confirmation email.`,
                      `Grazie! Il team di CareerBoost ti contatterà a breve per: ${serviceTarget?.title}. Ti abbiamo inviato un'email di conferma.`
                    )}
              </p>
              <Button className="w-full rounded-full" onClick={() => { setInterestMentor(null); setServiceTarget(null); }}>{tx("Close", "Chiudi")}</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {interestMentor
                    ? tx(`Introduction to ${interestMentor?.name}`, `Introduzione con ${interestMentor?.name}`)
                    : serviceTarget?.title}
                </DialogTitle>
                <DialogDescription>
                  {serviceTarget ? tx(
                    "Leave your details: the CareerBoost team will contact you shortly to understand your needs. You'll also receive a confirmation email.",
                    "Lascia i tuoi dati: il team di CareerBoost ti contatterà a breve per capire le tue esigenze. Riceverai anche un'email di conferma."
                  ) : tx(
                    "Leave your details: the CareerBoost team will contact you to understand your needs and arrange a session or a plan with this mentor, who will be told about your interest. You're not booking yet — we'll set it up together.",
                    "Lascia i tuoi dati: il team di CareerBoost ti contatterà per capire le tue esigenze e organizzare una sessione o un piano con questo mentor, che verrà avvisato del tuo interesse. Non stai ancora prenotando: lo organizziamo insieme."
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{tx("First name", "Nome")}</label>
                  <Input value={interestForm.firstName} onChange={(e) => setInterestForm({ ...interestForm, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{tx("Last name", "Cognome")}</label>
                  <Input value={interestForm.lastName} onChange={(e) => setInterestForm({ ...interestForm, lastName: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium">Email</label>
                  <Input type="email" value={interestForm.email} onChange={(e) => setInterestForm({ ...interestForm, email: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium">{tx("WhatsApp number", "Numero WhatsApp")}</label>
                  <Input type="tel" placeholder="+39 333 123 4567" value={interestForm.whatsapp} onChange={(e) => setInterestForm({ ...interestForm, whatsapp: e.target.value })} />
                </div>
              </div>
              {interestState === "error" && (
                <p className="text-xs text-destructive">
                  {tx("Something went wrong. Please try again or write to info@careerboost.it.", "Qualcosa è andato storto. Riprova o scrivi a info@careerboost.it.")}
                </p>
              )}
              <Button
                className="w-full rounded-full"
                onClick={sendInterest}
                disabled={
                  interestState === "sending" ||
                  !interestForm.firstName.trim() || !interestForm.lastName.trim() ||
                  !interestForm.email.trim() || !interestForm.whatsapp.trim()
                }
              >
                <Send className="mr-2 h-4 w-4" />
                {interestState === "sending" ? tx("Sending…", "Invio in corso…") : tx("Send request", "Invia richiesta")}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Request dialog ── */}
      <Dialog open={!!request} onOpenChange={(o) => { if (!o) setRequest(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{request?.service}</DialogTitle>
            <DialogDescription>
              {request?.detail ? `${request.detail} · ` : ""}
              {tx(
                `Your request goes to the CareerBoost team (${CAREERBOOST_EMAIL}): we'll get back to you by email.`,
                `La richiesta arriva al team CareerBoost (${CAREERBOOST_EMAIL}): ti rispondiamo via email.`
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder={tx(
              "Anything we should know? (target sectors, deadlines, questions…)",
              "Qualcosa che dovremmo sapere? (settori target, scadenze, domande…)"
            )}
          />
          <Button className="w-full rounded-full" onClick={sendRequest}>
            <Send className="mr-2 h-4 w-4" /> {tx("Send request", "Invia richiesta")}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            {tx("Opens your email app with the message ready.", "Si apre la tua app di posta con il messaggio già pronto.")}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoostResources;
