import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderOpen, ChevronRight, Download, FileText, Loader2, GraduationCap, Plane, Building, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QuickOnboardingProps {
  language: string;
}

type Service = "TAKEOFF" | "LAYOVER" | "ALTITUDE" | "SUMMIT";

interface Material {
  id: string;
  service: Service;
  title: string;
  description: string | null;
  storage_path: string;
  filename: string;
  size_bytes: number | null;
}

const QuickOnboarding = ({ language }: QuickOnboardingProps) => {
  const isEnglish = language === 'en';
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [openService, setOpenService] = useState<Service | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("prep_materials").select("*").order("created_at", { ascending: false });
      setMaterials((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const folders: { id: Service; title: string; subtitle: string; icon: any; color: string }[] = [
    { id: "TAKEOFF", title: "Takeoff", subtitle: isEnglish ? "From High School to University" : "Dal Liceo all'Università", icon: GraduationCap, color: "text-blue-500" },
    { id: "LAYOVER", title: "Layover", subtitle: isEnglish ? "University Transfers" : "Trasferimenti Universitari", icon: Plane, color: "text-purple-500" },
    { id: "ALTITUDE", title: "Altitude", subtitle: isEnglish ? "Internship Placement" : "Stage e Tirocini", icon: Building, color: "text-amber-500" },
    { id: "SUMMIT", title: "Summit", subtitle: isEnglish ? "From University to Master's" : "Dall'Università al Master", icon: Trophy, color: "text-emerald-500" },
  ];

  const handleDownload = async (m: Material) => {
    const { data, error } = await supabase.storage.from("prep-materials").createSignedUrl(m.storage_path, 300);
    if (error || !data) {
      toast({ title: isEnglish ? "Download error" : "Errore download", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Quick Onboarding
        </CardTitle>
        <CardDescription>
          {isEnglish ? 'Access prep materials for each service' : 'Accedi ai materiali di preparazione per ogni servizio'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          folders.map((f) => {
            const list = materials.filter((m) => m.service === f.id);
            const isOpen = openService === f.id;
            const Icon = f.icon;
            return (
              <Collapsible key={f.id} open={isOpen} onOpenChange={(o) => setOpenService(o ? f.id : null)}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <div className="flex items-center gap-3 text-left">
                      <Icon className={`h-5 w-5 ${f.color}`} />
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {f.title}
                          <Badge variant="secondary">{list.length}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{f.subtitle}</div>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-2 pt-2 space-y-1">
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-3">
                      {isEnglish ? 'No materials yet' : 'Nessun materiale disponibile'}
                    </p>
                  ) : (
                    list.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{m.title}</div>
                            {m.description && (
                              <div className="text-xs text-muted-foreground truncate">{m.description}</div>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(m)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default QuickOnboarding;
