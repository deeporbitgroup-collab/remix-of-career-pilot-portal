import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building, Users, Shield, FileText, Mail, Video, Send, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TalentPoolLanguageProvider, useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";
import { useStaggeredAnimation } from "@/hooks/useScrollAnimation";
import { supabase } from "@/integrations/supabase/client";
import careerPilotLogo from "@/assets/career-pilot-logo.png";
import careerBoostMark from "@/assets/careerboost-mark-white.png";
import TrustedLogos from "@/components/talent-pool/TrustedLogos";

type LandingService = "cv" | "cover" | "video";


/**
 * Hero title typed out letter by letter once, with the key word in the brand gradient;
 * the caret disappears as soon as the sentence is complete. The full sentence is reserved invisibly underneath so the
 * layout never jumps, and screen readers / reduced-motion users get it at once.
 */
const TypedHeadline = ({ prefix, highlight }: { prefix: string; highlight: string }) => {
  const full = prefix + highlight;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setCount(full.length);
      return;
    }
    setCount(0);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < full.length) timer = setTimeout(tick, 55 + Math.random() * 45);
    };
    timer = setTimeout(tick, 450);
    return () => clearTimeout(timer);
  }, [full]);

  const typedPrefix = full.slice(0, Math.min(count, prefix.length));
  const typedHighlight = count > prefix.length ? highlight.slice(0, count - prefix.length) : '';
  const done = count >= full.length;

  return (
    <span className="relative block mx-auto max-w-4xl" aria-label={full}>
      <span className="invisible" aria-hidden="true">
        {prefix}{highlight}
      </span>
      <span className="absolute inset-0" aria-hidden="true">
        {typedPrefix}
        <span className="bg-gradient-to-r from-cbsky-300 via-cbsky-400 to-cbind-400 bg-clip-text text-transparent">
          {typedHighlight}
        </span>
        {/* caret only while typing; zero-width so it never pushes the text onto a new line */}
        {!done && (
          <span className="inline-block w-0 overflow-visible">
            <span className="inline-block w-[3px] h-[0.85em] -mb-[0.06em] ml-1 rounded-sm bg-cbsky-400 align-baseline" />
          </span>
        )}
      </span>
    </span>
  );
};

