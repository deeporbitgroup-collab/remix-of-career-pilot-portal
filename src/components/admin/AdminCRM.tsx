import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Sparkles, Plug, Loader2, BarChart3 } from "lucide-react";
import { crmDb } from "./crm/client";
import ContactList from "./crm/ContactList";
import ContactDetail from "./crm/ContactDetail";
import ChatPanel from "./crm/ChatPanel";
import ConnectPanel from "./crm/ConnectPanel";
import StatsPanel from "./crm/StatsPanel";

const AdminCRM = () => {
  const [tab, setTab] = useState("clients");
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    (async () => {
      const { count } = await crmDb
        .from("crm_accounts").select("id", { count: "exact", head: true });
      const connected = (count ?? 0) > 0;
      setHasAccount(connected);
      if (!connected) setTab("connection");
    })();
  }, [refreshKey]);

  if (hasAccount === null) {
    return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Tabs value={tab} onValueChange={(v) => { setTab(v); setOpenEmail(null); }} className="space-y-4">
      <TabsList className="w-full flex flex-wrap">
        <TabsTrigger value="clients" className="gap-2"><Users className="h-4 w-4" /> Clients</TabsTrigger>
        <TabsTrigger value="chat" className="gap-2"><Sparkles className="h-4 w-4" /> Ask AI</TabsTrigger>
        <TabsTrigger value="stats" className="gap-2"><BarChart3 className="h-4 w-4" /> Stats</TabsTrigger>
        <TabsTrigger value="connection" className="gap-2"><Plug className="h-4 w-4" /> Connection</TabsTrigger>
      </TabsList>

      <TabsContent value="clients">
        {!hasAccount ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Connect a Gmail mailbox first (Connection tab) to start tracking clients.
          </div>
        ) : openEmail ? (
          <ContactDetail email={openEmail} onBack={() => setOpenEmail(null)} onChanged={refresh} />
        ) : (
          <ContactList onOpen={setOpenEmail} refreshKey={refreshKey} />
        )}
      </TabsContent>

      <TabsContent value="chat">
        <ChatPanel />
      </TabsContent>

      <TabsContent value="stats">
        <StatsPanel />
      </TabsContent>

      <TabsContent value="connection">
        <ConnectPanel onSynced={refresh} />
      </TabsContent>
    </Tabs>
  );
};

export default AdminCRM;
