import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Users, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TalentPoolLanguageProvider, useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";
import { useStaggeredAnimation } from "@/hooks/useScrollAnimation";
import londonCityBg from "@/assets/london-city.jpg";
import careerPilotLogo from "@/assets/career-pilot-logo.png";

const TalentPoolContent = () => {
  const navigate = useNavigate();
  const { t, setLanguage } = useTalentPoolLanguage();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { containerRef, getItemProps } = useStaggeredAnimation(100);

  // Force English — Talent Pool landing is English-only
  useEffect(() => {
    setLanguage('en');
  }, [setLanguage]);

  const handleRoleSelect = (role: 'student' | 'company') => {
    setSelectedRole(role);
    navigate(`/talent-pool/${role}`);
  };

  return (
    <div className="min-h-[100svh] md:h-[100svh] md:overflow-hidden relative flex flex-col animate-fade-in">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 animate-scale-in"
        style={{
          backgroundImage: `url(${londonCityBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-slate-950/90 backdrop-blur-[2px] animate-fade-in" />
      
      {/* Navigation Bar - Elegant */}
      <nav className="relative z-20 border-b border-sky-500/20 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-gradient-to-br from-sky-500 to-sky-600 rounded flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Building className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-sky-50 tracking-tight">{t('landing.nav.title')}</h2>
                <p className="text-[10px] text-sky-500/90 font-semibold tracking-widest">{t('landing.nav.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-sm text-sky-100/70 hover:text-sky-50 hover:bg-white/5 border border-transparent hover:border-sky-500/20"
              >
                ← {t('landing.nav.back')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div ref={containerRef} className="relative z-10 flex-1 md:min-h-0 flex flex-col justify-center container mx-auto px-4 md:px-6 py-6 md:py-4">
        {/* Hero Section */}
        <div className="text-center mb-5 md:mb-6">
          <div {...getItemProps(0)} className="inline-flex items-center gap-2 bg-slate-900/70 border border-sky-500/40 text-sky-100 px-4 py-2 rounded text-xs font-bold mb-4 backdrop-blur-sm shadow-lg">
            <Shield className="h-3.5 w-3.5 text-sky-400" />
            {t('landing.hero.badge')}
          </div>
          
          <h1 {...getItemProps(1)} className="text-2xl md:text-3xl lg:text-4xl font-bold text-sky-50 mb-2 tracking-tight drop-shadow-lg px-4">
            {t('landing.hero.title')}
          </h1>
          <div {...getItemProps(2)} className="w-24 h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent mx-auto mb-3"></div>
          <p {...getItemProps(3)} className="text-sm text-slate-200 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-md">
            {t('landing.hero.subtitle')}
          </p>
          <p {...getItemProps(4)} className="text-xs text-sky-300 mt-2 font-semibold">
            {t('landing.hero.limited')}
          </p>
        </div>
        
        {/* Value Proposition - Elite Style (desktop only; mobile keeps the screen to the access cards) */}
        <div className="hidden md:grid md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-6">
          <div {...getItemProps(5)} className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-5 backdrop-blur-md hover:border-emerald-500/50 transition-all shadow-lg">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <Building className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sky-50 text-base mb-1 tracking-tight">
                  {t('landing.values.companies.title')}
                </h3>
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                  {t('landing.values.companies.description')}
                </p>
                <span className="inline-block px-3 py-1 bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 rounded text-[11px] font-bold tracking-wide">
                  {t('landing.values.companies.badge')}
                </span>
              </div>
            </div>
          </div>
          
          <div {...getItemProps(6)} className="bg-slate-900/50 border border-sky-500/30 rounded-lg p-5 backdrop-blur-md hover:border-sky-500/50 transition-all shadow-lg">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sky-50 text-base mb-1 tracking-tight">
                  {t('landing.values.students.title')}
                </h3>
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                  {t('landing.values.students.description')}
                </p>
                <span className="inline-block px-3 py-1 bg-sky-950/50 border border-sky-500/40 text-sky-400 rounded text-[11px] font-bold tracking-wide">
                  {t('landing.values.students.pricing')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Role Selection - Premium Cards */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-5xl">
            <h2 className="text-lg md:text-2xl font-bold text-sky-50 text-center mb-3 md:mb-4 tracking-tight">
              {t('landing.roleSelection.title')}
            </h2>

            {/* Desktop: 2-up grid. Mobile: two cards side by side or stacked. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-w-3xl mx-auto">
              {/* Student Card */}
              <Card 
                {...getItemProps(7)}
                className="group relative overflow-hidden border border-slate-700/50 hover:border-sky-500/50 transition-all duration-500 cursor-pointer bg-slate-900/70 backdrop-blur-xl hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-2 hover:scale-105"
                onClick={() => handleRoleSelect('student')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative p-5">
                  <div className="mb-3 flex justify-center">
                    <div className="h-16 w-16 rounded bg-gradient-to-br from-slate-700 to-slate-800 border border-sky-500/20 flex items-center justify-center shadow-xl shadow-sky-500/10 group-hover:scale-105 transition-transform duration-500">
                      <Users className="h-8 w-8 text-sky-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-sky-50 text-center mb-2 tracking-tight">
                    {t('landing.roleSelection.student.title')}
                  </h3>
                  <p className="text-slate-400 text-center mb-4 text-xs leading-relaxed">
                    {t('landing.roleSelection.student.description')}
                  </p>
                  <Button className="w-full bg-slate-800 hover:bg-slate-700 border border-sky-500/30 hover:border-sky-500/50 text-sky-100 shadow-lg font-bold text-sm tracking-wide">
                    {t('landing.roleSelection.student.button')}
                  </Button>
                </div>
              </Card>

              {/* Company Card */}
              <Card 
                {...getItemProps(8)}
                className="group relative overflow-hidden border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-500 cursor-pointer bg-slate-900/70 backdrop-blur-xl hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 hover:scale-105"
                onClick={() => handleRoleSelect('company')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative p-5">
                  <div className="mb-3 flex justify-center">
                    <div className="h-16 w-16 rounded bg-gradient-to-br from-emerald-600 to-emerald-700 border border-emerald-400/20 flex items-center justify-center shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-500">
                      <Building className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-sky-50 text-center mb-2 tracking-tight">
                    {t('landing.roleSelection.company.title')}
                  </h3>
                  <p className="text-slate-400 text-center mb-4 text-xs leading-relaxed">
                    {t('landing.roleSelection.company.description')}
                  </p>
                  <Button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg font-bold text-sm tracking-wide">
                    {t('landing.roleSelection.company.button')}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Elegant */}
      <footer className="relative z-20 border-t border-sky-500/20 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <a href="/terms" className="hover:text-sky-400 transition-colors font-medium">
                {t('landing.footer.terms')}
              </a>
              <span className="text-slate-600">•</span>
              <a href="/privacy" className="hover:text-sky-400 transition-colors font-medium">
                {t('landing.footer.privacy')}
              </a>
              <span className="text-slate-600">•</span>
              <a href="mailto:Careerpilot2025@gmail.com" className="hover:text-sky-400 transition-colors font-medium">
                Careerpilot2025@gmail.com
              </a>
              <span className="text-slate-600">•</span>
              <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors font-medium flex items-center gap-1">
                <span>📱 WhatsApp Support</span>
              </a>
            </div>
            <p className="text-[10px] text-slate-500 font-light tracking-wide">
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