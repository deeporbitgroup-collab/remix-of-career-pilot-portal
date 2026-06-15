import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Target, Globe, Users } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const VisionSection = () => {
  // Scroll animations
  const titleAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 100 });
  const visionCardAnimation = useScrollAnimation({ animationClass: 'animate-scale-up', delay: 200 });
  const goalsAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 300 });
  const timelineAnimation = useScrollAnimation({ animationClass: 'animate-fade-left', delay: 400 });
  
  const goals = [
    {
      icon: Globe,
      title: "Piattaforma Globale",
      description: "Espandere la nostra rete a livello internazionale per connettere studenti di tutto il mondo"
    },
    {
      icon: Users,
      title: "Matching Automatico", 
      description: "Algoritmi avanzati per collegare automaticamente ogni studente con il miglior specialista"
    },
    {
      icon: Target,
      title: "Personalizzazione AI",
      description: "Intelligenza artificiale per creare percorsi di studio e carriera completamente personalizzati"
    },
    {
      icon: Rocket,
      title: "Success Guarantee",
      description: "Garanzia di successo basata su metriche concrete e risultati misurabili"
    }
  ];

  return (
    <section className="py-12 md:py-20 bg-runway-gray">
      <div className="container mx-auto px-4">
        <div ref={titleAnimation.ref} className={`text-center mb-12 md:mb-16 ${titleAnimation.className}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4 md:mb-6">
            Visione e Obiettivi
          </h2>
          <p className="text-base md:text-xl text-steel-gray max-w-4xl mx-auto leading-relaxed px-2">
            Il nostro obiettivo a lungo termine è rivoluzionare il modo in cui gli studenti 
            accedono al supporto accademico e professionale, creando un ecosistema digitale 
            che semplifichi e ottimizzi ogni fase del percorso educativo.
          </p>
        </div>

        {/* Main Vision */}
        <Card ref={visionCardAnimation.ref} className={`bg-gradient-sky text-white shadow-aviation mb-16 transform hover:scale-105 transition-all duration-500 ${visionCardAnimation.className}`}>
          <CardContent className="p-12 text-center">
            <Rocket className="h-16 w-16 mx-auto mb-6 animate-float" />
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              La Nostra Visione
            </h3>
            <p className="text-xl md:text-2xl leading-relaxed max-w-4xl mx-auto opacity-95">
              "Creare una piattaforma digitale che colleghi automaticamente ogni studente 
              con il miglior specialista disponibile, trasformando il supporto accademico 
              in un servizio accessibile, personalizzato e di alta qualità."
            </p>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        <div ref={goalsAnimation.ref} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 ${goalsAnimation.className}`}>
          {goals.map((goal, index) => (
            <Card key={index} className="bg-white shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform hover:-translate-y-2 group">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-sky p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <goal.icon className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-lg font-bold text-primary mb-4">{goal.title}</h4>
                <p className="text-steel-gray text-sm leading-relaxed">{goal.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Timeline */}
        <div ref={timelineAnimation.ref} className={`bg-white rounded-2xl p-8 md:p-12 shadow-card-custom ${timelineAnimation.className}`}>
          <h3 className="text-3xl font-bold text-primary text-center mb-12">
            Roadmap del Futuro
          </h3>
          
          <div className="space-y-8">
            <div className="flex items-center">
              <div className="bg-gradient-sky text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mr-6 flex-shrink-0">
                2024
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">Espansione Nazionale</h4>
                <p className="text-steel-gray">Raggiungere 1000+ studenti supportati e 100+ esperti nella rete</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-gradient-sky text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mr-6 flex-shrink-0">
                2025
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">Piattaforma Digitale</h4>
                <p className="text-steel-gray">Lancio della piattaforma web con matching automatico e dashboard personalizzate</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-gradient-sky text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mr-6 flex-shrink-0">
                2026
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">Espansione Europea</h4>
                <p className="text-steel-gray">Apertura in Francia, Germania e Spagna con supporto multilingua</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-gradient-sky text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mr-6 flex-shrink-0">
                2027
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">AI Integration</h4>
                <p className="text-steel-gray">Implementazione di AI per raccomandazioni personalizzate e supporto predittivo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-bold text-primary mb-6">
            Unisciti alla Rivoluzione del Supporto Accademico
          </h3>
          <p className="text-steel-gray mb-8 max-w-2xl mx-auto">
            Fai parte della comunità che sta ridefinendo il futuro dell'educazione e della carriera professionale
          </p>
          <Button 
            size="lg"
            className="bg-gradient-sky text-white hover:opacity-90 shadow-aviation transition-all duration-300 transform hover:scale-105"
          >
            Scopri Come Partecipare
          </Button>
        </div>
      </div>
    </section>
  );
};

export default VisionSection;