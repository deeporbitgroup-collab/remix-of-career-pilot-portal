import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { crmDb, crmInvoke } from "./client";

interface Turn { role: "user" | "model"; text: string }

const ChatPanel = () => {
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await crmDb.from("crm_chat_messages")
        .select("role, text, created_at").order("created_at", { ascending: true }).limit(100);
      setHistory((data as Turn[]) ?? []);
    })();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history, busy]);

  const clearHistory = async () => {
    await crmDb.from("crm_chat_messages").delete().gte("created_at", 0);
    setHistory([]);
    toast({ title: "Chat cleared" });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...history, { role: "user" as const, text }];
    setHistory(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await crmInvoke<{ reply: string }>("crm-chat", { history: next });
      setHistory((h) => [...h, { role: "model", text: reply }]);
    } catch (e) {
      setHistory((h) => [...h, { role: "model", text: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
      {history.length > 0 && (
        <div className="flex justify-end pb-2">
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground">
            <Trash2 className="mr-2 h-4 w-4" /> Clear chat
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-2" />
            <p className="text-sm">Ask about your pipeline — “who should I chase?”, “draft a reply to…”, “summarize my thread with…”.</p>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap break-words ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 pt-3 border-t mt-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask the assistant…"
          disabled={busy}
        />
        <Button onClick={send} disabled={busy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatPanel;
