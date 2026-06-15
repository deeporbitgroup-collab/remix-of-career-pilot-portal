import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, FileText, Plus, Loader2, GraduationCap, Plane, Building, Trophy } from "lucide-react";

type Service = "TAKEOFF" | "LAYOVER" | "ALTITUDE" | "SUMMIT";

const SERVICES: { id: Service; label: string; subtitle: string; icon: any; color: string }[] = [
  { id: "TAKEOFF", label: "Takeoff", subtitle: "From High School to University", icon: GraduationCap, color: "text-blue-500" },
  { id: "LAYOVER", label: "Layover", subtitle: "University Transfers", icon: Plane, color: "text-purple-500" },
  { id: "ALTITUDE", label: "Altitude", subtitle: "Internship Placement", icon: Building, color: "text-amber-500" },
  { id: "SUMMIT", label: "Summit", subtitle: "From University to Master's", icon: Trophy, color: "text-emerald-500" },
];

interface Material {
  id: string;
  service: Service;
  title: string;
  description: string | null;
  storage_path: string;
  filename: string;
  size_bytes: number | null;
  created_at: string;
}

const PrepMaterialsManagement = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeService, setActiveService] = useState<Service>("TAKEOFF");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", file: null as File | null });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prep_materials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Errore", description: error.message, variant: "destructive" });
    setMaterials((data as any) || []);
    setLoading(false);
  };

  const openUpload = (service: Service) => {
    setActiveService(service);
    setForm({ title: "", description: "", file: null });
    setDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!form.file || !form.title.trim()) {
      toast({ title: "Compila titolo e file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = form.file.name.split(".").pop();
      const path = `${activeService}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("prep-materials").upload(path, form.file);
      if (upErr) throw upErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("prep_materials").insert({
        service: activeService,
        title: form.title.trim(),
        description: form.description.trim() || null,
        storage_path: path,
        filename: form.file.name,
        mime: form.file.type,
        size_bytes: form.file.size,
        uploaded_by: user?.id,
      });
      if (insErr) throw insErr;
      toast({ title: "Materiale caricato" });
      setDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Errore upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (m: Material) => {
    const { data, error } = await supabase.storage.from("prep-materials").createSignedUrl(m.storage_path, 300);
    if (error || !data) {
      toast({ title: "Errore download", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (m: Material) => {
    if (!confirm(`Eliminare "${m.title}"?`)) return;
    await supabase.storage.from("prep-materials").remove([m.storage_path]);
    const { error } = await supabase.from("prep_materials").delete().eq("id", m.id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Eliminato" });
    fetchAll();
  };

  const formatSize = (b: number | null) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Onboarding & Prep Materials
        </CardTitle>
        <CardDescription>
          Carica i materiali di preparazione per ogni servizio. Saranno visibili agli associate nella sezione "Quick Onboarding" della loro dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="TAKEOFF">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full mb-4">
            {SERVICES.map((s) => {
              const count = materials.filter((m) => m.service === s.id).length;
              const Icon = s.icon;
              return (
                <TabsTrigger key={s.id} value={s.id} className="gap-2">
                  <Icon className={`h-4 w-4 ${s.color}`} />
                  <span>{s.label}</span>
                  <Badge variant="secondary" className="ml-1">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SERVICES.map((s) => {
            const list = materials.filter((m) => m.service === s.id);
            const Icon = s.icon;
            return (
              <TabsContent key={s.id} value={s.id} className="space-y-3">
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-6 w-6 ${s.color} mt-0.5`} />
                    <div>
                      <h3 className="font-semibold">{s.label}</h3>
                      <p className="text-sm text-muted-foreground">{s.subtitle}</p>
                    </div>
                  </div>
                  <Button onClick={() => openUpload(s.id)} className="gap-2 shrink-0">
                    <Plus className="h-4 w-4" /> Carica materiale
                  </Button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : list.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nessun materiale caricato per {s.label}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {list.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-md border hover:bg-muted/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{m.title}</div>
                            {m.description && (
                              <div className="text-xs text-muted-foreground truncate">{m.description}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {m.filename} · {formatSize(m.size_bytes)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => handleDownload(m)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(m)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Carica materiale - {SERVICES.find(s => s.id === activeService)?.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titolo *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Es. Guida ammissioni 2026" />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>File *</Label>
                <Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>Annulla</Button>
              <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Carica
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PrepMaterialsManagement;
