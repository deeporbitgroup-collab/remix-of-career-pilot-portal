import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Mail, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { crmDb, crmInvoke } from "./client";
import { CrmAccount, fmtTime } from "./types";

interface Props {
  onSynced?: () => void;
}

const ConnectPanel = ({ onSynced }: Props) => {
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadAccounts = async () => {
    const { data } = await crmDb
      .from("crm_accounts")
      .select("id, email, last_sync_at, last_error, history_id")
      .order("created_at", { ascending: true });
    setAccounts((data as CrmAccount[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
    // surface the OAuth callback result (?crm=connected|error)
    const params = new URLSearchParams(window.location.search);
    if (params.get("crm") === "connected") {
      toast({ title: "Gmail connected", description: "Running first sync…" });
      handleSync();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("crm") === "error") {
      toast({ title: "Connection failed", description: params.get("msg") ?? "", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await crmInvoke<{ url: string }>("crm-google-auth-start");
      window.location.href = url; // off to Google consent
    } catch (e) {
      toast({ title: "Could not start connection", description: (e as Error).message, variant: "destructive" });
      setConnecting(false);
    }
  };

  const handleSync = async (forceFull = false) => {
    setSyncing(true);
    try {
      const res = await crmInvoke<{ synced: Array<{ email: string; error?: string; needsReconnect?: boolean; rows?: number }> }>(
        "crm-sync", { forceFull },
      );
      const failed = res.synced?.find((s) => s.error);
      if (failed?.needsReconnect) {
        toast({ title: "Reconnect needed", description: `${failed.email}: Google access expired.`, variant: "destructive" });
      } else if (failed) {
        toast({ title: "Sync error", description: failed.error, variant: "destructive" });
      } else {
        const total = res.synced?.reduce((n, s) => n + (s.rows ?? 0), 0) ?? 0;
        toast({ title: "Sync complete", description: `${total} message(s) processed.` });
      }
      await loadAccounts();
      onSynced?.();
    } catch (e) {
      toast({ title: "Sync failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5 text-primary" /> Connected mailbox
          </CardTitle>
          <CardDescription>
            Read-only Gmail + Calendar. Syncs automatically every few minutes in the cloud — no need to keep anything running.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No mailbox connected yet.</div>
          ) : (
            accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {a.last_error === "TOKEN_EXPIRED"
                    ? <AlertTriangle className="h-5 w-5 text-destructive" />
                    : <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  <div>
                    <div className="font-medium">{a.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.last_error === "TOKEN_EXPIRED"
                        ? "Access expired — reconnect to resume syncing"
                        : a.last_sync_at ? `Last synced ${fmtTime(a.last_sync_at)}` : "Not synced yet"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              {accounts.length ? "Connect another / reconnect" : "Connect Gmail"}
            </Button>
            {accounts.length > 0 && (
              <>
                <Button variant="outline" onClick={() => handleSync(false)} disabled={syncing}>
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Sync now
                </Button>
                <Button variant="ghost" onClick={() => handleSync(true)} disabled={syncing}>
                  Full re-sync
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectPanel;
