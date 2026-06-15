import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Instagram, Linkedin, Calendar, Phone, MapPin, ChevronRight, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
interface ContactSectionProps {
  isBookingOpen: boolean;
  setIsBookingOpen: (open: boolean) => void;
}
const ContactSection = ({
  isBookingOpen,
  setIsBookingOpen
}: ContactSectionProps) => {
  const [activeCard, setActiveCard] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const {
    language
  } = useLanguage();
  const t = translations[language];
  const sliderRef = useRef<HTMLDivElement>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout>();
  const isMobileRef = useRef(false);
  
  // Scroll animations
  const titleAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 100 });
  const methodsAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 200 });
  const ctaAnimation = useScrollAnimation({ animationClass: 'animate-scale-up', delay: 300 });
  const infoAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 400 });
  const contactMethods = [{
    icon: Mail,
    title: t.contact.email.label,
    value: t.contact.email.value,
    action: `mailto:${t.contact.email.value}`,
    color: "from-primary to-primary-light"
  }, {
    icon: Instagram,
    title: "Instagram",
    value: "@careerpilot_official",
    action: "https://instagram.com/careerpilot_official",
    color: "from-pink-500 to-purple-600"
  }, {
    icon: Linkedin,
    title: "LinkedIn",
    value: "Career Pilot",
    action: "https://www.linkedin.com/company/career-pilot25/",
    color: "from-blue-600 to-blue-800"
  }, {
    icon: MessageCircle,
    title: "WhatsApp",
    value: "+44 7826932893",
    action: "https://api.whatsapp.com/send?phone=447826932893",
    color: "from-green-500 to-green-600"
    }
  ];

  // Check if mobile and show hint
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 576;
      isMobileRef.current = mobile;
      
      if (mobile && !sessionStorage.getItem('contactHintDismissed')) {
        setShowHint(true);
        
        // Auto-hide after 6 seconds
        hintTimeoutRef.current = setTimeout(() => {
          setShowHint(false);
          sessionStorage.setItem('contactHintDismissed', 'true');
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
        sessionStorage.setItem('contactHintDismissed', 'true');
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

  const openLink = (url: string) => {
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobileRef.current) return;
      
      if (e.key === 'ArrowLeft' && activeCard > 0) {
        scrollToCard(activeCard - 1);
      } else if (e.key === 'ArrowRight' && activeCard < contactMethods.length - 1) {
        scrollToCard(activeCard + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCard, contactMethods.length]);

  return <section className="py-10 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div ref={titleAnimation.ref} className={`text-center mb-6 md:mb-16 ${titleAnimation.className}`}>
          <h2 className="text-[26px] sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-2 md:mb-6 tracking-tight leading-tight">
            {t.contact.title}
          </h2>
          <div className="md:hidden h-[3px] w-12 bg-gradient-sky rounded-full mx-auto mb-3" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-4 md:mt-8 max-w-2xl mx-auto">
            {t.contact.features.map((feature, index) => <div key={index} className="flex items-center justify-center text-primary">
                <span className="text-[13px] md:text-lg font-semibold">{feature}</span>
              </div>)}
          </div>
        </div>

        {/* ===== MOBILE: clean 2x2 contact grid ===== */}
        <div ref={methodsAnimation.ref} className={`md:hidden grid grid-cols-2 gap-3 mb-8 ${methodsAnimation.className}`}>
          {contactMethods.map((contact, index) => {
            const inner = (
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-3 flex flex-col items-center text-center h-full hover:shadow-md transition-shadow">
                <div className={`bg-gradient-to-br ${contact.color} w-11 h-11 rounded-xl flex items-center justify-center mb-2 shadow-sm`}>
                  <contact.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-[12px] font-bold text-primary leading-tight">{contact.title}</h3>
                <p className="text-steel-gray text-[10px] leading-tight mt-0.5 line-clamp-1 w-full">{contact.value}</p>
              </div>
            );
            return contact.title === 'WhatsApp' ? (
              <a key={index} href={contact.action} target="_blank" rel="noopener noreferrer" className="block">
                {inner}
              </a>
            ) : (
              <button key={index} onClick={() => openLink(contact.action)} className="block text-left">
                {inner}
              </button>
            );
          })}
        </div>

        {/* Desktop Grid for Contact Methods */}
        <div ref={methodsAnimation.ref} className={`hidden md:grid md:grid-cols-4 gap-6 mb-16 ${methodsAnimation.className}`}>
          {contactMethods.map((contact, index) => <Card key={index} className="bg-gradient-card shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform hover:-translate-y-2 group">
              <CardContent className="p-8 text-center">
                <div className={`bg-gradient-to-br ${contact.color} p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <contact.icon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">{contact.title}</h3>
                <p className="text-steel-gray mb-6">{contact.value}</p>
                {contact.title === 'WhatsApp' ? (
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300" asChild>
                    <a href={contact.action} target="_blank" rel="noopener noreferrer">
                      {language === 'it' ? 'Contatta' : 'Contact'}
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300" onClick={() => openLink(contact.action)}>
                    {language === 'it' ? 'Contatta' : 'Contact'}
                  </Button>
                )}
              </CardContent>
            </Card>)}
        </div>

        {/* Main CTA Section */}
        <Card ref={ctaAnimation.ref} className={`bg-gradient-sky text-white shadow-aviation overflow-visible md:overflow-hidden relative visible opacity-100 ${ctaAnimation.className}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
          <CardContent className="relative z-10 p-5 md:p-12 text-center">
            <Calendar className="h-8 w-8 md:h-16 md:w-16 mx-auto mb-2.5 md:mb-6 animate-float" />
            <h3 className="text-[20px] md:text-4xl lg:text-6xl font-extrabold mb-2.5 md:mb-6 tracking-tight drop-shadow-lg uppercase bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent animate-fade-in leading-tight">
              {language === 'it' ? 'Prenota il Tuo Check-In Gratuito' : 'Book Your Free Check-In'}
            </h3>
            <p className="text-[12px] md:text-xl lg:text-2xl mb-4 md:mb-8 opacity-95 max-w-3xl mx-auto leading-snug">
              {language === 'it' ? '30 minuti di consulenza gratuita per scoprire come Career Pilot può accelerare il tuo percorso.' : '30-minute free consultation to discover how Career Pilot can accelerate your journey.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-center mb-4 md:mb-8">
              <Button size="default" className="bg-white text-primary hover:bg-runway-gray hover:text-primary-dark shadow-lg transition-all duration-300 transform hover:scale-105 text-[13px] md:text-base h-9 md:h-10" onClick={() => setIsBookingOpen(true)}>
                {language === 'it' ? 'Prenota Ora – Gratuito' : 'Book Now – Free'}
              </Button>
              <Button variant="outline" size="default" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary shadow-lg transition-all duration-300 transform hover:scale-105 text-[13px] md:text-base h-9 md:h-10" onClick={() => {
                document.getElementById('servizi')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                {language === 'it' ? 'Scopri i Nostri Piani' : 'Discover Our Plans'}
              </Button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6 text-center text-[10px] md:text-base">
              <div className="flex flex-col md:flex-row items-center justify-center">
                <Phone className="h-3.5 w-3.5 md:h-5 md:w-5 md:mr-2 mb-0.5 md:mb-0" />
                <span className="leading-tight">{language === 'it' ? 'Risposta 24h' : 'Reply 24h'}</span>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center">
                <Calendar className="h-3.5 w-3.5 md:h-5 md:w-5 md:mr-2 mb-0.5 md:mb-0" />
                <span className="leading-tight">{language === 'it' ? 'Orari flex' : 'Flexible'}</span>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center">
                <MapPin className="h-3.5 w-3.5 md:h-5 md:w-5 md:mr-2 mb-0.5 md:mb-0" />
                <span className="leading-tight">{language === 'it' ? 'Online & live' : 'Online & live'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Contact Info */}
        <div ref={infoAnimation.ref} className={`hidden md:grid mt-16 grid-cols-1 md:grid-cols-2 gap-8 ${infoAnimation.className}`}>
          <Card className="bg-white shadow-card-custom">
            <CardContent className="p-8">
              <h4 className="text-xl font-bold text-primary mb-4">
                {t.contact.email.label}
              </h4>
              <div className="space-y-2 text-steel-gray">
                <p className="text-lg">{t.contact.email.value}</p>
              </div>
              <div className="mt-6">
                <h5 className="text-lg font-semibold text-primary mb-2">WhatsApp</h5>
                <a 
                  href="https://api.whatsapp.com/send?phone=447826932893" 
                  className="text-lg text-steel-gray hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  +44 7826932893
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-card-custom">
            <CardContent className="p-8">
              <h4 className="text-xl font-bold text-primary mb-4">
                {t.contact.contactUs}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  
                  <span className="text-steel-gray">{t.contact.social.instagram}</span>
                </div>
                <div className="flex items-center">
                  
                  <span className="text-steel-gray">{t.contact.social.linkedin}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
};
export default ContactSection;