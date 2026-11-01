import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle, XCircle } from "lucide-react";
import { useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tx } = useTalentPoolLanguage();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetRole, setResetRole] = useState<"company" | "student">("student");
  const token = searchParams.get("token");
  const loginPath = `/talent-pool/${resetRole}/auth`;

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    const validateToken = async () => {
      const roleFromUrl = searchParams.get("role");
      if (roleFromUrl === "company" || roleFromUrl === "student") {
        setResetRole(roleFromUrl);
      }

      try {
        const { data, error } = await supabase.rpc('talent_pool_get_reset_token_info', {
          _token: token
        });

        if (error || !data?.valid) {
          setTokenValid(false);
          return;
        }

        if (data.role === "company" || data.role === "student") {
          setResetRole(data.role);
        }

        setTokenValid(true);
      } catch {
        const roleFromUrl = searchParams.get("role");
        if (roleFromUrl === "company" || roleFromUrl === "student") {
          setResetRole(roleFromUrl);
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      }
    };

    validateToken();
  }, [token, searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: tx("Invalid Link", "Link non valido"),
        description: tx("The password reset link is invalid or expired.", "Il link per reimpostare la password non è valido o è scaduto."),
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: tx("Weak Password", "Password debole"),
        description: tx("Password must be at least 8 characters long.", "La password deve contenere almeno 8 caratteri."),
        variant: "destructive"
      });
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast({
        title: tx("Weak Password", "Password debole"),
        description: tx("Use at least one uppercase letter and one number.", "Usa almeno una lettera maiuscola e un numero."),
        variant: "destructive"
      });
      return;
    }

    if (newPassword.trim() !== newPassword || confirmPassword.trim() !== confirmPassword) {
      toast({
        title: tx("Invalid Password", "Password non valida"),
        description: tx("Password cannot start or end with spaces.", "La password non può iniziare o terminare con spazi."),
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: tx("Passwords Don't Match", "Le password non coincidono"),
        description: tx("Please make sure both passwords match.", "Assicurati che le due password coincidano."),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('talent_pool_reset_password', {
        _token: token,
        _new_password: newPassword.trim()
      });

      if (error) throw error;

      if (data === true) {
        toast({
          title: tx("Password Reset Successful", "Password reimpostata con successo"),
          description: tx("Your password has been reset. You can now log in with your new password.", "La tua password è stata reimpostata. Ora puoi accedere con la nuova password.")
        });
        setTimeout(() => navigate(loginPath), 2000);
      } else {
        toast({
          title: tx("Reset Failed", "Reimpostazione non riuscita"),
          description: tx("The reset link is invalid or has expired. Please request a new one.", "Il link di reimpostazione non è valido o è scaduto. Richiedine uno nuovo."),
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Reset error:", error);
      toast({
        title: tx("Error", "Errore"),
        description: tx(error.message || "Failed to reset password. Please try again.", "Impossibile reimpostare la password. Riprova."),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{tx("Validating reset link...", "Verifica del link in corso...")}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle>{tx("Invalid Reset Link", "Link di reimpostazione non valido")}</CardTitle>
            <CardDescription>
              {tx("This password reset link is invalid or has expired.", "Questo link per reimpostare la password non è valido o è scaduto.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate(loginPath)}
            >
              {tx("Back to Login", "Torna al login")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>{tx("Reset Your Password", "Reimposta la tua password")}</CardTitle>
          <CardDescription>
            {tx("Enter your new password below", "Inserisci qui sotto la nuova password")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{tx("New Password", "Nuova password")}</Label>
              <Input
                id="new-password"
                type="password"
                placeholder={tx("Enter new password", "Inserisci la nuova password")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                {tx("Must be at least 8 characters long", "Deve contenere almeno 8 caratteri")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{tx("Confirm Password", "Conferma password")}</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder={tx("Confirm new password", "Conferma la nuova password")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? tx("Resetting...", "Reimpostazione in corso...") : tx("Reset Password", "Reimposta password")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate(loginPath)}
            >
              {tx("Back to Login", "Torna al login")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
