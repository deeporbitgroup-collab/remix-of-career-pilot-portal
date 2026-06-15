import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePathwaysAuth } from '@/contexts/PathwaysAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { Shield, Loader2 } from 'lucide-react';

const PathwaysAdminLogin = () => {
  const navigate = useNavigate();
  const { login } = usePathwaysAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast({
        title: language === 'it' ? 'Accesso effettuato' : 'Login successful',
        description: language === 'it' ? 'Benvenuto Admin' : 'Welcome Admin',
      });
      navigate('/platforms/pathways/admin');
    } else {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: result.error || (language === 'it' ? 'Credenziali non valide' : 'Invalid credentials'),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/10 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Pathways Admin</CardTitle>
          <CardDescription>
            {language === 'it' ? 'Accedi al pannello amministrativo' : 'Access the admin panel'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">{language === 'it' ? 'Email' : 'Email'}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{language === 'it' ? 'Password' : 'Password'}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {language === 'it' ? 'Accedi' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/platforms/pathways')}
              className="text-sm text-muted-foreground"
            >
              {language === 'it' ? '← Torna alla pagina principale' : '← Back to main page'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PathwaysAdminLogin;
