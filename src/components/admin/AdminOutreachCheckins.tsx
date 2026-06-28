import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";

const sb = supabase as any;

interface Checkin {
  id: string;
  guest_name: string;
  guest_email: string;
  sectors: string | null;
  cities: string | null;
  proposed_slots: Array<{ date: string; time: string }>;
  status: string;
  confirmed_slot: string | null;
  created_at: string;
}

const AdminOutreachCheckins = () => {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchCheckins = async () => {
    const { data } = await sb
      .from("outreach_checkins")
      .select("*")
      .order("created_at", { ascending: false });
    setCheckins(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCheckins();
    const sub = sb
      .channel("admin_outreach_checkins")
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach_checkins" }, () => fetchCheckins())
      .subscribe();
    return () => sub.unsubscribe();
  }, []);

  const confirm = async (id: string, slot: string) => {
    setBusy(id);
    try {
      const { error } = await sb.functions.invoke("outreach-checkin", {
        body: { action: "confirm", checkinId: id, slot },
      });
      if (error) throw error;
      toast.success("Check-in confirmed — client and admin notified.");
      fetchCheckins();
    } catch (e: any) {
      toast.error(e?.message || "Failed to confirm");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return null;

  const pending = checkins.filter((c) => c.status === "requested");
  const confirmed = checkins.filter((c) => c.status === "confirmed");

  if (checkins.length === 0) return null;

  return (
    <Card className="border-2 border-amber-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-amber-500" />
          Outreach Power Pack — Check-ins
          {pending.length > 0 && <Badge className="bg-amber-500 text-white">{pending.length} to confirm</Badge>}
        </CardTitle>
        <CardDescription>
          Clients requesting the pay-per-interview Outreach Power Pack. Confirm one of their proposed times for the free intro check-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending.length === 0 && <p className="text-sm text-muted-foreground">No check-ins waiting for confirmation.</p>}
        {pending.map((c) => (
          <div key={c.id} className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{c.guest_name}</p>
                <p className="text-sm text-muted-foreground">{c.guest_email}</p>
                {(c.sectors || c.cities) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.sectors && <>Sectors: <strong>{c.sectors}</strong> </>}
                    {c.cities && <>· Cities: <strong>{c.cities}</strong></>}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy")}</span>
            </div>
            <p className="text-xs font-medium mt-3 mb-1">Confirm one of the proposed times:</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(c.proposed_slots || []).map((s, i) => {
                const label = `${s.date} ${s.time}`;
                return (
                  <Button
                    key={i}
                    variant="outline"
                    className="h-auto py-2 justify-between"
                    disabled={busy === c.id}
                    onClick={() => confirm(c.id, label)}
                  >
                    <span className="text-xs">{label}</span>
                    {busy === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}

        {confirmed.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Confirmed</p>
            <div className="space-y-1">
              {confirmed.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b py-1">
                  <span>{c.guest_name} <span className="text-muted-foreground">({c.guest_email})</span></span>
                  <Badge variant="secondary">{c.confirmed_slot}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminOutreachCheckins;
