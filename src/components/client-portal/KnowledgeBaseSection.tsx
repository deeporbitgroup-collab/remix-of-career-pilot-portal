import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, BookOpen, Lock, Package, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sb = supabase as any;

interface KnowledgeBaseSectionProps {
  clientId: string;
}

interface BundleProduct {
  id: string;
  title: string;
  asset_storage_path: string | null;
  asset_filename: string | null;
  category: string;
}

const KnowledgeBaseSection = ({ clientId }: KnowledgeBaseSectionProps) => {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [bundleProducts, setBundleProducts] = useState<Record<string, BundleProduct[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, [clientId]);

  const fetchPurchases = async () => {
    const { data } = await sb
      .from("kb_client_access")
      .select("*, kb_products(id, title, description, category, asset_storage_path, asset_filename, is_bundle, bundle_product_ids), kb_orders(payment_status, created_at)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    
    const purchaseData = data || [];
    setPurchases(purchaseData);

    // For bundles, fetch the individual products
    const bundleMap: Record<string, BundleProduct[]> = {};
    for (const p of purchaseData) {
      if (p.kb_products?.is_bundle && p.kb_products?.bundle_product_ids?.length > 0) {
        const { data: childProducts } = await sb
          .from("kb_products")
          .select("id, title, asset_storage_path, asset_filename, category")
          .in("id", p.kb_products.bundle_product_ids);
        bundleMap[p.id] = childProducts || [];
      }
    }
    setBundleProducts(bundleMap);
    setLoading(false);
  };

  const downloadAsset = async (storagePath: string, filename: string) => {
    try {
      // Use signed URL for reliable downloads from private bucket
      const { data, error } = await sb.storage.from("kb-assets").createSignedUrl(storagePath, 300);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Could not generate download link");
      
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Download error:", e);
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return (
    <Card className="backdrop-blur-sm bg-background/90">
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );

  if (purchases.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Knowledge Base</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your purchased guides, templates, and resources
                </p>
              </div>
            </div>
          </div>
          <CardContent className="py-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No materials yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Browse the full Knowledge Base store — guides, templates and bundles across every tier — to accelerate your journey.
              </p>
              <Button onClick={() => window.location.href = "/knowledge-base"}>
                <BookOpen className="mr-2 h-4 w-4" />
                Browse full store
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header — full store entry (all tiers) + purchased library below */}
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Knowledge Base</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse the full store and access your purchased materials
                </p>
              </div>
            </div>
            <Button onClick={() => window.location.href = "/knowledge-base"}>
              <BookOpen className="mr-2 h-4 w-4" />
              Browse full store
            </Button>
          </div>
        </div>
      </Card>

      <Card className="backdrop-blur-sm bg-background/90">
        <CardContent className="space-y-3 pt-6">
          {purchases.map((p: any) => {
            const approved = p.kb_orders?.payment_status === "approved";
            const blocked = p.is_blocked;
            const isBundle = p.kb_products?.is_bundle;
            const children = bundleProducts[p.id] || [];

            return (
              <div key={p.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isBundle ? <Package className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                      <span className="font-medium">{p.kb_products?.title}</span>
                      <Badge variant="outline" className="text-xs">{p.kb_products?.category}</Badge>
                      {isBundle && <Badge variant="secondary" className="text-xs">Bundle</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Purchased: {new Date(p.kb_orders?.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    {blocked ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Blocked
                      </Badge>
                    ) : !approved ? (
                      <Badge variant="secondary">Payment Pending</Badge>
                    ) : !isBundle && p.kb_products?.asset_storage_path ? (
                      <Button size="sm" onClick={() => downloadAsset(p.kb_products.asset_storage_path, p.kb_products.asset_filename || "download")}>
                        <Download className="mr-1 h-4 w-4" /> Download
                      </Button>
                    ) : !isBundle ? (
                      <Badge variant="secondary">No file</Badge>
                    ) : null}
                  </div>
                </div>

                {/* Bundle children - show individual files */}
                {isBundle && approved && !blocked && children.length > 0 && (
                  <div className="border-t border-border bg-background/50 px-3 py-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Included materials:</p>
                    {children.map((child) => (
                      <div key={child.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{child.title}</span>
                        </div>
                        {child.asset_storage_path ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => downloadAsset(child.asset_storage_path!, child.asset_filename || "download")}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" /> Download
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No file</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-xs text-destructive mt-4 font-medium">
            ⚠️ It is strictly forbidden to share these materials with third parties or publish them externally. All content is personal and confidential.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeBaseSection;
