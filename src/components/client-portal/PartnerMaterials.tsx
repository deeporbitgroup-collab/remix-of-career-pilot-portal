import { cn } from "@/lib/utils";
import { partnerships } from "@/data/partnerships";

// Insert an invisible break opportunity (zero-width space, U+200B) at camelCase
// boundaries and before a dot, so long brand words wrap at a CLEAN point
// ("Career"/"Boost", "Language"/"Boost") instead of breaking mid-word. Short
// names stay on one line; the break only kicks in when the cell is too narrow.
const ZWSP = String.fromCharCode(0x200b);
const breakName = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, `$1${ZWSP}$2`)
    .replace(/\.(?=\S)/g, `${ZWSP}.`);

/**
 * A small caption + one even row of partnership logos, each with its name
 * underneath (every brand shares the width equally so they all fit on a single
 * line). No border or box, so it blends in under the bullets rather than looking
 * like a separate section. The whole thing links to the homepage
 * "Our Partnerships" section (#partnerships).
 */
const PartnerMaterials = ({ className }: { className?: string }) => (
  <a
    href="/#partnerships"
    title="Discounted resources included in the Associate's products — see Our Partnerships"
    className={cn("group flex flex-col gap-1.5", className)}
  >
    <p className="text-center text-[9px] font-semibold uppercase tracking-wide leading-tight text-muted-foreground/80 md:text-[10px]">
      Discounted resources included in the Associate's products
    </p>

    <div className="flex items-start justify-between gap-1">
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
            {breakName(p.name)}
          </span>
        </span>
      ))}
    </div>
  </a>
);

export default PartnerMaterials;
