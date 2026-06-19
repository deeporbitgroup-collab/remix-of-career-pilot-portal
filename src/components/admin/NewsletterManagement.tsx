import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, Paperclip, X, Users, GraduationCap, Briefcase, Building2, ShoppingCart, Mail } from "lucide-react";

// Recipient groups the newsletter can target. Keys must match the
// `send-newsletter` edge function.
const AUDIENCES: { key: string; label: string; desc: string; icon: typeof Users }[] = [
  { key: "clients", label: "Clients", desc: "Registered via Book my Flight Plan", icon: ShoppingCart },
  { key: "tp_students", label: "Talent Pool students", desc: "Registered to the Talent Pool", icon: GraduationCap },
  { key: "tp_companies", label: "Talent Pool companies", desc: "Companies on the Talent Pool", icon: Building2 },
  { key: "associates", label: "Associates", desc: "Approved associates (crew portal)", icon: Users },
  { key: "partners", label: "Partners", desc: "Approved partners (crew portal)", icon: Briefcase },
  { key: "subscribers", label: "Newsletter subscribers", desc: "Signed up from the website footer", icon: Mail },
];

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const NewsletterManagement = () => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audiences, setAudiences] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const toggleAudience = (key: string) =>
    setAudiences((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const selectAll = () => setAudiences(new Set(AUDIENCES.map((a) => a.key)));

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Add a subject and a message first.");
      return;
    }
    if (audiences.size === 0) {
      toast.error("Pick at least one group of recipients.");
      return;
    }
    setSending(true);
    try {
      const attachments = await Promise.all(
        files.map(async (f) => ({ filename: f.name, content: await fileToBase64(f) }))
      );
      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: { subject: subject.trim(), body: body.trim(), audiences: Array.from(audiences), attachments },
      });
      if (error) throw error;
      const res = data as any;
      toast.success(res?.message || "Newsletter sent!");
      if (res?.testMode) {
        toast.info("Test mode: a verified sender domain isn't configured, so it only went to the test inbox.");
      }
      setSubject("");
      setBody("");
      setAudiences(new Set());
      setFiles([]);
    } catch (e: any) {
      console.error("send newsletter error:", e);
      toast.error(e?.message || "Failed to send newsletter");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Newsletter
        </CardTitle>
        <CardDescription>
          Write an article, attach PDFs, choose who receives it, and send — emails go out automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Subject + body */}
        <div className="space-y-2">
          <Label htmlFor="nl-subject">Subject</Label>
          <Input
            id="nl-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Career Pilot — July opportunities & updates"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-body">Article</Label>
          <Textarea
            id="nl-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your newsletter here. Line breaks are preserved."
            className="min-h-[200px]"
          />
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label>Attachments (PDF)</Label>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="nl-files">
              <Button asChild variant="outline" size="sm">
                <span className="cursor-pointer">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add PDF
                </span>
              </Button>
            </label>
            <input id="nl-files" type="file" accept="application/pdf" multiple className="hidden" onChange={onPickFiles} />
            {files.length === 0 && <span className="text-sm text-muted-foreground">No files attached</span>}
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs">
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)} aria-label="Remove">
                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Audiences */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Send to</Label>
            <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
              Select all
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              const checked = audiences.has(a.key);
              return (
                <button
                  type="button"
                  key={a.key}
                  onClick={() => toggleAudience(a.key)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Checkbox checked={checked} className="mt-0.5 pointer-events-none" aria-hidden />
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Icon className="h-4 w-4 text-primary" />
                      {a.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Send */}
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {audiences.size > 0 ? (
              <>
                Sending to{" "}
                <Badge variant="secondary">
                  {audiences.size} group{audiences.size > 1 ? "s" : ""}
                </Badge>
              </>
            ) : (
              "Pick at least one group of recipients."
            )}
          </p>
          <Button onClick={handleSend} disabled={sending} className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending..." : "Send newsletter"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsletterManagement;
