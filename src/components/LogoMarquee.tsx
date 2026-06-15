import { useMemo } from "react";

export interface MarqueeItem {
  name: string;
  logo: string;
  subtitle?: string;
}

interface LogoMarqueeProps {
  items: MarqueeItem[];
  speed?: number; // seconds for one loop
  reverse?: boolean;
  variant?: "logo" | "portrait";
}

/**
 * Seamless infinite horizontal marquee.
 * Triples the items so the -33.333% translate keyframe loops without jumps.
 */
const LogoMarquee = ({
  items,
  speed = 40,
  reverse = false,
  variant = "logo",
}: LogoMarqueeProps) => {
  const loopItems = useMemo(() => [...items, ...items, ...items], [items]);

  if (items.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden group">
      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 md:w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 md:w-24 bg-gradient-to-l from-background to-transparent z-10" />

      <div
        className="flex gap-4 md:gap-6 animate-scroll-carousel group-hover:[animation-play-state:paused] w-max"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {loopItems.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className={
              variant === "portrait"
                ? "flex-shrink-0 flex flex-col bg-card rounded-2xl border border-border/40 shadow-md hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 w-[160px] md:w-[200px] overflow-hidden"
                : "flex-shrink-0 flex flex-col items-center justify-center bg-card rounded-xl border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 w-[120px] md:w-[150px] h-[110px] md:h-[130px] p-3 md:p-4"
            }
          >
            {variant === "portrait" ? (
              <>
                <div className="relative w-full aspect-[4/5] overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                  <img
                    src={item.logo}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/90 to-transparent" />
                </div>
                <div className="px-3 py-3 w-full text-center bg-card">
                  <p className="text-sm md:text-[15px] font-bold text-primary leading-tight line-clamp-1">
                    {item.name}
                  </p>
                  {item.subtitle && (
                    <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight line-clamp-1 mt-1 uppercase tracking-wide">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 w-full flex items-center justify-center mb-2">
                  <img
                    src={item.logo}
                    alt={`${item.name} logo`}
                    loading="lazy"
                    className="max-h-[55px] md:max-h-[70px] max-w-full object-contain"
                  />
                </div>
                <p className="text-[10px] md:text-xs text-center text-muted-foreground font-medium leading-tight line-clamp-2">
                  {item.name}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogoMarquee;
