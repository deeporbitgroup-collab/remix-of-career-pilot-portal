import { cn } from "@/lib/utils";
import { partnerships } from "@/data/partnerships";

/**
 * Partnership logos, each with its name underneath, laid out as ONE even row —
 * every brand shares the width equally so they all sit side by side on a single
 * line. No heading and no border, so it blends in under the bullets rather than
 * looking like a separate section. The whole row links to the homepage
 * "Our Partnerships" section (#partnerships).
 */
const PartnerMaterials = ({ className }: { className?: string }) => (
  <a
    href="/#partnerships"
    title="Premium material from our partners — see Our Partnerships"
    className={cn("group flex items-start justify-between gap-1", className)}
  >
    {partnerships.map((p) => (
      <span key={p.name} className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-border/40 transition-shadow group-hover:ring-primary/30 md:h-8 md:w-8">
          <img
            src={p.logo}
            alt={p.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain p-[3px]"
          />
        </span>
        <span className="w-full text-center text-[9px] font-medium leading-tight text-muted-foreground line-clamp-2 md:text-[10px]">
          {p.name}
        </span>
      </span>
    ))}
  </a>
);

export default PartnerMaterials;
