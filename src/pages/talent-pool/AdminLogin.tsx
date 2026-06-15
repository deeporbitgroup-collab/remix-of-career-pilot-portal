import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TalentPoolLanguageProvider, useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";

const AdminLoginContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTalentPoolLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Fixed admin credentials
    if (credentials.email === "Career.Pilot2025@gmail.com" && 
        credentials.password === "Career.Pilot25") {
      
      // Store admin session in localStorage
      localStorage.setItem('talentPoolRole', 'ADMIN');
      localStorage.setItem('talentPoolUser', JSON.stringify({
        id: 'admin-fixed',
        email: credentials.email,
        role: 'ADMIN'
      }));

      toast({
        title: t('adminLogin.success.title'),
        description: t('adminLogin.success.desc'),
      });
      
      navigate("/talent-pool/admin/dashboard");
    } else {
      toast({
        title: t('adminLogin.errors.invalid'),
        description: t('adminLogin.errors.invalidDesc'),
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-cloud-white to-runway-gray flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-card-custom">
        <CardHeader className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit mb-4"
            onClick={() => navigate("/talent-pool")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('adminLogin.back')}
          </Button>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-primary">
            {t('adminLogin.title')}
          </CardTitle>
          <p className="text-center text-steel-gray">
            {t('adminLogin.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('adminLogin.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('adminLogin.emailPlaceholder')}
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t('adminLogin.password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('adminLogin.passwordPlaceholder')}
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-white hover:bg-primary-dark"
              disabled={isLoading}
            >
              {isLoading ? t('adminLogin.loading') : t('adminLogin.button')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminLogin = () => {
  return (
    <TalentPoolLanguageProvider>
      <AdminLoginContent />
    </TalentPoolLanguageProvider>
  );
};

export default AdminLogin;