// Pilot Advisor: deterministic guided matcher for the verified CareerPilot catalog.
//
// Flow (2 targeted questions, no LLM):
//   Q1 — journey phase  → maps to a package category (+ talent_pool flag for internships)
//   Q2 — main focus     → picks the single à-la-carte product to surface as the
//                          "just one thing" option
// The recommendation always pushes the full PACKAGE for the category (the front-end
// assembles the real package from `category`), while making the lighter / single-product
// alternatives explicit. Internships also get routed to the Talent Pool.

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

// ----- Q1: journey phase -----
const JOURNEY_OPTIONS = {
  takeoff: "I'm finishing high school and heading to university",
  layover: "I'm at university and want to transfer or change degree program",
  summit: "I'm finishing university and want to do a Master or MBA",
  altitude: "I'm looking for an internship or starting my career",
};

const journeyToCategory = (answer: string): string | null => {
  const a = norm(answer);
  if (a.includes("transfer") || a.includes("change degree") || a.includes("change degree program")) return "Layover";
  if (a.includes("high school")) return "Take Off";
  if (a.includes("master") || a.includes("mba")) return "Summit";
  if (a.includes("internship") || a.includes("starting my career") || a.includes("first job")) return "Altitude";
  return null;
};

// ----- Q2: main focus → single à-la-carte product (option c) -----
type FocusOption = { label: string; targets: string[] };

const academicFocus = (category: "Take Off" | "Layover" | "Summit"): FocusOption[] => {
  const subject = category === "Summit" ? "Master / MBA" : "university";
  const opts: FocusOption[] = [
    {
      label: `A clear plan — deadlines, entrance tests and what to prepare for my target ${subject}`,
      targets: ["personalized timeline"],
    },
    {
      label: "Compare several options side by side before I decide",
      targets: ["comparative"],
    },
    {
      label: "Go deep on one specific option (program, campus life, outcomes)",
      targets: ["in-depth", "in depth"],
    },
    {
      label: "Just talk 1:1 with a student who's already there",
      targets: ["associate office hours", "office hours"],
    },
  ];
  if (category === "Layover") {
    opts.unshift({
      label: "First check if my transfer is even possible (credits / eligibility)",
      targets: ["university eligibility", "eligibility verification", "eligibility"],
    });
  }
  return opts;
};

const careerFocus = (): FocusOption[] => [
  {
    label: "A complete plan to break into my target sector",
    targets: ["personalized career roadmap", "career roadmap"],
  },
  {
    label: "Get my CV / cover letter ready for real applications",
    targets: ["cv", "cover letter"],
  },
  {
    label: "Talk 1:1 with a professional in my target field",
    targets: ["expert career session", "career insights"],
  },
  {
    label: "Get interviews generated for me (direct outreach to companies)",
    targets: ["outreach", "pay per interview"],
  },
];

const focusOptionsFor = (category: string | null): FocusOption[] => {
  if (category === "Layover") return academicFocus("Layover");
  if (category === "Summit") return academicFocus("Summit");
  if (category === "Altitude") return careerFocus();
  return academicFocus("Take Off");
};

const matchService = (catalog: ServiceInfo[], category: string, targets: string[]): ServiceInfo | null => {
  const pool = catalog.filter((s) => s.category === category);
  for (const target of targets) {
    const hit = pool.find((s) => norm(s.name).includes(norm(target)));
    if (hit) return hit;
  }
  // fallback: search any category (e.g. CV may live elsewhere)
  for (const target of targets) {
    const hit = catalog.find((s) => norm(s.name).includes(norm(target)));
    if (hit) return hit;
  }
  return null;
};

const PACKAGE_LABEL: Record<string, string> = {
  "Take Off": "Take Off",
  Layover: "Layover",
  Summit: "Summit",
  Altitude: "Altitude",
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

    // ----- Q1: journey phase -----
    if (userAnswers.length === 0) {
      return new Response(JSON.stringify({
        type: "question",
        title: "Where are you in your journey?",
        message: "Pick the option that best describes you right now — it's how we find your fit.",
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

    // ----- Q2: main focus -----
    if (userAnswers.length === 1) {
      const focus = focusOptionsFor(category);
      const isCareer = category === "Altitude";
      return new Response(JSON.stringify({
        type: "question",
        title: isCareer ? "What matters most right now?" : "What would help you most right now?",
        message: "This just helps us tailor the recommendation — you'll see the full options next.",
        multi_select: false,
        options: focus.map((f) => f.label),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ----- Recommendation -----
    if (!category) {
      return new Response(JSON.stringify({
        type: "book_call",
        title: "Let's talk it through",
        message: "Your situation deserves a quick free call with our team so we can point you to the right path.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isCareer = category === "Altitude";
    const talentPool = isCareer;
    const pkgLabel = PACKAGE_LABEL[category] || category;

    // Resolve the single à-la-carte product matching the user's focus answer (option c).
    const focusAnswer = userAnswers[1] || "";
    const allFocus = focusOptionsFor(category);
    const chosen = allFocus.find((f) => norm(f.label) === norm(focusAnswer)) || allFocus[0];

    const singleNames: string[] = [];
    const single = matchService(catalog, category, chosen.targets);
    if (single) singleNames.push(single.name);

    // Encouraging copy that pushes the full package while naming the alternatives.
    const reasoning = isCareer
      ? `Based on where you are, the ${pkgLabel} package is your most complete path to an internship — one fixed price, one Associate (a professional in your field) who manages everything. Prefer to keep it lighter? You can remove any optional component. Only after one thing? Grab a single service below. And for the fastest route to companies, join our Talent Pool.`
      : `Based on where you are, the ${pkgLabel} package gives you everything in one fixed price, guided 1:1 by a student already there. Prefer it lighter? You can remove any optional component. Only need one thing right now? You can also start with a single service below.`;

    return new Response(JSON.stringify({
      type: "recommendation",
      category,
      talent_pool: talentPool,
      title: `${pkgLabel} is your best fit`,
      message: "We recommend the full package — but you're free to lighten it or pick a single service.",
      reasoning,
      // Single à-la-carte product (option c). Front-end hydrates from `service_names`.
      service_names: singleNames,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("pilot-advisor error", err);
    return new Response(JSON.stringify({ error: "server_error", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
