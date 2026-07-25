// CV Builder AI — interview + fixed-template fill (Gemini).
//   action: "ask"     -> { isComplete, question }  next interview question, or
//                          signals enough material has been gathered.
//   action: "compile" -> { data: CvData }          fills the fixed CV template
//                          from the conversation (mode "scratch") or from the
//                          pasted CV text (mode "improve").
// The layout is fixed on the frontend (CvPreview.tsx) — this function only
// ever produces text content for the placeholders, never new sections.
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

interface ChatTurn {
  role: "assistant" | "user";
  text: string;
}

interface RequestBody {
  action: "ask" | "compile";
  mode: "improve" | "scratch";
  history: ChatTurn[];
  rawCv?: string; // pasted existing CV/text, only used in "improve" mode
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

const ASK_SCHEMA = {
  type: "OBJECT",
  properties: {
    isComplete: { type: "BOOLEAN" },
    question: { type: "STRING" },
  },
  required: ["isComplete", "question"],
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new HttpError(400, "GEMINI_API_KEY secret is not set");

    const body: RequestBody = await req.json();
    const { action, mode, history = [], rawCv } = body;
    if (!action || !mode) throw new HttpError(400, "action and mode are required");

    if (action === "ask") {
      const system = buildAskSystemPrompt(mode);
      const userText = buildAskUserText(mode, history, rawCv);
      const result = await generateJson(key, system, userText, ASK_SCHEMA, 0.4);
      return json(result);
    }

    if (action === "compile") {
      const system = buildCompileSystemPrompt();
      const userText = buildCompileUserText(mode, history, rawCv);
      const result = await generateJson(key, system, userText, CV_DATA_SCHEMA, 0.3);
      return json({ data: result });
    }

    throw new HttpError(400, `Unknown action: ${action}`);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: (e as Error).message }, status);
  }
});

function buildAskSystemPrompt(mode: "improve" | "scratch"): string {
  const modeNote =
    mode === "improve"
      ? "Il candidato ha già un CV o dei testi (forniti come 'CV ESISTENTE' " +
        "qui sotto): fai SOLO le domande di chiarimento indispensabili per " +
        "colmare lacune (date mancanti, risultati poco concreti, dati di " +
        "contatto assenti). Se il CV esistente è già completo per una " +
        "sezione, non chiedere nulla su quella sezione."
      : "Il candidato parte da zero: fai domande in ordine, una sezione alla " +
        "volta (contatti → summary → education → experience → leadership → " +
        "community → additional info), raccogliendo per ogni voce " +
        "istituzione/azienda, luogo, ruolo/corso, periodo e 2-4 risultati " +
        "concreti (con numeri quando possibile).";
  return (
    "Sei un assistente che intervista un candidato per costruire un CV " +
    "professionale in inglese. " + TEMPLATE_EXPLAINER + " " + modeNote +
    " Fai UNA domanda alla volta, breve, concreta, in italiano. Non generare " +
    "mai il CV in questa fase, solo domande. Quando hai raccolto abbastanza " +
    "per compilare almeno Summary, un'istruzione (Education) e un'esperienza " +
    "(Experience), imposta isComplete=true e question=\"\" — le sezioni " +
    "Leadership/Community/Additional Information sono opzionali, non " +
    "insistere se il candidato non ha nulla da aggiungere lì (una sola " +
    "domanda di verifica basta)."
  );
}

function buildAskUserText(mode: "improve" | "scratch", history: ChatTurn[], rawCv?: string): string {
  const parts: string[] = [];
  if (mode === "improve" && rawCv?.trim()) {
    parts.push("=== CV ESISTENTE (testo incollato dal candidato) ===", rawCv.trim());
  }
  parts.push("=== CONVERSAZIONE FINORA ===");
  if (!history.length) {
    parts.push("(nessuna domanda ancora fatta — fai la prima domanda)");
  } else {
    for (const t of history) parts.push(`${t.role === "assistant" ? "Tu" : "Candidato"}: ${t.text}`);
  }
  return parts.join("\n");
}

function buildCompileSystemPrompt(): string {
  return (
    "Compila ESATTAMENTE lo schema JSON richiesto, che rispecchia un CV " +
    "professionale a una pagina. " + TEMPLATE_EXPLAINER + " Scrivi tutti i " +
    "testi in inglese professionale da CV: bullet concisi con verbi d'azione " +
    "al passato, risultati quantificati quando disponibili, NON frasi " +
    "complete/discorsive. Non inventare MAI fatti, aziende, numeri o date non " +
    "menzionati dal candidato. Se una sezione opzionale (leadership, " +
    "community, additionalInfo) non ha contenuto sufficiente, restituiscila " +
    "come array vuoto — non inventare riempitivo."
  );
}

function buildCompileUserText(mode: "improve" | "scratch", history: ChatTurn[], rawCv?: string): string {
  const parts: string[] = [];
  if (mode === "improve" && rawCv?.trim()) {
    parts.push("=== CV ESISTENTE (testo incollato dal candidato) ===", rawCv.trim());
  }
  parts.push("=== RISPOSTE RACCOLTE NELL'INTERVISTA ===");
  for (const t of history) parts.push(`${t.role === "assistant" ? "Domanda" : "Risposta"}: ${t.text}`);
  return parts.join("\n");
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
