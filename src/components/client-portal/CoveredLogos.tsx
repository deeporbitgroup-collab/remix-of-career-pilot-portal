import { GraduationCap, Building2 } from "lucide-react";
import { type MarqueeItem } from "@/components/LogoMarquee";
import { universities, companies } from "@/data/coveredLogos";
import { cn } from "@/lib/utils";

interface CoveredLogosProps {
  /** Which roster to show: universities (Take Off / Summit / Layover) or companies (Altitude). */
  kind: "universities" | "companies";
  /**
   * "stacked" (default): two marquee rows + label, used in the package card body.
   * "header": a single compact marquee row, used inside the slim category header.
   */
  variant?: "stacked" | "header";
  className?: string;
}

/**
 * Covered universities (or companies for Altitude) scrolling on an infinite loop.
 * Uniform tile sizing + edge fades keep it tidy and on-brand.
 */
const CoveredLogos = ({ kind, variant = "stacked", className }: CoveredLogosProps) => {
  const items: MarqueeItem[] = kind === "companies" ? companies : universities;
  const Icon = kind === "companies" ? Building2 : GraduationCap;
  const label = kind === "companies" ? "Companies our mentors come from" : "Universities you can target";

  const renderRow = (rowItems: MarqueeItem[], durationSec: number, tile: string) => {
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
            <div key={`${item.name}-${i}`} title={item.name} className={cn("flex shrink-0 items-center justify-center", tile)}>
              <img src={item.logo} alt={item.name} loading="lazy" className="max-h-full max-w-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Header variant: one compact row, fits the slim category bar ──────────────
  if (variant === "header") {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)} title={label}>
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <div className="min-w-0 flex-1">{renderRow(items, 42, "h-6 w-14")}</div>
      </div>
    );
  }

  // ── Stacked variant (package body): two rows + label ─────────────────────────
  const mid = Math.ceil(items.length / 2);
  const rows: MarqueeItem[][] = [items.slice(0, mid), items.slice(mid)];
  return (
    <div className={cn("flex flex-1 flex-col justify-center gap-2 pt-1", className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary/70" />
        {label}
        <span className="ml-auto font-bold text-primary/60">{items.length}+</span>
      </p>
      <div className="space-y-1.5">
        {renderRow(rows[0], 38, "h-9 w-20")}
        {renderRow(rows[1], 48, "h-9 w-20")}
      </div>
    </div>
  );
};

export default CoveredLogos;
