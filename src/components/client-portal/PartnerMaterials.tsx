import { BookOpen, ArrowUpRight } from "lucide-react";
import { partnerships } from "@/data/partnerships";

/**
 * A deliberately low-emphasis strip for the package card: the partner brands
 * whose premium material is bundled into the Associate's project. Each brand
 * shows a small logo + its name; the whole strip links to the homepage
 * "Our Partnerships" section (#partnerships). Kept minimal and tidy so it
 * supports — never overpowers — the package name, price and included list.
 */
const PartnerMaterials = () => (
  <a
    href="/#partnerships"
    title="Discover our partnerships"
    className="group block rounded-xl border border-border/40 bg-muted/20 p-2.5 transition-colors hover:border-primary/30 hover:bg-primary/5"
  >
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
      <span className="flex-1 leading-tight">Premium material included in your project</span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-primary/70 transition-colors group-hover:text-primary">
        Our partners
        <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </p>

    <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-2">
      {partnerships.map((p) => (
        <span key={p.name} className="flex w-[60px] flex-col items-center gap-1">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-border/50 transition-shadow group-hover:ring-primary/30">
            <img
              src={p.logo}
              alt={p.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain"
            />
          </span>
          <span className="w-full text-center text-[10px] font-medium leading-tight text-muted-foreground line-clamp-2">
            {p.name}
          </span>
        </span>
      ))}
    </div>
  </a>
);

export default PartnerMaterials;
