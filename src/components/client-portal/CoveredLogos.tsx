import { GraduationCap, Building2 } from "lucide-react";
import { type MarqueeItem } from "@/components/LogoMarquee";
import { universities, companies } from "@/data/coveredLogos";

interface CoveredLogosProps {
  /** Which roster to show: universities (Take Off / Summit / Layover) or companies (Altitude). */
  kind: "universities" | "companies";
  /** How many logos to show before collapsing the rest into a "+N" tile. Keep a multiple of the column count for tidy rows. */
  max?: number;
}

/**
 * A compact, uniform logo wall used inside the package card to fill the lower
 * empty space. Logos are intentionally muted (grayscale, soft) so they support
 * — never overpower — the package name, price and bullet list.
 */
const CoveredLogos = ({ kind, max = 7 }: CoveredLogosProps) => {
  const items: MarqueeItem[] = kind === "companies" ? companies : universities;
  const Icon = kind === "companies" ? Building2 : GraduationCap;
  const label = kind === "companies" ? "Companies our mentors come from" : "Universities you can target";

  const shown = items.slice(0, max);
  const remaining = items.length - shown.length;

  return (
    <div className="flex flex-1 flex-col justify-center gap-2 pt-1">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary/70" />
        {label}
        <span className="ml-auto font-bold text-primary/60">{items.length}+</span>
      </p>

      <div className="grid grid-cols-4 gap-1.5">
        {shown.map((item) => (
          <div
            key={item.name}
            title={item.name}
            className="flex h-10 items-center justify-center rounded-lg border border-border/40 bg-white/80 p-1.5 dark:bg-white/[0.06]"
          >
            <img
              src={item.logo}
              alt={item.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain opacity-70 grayscale transition-opacity"
            />
          </div>
        ))}

        {remaining > 0 && (
          <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/30 px-1 text-[11px] font-bold text-muted-foreground">
            +{remaining}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoveredLogos;
