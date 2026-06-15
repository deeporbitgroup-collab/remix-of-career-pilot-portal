import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, Award, HeartHandshake, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import TestimonialsCarousel from "./TestimonialsCarousel";
import { useScrollAnimation, useStaggeredAnimation } from "@/hooks/useScrollAnimation";

const WhyChooseUsSection = () => {
  const [activeCard, setActiveCard] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const { language } = useLanguage();
  const t = translations[language];
  
  // Staggered animation for features
  const staggeredFeatures = useStaggeredAnimation(4, { 
    animationClass: 'animate-slide-up', 
    staggerDelay: 100 
  });
  const sliderRef = useRef<HTMLDivElement>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout>();
  const isMobileRef = useRef(false);
  
  const titleAnimation = useScrollAnimation({ delay: 0 });
  const cardsAnimation = useScrollAnimation({ delay: 200, animationClass: 'animate-fade-up' });

  const reasons = [
    {
      icon: Users,
      key: 'personalized' as const
    },
    {
      icon: Target,
      key: 'quality' as const
    },
    {
      icon: Award,
      key: 'team' as const
    },
    {
      icon: HeartHandshake,
      key: 'support' as const
    }
  ];

  // Check if mobile and show hint
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 576;
      isMobileRef.current = mobile;
      
      if (mobile && !sessionStorage.getItem('whyChooseUsHintDismissed')) {
        setShowHint(true);
        
        // Auto-hide after 6 seconds
        hintTimeoutRef.current = setTimeout(() => {
          setShowHint(false);
          sessionStorage.setItem('whyChooseUsHintDismissed', 'true');
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
        sessionStorage.setItem('whyChooseUsHintDismissed', 'true');
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
      } else if (e.key === 'ArrowRight' && activeCard < reasons.length - 1) {
        scrollToCard(activeCard + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCard, reasons.length]);

  return (
    <section id="why-choose-us" className="py-10 md:py-20 bg-gradient-to-b from-cloud-white to-white">
      <div className="container mx-auto px-4">
          <div
            ref={titleAnimation.ref}
            className={`text-center mb-6 md:mb-12 ${titleAnimation.className}`}
          >
            <h2 className="text-[26px] md:text-4xl lg:text-5xl font-bold text-primary mb-2 md:mb-4 tracking-tight leading-tight">
              {t.whyChooseUs.title}
            </h2>
            <div className="md:hidden h-[3px] w-12 bg-gradient-sky rounded-full mx-auto mb-3" />
            <p className="text-[14px] md:text-xl text-steel-gray max-w-3xl mx-auto px-2 leading-relaxed">
              {t.whyChooseUs.subtitle}
            </p>
          </div>

        {/* ===== MOBILE: clean 2-column compact grid ===== */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          {reasons.map((reason, index) => {
            const item = t.whyChooseUs.items[reason.key];
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-border/50 shadow-sm p-3 flex flex-col"
              >
                <div className="bg-gradient-sky w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm">
                  <reason.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-[13px] font-bold text-primary leading-tight mb-1">{item.title}</h3>
                <p className="text-steel-gray text-[11px] leading-snug">{item.description}</p>
              </div>
            );
          })}
        </div>

        {/* Desktop Grid */}
        <div 
          ref={cardsAnimation.ref}
          className={`hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 ${cardsAnimation.className}`}
        >
          {reasons.map((reason, index) => {
            const item = t.whyChooseUs.items[reason.key];
            return (
              <Card 
                key={index} 
                className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group border-0 hover:border-primary/20"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8 text-center h-full flex flex-col">
                  <div className="bg-gradient-sky p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 shadow-md">
                    <reason.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-4 group-hover:text-sky transition-colors duration-300">{item.title}</h3>
                  <p className="text-steel-gray text-base leading-relaxed flex-1">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Testimonials Carousel */}
        <TestimonialsCarousel />
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
