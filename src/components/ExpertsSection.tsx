import { useEffect, useState } from "react";
import LogoMarquee, { type MarqueeItem } from "./LogoMarquee";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { supabase } from "@/integrations/supabase/client";
import { universities, companies } from "@/data/coveredLogos";

const ExpertsSection = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [associates, setAssociates] = useState<MarqueeItem[]>([]);

  const titleAnim = useScrollAnimation({ animationClass: "animate-fade-up", delay: 100 });
  const uniAnim = useScrollAnimation({ animationClass: "animate-fade-up", delay: 150 });
  const compAnim = useScrollAnimation({ animationClass: "animate-fade-up", delay: 200 });
  const assocAnim = useScrollAnimation({ animationClass: "animate-fade-up", delay: 250 });

  useEffect(() => {
    const fetchAssociates = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, photo_url, sector")
        .eq("role", "ASSOCIATE")
        .eq("status", "approved")
        .not("photo_url", "is", null);

      if (error || !data) return;

      const items: MarqueeItem[] = data
        .filter((p: any) => p.photo_url && p.photo_url.trim() !== "")
        .map((p: any) => ({
          name: `${(p.first_name || "").trim()} ${(p.last_name || "").trim()}`.trim(),
          logo: p.photo_url as string,
          subtitle: (p.sector || "").trim() || undefined,
        }))
        .filter((p) => p.name.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setAssociates(items);
    };
    fetchAssociates();
  }, []);

  return (
    <section className="py-12 md:py-20 bg-runway-gray">
      <div className="container mx-auto px-4">
        <div ref={titleAnim.ref} className={`text-center mb-10 md:mb-14 ${titleAnim.className}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4 md:mb-6">
            {t.experts.title}
          </h2>
          <p className="text-base md:text-xl text-steel-gray max-w-4xl mx-auto leading-relaxed mb-6 md:mb-8 px-2">
            {t.experts.subtitle}
          </p>
          <div className="w-16 md:w-24 h-1 bg-gradient-sky mx-auto" />
        </div>

        {/* Universities */}
        <div ref={uniAnim.ref} className={`mb-10 md:mb-14 ${uniAnim.className}`} id="universita-provenienza">
          <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
            <h3 className="text-xl md:text-2xl font-bold text-primary">{t.experts.universities}</h3>
            <span className="text-xs md:text-sm text-muted-foreground font-medium">
              {universities.length}+
            </span>
          </div>
          <LogoMarquee items={universities} speed={60} variant="logo" />
        </div>

        {/* Companies */}
        <div ref={compAnim.ref} className={`mb-10 md:mb-14 ${compAnim.className}`} id="aziende-esperienza">
          <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
            <h3 className="text-xl md:text-2xl font-bold text-primary">{t.experts.companies}</h3>
            <span className="text-xs md:text-sm text-muted-foreground font-medium">
              {companies.length}+
            </span>
          </div>
          <LogoMarquee items={companies} speed={55} reverse variant="logo" />
        </div>

        {/* Associates */}
        <div ref={assocAnim.ref} className={assocAnim.className} id="our-associates">
          <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
            <h3 className="text-xl md:text-2xl font-bold text-primary">{t.experts.associates}</h3>
            {associates.length > 0 && (
              <span className="text-xs md:text-sm text-muted-foreground font-medium">
                {associates.length}+
              </span>
            )}
          </div>
          {associates.length > 0 ? (
            <LogoMarquee items={associates} speed={70} variant="portrait" />
          ) : (
            <div className="flex gap-4 md:gap-6 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[160px] md:w-[200px] rounded-2xl border border-border/40 bg-card overflow-hidden animate-pulse"
                >
                  <div className="w-full aspect-[4/5] bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4 mx-auto" />
                    <div className="h-2 bg-muted rounded w-1/2 mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ExpertsSection;
