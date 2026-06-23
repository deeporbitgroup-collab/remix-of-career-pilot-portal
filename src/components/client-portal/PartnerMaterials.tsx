import { cn } from "@/lib/utils";
import { partnerships } from "@/data/partnerships";

interface PartnerMaterialsProps {
  /** Tighter logos and no label — for sitting inline next to another element. */
  compact?: boolean;
  className?: string;
}

/**
 * A deliberately tiny, corner-style group of partner logos for the package
 * card: all on a single line so it adds (almost) no height. Links to the
 * homepage "Our Partnerships" section. Brand names live in the tooltip/alt to
 * keep the strip minimal and unobtrusive — it sits at the very bottom of the
 * package's visual hierarchy.
 */
const PartnerMaterials = ({ compact = false, className }: PartnerMaterialsProps) => {
  const dim = compact ? "h-[18px] w-[18px]" : "h-5 w-5";
  return (
    <a
      href="/#partnerships"
      title="Premium material from our partners — see Our Partnerships"
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 transition-colors",
        !compact &&
          "rounded-full border border-border/40 bg-muted/20 px-2.5 py-1 hover:border-primary/30 hover:bg-primary/5",
        className
      )}
    >
      {!compact && (
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/80">
          Partner material
        </span>
      )}
      <span className={cn("flex items-center", compact ? "gap-0.5" : "gap-1")}>
        {partnerships.map((p) => (
          <span
            key={p.name}
            title={p.name}
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-white ring-1 ring-border/40 transition-shadow group-hover:ring-primary/30",
              dim
            )}
          >
            <img
              src={p.logo}
              alt={p.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain p-[2px]"
            />
          </span>
        ))}
      </span>
    </a>
  );
};

export default PartnerMaterials;
