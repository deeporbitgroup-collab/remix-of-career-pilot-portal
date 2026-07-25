# CV Builder AI — Piano di lavoro

> STATO (25 luglio 2026): **funzionante e testato end-to-end con l'AI vera**.
> Edge function `cv-ai` **deployata su Supabase** (progetto
> `gqmmgyoviwhgqvzqbbja`, `GEMINI_API_KEY` già presente come secret). Testate
> dal vivo entrambe le modalità: "Migliora" con un CV finto volutamente
> disordinato/informale di due pagine (risultato: estratti i fatti corretti,
> ignorato il materiale irrilevante, rispettata una richiesta di riservatezza
> nel testo senza inventare il nome dell'azienda, tutto compresso in una
> pagina) e "Da zero" col form (bullet informali riscritti in inglese
> professionale, summary scritto dall'AI perché lasciato vuoto). Nessun
> errore console in nessuno dei due flussi.
>
> **Non ancora fatto**: push del branch `feature/cv-builder-ai` su GitHub +
> Publish su Lovable — quindi il tool NON è ancora raggiungibile su
> careerpilot.it. Nessun link/pulsante verso `/cv-builder` è stato aggiunto
> alla navigazione del sito (va deciso dove metterlo). Paywall/Stripe resta
> per dopo, come da piano originale.
>
> Piccola imprecisione notata nel test "Da zero": con un range tipo
> "2021-2024" (solo anni, senza mesi) l'AI a volte aggiunge mesi plausibili
> (es. "September 2021 - July 2024", tipico anno accademico italiano) non
> esplicitamente forniti dall'utente. Non blocca nulla, ma da tenere
> d'occhio — se dà fastidio si può istruire l'AI a lasciare il range così
> com'è quando l'utente non specifica i mesi.

## Obiettivo

Un **CV Builder**: l'utente inserisce le sue informazioni (form o CV
esistente) → l'AI **riempie un formato fisso di CV (il template deciso da
noi)** scrivendo bene i testi. Il layout/formato lo decidiamo noi; l'AI
compila solo i contenuti, non inventa il layout.

### Due modalità
- **Modalità A — "Migliora"**: l'utente ha già un CV / dei testi → li incolla
  in una textarea → l'AI li **riscrive e riformatta meglio** dentro il nostro
  formato.
- **Modalità B — "Da zero"**: l'utente non ha niente di pronto → compila un
  **form con campi fissi** (nome, contatti, education/experience/leadership
  come voci ripetibili con bullet, ecc.) → l'AI **scrive bene i testi** dentro
  il nostro formato, mettendo ogni informazione nella sezione giusta.

(Deciso il 25 luglio 2026: niente intervista a chat con domande a turni — un
form diretto è più prevedibile e più veloce da compilare per l'utente.)

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
  Una sola azione `compile`: riceve `rawCv` (testo incollato, modalità
  Migliora) oppure `rawData` (bozza JSON compilata nel form, modalità Da
  zero) e restituisce il JSON `CvData` completo (Gemini structured output /
  `responseSchema`), scrivendo i testi in inglese professionale da CV. Se
  Summary è vuoto lo scrive lei in base al resto. Non inventa mai fatti non
  presenti nell'input. Registrata in `supabase/config.toml` con
  `verify_jwt = false` (tool pubblico, nessun login richiesto per l'MVP).
- **`src/pages/CvBuilder.tsx`** (route `/cv-builder`) — schermata scelta
  modalità → (Migliora: incolla testo / Da zero: form con campi fissi,
  componente `CvEditForm` condiviso con la tab "Modifica") → risultato con tab
  Anteprima/Modifica manuale + pulsante "Scarica PDF".
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

## Prossimi passi

1. ~~Deploy edge function `cv-ai` su Supabase~~ — **fatto** (25 luglio 2026,
   94/100 funzioni ora).
2. ~~Test end-to-end con l'AI vera~~ — **fatto**, vedi nota di stato in cima.
3. Decidere dove mettere il link a `/cv-builder` nella navigazione del sito
   (homepage? client-portal? un CTA dedicato?).
4. Push su `main` (branch `feature/cv-builder-ai`) → Publish su Lovable.
5. Validazione utente finale (tu) con un CV vero, anche di chi ha poca
   esperienza.
6. **Poi**: fase prodotto — paywall Stripe, tabella `cv_documents` per
   salvare le bozze, eventuale generazione PDF "pulita" lato server.

## Note operative del progetto (già note)
- Frontend: deploy via Lovable **Publish** dopo push su `main`
  (repo `deeporbitgroup-collab/remix-of-career-pilot-portal`).
- DB: SQL via Management API (nessun cap).
- Edge functions: attenzione al cap di 100 funzioni sul piano Free (deploy con
  delete + multipart, NON PATCH). Vedi memoria progetto.
