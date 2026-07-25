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

1. Utente sceglie modalità: **Migliora** (ha già testi/CV) o **Da zero**.
2. Intervista a chat con l'AI (edge function `cv-ai`, azione `ask`): una
   domanda alla volta, finché non ha abbastanza materiale per ogni sezione
   essenziale (Summary, almeno 1 Education, almeno 1 Experience).
3. Azione `compile`: l'AI restituisce il JSON `CvData` completo (Gemini,
   structured output).
4. Anteprima live (`CvPreview`) + editing manuale dei campi.
5. Export PDF via stampa browser (CSS `@media print`, scoped al nodo
   `#cv-print-root`, formato A4).
6. **Fase prodotto (dopo)**: paywall Stripe, salvataggio bozze (tabella
   `cv_documents`), watermark/blur prima del pagamento.
