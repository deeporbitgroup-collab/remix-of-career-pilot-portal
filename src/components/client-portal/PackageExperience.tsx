import { useMemo, useState, useRef, useEffect } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
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
  Loader2,
  ChevronDown,
} from "lucide-react";
import AssociateChoiceCarousel from "./AssociateChoiceCarousel";
import CoveredLogos from "./CoveredLogos";
import PartnerMaterials from "./PartnerMaterials";
import { zipFiles, type ZipEntry } from "@/lib/zipFiles";
import whatsappLogo from "@/assets/whatsapp-logo.png";

// The package's "Study Plan" bullet reads richer than the raw DB label: it
// promises the month-by-month plan plus access to discounted partner resources.
// The text wraps inside the card (it's never truncated), so it stays readable
// without breaking the layout.
const displayBulletLabel = (label: string): string =>
  /study plan/i.test(label)
    ? "Study plan month by month, with access to our best discounted resources"
    : label;

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
  /** Resolve a demo PDF path so all demos can be bundled into one .zip. */
  getDemoPdfPath?: (name: string, category: string) => string | null;
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
  getDemoPdfPath,
  getPreviewImage,
  hasDemo,
}: PackageExperienceProps) => {
  const [associateFilter, setAssociateFilter] = useState("");
  const [selectedAssociateId, setSelectedAssociateId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [packageInfoOpen, setPackageInfoOpen] = useState(false);
  const [bioAssociate, setBioAssociate] = useState<AssociatePreview | null>(null);
  // Optional add-ons now live *inside* the package (no separate section). Each is
  // a checkbox, OFF by default; selecting one bumps the displayed total.
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  // Comparative analysis is run by two specialists (one per university), so when
  // it's selected we force a *second* Associate dedicated to the comparison.
  const [secondAssociateId, setSecondAssociateId] = useState<string | null>(null);
  // Mobile 2nd-Associate picker: first pick the comparison university/master
  // from a dropdown, then pick an Associate from that school.
  const [secondUniFilter, setSecondUniFilter] = useState("");
  // Mobile: the Associate picker opens in a focused bottom sheet behind a real
  // pill CTA (replaces the old grey segmented tab).
  const [associateSheetOpen, setAssociateSheetOpen] = useState(false);
  // Mobile "download all demos" button — disabled while the batch runs.
  const [downloadingDemos, setDownloadingDemos] = useState(false);

  // Desktop: nudge the user to scroll the package details when there's more below.
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const update = () => {
      const moreBelow = el.scrollHeight - el.scrollTop - el.clientHeight > 12;
      setShowScrollHint(el.scrollHeight > el.clientHeight + 12 && moreBelow);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

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

  const isOutreachAddon = (c: PackageComponent) => c.addon_type === "outreach";
  const isComparativeAddon = (c: PackageComponent) => c.addon_type === "comparative";

  // Is at least one comparative add-on selected? That's what forces a 2nd Associate.
  const comparativeSelected = useMemo(
    () => addonComponents.some((c) => isComparativeAddon(c) && selectedAddons.has(c.id)),
    [addonComponents, selectedAddons]
  );

  // Surcharge for selected add-ons. Outreach add-ons are €0 upfront (billed per
  // result), so they never move the package total.
  const addonSurcharge = useMemo(
    () =>
      addonComponents.reduce(
        (sum, c) =>
          selectedAddons.has(c.id) && !isOutreachAddon(c) ? sum + Number(c.addon_price || 0) : sum,
        0
      ),
    [addonComponents, selectedAddons]
  );

  const total = useMemo(
    () =>
      includedCore.reduce((sum, c) => sum + Number(c.internal_price) * c.quantity, 0) + addonSurcharge,
    [includedCore, addonSurcharge]
  );
  const fullPrice = Number(pkg.price);

  const toggleAddon = (comp: PackageComponent, on: boolean) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (on) next.add(comp.id);
      else next.delete(comp.id);
      return next;
    });
    // Dropping the last comparative add-on clears the now-pointless 2nd Associate.
    if (!on && isComparativeAddon(comp)) {
      setSecondAssociateId(null);
      setSecondUniFilter("");
    }
  };

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

  // The second Associate (comparison university specialist) and the list of
  // candidates for it — anyone except the already-chosen primary Associate.
  const secondAssociate = useMemo(
    () => associates.find((a) => a.id === secondAssociateId) || null,
    [associates, secondAssociateId]
  );
  // Associates whose university / master / sector matches a chosen value — used
  // by the mobile 2nd-Associate picker (pick the comparison school, then its
  // Associate) so the user never scrolls one long flat list.
  const associatesForValue = (val: string): AssociatePreview[] => {
    const q = val.trim().toLowerCase();
    if (!q) return [];
    return matchableAssociates.filter((a) => {
      const vals =
        filterMode === "master"
          ? [a.master_program]
          : filterMode === "sector"
          ? [a.sector, a.sector_2]
          : [a.university, a.university_2];
      return vals.some((v) => (v || "").toLowerCase().includes(q));
    });
  };

  // Desktop comparative: the right-hand carousel selects up to TWO Associates
  // (one per university). Removing the primary promotes the second so the slots
  // never end up out of order. Non-comparative stays single-select.
  const handleAssociateToggle = (id: string) => {
    if (!comparativeSelected) {
      setSelectedAssociateId((prev) => (prev === id ? null : id));
      return;
    }
    if (selectedAssociateId === id) {
      setSelectedAssociateId(secondAssociateId);
      setSecondAssociateId(null);
      return;
    }
    if (secondAssociateId === id) {
      setSecondAssociateId(null);
      return;
    }
    if (!selectedAssociateId) setSelectedAssociateId(id);
    else setSecondAssociateId(id); // fills the 2nd slot (or replaces it when full)
  };
  const comparativeCount = (selectedAssociateId ? 1 : 0) + (secondAssociateId ? 1 : 0);

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
    if (comparativeSelected && !secondAssociate) {
      toast.info("Comparative analysis needs a second Associate for your comparison university.");
      setAssociateSheetOpen(true);
      return;
    }
    if (comparativeSelected && secondAssociate?.id === selectedAssociate.id) {
      toast.info("Your second Associate must be different from the first.");
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

    // Selected optional add-ons. Comparative goes to the 2nd Associate (its own
    // university specialist), outreach is billed per result (€0 upfront), and any
    // other add-on stays with the primary Associate.
    addonComponents.forEach((comp) => {
      if (!comp.service || !selectedAddons.has(comp.id)) return;
      const comparative = isComparativeAddon(comp);
      const outreach = isOutreachAddon(comp);
      const addonAssociate = comparative ? secondAssociate : outreach ? null : selectedAssociate;
      const addonService: Service = {
        ...comp.service,
        price: outreach ? 0 : Number(comp.addon_price || 0),
      };
      const addonMatch =
        comparative && secondAssociate ? associateMatchLabel(secondAssociate) : matchValue;
      onAddToCart({
        id: `${groupId}-${comp.id}-addon`,
        service: addonService,
        associate: addonAssociate
          ? {
              id: addonAssociate.id,
              first_name: addonAssociate.first_name,
              last_name: addonAssociate.last_name,
            }
          : null,
        university: filterMode === "sector" ? undefined : addonMatch,
        sector: filterMode === "sector" ? addonMatch : undefined,
        packageGroupId: groupId,
        packageName,
        packageRole: "addon",
      });
    });

    toast.success(`${pkg.code_name} package added to cart!`);
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const safeFileName = (name: string) =>
    name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();

  // Bundle every demo/sample PDF for this vertical into a SINGLE .zip and
  // download it — one file, so it works reliably everywhere (iOS Safari
  // included). Falls back to staggered one-by-one downloads if the paths can't
  // be resolved for any reason.
  const downloadAllDemos = async () => {
    if (downloadingDemos || demoPdfNames.length === 0) return;
    setDownloadingDemos(true);
    try {
      const paths = getDemoPdfPath
        ? demoPdfNames
            .map((name) => ({ name, path: getDemoPdfPath(name, pkg.category) }))
            .filter((x): x is { name: string; path: string } => !!x.path)
        : [];

      if (paths.length === 0) {
        // Fallback: trigger each via the single-file handler, staggered.
        toast.success(`Downloading ${demoPdfNames.length} demo PDFs…`);
        for (let i = 0; i < demoPdfNames.length; i++) {
          onDownloadPdf(demoPdfNames[i], pkg.category);
          if (i < demoPdfNames.length - 1) await new Promise((r) => setTimeout(r, 800));
        }
        return;
      }

      toast.success(
        paths.length === 1
          ? "Downloading the demo PDF…"
          : `Preparing a zip with all ${paths.length} demo PDFs…`
      );

      const entries: ZipEntry[] = [];
      const usedNames = new Set<string>();
      for (const { name, path } of paths) {
        const res = await fetch(path);
        if (!res.ok) continue;
        const data = new Uint8Array(await res.arrayBuffer());
        let fileName = `${safeFileName(name)}.pdf`;
        let n = 2;
        while (usedNames.has(fileName.toLowerCase())) fileName = `${safeFileName(name)} (${n++}).pdf`;
        usedNames.add(fileName.toLowerCase());
        entries.push({ name: fileName, data });
      }

      if (entries.length === 0) {
        toast.error("Couldn't load the demo files. Please try again.");
        return;
      }

      if (entries.length === 1) {
        triggerBlobDownload(new Blob([entries[0].data], { type: "application/pdf" }), entries[0].name);
      } else {
        triggerBlobDownload(zipFiles(entries), `${safeFileName(pkg.code_name)} demos.zip`);
        toast.success(`${entries.length} demo PDFs downloaded as a zip.`);
      }
    } catch (e) {
      console.error("download all demos failed", e);
      toast.error("Couldn't download the demos. Please try again.");
    } finally {
      setDownloadingDemos(false);
    }
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
    <li
      key={b.label}
      className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5 text-sm leading-snug shadow-sm"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className="flex-1 font-medium text-foreground/90">
        {displayBulletLabel(b.label)}
        {isWhatsAppBullet(b.label) && <WhatsAppMark />}
      </span>
    </li>
  );

  // Optional add-on row — a clean, compact checkbox that lives inside the package
  // (no separate add-ons section). OFF by default; the price sits on the right.
  const renderAddonRow = (comp: PackageComponent) => {
    const on = selectedAddons.has(comp.id);
    const outreach = isOutreachAddon(comp);
    const label = comp.label || comp.service?.name || "Add-on";
    const priceTag = outreach
      ? `€${Number(comp.addon_price || 0).toFixed(0)}/interview`
      : `+€${Number(comp.addon_price || 0).toFixed(0)}`;
    return (
      <li
        key={comp.id}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm leading-snug transition-colors",
          on
            ? "bg-secondary/10 ring-1 ring-secondary/40"
            : "bg-muted/40 ring-1 ring-border/40 hover:ring-secondary/30"
        )}
      >
        <Checkbox
          checked={on}
          onCheckedChange={(c) => toggleAddon(comp, !!c)}
          className="h-4 w-4 shrink-0 rounded-[5px]"
          aria-label={`Add ${label}`}
        />
        <span className={cn("flex-1 font-medium", on ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-secondary">
          {priceTag}
        </span>
      </li>
    );
  };

  // Shown whenever a comparative add-on is selected: an elegant, minimal note
  // explaining *why* a second Associate is required, plus the picker for it.
  const renderSecondAssociatePicker = () => {
    if (!comparativeSelected) return null;
    const schoolWord = filterMode === "master" ? "master" : filterMode === "sector" ? "sector" : "university";
    const secondCandidates = associatesForValue(secondUniFilter).filter((a) => a.id !== selectedAssociateId);
    return (
      <div className="space-y-2 rounded-xl border border-secondary/40 bg-secondary/5 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
            <Users className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">A second Associate for your comparison</p>
            <p className="text-xs leading-snug text-muted-foreground">
              A comparison looks at two {schoolWord === "sector" ? "sectors" : schoolWord === "master" ? "programs" : "universities"}, each
              analysed by an Associate who was actually there. Pick the comparison {schoolWord}, then its Associate.
            </p>
          </div>
        </div>
        {/* Step 1 — choose the comparison school/master from a clean dropdown */}
        <Select
          value={secondUniFilter || ""}
          onValueChange={(v) => {
            setSecondUniFilter(v);
            setSecondAssociateId(null);
          }}
        >
          <SelectTrigger className="h-9 w-full border-secondary/30 text-sm">
            <SelectValue placeholder={`Choose the comparison ${schoolWord}`} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {availableValues.map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Step 2 — choose the Associate from that school */}
        {secondUniFilter && (
          <Select value={secondAssociateId || ""} onValueChange={(v) => setSecondAssociateId(v || null)}>
            <SelectTrigger className="h-9 w-full border-secondary/30 text-sm">
              <SelectValue placeholder="Choose the Associate" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {secondCandidates.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No other Associate for this {schoolWord}.</div>
              ) : (
                secondCandidates.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.first_name} {a.last_name}
                    {associateMatchLabel(a) ? ` · ${associateMatchLabel(a)}` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  return (
    <div style={accentStyle}>
      {/* ===================== MOBILE compact layout ===================== */}
      {/* One tight card read at a glance: name → price → included & optional
          services. The Associate picker lives behind a real pill CTA that opens
          a focused bottom sheet, so the card itself stays short and scannable. */}
      <div className="md:hidden flex w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-2xl border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-sm">
        {/* Name + price — the two things that matter most, side by side up top */}
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold uppercase leading-tight tracking-wide text-primary">
              <span className="inline-block border-b-2 border-secondary pb-0.5">{pkg.code_name}</span>
            </h2>
            <p className="truncate text-[11px] text-foreground/60">{pkg.subtitle}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-extrabold leading-none text-primary">€{total.toFixed(0)}</div>
            {total < fullPrice && (
              <div className="text-[11px] text-muted-foreground line-through">€{fullPrice.toFixed(0)}</div>
            )}
            {removed.size > 0 && (
              <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
                Customized
              </span>
            )}
          </div>
        </div>

        {/* Included services + bullets — clean, compact rows (no chunky boxes) */}
        <ul className="flex flex-col gap-0.5">
          {coreComponents.map((comp) => {
            const isRemoved = removed.has(comp.id);
            const label = comp.label || comp.service?.name || "Component";
            return (
              <li key={comp.id} className="flex items-center gap-2.5 px-1 py-1.5 text-[13px] leading-snug">
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
                    className="h-4 w-4 shrink-0 rounded-[5px]"
                    aria-label={`Toggle ${label}`}
                  />
                ) : (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
                <span className={cn("flex-1 font-medium text-foreground/90", isRemoved && "text-muted-foreground line-through")}>
                  {label}
                </span>
              </li>
            );
          })}
          {(pkg.bullets || []).map((b) => (
            <li key={b.label} className="flex items-start gap-2.5 px-1 py-1.5 text-[13px] leading-snug">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className="flex-1 font-medium text-foreground/90">
                {displayBulletLabel(b.label)}
                {isWhatsAppBullet(b.label) && <WhatsAppMark />}
              </span>
            </li>
          ))}
        </ul>

        {/* Partner materials — logos + names, right under the bullets */}
        <PartnerMaterials />

        {/* Optional add-ons — now inside the package, OFF by default */}
        {addonComponents.length > 0 && (
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Optional add-ons
            </p>
            <ul className="flex flex-col gap-1.5">
              {addonComponents.map((comp) => (comp.service ? renderAddonRow(comp) : null))}
            </ul>
            {comparativeSelected && <div className="pt-0.5">{renderSecondAssociatePicker()}</div>}
          </div>
        )}

        {/* Associate + cart — ONE combined CTA while nothing is picked: the
            avatar stack signals "many mentors to choose from" and the cart
            icon signals "this is the way to the cart". Once a mentor is
            chosen it splits into a Change pill + an Add-to-cart button. */}
        {!selectedAssociate ? (
          <button
            type="button"
            onClick={() => setAssociateSheetOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-secondary px-3.5 py-3 text-left text-primary-foreground shadow-md transition-transform active:scale-[0.99]"
          >
            {/* People graphic — real associate faces */}
            <span className="flex shrink-0 -space-x-2.5">
              {associates.slice(0, 4).map((a, i) => (
                <span
                  key={a.id ?? i}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[10px] font-bold ring-2 ring-white"
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
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold leading-tight">Choose your Associate</span>
              <span className="block text-[11px] font-medium text-primary-foreground/85">
                Required to add to cart
              </span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <ShoppingCart className="h-4 w-4" />
            </span>
          </button>
        ) : (
          <>
            {/* Selected associate — pill that re-opens the picker to change */}
            <button
              type="button"
              onClick={() => setAssociateSheetOpen(true)}
              className="flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {selectedAssociate.photo_url ? (
                  <img src={selectedAssociate.photo_url} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  <>
                    {(selectedAssociate.first_name?.[0] ?? "").toUpperCase()}
                    {(selectedAssociate.last_name?.[0] ?? "").toUpperCase()}
                  </>
                )}
              </span>
              <span className="flex-1 text-left leading-tight line-clamp-2">
                {selectedAssociate.first_name} {selectedAssociate.last_name}
                {comparativeSelected && (
                  <span className="block truncate text-[11px] font-normal text-muted-foreground">
                    {secondAssociate ? `+ ${secondAssociate.first_name} · comparison` : "Pick your 2nd Associate"}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[12px] font-semibold text-primary">Change</span>
            </button>

            {/* Add to cart */}
            <Button
              className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-bold shadow-md"
              onClick={addPackageToCart}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add — €{total.toFixed(0)}
            </Button>
          </>
        )}

        {/* Full details + (optional) download-all-demos — a small, unobtrusive
            secondary row at the very bottom of the card. */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] font-medium text-primary">
          <button
            type="button"
            onClick={() => setPackageInfoOpen(true)}
            className="inline-flex items-center gap-1.5"
          >
            <Info className="h-3.5 w-3.5" /> See full details
          </button>
          {demoPdfNames.length > 0 && (
            <>
              <span aria-hidden="true" className="text-border">•</span>
              <button
                type="button"
                onClick={downloadAllDemos}
                disabled={downloadingDemos}
                className="inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {downloadingDemos ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {downloadingDemos ? "Downloading…" : "Download all demos"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Associate picker — a focused bottom sheet behind the pill CTA.
          Roomy photos (so faces aren't cropped) and one clear card at a time. */}
      <Sheet open={associateSheetOpen} onOpenChange={setAssociateSheetOpen}>
        <SheetContent
          side="bottom"
          style={accentStyle}
          className="md:hidden flex h-[90vh] flex-col gap-0 rounded-t-2xl p-0"
        >
          <SheetHeader className="space-y-1 border-b px-4 py-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                <Users className="h-4 w-4" />
              </span>
              Choose your Associate
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Your mentor already did exactly what you want to do — they run your {pkg.code_name} 1:1.
            </p>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <Select value={associateFilter || "__all__"} onValueChange={(v) => setAssociateFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-9 w-full border-primary/20 text-sm">
                <SelectValue placeholder="Pick from the list" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__all__">All {filterLabel.toLowerCase()}</SelectItem>
                {availableValues.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filteredAssociates.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No associates match yet. Try another filter.
              </p>
            ) : (
              <AssociateChoiceCarousel
                associates={filteredAssociates}
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

            {renderSecondAssociatePicker()}
          </div>

          <div className="border-t p-3">
            <Button
              className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-bold"
              disabled={!selectedAssociate || (comparativeSelected && !secondAssociate)}
              onClick={() => setAssociateSheetOpen(false)}
            >
              {!selectedAssociate
                ? "Select an Associate"
                : comparativeSelected && !secondAssociate
                ? "Pick your 2nd Associate above"
                : `Done — ${selectedAssociate.first_name}`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ===================== DESKTOP layout (unchanged) ===================== */}
      <div className="hidden md:block space-y-3">
      {/* One-screen block: the whole package + associate fit the viewport without
          scrolling; "Buy single products" sits below (revealed on scroll). */}
      <div className="md:flex md:flex-col md:h-[calc(100vh-6rem)] md:gap-3">
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
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:flex-1 md:min-h-0">
        {/* LEFT — Package */}
        <Card className="relative flex flex-col overflow-hidden border-primary/30 bg-card shadow-xl md:min-h-0">
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

          <CardContent className="flex flex-1 flex-col gap-2.5 pb-3 md:min-h-0">
            {/* Scrollable details (only scrolls internally if the content is taller
                than the screen) — price + button stay pinned below. */}
            <div className="relative md:flex-1 md:min-h-0">
            <div ref={detailsRef} className="pkg-scroll flex flex-col gap-2.5 md:h-full md:overflow-y-auto md:pr-2">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5">
              <p className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>What's included</span>
                <span className="font-normal normal-case text-muted-foreground/70">uncheck what you don't want</span>
              </p>
              <ul className="grid grid-cols-1 gap-1.5">
                {coreComponents.map((comp) => {
                  const isRemoved = removed.has(comp.id);
                  const label = comp.label || comp.service?.name || "Component";
                  return (
                    <li key={comp.id}>
                      <div
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm leading-snug shadow-sm transition-colors ${
                          isRemoved
                            ? "border-border/30 bg-muted/20 text-muted-foreground"
                            : comp.is_removable
                            ? "border-border/40 bg-background/80 hover:border-primary/30"
                            : "border-border/40 bg-background/80"
                        }`}
                      >
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
                            className="h-4 w-4 shrink-0"
                            aria-label={`Toggle ${label}`}
                          />
                        ) : (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          </span>
                        )}
                        <span className={`flex-1 font-medium ${isRemoved ? "line-through" : ""}`}>
                          {label}
                          {!comp.is_removable && (
                            <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-primary/70">included</span>
                          )}
                        </span>
                      </div>
                      {isTimelineComponent(comp) && (
                        <ul className="mt-1.5 grid grid-cols-1 gap-1.5 pl-6">
                          {anchorBullets.map(renderBulletRow)}
                        </ul>
                      )}
                    </li>
                  );
                })}
                {trailingBullets.map(renderBulletRow)}
              </ul>

              {/* Partner materials — logos + names, right under the bullets */}
              <PartnerMaterials className="mt-2.5" />

              {/* Optional add-ons — same place as the rest of the services, OFF by
                  default. Selecting one updates the price above live. */}
              {addonComponents.length > 0 && (
                <div className="mt-2.5 border-t border-border/40 pt-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Optional add-ons
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {addonComponents.map((comp) => (comp.service ? renderAddonRow(comp) : null))}
                  </ul>
                </div>
              )}
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
            </div>{/* end scrollable details */}

            {/* Scroll nudge — soft fade + bouncing chevron, shown only while there's
                more of the package to see below; fades out at the bottom. */}
            {showScrollHint && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden flex-col items-center justify-end md:flex">
                <div className="h-12 w-full rounded-b-xl bg-gradient-to-t from-card via-card/85 to-transparent" />
                <div className="-mt-7 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-lg animate-scroll-hint">
                  <ChevronDown className="h-3.5 w-3.5" />
                  Scroll for the full package
                </div>
              </div>
            )}
            </div>{/* end relative details wrapper */}

            {/* Price block — pinned at the bottom of the card, always visible */}
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
        <Card className="relative flex flex-col overflow-hidden border-secondary/30 bg-card shadow-xl md:min-h-0">
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

          <CardContent className="flex flex-1 flex-col gap-2 pb-3 md:min-h-0">
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

            {/* Comparative: turn the picker into a two-Associate selection
                (one specialist per university), with a clear "1 of 2" counter. */}
            {comparativeSelected && (
              <div className="rounded-lg border border-secondary/40 bg-secondary/5 px-3 py-2 text-xs leading-snug">
                <span className="font-semibold text-foreground">Comparative analysis needs two Associates.</span>{" "}
                Each {filterMode === "master" ? "program" : filterMode === "sector" ? "sector" : "university"} is
                reviewed by someone who was actually there — pick a second one.{" "}
                <span className="font-semibold text-secondary">{comparativeCount} of 2 selected</span>
              </div>
            )}

            {/* Scrollable so the associate cards are NEVER cut: on tall screens
                everything shows without scrolling; on short screens this area
                scrolls internally while the footer below stays pinned. */}
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:-mr-1 md:pr-1">
            {filteredAssociates.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No associates match yet. Try another search, or clear the filter.
              </div>
            ) : (
              <AssociateChoiceCarousel
                associates={filteredAssociates}
                fillHeight
                isSelected={(a) =>
                  comparativeSelected
                    ? selectedAssociateId === a.id || secondAssociateId === a.id
                    : selectedAssociateId === a.id
                }
                onToggle={(a) => handleAssociateToggle(a.id)}
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
            </div>{/* end scrollable associate area */}

            <div className="mt-auto">
              {selectedAssociate ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">
                    <span className="font-semibold">{selectedAssociate.first_name} {selectedAssociate.last_name}</span> will manage your {pkg.code_name} package.
                    {comparativeSelected && secondAssociate && (
                      <> Comparison led by <span className="font-semibold">{secondAssociate.first_name} {secondAssociate.last_name}</span>.</>
                    )}
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
      </div>{/* end one-screen block */}

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
                    {displayBulletLabel(b.label)}
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
