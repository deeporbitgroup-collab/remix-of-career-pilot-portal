import { Fragment, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Plane,
  Check,
  ShoppingCart,
  Info,
  FileText,
  Linkedin,
  Sparkles,
  Users,
  Plus,
  GraduationCap,
  Briefcase,
  ArrowLeftRight,
  Download,
} from "lucide-react";
import AssociateChoiceCarousel from "./AssociateChoiceCarousel";
import CoveredLogos from "./CoveredLogos";
import whatsappLogo from "@/assets/whatsapp-logo.png";

// The "Dedicated WhatsApp group with your Associate" bullet gets a small
// WhatsApp glyph rendered inline, sized to the surrounding text and sitting
// right next to the label.
const isWhatsAppBullet = (label: string) => /whats\s?app/i.test(label);
const WhatsAppMark = () => (
  <img
    src={whatsappLogo}
    alt="WhatsApp"
    aria-hidden="true"
    className="ml-1.5 inline-block h-[1.05em] w-[1.05em] shrink-0 translate-y-[1px] object-contain align-text-bottom"
  />
);

interface Service {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  requires_university: boolean;
  requires_sector: boolean;
  requires_associate: boolean;
}

export interface PackageComponent {
  id: string;
  package_id: string;
  service_id: string | null;
  label: string | null;
  quantity: number;
  internal_price: number;
  is_removable: boolean;
  is_addon: boolean;
  addon_type: string | null;
  addon_price: number | null;
  sort_order: number;
  service?: Service | null;
}

export interface ClientPackage {
  id: string;
  code_name: string;
  subtitle: string;
  category: string;
  description: string | null;
  price: number;
  bullets: Array<{ label: string; info: string }>;
  sort_order: number;
  active: boolean;
}

interface AssociatePreview {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string | null;
  university?: string | null;
  university_2?: string | null;
  master_program?: string | null;
  sector?: string | null;
  sector_2?: string | null;
  company_name?: string | null;
  company_2?: string | null;
  linkedin_url?: string | null;
  overview_url?: string | null;
}

interface GuestCartItem {
  id: string;
  service: Service;
  associate?: { id: string; first_name: string; last_name: string } | null;
  university?: string;
  sector?: string;
  packageGroupId?: string;
  packageName?: string;
  packageRole?: "component" | "addon";
}

interface PackageExperienceProps {
  pkg: ClientPackage;
  components: PackageComponent[];
  /** All à-la-carte rows in this category (for "scorporo"). */
  services: Service[];
  associates: AssociatePreview[];
  onSelectService: (service: Service) => void;
  onAddToCart: (item: GuestCartItem) => void;
  onShowInfo: (service: Service) => void;
  onDownloadPdf: (name: string, category: string) => void;
  getPreviewImage?: (name: string) => string | undefined;
  hasDemo?: (name: string) => boolean;
}

const categoryIcon: Record<string, typeof Plane> = {
  "Take Off": Plane,
  Summit: GraduationCap,
  Altitude: Briefcase,
  Layover: ArrowLeftRight,
};

// Per-package blue ramp (HSL triplets, no hsl() wrapper — matches index.css).
// Take Off = lightest sky blue, deepening to Altitude = deep navy. `secondary`
// is a lighter partner used for gradients and the title underline.
const PACKAGE_ACCENTS: Record<string, { primary: string; secondary: string }> = {
  "Take Off": { primary: "205 92% 58%", secondary: "195 95% 68%" },
  Layover: { primary: "212 88% 46%", secondary: "205 90% 60%" },
  Summit: { primary: "219 85% 34%", secondary: "214 88% 52%" },
  Altitude: { primary: "226 88% 22%", secondary: "218 85% 42%" },
};

// Join a list into natural English: "A", "A and B", "A, B and C".
const joinNatural = (items: string[]): string => {
  const list = items.map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
};

// De-duplicate (case-insensitive) while keeping the first written form.
const uniqueValues = (items: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  items.forEach((raw) => {
    const v = (raw || "").trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  });
  return out;
};

// Build a single, grammatically-correct sentence from whatever the associate
// filled in. The structure is trimmed to the available fields:
//  - only a university            → "… has studied at X."
//  - university(ies) + master     → "… has studied at X then at Y."
//  - + company(ies) [+ sectors]   → "… and has worked at A and B in the fields of S1 and S2."
const buildAssociateBio = (a: AssociatePreview): string => {
  const fullName = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "This Associate";
  const unis = uniqueValues([a.university, a.university_2]);
  const master = (a.master_program || "").trim();
  const companies = uniqueValues([a.company_name, a.company_2]);
  const sectors = uniqueValues([a.sector, a.sector_2]);

  let education = "";
  if (unis.length) {
    education = `has studied at ${joinNatural(unis)}`;
    if (master) education += ` then at ${master}`;
  } else if (master) {
    education = `has studied at ${master}`;
  }

  let work = "";
  if (companies.length) {
    work = `has worked at ${joinNatural(companies)}`;
    if (sectors.length) {
      work += ` in the field${sectors.length > 1 ? "s" : ""} of ${joinNatural(sectors)}`;
    }
  } else if (sectors.length) {
    work = `has experience in the field${sectors.length > 1 ? "s" : ""} of ${joinNatural(sectors)}`;
  }

  const clauses = [education, work].filter(Boolean);
  if (clauses.length === 0) return `${fullName} is one of our Associates.`;
  return `${fullName} ${clauses.join(" and ")}.`;
};

