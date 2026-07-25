// CV Builder AI — fixed-template fill (Gemini).
//   action: "compile" -> { data: CvData }
//     mode "scratch"  -> input is the raw draft the user filled in the form
//                        (rawData, shaped like CvData but rough/incomplete).
//     mode "improve"  -> input is an existing CV pasted as free text (rawCv).
// Either way the AI only rewrites/polishes text content into the fixed
// template (CvPreview.tsx) — it never invents facts or changes the layout.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = Deno.env.get("CV_GEMINI_MODEL") ?? "gemini-2.5-flash";

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface RequestBody {
  action: "compile";
  mode: "improve" | "scratch";
  rawCv?: string; // pasted existing CV/text — mode "improve"
  // deno-lint-ignore no-explicit-any
  rawData?: any; // draft filled in the form — mode "scratch" (shape: CvData)
}

const CV_ENTRY_SCHEMA = {
  type: "OBJECT",
  properties: {
    org: { type: "STRING" },
    location: { type: "STRING" },
    role: { type: "STRING" },
    dateRange: { type: "STRING" },
    bullets: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["org", "location", "role", "dateRange", "bullets"],
};

const CV_DATA_SCHEMA = {
  type: "OBJECT",
  properties: {
    header: {
      type: "OBJECT",
      properties: {
        fullName: { type: "STRING" },
        location: { type: "STRING" },
        phone: { type: "STRING" },
        email: { type: "STRING" },
        linkedin: { type: "STRING" },
      },
      required: ["fullName", "location", "phone", "email", "linkedin"],
    },
    summary: { type: "STRING" },
    education: { type: "ARRAY", items: CV_ENTRY_SCHEMA },
    experience: { type: "ARRAY", items: CV_ENTRY_SCHEMA },
    leadership: { type: "ARRAY", items: CV_ENTRY_SCHEMA },
    community: { type: "ARRAY", items: { type: "STRING" } },
    additionalInfo: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { label: { type: "STRING" }, text: { type: "STRING" } },
        required: ["label", "text"],
      },
    },
  },
  required: ["header", "summary", "education", "experience", "leadership", "community", "additionalInfo"],
};

const TEMPLATE_EXPLAINER =
  "The CV ALWAYS follows this fixed one-page format: Header (name, " +
  "location, phone, email, LinkedIn) · Professional Summary (2-3 lines) · " +
  "Education (blocks: institution+location, degree/program+date range, " +
  "bullets with GPA/key courses/thesis/awards) · Professional Experience " +
  "(blocks: company+location, role+date range, 2-4 bullets with concrete, " +
  "quantified achievements) · Leadership & Entrepreneurship (same " +
  "structure, OPTIONAL — only if the candidate has relevant extracurricular " +
  "or entrepreneurial experience) · Community & Volunteering (short " +
  "bullets, OPTIONAL) · Additional Information (bullets grouped by label: " +
  "Languages, Skills/Tools, Certifications...). You never decide the " +
  "layout, only the content.";

const COMPILE_SYSTEM_PROMPT =
  "Fill in EXACTLY the requested JSON schema, which mirrors a professional " +
  "one-page CV. " + TEMPLATE_EXPLAINER + " Write all text in professional " +
  "CV English: concise bullets with past-tense action verbs, quantified " +
  "achievements where available, NOT full/conversational sentences. NEVER " +
  "invent facts, companies, numbers, or dates that are not present in the " +
  "input. Do not add months or days to a date range if the input only gives " +
  "years (e.g. keep '2021-2024' as given — do not turn it into specific " +
  "months). If the Professional Summary field is empty or missing, write " +
  "one yourself based on the rest of the CV. If an optional section " +
  "(leadership, community, additionalInfo) doesn't have enough content in " +
  "the input, return it as an empty array — never invent filler.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new HttpError(400, "GEMINI_API_KEY secret is not set");

    const body: RequestBody = await req.json();
    const { action, mode, rawCv, rawData } = body;
    if (action !== "compile" || !mode) throw new HttpError(400, "action must be 'compile' and mode is required");

    const userText = buildCompileUserText(mode, rawCv, rawData);
    const result = await generateJson(key, COMPILE_SYSTEM_PROMPT, userText, CV_DATA_SCHEMA, 0.3);
    return json({ data: result });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: (e as Error).message }, status);
  }
});

function buildCompileUserText(mode: "improve" | "scratch", rawCv?: string, rawData?: unknown): string {
  if (mode === "improve") {
    if (!rawCv?.trim()) throw new HttpError(400, "rawCv is required in 'improve' mode");
    return ["=== EXISTING CV (text pasted by the candidate) ===", rawCv.trim()].join("\n");
  }
  if (!rawData) throw new HttpError(400, "rawData is required in 'scratch' mode");
  return [
    "=== DRAFT FILLED IN BY THE CANDIDATE IN THE FORM (JSON, may be " +
      "informal, incomplete, or rough text — rewrite the wording well while " +
      "keeping the same facts) ===",
    JSON.stringify(rawData, null, 2),
  ].join("\n");
}

async function generateJson(
  key: string,
  system: string,
  userText: string,
  schema: Record<string, unknown>,
  temperature: number,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const res = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { temperature, responseMimeType: "application/json", responseSchema: schema },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(502, `Gemini error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  // deno-lint-ignore no-explicit-any
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // deno-lint-ignore no-explicit-any
  const text = parts.map((p: any) => p.text ?? "").join("").trim();
  if (!text) throw new HttpError(502, "Empty response from Gemini");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, "Gemini returned invalid JSON");
  }
}
