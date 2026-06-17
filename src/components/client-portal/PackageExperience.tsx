import { Fragment, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Building2,
  Download,
} from "lucide-react";

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

async function downloadUrlAsFile(url: string) {
  const fileName = (() => {
    try {
      const u = new URL(url);
      return decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "overview.pdf");
    } catch {
      return "overview.pdf";
    }
  })();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

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

  const Icon = categoryIcon[pkg.category] || Plane;
  const packageName = `${pkg.code_name} — ${pkg.subtitle}`;

  // All verticals use the default blue theme (Take Off look) for buttons & text.
  const accentStyle: React.CSSProperties | undefined = undefined;

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

  const downloadAllDemos = () => {
    // Stagger so the browser doesn't drop concurrent downloads.
    demoPdfNames.forEach((name, i) => {
      setTimeout(() => onDownloadPdf(name, pkg.category), i * 400);
    });
    toast.success(`Downloading ${demoPdfNames.length} sample PDF${demoPdfNames.length === 1 ? "" : "s"}…`);
  };

  const total = useMemo(
    () => includedCore.reduce((sum, c) => sum + Number(c.internal_price) * c.quantity, 0),
    [includedCore]
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
    return associates.filter((a) =>
      filterMode === "master"
        ? !!a.master_program
        : filterMode === "sector"
        ? !!(a.sector || a.sector_2)
        : !!(a.university || a.university_2)
    );
  }, [associates, filterMode]);

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

  const handleDownloadOverview = async (e: React.MouseEvent, associate: AssociatePreview) => {
    e.stopPropagation();
    if (!associate.overview_url) return;
    try {
      if (associate.overview_url.includes("/associate-overviews/")) {
        await downloadUrlAsFile(associate.overview_url);
        return;
      }
      const { data, error } = await supabase.functions.invoke("get-associate-overview-url", {
        body: { associateId: associate.id, type: "overview" },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Missing document URL");
      await downloadUrlAsFile(data.url);
    } catch (err) {
      console.error("Error downloading overview:", err);
      toast.error("Failed to download overview");
    }
  };

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
      <span className="flex-1 font-medium text-foreground/90">{b.label}</span>
    </li>
  );

  return (
    <div className="space-y-3" style={accentStyle}>
      {/* Slim category header (keeps the whole experience in one screen) */}
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-background/90 px-4 py-2.5 shadow-lg backdrop-blur-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-primary">{pkg.code_name}</h2>
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
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xl">{pkg.code_name} Package</CardTitle>
              <Badge className="shrink-0 gap-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow">
                <Sparkles className="h-3 w-3" />
                Best value
              </Badge>
            </div>
            <CardDescription className="line-clamp-2 text-xs">{pkg.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-3 pb-4">
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
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAllDemos}
                className="w-full border-primary/30 text-primary hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <Download className="mr-2 h-4 w-4" />
                Download all {pkg.code_name} sample PDFs ({demoPdfNames.length})
              </Button>
            )}

            {/* Price block */}
            <div className="mt-auto rounded-xl border border-primary/20 bg-primary/5 p-3">
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
          <CardHeader className="space-y-1 bg-gradient-to-br from-secondary/10 via-primary/5 to-transparent pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow">
                <Users className="h-4 w-4" />
              </span>
              Choose your Associate
            </CardTitle>
            <CardDescription className="text-xs">
              Your mentor is a student/pro who already did exactly what you want to do — they run your whole package 1:1.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-3">
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

            <div className="grid max-h-[300px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredAssociates.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  No associates match yet. Try another search, or clear the filter.
                </div>
              ) : (
                filteredAssociates.slice(0, 8).map((a) => {
                  const isSelected = selectedAssociateId === a.id;
                  const ml = associateMatchLabel(a);
                  const uni = a.university || a.master_program || "";
                  const sec = a.sector || a.sector_2 || "";
                  const details: { icon: typeof Briefcase; text: string }[] = [];
                  if (uni && uni !== ml) details.push({ icon: GraduationCap, text: uni });
                  if (a.company_name) details.push({ icon: Building2, text: a.company_name });
                  if (sec && sec !== ml) details.push({ icon: Briefcase, text: sec });
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAssociateId(isSelected ? null : a.id)}
                      className={`group relative flex flex-col gap-2 overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
                        isSelected
                          ? "border-2 border-primary bg-gradient-to-br from-primary/10 to-secondary/10 shadow-lg ring-2 ring-primary/30"
                          : "border-border/60 bg-gradient-to-br from-background/80 to-background/40 hover:border-primary/40"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-secondary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                          <Check className="h-3 w-3" />
                          Selected
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-16 w-16 ring-2 ${isSelected ? "ring-primary" : "ring-primary/15 group-hover:ring-primary/40"}`}>
                          <AvatarImage src={a.photo_url || undefined} alt={`${a.first_name} ${a.last_name}`} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-base font-semibold text-primary">
                            {a.first_name?.[0]}
                            {a.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {a.first_name} {a.last_name}
                          </p>
                          {ml && (
                            <span className="mt-0.5 inline-block max-w-full truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {ml}
                            </span>
                          )}
                        </div>
                      </div>
                      {details.length > 0 && (
                        <div className="space-y-0.5 rounded-lg bg-muted/40 px-2 py-1.5">
                          {details.slice(0, 3).map((d, i) => {
                            const DIcon = d.icon;
                            return (
                              <p key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <DIcon className="h-3 w-3 shrink-0 text-primary/70" />
                                <span className="truncate">{d.text}</span>
                              </p>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-auto flex gap-1.5">
                        {a.overview_url && (
                          <span
                            role="button"
                            tabIndex={-1}
                            className="inline-flex h-7 flex-1 items-center justify-center rounded-md border border-primary/20 px-2 text-xs font-medium transition-colors hover:bg-primary/5 hover:text-primary"
                            onClick={(e) => handleDownloadOverview(e, a)}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            Overview
                          </span>
                        )}
                        {a.linkedin_url && (
                          <a
                            href={a.linkedin_url.startsWith("http") ? a.linkedin_url : `https://${a.linkedin_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-7 flex-1 items-center justify-center rounded-md border border-primary/20 px-2 text-xs font-medium transition-colors hover:bg-primary/5 hover:text-primary"
                          >
                            <Linkedin className="mr-1 h-3 w-3" />
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

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
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="create" className="rounded-lg border-none backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
          <AccordionTrigger className="px-6 py-5 hover:no-underline bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20">
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
            <AccordionTrigger className="px-6 py-5 hover:no-underline bg-gradient-to-r from-secondary/10 to-transparent hover:from-secondary/20">
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

      {/* Package info popup */}
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
                  <p className="font-semibold text-foreground">{b.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.info}</p>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageExperience;
