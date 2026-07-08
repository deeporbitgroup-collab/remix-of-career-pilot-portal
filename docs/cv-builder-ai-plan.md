# CV Builder AI — Piano di lavoro

> Nota di ripresa: continuare da casa. Tutto il materiale del template CV è
> sull'altro computer. Prima si costruisce lo strumento funzionante, poi lo si
> aggiunge al sito come prodotto (paywall/Stripe DOPO).

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

## Architettura (riusa pattern già presenti nel repo)

Mattoni già disponibili nel progetto:
- **PDF**: `pdf-lib` già in `package.json`.
- **AI**: Google **Gemini** già integrato (vedi `supabase/functions/crm-ai`,
  `crm-chat`; secret `GEMINI_API_KEY`; base URL
  `https://generativelanguage.googleapis.com/v1beta/models`).
- **Vendita prodotto dal sito**: flusso `KnowledgeBase` + `KnowledgeBaseCheckout`.
- **Pagamenti Stripe**: `create-order-payment`, `stripe-webhook`,
  `verify-payment`, tabella `client_orders` (aggiungere `kind:'cv_builder'` in
  fase prodotto).
- **UI**: React + shadcn + `react-hook-form` + `zod` + react-router.

### Componenti da costruire
1. **Template con segnaposto** — es. `{{nome}}`, `{{summary}}`, `{{esperienza_1}}`…
   L'AI riceve template + risposte cliente e restituisce SOLO i testi dei
   segnaposto. Il layout resta fisso.
2. **Pagina `/cv-builder`** — flusso a domande (una alla volta) + scelta modalità
   (A/B) + anteprima live del CV.
3. **Edge function `cv-ai`** — copia del pattern `crm-ai`: input = risposte +
   modalità + template → output = campi compilati. Provider: Gemini.
4. **Anteprima + PDF** — generazione con `pdf-lib` (client o edge function
   `cv-generate-pdf`), 2-3 template selezionabili.
5. **DB** — tabella `cv_documents` (bozze salvate) legata all'utente.

## Flusso utente (target)
```
1. /cv-builder → scegli modalità (Migliora / Da zero)
2. L'AI fa le domande → utente risponde
3. AI compila il template → anteprima live
4. (FASE PRODOTTO) paywall → Stripe Checkout (riuso create-order-payment)
5. (FASE PRODOTTO) stripe-webhook conferma pagamento → sblocca PDF pulito
```

## COSA SERVE PER PARTIRE (materiale sull'altro computer)
- [ ] **Il formato/template del CV** — è il cuore di tutto: definisce le domande
      che l'AI fa e dove finiscono le risposte. Portarlo qui (testo incollato,
      file Word/PDF, o immagine del modello) e metterlo in `docs/` o dirmelo.
- [ ] Confermare campi/sezioni del template (Intestazione, Profilo, Esperienze,
      Formazione, Skill, Lingue, …).
- [ ] Verificare che il secret `GEMINI_API_KEY` sia disponibile per la nuova
      function `cv-ai`.

## Ordine di lavoro
1. Ottenere/definire il template con segnaposto.
2. Costruire la pagina `/cv-builder` + flusso domande (modalità A e B).
3. Edge function `cv-ai` (Gemini) che compila il template.
4. Anteprima + export PDF.
5. **Poi**: aggiungerlo come prodotto (Stripe/paywall).

## Note operative del progetto (già note)
- Frontend: deploy via Lovable **Publish** dopo push su `main`
  (repo `deeporbitgroup-collab/remix-of-career-pilot-portal`).
- DB: SQL via Management API (nessun cap).
- Edge functions: attenzione al cap di 100 funzioni sul piano Free (deploy con
  delete + multipart, NON PATCH). Vedi memoria progetto.
