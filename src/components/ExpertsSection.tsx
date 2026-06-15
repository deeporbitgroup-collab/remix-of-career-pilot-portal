import { useEffect, useState } from "react";
import LogoMarquee, { type MarqueeItem } from "./LogoMarquee";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { supabase } from "@/integrations/supabase/client";

// University logos
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

// Company logos
import goldmanSachsLogo from "@/assets/logos/companies/goldmansachs.svg";
import pwcLogo from "@/assets/logos/companies/pwc.svg";
import accentureLogo from "@/assets/logos/companies/accenture.svg";

const universities: MarqueeItem[] = [
  { name: "London Business School", logo: lbsLogo },
  { name: "Loughborough University", logo: loughboroughLogo },
  { name: "Imperial College London", logo: "/lovable-uploads/abd9e3ae-445f-4395-a161-828d261180d5.png" },
  { name: "Warwick", logo: "/lovable-uploads/f5bab727-0e8d-4e85-b4a0-e2265c940b44.png" },
  { name: "LSE", logo: lseLogo },
  { name: "UCL", logo: "/lovable-uploads/a3a65cce-920d-4d5f-a07f-3852e670f218.png" },
  { name: "King's College London", logo: "/lovable-uploads/b092105d-cd93-4fe9-8a46-8c6aae273974.png" },
  { name: "Bocconi", logo: "/lovable-uploads/ac9db681-a9c1-4b64-aeb6-c8349e12d4df.png" },
  { name: "Humanitas", logo: "/lovable-uploads/3820be9d-62de-4f91-8bdf-806f1be0820b.png" },
  { name: "UniMi", logo: "/lovable-uploads/614e3783-d6e4-469c-a29a-44cd6a675e9b.png" },
  { name: "Università Cattolica", logo: "/lovable-uploads/798f4836-a405-432f-b30e-85c641b9ddc2.png" },
  { name: "San Raffaele", logo: "/lovable-uploads/ee39ba56-571f-4487-b062-e7f47c86049e.png" },
  { name: "LUISS", logo: "/lovable-uploads/9a20adc4-2949-49ac-a0fe-5f62cd672130.png" },
  { name: "IULM", logo: "/lovable-uploads/c8c5c1eb-3377-44e2-80e1-92e93d45cff7.png" },
  { name: "Politecnico di Milano", logo: polimiLogo },
  { name: "EDHEC", logo: edhecLogo },
  { name: "HEC", logo: hecLogo },
  { name: "ESCP", logo: "/lovable-uploads/706f1c02-68e6-4c43-b7e7-382f5c0fcf21.png" },
  { name: "Skema Business School", logo: skemaLogo },
  { name: "Université de Genève", logo: unigeLogo },
  { name: "EPFL", logo: epflLogo },
  { name: "ETH Zurich", logo: ethLogo },
  { name: "Nova SBE", logo: novaLogo },
  { name: "IE University", logo: "/lovable-uploads/b558e760-c4fe-473d-b617-4647543162e1.png" },
  { name: "ESADE", logo: "/lovable-uploads/64c45b20-1abb-43f9-9f99-537984a912a2.png" },
  { name: "WU Vienna", logo: "/lovable-uploads/2809747a-dd60-4e44-a797-e638fce59f33.png" },
  { name: "Maastricht University", logo: "/lovable-uploads/88eb200b-2525-474e-a7ca-0d2382920415.png" },
  { name: "MIT", logo: mitLogo },
  { name: "Baruch College", logo: baruchLogo },
  { name: "Hult", logo: hultLogo },
  { name: "Columbia University", logo: "/lovable-uploads/6fe4258c-5bbd-4350-8985-fcf5f750d073.png" },
  { name: "Lehigh University", logo: "/lovable-uploads/51a0b707-e10d-42a8-9151-51942690bb3a.png" },
];

const companies: MarqueeItem[] = [
  { name: "Accenture", logo: accentureLogo },
  { name: "Andera Partners", logo: "/lovable-uploads/fe4f3718-b953-4b1b-abb9-3d991c4aad68.png" },
  { name: "Ardian", logo: "/lovable-uploads/f35ff84b-aa23-4215-bdb6-b2eee981d19d.png" },
  { name: "Azimut", logo: "/lovable-uploads/5baf4fda-9830-4a0a-8051-373b6a4cf586.png" },
  { name: "Bain & Company", logo: "/lovable-uploads/0e4975bf-4377-465f-ac09-5e6b919b9492.png" },
  { name: "Black Oak Monaco", logo: "/lovable-uploads/ca13f012-ed00-43a0-8106-766f6826c2e6.png" },
  { name: "Cyrus Capital", logo: "/lovable-uploads/6a530717-c46d-4b95-acbf-7d7d2d879d9a.png" },
  { name: "DE Shaw & Co", logo: "/lovable-uploads/711ef473-ffa9-4c45-9fbf-7375292f5889.png" },
  { name: "Deloitte", logo: "/lovable-uploads/749dcf02-c577-4215-be87-6b1e1ea18e2c.png" },
  { name: "Dentons", logo: "/lovable-uploads/d0937013-337a-4fc7-b5b0-0ed692a9dadb.png" },
  { name: "Deutsche Bank", logo: "/lovable-uploads/ee500a74-0f1e-4668-bd42-42fbd52b3c46.png" },
  { name: "Dräger", logo: "/lovable-uploads/c2528802-824c-44cf-868b-06697a4dd855.png" },
  { name: "DVR Capital", logo: "/lovable-uploads/6a7bd8cf-b25d-4d0a-9d5c-f949972f8f88.png" },
  { name: "Euronext", logo: "/lovable-uploads/383aefac-0f37-4026-b4f8-6bce926dc51c.png" },
  { name: "EY", logo: "/lovable-uploads/817ea876-77fb-474c-b52c-c24d873a209f.png" },
  { name: "Fante Group", logo: "/lovable-uploads/76b9c35d-0d2f-444d-bfef-2d028fe12736.png" },
  { name: "Forbes", logo: "/lovable-uploads/a848eac2-b8a2-4a11-9006-2f91a63c3b7f.png" },
  { name: "Goldman Sachs", logo: goldmanSachsLogo },
  { name: "J.P. Morgan", logo: "/lovable-uploads/3fd97059-2d60-4b9e-b3c2-4168cbac9e0c.png" },
  { name: "L'Oréal", logo: "/lovable-uploads/4315887b-4575-423d-b3e1-a7942c40413a.png" },
  { name: "LVMH", logo: "/lovable-uploads/bf21715d-4049-4f6c-877a-3a3308f2e60e.png" },
  { name: "Morgan Stanley", logo: "/lovable-uploads/7aa27155-e749-461b-8b98-8a5a76908240.png" },
  { name: "Penkhas", logo: "/lovable-uploads/7b2f42d4-26bb-419b-9f78-a4c25c8fa570.png" },
  { name: "PwC", logo: pwcLogo },
  { name: "Raymond James", logo: "/lovable-uploads/97b0a7bc-a22e-4509-8c1e-7297c70fa63a.png" },
  { name: "Rothschild & Co", logo: "/lovable-uploads/6f258e84-ca20-498a-8bd3-5dfdb3e63bc5.png" },
  { name: "The European House – Ambrosetti", logo: "/lovable-uploads/0dd53baf-05cf-4090-adf7-606e522feeeb.png" },
  { name: "Yard Reaas", logo: "/lovable-uploads/72cef745-3049-4379-b8e2-6b3a2a34fd45.png" },
];

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
