import { GraduationCap, Building2 } from "lucide-react";
import { type MarqueeItem } from "@/components/LogoMarquee";
import { universities, companies } from "@/data/coveredLogos";

interface CoveredLogosProps {
  /** Which roster to show: universities (Take Off / Summit / Layover) or companies (Altitude). */
  kind: "universities" | "companies";
}

/**
 * Two stacked marquee rows inside the package card: the covered universities (or
 * companies for Altitude) scrolling left on an infinite loop. Uniform tile sizing
 * + edge fades keep it tidy and on-brand, supporting — not overpowering — the
 * package name, price and bullet list above.
 */
const CoveredLogos = ({ kind }: CoveredLogosProps) => {
  const items: MarqueeItem[] = kind === "companies" ? companies : universities;
  const Icon = kind === "companies" ? Building2 : GraduationCap;
  const label = kind === "companies" ? "Companies our mentors come from" : "Universities you can target";

  // Split the roster across the two rows so they show different logos.
  const mid = Math.ceil(items.length / 2);
  const rows: MarqueeItem[][] = [items.slice(0, mid), items.slice(mid)];

  const renderRow = (rowItems: MarqueeItem[], durationSec: number) => {
    // Tripled so a -33.333% shift loops seamlessly (matches .animate-scroll-carousel).
    const track = [...rowItems, ...rowItems, ...rowItems];
    return (
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-card to-transparent" />
        <div
          className="flex items-center gap-3 animate-scroll-carousel"
          style={{ width: "max-content", animationDuration: `${durationSec}s` }}
        >
          {track.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              title={item.name}
              className="flex h-9 w-20 shrink-0 items-center justify-center"
            >
              <img
                src={item.logo}
                alt={item.name}
                loading="lazy"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col justify-center gap-2 pt-1">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary/70" />
        {label}
        <span className="ml-auto font-bold text-primary/60">{items.length}+</span>
      </p>

      <div className="space-y-1.5">
        {renderRow(rows[0], 38)}
        {renderRow(rows[1], 48)}
      </div>
    </div>
  );
};

export default CoveredLogos;
