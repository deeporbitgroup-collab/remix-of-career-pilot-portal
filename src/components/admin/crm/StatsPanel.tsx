import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Clock, Target, Building2 } from "lucide-react";
import { crmDb } from "./client";
import { STAGE_LABELS } from "./types";

interface Stats {
  your_avg_reply_days: number | null;
  your_replies_measured: number;
  their_avg_reply_days: number | null;
  their_replies_measured: number;
  outreach_total: number;
  outreach_converted: number;
  outreach_rate: number | null;
  weeks: Array<{ wk: string; n_in: number; n_out: number }>;
  companies: Array<{ company: string; n: number }>;
  stages: Record<string, number>;
}

const Stat = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="rounded-lg border p-4">
    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
    {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

const StatsPanel = () => {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await crmDb.rpc("crm_stats");
      setS(data as Stats);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!s) return <div className="text-sm text-muted-foreground">No data yet.</div>;

  const maxWeek = Math.max(1, ...s.weeks.map((w) => Math.max(w.n_in, w.n_out)));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Your avg reply"
          value={s.your_avg_reply_days != null ? `${s.your_avg_reply_days}d` : "—"}
          sub={`${s.your_replies_measured} replies`} />
        <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Their avg reply"
          value={s.their_avg_reply_days != null ? `${s.their_avg_reply_days}d` : "—"}
          sub={`${s.their_replies_measured} replies`} />
        <Stat icon={<Target className="h-3.5 w-3.5" />} label="Outreach conversion"
          value={s.outreach_rate != null ? `${s.outreach_rate}%` : "—"}
          sub={`${s.outreach_converted}/${s.outreach_total} replied or called`} />
        <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Stages active"
          value={String(Object.values(s.stages).reduce((a, b) => a + b, 0))}
          sub={Object.entries(s.stages).map(([k, v]) => `${STAGE_LABELS[k] ?? k}: ${v}`).join(" · ") || "none"} />
      </div>

      {/* Weekly volume */}
      <div className="rounded-lg border p-4">
        <div className="text-sm font-semibold mb-3">Email volume (last 12 weeks)</div>
        {s.weeks.length === 0 ? <div className="text-sm text-muted-foreground">No recent activity.</div> : (
          <div className="space-y-2">
            {s.weeks.map((w) => (
              <div key={w.wk} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-muted-foreground tabular-nums">{w.wk}</span>
                <div className="flex-1 flex gap-1 items-center">
                  <div className="h-3 rounded bg-primary" style={{ width: `${(w.n_out / maxWeek) * 100}%` }} title={`${w.n_out} sent`} />
                  <span className="text-muted-foreground">{w.n_out}↑</span>
                </div>
                <div className="flex-1 flex gap-1 items-center">
                  <div className="h-3 rounded bg-green-500" style={{ width: `${(w.n_in / maxWeek) * 100}%` }} title={`${w.n_in} received`} />
                  <span className="text-muted-foreground">{w.n_in}↓</span>
                </div>
              </div>
            ))}
            <div className="text-[11px] text-muted-foreground pt-1">Primary = sent · Green = received</div>
          </div>
        )}
      </div>

      {/* Top companies */}
      <div className="rounded-lg border p-4">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4" /> Busiest companies</div>
        {s.companies.length === 0 ? <div className="text-sm text-muted-foreground">No companies yet.</div> : (
          <div className="flex flex-wrap gap-2">
            {s.companies.map((c) => (
              <span key={c.company} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm">
                {c.company}<span className="text-xs text-muted-foreground">{c.n}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPanel;
