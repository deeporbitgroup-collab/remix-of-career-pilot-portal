import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plane, Star, GraduationCap, Building, ArrowRight, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import BookingPopup from "./BookingPopup";
import EcosystemOverlay from "./EcosystemOverlay";
import HeroTrustStrip from "./HeroTrustStrip";
import { supabase } from "@/integrations/supabase/client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import AutoScrollCarousel from "./AutoScrollCarousel";
import VerticalAutoScrollCarousel from "./VerticalAutoScrollCarousel";

// Import university logos
import lseLogo from "@/assets/logos/universities/lse.svg";
import polimiLogo from "@/assets/logos/universities/polimi.png";
import mitLogo from "@/assets/logos/universities/mit.png";
import edhecLogo from "@/assets/logos/universities/edhec.jpg";
import lbsLogo from "@/assets/logos/universities/lbs.jpg";
import unigeLogo from "@/assets/logos/universities/unige.png";
import ethLogo from "@/assets/logos/universities/eth.jpg";
import baruchLogo from "@/assets/logos/universities/baruch.jpeg";
import skemaLogo from "@/assets/logos/universities/skema.webp";
import novaLogo from "@/assets/logos/universities/nova.png";
import hultLogo from "@/assets/logos/universities/hult.png";
import loughboroughLogo from "@/assets/logos/universities/loughborough.jpg";
import epflLogo from "@/assets/logos/universities/epfl.png";
import hecLogo from "@/assets/logos/universities/hec.png";

// Import company logos
import goldmanSachsLogo from "@/assets/logos/companies/goldmansachs.svg";
import pwcLogo from "@/assets/logos/companies/pwc.svg";
import accentureLogo from "@/assets/logos/companies/accenture.svg";
import companiesLogosBg from "@/assets/companies-logos-bg.png";
import universitiesLogosBg from "@/assets/universities-logos-bg.png";
import satisfactionBg from "@/assets/satisfaction-bg.webp";

// Counter animation hook
const useCounter = (target: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration;
    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * target);
      setCount(currentCount);
      if (progress < 1) {
        countRef.current = requestAnimationFrame(updateCount);
      } else {
        setCount(target);
      }
    };
    countRef.current = requestAnimationFrame(updateCount);
    return () => {
      if (countRef.current) {
        cancelAnimationFrame(countRef.current);
      }
    };
  }, [target, duration]);
  return count;
};
// Universities data
const universities = [
  { name: "LSE", logo: lseLogo },
  { name: "Bocconi", logo: "/lovable-uploads/ac9db681-a9c1-4b64-aeb6-c8349e12d4df.png" },
  { name: "MIT", logo: mitLogo },
  { name: "London Business School", logo: lbsLogo },
  { name: "EDHEC", logo: edhecLogo },
  { name: "HEC", logo: hecLogo },
  { name: "Politecnico di Milano", logo: polimiLogo },
  { name: "ETH Zurich", logo: ethLogo },
  { name: "EPFL", logo: epflLogo },
  { name: "Loughborough University", logo: loughboroughLogo },
  { name: "Université de Genève", logo: unigeLogo },
  { name: "Nova School", logo: novaLogo },
  { name: "Baruch College", logo: baruchLogo },
  { name: "Hult International", logo: hultLogo },
  { name: "Skema Business School", logo: skemaLogo },
];

// Companies data
const companies = [
  { name: "Goldman Sachs", logo: goldmanSachsLogo },
  { name: "PwC", logo: pwcLogo },
  { name: "Accenture", logo: accentureLogo },
  { name: "LVMH", logo: "/lovable-uploads/bf21715d-4049-4f6c-877a-3a3308f2e60e.png" },
  { name: "J.P. Morgan", logo: "/lovable-uploads/3fd97059-2d60-4b9e-b3c2-4168cbac9e0c.png" },
  { name: "Boston Consulting Group", logo: "/lovable-uploads/5baf4fda-9830-4a0a-8051-373b6a4cf586.png" },
  { name: "McKinsey & Company", logo: "/lovable-uploads/7b2f42d4-26bb-419b-9f78-a4c25c8fa570.png" },
  { name: "Deloitte", logo: "/lovable-uploads/c2528802-824c-44cf-868b-06697a4dd855.png" },
  { name: "EY", logo: "/lovable-uploads/eb2003c3-2eda-40ea-b5ec-42b3d17a10c4.png" },
  { name: "Morgan Stanley", logo: "/lovable-uploads/88eb200b-2525-474e-a7ca-0d2382920415.png" },
];

