import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Users2, Lightbulb, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const ValueDriversSection = () => {
  const [activeCard, setActiveCard] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const { language } = useLanguage();
  const t = translations[language];
  
  // Scroll animations
  const titleAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 100 });
  const driversAnimation = useScrollAnimation({ animationClass: 'animate-scale-up', delay: 200 });
  const sliderRef = useRef<HTMLDivElement>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout>();
  const isMobileRef = useRef(false);

  const drivers = [
    {
      icon: Star,
      key: 'excellence' as const
    },
    {
      icon: Users2,
      key: 'teamwork' as const
    },
    {
      icon: Lightbulb,
      key: 'entrepreneurial' as const
    }
  ];

  // Check if mobile and show hint
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 576;
      isMobileRef.current = mobile;
      
      if (mobile && !sessionStorage.getItem('valueDriversHintDismissed')) {
        setShowHint(true);
        
        // Auto-hide after 6 seconds
        hintTimeoutRef.current = setTimeout(() => {
          setShowHint(false);
          sessionStorage.setItem('valueDriversHintDismissed', 'true');
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
        sessionStorage.setItem('valueDriversHintDismissed', 'true');
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
      } else if (e.key === 'ArrowRight' && activeCard < drivers.length - 1) {
        scrollToCard(activeCard + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCard, drivers.length]);

  return (
    <section className="py-10 md:py-20 bg-runway-gray">
      <div className="container mx-auto px-4">
        <div ref={titleAnimation.ref} className={`text-center mb-6 md:mb-16 ${titleAnimation.className}`}>
          <h2 className="text-[26px] md:text-4xl lg:text-5xl font-bold text-primary mb-2 md:mb-6 tracking-tight leading-tight">
            {t.valueDrivers.title}
          </h2>
          <div className="md:hidden h-[3px] w-12 bg-gradient-sky rounded-full mx-auto mb-3" />
          <p className="text-[14px] md:text-xl text-steel-gray max-w-3xl mx-auto px-2 leading-relaxed">
            {t.valueDrivers.subtitle}
          </p>
        </div>

        {/* ===== MOBILE: clean stacked accordion-like cards ===== */}
        <div className="md:hidden space-y-3">
          {drivers.map((driver, index) => {
            const driverData = t.valueDrivers[driver.key];
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-border/50 shadow-sm p-4"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="bg-gradient-sky w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <driver.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-primary leading-tight">
                      {driverData.title}
                    </h3>
                    <p className="text-steel-gray text-[12px] leading-snug mt-0.5">
                      {driverData.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 pl-[52px]">
                  {driverData.items.map((feature: string, fi: number) => (
                    <span key={fi} className="text-[10px] font-semibold text-primary bg-primary/8 px-2 py-1 rounded-full border border-primary/15">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Grid */}
        <div ref={driversAnimation.ref} className={`hidden md:grid md:grid-cols-3 gap-8 ${driversAnimation.className}`}>
          {drivers.map((driver, index) => {
            const driverData = t.valueDrivers[driver.key];
            return (
              <Card key={index} className="bg-gradient-card shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform hover:-translate-y-2 group">
                <CardContent className="p-8 text-center">
                  <div className="bg-gradient-sky p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <driver.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-primary mb-4">
                    {driverData.title}
                  </h3>
                  
                  <p className="text-steel-gray mb-6 leading-relaxed">
                    {driverData.description}
                  </p>

                  <div className="space-y-2">
                    {driverData.items.map((feature: string, featureIndex: number) => (
                      <div key={featureIndex} className="bg-white/50 px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium text-primary">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Vision Statement */}
        <Card className="bg-gradient-sky text-white shadow-aviation mt-16 transform hover:scale-105 transition-all duration-500">
          
        </Card>
      </div>
    </section>
  );
};

export default ValueDriversSection;
