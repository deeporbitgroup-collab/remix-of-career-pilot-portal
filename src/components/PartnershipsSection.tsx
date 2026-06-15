import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const PartnershipsSection = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const { language } = useLanguage();
  const t = translations[language];
  
  // Scroll animations
  const titleAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 100 });
  const carouselAnimation = useScrollAnimation({ animationClass: 'animate-scale-up', delay: 200 });
  const benefitsAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 300 });

  const partnerships = [
    {
      name: "CareerBoost",
      logo: "/lovable-uploads/21bfcf0d-9e21-47fa-8c78-4f617ce0f8f9.png",
      translationKey: 'careerBoost' as const,
      color: "from-primary to-primary-light"
    },
    {
      name: "Alpha Test",
      logo: "/lovable-uploads/fc76acb0-80ad-4df5-a9c2-f8182b9512c0.png",
      translationKey: 'alphaTest' as const,
      color: "from-sky-blue to-secondary"
    },
    {
      name: "Astra Network",
      logo: "/lovable-uploads/263cca68-108a-4d1e-a97f-6baea557b69d.png",
      translationKey: 'astra' as const,
      color: "from-secondary to-accent"
    },
    {
      name: "LanguageBoost",
      logo: "/lovable-uploads/93f6b7f1-52a9-4366-8ca1-0704791a269e.png",
      translationKey: 'languageBoost' as const,
      color: "from-accent to-primary"
    },
    {
      name: "PrepScholar",
      logo: "/lovable-uploads/a632dfab-ff19-4aed-a581-9b6b885a5b48.png",
      translationKey: 'prepScholar' as const,
      color: "from-primary to-secondary"
    },
    {
      name: "Talflow.ai",
      logo: "/lovable-uploads/72e20d3a-ce5f-453c-8561-4d7e39e3d3df.png",
      translationKey: 'talflow' as const,
      color: "from-sky-blue to-primary"
    },
    {
      name: "Qora AI",
      logo: "/lovable-uploads/e49b4817-aef6-4f9b-b693-d089fe82a4fc.png",
      translationKey: 'qora' as const,
      color: "from-primary-light to-sky-blue"
    }
  ];

  useEffect(() => {
    if (!api) {
      return;
    }
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <section className="py-10 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div ref={titleAnimation.ref} className={`text-center mb-6 md:mb-16 ${titleAnimation.className}`}>
          <h2 className="text-[26px] md:text-4xl lg:text-5xl font-bold text-primary mb-2 md:mb-6 tracking-tight leading-tight">
            {t.partnerships.title}
          </h2>
          <p className="text-[14px] md:text-xl text-steel-gray max-w-3xl mx-auto mb-3 md:mb-8 px-2 leading-relaxed">
            {t.partnerships.subtitle}
          </p>
          <div className="w-12 md:w-24 h-1 bg-gradient-sky mx-auto rounded-full"></div>
        </div>

        {/* ===== MOBILE: Ecosystem grid ===== */}
        <div className="md:hidden">
          <div className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/5 rounded-2xl border border-primary/10 p-4">
            {/* Centerpiece */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-sky flex items-center justify-center shadow-lg mb-2">
                <span className="text-white font-extrabold text-[11px] text-center leading-tight px-1">Career<br/>Pilot</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {language === 'it' ? 'Ecosistema Partner' : 'Partner Ecosystem'}
              </p>
            </div>

            {/* Partner logo grid */}
            <div className="grid grid-cols-3 gap-2">
              {partnerships.map((partner) => {
                const partnerData = t.partnerships.partners[partner.translationKey];
                return (
                  <div
                    key={partner.name}
                    className="flex flex-col items-center bg-white rounded-xl border border-border/50 p-2 hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 flex items-center justify-center mb-1.5">
                      <img
                        src={partner.logo}
                        alt={`${partner.name} logo`}
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-primary text-center leading-tight line-clamp-1 w-full">
                      {partner.name}
                    </span>
                    <span className="text-[8px] text-muted-foreground text-center leading-tight mt-0.5 line-clamp-2">
                      {partnerData.services?.[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compact "Why partnerships matter" */}
          <div className="mt-5 bg-gradient-sky rounded-2xl p-4 text-white">
            <h3 className="text-[15px] font-bold mb-3 text-center">
              {t.partnerships.benefits.title}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center text-center">
                <div className="text-xl font-extrabold mb-0.5">360°</div>
                <p className="text-[10px] opacity-95 leading-tight">{t.partnerships.benefits.comprehensive}</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="text-xl mb-0.5">🎯</div>
                <p className="text-[10px] opacity-95 leading-tight">{t.partnerships.benefits.exclusive}</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="text-xl mb-0.5">⭐</div>
                <p className="text-[10px] opacity-95 leading-tight">{t.partnerships.benefits.elite}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== DESKTOP: original carousel ===== */}
        <div ref={carouselAnimation.ref} className={`hidden md:block ${carouselAnimation.className}`}>
          <Carousel
            opts={{
              align: "start",
              loop: true
            }}
            setApi={setApi}
            className="w-full relative"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {partnerships.map((partner, index) => {
                const needsLargerLogo = ['Qora AI', 'PrepScholar', 'CareerBoost'].includes(partner.name);
                const logoSize = needsLargerLogo ? 'w-24 h-24' : 'w-20 h-20';
                const partnerData = t.partnerships.partners[partner.translationKey];

                return (
                  <CarouselItem key={index} className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                    <Card className="bg-gradient-card shadow-card-custom hover:shadow-hover-custom transition-all duration-500 transform hover:-translate-y-3 group h-full flex flex-col">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="h-24 w-24 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0 flex items-center justify-center bg-white rounded-lg p-2">
                          <img
                            src={partner.logo}
                            alt={`${partner.name} logo`}
                            className={`${logoSize} object-contain`}
                          />
                        </div>

                        <h3 className="text-lg font-bold text-primary text-center mb-3 flex-shrink-0">
                          {partner.name}
                        </h3>

                        <p className="text-steel-gray text-center mb-4 leading-relaxed text-sm flex-shrink-0 line-clamp-3">
                          {partnerData.description}
                        </p>

                        <div className="flex-grow flex flex-col justify-end">
                          <h4 className="font-semibold text-primary text-center mb-3 text-sm">
                            {language === 'it' ? 'Servizi Offerti:' : 'Services Offered:'}
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {partnerData.services.map((service: string, serviceIndex: number) => (
                              <div key={serviceIndex} className="bg-runway-gray px-3 py-2 rounded-lg text-center">
                                <span className="text-xs font-medium text-steel-gray leading-tight block">{service}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="left-2 md:-left-12 bg-primary hover:bg-primary/80 border-0 text-white w-[40px] h-[40px] md:w-[45px] md:h-[45px] rounded-full shadow-lg transition-all duration-200" />
            <CarouselNext className="right-2 md:-right-12 bg-primary hover:bg-primary/80 border-0 text-white w-[40px] h-[40px] md:w-[45px] md:h-[45px] rounded-full shadow-lg transition-all duration-200" />
          </Carousel>

          {/* Dot indicators */}
          <div className="flex justify-center items-center gap-2 mt-6">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 w-2 rounded-full transition-all duration-200 ${
                  current === index + 1
                    ? "bg-primary w-6"
                    : "bg-primary/30 hover:bg-primary/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Partnership Benefits */}
          <div ref={benefitsAnimation.ref} className={`mt-16 bg-gradient-sky rounded-2xl p-8 md:p-12 text-white text-center ${benefitsAnimation.className}`}>
            <h3 className="text-2xl md:text-3xl font-bold mb-6">
              {t.partnerships.benefits.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <div className="text-3xl md:text-4xl font-bold mb-2">360°</div>
                <p className="text-lg opacity-90">{t.partnerships.benefits.comprehensive}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl md:text-4xl font-bold mb-2">🎯<span className="text-2xl md:text-3xl">🌟</span></div>
                <p className="text-lg opacity-90">{t.partnerships.benefits.exclusive}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl md:text-4xl font-bold mb-2">⭐</div>
                <p className="text-lg opacity-90">{t.partnerships.benefits.elite}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnershipsSection;