const HeroSection = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('openEcosystem') === '1'
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Clean ?openEcosystem=1 from URL after consumption
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('openEcosystem') === '1') {
      url.searchParams.delete('openEcosystem');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
    }
  }, []);
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [platformsTyped, setPlatformsTyped] = useState("");
  useEffect(() => {
    if (!isPanelOpen) { setPlatformsTyped(""); return; }
    const full = "Platforms";
    setPlatformsTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setPlatformsTyped(full.slice(0, i));
      if (i >= full.length) window.clearInterval(id);
    }, 80);
    return () => window.clearInterval(id);
  }, [isPanelOpen]);
  const [associatePhotos, setAssociatePhotos] = useState<Array<{ first_name: string; last_name: string; photo_url: string }>>([]);
  const heroRef = useRef<HTMLElement>(null);
  const { language } = useLanguage();

  // Load associate photos for trust strip
  useEffect(() => {
    const loadAssociates = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, photo_url')
        .eq('role', 'ASSOCIATE' as any)
        .not('photo_url', 'is', null)
        .limit(12);
      if (data) {
        setAssociatePhotos(
          data.filter((a: any) => a.photo_url && a.photo_url.trim() !== '')
        );
      }
    };
    loadAssociates();
  }, []);

  // Track hero section visibility for PLATFORMS tab
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const heroHeight = rect.height;
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const visibilityRatio = visibleHeight / heroHeight;
        setIsHeroVisible(visibilityRatio > 0.3 && rect.top < window.innerHeight);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animated counters
  const satisfactionCount = useCounter(97, 2000);
  const universitiesCount = useCounter(30, 2000);
  const companiesCount = useCounter(30, 2000);

  // Typed effect for "Career Pilot" on mobile
  const fullTitle = "Career Pilot";
  const [typedTitle, setTypedTitle] = useState("");
  useEffect(() => {
    let i = 0;
    setTypedTitle("");
    const interval = setInterval(() => {
      i++;
      setTypedTitle(fullTitle.slice(0, i));
      if (i >= fullTitle.length) clearInterval(interval);
    }, 110);
    return () => clearInterval(interval);
  }, []);
  // Real testimonials (mirrors TestimonialsCarousel) — rotate one for the mobile mini card
  const realTestimonials = language === 'it' ? [
    { name: "Matteo", flag: "🇮🇹", rating: 5, review: "I mentor si sono dimostrati preparati e disponibili. Ho affrontato l'ammissione con maggiore serenità." },
    { name: "Hannah", flag: "🇨🇭", rating: 5, review: "Mi hanno messo in contatto con una ragazza in una top company del mio settore: percorso step-by-step su misura." },
    { name: "Francesco", flag: "🇮🇹", rating: 5, review: "Supporto pratico nella scelta dell'università: insights quantitativi e qualitativi. Mix perfetto qualità/prezzo." },
    { name: "Lavinia", flag: "🇮🇹", rating: 4, review: "Uno studente già iscritto mi ha creato una timeline personalizzata con scadenze, materiali e consulenze extra." },
    { name: "Friedrich", flag: "🇩🇪", rating: 4.5, review: "Seri e professionali, dal meeting gratuito alla realizzazione del progetto personalizzato." },
  ] : [
    { name: "Matteo", flag: "🇮🇹", rating: 5, review: "Mentors were prepared and available. I faced admissions with much more confidence." },
    { name: "Hannah", flag: "🇨🇭", rating: 5, review: "They connected me with someone at a top company in my field — a clear, step-by-step plan made for me." },
    { name: "Francesco", flag: "🇮🇹", rating: 5, review: "Practical help choosing my university: both quantitative and qualitative insights. Perfect quality/value." },
    { name: "Lavinia", flag: "🇮🇹", rating: 4, review: "A current student built a personalized timeline with deadlines and materials, plus extra consultations." },
    { name: "Friedrich", flag: "🇩🇪", rating: 4.5, review: "Serious and professional, from the free meeting to delivering my personalized project." },
  ];
  const [reviewIdx, setReviewIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setReviewIdx(i => (i + 1) % realTestimonials.length), 5500);
    return () => clearInterval(t);
  }, [realTestimonials.length]);
  const currentReview = realTestimonials[reviewIdx];

  const handleLearnMore = () => {
    document.getElementById('services')?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  const handleUniversitiesClick = () => {
    document.getElementById('universita-provenienza')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const handleCompaniesClick = () => {
    document.getElementById('aziende-esperienza')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <section ref={heroRef} className="relative mt-[56px] h-[calc(100svh-56px)] md:mt-16 md:h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden">
      {/* Vertical PLATFORMS label - only visible when hero is in view */}
      {!isPanelOpen && isHeroVisible && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 items-center justify-center bg-gradient-to-b from-secondary to-primary shadow-[0_0_20px_rgba(30,64,175,0.3)] cursor-pointer hover:shadow-[0_0_30px_rgba(30,64,175,0.5)] transition-all duration-300 group rounded-r-xl w-12 h-[280px]"
          aria-label="Open platforms panel"
        >
          <div className="flex flex-col items-center gap-3">
            <span 
              className="text-white font-bold tracking-[0.25em] text-sm group-hover:tracking-[0.3em] transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
              }}
            >
              PLATFORMS
            </span>
            <div className="w-5 h-[2px] bg-gradient-to-r from-white to-white/50 rounded-full group-hover:w-6 group-hover:from-white group-hover:to-white/70 transition-all duration-300" />
            <ChevronRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-all animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
        </button>
      )}

      {/* Toggle Tab - visible only when panel is open and hero is visible */}
      {isPanelOpen && isHeroVisible && (
        <>
          {/* Mobile close button - top right */}
          <button
            onClick={() => setIsPanelOpen(false)}
            className="md:hidden fixed top-4 right-4 z-50 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 flex items-center justify-center rounded-full w-10 h-10"
            aria-label="Close platforms panel"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {/* Desktop close button - edge of panel */}
          <button
            onClick={() => setIsPanelOpen(false)}
            className="hidden md:flex fixed top-1/2 -translate-y-1/2 z-50 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 items-center justify-center rounded-r-lg"
            style={{
              left: 'calc(35% - 1px)',
              width: '32px',
              height: '80px',
            }}
            aria-label="Close platforms panel"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Left Section - Collapsible platforms panel */}
      <div 
        className={`fixed md:relative inset-0 md:inset-auto bg-background flex flex-col transition-all duration-500 ease-in-out z-40 ${
          isPanelOpen 
            ? 'w-full md:w-[35%] opacity-100 translate-x-0' 
            : 'w-full md:w-0 opacity-0 -translate-x-full md:translate-x-0 pointer-events-none'
        }`}
        style={{
          minWidth: isPanelOpen ? undefined : '0',
          overflow: 'hidden',
        }}
      >
        {/* Dynamic animated background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated gradient mesh */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/30 via-transparent to-accent/30 animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-secondary/25 via-transparent to-primary/25 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          </div>
          
          {/* Flowing particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={`particle-${i}`}
                className="absolute w-1 h-1 bg-primary/40 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float-particle ${8 + Math.random() * 8}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              />
            ))}
          </div>
          
          {/* Diagonal flowing lines */}
          <svg className="absolute inset-0 w-full h-full opacity-25">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(223, 83%, 27%)" stopOpacity="0" />
                <stop offset="50%" stopColor="hsl(215, 100%, 60%)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="hsl(223, 83%, 27%)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[...Array(6)].map((_, i) => (
              <line
                key={`line-${i}`}
                x1="0"
                y1={`${i * 20}%`}
                x2="100%"
                y2={`${i * 20 + 30}%`}
                stroke="url(#lineGradient)"
                strokeWidth="1.5"
                style={{
                  animation: `dash-line ${3 + i * 0.5}s linear infinite`,
                  animationDelay: `${i * 0.7}s`,
                }}
              />
            ))}
          </svg>
          
          {/* Glowing orbs with more movement */}
          <div className="absolute inset-0">
            <div 
              className="absolute w-96 h-96 rounded-full blur-3xl"
              style={{
                top: '10%',
                left: '20%',
                background: 'radial-gradient(circle, hsl(223, 83%, 27%, 0.15) 0%, transparent 70%)',
                animation: 'orbit-slow 15s ease-in-out infinite',
              }}
            />
            <div 
              className="absolute w-80 h-80 rounded-full blur-3xl"
              style={{
                bottom: '15%',
                right: '10%',
                background: 'radial-gradient(circle, hsl(215, 100%, 60%, 0.15) 0%, transparent 70%)',
                animation: 'orbit-reverse 12s ease-in-out infinite',
                animationDelay: '2s',
              }}
            />
            <div 
              className="absolute w-64 h-64 rounded-full blur-2xl"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, hsl(223, 83%, 35%, 0.12) 0%, transparent 70%)',
                animation: 'pulse-glow 8s ease-in-out infinite',
                animationDelay: '4s',
              }}
            />
          </div>
          
          {/* Network effect - connecting dots */}
          <svg className="absolute inset-0 w-full h-full opacity-15">
            {[...Array(8)].map((_, i) => {
              const cx = (i % 4) * 25 + 12.5;
              const cy = Math.floor(i / 4) * 40 + 20;
              return (
                <g key={`node-${i}`}>
                  <circle
                    cx={`${cx}%`}
                    cy={`${cy}%`}
                    r="3"
                    fill="hsl(215, 100%, 60%)"
                    className="animate-pulse"
                    style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${Math.random() * 2}s` }}
                  />
                  {i < 7 && (
                    <line
                      x1={`${cx}%`}
                      y1={`${cy}%`}
                      x2={`${((i + 1) % 4) * 25 + 12.5}%`}
                      y2={`${Math.floor((i + 1) / 4) * 40 + 20}%`}
                      stroke="hsl(223, 83%, 27%)"
                      strokeWidth="0.5"
                      opacity="0.4"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="relative z-10 px-4 md:px-6 pt-6 md:pt-8 2xl:pt-10 pb-3 md:pb-4 h-full overflow-hidden flex flex-col gap-2 md:gap-3">
          {/* Top block: Title + Links + Buttons */}
          <div className="flex flex-col mt-4 md:mt-6">
            {/* Platforms Title - aligned with hero "Career Pilot" */}
            <div className="flex flex-col items-center">
              <h2 className="text-2xl md:text-4xl lg:text-5xl 2xl:text-6xl font-bold text-foreground leading-none mb-0 md:mb-2 2xl:mb-3 inline-flex items-center justify-center min-h-[1em]">
                <span>{platformsTyped}</span>
                {platformsTyped.length < "Platforms".length && (
                  <span className="ml-1 inline-block w-[3px] h-[0.9em] bg-primary animate-pulse" />
                )}
              </h2>
              <div className="h-0.5 md:h-1 2xl:h-1.5 w-16 md:w-20 2xl:w-28 bg-gradient-sky rounded-full mb-2 md:mb-3 2xl:mb-4" />
            </div>

            {/* Primary action buttons - stacked */}
            <div className="space-y-2 md:space-y-2.5 2xl:space-y-3">
              <Button
                size="default"
                className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base 2xl:text-lg py-2.5 md:py-3 2xl:py-4 justify-start px-4"
                onClick={() => window.location.href = '/client-portal/services'}
              >
                {language === 'it' ? 'Book Flight Plan' : 'Book Flight Plan'}
                <ArrowRight className="ml-auto h-4 w-4 2xl:h-5 2xl:w-5" />
              </Button>
              <Button
                size="default"
                className="w-full rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base 2xl:text-lg py-2.5 md:py-3 2xl:py-4 justify-start px-4"
                onClick={() => window.location.href = '/auth'}
              >
                {language === 'it' ? 'Crew Portal' : 'Crew Portal'}
                <ArrowRight className="ml-auto h-4 w-4 2xl:h-5 2xl:w-5" />
              </Button>
              <Button
                size="default"
                className="w-full rounded-lg bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-95 shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base 2xl:text-lg py-2.5 md:py-3 2xl:py-4 justify-start px-4 border border-secondary/30"
                onClick={() => setIsEcosystemOpen(true)}
              >
                {language === 'it' ? 'Softwares & Preparation' : 'Softwares & Preparation'}
                <ArrowRight className="ml-auto h-4 w-4 2xl:h-5 2xl:w-5" />
              </Button>
            </div>

            {/* Bullet list under Softwares & Preparation */}
            <ul className="mt-2 md:mt-2.5 2xl:mt-3 pl-4 md:pl-5 space-y-1 md:space-y-1.5">
              {['Knowledge Base', 'Talent Pool', 'Pathways'].map((label) => (
                <li key={label} className="list-disc marker:text-secondary text-sm md:text-base 2xl:text-lg">
                  <span className="text-foreground/80 font-medium">{label}</span>
                </li>
              ))}
            </ul>

            {/* Learn more */}
            <div className="flex flex-col mt-2 md:mt-3">
              <button
                onClick={handleLearnMore}
                className="text-sm md:text-base 2xl:text-lg text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors duration-300 font-medium text-left px-3 md:px-4 py-1.5 md:py-2"
              >
                {language === 'it' ? 'Scopri di più' : 'Learn more'}
              </button>
            </div>
          </div>

          {/* Bottom block: Carousels - aligned with hero bottom */}
          <div className="flex flex-col gap-1 md:gap-1.5 shrink-0 mt-auto">
            <div className="space-y-0.5 md:space-y-1">
              <h3 className="text-xs md:text-sm 2xl:text-base font-semibold text-muted-foreground text-center">
                {language === 'it' ? 'Università' : 'Universities'}
              </h3>
              <AutoScrollCarousel items={universities} speed={25} />
            </div>
            <div className="space-y-0.5 md:space-y-1 pb-1 md:pb-2">
              <h3 className="text-xs md:text-sm 2xl:text-base font-semibold text-muted-foreground text-center">
                {language === 'it' ? 'Aziende' : 'Companies'}
              </h3>
              <AutoScrollCarousel items={companies} speed={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Expands when panel is closed */}
      <div className={`relative flex items-center min-h-full md:min-h-0 transition-all duration-500 ease-in-out ${
        isPanelOpen 
          ? 'w-full md:w-[65%]'
          : 'w-full md:flex-1'
      }`}>
        {/* White background */}
        <div className="absolute inset-0 bg-white" />

        {/* ============== MOBILE LAYOUT ============== */}
        <div className="md:hidden relative z-10 w-full h-full flex flex-col overflow-hidden px-4 pt-4 pb-4">
          {/* Decorative gradient blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-secondary/15 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute top-1/3 right-1/4 w-44 h-44 rounded-full bg-accent/10 blur-2xl" />
          </div>

          {/* Logo — generous and central */}
          <div className="relative z-10 flex justify-center items-center flex-[1.2] min-h-0 animate-fade-in opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            <img
              src="/lovable-uploads/ef00a41f-dd9a-4450-9fd7-a5ca64906fb8.png"
              alt="Career Pilot"
              className="max-h-[160px] w-auto object-contain drop-shadow-[0_10px_30px_hsla(215,100%,60%,0.25)]"
            />
            <h1 className="sr-only">Career Pilot</h1>
          </div>

          {/* Primary CTA */}
          <div className="relative z-10 flex flex-col items-center gap-2.5 animate-fade-in opacity-0 w-full" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            <Button
              size="lg"
              onClick={() => setIsBookingOpen(true)}
              className="bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground hover:opacity-95 transition-all duration-300 active:scale-95 text-base font-bold px-8 py-6 rounded-2xl w-full max-w-[320px]"
              style={{ boxShadow: '0 0 36px hsla(215, 100%, 60%, 0.45), 0 10px 24px hsla(223, 83%, 27%, 0.4)' }}
            >
              {language === 'it' ? 'Prenota Check-in Gratuito' : 'Book Free Check-in'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Pilot AI – alternative path, framed as a "step 2 / undecided" route */}
          <div className="relative z-10 w-full flex flex-col items-center gap-2 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2 w-full max-w-[280px]">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {language === 'it' ? 'oppure' : 'or'}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={() => window.location.href = '/client-portal/services?advisor=1'}
              className="group inline-flex items-center gap-2 rounded-full bg-background/70 backdrop-blur border border-secondary/40 hover:border-secondary hover:bg-secondary/10 px-4 py-2 transition-all active:scale-[0.97]"
              aria-label={language === 'it' ? 'Apri il Pilot Advisor AI' : 'Open Pilot Advisor AI'}
            >
              <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                <Plane className="h-3 w-3 -rotate-12" />
              </span>
              <span className="text-[12px] font-bold text-primary">
                {language === 'it' ? 'Non sai quale scegliere? Lascia che il Co-Pilot ti guidi' : "Not sure which to pick? Let your Co-Pilot guide you"}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-secondary group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>


          {/* Pathway label */}
          <p className="relative z-10 text-center text-[10px] text-muted-foreground font-bold uppercase tracking-[0.25em] mt-5">
            {language === 'it' ? '— Scegli il tuo percorso —' : '— Choose your pathway —'}
          </p>

          {/* 4 Pathway buttons */}
          <div className="relative z-10 grid grid-cols-2 gap-2.5 mt-2.5 animate-fade-in opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            {[
              { icon: Plane, label: language === 'it' ? 'Liceo → Uni' : 'Highschool → Uni', href: '/client-portal/services?category=Take+Off' },
              { icon: GraduationCap, label: language === 'it' ? 'Uni → Master' : 'Uni → Master', href: '/client-portal/services?category=Summit' },
              { icon: Building, label: 'Internship', href: '/client-portal/services?category=Altitude' },
              { icon: ArrowLeftRight, label: language === 'it' ? 'Trasferimento' : 'Uni Transfer', href: '/client-portal/services?category=Layover' },
            ].map(({ icon: Icon, label, href }) => (
              <button
                key={label}
                onClick={() => window.location.href = href}
                className="group relative flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-2xl px-1 py-4 transition-all duration-300 active:scale-95 overflow-hidden min-h-[78px]"
                style={{ boxShadow: '0 6px 18px hsla(223, 83%, 27%, 0.4), 0 2px 6px hsla(215, 100%, 60%, 0.25)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Icon className="h-6 w-6 text-primary-foreground relative z-10" />
                <span className="text-[11px] font-bold text-primary-foreground text-center leading-tight relative z-10 px-1">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Mentor avatars strip */}
          {associatePhotos.length > 0 && (
            <div className="relative z-10 flex flex-col items-center gap-1.5 mt-5 animate-fade-in opacity-0" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
              <div className="flex -space-x-2">
                {associatePhotos.slice(0, 8).map((a, i) => (
                  <img
                    key={i}
                    src={a.photo_url}
                    alt={`${a.first_name} ${a.last_name}`}
                    className="h-9 w-9 rounded-full ring-2 ring-background object-cover shadow-md"
                  />
                ))}
                <div className="h-9 w-9 rounded-full ring-2 ring-background bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold shadow-md">
                  +more
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">
                {language === 'it' ? 'Mentor verificati' : 'Verified mentors'}
              </span>
            </div>
          )}

          {/* Companies marquee */}
          <div className="relative z-10 overflow-hidden mt-4 py-2 border-y border-border/40 bg-card/40 -mx-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent z-10" />
            <div className="flex gap-6 animate-scroll-carousel" style={{ animationDuration: '30s', width: 'max-content' }}>
              {[...companies, ...companies, ...companies].map((c, i) => (
                <div key={`c-${i}`} className="flex-shrink-0 flex items-center justify-center h-8" title={c.name}>
                  <img src={c.logo} alt={c.name} className="h-full w-auto max-w-[70px] object-contain grayscale opacity-75" loading="lazy" />
                </div>
              ))}
            </div>
          </div>

          {/* Stat chips */}
          <div className="relative z-10 grid grid-cols-3 gap-2 mt-3 animate-fade-in opacity-0" style={{ animationDelay: '0.9s', animationFillMode: 'forwards' }}>
            <button onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="flex items-center justify-center gap-1.5 bg-card/80 backdrop-blur-sm border border-primary/25 rounded-xl px-1 py-2 active:scale-95 transition-transform">
              <Star className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[13px] font-bold text-primary">{satisfactionCount}%</span>
                <span className="text-[8px] text-muted-foreground font-medium">{language === 'it' ? 'Soddisf.' : 'Satisf.'}</span>
              </div>
            </button>
            <button onClick={handleUniversitiesClick} className="flex items-center justify-center gap-1.5 bg-card/80 backdrop-blur-sm border border-secondary/25 rounded-xl px-1 py-2 active:scale-95 transition-transform">
              <GraduationCap className="h-3.5 w-3.5 text-secondary flex-shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[13px] font-bold text-secondary">{universitiesCount}+</span>
                <span className="text-[8px] text-muted-foreground font-medium">{language === 'it' ? 'Università' : 'Universit.'}</span>
              </div>
            </button>
            <button onClick={handleCompaniesClick} className="flex items-center justify-center gap-1.5 bg-card/80 backdrop-blur-sm border border-accent/25 rounded-xl px-1 py-2 active:scale-95 transition-transform">
              <Building className="h-3.5 w-3.5 text-accent flex-shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[13px] font-bold text-accent">{companiesCount}+</span>
                <span className="text-[8px] text-muted-foreground font-medium">{language === 'it' ? 'Aziende' : 'Companies'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* ============== DESKTOP LAYOUT ============== */}
        <div className={`hidden md:flex relative z-10 pt-3 2xl:pt-5 pb-3 w-full transition-all duration-500 flex-col justify-between items-center gap-2 2xl:gap-3 h-full ${
          isPanelOpen 
            ? 'px-8 lg:px-12' 
            : 'px-10 lg:px-14'
        }`}>
          {/* Hero core: Logo + tagline + short description */}
          <div className="text-center w-full flex flex-col items-center">
            <img
              src="/lovable-uploads/ef00a41f-dd9a-4450-9fd7-a5ca64906fb8.png"
              alt="Career Pilot"
              className="h-32 lg:h-40 2xl:h-52 w-auto object-contain mb-1 animate-fade-in opacity-0"
              style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
            />
            <h1 className="sr-only">Career Pilot</h1>
            <p className="text-lg lg:text-xl 2xl:text-2xl font-semibold text-foreground animate-fade-in opacity-0 leading-tight" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              {language === 'it'
                ? 'Top Students Network. Esperienza e orientamento da chi ci è già passato.'
                : "Top Students Network. Real guidance from those who've already been there."}
            </p>
            <p className="text-sm lg:text-base 2xl:text-lg text-muted-foreground max-w-3xl leading-snug mt-1 animate-fade-in opacity-0" style={{ animationDelay: '0.45s', animationFillMode: 'forwards' }}>
              {language === 'it'
                ? 'Mentorship 1-to-1 personalizzata per: ammissioni universitarie, Master, trasferimenti e internship.'
                : 'Personalized 1-to-1 mentorship for: university admissions, Master\'s applications, transfers and internships.'}
            </p>
          </div>

          {/* Primary CTA: Book Free Check-in */}
          <div className="flex flex-row items-center gap-3 flex-wrap justify-center animate-fade-in opacity-0" style={{ animationDelay: '0.55s', animationFillMode: 'forwards' }}>
            <Button
              size="lg"
              onClick={() => setIsBookingOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-aviation transition-all duration-300 hover:scale-105 text-base lg:text-lg 2xl:text-xl font-bold px-8 2xl:px-12 py-5 2xl:py-7 rounded-xl"
              style={{
                boxShadow: '0 0 30px hsla(215, 100%, 60%, 0.4), 0 8px 24px hsla(223, 83%, 27%, 0.35)',
              }}
            >
              {language === 'it' ? 'Prenota Check-in Gratuito' : 'Book Free Check-in'}
              <ArrowRight className="ml-2 h-5 w-5 2xl:h-6 2xl:w-6" />
            </Button>
          </div>

          {/* Pilot AI — alternative path, framed as an "or undecided" route */}
          <div className="flex flex-col items-center gap-2 animate-fade-in opacity-0" style={{ animationDelay: '0.65s', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2 w-full max-w-[320px]">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {language === 'it' ? 'oppure' : 'or'}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={() => window.location.href = '/client-portal/services?advisor=1'}
              className="group inline-flex items-center gap-2 rounded-full bg-background/70 backdrop-blur border border-secondary/40 hover:border-secondary hover:bg-secondary/10 px-4 py-2 transition-all active:scale-[0.97]"
              aria-label={language === 'it' ? 'Apri il Pilot Advisor AI' : 'Open Pilot Advisor AI'}
              title={language === 'it' ? 'Pilot Advisor — AI guidata' : 'Pilot Advisor — AI-guided'}
            >
              <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                <Plane className="h-3 w-3 -rotate-12" />
              </span>
              <span className="text-[12px] font-bold text-primary">
                {language === 'it' ? "Non sai quale scegliere? Lascia che il Co-Pilot ti guidi" : "Not sure which to pick? Let your Co-Pilot guide you"}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-secondary group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>


          {/* Pathway Selection */}
          <div className="w-full max-w-4xl 2xl:max-w-6xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => window.location.href = '/client-portal/services?category=Take+Off'}
                className="group relative flex flex-col items-center justify-center gap-1.5 2xl:gap-2 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-xl px-3 py-2.5 2xl:px-5 2xl:py-3.5 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
                style={{ boxShadow: '0 0 20px hsla(223, 83%, 27%, 0.45), 0 0 40px hsla(215, 100%, 60%, 0.25)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Plane className="h-6 w-6 2xl:h-7 2xl:w-7 text-primary-foreground relative z-10" />
                <span className="text-base 2xl:text-xl font-bold text-primary-foreground text-center leading-tight relative z-10">
                  {language === 'it' ? 'Liceo → Università' : 'Highschool to University'}
                </span>
              </button>
              <button
                onClick={() => window.location.href = '/client-portal/services?category=Summit'}
                className="group relative flex flex-col items-center justify-center gap-1.5 2xl:gap-2 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-xl px-3 py-2.5 2xl:px-5 2xl:py-3.5 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
                style={{ boxShadow: '0 0 20px hsla(223, 83%, 27%, 0.45), 0 0 40px hsla(215, 100%, 60%, 0.25)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <GraduationCap className="h-6 w-6 2xl:h-7 2xl:w-7 text-primary-foreground relative z-10" />
                <span className="text-base 2xl:text-xl font-bold text-primary-foreground text-center leading-tight relative z-10">
                  {language === 'it' ? 'Università → Master' : 'University to Master'}
                </span>
              </button>
              <button
                onClick={() => window.location.href = '/client-portal/services?category=Altitude'}
                className="group relative flex flex-col items-center justify-center gap-1.5 2xl:gap-2 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-xl px-3 py-2.5 2xl:px-5 2xl:py-3.5 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden"
                style={{ boxShadow: '0 0 20px hsla(223, 83%, 27%, 0.45), 0 0 40px hsla(215, 100%, 60%, 0.25)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Building className="h-6 w-6 2xl:h-7 2xl:w-7 text-primary-foreground relative z-10" />
                <span className="text-base 2xl:text-xl font-bold text-primary-foreground text-center leading-tight relative z-10">
                  {language === 'it' ? 'Internship Placement' : 'Internship Placement'}
                </span>
              </button>
            </div>

            {/* Secondary text links right under pathway buttons */}
            <div className="flex items-center justify-center gap-x-4 2xl:gap-x-6 mt-2">
              <button
                onClick={() => window.location.href = '/client-portal/services?category=Layover'}
                className="text-sm 2xl:text-base text-muted-foreground hover:text-primary underline underline-offset-4 decoration-dotted transition-colors duration-300 font-medium"
              >
                {language === 'it' ? 'Trasferimento Universitario' : 'University Transfer'}
              </button>
              <span className="text-muted-foreground/40 text-xs">•</span>
              <button
                onClick={() => setIsEcosystemOpen(true)}
                className="text-sm 2xl:text-base text-primary hover:text-primary/80 underline underline-offset-4 transition-colors duration-300 font-medium"
              >
                {language === 'it' ? 'Career Pilot Ecosystem' : 'Career Pilot Ecosystem'}
              </button>
            </div>
          </div>

          {/* Bigger associates strip */}
          {associatePhotos.length > 0 && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center -space-x-2">
                {associatePhotos.slice(0, 10).map((a, i) => (
                  <img
                    key={i}
                    src={a.photo_url}
                    alt={`${a.first_name} ${a.last_name}`}
                    className="h-9 w-9 lg:h-10 lg:w-10 2xl:h-12 2xl:w-12 rounded-full ring-2 ring-background object-cover shadow-md hover:scale-110 hover:z-10 transition-transform duration-200"
                  />
                ))}
                <div className="h-9 w-9 lg:h-10 lg:w-10 2xl:h-12 2xl:w-12 rounded-full ring-2 ring-background bg-primary text-primary-foreground flex items-center justify-center text-[8px] lg:text-[9px] 2xl:text-[10px] font-bold shadow-md tracking-tight">
                  {language === 'it' ? '+altri' : '+more'}
                </div>
              </div>
              <span className="text-[11px] 2xl:text-xs text-muted-foreground font-semibold tracking-wide">
                {language === 'it'
                  ? 'Mentor verificati • e molti altri non in foto'
                  : 'Verified mentors • and many more not pictured'}
              </span>
            </div>
          )}

          {/* Universities carousel */}
          <div className="w-full max-w-4xl 2xl:max-w-5xl">
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent z-10" />
              <div className="flex gap-8 animate-scroll-carousel py-1" style={{ animationDuration: '40s', width: 'max-content' }}>
                {[...universities, ...universities, ...universities].map((u, i) => (
                  <div key={`uni-${i}`} className="flex-shrink-0 flex items-center justify-center h-10 2xl:h-12" title={u.name}>
                    <img src={u.logo} alt={u.name} className="h-full w-auto max-w-[80px] 2xl:max-w-[100px] object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary stats — small chips */}
          <div className="flex items-center justify-center gap-2 2xl:gap-3 flex-wrap">
            <button
              onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex items-center gap-1.5 bg-card/70 border border-primary/20 rounded-full px-3 py-1 hover:bg-primary/5 transition-colors"
            >
              <Star className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs 2xl:text-sm font-bold text-primary">{satisfactionCount}%</span>
              <span className="text-[10px] 2xl:text-xs text-muted-foreground">{language === 'it' ? 'soddisfazione' : 'satisfaction'}</span>
            </button>
            <button
              onClick={handleUniversitiesClick}
              className="flex items-center gap-1.5 bg-card/70 border border-secondary/20 rounded-full px-3 py-1 hover:bg-secondary/5 transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5 text-secondary" />
              <span className="text-xs 2xl:text-sm font-bold text-secondary">{universitiesCount}+</span>
              <span className="text-[10px] 2xl:text-xs text-muted-foreground">{language === 'it' ? 'università' : 'universities'}</span>
            </button>
            <button
              onClick={handleCompaniesClick}
              className="flex items-center gap-1.5 bg-card/70 border border-accent/20 rounded-full px-3 py-1 hover:bg-accent/5 transition-colors"
            >
              <Building className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs 2xl:text-sm font-bold text-accent">{companiesCount}+</span>
              <span className="text-[10px] 2xl:text-xs text-muted-foreground">{language === 'it' ? 'aziende' : 'companies'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Booking Popup */}
      <BookingPopup isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
      <EcosystemOverlay isOpen={isEcosystemOpen} onClose={() => setIsEcosystemOpen(false)} />
    </section>
  );
};

export default HeroSection;