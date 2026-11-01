import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeTalentPoolEmail } from "@/lib/talentPoolPassword";
import { Mail, Loader2 } from "lucide-react";
import { useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'STUDENT' | 'COMPANY';
}

export const ForgotPasswordDialog = ({ open, onOpenChange, role }: ForgotPasswordDialogProps) => {
  const { toast } = useToast();
  const { language, tx } = useTalentPoolLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast({
        title: tx("Invalid Email", "Email non valida"),
        description: tx("Please enter a valid email address.", "Inserisci un indirizzo email valido."),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = normalizeTalentPoolEmail(email);

      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: normalizedEmail, role, language }
      });

      if (error) throw error;

      toast({
        title: tx("Reset Email Sent", "Email di reimpostazione inviata"),
        description: tx("If an account exists with this email, you will receive password reset instructions shortly.", "Se esiste un account associato a questa email, riceverai a breve le istruzioni per reimpostare la password."),
      });

      setEmail("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: tx("Error", "Errore"),
        description: tx(error.message || "Failed to send reset email. Please try again.", "Impossibile inviare l'email di reimpostazione. Riprova."),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tx("Forgot Password?", "Password dimenticata?")}</DialogTitle>
          <DialogDescription>
            {tx("Enter your email address and we'll send you a link to reset your password.", "Inserisci il tuo indirizzo email e ti invieremo un link per reimpostare la password.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                placeholder={tx("your.email@example.com", "tua.email@esempio.com")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              {tx("Cancel", "Annulla")}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tx("Sending...", "Invio in corso...")}
                </>
              ) : (
                tx("Send Reset Link", "Invia link di reimpostazione")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
