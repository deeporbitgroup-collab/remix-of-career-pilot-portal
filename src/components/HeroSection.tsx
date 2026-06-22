import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
// Canonical, correctly-mapped logos (same source as the "Our Experts" section)
// — used by the mobile hero marquees so the faces never mismatch.
import { universities as coveredUniversities, companies as coveredCompanies } from "@/data/coveredLogos";

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
  const navigate = useNavigate();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('openEcosystem') === '1'
  );

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

      {/* Right Section - full width (platforms panel removed) */}
      <div className={`relative flex items-center min-h-full md:min-h-0 transition-all duration-500 ease-in-out ${
        'w-full md:flex-1'
      }`}>
        {/* White background */}
        <div className="absolute inset-0 bg-white" />

        {/* ============== MOBILE LAYOUT ============== */}
        <div className="md:hidden relative z-10 w-full h-full flex flex-col overflow-hidden px-4 pt-3 pb-3">
          {/* Decorative gradient blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-secondary/15 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute top-1/3 right-1/4 w-44 h-44 rounded-full bg-accent/10 blur-2xl" />
          </div>

          {/* Logo — top */}
          <div className="relative z-10 flex justify-center pt-1 shrink-0 animate-fade-in opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            <img
              src="/lovable-uploads/ef00a41f-dd9a-4450-9fd7-a5ca64906fb8.png"
              alt="Career Pilot"
              className="max-h-[84px] w-auto object-contain drop-shadow-[0_10px_30px_hsla(215,100%,60%,0.25)]"
            />
            <h1 className="sr-only">Career Pilot</h1>
          </div>

          {/* Center group: trust faces + check-in box + two pathways — fills the
              screen between the logo and the social-proof marquees, no scroll. */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center gap-3 animate-fade-in opacity-0 w-full max-w-[420px] mx-auto" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            {/* Book free check-in — primary box, opens the same booking modal as desktop */}
            <button
              onClick={() => setIsBookingOpen(true)}
              className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground px-5 py-5 text-left active:scale-[0.98] transition-transform"
              style={{ boxShadow: '0 0 36px hsla(215, 100%, 60%, 0.45), 0 12px 28px hsla(223, 83%, 27%, 0.4)' }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-active:translate-x-full transition-transform duration-700" />
              <div className="relative z-10 flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <Star className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold leading-tight">
                    {language === 'it' ? 'Check-in gratuito' : 'Book free check-in'}
                  </p>
                  <p className="text-xs font-medium text-primary-foreground/85">
                    {language === 'it' ? 'Una call 1:1 gratuita per il tuo piano' : 'A free 1:1 call to map out your plan'}
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 shrink-0" />
              </div>
            </button>

            {/* Two product pathways: Mentoring + Talent Pool — bold, filled
                tiles so it's instantly clear they open our two services. */}
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {language === 'it' ? 'Esplora i nostri due servizi' : 'Explore our two services'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { window.location.href = '/client-portal/services'; }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary px-4 py-4 text-left text-primary-foreground active:scale-95 transition-transform"
                style={{ boxShadow: '0 10px 26px hsla(223, 83%, 27%, 0.4)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-active:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <span className="relative z-10 text-base font-extrabold leading-tight">Mentoring</span>
                <span className="relative z-10 mt-0.5 text-[10px] font-medium leading-tight text-primary-foreground/85">University · Master · Internship · Transfer</span>
                <span className="relative z-10 mt-2 inline-flex items-center gap-1 text-[11px] font-bold">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
              <button
                onClick={() => { window.location.href = '/talent-pool'; }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 px-4 py-4 text-left text-white active:scale-95 transition-transform"
                style={{ boxShadow: '0 10px 26px hsla(173, 80%, 30%, 0.4)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-active:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Building className="h-5 w-5" />
                </span>
                <span className="relative z-10 text-base font-extrabold leading-tight">Talent Pool</span>
                <span className="relative z-10 mt-0.5 text-[10px] font-medium leading-tight text-white/85">Get discovered by top companies</span>
                <span className="relative z-10 mt-2 inline-flex items-center gap-1 text-[11px] font-bold">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>

            {/* Trust: real Associate faces — nudged a little below the two
                service tiles so they read as a separate trust signal. */}
            {associatePhotos.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="flex -space-x-2.5">
                  {associatePhotos.slice(0, 6).map((a, i) => (
                    <img
                      key={i}
                      src={a.photo_url}
                      alt={`${a.first_name} ${a.last_name}`}
                      loading="lazy"
                      className="h-8 w-8 rounded-full ring-2 ring-white object-cover object-top shadow-sm"
                    />
                  ))}
                  <div className="h-8 w-8 rounded-full ring-2 ring-white bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold shadow-sm">
                    {language === 'it' ? '+altri' : '+more'}
                  </div>
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                  {language === 'it' ? 'Mentor verificati' : 'Verified mentors'}
                </span>
              </div>
            )}
          </div>

          {/* Social proof footer: two gentle, moving marquees — universities our
              mentors come from + companies they've worked at. Non-invasive, but
              they make the credibility of the network instantly visible. */}
          <div className="relative z-10 shrink-0 flex flex-col gap-1.5 pt-2 animate-fade-in opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            {/* Universities */}
            <div className="flex flex-col gap-0.5">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/75">
                {language === 'it' ? 'Le università dei nostri mentor' : 'Where our mentors studied'}
              </p>
              <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent z-10" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent z-10" />
                <div className="flex gap-6 animate-scroll-carousel py-0.5" style={{ animationDuration: '64s', width: 'max-content' }}>
                  {[...coveredUniversities, ...coveredUniversities, ...coveredUniversities].map((u, i) => (
                    <div key={`m-uni-${i}`} className="flex-shrink-0 flex items-center justify-center h-7" title={u.name}>
                      <img src={u.logo} alt={u.name} className="h-full w-auto max-w-[68px] object-contain grayscale opacity-70" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Companies — scrolls the opposite way for a lively, balanced strip */}
            <div className="flex flex-col gap-0.5">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/75">
                {language === 'it' ? 'Le aziende dove hanno lavorato' : 'Companies they’ve worked at'}
              </p>
              <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent z-10" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent z-10" />
                <div className="flex gap-6 animate-scroll-carousel py-0.5" style={{ animationDuration: '70s', animationDirection: 'reverse', width: 'max-content' }}>
                  {[...coveredCompanies, ...coveredCompanies, ...coveredCompanies].map((c, i) => (
                    <div key={`m-co-${i}`} className="flex-shrink-0 flex items-center justify-center h-7" title={c.name}>
                      <img src={c.logo} alt={c.name} className="h-full w-auto max-w-[72px] object-contain grayscale opacity-70" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============== DESKTOP LAYOUT ============== */}
        <div className="hidden md:flex relative z-10 pt-3 2xl:pt-5 pb-3 w-full transition-all duration-500 flex-col justify-between items-center gap-2 2xl:gap-3 h-full px-10 lg:px-14">
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

          {/* Pathway Selection */}
          <div className="w-full max-w-4xl 2xl:max-w-6xl mx-auto animate-fade-in opacity-0" style={{ animationDelay: '0.65s', animationFillMode: 'forwards' }}>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => navigate('/client-portal/services?category=Take+Off')}
                  className="group relative flex flex-col items-center justify-center gap-1.5 2xl:gap-2 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-xl px-3 py-2.5 2xl:px-5 2xl:py-3.5 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden w-full"
                  style={{ boxShadow: '0 0 20px hsla(223, 83%, 27%, 0.45), 0 0 40px hsla(215, 100%, 60%, 0.25)' }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Plane className="h-6 w-6 2xl:h-7 2xl:w-7 text-primary-foreground relative z-10" />
                  <span className="text-base 2xl:text-xl font-bold text-primary-foreground text-center leading-tight relative z-10">
                    {language === 'it' ? 'Liceo → Università' : 'Highschool to University'}
                  </span>
                </button>
                <div className="w-12 h-px bg-border/60" />
                <button
                  onClick={() => navigate('/client-portal/services?category=Layover')}
                  className="text-sm 2xl:text-base text-muted-foreground hover:text-primary underline underline-offset-4 decoration-dotted transition-colors duration-300 font-medium"
                >
                  University Transfer
                </button>
              </div>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => navigate('/client-portal/services?category=Summit')}
                  className="group relative flex flex-col items-center justify-center gap-1.5 2xl:gap-2 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-xl px-3 py-2.5 2xl:px-5 2xl:py-3.5 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden w-full"
                  style={{ boxShadow: '0 0 20px hsla(223, 83%, 27%, 0.45), 0 0 40px hsla(215, 100%, 60%, 0.25)' }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <GraduationCap className="h-6 w-6 2xl:h-7 2xl:w-7 text-primary-foreground relative z-10" />
                  <span className="text-base 2xl:text-xl font-bold text-primary-foreground text-center leading-tight relative z-10">
                    {language === 'it' ? 'Università → Master' : 'University to Master'}
                  </span>
                </button>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => navigate('/client-portal/services?category=Altitude')}
                  className="group relative flex flex-col items-center justify-center gap-1.5 2xl:gap-2 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground rounded-xl px-3 py-2.5 2xl:px-5 2xl:py-3.5 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 overflow-hidden w-full"
                  style={{ boxShadow: '0 0 20px hsla(223, 83%, 27%, 0.45), 0 0 40px hsla(215, 100%, 60%, 0.25)' }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Building className="h-6 w-6 2xl:h-7 2xl:w-7 text-primary-foreground relative z-10" />
                  <span className="text-base 2xl:text-xl font-bold text-primary-foreground text-center leading-tight relative z-10">
                    {language === 'it' ? 'Internship Placement' : 'Internship Placement'}
                  </span>
                </button>
                <div className="w-12 h-px bg-border/60" />
                <button
                  onClick={() => window.location.href = '/talent-pool'}
                  className="group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500/90 via-teal-500/90 to-teal-600/90 px-2.5 py-1 2xl:px-3 2xl:py-1.5 text-white font-medium shadow-md transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
                  style={{ boxShadow: '0 4px 12px hsla(173, 80%, 30%, 0.35)' }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Building className="h-3 w-3 2xl:h-3.5 2xl:w-3.5 relative z-10" />
                  <span className="relative z-10 text-[11px] 2xl:text-xs leading-none">Talent Pool</span>
                  <ArrowRight className="h-3 w-3 relative z-10 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
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