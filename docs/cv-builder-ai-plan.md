# CV Builder AI — Piano di lavoro

> STATO (25 luglio 2026): **strumento funzionante costruito e testato in locale**
> (branch `feature/cv-builder-ai`). Manca solo il deploy della edge function
> `cv-ai` su Supabase (serve token/CLI) + un giro di test live con l'AI vera,
> poi il push del frontend su `main` per il Publish Lovable. Paywall/Stripe
> resta per dopo, come da piano originale.

## Obiettivo

Un **CV Builder a intervista**: l'AI fa domande → l'utente risponde → l'AI
**riempie un formato fisso di CV (il template deciso da noi)** con le risposte,
scrivendo bene i testi. Il layout/formato lo decidiamo noi; l'AI compila solo i
contenuti, non inventa il layout.

### Due modalità
- **Modalità A — "Migliora"**: l'utente ha già un CV / dei testi → l'AI li
  **riscrive e riformatta meglio** dentro il nostro formato.
- **Modalità B — "Da zero"**: l'utente non ha niente → risponde alle domande →
  l'AI **scrive tutto il CV da zero** dentro il nostro formato.

Il template fisso è documentato in `docs/cv-builder-template.md`, basato sul
CV di riferimento fornito dall'utente (un CV professionale classico a una
pagina, serif, sezioni con riga orizzontale, righe a due colonne
istituzione/luogo e ruolo/date).

## Cosa è stato costruito

- **`src/lib/cvBuilder/types.ts`** — modello dati `CvData` (header, summary,
  education[], experience[], leadership[] opzionale, community[] opzionale,
  additionalInfo[] opzionale). Layout fisso, l'AI compila solo questi campi.
- **`src/components/cv-builder/CvPreview.tsx`** — anteprima fedele al formato
  di riferimento, con **auto-fit a una pagina**: misura l'altezza naturale del
  contenuto e applica uno `scale()` CSS per non sforare mai l'A4 (mai per
  riempire pagine vuote — con meno esperienze il CV è semplicemente più
  compatto, come richiesto). Se il contenuto è così lungo da scendere sotto la
  soglia minima di leggibilità (scala 0.7), lo segnala invece di tagliare in
  silenzio (banner in `CvBuilder.tsx`).
- **`src/components/cv-builder/CvEntryListEditor.tsx`** — editor riutilizzabile
  per le liste ripetibili (education/experience/leadership): aggiungi/rimuovi
  voce, bullet multi-riga.
- **`supabase/functions/cv-ai/index.ts`** — edge function Gemini, self-contained
  (pattern `service-advisor-chat`, non `crm-ai` che richiede JWT admin).
  Due azioni:
  - `ask` → intervista una domanda alla volta (in italiano), decide da sola
    quando ha raccolto abbastanza per compilare Summary + almeno 1 Education +
    1 Experience (`isComplete`).
  - `compile` → restituisce il JSON `CvData` completo (Gemini structured
    output / `responseSchema`), scrivendo i testi in inglese professionale da
    CV. Non inventa mai fatti non menzionati.
  Registrata in `supabase/config.toml` con `verify_jwt = false` (tool pubblico,
  nessun login richiesto per l'MVP).
- **`src/pages/CvBuilder.tsx`** (route `/cv-builder`) — schermata scelta
  modalità → (modalità Migliora: incolla testo) → chat intervista →
  risultato con tab Anteprima/Modifica manuale + pulsante "Scarica PDF".
- **Export PDF** — `window.print()` con CSS `@media print` scoped al nodo
  `#cv-print-root` (in `src/index.css`), formato A4: l'utente stampa/salva PDF
  dal dialogo nativo del browser, garantendo fedeltà pixel-perfect
  all'anteprima. (Non pdf-lib: per un layout a colonne con contenuto
  variabile la stampa CSS è molto più affidabile nel garantire "sempre una
  pagina" rispetto a un layout manuale con pdf-lib; si può rivalutare in fase
  prodotto se serve un PDF "pulito" post-pagamento senza dialogo di stampa.)

## Test fatti in locale

`npm run dev` + Playwright headless: schermata scelta modalità, transizione
paste, e **tre casi limite sul rendering** (fixture manuali, senza chiamare
l'AI):
1. CV pieno (i dati dell'utente, quasi identico all'originale) → 1 pagina,
   nessuno scaling necessario.
2. CV con pochissime esperienze (studentessa al secondo anno) → 1 pagina,
   compatto ma leggibile, nessun problema.
3. CV artificialmente troppo lungo (esperienze duplicate) → auto-fit riduce
   la scala e sta comunque su una pagina; se esagerato oltre ogni ragionevole
   intervista reale, mostra il banner di avviso invece di tagliare.

Bug reale trovato e corretto durante il test: la logica di auto-fit
mutava `el.style.transform` direttamente nel DOM per la misurazione, andando
in race con l'aggiornamento di stato di React quando il valore di scala
calcolato non cambiava tra due misurazioni consecutive (React salta il
re-render a parità di stato) — il DOM restava bloccato sul valore imperativo
sbagliato. Rimossa la mutazione inutile (i transform CSS non influenzano mai
`scrollHeight`).

**Non ancora testato dal vivo**: la chiamata reale a Gemini (la edge function
`cv-ai` non è ancora deployata su Supabase — serve un token/CLI per il
deploy, che va fatto dalla macchina con accesso).

## Prossimi passi

1. Deploy edge function `cv-ai` su Supabase (progetto `gqmmgyoviwhgqvzqbbja`,
   attenzione al cap funzioni — 93/100 al momento, c'è margine) + verificare
   che il secret `GEMINI_API_KEY` sia impostato.
2. Test end-to-end con l'AI vera: intervista completa modalità A e B,
   controllare qualità dei testi generati e che l'intervista non faccia
   troppe/troppo poche domande.
3. Push su `main` (branch `feature/cv-builder-ai`) → Publish su Lovable.
4. Validazione utente finale (tu) con un CV vero, anche di chi ha poca
   esperienza.
5. **Poi**: fase prodotto — paywall Stripe, tabella `cv_documents` per
   salvare le bozze, eventuale generazione PDF "pulita" lato server.

## Note operative del progetto (già note)
- Frontend: deploy via Lovable **Publish** dopo push su `main`
  (repo `deeporbitgroup-collab/remix-of-career-pilot-portal`).
- DB: SQL via Management API (nessun cap).
- Edge functions: attenzione al cap di 100 funzioni sul piano Free (deploy con
  delete + multipart, NON PATCH). Vedi memoria progetto.
