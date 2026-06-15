import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, XCircle, ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    } else {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('auth-reset-password', {
        body: { action: 'validate', token }
      });

      if (error || !data?.valid) {
        setTokenValid(false);
      } else {
        setTokenValid(true);
      }
    } catch (error) {
      setTokenValid(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: language === 'it' ? "Link non valido" : "Invalid Link",
        description: language === 'it' 
          ? "Il link per il reset della password non è valido o è scaduto."
          : "The password reset link is invalid or expired.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: language === 'it' ? "Password debole" : "Weak Password",
        description: language === 'it' 
          ? "La password deve essere di almeno 8 caratteri."
          : "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: language === 'it' ? "Le password non corrispondono" : "Passwords Don't Match",
        description: language === 'it' 
          ? "Assicurati che le password corrispondano."
          : "Please make sure both passwords match.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('auth-reset-password', {
        body: { 
          action: 'complete',
          token, 
          newPassword 
        }
      });

      if (error || !data?.success) {
        throw new Error(language === 'it' 
          ? 'Impossibile reimpostare la password'
          : 'Failed to reset password');
      }

      toast({
        title: language === 'it' ? "Password reimpostata" : "Password Reset Successful",
        description: language === 'it' 
          ? "La tua password è stata reimpostata. Ora puoi accedere con la nuova password."
          : "Your password has been reset. You can now log in with your new password."
      });
      setTimeout(() => navigate('/auth'), 2000);
    } catch (error: any) {
      console.error("Reset error:", error);
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: error.message || (language === 'it' 
          ? "Impossibile reimpostare la password. Riprova."
          : "Failed to reset password. Please try again."),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {language === 'it' ? 'Torna al login' : 'Back to login'}
            </Button>
            <LanguageSwitcher />
          </div>
          
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <XCircle className="h-16 w-16 text-destructive" />
                </div>
                <CardTitle>
                  {language === 'it' ? 'Link non valido' : 'Invalid Reset Link'}
                </CardTitle>
                <CardDescription>
                  {language === 'it' 
                    ? 'Questo link per il reset della password non è valido o è scaduto.'
                    : 'This password reset link is invalid or has expired.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => navigate('/auth')}
                >
                  {language === 'it' ? 'Torna al login' : 'Back to Login'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'it' ? 'Torna al login' : 'Back to login'}
          </Button>
          <LanguageSwitcher />
        </div>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>
                {language === 'it' ? 'Reimposta la password' : 'Reset Your Password'}
              </CardTitle>
              <CardDescription>
                {language === 'it' 
                  ? 'Inserisci la tua nuova password'
                  : 'Enter your new password below'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">
                    {language === 'it' ? 'Nuova password' : 'New Password'}
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder={language === 'it' ? 'Inserisci nuova password' : 'Enter new password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'it' 
                      ? 'Deve essere lunga almeno 8 caratteri'
                      : 'Must be at least 8 characters long'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">
                    {language === 'it' ? 'Conferma password' : 'Confirm Password'}
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder={language === 'it' ? 'Conferma nuova password' : 'Confirm new password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading 
                    ? (language === 'it' ? 'Reimpostazione...' : 'Resetting...')
                    : (language === 'it' ? 'Reimposta password' : 'Reset Password')}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  {language === 'it' ? 'Torna al login' : 'Back to Login'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
