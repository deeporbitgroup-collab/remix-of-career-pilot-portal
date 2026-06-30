import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const ForgotPasswordDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useLanguage();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        variant: "destructive",
        title: language === 'it' ? "Errore" : "Error",
        description: language === 'it' ? "Inserisci la tua email" : "Please enter your email",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Request password reset for the user
      await supabase.functions.invoke('auth-reset-password', {
        body: { 
          action: 'request',
          email: email.trim().toLowerCase(), 
          role: 'ASSOCIATE' // Backend will try all roles (ASSOCIATE, PARTNER, ADMIN)
        }
      });

      // Always show success message for security (don't reveal if email exists)
      toast({
        title: language === 'it' ? "Email inviata" : "Email sent",
        description: language === 'it' 
          ? "Se l'email è registrata, riceverai un link per reimpostare la password"
          : "If the email is registered, you will receive a password reset link",
      });

      setOpen(false);
      setEmail("");
    } catch (error: any) {
      // Don't reveal too much info for security
      toast({
        title: language === 'it' ? "Richiesta inviata" : "Request sent",
        description: language === 'it' 
          ? "Se l'email è registrata, riceverai il link"
          : "If the email is registered, you will receive the link",
      });
      setOpen(false);
      setEmail("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="px-0 text-sm">
          {language === 'it' ? 'Password dimenticata?' : 'Forgot password?'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {language === 'it' ? 'Recupera password' : 'Reset password'}
          </DialogTitle>
          <DialogDescription>
            {language === 'it' 
              ? 'Inserisci la tua email per ricevere il link di reset della password'
              : 'Enter your email to receive a password reset link'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder={language === 'it' ? "nome@esempio.com" : "name@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'it' ? 'Invio in corso...' : 'Sending...'}
              </>
            ) : (
              language === 'it' ? 'Invia link di reset' : 'Send reset link'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
