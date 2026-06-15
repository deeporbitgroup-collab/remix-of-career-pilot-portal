import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-cloud-white to-runway-gray py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna Indietro
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center text-primary">
              Privacy Policy & GDPR
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">1. Introduzione</h2>
              <p className="text-steel-gray leading-relaxed">
                Career Pilot rispetta la tua privacy e si impegna a proteggere i tuoi dati personali. 
                Questa informativa sulla privacy descrive come raccogliamo, utilizziamo e proteggiamo le tue informazioni 
                in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR) dell'Unione Europea.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">2. Titolare del Trattamento</h2>
              <p className="text-steel-gray leading-relaxed">
                Il titolare del trattamento dei dati personali è Career Pilot. 
                Per qualsiasi domanda sulla privacy, puoi contattarci all'indirizzo: 
                <a href="mailto:Careerpilot2025@gmail.com" className="text-primary hover:underline ml-1">
                  Careerpilot2025@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">3. Dati Raccolti</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                Raccogliamo le seguenti categorie di dati personali:
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Per Studenti:</h3>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1">
                    <li>Dati anagrafici (nome, cognome, email, telefono)</li>
                    <li>CV e lettera di presentazione</li>
                    <li>Foto profilo</li>
                    <li>Profilo LinkedIn (se fornito)</li>
                    <li>Preferenze professionali (settori, tipologia azienda, remunerazione)</li>
                    <li>Dati di pagamento (gestiti tramite sistemi di pagamento sicuri)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-primary mb-2">Per Aziende:</h3>
                  <ul className="list-disc pl-6 text-steel-gray space-y-1">
                    <li>Nome azienda</li>
                    <li>Settore e dimensioni</li>
                    <li>Email di riferimento</li>
                    <li>Profilo LinkedIn aziendale (se fornito)</li>
                    <li>Logo aziendale</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">4. Finalità del Trattamento</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                I tuoi dati personali vengono trattati per le seguenti finalità:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Fornire i servizi di consulenza e intermediazione richiesti</li>
                <li>Gestire la registrazione e l'accesso alla Talent Pool</li>
                <li>Facilitare la connessione tra studenti e aziende</li>
                <li>Processare i pagamenti</li>
                <li>Inviare comunicazioni relative ai servizi</li>
                <li>Migliorare la qualità dei nostri servizi</li>
                <li>Rispettare gli obblighi legali e fiscali</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">5. Base Giuridica del Trattamento</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                Il trattamento dei tuoi dati personali si basa su:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li><strong>Esecuzione del contratto:</strong> per fornire i servizi richiesti</li>
                <li><strong>Consenso:</strong> per finalità che richiedono il tuo esplicito consenso</li>
                <li><strong>Obbligo legale:</strong> per adempiere a obblighi di legge</li>
                <li><strong>Interesse legittimo:</strong> per migliorare i nostri servizi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">6. Condivisione dei Dati</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                I tuoi dati possono essere condivisi con:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li><strong>Aziende partner:</strong> solo i profili degli studenti approvati e con accesso attivo alla Talent Pool sono visibili alle aziende registrate</li>
                <li><strong>Fornitori di servizi:</strong> per l'elaborazione dei pagamenti e l'hosting della piattaforma</li>
                <li><strong>Autorità competenti:</strong> quando richiesto dalla legge</li>
              </ul>
              <p className="text-steel-gray leading-relaxed mt-3">
                Non vendiamo né cediamo i tuoi dati personali a terzi per scopi di marketing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">7. Conservazione dei Dati</h2>
              <p className="text-steel-gray leading-relaxed">
                Conserviamo i tuoi dati personali per il tempo necessario a fornire i servizi richiesti e per adempiere agli obblighi legali. 
                Quando non sono più necessari, i dati vengono cancellati o resi anonimi in modo sicuro.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">8. I Tuoi Diritti GDPR</h2>
              <p className="text-steel-gray leading-relaxed mb-3">
                In conformità con il GDPR, hai il diritto di:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li><strong>Accesso:</strong> richiedere una copia dei tuoi dati personali</li>
                <li><strong>Rettifica:</strong> correggere dati inesatti o incompleti</li>
                <li><strong>Cancellazione:</strong> richiedere la cancellazione dei tuoi dati ("diritto all'oblio")</li>
                <li><strong>Limitazione:</strong> limitare il trattamento dei tuoi dati in determinate circostanze</li>
                <li><strong>Portabilità:</strong> ricevere i tuoi dati in un formato strutturato e leggibile</li>
                <li><strong>Opposizione:</strong> opporti al trattamento dei tuoi dati per determinate finalità</li>
                <li><strong>Revoca del consenso:</strong> revocare il consenso al trattamento in qualsiasi momento</li>
              </ul>
              <p className="text-steel-gray leading-relaxed mt-3">
                Per esercitare questi diritti, contattaci all'indirizzo: 
                <a href="mailto:Careerpilot2025@gmail.com" className="text-primary hover:underline ml-1">
                  Careerpilot2025@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">9. Sicurezza dei Dati</h2>
              <p className="text-steel-gray leading-relaxed">
                Implementiamo misure di sicurezza tecniche e organizzative appropriate per proteggere i tuoi dati personali 
                da accessi non autorizzati, perdita, distruzione o alterazione. Questi includono:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Crittografia dei dati in transito e a riposo</li>
                <li>Controllo degli accessi basato sui ruoli</li>
                <li>Audit regolari della sicurezza</li>
                <li>Formazione del personale sulla protezione dei dati</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">10. Cookie e Tecnologie di Tracciamento</h2>
              <p className="text-steel-gray leading-relaxed">
                Utilizziamo cookie e tecnologie simili per migliorare la tua esperienza sulla piattaforma, 
                analizzare l'utilizzo e fornire funzionalità personalizzate. Puoi gestire le tue preferenze sui cookie 
                attraverso le impostazioni del browser.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">11. Trasferimento Dati</h2>
              <p className="text-steel-gray leading-relaxed">
                I tuoi dati personali sono conservati all'interno dell'Unione Europea. 
                In caso di trasferimento verso paesi terzi, garantiamo che vengano applicate garanzie appropriate 
                in conformità con il GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">12. Minori</h2>
              <p className="text-steel-gray leading-relaxed">
                I nostri servizi non sono destinati a minori di 16 anni. Non raccogliamo consapevolmente dati personali 
                da minori di 16 anni senza il consenso dei genitori o tutori legali.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">13. Modifiche alla Privacy Policy</h2>
              <p className="text-steel-gray leading-relaxed">
                Potremmo aggiornare questa Privacy Policy periodicamente. Ti informeremo di eventuali modifiche sostanziali 
                tramite email o tramite un avviso sulla piattaforma. La versione aggiornata sarà sempre disponibile su questa pagina.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">14. Reclami</h2>
              <p className="text-steel-gray leading-relaxed">
                Se ritieni che i tuoi diritti in materia di protezione dei dati siano stati violati, 
                hai il diritto di presentare un reclamo all'autorità di controllo competente (Garante per la Protezione dei Dati Personali).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">15. Contatti</h2>
              <p className="text-steel-gray leading-relaxed">
                Per qualsiasi domanda o richiesta relativa alla presente Privacy Policy o al trattamento dei tuoi dati personali, 
                puoi contattarci all'indirizzo: 
                <a href="mailto:Careerpilot2025@gmail.com" className="text-primary hover:underline ml-1">
                  Careerpilot2025@gmail.com
                </a>
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-steel-gray text-center">
                Ultimo aggiornamento: Ottobre 2025
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
