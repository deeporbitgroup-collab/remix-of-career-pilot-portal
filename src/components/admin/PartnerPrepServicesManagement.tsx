import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";

type Partner = "CareerBoost" | "LanguageBoost";
type PriceUnit = "flat" | "per_lesson";

interface Service {
  id: string;
  partner: Partner;
  title: string;
  description: string | null;
  target_level: string | null;
  price_unit: PriceUnit;
  price: number | null;
  lessons: number | null;
  total_price: number | null;
  has_guarantee: boolean;
  is_active: boolean;
  sort_order: number;
}

const PARTNERS: Partner[] = ["CareerBoost", "LanguageBoost"];

const emptyForm = {
  id: undefined as string | undefined,
  partner: "CareerBoost" as Partner,
  title: "",
  description: "",
  target_level: "",
  price_unit: "flat" as PriceUnit,
  price: "",
  lessons: "",
  total_price: "",
  has_guarantee: false,
  is_active: true,
  sort_order: "0",
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));

// Admin editor for the partner Prep Material services (CareerBoost & LanguageBoost)
// shown to students in the Talent Pool "Prep Material" tab. Writes directly to
// tp_partner_services (RLS open, gated by the admin area — same pattern as the KB admin).
const PartnerPrepServicesManagement = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleting, setDeleting] = useState<Service | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("tp_partner_services")
      .select("*")
      .order("partner", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
    }
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = (partner: Partner) => {
    setForm({ ...emptyForm, partner, price_unit: partner === "LanguageBoost" ? "per_lesson" : "flat" });
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setForm({
      id: s.id,
      partner: s.partner,
      title: s.title,
      description: s.description ?? "",
      target_level: s.target_level ?? "",
      price_unit: s.price_unit,
      price: s.price != null ? String(s.price) : "",
      lessons: s.lessons != null ? String(s.lessons) : "",
      total_price: s.total_price != null ? String(s.total_price) : "",
      has_guarantee: s.has_guarantee,
      is_active: s.is_active,
      sort_order: String(s.sort_order ?? 0),
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      partner: form.partner,
      title: form.title.trim(),
      description: form.description.trim() || null,
      target_level: form.target_level.trim() || null,
      price_unit: form.price_unit,
      price: form.price_unit === "flat" ? num(form.price) : null,
      lessons: form.price_unit === "per_lesson" ? num(form.lessons) : null,
      total_price: form.price_unit === "per_lesson" ? num(form.total_price) : null,
      has_guarantee: form.has_guarantee,
      is_active: form.is_active,
      sort_order: num(form.sort_order) ?? 0,
      updated_at: new Date().toISOString(),
    };
    const q = form.id
      ? (supabase as any).from("tp_partner_services").update(payload).eq("id", form.id)
      : (supabase as any).from("tp_partner_services").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Service updated" : "Service added" });
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (s: Service) => {
    const { error } = await (supabase as any)
      .from("tp_partner_services")
      .update({ is_active: !s.is_active, updated_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any)
      .from("tp_partner_services")
      .delete()
      .eq("id", deleting.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Service deleted" });
    }
    setDeleting(null);
    load();
  };

  const priceText = (s: Service) => {
    if (s.price_unit === "per_lesson") {
      if (!s.total_price || !s.lessons) return "Price on request";
      const per = Math.round(Number(s.total_price) / Number(s.lessons));
      return `€${per}/lesson · ${s.lessons} lessons · €${Number(s.total_price).toFixed(0)}`;
    }
    return s.price != null ? `€${Number(s.price).toFixed(0)}` : "Price on request";
  };

  const perLessonPreview = () => {
    const t = num(form.total_price);
    const l = num(form.lessons);
    if (form.price_unit !== "per_lesson" || !t || !l) return null;
    return `≈ €${Math.round(t / l)} / lesson`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner Prep Services</CardTitle>
        <CardDescription>
          CareerBoost &amp; LanguageBoost services shown to students in the Talent Pool → Prep Material tab.
          Students request these with “Send Request” (no checkout). Changes are live immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          PARTNERS.map((partner) => {
            const list = services.filter((s) => s.partner === partner);
            return (
              <div key={partner}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold">{partner}</h3>
                  <Button size="sm" onClick={() => openNew(partner)}>
                    <Plus className="mr-1 h-4 w-4" /> Add service
                  </Button>
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services yet.</p>
                ) : (
                  <div className="space-y-2">
                    {list.map((s) => (
                      <div
                        key={s.id}
                        className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${s.is_active ? "" : "opacity-60"}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{s.title}</p>
                            {s.has_guarantee && (
                              <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600">
                                <ShieldCheck className="h-3 w-3" /> Guarantee
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {s.target_level ? `${s.target_level} · ` : ""}{priceText(s)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                            <span className="text-xs text-muted-foreground">{s.is_active ? "Active" : "Hidden"}</span>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleting(s)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Partner</Label>
                <Select value={form.partner} onValueChange={(v) => setForm((f) => ({ ...f, partner: v as Partner }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTNERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pricing</Label>
                <Select value={form.price_unit} onValueChange={(v) => setForm((f) => ({ ...f, price_unit: v as PriceUnit }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat price</SelectItem>
                    <SelectItem value="per_lesson">Per lesson (lessons + total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Cambridge C1 — Satisfied-or-Refunded Guarantee" />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label>Target level <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={form.target_level} onChange={(e) => setForm((f) => ({ ...f, target_level: e.target.value }))} placeholder="e.g. For B2 students / Beginners" />
            </div>

            {form.price_unit === "flat" ? (
              <div className="space-y-1.5">
                <Label>Price (€) <span className="text-muted-foreground">— leave empty for “on request”</span></Label>
                <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="e.g. 60" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Lessons</Label>
                  <Input type="number" value={form.lessons} onChange={(e) => setForm((f) => ({ ...f, lessons: e.target.value }))} placeholder="e.g. 50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Total price (€)</Label>
                  <Input type="number" value={form.total_price} onChange={(e) => setForm((f) => ({ ...f, total_price: e.target.value }))} placeholder="e.g. 1750" />
                </div>
                {perLessonPreview() && (
                  <p className="col-span-2 text-xs font-medium text-primary">{perLessonPreview()}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <Label>Satisfied-or-refunded guarantee</Label>
                <p className="text-xs text-muted-foreground">Shows a “Guarantee” badge on the card.</p>
              </div>
              <Switch checked={form.has_guarantee} onCheckedChange={(v) => setForm((f) => ({ ...f, has_guarantee: v }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <Label>Visible to students</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be removed from the students’ Prep Material tab. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PartnerPrepServicesManagement;
