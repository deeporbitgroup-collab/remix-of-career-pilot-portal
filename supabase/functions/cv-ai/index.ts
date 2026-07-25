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
  "Il CV segue SEMPRE questo formato fisso a una pagina: Header (nome, " +
  "località, telefono, email, LinkedIn) · Professional Summary (2-3 righe) · " +
  "Education (blocchi: istituzione+luogo, corso/laurea+periodo, bullet con " +
  "GPA/corsi/tesi/awards) · Professional Experience (blocchi: azienda+luogo, " +
  "ruolo+periodo, 2-4 bullet con risultati concreti e verbi d'azione) · " +
  "Leadership & Entrepreneurship (stessa struttura, OPZIONALE, solo se il " +
  "candidato ha esperienze extracurriculari/imprenditoriali rilevanti) · " +
  "Community & Volunteering (bullet brevi, OPZIONALE) · Additional " +
  "Information (bullet raggruppati per etichetta: Languages, Skills/Tools, " +
  "Certifications...). Tu non decidi mai il layout, solo i contenuti.";

const COMPILE_SYSTEM_PROMPT =
  "Compila ESATTAMENTE lo schema JSON richiesto, che rispecchia un CV " +
  "professionale a una pagina. " + TEMPLATE_EXPLAINER + " Scrivi tutti i " +
  "testi in inglese professionale da CV: bullet concisi con verbi d'azione " +
  "al passato, risultati quantificati quando disponibili, NON frasi " +
  "complete/discorsive. Non inventare MAI fatti, aziende, numeri o date non " +
  "presenti nell'input. Se il campo Professional Summary è vuoto o assente, " +
  "scrivine uno tu basandoti sul resto del CV. Se una sezione opzionale " +
  "(leadership, community, additionalInfo) non ha contenuto sufficiente " +
  "nell'input, restituiscila come array vuoto — non inventare riempitivo.";

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
    return ["=== CV ESISTENTE (testo incollato dal candidato) ===", rawCv.trim()].join("\n");
  }
  if (!rawData) throw new HttpError(400, "rawData is required in 'scratch' mode");
  return [
    "=== BOZZA COMPILATA DAL CANDIDATO NEL FORM (JSON, può essere " +
      "informale, incompleta o con testo grezzo — riscrivi bene i testi " +
      "mantenendo gli stessi fatti) ===",
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
