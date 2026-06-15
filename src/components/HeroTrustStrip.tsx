import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface Associate {
  first_name: string;
  last_name: string;
  photo_url: string;
}

interface University {
  name: string;
  logo: string;
}

interface HeroTrustStripProps {
  associates: Associate[];
  universities: University[];
  companies: University[];
}

const HeroTrustStrip = ({ associates, universities, companies }: HeroTrustStripProps) => {
  const { language } = useLanguage();

  // Take a curated subset for a discreet display
  const displayAssociates = associates.slice(0, 7);
  const displayLogos = [...universities.slice(0, 6), ...companies.slice(0, 4)];

  return (
    <div className="w-full max-w-3xl 2xl:max-w-5xl mx-auto flex flex-col items-center gap-1.5 md:gap-2 2xl:gap-3 opacity-90 hover:opacity-100 transition-opacity duration-300">
      {/* Associates avatars row */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex -space-x-1.5 md:-space-x-2 2xl:-space-x-3">
          {displayAssociates.map((associate, idx) => (
            <Avatar
              key={`${associate.first_name}-${idx}`}
              className="h-5 w-5 md:h-9 md:w-9 2xl:h-11 2xl:w-11 ring-1 md:ring-2 ring-background shadow-sm hover:scale-110 hover:z-10 transition-transform duration-200"
            >
              <AvatarImage
                src={associate.photo_url}
                alt={`${associate.first_name} ${associate.last_name}`}
                className="object-cover"
              />
              <AvatarFallback className="text-[7px] md:text-xs 2xl:text-sm bg-muted text-muted-foreground">
                {associate.first_name.charAt(0)}
                {associate.last_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span className="text-[8px] md:text-sm 2xl:text-base text-muted-foreground/80 font-medium tracking-wide">
          {language === "it"
            ? "Associate verificati • Top università & aziende"
            : "Verified associates • Top universities & companies"}
        </span>
      </div>

      {/* Universities & companies logos - subtle marquee */}
      <div className="relative w-full max-w-md md:max-w-2xl 2xl:max-w-3xl overflow-hidden">
        {/* Side fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />

        <div
          className="flex gap-4 md:gap-6 2xl:gap-8 animate-scroll-carousel py-0.5 md:py-1"
          style={{ animationDuration: "40s", width: "max-content" }}
        >
          {[...displayLogos, ...displayLogos, ...displayLogos].map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="flex-shrink-0 flex items-center justify-center h-5 md:h-8 2xl:h-10"
              title={item.name}
            >
              <img
                src={item.logo}
                alt={item.name}
                className="h-full w-auto max-w-[40px] md:max-w-[64px] 2xl:max-w-[80px] object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroTrustStrip;