const TalentPoolContent = () => {
  const navigate = useNavigate();
  const { t, tx, language, setLanguage } = useTalentPoolLanguage();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { containerRef, getItemProps } = useStaggeredAnimation(100);

  // Expert-service requests triggered from the CV / Cover letter / Video chips.
  const [serviceTarget, setServiceTarget] = useState<null | { service: LandingService; title: string; desc: string }>(null);
  const [serviceForm, setServiceForm] = useState({ firstName: '', lastName: '', email: '', whatsapp: '' });
  const [serviceState, setServiceState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleRoleSelect = (role: 'student' | 'company') => {
    setSelectedRole(role);
    navigate(`/talent-pool/${role}`);
  };

  const openService = (service: LandingService, title: string, desc: string) => {
    setServiceForm({ firstName: '', lastName: '', email: '', whatsapp: '' });
    setServiceState('idle');
    setServiceTarget({ service, title, desc });
  };

  const sendService = async () => {
    if (!serviceTarget) return;
    const { firstName, lastName, email, whatsapp } = serviceForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !whatsapp.trim()) return;
    setServiceState('sending');
    const { error } = await supabase.functions.invoke('send-mentor-booking-email', {
      body: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        language,
        requestType: 'service',
        service: serviceTarget.service,
        source: 'Talent Pool — Landing',
      },
    });
    if (error) {
      console.error('Service request error:', error);
      setServiceState('error');
      return;
    }
    setServiceState('sent');
  };

  return (
    <div className="h-[100svh] overflow-hidden relative flex flex-col animate-fade-in">
      {/* CareerBoost silk background: near-black + diagonal blue bands + aurora glows */}
      <div className="fixed inset-0 z-0 cb-silk-bg animate-fade-in" />
      <div className="fixed inset-0 z-0 cb-silk-ribbons opacity-70 animate-fade-in" />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-cbslate-950/60 animate-fade-in" />
      
      {/* Navigation Bar - Elegant */}
      <nav className="relative z-20 border-b border-cbsky-500/20 bg-cbslate-950/80 backdrop-blur-md animate-fade-in">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <img
                src={careerBoostMark}
                alt="CareerBoost"
                className="h-9 md:h-10 w-auto shrink-0 select-none"
                draggable={false}
              />
              <p className="text-base md:text-xl font-normal text-white whitespace-nowrap" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                careerboost.it
                <span className="mx-1.5 md:mx-2 text-cbsky-500/50 font-light">|</span>
                <span className="text-cbsky-400">Summit</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
              {/* Language choice for the whole Talent Pool (student + company areas, texts and emails) */}
              <div role="group" aria-label={tx("Language", "Lingua")} className="flex items-center rounded-full border border-cbsky-500/30 bg-cbslate-900/70 p-0.5">
                {(['it', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    aria-pressed={language === lang}
                    className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap tracking-wide transition-colors ${
                      language === lang
                        ? 'bg-cbsky-500 text-cbslate-950'
                        : 'text-cbsky-100/70 hover:text-cbsky-50'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="px-2 md:px-4 text-sm text-cbsky-100/70 hover:text-cbsky-50 hover:bg-white/5 border border-transparent hover:border-cbsky-500/20"
              >
                ←<span className="hidden sm:inline ml-1">{t('landing.nav.back')}</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div ref={containerRef} className="relative z-10 flex-1 min-h-0 flex flex-col justify-center container mx-auto px-4 md:px-6 py-3 md:py-4">
        {/* Hero Section */}
        <div className="text-center mb-3 md:mb-5">
          <div {...getItemProps(0)} className="inline-flex items-center gap-2 bg-cbslate-900/70 border border-cbsky-500/40 text-cbsky-100 px-3 py-1.5 rounded text-xs font-bold mb-2 md:mb-3 backdrop-blur-sm shadow-lg">
            <Shield className="h-3.5 w-3.5 text-cbsky-400" />
            {t('landing.hero.badge')}
          </div>

          <h1 {...getItemProps(1)} className="text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-white mb-2 px-4">
            <TypedHeadline
              prefix={tx('Connect talent and ', 'Connetti talento e ')}
              highlight={tx('opportunity', 'opportunità')}
            />
          </h1>
          <div {...getItemProps(2)} className="w-24 h-0.5 bg-gradient-to-r from-transparent via-cbsky-500 to-transparent mx-auto mb-2.5 md:mb-3"></div>

          {/* Reverse-model explainer: you don't apply — partner companies see your full
              profile (CV, cover letter, video) and choose you. Shown on mobile too. */}
          <div {...getItemProps(3)} className="max-w-2xl mx-auto">
            <p className="text-sm md:text-lg text-cbslate-100 leading-snug font-light px-2 drop-shadow-md">
              {tx("You don't apply — ", "Non ti candidi tu: ")}
              <span className="font-semibold text-white">
                {tx("companies choose you.", "sono le aziende a scegliere te.")}
              </span>
            </p>
            {/* What companies see of you — each chip opens an expert-service request */}
            <div className="mt-2.5 md:mt-3 flex items-center justify-center gap-2 md:gap-2.5 flex-wrap">
              {([
                {
                  icon: FileText,
                  label: 'CV',
                  service: 'cv' as const,
                  title: tx('Request an expert-written CV', 'Richiedi un CV scritto da un esperto'),
                  desc: tx(
                    'Leave your details: a CareerBoost expert will rewrite your CV with you. We will contact you shortly.',
                    'Lascia i tuoi dati: un esperto CareerBoost riscriverà il tuo CV insieme a te. Ti ricontatteremo a breve.'
                  ),
                },
                {
                  icon: Mail,
                  label: tx('Cover letter', 'Cover letter'),
                  service: 'cover' as const,
                  title: tx('Request an expert-written cover letter', 'Richiedi una cover letter scritta da un esperto'),
                  desc: tx(
                    'Leave your details: a CareerBoost expert will write your cover letter with you. We will contact you shortly.',
                    'Lascia i tuoi dati: un esperto CareerBoost scriverà la tua cover letter insieme a te. Ti ricontatteremo a breve.'
                  ),
                },
                {
                  icon: Video,
                  label: 'Video',
                  service: 'video' as const,
                  title: tx('Presentation video — get help', 'Video di presentazione — richiedi assistenza'),
                  desc: tx(
                    'Leave your details: the CareerBoost team will guide you on how to record your presentation video. We will contact you shortly.',
                    'Lascia i tuoi dati: il team CareerBoost ti guiderà su come realizzare il tuo video di presentazione. Ti ricontatteremo a breve.'
                  ),
                },
              ]).map(({ icon: Icon, label, service, title, desc }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => openService(service, title, desc)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cbsky-500/30 bg-cbslate-900/60 px-2.5 py-1 md:px-3 md:py-1.5 text-[11px] md:text-xs font-semibold text-cbsky-100 backdrop-blur-sm shadow-sm transition-colors hover:border-cbsky-400 hover:bg-cbsky-500/15 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5 text-cbsky-400" />
                  {label}
                </button>
              ))}
            </div>
            <p className="hidden sm:block mt-2 text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-cbslate-400/80">
              {tx('Tap to get it written by an expert', 'Tocca per farlo scrivere da un esperto')}
            </p>
          </div>
        </div>

        {/* Role Selection - Premium Cards */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-5xl">
            <h2 className="text-base md:text-2xl font-bold text-cbsky-50 text-center mb-2 md:mb-3 tracking-tight">
              {t('landing.roleSelection.title')}
            </h2>

            {/* Mobile: horizontal scroll — Student full, Company peeks in (sneak peek), swipe to reveal.
                sm+: standard 2-up grid. */}
            <div className="flex sm:grid sm:grid-cols-2 gap-4 md:gap-5 max-w-3xl mx-auto overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-hide pb-2">
              {/* Student Card */}
              <Card
                {...getItemProps(7)}
                className="group relative overflow-hidden shrink-0 w-[85%] sm:w-auto snap-start border border-cbslate-700/50 hover:border-cbsky-500/50 transition-all duration-500 cursor-pointer bg-cbslate-900/70 backdrop-blur-xl hover:shadow-2xl hover:shadow-cbsky-500/10 sm:hover:-translate-y-2 sm:hover:scale-105"
                onClick={() => handleRoleSelect('student')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cbsky-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative p-4">
                  <div className="mb-2 flex justify-center">
                    <div className="h-12 w-12 rounded bg-gradient-to-br from-cbslate-700 to-cbslate-800 border border-cbsky-500/20 flex items-center justify-center shadow-xl shadow-cbsky-500/10 group-hover:scale-105 transition-transform duration-500">
                      <Users className="h-6 w-6 text-cbsky-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-cbsky-50 text-center mb-2 tracking-tight">
                    {t('landing.roleSelection.student.title')}
                  </h3>
                  <p className="hidden sm:block text-cbslate-400 text-center mb-3 text-xs leading-relaxed">
                    {t('landing.roleSelection.student.description')}
                  </p>
                  <Button className="w-full bg-cbslate-800 hover:bg-cbslate-700 border border-cbsky-500/30 hover:border-cbsky-500/50 text-cbsky-100 shadow-lg font-bold text-sm tracking-wide">
                    Log in
                  </Button>
                </div>
              </Card>

              {/* Company Card — peeks in from the right edge on mobile */}
              <Card
                {...getItemProps(8)}
                className="group relative overflow-hidden shrink-0 w-[85%] sm:w-auto snap-start border border-cbslate-700/50 hover:border-cbind-500/50 transition-all duration-500 cursor-pointer bg-cbslate-900/70 backdrop-blur-xl hover:shadow-2xl hover:shadow-cbind-500/10 sm:hover:-translate-y-2 sm:hover:scale-105"
                onClick={() => handleRoleSelect('company')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cbind-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative p-4">
                  <div className="mb-2 flex justify-center">
                    <div className="h-12 w-12 rounded bg-gradient-to-br from-cbind-600 to-cbind-700 border border-cbind-400/20 flex items-center justify-center shadow-xl shadow-cbind-500/20 group-hover:scale-105 transition-transform duration-500">
                      <Building className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-cbsky-50 text-center mb-2 tracking-tight">
                    {t('landing.roleSelection.company.title')}
                  </h3>
                  <p className="hidden sm:block text-cbslate-400 text-center mb-3 text-xs leading-relaxed">
                    {t('landing.roleSelection.company.description')}
                  </p>
                  <Button className="w-full bg-gradient-to-r from-cbind-600 to-cbind-700 hover:from-cbind-700 hover:to-cbind-800 text-white shadow-lg font-bold text-sm tracking-wide">
                    Log in
                  </Button>
                </div>
              </Card>
            </div>

            {/* Discreet admin access (CareerBoost team) */}
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => navigate('/talent-pool/admin')}
                className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cbslate-500/80 transition-colors hover:text-cbsky-400"
                aria-label="Admin access"
              >
                CPA
              </button>
            </div>

            {/* Black & white partner / destination logo marquee */}
            <TrustedLogos label={tx('Our network', 'Il nostro network')} />
          </div>

        </div>
      </div>

      {/* Expert-service request dialog (CV / Cover letter / Video) */}
      <Dialog open={!!serviceTarget} onOpenChange={(o) => { if (!o) setServiceTarget(null); }}>
        <DialogContent className="max-w-md tp-cb-portal">
          {serviceState === 'sent' ? (
            <div className="space-y-4 py-2 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <DialogTitle>{tx('Request received', 'Richiesta ricevuta')}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {tx(
                  'Thank you! The CareerBoost team will contact you shortly using the details you provided. We have also sent you a confirmation email.',
                  'Grazie! Il team di CareerBoost ti ricontatterà a breve ai dati che ci hai inviato. Ti abbiamo anche inviato un\'email di conferma.'
                )}
              </p>
              <Button className="w-full rounded-full" onClick={() => setServiceTarget(null)}>
                {tx('Close', 'Chiudi')}
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{serviceTarget?.title}</DialogTitle>
                <DialogDescription>{serviceTarget?.desc}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{tx('First name', 'Nome')}</label>
                  <Input value={serviceForm.firstName} onChange={(e) => setServiceForm({ ...serviceForm, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{tx('Last name', 'Cognome')}</label>
                  <Input value={serviceForm.lastName} onChange={(e) => setServiceForm({ ...serviceForm, lastName: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium">Email</label>
                  <Input type="email" value={serviceForm.email} onChange={(e) => setServiceForm({ ...serviceForm, email: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium">{tx('WhatsApp number', 'Numero WhatsApp')}</label>
                  <Input type="tel" placeholder="+39 333 123 4567" value={serviceForm.whatsapp} onChange={(e) => setServiceForm({ ...serviceForm, whatsapp: e.target.value })} />
                </div>
              </div>
              {serviceState === 'error' && (
                <p className="text-xs text-destructive">
                  {tx('Something went wrong. Please try again or write to info@careerboost.it.', 'Qualcosa è andato storto. Riprova o scrivi a info@careerboost.it.')}
                </p>
              )}
              <Button
                className="w-full rounded-full"
                onClick={sendService}
                disabled={
                  serviceState === 'sending' ||
                  !serviceForm.firstName.trim() || !serviceForm.lastName.trim() ||
                  !serviceForm.email.trim() || !serviceForm.whatsapp.trim()
                }
              >
                <Send className="mr-2 h-4 w-4" />
                {serviceState === 'sending' ? tx('Sending…', 'Invio in corso…') : tx('Send request', 'Invia richiesta')}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer - Elegant */}
      <footer className="relative z-20 border-t border-cbsky-500/20 bg-cbslate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-cbslate-400">
              <a href="/terms" className="hover:text-cbsky-400 transition-colors font-medium">
                {t('landing.footer.terms')}
              </a>
              <span className="text-cbslate-600">•</span>
              <a href="/privacy" className="hover:text-cbsky-400 transition-colors font-medium">
                {t('landing.footer.privacy')}
              </a>
              <span className="text-cbslate-600">•</span>
              <a href="mailto:info@careerboost.it" className="hover:text-cbsky-400 transition-colors font-medium">
                info@careerboost.it
              </a>
              <span className="text-cbslate-600">•</span>
              <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer" className="hover:text-cbsky-400 transition-colors font-medium flex items-center gap-1">
                <span>📱 {tx("WhatsApp Support", "Assistenza WhatsApp")}</span>
              </a>
            </div>
            <p className="text-[10px] text-cbslate-500 font-light tracking-wide">
              {t('landing.footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const TalentPool = () => {
  return (
    <TalentPoolLanguageProvider>
      <TalentPoolContent />
    </TalentPoolLanguageProvider>
  );
};

export default TalentPool;