import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2 } from "lucide-react";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPasswordDialog = ({ open, onOpenChange }: ForgotPasswordDialogProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error("Inserisci un indirizzo email valido");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-client-password-reset', {
        body: { email: email.toLowerCase() }
      });

      if (error) throw error;

      setSent(true);
      toast.success("Email inviata! Controlla la tua casella di posta.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Errore durante l'invio. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setSent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Password Dimenticata?</DialogTitle>
          <DialogDescription>
            {sent 
              ? "Controlla la tua email per il link di reset."
              : "Inserisci la tua email e ti invieremo un link per reimpostare la password."
            }
          </DialogDescription>
        </DialogHeader>
        
        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-green-50 rounded-lg">
              <div className="text-center">
                <Mail className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-green-700 font-medium">Email Inviata!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Se esiste un account con questa email, riceverai le istruzioni per reimpostare la password.
                </p>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Chiudi
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="tuaemail@esempio.com"
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
                onClick={handleClose}
                className="flex-1"
                disabled={loading}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Invio...
                  </>
                ) : (
                  "Invia Link"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
