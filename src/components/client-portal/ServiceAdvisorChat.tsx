import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, User as UserIcon, ChevronRight, PhoneCall, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServiceLite {
  name: string;
  description: string;
  price: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  categorySubtitle: string;
  services: ServiceLite[];
  onBookFreeCall: () => void;
  onSelectService: (serviceName: string) => void;
}

type AssistantPayload = {
  type: "question" | "recommendation" | "book_call";
  message: string;
  options?: string[];
  service_name?: string;
  reasoning?: string;
  service?: ServiceLite;
};

type ChatMsg =
  | { id: string; role: "assistant"; payload: AssistantPayload }
  | { id: string; role: "user"; text: string };

const ServiceAdvisorChat = ({
  open,
  onOpenChange,
  category,
  categorySubtitle,
  services,
  onBookFreeCall,
  onSelectService,
}: Props) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const callAdvisor = async (history: { role: "user" | "assistant"; content: string }[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("service-advisor-chat", {
        body: {
          category,
          categorySubtitle,
          services,
          history,
        },
      });
      if (error) throw error;
      const payload = data as AssistantPayload;
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", payload },
      ]);
    } catch (e: any) {
      console.error(e);
      toast.error("The advisor is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Bootstrap on open
  useEffect(() => {
    if (open && messages.length === 0 && !loading) {
      callAdvisor([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleOption = async (opt: string) => {
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text: opt };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    // Build history for AI: pair assistant JSON + user text
    const history: { role: "user" | "assistant"; content: string }[] = nextMessages.map((m) =>
      m.role === "user"
        ? { role: "user" as const, content: m.text }
        : { role: "assistant" as const, content: JSON.stringify(m.payload) },
    );
    await callAdvisor(history);
  };

  const handleRestart = () => {
    setMessages([]);
    setTimeout(() => callAdvisor([]), 0);
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      // reset for next time
      setMessages([]);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 bg-gradient-to-b from-background to-muted/30">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/15 via-primary/8 to-transparent">
          <div className="flex items-start gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
              <Sparkles className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg leading-tight">
                {category} — Service Advisor
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                I'll ask a few quick questions to match you with the right service.
              </DialogDescription>
            </div>
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                className="text-xs h-8"
                title="Start over"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Restart
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Chat area */}
        <div
          ref={scrollRef}
          className="px-4 sm:px-6 py-5 max-h-[55vh] min-h-[320px] overflow-y-auto space-y-4"
        >
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end gap-2 animate-fade-in">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-md">
                  {m.text}
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary mt-auto">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              </div>
            ) : (
              <AssistantBubble
                key={m.id}
                payload={m.payload}
                onOption={handleOption}
                onBookCall={onBookFreeCall}
                onSelectService={onSelectService}
                disabled={loading}
              />
            ),
          )}

          {loading && (
            <div className="flex gap-2 animate-fade-in">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-secondary/15 border border-secondary/30 px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer helper */}
        <div className="border-t bg-muted/30 px-6 py-3 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <span>Not sure? You can always pick "I'm not sure" or book a free call.</span>
          <button
            onClick={onBookFreeCall}
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            <PhoneCall className="h-3 w-3" /> Free call with our team
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AssistantBubble = ({
  payload,
  onOption,
  onBookCall,
  onSelectService,
  disabled,
}: {
  payload: AssistantPayload;
  onOption: (opt: string) => void;
  onBookCall: () => void;
  onSelectService: (name: string) => void;
  disabled: boolean;
}) => {
  return (
    <div className="flex gap-2 animate-fade-in">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 max-w-[88%] space-y-3">
        <div className="rounded-2xl rounded-bl-md bg-secondary/15 border border-secondary/30 px-4 py-3 text-sm shadow-sm text-foreground">
          <p className="text-foreground leading-relaxed">{payload.message}</p>
          {payload.reasoning && payload.type !== "question" && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{payload.reasoning}</p>
          )}
        </div>

        {payload.type === "question" && payload.options && (
          <div className="grid gap-2">
            {payload.options.map((opt, i) => (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onOption(opt)}
                className="group flex items-center justify-between gap-3 text-left rounded-xl border border-border/70 bg-background hover:bg-primary/5 hover:border-primary/50 transition-all px-4 py-2.5 text-sm shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-foreground">{opt}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}

        {payload.type === "recommendation" && payload.service && (
          <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-4 shadow-md">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-primary font-bold mb-0.5">
                  Recommended for you
                </p>
                <h4 className="font-bold text-base text-foreground">{payload.service.name}</h4>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">€{payload.service.price}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-3">
              {payload.service.description}
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => onSelectService(payload.service!.name)}
                className="flex-1 min-w-[140px]"
              >
                View this service
              </Button>
              <Button size="sm" variant="outline" onClick={onBookCall}>
                <PhoneCall className="h-3.5 w-3.5 mr-1.5" /> Free call
              </Button>
            </div>
          </div>
        )}

        {payload.type === "book_call" && (
          <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-4 shadow-md">
            <div className="flex items-start gap-2 mb-3">
              <PhoneCall className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-primary font-bold mb-0.5">
                  Let's talk it through
                </p>
                <h4 className="font-bold text-base text-foreground">Book a free call</h4>
              </div>
            </div>
            <Button size="sm" onClick={onBookCall} className="w-full">
              <PhoneCall className="h-3.5 w-3.5 mr-1.5" /> Book free call with our team
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceAdvisorChat;