// Diacritic-insensitive lowercase for fuzzy token matching.
const normalize = (s: string | null | undefined): string =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// Per-vertical "show these first" ordering so the Associate panel doesn't open
// with the same faces in every package. Each entry is a list of synonym groups;
// an associate is ranked by the index of the first group its field matches.
//  - Take Off / Layover → matched on university
//  - Summit             → matched on master program
//  - Altitude           → matched on associate name
const ASSOCIATE_PRIORITY: Record<
  string,
  { by: "university" | "master" | "name"; groups: string[][] }
> = {
  "Take Off": {
    by: "university",
    groups: [["lse", "london school of economics"], ["bocconi"], ["escp"]],
  },
  Layover: {
    by: "university",
    groups: [["rotterdam", "erasmus"], ["escp"], ["bocconi"]],
  },
  Summit: {
    by: "master",
    groups: [["mit"], ["escp"]],
  },
  Altitude: {
    by: "name",
    groups: [["alessandro olivetti"], ["riccardo ciardelli"], ["antoine falche"]],
  },
};

// Small deterministic hash so the *non-pinned* associates fan out differently
// per category (instead of every vertical leading with the same person).
const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const orderAssociatesForCategory = (
  list: AssociatePreview[],
  category: string
): AssociatePreview[] => {
  const cfg = ASSOCIATE_PRIORITY[category];
  const rankOf = (a: AssociatePreview): number => {
    if (!cfg) return Number.MAX_SAFE_INTEGER;
    const haystack =
      cfg.by === "name"
        ? normalize(`${a.first_name} ${a.last_name}`)
        : cfg.by === "master"
        ? normalize(a.master_program)
        : `${normalize(a.university)} ${normalize(a.university_2)}`;
    const idx = cfg.groups.findIndex((grp) => grp.some((t) => haystack.includes(t)));
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  return [...list].sort((a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    // Tie-break: category-scoped hash so each vertical shows a different spread.
    return hashStr(a.id + category) - hashStr(b.id + category);
  });
};

const demoShortLabel = (name: string): string => {
  const short: Record<string, string> = {
    "Personalized Timeline": "Timeline",
    "Personalized Career Roadmap": "Roadmap",
    "In-Depth Presentations": "In-Depth",
    "Comparative Presentations": "Comparative",
    "Comparative Analysis": "Comparative",
  };
  return short[name] || name;
};

const PackageExperience = ({
  pkg,
  components,
  services,
  associates,
  onSelectService,
  onAddToCart,
  onShowInfo,
  onDownloadPdf,
  getPreviewImage,
  hasDemo,
}: PackageExperienceProps) => {
  const [associateFilter, setAssociateFilter] = useState("");
  const [selectedAssociateId, setSelectedAssociateId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [packageInfoOpen, setPackageInfoOpen] = useState(false);
  const [bioAssociate, setBioAssociate] = useState<AssociatePreview | null>(null);
  // Comparative add-on opt-in (mobile face). Default OFF — checking adds it to
  // the cart as a packaged add-on and bumps the displayed total.
  const [comparativeOn, setComparativeOn] = useState(false);
  // Mobile-only: which "face" of the card is showing, and whether the (possibly
  // long) included list is fully expanded. Desktop ignores both.
  const [mobileView, setMobileView] = useState<"package" | "associate">("package");
  const [showAllIncluded, setShowAllIncluded] = useState(false);

  const Icon = categoryIcon[pkg.category] || Plane;
  const packageName = `${pkg.code_name} — ${pkg.subtitle}`;

  // Per-package blue ramp: lightest for Take Off, deepening through Layover →
  // Summit → Altitude (darkest navy). Each vertical overrides --primary/--secondary
  // locally, so the whole package view (title, icons, buttons, borders) recolors
  // automatically while the rest of the site keeps the brand blue.
  const accent = PACKAGE_ACCENTS[pkg.category];
  const accentStyle = accent
    ? ({
        "--primary": accent.primary,
        "--secondary": accent.secondary,
        "--accent": accent.secondary,
      } as React.CSSProperties)
    : undefined;

  // How associates are matched for this vertical.
  const filterMode: "university" | "master" | "sector" =
    pkg.category === "Summit" ? "master" : pkg.category === "Altitude" ? "sector" : "university";

  const coreComponents = useMemo(
    () => components.filter((c) => !c.is_addon).sort((a, b) => a.sort_order - b.sort_order),
    [components]
  );
  const addonComponents = useMemo(
    () => components.filter((c) => c.is_addon).sort((a, b) => a.sort_order - b.sort_order),
    [components]
  );

  // À-la-carte singles for "scorporo": every category service that isn't an add-on product.
  const addonServiceIds = useMemo(
    () => new Set(addonComponents.map((c) => c.service_id).filter(Boolean) as string[]),
    [addonComponents]
  );
  const singles = useMemo(
    () => services.filter((s) => !addonServiceIds.has(s.id)),
    [services, addonServiceIds]
  );

  const includedCore = useMemo(
    () => coreComponents.filter((c) => !removed.has(c.id)),
    [coreComponents, removed]
  );

  // All distinct service names in this category that ship a demo/sample PDF.
  const demoPdfNames = useMemo(() => {
    const names = new Set<string>();
    services.forEach((s) => {
      if (hasDemo?.(s.name)) names.add(s.name);
    });
    coreComponents.forEach((c) => {
      const n = c.service?.name;
      if (n && hasDemo?.(n)) names.add(n);
    });
    return Array.from(names);
  }, [services, coreComponents, hasDemo]);

  // The Comparative add-on (if present) can be opted in from the mobile face.
  const comparativeAddon = useMemo(
    () => addonComponents.find((c) => c.addon_type === "comparative") || null,
    [addonComponents]
  );
  const comparativeSurcharge = comparativeAddon ? Number(comparativeAddon.addon_price || 0) : 0;

  const total = useMemo(
    () =>
      includedCore.reduce((sum, c) => sum + Number(c.internal_price) * c.quantity, 0) +
      (comparativeOn ? comparativeSurcharge : 0),
    [includedCore, comparativeOn, comparativeSurcharge]
  );
  const fullPrice = Number(pkg.price);

  // Distinct match values for the dropdown.
  const availableValues = useMemo(() => {
    const map = new Map<string, string>();
    associates.forEach((a) => {
      const vals =
        filterMode === "master"
          ? [a.master_program]
          : filterMode === "sector"
          ? [a.sector, a.sector_2]
          : [a.university, a.university_2];
      vals.forEach((v) => {
        if (v && v.trim()) {
          const key = v.toLowerCase().trim();
          if (!map.has(key)) map.set(key, v.trim());
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [associates, filterMode]);

  const matchableAssociates = useMemo(() => {
    const matched = associates.filter((a) =>
      filterMode === "master"
        ? !!a.master_program
        : filterMode === "sector"
        ? !!(a.sector || a.sector_2)
        : !!(a.university || a.university_2)
    );
    return orderAssociatesForCategory(matched, pkg.category);
  }, [associates, filterMode, pkg.category]);

  const filteredAssociates = useMemo(() => {
    const q = associateFilter.trim().toLowerCase();
    if (!q) return matchableAssociates;
    return matchableAssociates.filter((a) => {
      const vals =
        filterMode === "master"
          ? [a.master_program]
          : filterMode === "sector"
          ? [a.sector, a.sector_2]
          : [a.university, a.university_2];
      return vals.some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [matchableAssociates, associateFilter, filterMode]);

  const selectedAssociate = useMemo(
    () => associates.find((a) => a.id === selectedAssociateId) || null,
    [associates, selectedAssociateId]
  );

  // Mobile-only: a few faces to reassure (in the "Package" face) that every
  // package is run 1:1 by a real Associate. Reuses the matched list.
  const mobileFacePile = useMemo(() => matchableAssociates.slice(0, 4), [matchableAssociates]);

  const associateMatchLabel = (a: AssociatePreview) =>
    filterMode === "master"
      ? a.master_program || ""
      : filterMode === "sector"
      ? a.sector || a.sector_2 || ""
      : a.university || a.university_2 || "";

  const filterLabel =
    filterMode === "master"
      ? "Master Program of Interest"
      : filterMode === "sector"
      ? "Professional Sector of Interest"
      : "University of Interest";

  // Add the configured package: one cart line per included component unit, all
  // sharing a packageGroupId so they're billed/managed as a package while still
  // producing one project (and one deliverable area) per component.
  const addPackageToCart = () => {
    if (!selectedAssociate) {
      toast.info("Pick your Associate first.");
      return;
    }
    if (includedCore.length === 0) {
      toast.info("Keep at least one component in your package.");
      return;
    }
    const groupId = `pkg-${pkg.id}-${Date.now()}`;
    const matchValue = associateMatchLabel(selectedAssociate) || associateFilter || undefined;

    includedCore.forEach((comp) => {
      if (!comp.service) return;
      // Override the displayed/charged price with the internal package price so
      // the sum of components equals the fixed package total.
      const componentService: Service = {
        ...comp.service,
        price: Number(comp.internal_price),
      };
      for (let i = 0; i < comp.quantity; i++) {
        onAddToCart({
          id: `${groupId}-${comp.id}-${i}`,
          service: componentService,
          associate: {
            id: selectedAssociate.id,
            first_name: selectedAssociate.first_name,
            last_name: selectedAssociate.last_name,
          },
          university: filterMode === "sector" ? undefined : matchValue,
          sector: filterMode === "sector" ? matchValue : undefined,
          packageGroupId: groupId,
          packageName,
          packageRole: "component",
        });
      }
    });
    toast.success(`${pkg.code_name} package added to cart!`);
  };

  // Add an Outreach-style add-on (pay-per-interview): €0 upfront, billed per result.
  const addOutreachAddon = (comp: PackageComponent) => {
    if (!comp.service) return;
    const zeroService: Service = { ...comp.service, price: 0 };
    onAddToCart({
      id: `addon-${comp.id}-${Date.now()}`,
      service: zeroService,
      associate: null,
      packageName,
      packageRole: "addon",
    });
    toast.success("Outreach Power Pack added — billed €250 per interview secured.");
  };

  // Bullets: Study Plan / Entry Plan sits right under the Timeline/Roadmap row;
  // the rest trail the component list. Everything renders as one uniform,
  // separator-free list so the package reads like many products.
  const isAnchorBullet = (label: string) => /study plan|entry plan/i.test(label);
  const isTimelineComponent = (comp: PackageComponent) => {
    const s = `${comp.label || ""} ${comp.service?.name || ""}`.toLowerCase();
    return s.includes("timeline") || s.includes("roadmap");
  };
  const anchorBullets = (pkg.bullets || []).filter((b) => isAnchorBullet(b.label));
  const trailingBullets = (pkg.bullets || []).filter((b) => !isAnchorBullet(b.label));

  const renderBulletRow = (b: { label: string; info: string }) => (
    <li key={b.label} className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
      <span className="flex-1 font-medium text-foreground/90">
        {b.label}
        {isWhatsAppBullet(b.label) && <WhatsAppMark />}
      </span>
    </li>
  );

  return (
    <div style={accentStyle}>
      {/* ===================== MOBILE compact layout ===================== */}
      {/* Sits on a solid surface so every label stays legible over the page's
          dark photo background (desktop uses the separate block below). The
          content is split into two "faces" — Package / Associate — toggled by a
          segmented control so each face fits one screen without long vertical
          scrolling. The price + CTA stay at the bottom on both faces. */}
      <div className="md:hidden flex flex-col gap-2 rounded-2xl border border-border/50 bg-background/95 p-2.5 shadow-xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold uppercase leading-tight tracking-wide text-primary">
              <span className="inline-block border-b-2 border-secondary pb-0.5">{pkg.code_name}</span>
            </h2>
            <p className="truncate text-[11px] text-foreground/70">{pkg.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setPackageInfoOpen(true)}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary"
          >
            <Info className="h-3.5 w-3.5" /> Info
          </button>
        </div>

        {/* Segmented control — switch between the package and the associate face */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setMobileView("package")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-colors ${
              mobileView === "package" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" /> Package
          </button>
          <button
            type="button"
            onClick={() => setMobileView("associate")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-colors ${
              mobileView === "associate" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="max-w-[8ch] truncate">{selectedAssociate ? selectedAssociate.first_name : "Associate"}</span>
            {selectedAssociate ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ---------- PACKAGE FACE ---------- */}
        {mobileView === "package" && (
          <div className="flex flex-col gap-2">
            {/* What's included — bigger, readable bullets + collapse beyond 5 */}
            <div className="rounded-xl border border-primary/20 bg-card p-3 shadow-sm">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What's included</p>
              <ul className="space-y-1.5">
                {(showAllIncluded ? includedCore : includedCore.slice(0, 5)).map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm leading-snug">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">{c.label || c.service?.name}</span>
                  </li>
                ))}
                {coreComponents.filter((c) => removed.has(c.id)).map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm leading-snug text-muted-foreground line-through">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 opacity-40" />
                    <span>{c.label || c.service?.name}</span>
                  </li>
                ))}
              </ul>
              {includedCore.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllIncluded((v) => !v)}
                  className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {showAllIncluded ? "Show less" : `+${includedCore.length - 5} more included`}
                </button>
              )}
              {coreComponents.some((c) => c.is_removable) && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2 h-8 w-full border-primary/30 text-xs text-primary">
                      Customize components
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto rounded-t-2xl">
                    <SheetHeader>
                      <SheetTitle>Customize your {pkg.code_name} package</SheetTitle>
                    </SheetHeader>
                    <p className="mb-3 mt-1 text-xs text-muted-foreground">Uncheck what you don't need — the price updates automatically.</p>
                    <ul className="space-y-3">
                      {coreComponents.map((comp) => {
                        const isRemoved = removed.has(comp.id);
                        const label = comp.label || comp.service?.name || "Component";
                        return (
                          <li key={comp.id} className="flex items-start gap-2.5 text-sm">
                            {comp.is_removable ? (
                              <Checkbox
                                checked={!isRemoved}
                                onCheckedChange={(checked) => {
                                  setRemoved((prev) => {
                                    const next = new Set(prev);
                                    if (checked) next.delete(comp.id);
                                    else next.add(comp.id);
                                    return next;
                                  });
                                }}
                                className="mt-0.5"
                                aria-label={`Toggle ${label}`}
                              />
                            ) : (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            )}
                            <span className={`flex-1 font-medium ${isRemoved ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {label}
                              {!comp.is_removable && <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-primary/70">included</span>}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">€{(Number(comp.internal_price) * comp.quantity).toFixed(0)}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-xl font-extrabold text-primary">€{total.toFixed(0)}</span>
                    </div>
                    <SheetClose asChild>
                      <Button className="mt-3 w-full bg-gradient-to-r from-primary to-secondary font-bold">Done</Button>
                    </SheetClose>
                  </SheetContent>
                </Sheet>
              )}
            </div>

            {/* Associate reassurance — small face pile makes it obvious every
                package is run 1:1 by a real Associate. Taps through to the picker. */}
            {mobileFacePile.length > 0 && (
              <button
                type="button"
                onClick={() => setMobileView("associate")}
                className="flex items-center gap-3 rounded-xl border border-secondary/30 bg-secondary/5 p-2.5 text-left"
              >
                <div className="flex shrink-0 items-center">
                  {mobileFacePile.map((a, i) => (
                    <span
                      key={a.id}
                      className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-primary/10 text-[10px] font-semibold text-primary ${i > 0 ? "-ml-2" : ""}`}
                    >
                      {a.photo_url ? (
                        <img src={a.photo_url} alt="" className="h-full w-full object-cover object-top" />
                      ) : (
                        <>
                          {(a.first_name?.[0] ?? "").toUpperCase()}
                          {(a.last_name?.[0] ?? "").toUpperCase()}
                        </>
                      )}
                    </span>
                  ))}
                  {matchableAssociates.length > mobileFacePile.length && (
                    <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-bold text-primary-foreground">
                      +{matchableAssociates.length - mobileFacePile.length}
                    </span>
                  )}
                </div>
                <span className="flex-1 text-xs leading-snug text-foreground/80">
                  <span className="font-semibold text-foreground">Always guided 1:1 by a real Associate.</span> Tap to choose yours.
                </span>
              </button>
            )}
          </div>
        )}

        {/* ---------- ASSOCIATE FACE ---------- */}
        {mobileView === "associate" && (
          <div className="rounded-xl border border-secondary/30 bg-card p-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold">
              <Users className="h-4 w-4 text-primary" /> Choose your Associate
            </p>
            <Select value={associateFilter || "__all__"} onValueChange={(v) => setAssociateFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-9 w-full border-primary/20 text-sm"><SelectValue placeholder="Pick from the list" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__all__">All {filterLabel.toLowerCase()}</SelectItem>
                {availableValues.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="mt-2">
              {filteredAssociates.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No associates match yet. Try another filter.</p>
              ) : (
                <AssociateChoiceCarousel
                  associates={filteredAssociates}
                  fillHeight
                  compact
                  isSelected={(a) => selectedAssociateId === a.id}
                  onToggle={(a) => setSelectedAssociateId((prev) => (prev === a.id ? null : a.id))}
                  getSectors={(a) => {
                    const ap = a as AssociatePreview;
                    return [ap.sector, ap.sector_2].filter((s): s is string => !!s && s.trim() !== "");
                  }}
                  renderActions={(a) => {
                    const ap = a as AssociatePreview;
                    return (
                      <>
                        <Button variant="outline" size="sm" className="flex-1 border-primary/20" onClick={(e) => { e.stopPropagation(); setBioAssociate(ap); }}>
                          <FileText className="mr-1.5 h-4 w-4" /> Overview
                        </Button>
                        {ap.linkedin_url && (
                          <Button asChild variant="outline" size="sm" className="flex-1 border-primary/20">
                            <a href={ap.linkedin_url.startsWith("http") ? ap.linkedin_url : `https://${ap.linkedin_url}`} target="_blank" rel="noopener noreferrer">
                              <Linkedin className="mr-1.5 h-4 w-4" /> LinkedIn
                            </a>
                          </Button>
                        )}
                      </>
                    );
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Price + add to cart — stays visible on both faces */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-primary">€{total.toFixed(0)}</span>
              {total < fullPrice && <span className="text-xs text-muted-foreground line-through">€{fullPrice.toFixed(0)}</span>}
            </div>
            {removed.size > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">Customized</Badge>
            )}
          </div>
          <Button
            className="mt-2 h-10 w-full bg-gradient-to-r from-primary to-secondary text-sm font-bold shadow-md"
            onClick={() => {
              if (!selectedAssociate) {
                setMobileView("associate");
                toast.info("Pick your Associate to continue.");
                return;
              }
              addPackageToCart();
            }}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {selectedAssociate ? `Add with ${selectedAssociate.first_name}` : "Choose your Associate"}
          </Button>
        </div>
      </div>

      {/* ===================== DESKTOP layout (unchanged) ===================== */}
      <div className="hidden md:block space-y-3">
      {/* Slim category header (keeps the whole experience in one screen) */}
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-background/90 px-4 py-2.5 shadow-lg backdrop-blur-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold uppercase leading-tight tracking-wide text-primary">
            <span className="inline-block border-b-[3px] border-secondary pb-0.5">{pkg.code_name}</span>
          </h2>
          <p className="truncate text-xs text-foreground/70">{pkg.subtitle}</p>
        </div>
        <p className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
          <Info className="h-3.5 w-3.5 text-primary" />
          One fixed price · one Associate · live 1:1 · dedicated WhatsApp support
        </p>
      </div>

      {/* TOP: Package (left) + Choose your Associate (right) — fits one screen */}
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        {/* LEFT — Package */}
        <Card className="relative flex flex-col overflow-hidden border-primary/30 bg-card shadow-xl">
          <CardHeader className="space-y-0.5 pb-2 pt-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xl">
                <span className="inline-block border-b-[3px] border-secondary pb-0.5 font-extrabold uppercase tracking-wide text-primary">
                  {pkg.code_name}
                </span>{" "}
                <span className="text-foreground/80">Package</span>
              </CardTitle>
              <Badge className="shrink-0 gap-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow">
                <Sparkles className="h-3 w-3" />
                Best value
              </Badge>
            </div>
            <CardDescription className="line-clamp-1 text-xs">{pkg.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-2.5 pb-3">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                What's included — uncheck what you don't want
              </p>
              <ul className="space-y-1.5">
                {coreComponents.map((comp) => {
                  const isRemoved = removed.has(comp.id);
                  const label = comp.label || comp.service?.name || "Component";
                  return (
                    <Fragment key={comp.id}>
                      <li className="flex items-start gap-2 text-sm">
                        {comp.is_removable ? (
                          <Checkbox
                            checked={!isRemoved}
                            onCheckedChange={(checked) => {
                              setRemoved((prev) => {
                                const next = new Set(prev);
                                if (checked) next.delete(comp.id);
                                else next.add(comp.id);
                                return next;
                              });
                            }}
                            className="mt-0.5"
                            aria-label={`Toggle ${label}`}
                          />
                        ) : (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        )}
                        <span className={`flex-1 font-medium ${isRemoved ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {label}
                          {!comp.is_removable && (
                            <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-primary/70">included</span>
                          )}
                        </span>
                      </li>
                      {isTimelineComponent(comp) && anchorBullets.map(renderBulletRow)}
                    </Fragment>
                  );
                })}
                {trailingBullets.map(renderBulletRow)}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setPackageInfoOpen(true)}
              className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              <Info className="h-3.5 w-3.5" />
              See full details of everything included
            </button>

            {demoPdfNames.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sample projects
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {demoPdfNames.map((name) => {
                    const previewImg = getPreviewImage?.(name);
                    return (
                      <div key={name} className="group w-[76px] shrink-0">
                        <div className="relative aspect-[3/4] overflow-hidden rounded-md border border-border/70 bg-muted/40 shadow-sm ring-1 ring-black/5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                          {previewImg ? (
                            <img
                              src={previewImg}
                              alt={`${name} preview`}
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover object-top"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                              <FileText className="h-7 w-7 text-primary/35" />
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/25 to-transparent" />
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-1 top-1 h-6 w-6 rounded-md border border-white/20 bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
                            title={`Download ${name} demo`}
                            onClick={() => onDownloadPdf(name, pkg.category)}
                          >
                            <Download className="h-3 w-3 text-primary" />
                          </Button>
                        </div>
                        <p className="mt-1 text-center text-[10px] font-medium leading-tight text-muted-foreground line-clamp-2">
                          {demoShortLabel(name)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Covered logos — fills the lower empty space without overpowering
                the package name, price and bullet list above. */}
            <CoveredLogos kind={pkg.category === "Altitude" ? "companies" : "universities"} />

            {/* Price block */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-extrabold text-primary">€{total.toFixed(0)}</span>
                  {total < fullPrice && (
                    <span className="ml-2 text-sm text-muted-foreground line-through">€{fullPrice.toFixed(0)}</span>
                  )}
                </div>
                {removed.size > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                    Customized
                  </Badge>
                )}
              </div>

              {selectedAssociate && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Associate: <span className="font-medium text-foreground">{selectedAssociate.first_name} {selectedAssociate.last_name}</span>
                </p>
              )}

              <Button
                className="mt-2.5 w-full bg-gradient-to-r from-primary to-secondary text-base font-bold shadow-md hover:opacity-90"
                size="lg"
                onClick={addPackageToCart}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {selectedAssociate ? `Add Package with ${selectedAssociate.first_name}` : "Pick an Associate to continue"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — Choose your Associate (the WOW panel) */}
        <Card className="relative flex flex-col overflow-hidden border-secondary/30 bg-card shadow-xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
          <CardHeader className="space-y-0.5 bg-gradient-to-br from-secondary/10 via-primary/5 to-transparent pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow">
                <Users className="h-4 w-4" />
              </span>
              Choose your Associate
            </CardTitle>
            <CardDescription className="text-xs leading-snug">
              Your mentor already did exactly what you want to do — they run your whole package 1:1.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-2 pb-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                {filterMode === "sector" ? <Briefcase className="h-4 w-4 text-primary" /> : <GraduationCap className="h-4 w-4 text-primary" />}
                {filterLabel}
              </label>
              <Select
                value={associateFilter || "__all__"}
                onValueChange={(v) => setAssociateFilter(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-full border-primary/20 focus:ring-primary/30 data-[state=open]:border-primary">
                  <SelectValue placeholder="Pick from the list" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__all__">All {filterLabel.toLowerCase()}</SelectItem>
                  {availableValues.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredAssociates.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No associates match yet. Try another search, or clear the filter.
              </div>
            ) : (
              <AssociateChoiceCarousel
                associates={filteredAssociates}
                fillHeight
                isSelected={(a) => selectedAssociateId === a.id}
                onToggle={(a) =>
                  setSelectedAssociateId((prev) => (prev === a.id ? null : a.id))
                }
                getSectors={(a) => {
                  const ap = a as AssociatePreview;
                  return [ap.sector, ap.sector_2].filter((s): s is string => !!s && s.trim() !== "");
                }}
                renderActions={(a) => {
                  const ap = a as AssociatePreview;
                  return (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-primary/20 hover:bg-primary/5 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBioAssociate(ap);
                        }}
                      >
                        <FileText className="mr-1.5 h-4 w-4" />
                        Overview
                      </Button>
                      {ap.linkedin_url && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1 border-primary/20 hover:bg-primary/5 hover:text-primary"
                        >
                          <a
                            href={ap.linkedin_url.startsWith("http") ? ap.linkedin_url : `https://${ap.linkedin_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Linkedin className="mr-1.5 h-4 w-4" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                    </>
                  );
                }}
              />
            )}

            <div className="mt-auto">
              {selectedAssociate ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">
                    <span className="font-semibold">{selectedAssociate.first_name} {selectedAssociate.last_name}</span> will manage your {pkg.code_name} package.
                  </span>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  Pick a mentor above — they'll handle every part of your package.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible: Buy single products (scorporo) + Extensions (add-ons) */}
      <Accordion type="multiple" className="space-y-3">
        <AccordionItem value="create" className="rounded-lg border-none backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
          <AccordionTrigger className="px-6 py-3 hover:no-underline bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20">
            <div className="flex items-center gap-3 text-left">
              <Plus className="h-5 w-5 text-primary" />
              <div>
                <span className="text-xl font-bold text-primary">Buy single products</span>
                <p className="text-sm text-muted-foreground mt-0.5">Prefer to mix &amp; match? Add individual products at list price — even just one.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <div className="grid gap-4 md:grid-cols-3">
              {singles.map((service) => {
                const previewImg = getPreviewImage?.(service.name);
                const showDemo = hasDemo?.(service.name);
                return (
                  <Card key={service.id} className="group flex flex-col overflow-hidden border-primary/10 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                    <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-primary/15 to-secondary/15">
                      {previewImg ? (
                        <>
                          <img src={previewImg} alt={service.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon className="h-12 w-12 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-primary text-primary-foreground font-bold shadow">€{Number(service.price).toFixed(2)}</Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base leading-snug">{service.name}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-2 pt-0">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 border-primary/20 hover:border-primary/50 hover:bg-primary/5 hover:text-primary" onClick={() => onShowInfo(service)}>
                          <Info className="mr-1.5 h-3.5 w-3.5" />
                          Details
                        </Button>
                        {showDemo && (
                          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-primary/30 hover:border-primary hover:bg-primary/10" title="Download example PDF" onClick={() => onDownloadPdf(service.name, pkg.category)}>
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                      <Button className="w-full bg-gradient-to-r from-primary to-secondary font-semibold shadow-md hover:opacity-90" onClick={() => onSelectService(service)}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {addonComponents.length > 0 && (
          <AccordionItem value="extensions" className="rounded-lg border-none backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
            <AccordionTrigger className="px-6 py-3 hover:no-underline bg-gradient-to-r from-secondary/10 to-transparent hover:from-secondary/20">
              <div className="flex items-center gap-3 text-left">
                <Sparkles className="h-5 w-5 text-secondary" />
                <div>
                  <span className="text-xl font-bold text-secondary">Extensions</span>
                  <p className="text-sm text-muted-foreground mt-0.5">Optional add-ons to supercharge your {pkg.code_name}.</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2 space-y-4">
              {addonComponents.map((comp) => {
                const svc = comp.service;
                if (!svc) return null;
                const isOutreach = comp.addon_type === "outreach";
                return (
                  <Card key={comp.id} className="group flex flex-col overflow-hidden border-secondary/20 transition-all hover:border-secondary/50 hover:shadow-xl md:flex-row">
                    <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-secondary/15 to-primary/15 md:h-auto md:w-56 md:shrink-0">
                      {getPreviewImage?.(svc.name) ? (
                        <>
                          <img src={getPreviewImage(svc.name)} alt={svc.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent md:bg-gradient-to-r" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Users className="h-12 w-12 text-secondary/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{comp.label || svc.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{svc.description}</p>
                        </div>
                        <Badge className="bg-secondary text-secondary-foreground font-bold shadow shrink-0">
                          {isOutreach ? `€${Number(comp.addon_price).toFixed(0)}/interview` : `+€${Number(comp.addon_price).toFixed(0)}`}
                        </Badge>
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
                        {isOutreach ? (
                          <><Sparkles className="h-3.5 w-3.5" />€0 upfront — you only pay per interview secured.</>
                        ) : (
                          <><Users className="h-3.5 w-3.5" />Includes a 2nd university &amp; a 2nd Associate — you'll pick both in the next step.</>
                        )}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        <Button variant="outline" size="sm" className="border-secondary/30 hover:bg-secondary/5 hover:text-secondary" onClick={() => onShowInfo(svc)}>
                          <Info className="mr-1.5 h-3.5 w-3.5" />
                          Details
                        </Button>
                        {hasDemo?.(svc.name) && (
                          <Button variant="outline" size="sm" className="border-secondary/30 hover:bg-secondary/5 hover:text-secondary" onClick={() => onDownloadPdf(svc.name, pkg.category)}>
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Demo
                          </Button>
                        )}
                        <Button
                          className="ml-auto bg-gradient-to-r from-secondary to-primary font-semibold shadow-md hover:opacity-90"
                          onClick={() => (isOutreach ? addOutreachAddon(comp) : onSelectService(svc))}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Add Extension
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
      </div>
      {/* ===================== END DESKTOP layout ===================== */}

      {/* Package info popup (shared by mobile + desktop) */}
      <Dialog open={packageInfoOpen} onOpenChange={setPackageInfoOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{pkg.code_name} Package — what's included</DialogTitle>
            <DialogDescription>Everything in the €{fullPrice.toFixed(0)} package, explained.</DialogDescription>
          </DialogHeader>
          <ul className="mt-2 space-y-4">
            {coreComponents.map((comp) => (
              <li key={comp.id} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">{comp.label || comp.service?.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{comp.service?.description}</p>
                </div>
              </li>
            ))}
            {pkg.bullets?.map((b) => (
              <li key={b.label} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary/60" />
                <div>
                  <p className="font-semibold text-foreground">
                    {b.label}
                    {isWhatsAppBullet(b.label) && <WhatsAppMark />}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.info}</p>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Associate "Overview" popup — a dynamic bio built from filled fields */}
      <Dialog open={!!bioAssociate} onOpenChange={(open) => !open && setBioAssociate(null)}>
        <DialogContent className="max-w-md">
          {bioAssociate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                    {bioAssociate.photo_url ? (
                      <img
                        src={bioAssociate.photo_url}
                        alt={`${bioAssociate.first_name} ${bioAssociate.last_name}`}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <span className="text-lg font-semibold">
                        {(bioAssociate.first_name?.[0] ?? "").toUpperCase()}
                        {(bioAssociate.last_name?.[0] ?? "").toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl">
                      {bioAssociate.first_name} {bioAssociate.last_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs">Associate overview</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <p className="mt-1 text-base leading-relaxed text-foreground">
                {buildAssociateBio(bioAssociate)}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageExperience;
