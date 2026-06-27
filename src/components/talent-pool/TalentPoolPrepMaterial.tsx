import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, ExternalLink } from "lucide-react";

const TIER = "Internship Placement";

// Shows the Knowledge Base "Prep Material" products INLINE inside the Talent Pool,
// so the student sees them without navigating away. The actual purchase/checkout
// still happens on the Knowledge Base page (unchanged).
const TalentPoolPrepMaterial = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("kb_products")
          .select("id, title, description, price, category, is_bundle")
          .eq("is_active", true)
          .eq("tier", TIER)
          .order("created_at", { ascending: true });
        setItems(data || []);
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

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Prep Material
        </CardTitle>
        <p className="text-sm text-steel-gray">
          PDF guides, Excel models and ready-made packages for your selections — browse them right here and get what you need.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading materials…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prep material available yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:-mx-1 max-md:px-1 max-md:pb-1 max-md:[&>*]:w-[80vw] max-md:[&>*]:shrink-0 max-md:[&>*]:snap-center">
              {items.map((p) => (
                <div key={p.id} className="flex flex-col rounded-xl border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight">{p.title}</p>
                    {p.is_bundle ? (
                      <Badge className="shrink-0">Bundle</Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">{p.category}</Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-3 flex-1 text-xs text-muted-foreground">{p.description}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-bold text-primary">€{Number(p.price).toFixed(0)}</span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setSelected(p)}>
                        Details
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => openPurchase(p.id)}>
                        Get it <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground md:hidden">Swipe to see more · purchase opens in a new tab so you stay here.</p>
          </>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selected.is_bundle ? (
                  <Badge>Bundle</Badge>
                ) : (
                  <Badge variant="outline">{selected.category}</Badge>
                )}
                <Badge variant="secondary">€{Number(selected.price).toFixed(0)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description}</p>
              <Button className="w-full" onClick={() => openPurchase(selected.id)}>
                Purchase on Knowledge Base <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TalentPoolPrepMaterial;
