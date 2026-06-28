import { useEffect, useState, type ReactNode } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, Check, GraduationCap, Award, Briefcase, MousePointerClick } from "lucide-react";

/**
 * Minimal shape an associate needs to be displayed inside the choice carousel.
 * Both AssociateSelector and GuestAssociateSelector pass a superset of this.
 */
export interface AssociateLike {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string | null;
  university?: string | null;
  university_2?: string | null;
  master_program?: string | null;
  company_name?: string | null;
  company_2?: string | null;
  professional_experiences?: Array<{ sector?: string; company?: string; role?: string; period?: string }> | null;
}

interface AssociateChoiceCarouselProps {
  associates: AssociateLike[];
  /** Whether a given associate is currently selected. */
  isSelected: (a: AssociateLike) => boolean;
  /** Toggle selection for an associate (whole card is clickable). */
  onToggle: (a: AssociateLike) => void;
  /** Return the list of sectors / fields of work for an associate. */
  getSectors: (a: AssociateLike) => string[];
  /** Action buttons (Download / LinkedIn ...) rendered at the bottom of each card. */
  renderActions?: (a: AssociateLike) => ReactNode;
  /** Optional extra highlight for special cards (e.g. Layover transfer match). */
  highlightCard?: (a: AssociateLike) => boolean;
  /**
   * Compact, viewport-adaptive sizing so the carousel fits inside a single
   * screen alongside the package card (used in the package experience). The
   * dialogs keep the default, larger fixed-height photos.
   */
  fillHeight?: boolean;
  /**
   * Extra-tight variant for the mobile package view, where the whole package
   * must fit one screen: smaller photo, denser info and a slimmer select bar.
   */
  compact?: boolean;
}

const getInitials = (a: AssociateLike) =>
  `${(a.first_name?.[0] ?? "").toUpperCase()}${(a.last_name?.[0] ?? "").toUpperCase()}`;

const getCompanies = (a: AssociateLike): string[] =>
  [a.company_name, a.company_2].filter((c): c is string => !!c && c.trim() !== "");

