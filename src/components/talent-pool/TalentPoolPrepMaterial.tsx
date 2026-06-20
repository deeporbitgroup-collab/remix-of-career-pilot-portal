import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight } from "lucide-react";

const TIER = "Internship Placement";

// Shows the Knowledge Base "Prep Material" products INLINE inside the Talent Pool,
// so the student sees them without navigating away. The actual purchase/checkout
// still happens on the Knowledge Base page (unchanged).
const TalentPoolPrepMaterial = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const goToKb = () => navigate(`/knowledge-base?tier=${encodeURIComponent(TIER)}`);

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
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-primary">€{Number(p.price).toFixed(0)}</span>
                    <Button size="sm" variant="outline" onClick={goToKb}>
                      Get it <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground md:hidden">Swipe to see more · best browsed on desktop.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TalentPoolPrepMaterial;
