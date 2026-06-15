import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
              Termini e Condizioni
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">1. Introduzione</h2>
              <p className="text-steel-gray leading-relaxed">
                Benvenuto su Career Pilot. Utilizzando i nostri servizi, accetti di essere vincolato dai presenti Termini e Condizioni. 
                Ti preghiamo di leggerli attentamente prima di utilizzare la piattaforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">2. Servizi Offerti</h2>
              <p className="text-steel-gray leading-relaxed">
                Career Pilot offre servizi di consulenza per studenti e intermediazione tra studenti e aziende attraverso la Talent Pool. 
                I nostri servizi includono:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Consulenze personalizzate per percorsi accademici e professionali</li>
                <li>Accesso alla Talent Pool per studenti verificati</li>
                <li>Connessione diretta con aziende partner</li>
                <li>Supporto nella ricerca di opportunità di stage e lavoro</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">3. Registrazione e Account</h2>
              <p className="text-steel-gray leading-relaxed">
                Per utilizzare alcuni servizi della piattaforma, è necessario creare un account. Ti impegni a:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Fornire informazioni accurate, complete e aggiornate</li>
                <li>Mantenere la sicurezza della password del tuo account</li>
                <li>Notificarci immediatamente in caso di uso non autorizzato del tuo account</li>
                <li>Essere responsabile di tutte le attività che avvengono tramite il tuo account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">4. Talent Pool - Studenti</h2>
              <p className="text-steel-gray leading-relaxed">
                L'accesso alla Talent Pool per studenti è soggetto alle seguenti condizioni:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Approvazione della registrazione da parte di Career Pilot</li>
                <li>Pagamento di un abbonamento mensile di €5</li>
                <li>In caso di selezione da parte di un'azienda, pagamento di €85 (inclusi i mesi di abbonamento già pagati)</li>
                <li>Mantenimento di un profilo aggiornato e professionale</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">5. Talent Pool - Aziende</h2>
              <p className="text-steel-gray leading-relaxed">
                L'accesso alla Talent Pool per le aziende è gratuito e soggetto alle seguenti condizioni:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Registrazione e approvazione da parte di Career Pilot</li>
                <li>Utilizzo responsabile delle informazioni degli studenti</li>
                <li>Rispetto delle normative sul lavoro e sugli stage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">6. Pagamenti e Rimborsi</h2>
              <p className="text-steel-gray leading-relaxed">
                Tutti i pagamenti sono processati in modo sicuro. I pagamenti per l'abbonamento mensile alla Talent Pool non sono rimborsabili. 
                In caso di selezione da parte di un'azienda, il pagamento finale di €85 include gli abbonamenti già versati.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">7. Proprietà Intellettuale</h2>
              <p className="text-steel-gray leading-relaxed">
                Tutti i contenuti presenti sulla piattaforma Career Pilot, inclusi testi, grafiche, loghi, icone e software, 
                sono di proprietà di Career Pilot o dei suoi fornitori di contenuti e sono protetti dalle leggi italiane e internazionali 
                sul diritto d'autore.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">8. Limitazione di Responsabilità</h2>
              <p className="text-steel-gray leading-relaxed">
                Career Pilot si impegna a fornire servizi di alta qualità, tuttavia:
              </p>
              <ul className="list-disc pl-6 text-steel-gray space-y-2">
                <li>Non garantiamo il successo nella ricerca di opportunità di lavoro o stage</li>
                <li>Non siamo responsabili per eventuali danni derivanti dall'utilizzo della piattaforma</li>
                <li>Non siamo responsabili per il comportamento di studenti o aziende registrate</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">9. Modifiche ai Termini</h2>
              <p className="text-steel-gray leading-relaxed">
                Ci riserviamo il diritto di modificare questi Termini e Condizioni in qualsiasi momento. 
                Le modifiche saranno efficaci immediatamente dopo la loro pubblicazione sulla piattaforma. 
                Continuando a utilizzare i nostri servizi dopo tali modifiche, accetti i nuovi termini.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">10. Legge Applicabile</h2>
              <p className="text-steel-gray leading-relaxed">
                Questi Termini e Condizioni sono regolati dalla legge italiana. Qualsiasi controversia sarà sottoposta 
                alla giurisdizione esclusiva dei tribunali italiani.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">11. Contatti</h2>
              <p className="text-steel-gray leading-relaxed">
                Per qualsiasi domanda riguardo a questi Termini e Condizioni, puoi contattarci all'indirizzo: 
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

export default Terms;
