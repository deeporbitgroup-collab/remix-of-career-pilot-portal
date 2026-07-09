import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, ExternalLink, Eye, Loader2, ShieldCheck, Send, Check } from "lucide-react";

const TIER = "Internship Placement";

interface Props {
  studentName?: string;
  studentEmail?: string;
}

// Prep Material tab, three sections shown to the student, in order:
//   1) CareerPilot   — our own Knowledge Base BUNDLES (bought via KB checkout)
//   2) CareerBoost   — partner services (request-based, "Send Request")
//   3) LanguageBoost — partner services (request-based, "Send Request")
//
// Partner services live in `tp_partner_services` and are admin-editable from the
// Crew Portal. Tapping "Send Request" fires the send-prep-material-request edge
// function (emails the student, the team and the partner) — no inline checkout.
const TalentPoolPrepMaterial = ({ studentName, studentEmail }: Props) => {
  const { toast } = useToast();

  // CareerPilot (kb_products). We load ALL active tier products (not just bundles)
  // so we can resolve child names + aggregate overview images, but only display bundles.
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  // Partner services (CareerBoost + LanguageBoost).
  const [partnerServices, setPartnerServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Demo overview dialog.
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewImages, setOverviewImages] = useState<string[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewTitle, setOverviewTitle] = useState("");

  // Send Request state.
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [kb, partners] = await Promise.all([
          (supabase as any)
            .from("kb_products")
            .select("id, title, description, price, category, is_bundle, bundle_product_ids, overview_images")
            .eq("is_active", true)
            .eq("tier", TIER)
            .order("created_at", { ascending: true }),
          (supabase as any)
            .from("tp_partner_services")
            .select("id, partner, title, description, target_level, price_unit, price, lessons, total_price, has_guarantee")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);
        const all = kb.data || [];
        setAllProducts(all);
        setBundles(all.filter((p: any) => p.is_bundle));
        setPartnerServices(partners.data || []);
      } catch (e) {
        console.error("Error loading prep material:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openPurchase = (productId: string) => {
    window.open(`/knowledge-base?tier=${encodeURIComponent(TIER)}&product=${productId}`, "_blank", "noopener,noreferrer");
  };

  const bundleChildNames = (bundle: any): string[] =>
    (bundle.bundle_product_ids || [])
      .map((id: string) => allProducts.find((p: any) => p.id === id)?.title)
      .filter(Boolean);

  const overviewPaths = (bundle: any): string[] => {
    if (bundle.overview_images?.length) return bundle.overview_images;
    const children = allProducts.filter((p: any) => bundle.bundle_product_ids?.includes(p.id));
    return children.flatMap((c: any) => c.overview_images || []);
  };

  const openOverview = async (bundle: any) => {
    const paths = overviewPaths(bundle);
    if (!paths.length) return;
    setOverviewTitle(bundle.title);
    setOverviewImages([]);
    setOverviewLoading(true);
    setOverviewOpen(true);
    const urls: string[] = [];
    for (const p of paths) {
      const { data } = await (supabase as any).storage.from("kb-assets").createSignedUrl(p, 600);
      if (data?.signedUrl) urls.push(data.signedUrl);
    }
    setOverviewImages(urls);
    setOverviewLoading(false);
  };

  // Human-readable price label for a partner service.
  const priceLabel = (s: any): string => {
    if (s.price_unit === "per_lesson") {
      if (!s.total_price || !s.lessons) return "Price on request";
      const per = Math.round(Number(s.total_price) / Number(s.lessons));
      return `€${per} / lesson · ${s.lessons} lessons · €${Number(s.total_price).toFixed(0)} total`;
    }
    return s.price != null ? `€${Number(s.price).toFixed(0)}` : "Price on request";
  };

  const sendRequest = async (s: any) => {
    if (!studentEmail) {
      toast({
        title: "Profile incomplete",
        description: "We couldn't find your email. Please complete your profile and try again.",
        variant: "destructive",
      });
      return;
    }
    setSendingId(s.id);
    try {
      const { error } = await supabase.functions.invoke("send-prep-material-request", {
        body: {
          studentName,
          studentEmail,
          partner: s.partner,
          serviceTitle: s.title,
          priceLabel: priceLabel(s),
          targetLevel: s.target_level || undefined,
        },
      });
      if (error) throw error;
      setRequested((prev) => new Set(prev).add(s.id));
      toast({
        title: "Request sent ✓",
        description: "We've emailed you a confirmation. Our team will contact you shortly.",
      });
    } catch (e: any) {
      console.error("send-prep-material-request error:", e);
      toast({
        title: "Something went wrong",
        description: "Your request couldn't be sent. Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  const careerBoost = partnerServices.filter((s) => s.partner === "CareerBoost");
  const languageBoost = partnerServices.filter((s) => s.partner === "LanguageBoost");

  // Shared carousel/grid wrapper: grid on desktop, horizontal snap-scroll on mobile.
  const carouselClass =
    "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:-mx-1 max-md:px-1 max-md:pb-2 max-md:[&>*]:w-[82vw] max-md:[&>*]:shrink-0 max-md:[&>*]:snap-center";

  const SectionHeading = ({ label, subtitle }: { label: string; subtitle: string }) => (
    <div className="mb-3">
      <h3 className="text-base font-extrabold tracking-tight">{label}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );

  const PartnerCard = ({ s }: { s: any }) => {
    const isRequested = requested.has(s.id);
    const isSending = sendingId === s.id;
    return (
      <div className="flex flex-col rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold leading-tight">{s.title}</p>
          {s.has_guarantee && (
            <Badge variant="outline" className="shrink-0 gap-1 border-emerald-500/40 text-emerald-600">
              <ShieldCheck className="h-3 w-3" /> Guarantee
            </Badge>
          )}
        </div>
        {s.target_level && <p className="mt-1 text-xs font-medium text-primary">{s.target_level}</p>}
        <div className="mt-1">
          {s.price_unit === "per_lesson" && s.total_price && s.lessons ? (
            <>
              <span className="text-2xl font-extrabold text-primary">
                €{Math.round(Number(s.total_price) / Number(s.lessons))}
              </span>
              <span className="text-sm font-semibold text-muted-foreground"> / lesson</span>
              <p className="text-xs text-muted-foreground">
                {s.lessons} individual lessons · €{Number(s.total_price).toFixed(0)} total
              </p>
            </>
          ) : s.price_unit === "flat" && s.price != null ? (
            <span className="text-2xl font-extrabold text-primary">€{Number(s.price).toFixed(0)}</span>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">Price on request</span>
          )}
        </div>
        {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}

        <div className="mt-auto pt-4">
          <Button
            className="w-full"
            disabled={isSending || isRequested}
            onClick={() => sendRequest(s)}
          >
            {isRequested ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Request sent
              </>
            ) : isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Send Request
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Prep Material
        </CardTitle>
        <p className="text-sm text-steel-gray">
          Ready-made preparation from Career Pilot and our partners — browse the packages, preview the demos, and get what you need.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading materials…</p>
        ) : (
          <>
            {/* ============ 1) CAREERPILOT ============ */}
            {bundles.length > 0 && (
              <section>
                <SectionHeading
                  label="CareerPilot"
                  subtitle="Our ready-made packages — add to cart and check out on the Knowledge Base."
                />
                <div className={carouselClass}>
                  {bundles.map((b) => {
                    const names = bundleChildNames(b);
                    const hasOverview = overviewPaths(b).length > 0;
                    return (
                      <div key={b.id} className="flex flex-col rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-base font-bold leading-tight">{b.title}</p>
                          <Badge className="shrink-0">📦 Bundle</Badge>
                        </div>
                        <div className="mt-1">
                          <span className="text-2xl font-extrabold text-primary">€{Number(b.price).toFixed(0)}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>

                        {names.length > 0 && (
                          <div className="mt-3 rounded-lg bg-muted/50 p-3">
                            <p className="text-xs font-semibold text-foreground">Includes:</p>
                            <ul className="mt-1 list-disc list-inside space-y-0.5">
                              {names.map((name, i) => (
                                <li key={i} className="text-sm text-muted-foreground">{name}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-auto flex flex-col gap-2 pt-4">
                          {hasOverview && (
                            <Button variant="outline" className="w-full" onClick={() => openOverview(b)}>
                              <Eye className="mr-2 h-4 w-4" /> Overview
                            </Button>
                          )}
                          <Button className="w-full" onClick={() => openPurchase(b.id)}>
                            Get it <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ============ 2) CAREERBOOST ============ */}
            {careerBoost.length > 0 && (
              <section>
                <SectionHeading
                  label="CareerBoost.it"
                  subtitle="Mock interviews with finance professionals — tap Send Request and we'll get in touch."
                />
                <div className={carouselClass}>
                  {careerBoost.map((s) => <PartnerCard key={s.id} s={s} />)}
                </div>
              </section>
            )}

            {/* ============ 3) LANGUAGEBOOST ============ */}
            {languageBoost.length > 0 && (
              <section>
                <SectionHeading
                  label="LanguageBoost"
                  subtitle="Individual language courses, price per lesson — tap Send Request and we'll get in touch."
                />
                <div className={carouselClass}>
                  {languageBoost.map((s) => <PartnerCard key={s.id} s={s} />)}
                </div>
              </section>
            )}

            {bundles.length === 0 && partnerServices.length === 0 && (
              <p className="text-sm text-muted-foreground">No prep material available yet.</p>
            )}

            <p className="text-xs text-muted-foreground md:hidden">
              Swipe right in each section to see more · CareerPilot purchases open in a new tab so you stay here.
            </p>
          </>
        )}
      </CardContent>

      {/* Demo overview images (same experience as the Knowledge Base) */}
      <Dialog open={overviewOpen} onOpenChange={setOverviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{overviewTitle || "Package Overview"}</DialogTitle>
          </DialogHeader>
          {overviewLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : overviewImages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No preview available for this package.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {overviewImages.map((url, i) => (
                <img key={i} src={url} alt={`Overview ${i + 1}`} className="w-full rounded-lg border" />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TalentPoolPrepMaterial;
