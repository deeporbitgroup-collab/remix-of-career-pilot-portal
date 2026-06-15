import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import bgImage from "@/assets/client-portal-bg.jpeg";

const ClientResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetComplete, setResetComplete] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Link non valido o scaduto");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La password deve essere almeno 6 caratteri");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Le password non corrispondono");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('complete-client-password-reset', {
        body: { token, newPassword }
      });

      if (error) throw error;

      if (data?.success) {
        setResetComplete(true);
        toast.success("Password reimpostata con successo!");
        setTimeout(() => navigate('/client-portal/auth'), 3000);
      } else {
        toast.error(data?.error || "Impossibile reimpostare la password");
      }
    } catch (error: any) {
      console.error("Reset error:", error);
      toast.error(error.message || "Errore durante il reset della password");
    } finally {
      setLoading(false);
    }
  };

  if (resetComplete) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <Card className="w-full max-w-md backdrop-blur-sm bg-background/95 shadow-2xl z-10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-green-600">Password Reimpostata!</CardTitle>
            <CardDescription>
              La tua password è stata reimpostata con successo. Verrai reindirizzato alla pagina di login...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/client-portal/auth')}
            >
              Vai al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <Card className="w-full max-w-md backdrop-blur-sm bg-background/95 shadow-2xl z-10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 rounded-full">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-destructive">Link Non Valido</CardTitle>
            <CardDescription>
              Questo link per reimpostare la password non è valido o è scaduto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate('/client-portal/auth')}
            >
              Torna al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="absolute top-4 left-4 z-10 text-white hover:bg-white/20" 
        onClick={() => navigate('/client-portal/auth')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Torna al Login
      </Button>

      <Card className="w-full max-w-md backdrop-blur-sm bg-background/95 shadow-2xl z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Lock className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle>Reimposta Password</CardTitle>
          <CardDescription>
            Inserisci la tua nuova password qui sotto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Inserisci nuova password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Minimo 6 caratteri
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Conferma Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Conferma nuova password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reimpostazione...
                </>
              ) : (
                "Reimposta Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientResetPassword;
