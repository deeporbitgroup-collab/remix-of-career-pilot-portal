import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Plane, RefreshCw, TrendingUp, GraduationCap, Check, MapPin, Headphones, ChevronRight, Calendar, FileText, Users, Presentation, ArrowRight, MessageCircle, BookOpen } from "lucide-react";
import whatsappLogo from "@/assets/whatsapp-logo.png";
import BookingPopup from "./BookingPopup";
import JobHubFormDialog from "./JobHubFormDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useScrollAnimation, useStaggeredAnimation } from "@/hooks/useScrollAnimation";

const ServicesSection = () => {
  const navigate = useNavigate();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [activeFlightPlansIndex, setActiveFlightPlansIndex] = useState(0);
  const [flightPlansHintDismissed, setFlightPlansHintDismissed] = useState(false);
  const [isJobHubFormOpen, setIsJobHubFormOpen] = useState(false);
  const { language } = useLanguage();
  const t = translations[language];
  
  // Staggered animation for service cards
  const staggeredCards = useStaggeredAnimation(3, { 
    animationClass: 'animate-zoom-in', 
    staggerDelay: 150 
  });
  const currentLang = language;
  const sliderRef = useRef<HTMLDivElement>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout>();
  const isMobileRef = useRef(false);
  
  const titleAnimation = useScrollAnimation({ delay: 0 });
  const subtitleAnimation = useScrollAnimation({ delay: 100 });
  const cardsAnimation = useScrollAnimation({ delay: 200, animationClass: 'animate-fade-up' });
  const jobHubAnimation = useScrollAnimation({ delay: 300, animationClass: 'animate-fade-up' });
  const processAnimation = useScrollAnimation({ delay: 100, animationClass: 'animate-fade-up' });
  const flightPlansAnimation = useScrollAnimation({ delay: 150, animationClass: 'animate-fade-up' });
  const stepsAnimation = useStaggeredAnimation(3, { animationClass: 'animate-fade-up', staggerDelay: 150 });
  const flightPlansCardsAnimation = useStaggeredAnimation(3, { animationClass: 'animate-fade-up', staggerDelay: 120 });

  const services = [
    {
      id: "takeoff",
      title: t.services.takeoff.title,
      subtitle: t.services.takeoff.subtitle,
      icon: <Plane className="h-6 w-6 text-white" />,
      description: t.services.takeoff.description,
      color: "bg-[#2B579A]",
      details: [
        {
          title: t.services.takeoff.timeline,
          features: language === 'it' ? [
            "Timeline d'accesso con scadenze e piano studio per test d'ingresso",
            "Accesso scontato alle migliori risorse di preparazione incluse nel piano di studio",
            "Creata da uno studente dell'Università di Interesse",
            "Presentata in un meeting online 1:1 dallo studente dell'Università di Interesse"
          ] : [
            "Access timeline with deadlines and study plan for entrance tests",
            "Discounted access to the best preparation resources included in the study plan",
            "Created by a student from the University of Interest",
            "Presented in a 1:1 online meeting by the student from the University of Interest"
          ]
        },
        {
          title: t.services.takeoff.comparative,
          features: language === 'it' ? [
            "Creata da 2+ studenti delle università di interesse",
            "Dati quantitativi + insight non pubblici per facilitare la scelta",
            "Conclusione con KPI di confronto e opinioni personali"
          ] : [
            "Created by 2+ students from the universities of interest",
            "Quantitative data + non-public insights to facilitate choice",
            "Conclusion with comparison KPIs and personal opinions"
          ]
        },
        {
          title: "Pathways",
          description: language === 'it' 
            ? "Costruisci un CV competitivo per l'accesso universitario attraverso i 4 pilastri fondamentali"
            : "Build a competitive CV for university admission through 4 fundamental pillars",
          features: language === 'it' ? [
            "Volontariato: esperienze che dimostrano impegno sociale",
            "Lingue: certificazioni e programmi internazionali",
            "Exchange: esperienze di studio all'estero",
            "Public Speaking: capacità comunicative e leadership"
          ] : [
            "Volunteering: experiences that demonstrate social commitment",
            "Languages: certifications and international programs",
            "Exchange: study abroad experiences",
            "Public Speaking: communication skills and leadership"
          ],
          ctaText: language === 'it' ? "Vai alla piattaforma" : "Go to platform",
          ctaHref: "/platforms/pathways"
        },
        {
          title: t.services.takeoff.inDepth,
          features: language === 'it' ? [
            "Presentazione realizzata da uno studente dell'università di interesse",
            "Dati quantitativi + esperienza personale",
            "Conclusione con consigli di carriera personalizzati sul tuo profilo"
          ] : [
            "Presentation created by a student from the university of interest",
            "Quantitative data + personal experience",
            "Conclusion with personalized career advice based on your profile"
          ]
        }
      ]
    },
    {
      id: "layover",
      title: t.services.layover.title,
      subtitle: t.services.layover.subtitle,
      icon: <RefreshCw className="h-6 w-6 text-white" />,
      description: t.services.layover.description,
      color: "bg-[#9B59B6]",
      details: [
        {
          title: t.services.layover.clearance,
          features: [
            language === 'it' 
              ? "Career Pilot contatta le università tramite contatti diretti con gli Admission Office per verificare l'idoneità al trasferimento"
              : "Career Pilot contacts universities through direct connections with Admission Offices to verify transfer eligibility"
          ]
        },
        {
          title: t.services.takeoff.timeline,
          features: language === 'it' ? [
            "Timeline d'accesso con scadenze e piano studio per test d'ingresso",
            "Accesso scontato alle migliori risorse di preparazione incluse nel piano di studio",
            "Creata da uno studente dell'Università di Interesse",
            "Presentata in un meeting online 1:1 dallo studente dell'Università di Interesse"
          ] : [
            "Access timeline with deadlines and study plan for entrance tests",
            "Discounted access to the best preparation resources included in the study plan",
            "Created by a student from the University of Interest",
            "Presented in a 1:1 online meeting by the student from the University of Interest"
          ]
        },
        {
          title: t.services.takeoff.comparative,
          features: language === 'it' ? [
            "Creata da 2+ studenti delle università di interesse",
            "Dati quantitativi + insight non pubblici per facilitare la scelta",
            "Conclusione con KPI di confronto e opinioni personali"
          ] : [
            "Created by 2+ students from the universities of interest",
            "Quantitative data + non-public insights to facilitate choice",
            "Conclusion with comparison KPIs and personal opinions"
          ]
        },
        {
          title: t.services.takeoff.inDepth,
          features: language === 'it' ? [
            "Presentazione realizzata da uno studente dell'università di interesse",
            "Dati quantitativi + esperienza personale",
            "Conclusione con consigli di carriera personalizzati sul tuo profilo"
          ] : [
            "Presentation created by a student from the university of interest",
            "Quantitative data + personal experience",
            "Conclusion with personalized career advice based on your profile"
          ]
        }
      ]
    },
    {
      id: "altitude",
      title: t.services.altitude.title, 
      subtitle: t.services.altitude.subtitle,
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      description: language === 'it' ? "Supporto per stage e opportunità professionali" : "Support for internships and professional opportunities",
      color: "bg-[#16A34A]",
      details: [
        {
          title: language === 'it' ? "Orientamento Settoriale" : "Career Insights",
          features: language === 'it' ? [
            "Call con un professionista che lavora nel settore d'interesse",
            "Requisiti, competenze e dinamiche del settore",
            "Career tips pratici su misura del profilo dello studente"
          ] : [
            "Call with a professional working in the sector of interest",
            "Requirements, skills, and sector dynamics",
            "Practical career tips tailored to the student's profile"
          ]
        },
        {
          title: "Personalized Career Roadmap",
          features: language === 'it' ? [
            "Ti mettiamo in contatto con un professionista che lavora nel tuo campo di interesse",
            "L'esperto esamina il tuo CV e ti intervista per conoscerti meglio",
            "Sulla base della propria esperienza, progetta una roadmap pratica personalizzata",
            "Delinea quali corsi seguire, competenze da sviluppare, associazioni e attività a cui partecipare",
            "Include certificazioni da perseguire, progetti da costruire, opportunità di networking e altro",
            "Obiettivo: entrare con successo nel campo desiderato"
          ] : [
            "We connect you with a professional currently working in your field of interest",
            "The expert reviews your CV and interviews you to get to know you better",
            "Based on their own experience, designs a practical personalized roadmap",
            "Outlines which courses to take, skills to develop, associations and activities to participate in",
            "Includes certifications to pursue, projects to build, networking opportunities and more",
            "Goal: enter the field successfully"
          ]
        },
        {
          title: t.services.altitude.placement,
          features: language === 'it' ? [
            <span><strong>Standard Option:</strong> Accesso alla talent pool: piattaforma che mette in contatto aziende e studenti</span>,
            "Sono le aziende a scegliere il profilo giusto, non il contrario",
            <span><strong>{t.services.altitude.boost}:</strong> Utilizziamo il nostro network (team e aziende partner) per trovarti lo stage. Se non ci riusciamo, ti rimborsiamo</span>,
            "Con \"trovarti lo stage\" intendiamo che l'azienda valida il tuo CV e avvia il colloquio o l'assunzione"
          ] : [
            <span><strong>Standard Option:</strong> Access to the talent pool: a platform that connects companies and students</span>,
            "It's the companies that choose the right profile, not the other way around",
            <span><strong>{t.services.altitude.boost}:</strong> We use our network (team and partner companies) to find you an internship. If we don't succeed, we refund you</span>,
            "By \"find you an internship\" we mean that the company validates your CV and proceeds with an interview or a job offer"
          ],
          ctaText: language === 'it' ? "Vai Alla Talent Pool" : "Go to Talent Pool",
          ctaHref: "/talent-pool"
        },
        {
          title: "CV, Cover & Interview by CareerBoost & Talflow",
          features: language === 'it' ? [
            "Servizio gestito da CareerBoost",
            "CV + cover letter riscritti da un esperto",
            "Simulazioni di colloquio + accesso a masterclass"
          ] : [
            "Service managed by CareerBoost",
            "CV + cover letter rewritten by an expert",
            "Interview simulations + access to masterclasses"
          ]
        },
        {
          title: "Expert Career Session",
          features: language === 'it' ? [
            "Sessione 1:1 di 60 minuti con un professionista del settore",
            "Personalizzata sulle tue esigenze: colloqui, preparazione tecnica, strategia di ruolo o approfondimenti",
            "Prima della sessione specifichi esattamente cosa ti serve, così l'esperto può prepararsi",
            "Può includere: preparazione colloqui (behavioral, tecnici, case), prep tecnica specifica (Excel, modeling, analytics), analisi gap competenze, revisione CV e profilo, transizione verso nuovo ruolo o settore"
          ] : [
            "60-minute 1:1 session with an industry professional",
            "Tailored to your exact career need: interviews, technical prep, role strategy, or skill deep-dives",
            "Before the session, you specify exactly what you need help with, so the expert can prepare in advance",
            "Can cover: Interview preparation (behavioral, technical, case-based), Role-specific technical prep (Excel tests, modeling, analytics, tools), Skill gap analysis, CV and profile review, Transition into a new role or industry"
          ]
        },
        {
          title: "Outreach Power Pack — Pay Per Interview",
          features: language === 'it' ? [
            "Servizio \"done-for-you\" con modello pay-per-interview: non paghi per le email, paghi solo per i colloqui ottenuti",
            "Creiamo un'email di outreach dedicata usando il tuo nome e cognome (a cui avrai accesso)",
            "Identifichiamo aziende/team dove il tuo profilo ha più probabilità di successo (basato sul tuo CV)",
            "Conduciamo una campagna di outreach mirata e, dove disponibile, sfruttiamo i contatti interni del team per accelerare le opportunità",
            "Ricevi un riepilogo di cosa è stato inviato, chi è stato contattato e follow-up consigliati",
            <span><strong>Prezzo:</strong> €250 per ogni colloquio confermato. Nessuna fee iniziale, nessun costo per email — paghi solo quando un contatto si trasforma in un colloquio reale</span>
          ] : [
            "\"Done-for-you\" outreach service with a pay-per-interview model: you don't pay per email, you pay only per interview secured",
            "We create a dedicated outreach email using your first and last name (you will have access)",
            "We identify companies/teams where your profile is most likely to get traction (based on your CV)",
            "We run a targeted outreach campaign and, where available, leverage internal team contacts to surface opportunities faster",
            "You receive a summary of what was sent, who was contacted, and recommended follow-ups",
            <span><strong>Pricing:</strong> €250 per interview secured. No upfront fee, no per-email cost — you are billed only when a contacted lead turns into a confirmed interview</span>
          ]
        }
      ]
    },
    {
      id: "summit",
      title: t.services.summit.title,
      subtitle: t.services.summit.subtitle,
      icon: <GraduationCap className="h-6 w-6 text-white" />,
      description: t.services.summit.description,
      color: "bg-[#EF4444]",
      isComingSoon: false
    },
    {
      id: "job-hub",
      title: "Job Updates Hub",
      subtitle: language === 'it' ? "Aggiornamenti WhatsApp" : "WhatsApp Updates",
      icon: <img src={whatsappLogo} alt="WhatsApp" className="h-12 w-12" />,
      description: language === 'it' 
        ? "Accedi al nostro gruppo WhatsApp esclusivo dove ricevi aggiornamenti su scadenze per job applications, nuove opportunità e stage in Italia e nel Regno Unito, divisi per settore." 
        : "Access our exclusive WhatsApp group where you receive updates on job application deadlines, new opportunities and internships in Italy and the UK, divided by sector.",
      color: "bg-[#25D366]",
      isJobHub: true
    }
  ];

  const steps = [
    {
      icon: <Check className="h-6 w-6 text-white" />,
      title: "FREE Check-In",
      description: t.services.process.checkIn,
      mobileTitle: "FREE Check-In"
    },
    {
      icon: <MapPin className="h-6 w-6 text-white" />,
      title: "Customized Flight Plan",
      description: t.services.process.flightPlan,
      mobileTitle: "Customized Flight Plan realized by one of our experts"
    },
    {
      icon: <Headphones className="h-6 w-6 text-white" />,
      title: "Control Hub",
      description: t.services.process.controlHub,
      mobileTitle: "Control Hub"
    }
  ];

  // Check if mobile and show hint
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 576;
      isMobileRef.current = mobile;
      
      if (mobile && !sessionStorage.getItem('servicesHintDismissed')) {
        setShowHint(true);
        
        // Auto-hide after 6 seconds
        hintTimeoutRef.current = setTimeout(() => {
          setShowHint(false);
          sessionStorage.setItem('servicesHintDismissed', 'true');
        }, 6000);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  // Setup hint display for flight plans carousel
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 576;
      
      if (isMobile && !sessionStorage.getItem('flightPlansHintDismissed')) {
        setFlightPlansHintDismissed(false);
        
        // Auto-hide hint after 6 seconds
        setTimeout(() => {
          setFlightPlansHintDismissed(true);
          sessionStorage.setItem('flightPlansHintDismissed', 'true');
        }, 6000);
      } else if (sessionStorage.getItem('flightPlansHintDismissed')) {
        setFlightPlansHintDismissed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [flightPlansHintDismissed]);

  // Handle scroll event for mobile
  const handleScroll = () => {
    if (!sliderRef.current || !isMobileRef.current) return;
    
    const scrollLeft = sliderRef.current.scrollLeft;
    const cardWidth = sliderRef.current.offsetWidth * 0.92;
    const newActiveCard = Math.round(scrollLeft / cardWidth);
    
    if (newActiveCard !== activeCard) {
      setActiveCard(newActiveCard);
      
      // Hide hint on first scroll
      if (showHint) {
        setShowHint(false);
        sessionStorage.setItem('servicesHintDismissed', 'true');
        if (hintTimeoutRef.current) {
          clearTimeout(hintTimeoutRef.current);
        }
      }
    }
  };

  // Navigate to specific card
  const scrollToCard = (index: number) => {
    if (!sliderRef.current) return;
    
    const cardWidth = sliderRef.current.offsetWidth * 0.92;
    sliderRef.current.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth'
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobileRef.current) return;
      
      if (e.key === 'ArrowLeft' && activeCard > 0) {
        scrollToCard(activeCard - 1);
      } else if (e.key === 'ArrowRight' && activeCard < services.length - 1) {
        scrollToCard(activeCard + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCard, services.length]);

  return (
    <section id="servizi" className="py-12 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-16">
          <h2 ref={titleAnimation.ref} className={`text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4 md:mb-6 ${titleAnimation.className}`}>
            {t.services.title}
          </h2>
          <p ref={subtitleAnimation.ref} className={`text-base md:text-xl text-steel-gray max-w-4xl mx-auto leading-relaxed px-2 ${subtitleAnimation.className}`}>
            {t.services.subtitle}
          </p>
        </div>

        {/* Core Services separator */}
        <div className="flex items-center gap-4 max-w-2xl mx-auto mb-10 md:mb-14">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase whitespace-nowrap">
            {language === 'it' ? 'Servizi Principali' : 'Core Services'}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Mobile Carousel */}
        <div 
          className="block md:hidden relative"
          role="region"
          aria-label={language === 'it' ? 'Carosello servizi' : 'Services carousel'}
          aria-describedby="carousel-instructions"
        >
          <span id="carousel-instructions" className="sr-only">
            {language === 'it' 
              ? 'Carosello. Scorri orizzontalmente per altre carte.' 
              : 'Carousel. Swipe horizontally to see more cards.'}
          </span>

          {/* Services Slider */}
          <div 
            ref={sliderRef}
            className="overflow-x-auto scroll-smooth snap-x snap-mandatory -mx-4 px-2 services-carousel"
            onScroll={handleScroll}
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              paddingLeft: '4%',
              paddingRight: '4%'
            }}
          >
            <div className="flex gap-3" style={{ paddingBottom: '16px' }}>
              {services.map((service, index) => (
                <div
                  key={index}
                  className="flex-none snap-center"
                  style={{ width: 'min(92%, 360px)' }}
                >
                  <Card 
                    className="bg-white shadow-card-custom h-full"
                    style={{ borderRadius: '16px' }}
                  >
                     <CardContent className="p-5 flex flex-col items-center text-center h-full">
                      {service.id === 'job-hub' ? (
                        <div className="mb-4">
                          {service.icon}
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-[#3B82F6] rounded-full flex items-center justify-center mb-4">
                          {service.icon}
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-primary mb-2 text-center">{service.title}</h3>
                      <p className="text-sky font-semibold mb-3 text-center">{service.subtitle}</p>
                      <p className="text-steel-gray text-sm mb-6 text-center">{service.description}</p>
                      
                       <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className={`w-full ${service.id === 'job-hub' ? 'bg-[#25D366] hover:bg-[#1ea952]' : 'bg-[#3B82F6] hover:bg-[#2563EB]'} text-white mt-auto`}
                          >
                            {language === 'it' ? 'Scopri di più' : 'Learn More'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-2xl text-primary mb-4">
                              {service.title} - {service.subtitle}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-6">
                            {service.id === 'job-hub' ? (
                              <>
                                <div className="text-center mb-4">
                                  <div className="text-5xl mb-4">💬</div>
                                  <h3 className="text-xl font-bold text-primary mb-4">
                                    {language === 'it' 
                                      ? 'Job Updates Hub – CareerPilot WhatsApp Network' 
                                      : 'Job Updates Hub – CareerPilot WhatsApp Network'}
                                  </h3>
                                </div>
                                
                                <div className="space-y-4 text-steel-gray">
                                  <p>
                                    {language === 'it'
                                      ? 'Un servizio esclusivo per studenti e giovani professionisti che desiderano restare aggiornati sulle migliori opportunità di carriera in tempo reale.'
                                      : 'An exclusive service for students and young professionals who want to stay updated on the best career opportunities in real time.'}
                                  </p>
                                  
                                  <div>
                                    <p className="font-semibold mb-2">
                                      {language === 'it'
                                        ? "L'accesso al gruppo WhatsApp Job Updates Hub ti permette di ricevere notifiche immediate su:"
                                        : 'Access to the Job Updates Hub WhatsApp group allows you to receive immediate notifications about:'}
                                    </p>
                                    <ul className="space-y-2 ml-4">
                                      <li className="flex items-start">
                                        <span className="mr-2">🔔</span>
                                        {language === 'it' 
                                          ? 'Scadenze per application (Italia e Regno Unito)' 
                                          : 'Application deadlines (Italy and UK)'}
                                      </li>
                                      <li className="flex items-start">
                                        <span className="mr-2">🔔</span>
                                        {language === 'it' 
                                          ? 'Nuove offerte di stage e graduate programs' 
                                          : 'New internship and graduate program offers'}
                                      </li>
                                      <li className="flex items-start">
                                        <span className="mr-2">🔔</span>
                                        {language === 'it' 
                                          ? 'Eventi di networking e recruiting' 
                                          : 'Networking and recruiting events'}
                                      </li>
                                    </ul>
                                  </div>

                                  <div>
                                    <p className="font-semibold mb-2">
                                      {language === 'it'
                                        ? 'Il gruppo è organizzato in sottogruppi settoriali:'
                                        : 'The group is organized into sector-specific subgroups:'}
                                    </p>
                                    <ul className="space-y-2 ml-4">
                                      <li className="flex items-start">
                                        <span className="mr-2">💼</span>
                                        Investment Banking
                                      </li>
                                      <li className="flex items-start">
                                        <span className="mr-2">💼</span>
                                        Wealth & Asset Management
                                      </li>
                                      <li className="flex items-start">
                                        <span className="mr-2">💼</span>
                                        Consulting
                                      </li>
                                      <li className="flex items-start">
                                        <span className="mr-2">💼</span>
                                        Private Equity & Hedge Funds
                                      </li>
                                      <li className="flex items-start">
                                        <span className="mr-2">💼</span>
                                        Luxury Goods & Lifestyle
                                      </li>
                                    </ul>
                                  </div>

                                  <div className="bg-runway-gray p-4 rounded-lg">
                                    <p className="text-sm text-steel-gray">
                                      {language === 'it'
                                        ? 'Per maggiori informazioni e per richiedere accesso, contattaci direttamente su WhatsApp.'
                                        : 'For more information and to request access, contact us directly on WhatsApp.'}
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  asChild
                                  className="w-full bg-[#25D366] hover:bg-[#1ea952] text-white"
                                >
                                  <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="mr-2 h-5 w-5" />
                                    {language === 'it' ? 'Contattaci su WhatsApp' : 'Contact us on WhatsApp'}
                                  </a>
                                </Button>
                              </>
                            ) : service.id === 'summit' ? (
                              <>
                                {/* Personalized Timeline */}
                                <div className="bg-runway-gray p-4 rounded-lg">
                                  <h4 className="text-lg font-bold text-primary mb-4 flex items-center">
                                    <Calendar className="mr-2 h-5 w-5 text-primary" />
                                    {language === 'it' ? 'Timeline Personalizzata' : 'Personalized Timeline'}
                                  </h4>
                                  <ul className="space-y-3">
                                    {(language === 'it' ? [
                                      "Timeline d'accesso con scadenze e piano studio per test d'ingresso",
                                      "Accesso scontato alle migliori risorse di preparazione incluse nel piano di studio",
                                      "Creata da uno studente dell'Università di Interesse",
                                      "Presentata in un meeting online 1:1 dallo studente dell'Università di Interesse"
                                    ] : [
                                      "Access timeline with deadlines and study plan for entrance tests",
                                      "Discounted access to the best preparation resources included in the study plan",
                                      "Created by a student from the University of Interest",
                                      "Presented in a 1:1 online meeting by the student from the University of Interest"
                                    ]).map((feature, featureIdx) => (
                                      <li key={featureIdx} className="flex items-start">
                                        <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                        <span className="text-steel-gray text-sm">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* CV Rewriting */}
                                <div className="bg-runway-gray p-4 rounded-lg">
                                  <h4 className="text-lg font-bold text-primary mb-4 flex items-center">
                                    <FileText className="mr-2 h-5 w-5 text-primary" />
                                    {language === 'it' ? 'Riscrizione del CV' : 'CV Rewriting'}
                                  </h4>
                                  <ul className="space-y-3">
                                    {(language === 'it' ? [
                                      "CV riscritto da uno studente della tua Università di Interesse",
                                      "Il risultato finale viene presentato in un meeting online 1:1",
                                      "Il CV viene riscritto dopo una call con il team in cui viene analizzato in maniera dettagliata il profilo dello studente"
                                    ] : [
                                      "CV rewritten by a student from your University of Interest",
                                      "The final result is presented in a 1:1 online meeting",
                                      "The CV is rewritten after a call with the team where the student's profile is analyzed in detail"
                                    ]).map((feature, featureIdx) => (
                                      <li key={featureIdx} className="flex items-start">
                                        <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                        <span className="text-steel-gray text-sm">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Comparative Analysis */}
                                <div className="bg-runway-gray p-4 rounded-lg">
                                  <h4 className="text-lg font-bold text-primary mb-4 flex items-center">
                                    <Users className="mr-2 h-5 w-5 text-primary" />
                                    {language === 'it' ? 'Analisi Comparativa' : 'Comparative Analysis'}
                                  </h4>
                                  <ul className="space-y-3">
                                    {(language === 'it' ? [
                                      "Creata da 2+ studenti delle università di interesse",
                                      "Dati quantitativi + insight non pubblici per facilitare la scelta",
                                      "Conclusione con KPI di confronto e opinioni personali"
                                    ] : [
                                      "Created by 2+ students from universities of interest",
                                      "Quantitative data + non-public insights to facilitate choice",
                                      "Conclusion with comparison KPIs and personal opinions"
                                    ]).map((feature, featureIdx) => (
                                      <li key={featureIdx} className="flex items-start">
                                        <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                        <span className="text-steel-gray text-sm">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Detailed Presentations */}
                                <div className="bg-runway-gray p-4 rounded-lg">
                                  <h4 className="text-lg font-bold text-primary mb-4 flex items-center">
                                    <Presentation className="mr-2 h-5 w-5 text-primary" />
                                    {language === 'it' ? 'Presentazioni Approfondite' : 'In-Depth Presentations'}
                                  </h4>
                                  <ul className="space-y-3">
                                    {(language === 'it' ? [
                                      "Presentazione realizzata da uno studente dell'università di interesse",
                                      "Dati quantitativi + esperienza personale",
                                      "Conclusione con consigli di carriera personalizzati sul tuo profilo"
                                    ] : [
                                      "Presentation created by a student from the university of interest",
                                      "Quantitative data + personal experience",
                                      "Conclusion with personalized career advice based on your profile"
                                    ]).map((feature, featureIdx) => (
                                      <li key={featureIdx} className="flex items-start">
                                        <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                        <span className="text-steel-gray text-sm">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            ) : (
                              service.details?.map((detail, idx) => (
                                <div key={idx} className="bg-runway-gray p-4 rounded-lg">
                                  <h4 className="text-lg font-bold text-primary mb-4">{detail.title}</h4>
                                  {detail.description && (
                                    <p className="text-steel-gray text-sm mb-3">{detail.description}</p>
                                  )}
                                  <ul className="space-y-3">
                                    {detail.features.map((feature, featureIdx) => (
                                      <li key={featureIdx} className="flex items-start">
                                        <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                        <span className="text-steel-gray text-sm">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  {detail.ctaText && detail.ctaHref && (
                                    <Button
                                      className="mt-4 w-full bg-gradient-sky text-white hover:opacity-90"
                                      onClick={() => {
                                        if (detail.ctaHref.startsWith('/')) {
                                          navigate(detail.ctaHref);
                                        } else {
                                          window.open(detail.ctaHref, '_blank');
                                        }
                                      }}
                                    >
                                      {detail.ctaText}
                                      <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))
                            )}
                            {service.id !== 'job-hub' && (
                              <Button 
                                className="w-full bg-gradient-sky text-white hover:opacity-90 mt-4"
                                onClick={() => setIsBookingOpen(true)}
                              >
                                {t.services.takeoff.book}
                              </Button>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Hint Overlay */}
          {showHint && (
            <div 
              className="absolute inset-0 pointer-events-none flex items-end justify-center pb-8 z-20 animate-fade-in"
              style={{
                background: 'linear-gradient(to top, rgba(255, 255, 255, 0.95), transparent)'
              }}
            >
              <div className="bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm">
                <span>{language === 'it' ? 'Scorri' : 'Swipe'}</span>
                <ChevronRight className="h-4 w-4 animate-pulse" />
                <ChevronRight className="h-4 w-4 animate-pulse animation-delay-150" />
                <span>{language === 'it' ? 'per vedere gli altri servizi' : 'to see more services'}</span>
              </div>
            </div>
          )}

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {services.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToCard(index)}
                className={`carousel-dot ${
                  activeCard === index 
                    ? 'carousel-dot-active bg-primary' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`${language === 'it' ? 'Vai al servizio' : 'Go to service'} ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Mobile: Talent Pool box under the Flight Plans (Area 4) */}
        <div className="md:hidden mb-10">
          <div className="rounded-2xl border-2 border-secondary/40 bg-card p-5 shadow-card-custom">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-sky text-white">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Talent Pool</h3>
                <p className="text-xs font-semibold text-sky">Get discovered by companies</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-steel-gray">
              Create your profile and let our partner companies review your CV and reach out directly with internship and job opportunities — free for students.
            </p>
            <Button className="mt-3 w-full bg-gradient-sky text-white hover:opacity-90" onClick={() => window.location.href = '/talent-pool'}>
              Go to Talent Pool <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Grid */}
        <div ref={cardsAnimation.ref} className={`hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12 md:mb-20 ${cardsAnimation.className}`}>
          {services.slice(0, 4).map((service, index) => (
            <Card 
              key={index} 
              className="bg-white shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform md:hover:-translate-y-2"
            >
              <CardContent className="p-5 md:p-8 flex flex-col items-center text-center">
                {service.id === 'job-hub' ? (
                  <div className="mb-4">
                    {service.icon}
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-[#3B82F6] rounded-full flex items-center justify-center mb-4">
                    {service.icon}
                  </div>
                )}
                <h3 className="text-xl md:text-2xl font-bold text-primary mb-2 text-center">{service.title}</h3>
                <p className="text-sky font-semibold mb-3 text-center">{service.subtitle}</p>
                <p className="text-steel-gray text-sm md:text-base mb-6 text-center max-w-[42ch] mx-auto">{service.description}</p>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className={`w-full ${service.id === 'job-hub' ? 'bg-[#25D366] hover:bg-[#1ea952]' : 'bg-[#3B82F6] hover:bg-[#2563EB]'} text-white mt-auto`}
                    >
                      {language === 'it' ? 'Scopri di più' : 'Learn More'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl md:text-3xl text-primary mb-4">
                        {service.title} - {service.subtitle}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6">
                      {service.id === 'summit' ? (
                        <>
                          {/* Personalized Timeline */}
                          <div className="bg-runway-gray p-4 md:p-6 rounded-lg">
                            <h4 className="text-lg md:text-xl font-bold text-primary mb-4 flex items-center">
                              <Calendar className="mr-2 h-5 w-5 text-primary" />
                              {language === 'it' ? 'Timeline Personalizzata' : 'Personalized Timeline'}
                            </h4>
                            <ul className="space-y-3">
                              {(language === 'it' ? [
                                "Timeline d'accesso con scadenze e piano studio per test d'ingresso",
                                "Accesso scontato alle migliori risorse di preparazione incluse nel piano di studio",
                                "Creata da uno studente dell'Università di Interesse",
                                "Presentata in un meeting online 1:1 dallo studente dell'Università di Interesse"
                              ] : [
                                "Access timeline with deadlines and study plan for entrance tests",
                                "Discounted access to the best preparation resources included in the study plan",
                                "Created by a student from the University of Interest",
                                "Presented in a 1:1 online meeting by the student from the University of Interest"
                              ]).map((feature, featureIdx) => (
                                <li key={featureIdx} className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span className="text-steel-gray text-sm md:text-base">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* CV Rewriting */}
                          <div className="bg-runway-gray p-4 md:p-6 rounded-lg">
                            <h4 className="text-lg md:text-xl font-bold text-primary mb-4 flex items-center">
                              <FileText className="mr-2 h-5 w-5 text-primary" />
                              {language === 'it' ? 'Riscrittura del CV' : 'CV Rewriting'}
                            </h4>
                            <ul className="space-y-3">
                              {(language === 'it' ? [
                                "CV riscritto da uno studente della tua Università di Interesse",
                                "Il risultato finale viene presentato in un meeting online 1:1",
                                "Il CV viene riscritto dopo una call con il team in cui viene analizzato in maniera dettagliata il profilo dello studente"
                              ] : [
                                "CV rewritten by a student from your University of Interest",
                                "The final result is presented in a 1:1 online meeting",
                                "The CV is rewritten after a call with the team where the student's profile is analyzed in detail"
                              ]).map((feature, featureIdx) => (
                                <li key={featureIdx} className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span className="text-steel-gray text-sm md:text-base">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Comparative Analysis */}
                          <div className="bg-runway-gray p-4 md:p-6 rounded-lg">
                            <h4 className="text-lg md:text-xl font-bold text-primary mb-4 flex items-center">
                              <Users className="mr-2 h-5 w-5 text-primary" />
                              {language === 'it' ? 'Analisi Comparativa' : 'Comparative Analysis'}
                            </h4>
                            <ul className="space-y-3">
                              {(language === 'it' ? [
                                "Creata da 2+ studenti delle università di interesse",
                                "Dati quantitativi + insight non pubblici per facilitare la scelta",
                                "Conclusione con KPI di confronto e opinioni personali"
                              ] : [
                                "Created by 2+ students from universities of interest",
                                "Quantitative data + non-public insights to facilitate choice",
                                "Conclusion with comparison KPIs and personal opinions"
                              ]).map((feature, featureIdx) => (
                                <li key={featureIdx} className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span className="text-steel-gray text-sm md:text-base">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Detailed Presentations */}
                          <div className="bg-runway-gray p-4 md:p-6 rounded-lg">
                            <h4 className="text-lg md:text-xl font-bold text-primary mb-4 flex items-center">
                              <Presentation className="mr-2 h-5 w-5 text-primary" />
                              {language === 'it' ? 'Presentazioni Approfondite' : 'In-Depth Presentations'}
                            </h4>
                            <ul className="space-y-3">
                              {(language === 'it' ? [
                                "Presentazione realizzata da uno studente dell'università di interesse",
                                "Dati quantitativi + esperienza personale",
                                "Conclusione con consigli di carriera personalizzati sul tuo profilo"
                              ] : [
                                "Presentation created by a student from the university of interest",
                                "Quantitative data + personal experience",
                                "Conclusion with personalized career advice based on your profile"
                              ]).map((feature, featureIdx) => (
                                <li key={featureIdx} className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span className="text-steel-gray text-sm md:text-base">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                       ) : service.id === 'job-hub' ? (
                        <>
                          <div className="text-center mb-4">
                            <img src={whatsappLogo} alt="WhatsApp" className="w-20 h-20 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-primary mb-4">
                              {language === 'it' 
                                ? 'Job Updates Hub – CareerPilot WhatsApp Network' 
                                : 'Job Updates Hub – CareerPilot WhatsApp Network'}
                            </h3>
                          </div>
                          <div className="space-y-4 text-steel-gray">
                            <p>
                              {language === 'it'
                                ? 'Un servizio esclusivo per studenti e giovani professionisti che desiderano restare aggiornati sulle migliori opportunità di carriera in tempo reale.'
                                : 'An exclusive service for students and young professionals who want to stay updated on the best career opportunities in real time.'}
                            </p>
                            <div>
                              <p className="font-semibold mb-2">
                                {language === 'it'
                                  ? "L'accesso al gruppo WhatsApp Job Updates Hub ti permette di ricevere notifiche immediate su:"
                                  : 'Access to the Job Updates Hub WhatsApp group allows you to receive instant notifications on:'}
                              </p>
                              <ul className="space-y-2 ml-4">
                                <li className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span>{language === 'it' ? 'Scadenze per application (Italia e Regno Unito)' : 'Application deadlines (Italy and UK)'}</span>
                                </li>
                                <li className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span>{language === 'it' ? 'Nuove offerte di stage e graduate programs' : 'New internship and graduate program offers'}</span>
                                </li>
                                <li className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span>{language === 'it' ? 'Eventi di networking e recruiting' : 'Networking and recruiting events'}</span>
                                </li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-semibold mb-2">
                                {language === 'it'
                                  ? 'Il gruppo è organizzato in sottogruppi settoriali:'
                                  : 'The group is organized into sector-specific subgroups:'}
                              </p>
                              <ul className="space-y-2 ml-4">
                                <li className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span>Investment Banking</span>
                                </li>
                                <li className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span>Wealth & Asset Management</span>
                                </li>
                                <li className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span>Consulting</span>
                                </li>
                                <li className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span>Private Equity & Hedge Funds</span>
                                </li>
                                <li className="flex items-start">
                                  <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span>Luxury Goods & Lifestyle</span>
                                </li>
                              </ul>
                            </div>
                            <div className="bg-runway-gray p-4 rounded-lg">
                              <p className="text-sm text-steel-gray">
                                {language === 'it'
                                  ? 'Per maggiori informazioni e per richiedere accesso, contattaci direttamente su WhatsApp.'
                                  : 'For more information and to request access, contact us directly on WhatsApp.'}
                              </p>
                            </div>
                          </div>
                          <Button
                            asChild
                            className="w-full bg-[#25D366] text-white hover:bg-[#1ea952] mt-4"
                          >
                            <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="mr-2 h-5 w-5" />
                              {language === 'it' ? 'Contattaci su WhatsApp' : 'Contact us on WhatsApp'}
                            </a>
                          </Button>
                        </>
                       ) : (
                        service.details?.map((detail, idx) => (
                          <div key={idx} className="bg-runway-gray p-4 md:p-6 rounded-lg">
                            <h4 className="text-lg md:text-xl font-bold text-primary mb-4">{detail.title}</h4>
                            {detail.description && (
                              <p className="text-steel-gray text-sm md:text-base mb-3">{detail.description}</p>
                            )}
                            <ul className="space-y-3">
                              {detail.features.map((feature, featureIdx) => (
                                <li key={featureIdx} className="flex items-start">
                                   <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                  <span className="text-steel-gray text-sm md:text-base">{feature}</span>
                                </li>
                              ))}
                            </ul>
                            {detail.ctaText && detail.ctaHref && (
                              <div className="mt-4 flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full border-sky text-sky hover:bg-sky/10 hover:border-sky-dark transition-colors"
                                  onClick={() => detail.ctaHref!.startsWith('/') ? navigate(detail.ctaHref!) : window.open(detail.ctaHref, '_blank')}
                                >
                                  {detail.ctaText}
                                  <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {service.id !== 'job-hub' && (
                        <div className="flex gap-3 mt-4">
                          <Button 
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setIsBookingOpen(true)}
                          >
                            {language === 'it' ? 'Prenota Free Check-in' : 'Book Free Check-in'}
                          </Button>
                          <Button 
                            className="flex-1 bg-gradient-sky text-white hover:opacity-90"
                            onClick={() => {
                              const cat: Record<string, string> = { takeoff: 'Take Off', layover: 'Layover', altitude: 'Altitude', summit: 'Summit' };
                              const category = cat[service.id];
                              window.location.href = category
                                ? `/client-portal/services?category=${encodeURIComponent(category)}`
                                : '/client-portal/services';
                            }}
                          >
                            {language === 'it' ? 'Vedi il Pacchetto' : 'View Package'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Separator between primary and secondary services */}
        <div className="flex items-center gap-4 max-w-2xl mx-auto my-10 md:my-14">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase whitespace-nowrap">
            {language === 'it' ? 'Piattaforme & Strumenti' : 'Platforms & Tools'}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Platforms + Job Updates Hub Section - Desktop */}
        <div 
          ref={jobHubAnimation.ref}
          className={`hidden md:block mb-12 md:mb-20 ${jobHubAnimation.className}`}
        >
          {/* Layout: Platforms (2 cards) + Job Updates Hub */}
          <div className="flex gap-6 max-w-5xl mx-auto">
            {/* Talent Pool Card - big, left */}
            <Card className="bg-white shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform hover:-translate-y-1 group flex-1">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-sky rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary group-hover:text-sky transition-colors duration-300">Talent Pool</h3>
                    <p className="text-sky font-semibold text-sm">
                      {language === 'it' ? 'Connettiti con le aziende' : 'Connect with companies'}
                    </p>
                  </div>
                </div>
                <p className="text-steel-gray text-sm leading-relaxed flex-1 mb-4">
                  {language === 'it'
                    ? 'Le aziende esaminano il tuo CV e ti contattano direttamente con opportunità di stage e lavoro.'
                    : 'Companies review your CV and reach out directly with internship and job opportunities.'}
                </p>
                <Button
                  className="mt-4 bg-gradient-sky text-white hover:opacity-90 w-full"
                  onClick={() => window.location.href = '/talent-pool'}
                >
                  {language === 'it' ? 'Vai alla Talent Pool' : 'Go to Talent Pool'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Job Updates Hub Card - Takes remaining space */}
            {services.slice(4).map((service, index) => (
              <Card 
                key={index} 
                className="bg-white shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform hover:-translate-y-1 group flex-1"
              >
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <MessageCircle className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-primary group-hover:text-sky transition-colors duration-300">{service.title}</h3>
                      <p className="text-sky font-semibold text-sm">{service.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-steel-gray text-sm leading-relaxed flex-1 mb-4">
                    {service.description}
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="mt-4 bg-[#25D366] text-white hover:bg-[#1ea952] w-full"
                      >
                        {language === 'it' ? 'Scopri di più' : 'Learn More'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl md:text-3xl text-primary mb-4">
                          {service.title} - {service.subtitle}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-6">
                        <div className="text-center mb-4">
                          <img src={whatsappLogo} alt="WhatsApp" className="w-20 h-20 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-primary mb-4">
                            {language === 'it' 
                              ? 'Job Updates Hub – CareerPilot WhatsApp Network' 
                              : 'Job Updates Hub – CareerPilot WhatsApp Network'}
                          </h3>
                        </div>
                        <div className="space-y-4 text-steel-gray">
                          <p>
                            {language === 'it'
                              ? 'Un servizio esclusivo per studenti e giovani professionisti che desiderano restare aggiornati sulle migliori opportunità di carriera in tempo reale.'
                              : 'An exclusive service for students and young professionals who want to stay updated on the best career opportunities in real time.'}
                          </p>
                          <div>
                            <p className="font-semibold mb-2">
                              {language === 'it'
                                ? "L'accesso al gruppo WhatsApp Job Updates Hub ti permette di ricevere notifiche immediate su:"
                                : 'Access to the Job Updates Hub WhatsApp group allows you to receive instant notifications on:'}
                            </p>
                            <ul className="space-y-2 ml-4">
                              <li className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                <span>{language === 'it' ? 'Scadenze per application (Italia e Regno Unito)' : 'Application deadlines (Italy and UK)'}</span>
                              </li>
                              <li className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                <span>{language === 'it' ? 'Nuove offerte di stage e graduate programs' : 'New internship and graduate program offers'}</span>
                              </li>
                              <li className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                <span>{language === 'it' ? 'Eventi di networking e recruiting' : 'Networking and recruiting events'}</span>
                              </li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-semibold mb-2">
                              {language === 'it'
                                ? 'Il gruppo è organizzato in sottogruppi settoriali:'
                                : 'The group is organized into sector-specific subgroups:'}
                            </p>
                            <ul className="space-y-2 ml-4">
                              <li className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                <span>Investment Banking</span>
                              </li>
                              <li className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                <span>Wealth & Asset Management</span>
                              </li>
                              <li className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                <span>Consulting</span>
                              </li>
                              <li className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                <span>Private Equity & Hedge Funds</span>
                              </li>
                              <li className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-sky mt-0.5 mr-3 flex-shrink-0" />
                                <span>Luxury Goods & Lifestyle</span>
                              </li>
                            </ul>
                          </div>
                          <div className="bg-runway-gray p-4 rounded-lg">
                            <p className="text-sm text-steel-gray">
                              {language === 'it'
                                ? 'Per maggiori informazioni e per richiedere accesso, contattaci direttamente su WhatsApp.'
                                : 'For more information and to request access, contact us directly on WhatsApp.'}
                            </p>
                          </div>
                        </div>
                        <Button
                          asChild
                          className="w-full bg-[#25D366] text-white hover:bg-[#1ea952] mt-4"
                        >
                          <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="mr-2 h-5 w-5" />
                            {language === 'it' ? 'Contattaci su WhatsApp' : 'Contact us on WhatsApp'}
                          </a>
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div 
          ref={processAnimation.ref}
          className={`mt-6 md:mt-6 ${processAnimation.className}`}
        >
          {/* Container — clean transparent on mobile, gray box on desktop */}
          <div className="mx-auto md:max-w-[1400px] md:w-[calc(100%-32px)] md:bg-[#EDF1F5] md:rounded-3xl md:p-5 md:border md:border-[#DDE3EA]">
            <div className="md:p-4">
              <h3 className="text-[22px] md:text-3xl font-bold text-primary mb-5 md:mb-10 leading-tight text-center tracking-tight">
                {t.services.process.title}
              </h3>

              {/* MOBILE: clean vertical timeline */}
              <div className="md:hidden relative max-w-md mx-auto">
                <div className="absolute left-[18px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary/60 via-primary/30 to-primary/10 rounded-full" />
                <ol className="space-y-4">
                  {steps.map((step, index) => (
                    <li key={index} className="relative flex items-start gap-3">
                      <div className="relative z-10 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[13px] shadow-md flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <h4 className="text-[14px] font-bold text-primary leading-tight">
                          {step.mobileTitle}
                        </h4>
                        <p className="text-steel-gray text-[12px] leading-snug mt-1">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* DESKTOP: original grid */}
              <div
                ref={stepsAnimation.containerRef}
                className={`hidden md:grid md:grid-cols-3 gap-4 md:gap-8 relative ${stepsAnimation.containerClassName}`}
              >
                <div className="hidden md:block absolute top-[32px] left-[33.33%] right-[33.33%] h-[2px] bg-[#3B82F6] z-0"></div>
                {steps.map((step, index) => {
                  const itemProps = stepsAnimation.getItemProps(index);
                  return (
                    <div
                      key={index}
                      className={`relative z-10 flex flex-col h-full ${itemProps.className}`}
                      style={itemProps.style}
                    >
                      <div className="flex flex-col items-center h-full group">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-[#3B82F6] rounded-full flex items-center justify-center mb-3 md:mb-4 flex-shrink-0 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                          {step.icon}
                        </div>
                        <h4 className="hidden md:block text-xl font-bold text-primary mb-3 text-center">
                          {step.title}
                        </h4>
                        <div className="hidden md:flex flex-1 items-start">
                          <p className="text-steel-gray text-base leading-relaxed text-center max-w-xs mx-auto">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      {/* Flight Plans Examples - White Background */}
      <div className="bg-white" style={{ paddingTop: '64px', paddingBottom: '64px', marginTop: '56px' }}>
        <div className="container mx-auto px-4">
          <div 
            ref={flightPlansAnimation.ref}
            className={`text-center ${flightPlansAnimation.className}`}
          >
            <h3 className="text-[24px] md:text-3xl font-bold text-primary mb-6 md:mb-8 leading-tight">
              {t.services.examples.title}
            </h3>
            
            {/* Desktop Grid */}
            <div 
              ref={flightPlansCardsAnimation.containerRef}
              className={`hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 ${flightPlansCardsAnimation.containerClassName}`}
            >
              {(() => {
                const card0Props = flightPlansCardsAnimation.getItemProps(0);
                return (
                  <Card 
                    className={`bg-white shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform md:hover:-translate-y-2 group ${card0Props.className}`}
                    style={card0Props.style}
                  >
                    <CardContent className="p-5 md:p-8">
                      <h4 className="text-[18px] md:text-xl font-bold text-primary mb-3 md:mb-4 group-hover:text-sky transition-colors duration-300">{t.services.examples.timeline.title}</h4>
                      <div className="space-y-4 text-left">
                        {t.services.examples.timeline.items.map((item, idx) => (
                          <div key={idx} className="flex items-center">
                            <div className="w-4 h-4 bg-gradient-sky rounded-full mr-3 group-hover:scale-110 transition-transform duration-300"></div>
                            <span className="text-steel-gray">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {(() => {
                const card1Props = flightPlansCardsAnimation.getItemProps(1);
                return (
                  <Card 
                    className={`bg-white shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform md:hover:-translate-y-2 group ${card1Props.className}`}
                    style={card1Props.style}
                  >
                    <CardContent className="p-5 md:p-8">
                      <h4 className="text-[18px] md:text-xl font-bold text-primary mb-3 md:mb-4 group-hover:text-sky transition-colors duration-300">{t.services.examples.comparative.title}</h4>
                      <div className="space-y-4 text-left">
                        {t.services.examples.comparative.items.map((item, idx) => (
                          <div key={idx} className="flex items-start">
                            <div className="w-3 h-3 md:w-4 md:h-4 bg-gradient-sky rounded-full mr-2 md:mr-3 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"></div>
                            <span className="text-steel-gray text-[14px] md:text-base">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {(() => {
                const card2Props = flightPlansCardsAnimation.getItemProps(2);
                return (
                  <Card 
                    className={`bg-white shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform md:hover:-translate-y-2 group ${card2Props.className}`}
                    style={card2Props.style}
                  >
                    <CardContent className="p-5 md:p-8">
                      <h4 className="text-[18px] md:text-xl font-bold text-primary mb-3 md:mb-4 group-hover:text-sky transition-colors duration-300">{t.services.examples.boost.title}</h4>
                       <div className="space-y-4 text-left">
                        {t.services.examples.boost.items.map((item, idx) => (
                          <div key={idx} className="flex items-start">
                            <div className="w-3 h-3 md:w-4 md:h-4 bg-gradient-sky rounded-full mr-2 md:mr-3 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"></div>
                            <span className="text-steel-gray text-[14px] md:text-base">{item}</span>
                          </div>
                        ))}
                       </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {/* Mobile Carousel */}
            <div className="md:hidden relative">
              <div 
                className="overflow-x-auto snap-x snap-mandatory flex gap-4 px-4 -mx-4 scrollbar-hide flight-plans-examples-carousel"
                style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                onTouchStart={() => setFlightPlansHintDismissed(true)}
                onScroll={(e) => {
                  if (!flightPlansHintDismissed) {
                    setFlightPlansHintDismissed(true);
                  }
                  const container = e.currentTarget;
                  const scrollLeft = container.scrollLeft;
                  const cardWidth = Math.min(window.innerWidth * 0.85, 340);
                  const newIndex = Math.round(scrollLeft / (cardWidth + 16));
                  setActiveFlightPlansIndex(newIndex);
                }}
                role="region"
                aria-label={currentLang === 'it' ? 'Carosello esempi di Flight Plans' : 'Flight Plans examples carousel'}
                aria-roledescription={currentLang === 'it' ? 'Carosello. Scorri orizzontalmente per altri esempi.' : 'Carousel. Swipe horizontally to see more examples.'}
                tabIndex={0}
                onKeyDown={(e) => {
                  const container = e.currentTarget;
                  const cardWidth = Math.min(window.innerWidth * 0.85, 340);
                  if (e.key === 'ArrowLeft' && activeFlightPlansIndex > 0) {
                    setActiveFlightPlansIndex(prev => prev - 1);
                    container.scrollTo({ left: (activeFlightPlansIndex - 1) * (cardWidth + 16), behavior: 'smooth' });
                  } else if (e.key === 'ArrowRight' && activeFlightPlansIndex < 2) {
                    setActiveFlightPlansIndex(prev => prev + 1);
                    container.scrollTo({ left: (activeFlightPlansIndex + 1) * (cardWidth + 16), behavior: 'smooth' });
                  }
                }}
              >
                  <Card 
                    className="bg-white shadow-card-custom transition-all duration-300 snap-center flex-shrink-0"
                    style={{ width: '85vw', maxWidth: '340px' }}
                  >
                    <CardContent className="p-4">
                      <h4 className="text-[18px] font-bold text-primary mb-4">{t.services.examples.timeline.title}</h4>
                      <div className="space-y-3 text-left">
                        {t.services.examples.timeline.items.map((item, idx) => (
                          <div key={idx} className="flex items-start">
                            <div className="w-3 h-3 bg-gradient-sky rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                            <span className="text-steel-gray text-[14px] leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-white shadow-card-custom transition-all duration-300 snap-center flex-shrink-0"
                    style={{ width: '85vw', maxWidth: '340px' }}
                  >
                    <CardContent className="p-4">
                      <h4 className="text-[18px] font-bold text-primary mb-4">{t.services.examples.comparative.title}</h4>
                      <div className="space-y-3 text-left">
                        {t.services.examples.comparative.items.map((item, idx) => (
                          <div key={idx} className="flex items-start">
                            <div className="w-3 h-3 bg-gradient-sky rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                            <span className="text-steel-gray text-[14px] leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-white shadow-card-custom transition-all duration-300 snap-center flex-shrink-0"
                    style={{ width: '85vw', maxWidth: '340px' }}
                  >
                    <CardContent className="p-4">
                      <h4 className="text-[18px] font-bold text-primary mb-3">{t.services.examples.boost.title}</h4>
                       <div className="space-y-3 text-left">
                        {t.services.examples.boost.items.map((item, idx) => (
                          <div key={idx} className="flex items-start">
                            <div className="w-3 h-3 bg-gradient-sky rounded-full mr-3 mt-0.5 flex-shrink-0"></div>
                            <span className="text-steel-gray text-[14px] leading-relaxed">{item}</span>
                          </div>
                        ))}
                       </div>
                    </CardContent>
                  </Card>
              </div>

              </div>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveFlightPlansIndex(index);
                      const container = document.querySelector('.overflow-x-auto');
                      if (container) {
                        const cardWidth = Math.min(window.innerWidth * 0.85, 340);
                        container.scrollTo({ left: index * (cardWidth + 16), behavior: 'smooth' });
                      }
                    }}
                    className={`carousel-dot ${
                      activeFlightPlansIndex === index 
                        ? 'carousel-dot-active bg-primary' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to example ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <BookingPopup isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
      <JobHubFormDialog isOpen={isJobHubFormOpen} onClose={() => setIsJobHubFormOpen(false)} />
    </section>
  );
};

export default ServicesSection;
