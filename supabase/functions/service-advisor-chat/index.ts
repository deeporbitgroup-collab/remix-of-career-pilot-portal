// Pilot Advisor: deterministic guided matcher for the verified CareerPilot catalog.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ServiceInfo {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categorySubtitle?: string;
  image?: string;
  pdfPath?: string | null;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  services: ServiceInfo[];
  history: ChatTurn[];
}

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ----- Journey question -----
const JOURNEY_OPTIONS = {
  takeoff: "I'm finishing high school and want to go to university",
  layover: "I'm at university and want to transfer or change degree program",
  summit: "I'm finishing university and want to do a Master or MBA",
  altitude: "I'm looking for an internship or my first job",
};

const journeyToCategory = (answer: string): string | null => {
  const a = norm(answer);
  if (a.includes("transfer") || a.includes("change degree")) return "Layover";
  if (a.includes("high school")) return "Take Off";
  if (a.includes("master") || a.includes("mba")) return "Summit";
  if (a.includes("internship") || a.includes("first job")) return "Altitude";
  return null;
};

// ----- Need options by category -----
// Each option maps to one or more candidate service-name patterns (lowercase substrings).
type NeedOption = { label: string; targets: string[] };

const academicNeeds = (category: "Take Off" | "Layover" | "Summit"): NeedOption[] => {
  const isMaster = category === "Summit";
  const subject = isMaster ? "Master / MBA program" : "university";
  const base: NeedOption[] = [
    {
      label: `I already know my target ${subject} — I need a plan for entrance tests, deadlines and prep`,
      targets: ["personalized timeline"],
    },
    {
      label: `I'm undecided — I want to compare different ${subject}s side by side`,
      targets: ["comparative"],
    },
    {
      label: `I want a deep dive into one specific ${subject} (curriculum, life, career outcomes)`,
      targets: ["in-depth", "in depth"],
    },
    {
      label: `I have specific questions (test prep, SAT/GMAT, application tips) — I just want to talk to a student/expert`,
      targets: ["associate office hours", "office hours"],
    },
  ];
  if (category === "Layover") {
    base.push({
      label: "I want to verify if my transfer is actually possible (credits / eligibility)",
      targets: ["university eligibility", "eligibility verification"],
    });
  }
  return base;
};

const careerNeeds = (): NeedOption[] => [
  {
    label: "I want a complete career roadmap for a specific sector",
    targets: ["personalized career roadmap", "career roadmap"],
  },
  {
    label: "I need my CV and / or cover letter rewritten for real applications",
    targets: ["cv", "cover letter"],
  },
  {
    label: "I want to talk to an expert about a sector, role or company",
    targets: ["expert career session", "career insights", "associate office hours"],
  },
  {
    label: "I want direct outreach to companies (interviews generated for me)",
    targets: ["outreach", "pay per interview"],
  },
];

const needOptionsFor = (category: string | null): NeedOption[] => {
  if (category === "Layover") return academicNeeds("Layover");
  if (category === "Summit") return academicNeeds("Summit");
  if (category === "Altitude") return careerNeeds();
  return academicNeeds("Take Off");
};

const matchService = (catalog: ServiceInfo[], category: string, targets: string[]): ServiceInfo | null => {
  const pool = catalog.filter((s) => s.category === category);
  for (const target of targets) {
    const hit = pool.find((s) => norm(s.name).includes(norm(target)));
    if (hit) return hit;
  }
  // fallback: search any category for the target (e.g. CV may live in Additional)
  for (const target of targets) {
    const hit = catalog.find((s) => norm(s.name).includes(norm(target)));
    if (hit) return hit;
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const catalog = (Array.isArray(body.services) ? body.services : []).filter((s) =>
      s.name !== "Additional Call with Associate"
    );
    const history = Array.isArray(body.history) ? body.history : [];
    const userAnswers = history.filter((t) => t.role === "user").map((t) => t.content);

    if (catalog.length === 0) {
      return new Response(JSON.stringify({ error: "Missing services" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- Step 1: journey question -----
    if (userAnswers.length === 0) {
      return new Response(JSON.stringify({
        type: "question",
        title: "Where are you in your journey?",
        message: "Pick the option that best describes you right now.",
        multi_select: false,
        options: [
          JOURNEY_OPTIONS.takeoff,
          JOURNEY_OPTIONS.layover,
          JOURNEY_OPTIONS.summit,
          JOURNEY_OPTIONS.altitude,
        ],
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const category = journeyToCategory(userAnswers[0]);

    // ----- Step 2: needs (multi-select) -----
    if (userAnswers.length === 1) {
      const needs = needOptionsFor(category);
      const isAcademic = category !== "Altitude";
      return new Response(JSON.stringify({
        type: "question",
        title: isAcademic ? "What kind of support do you need?" : "What career support do you need?",
        message: "Select everything that applies — we'll combine them into the right services.",
        multi_select: true,
        options: needs.map((n) => n.label),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ----- Recommendation -----
    if (!category) {
      return new Response(JSON.stringify({
        type: "book_call",
        title: "Let's talk it through",
        message: "Your situation needs a quick call with our team to recommend the right path.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const selectedLabels = userAnswers[1].split(" • ").map((s) => s.trim()).filter(Boolean);
    const allNeeds = needOptionsFor(category);
    const matchedNeeds = allNeeds.filter((n) => selectedLabels.some((l) => norm(l) === norm(n.label)));

    const picked: ServiceInfo[] = [];
    const seen = new Set<string>();
    for (const need of matchedNeeds) {
      const svc = matchService(catalog, category, need.targets);
      if (svc && !seen.has(svc.name + svc.category)) {
        picked.push(svc);
        seen.add(svc.name + svc.category);
      }
    }

    // Always offer transfer eligibility verification at the end for Layover
    if (category === "Layover") {
      const elig = catalog.find((s) => norm(s.name).includes("eligibility"));
      if (elig && !seen.has(elig.name + elig.category)) {
        picked.push(elig);
        seen.add(elig.name + elig.category);
      }
    }

    // Fallback if nothing matched: top 3 from category
    if (picked.length === 0) {
      const defaults: Record<string, string[]> = {
        "Take Off": ["Personalized Timeline", "Comparative Presentations", "In-Depth Presentations"],
        "Layover": ["Personalized Timeline", "University Eligibility Verification", "Comparative Presentations"],
        "Summit": ["Personalized Timeline", "Comparative Analysis", "In-Depth Presentations"],
        "Altitude": ["Personalized Career Roadmap", "CV / Cover Letter Rewrite", "Expert Career Session"],
      };
      for (const name of (defaults[category] || [])) {
        const svc = catalog.find((s) => s.category === category && norm(s.name) === norm(name)) ||
                    catalog.find((s) => s.category === category && norm(s.name).includes(norm(name)));
        if (svc && !seen.has(svc.name + svc.category)) {
          picked.push(svc);
          seen.add(svc.name + svc.category);
        }
      }
    }

    const final = picked.slice(0, 4);

    return new Response(JSON.stringify({
      type: "recommendation",
      title: "Your best-fit services",
      message: "Hand-picked from the real CareerPilot catalog based on your answers.",
      reasoning: category === "Layover"
        ? "Because you're transferring or changing degree, recommendations come from Layover services only."
        : category === "Altitude"
          ? "Career-stage recommendations from our Altitude track, tailored to what you selected."
          : `Recommendations from the ${category} track based on the support areas you selected.`,
      services: final,
      service_names: final.map((s) => s.name),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("pilot-advisor error", err);
    return new Response(JSON.stringify({ error: "server_error", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
