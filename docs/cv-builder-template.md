# CV Builder — Template fisso

Formato di riferimento fornito dall'utente (luglio 2026): un CV classico a
**una pagina**, serif, sezioni con riga orizzontale sotto il titolo, righe a
due colonne (nome istituzione/azienda a sinistra, luogo a destra; ruolo in
corsivo a sinistra, date a destra), bullet con risultati concreti.

Il layout è FISSO (vedi `src/components/cv-builder/CvPreview.tsx`). L'AI
compila SOLO i testi, dentro lo schema `CvData`
(`src/lib/cvBuilder/types.ts`):

1. **Header** — nome, località, telefono, email, LinkedIn (una riga centrata).
2. **Professional Summary** — un paragrafo breve (2-3 righe).
3. **Education** — blocchi ripetibili: istituzione + luogo, corso/laurea +
   periodo, bullet (GPA, corsi chiave, tesi, exchange, awards...).
4. **Professional Experience** — blocchi ripetibili: azienda + luogo, ruolo +
   periodo, 2-4 bullet con verbi d'azione e risultati quantificati.
5. **Leadership & Entrepreneurship** — stessa struttura dei blocchi
   experience. **Sezione opzionale**: si omette se il candidato non ha nulla
   da mettere.
6. **Community & Volunteering** — riga di bullet brevi (opzionale).
7. **Additional Information** — bullet raggruppati per etichetta (Languages,
   Finance & Modelling / Skills, Programming & Tools, Certifications...).

## Cosa succede con meno esperienze

Il template è a documento (non a "card" di altezza fissa): con meno voci le
sezioni Education/Experience/Leadership hanno semplicemente meno blocchi, e le
sezioni opzionali (Leadership, Community) si omettono del tutto se vuote. Il
CV risulterà "meno pieno" ma resta comunque a una pagina, leggibile e con la
stessa impaginazione. `CvPreview` applica inoltre uno scaling automatico del
font per **non sforare mai la pagina** quando il contenuto è più lungo del
previsto (mai per riempire pagine vuote).

## Pipeline

1. Utente sceglie modalità:
   - **Migliora un CV esistente** → incolla il testo del CV attuale in una
     textarea.
   - **Costruiscilo da zero** → compila un **form con campi fissi** (stessa
     struttura dello schema `CvData`: header, summary opzionale,
     Education/Experience/Leadership come liste ripetibili con bullet,
     Community e Additional Information opzionali) — riusa il componente
     `CvEditForm` (lo stesso della tab "Modifica" del risultato).
2. Azione unica `compile` sulla edge function `cv-ai` (Gemini, structured
   output): riceve o il testo incollato (`rawCv`) o la bozza del form
   (`rawData`, JSON grezzo/informale) e restituisce il JSON `CvData`
   completo, riscrivendo i testi in inglese professionale da CV. Se il campo
   Summary è vuoto lo scrive lei in base al resto. Nessuna intervista a
   turni: un solo giro di generazione.
3. Anteprima live (`CvPreview`) + editing manuale dei campi (tab "Modifica",
   stesso `CvEditForm` del form iniziale).
4. Export PDF via stampa browser (CSS `@media print`, scoped al nodo
   `#cv-print-root`, formato A4).
5. **Fase prodotto (dopo)**: paywall Stripe, salvataggio bozze (tabella
   `cv_documents`), watermark/blur prima del pagamento.