const AssociateChoiceCarousel = ({
  associates,
  isSelected,
  onToggle,
  getSectors,
  renderActions,
  highlightCard,
  fillHeight = false,
  compact = false,
}: AssociateChoiceCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const count = associates.length;
  const isSingle = count === 1;

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="px-1">
      <Carousel
        setApi={setApi}
        opts={{ align: "start", containScroll: "trimSnaps" }}
        className="w-full"
      >
        <CarouselContent className="-ml-4 py-2">
          {associates.map((associate) => {
            const selected = isSelected(associate);
            const companies = getCompanies(associate);
            const sectors = getSectors(associate);
            const highlighted = highlightCard?.(associate) ?? false;

            return (
                <CarouselItem
                  key={associate.id}
                  className={cn(
                    "pl-4",
                    // One big card + a peek of the next on every breakpoint, so it is
                    // always obvious that more associates exist to the right.
                    isSingle
                      ? // In the package (fillHeight) a single associate should look just
                        // like one of the multi cards (not a wide full-width card that
                        // squashes the photo); elsewhere keep the roomy single layout.
                        fillHeight
                        ? "basis-[82%] sm:basis-[58%] lg:basis-[44%] mx-auto"
                        : "basis-full sm:basis-4/5 mx-auto"
                      : compact
                      ? "basis-[76%] sm:basis-[58%] lg:basis-[44%]"
                      : "basis-[82%] sm:basis-[58%] lg:basis-[44%]"
                  )}
                >
                <button
                  type="button"
                  onClick={() => onToggle(associate)}
                  aria-pressed={selected}
                  className={cn(
                    "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card text-left",
                    "shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    selected
                      ? "border-primary ring-2 ring-primary"
                      : "border-border hover:border-primary/50",
                    highlighted && !selected && "border-emerald-300/60 dark:border-emerald-700/40"
                  )}
                >
                  {/* ---- Hero photo with the face as the protagonist ---- */}
                  <div
                    className={cn(
                      "relative w-full overflow-hidden",
                      compact
                        ? "h-20"
                        : fillHeight
                        ? "h-[17vh] min-h-[110px] max-h-[188px]"
                        : // Default (dialog) variant: stay small on phones so the whole
                          // card fits the viewport, then grow on larger screens.
                          "h-40 sm:h-60 md:h-72"
                    )}
                  >
                    {associate.photo_url ? (
                      <img
                        src={associate.photo_url}
                        alt={`${associate.first_name} ${associate.last_name}`}
                        loading="lazy"
                        className={cn(
                          "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                          // Shorter package cards crop too high with object-top (hair/wall),
                          // so anchor the crop on the face; the taller dialog keeps object-top.
                          fillHeight ? "object-[center_22%]" : "object-top"
                        )}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
                        <span className={cn("font-semibold text-primary/70", compact ? "text-3xl" : "text-5xl")}>
                          {getInitials(associate)}
                        </span>
                      </div>
                    )}

                    {/* Legibility gradient so the name always reads over any photo */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                    {/* Selected badge — top-right */}
                    {selected && (
                      <div className={cn(
                        "absolute flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg",
                        compact ? "right-2 top-2 h-7 w-7" : "right-3 top-3 h-9 w-9"
                      )}>
                        <Check className={cn("", compact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={3} />
                      </div>
                    )}

                    {/* Name (ALWAYS visible) — company now lives in a tidy box below */}
                    <div className={cn("absolute inset-x-0 bottom-0", compact ? "p-2" : "p-4")}>
                      <h3 className={cn("font-bold leading-tight text-white drop-shadow-sm", compact ? "text-[15px]" : "text-lg sm:text-xl md:text-2xl")}>
                        {associate.first_name} {associate.last_name}
                      </h3>
                    </div>
                  </div>

                  {/* ---- Key info (ALWAYS visible) ---- */}
                  <div className={cn("flex flex-1 flex-col", compact ? "gap-1 p-1.5" : fillHeight ? "gap-1.5 p-2.5" : "gap-2 p-3 sm:gap-3 sm:p-4")}>
                    <div className={cn("flex flex-col", compact ? "gap-1" : fillHeight ? "gap-1" : "gap-1.5 sm:gap-2.5")}>
                      {(associate.university || associate.university_2) && (
                        <div className="flex items-start gap-1.5">
                          <GraduationCap className={cn("mt-0.5 shrink-0 text-primary", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-label="University" />
                          <div className="flex flex-wrap gap-1">
                            {associate.university && (
                              <Badge variant="secondary" className={cn(compact && "px-1.5 py-0 text-[10px]")}>{associate.university}</Badge>
                            )}
                            {associate.university_2 && (
                              <Badge variant="outline" className={cn("border-dashed", compact && "px-1.5 py-0 text-[10px]")}>
                                Transfer · {associate.university_2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {associate.master_program && (
                        <div className="flex items-start gap-1.5">
                          <Award className={cn("mt-0.5 shrink-0 text-amber-500", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-label="Master" />
                          <Badge variant="secondary" className={cn("border border-amber-200 bg-amber-50 text-amber-700", compact && "px-1.5 py-0 text-[10px]")}>
                            {associate.master_program}
                          </Badge>
                        </div>
                      )}

                      {companies.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <Building2 className={cn("mt-0.5 shrink-0 text-primary", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
                          <div className="flex flex-wrap gap-1">
                            {companies.map((company, i) => (
                              <Badge
                                key={`${company}-${i}`}
                                variant={i === 0 ? "default" : "outline"}
                                className={cn(
                                  "max-w-full truncate",
                                  i === 0
                                    ? "border-transparent bg-primary/10 text-primary hover:bg-primary/15"
                                    : "border-dashed",
                                  compact && "px-1.5 py-0 text-[10px]"
                                )}
                              >
                                {company}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {sectors.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <Briefcase className={cn("mt-0.5 shrink-0 text-primary", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
                          <div className="flex flex-wrap gap-1">
                            {sectors.slice(0, fillHeight ? 1 : 2).map((s) => (
                              <Badge key={s} variant="outline" className={cn(compact && "px-1.5 py-0 text-[10px]")}>
                                {s}
                              </Badge>
                            ))}
                            {sectors.length > (fillHeight ? 1 : 2) && (
                              <Badge variant="outline" className={cn("text-muted-foreground", compact && "px-1.5 py-0 text-[10px]")}>
                                +{sectors.length - (fillHeight ? 1 : 2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons — kept inside the card, click does not toggle.
                        flex-wrap so they drop to a new line instead of spilling
                        out of a narrow card (e.g. the LinkedIn button). */}
                    {renderActions && (
                      <div
                        className={cn(
                          "mt-auto flex flex-wrap",
                          compact ? "gap-1.5 pt-1" : "gap-2 pt-1"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActions(associate)}
                      </div>
                    )}

                    {/* Click affordance — makes it obvious the card is selectable */}
                    <div
                      className={cn(
                        "mt-1 flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
                        compact ? "py-1 text-[10px]" : "py-2 text-sm",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      )}
                    >
                      {selected ? (
                        <>
                          <Check className={cn("", compact ? "h-3.5 w-3.5" : "h-4 w-4")} strokeWidth={3} />
                          Selected
                        </>
                      ) : (
                        <>
                          <MousePointerClick className={cn("", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
                          Click to select
                        </>
                      )}
                    </div>
                  </div>
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Arrows — only when there is more than one associate to scroll through */}
        {!isSingle && (
          <>
            <CarouselPrevious className="left-1 h-10 w-10 border-2 bg-background/90 shadow-md backdrop-blur" />
            <CarouselNext className="right-1 h-10 w-10 border-2 bg-background/90 shadow-md backdrop-blur" />
          </>
        )}
      </Carousel>

      {/* Navigation indicator: "N of M" + a small, capped set of dots so a long
          associate list doesn't render dozens of distracting dots. */}
      {!isSingle && (() => {
        const maxDots = 5;
        const windowStart =
          count > maxDots
            ? Math.min(Math.max(current - Math.floor(maxDots / 2), 0), count - maxDots)
            : 0;
        const dotIndices =
          count > maxDots
            ? Array.from({ length: maxDots }, (_, k) => windowStart + k)
            : associates.map((_, i) => i);
        return (
          <div className={cn("flex flex-col items-center gap-2", fillHeight ? "mt-2" : "mt-4")}>
            <div className="flex items-center gap-1.5">
              {dotIndices.map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to associate ${i + 1}`}
                  onClick={() => api?.scrollTo(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {current + 1} of {count} associates · swipe or use the arrows
            </p>
          </div>
        );
      })()}
    </div>
  );
};

export default AssociateChoiceCarousel;
