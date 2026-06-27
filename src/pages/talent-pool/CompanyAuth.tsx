import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Building, Lock, Mail, ArrowLeft, Linkedin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { TalentPoolLanguageProvider, useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";
import { ForgotPasswordDialog } from "@/components/talent-pool/ForgotPasswordDialog";

import { ForgotPasswordDialog } from "@/components/talent-pool/ForgotPasswordDialog";
import { TALENT_POOL_COMPANY_SECTORS } from "@/data/talentPoolSectors";

const companySchema = z.object({
  companyName: z.string().trim().min(1, "Company name required").max(200),
  sector: z.string().min(1, "Sector required"),
  size: z.enum(["STARTUP", "BOUTIQUE", "MEDIUM_SIZE", "LARGE_COMPANY"]),
  referenceEmail: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "At least one uppercase letter required")
    .regex(/[0-9]/, "At least one number required"),
  confirmPassword: z.string(),
  linkedin: z.string().url().optional().or(z.literal("")),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const CompanyAuthContent = () => {
  const { toast } = useToast();
  const { t } = useTalentPoolLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [legalDialog, setLegalDialog] = useState<'terms' | 'privacy' | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: "",
    sector: "",
    size: "",
    referenceEmail: "",
    password: "",
    confirmPassword: "",
    linkedin: "",
    termsAccepted: false
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Robust UTF-8 safe base64 encoding for passwords
  const toBase64 = (s: string) => {
    try {
      return btoa(unescape(encodeURIComponent(s)));
    } catch {
      return btoa(s);
    }
  };

  const validateForm = () => {
    try {
      companySchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: t('companyAuth.errors.validation'),
        description: t('companyAuth.errors.validationDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('talent_pool_users')
        .select('id')
        .eq('email', formData.referenceEmail)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: t('companyAuth.errors.emailExists'),
          description: t('companyAuth.errors.emailExistsDesc'),
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Register user via secure RPC (bypasses RLS)
      const { data: newUserId, error: regError } = await supabase.rpc('talent_pool_register_user', {
        _email: formData.referenceEmail,
        _password_base64: toBase64(formData.password),
        _role: 'COMPANY'
      });

      if (regError || !newUserId) {
        console.error('Company registration error:', regError);
        const isDuplicate = !!(regError && (regError.code === '23505' || regError.message?.toLowerCase().includes('duplicate') || regError.message?.toLowerCase().includes('unique')));
        toast({
          title: isDuplicate ? t('companyAuth.errors.emailExists') : t('companyAuth.errors.registrationError'),
          description: isDuplicate ? t('companyAuth.errors.emailExistsDesc') : (regError?.message || t('companyAuth.errors.registrationErrorDesc')),
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const userId = newUserId as string;

      // Create company profile via secure RPC to bypass RLS
      const { error: profileError } = await supabase.rpc('talent_pool_create_company_profile', {
        _user_id: userId,
        _company_name: formData.companyName,
        _sector: formData.sector,
        _size: formData.size as any,
        _reference_email: formData.referenceEmail,
        _linkedin_url: formData.linkedin || ''
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Rollback user creation if profile fails
        await supabase
          .from('talent_pool_users')
          .delete()
          .eq('id', userId);
        
        toast({
          title: t('companyAuth.errors.profileError'),
          description: t('companyAuth.errors.profileErrorDesc'),
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Send notification email to admin
      try {
        await supabase.functions.invoke('send-company-registration', {
          body: {
            companyName: formData.companyName,
            email: formData.referenceEmail,
            sector: formData.sector,
            size: formData.size,
            referenceEmail: formData.referenceEmail,
            linkedin: formData.linkedin
          }
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      toast({
        title: t('companyAuth.success.registrationComplete'),
        description: t('companyAuth.success.registrationCompleteDesc'),
      });

      // Reset form
      setFormData({
        companyName: "",
        sector: "",
        size: "",
        referenceEmail: "",
        password: "",
        confirmPassword: "",
        linkedin: "",
        termsAccepted: false
      });

      // Redirect away from the registration page to prevent double registration
      navigate('/talent-pool');
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      toast({
        title: t('companyAuth.errors.unexpectedError'),
        description: t('companyAuth.errors.unexpectedErrorDesc'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call secure RPC function for login (bypasses RLS)
      const { data, error } = await supabase.rpc('talent_pool_login', {
        _email: loginData.email,
        _password: loginData.password,
        _role: 'COMPANY'
      });

      if (error) {
        if (error.code === '28000' || error.message?.includes('INVALID_CREDENTIALS')) {
          throw new Error("Invalid credentials");
        }
        throw error;
      }

      if (!data) {
        throw new Error("Error during login");
      }

      // Parse the JSONB response
      const userData = typeof data === 'string' ? JSON.parse(data) : data;

      // Check registration status
      if (userData.registration_status === 'PENDING') {
        toast({
          title: t('companyAuth.status.pending'),
          description: t('companyAuth.status.pendingDesc'),
          variant: "destructive"
        });
        return;
      }

      if (userData.registration_status === 'REJECTED') {
        toast({
          title: t('companyAuth.status.rejected'),
          description: t('companyAuth.status.rejectedDesc'),
          variant: "destructive"
        });
        return;
      }


      // Store session
      localStorage.setItem('talentPoolRole', 'COMPANY');
      localStorage.setItem('talentPoolUser', JSON.stringify(userData));

      toast({
        title: t('companyAuth.success.loginSuccess'),
        description: t('companyAuth.success.loginSuccessDesc'),
      });

      navigate("/talent-pool/company/dashboard");
    } catch (error: any) {
      toast({
        title: t('companyAuth.errors.loginError'),
        description: error.message || t('companyAuth.errors.invalidCredentials'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-cloud-white to-runway-gray flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl shadow-card-custom">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit mb-4"
            onClick={() => navigate("/talent-pool")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('companyAuth.back')}
          </Button>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <Building className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-green-600">
            {t('companyAuth.title')}
          </CardTitle>
          <p className="text-center text-steel-gray">
            {t('companyAuth.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('companyAuth.tabs.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('companyAuth.tabs.register')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('companyAuth.login.email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('companyAuth.login.password')}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? t('companyAuth.login.loading') : t('companyAuth.login.button')}
                </Button>
                
                <div className="text-center mt-4">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot your password?
                  </Button>
                </div>
              </form>
              
              <ForgotPasswordDialog 
                open={showForgotPassword}
                onOpenChange={setShowForgotPassword}
                role="COMPANY"
              />
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('companyAuth.register.companyName')} {t('companyAuth.register.required')}</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className={errors.companyName ? "border-red-500" : ""}
                  />
                  {errors.companyName && <p className="text-red-500 text-sm">{errors.companyName}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sector">{t('companyAuth.register.sector')} {t('companyAuth.register.required')}</Label>
                    <Select
                      value={formData.sector}
                      onValueChange={(value) => setFormData({...formData, sector: value})}
                    >
                      <SelectTrigger className={errors.sector ? "border-red-500" : ""}>
                        <SelectValue placeholder={t('companyAuth.register.sectorPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {TALENT_POOL_COMPANY_SECTORS.map(sector => (
                          <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.sector && <p className="text-red-500 text-sm">{errors.sector}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="size">{t('companyAuth.register.size')} {t('companyAuth.register.required')}</Label>
                    <Select
                      value={formData.size}
                      onValueChange={(value) => setFormData({...formData, size: value})}
                    >
                      <SelectTrigger className={errors.size ? "border-red-500" : ""}>
                        <SelectValue placeholder={t('companyAuth.register.sizePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STARTUP">Startup</SelectItem>
                        <SelectItem value="BOUTIQUE">Boutique</SelectItem>
                        <SelectItem value="MEDIUM_SIZE">Medium size</SelectItem>
                        <SelectItem value="LARGE_COMPANY">Large company</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.size && <p className="text-red-500 text-sm">{errors.size}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="referenceEmail">{t('companyAuth.register.email')} {t('companyAuth.register.required')}</Label>
                  <Input
                    id="referenceEmail"
                    type="email"
                    value={formData.referenceEmail}
                    onChange={(e) => setFormData({...formData, referenceEmail: e.target.value})}
                    className={errors.referenceEmail ? "border-red-500" : ""}
                  />
                  {errors.referenceEmail && <p className="text-red-500 text-sm">{errors.referenceEmail}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin">{t('companyAuth.register.linkedin')}</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder={t('companyAuth.register.linkedinPlaceholder')}
                    value={formData.linkedin}
                    onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('companyAuth.register.password')} {t('companyAuth.register.required')}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                    <p className="text-xs text-steel-gray">{t('companyAuth.register.passwordHint')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('companyAuth.register.confirmPassword')} {t('companyAuth.register.required')}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className={errors.confirmPassword ? "border-red-500" : ""}
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => 
                      setFormData({...formData, termsAccepted: checked as boolean})
                    }
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    {t('companyAuth.register.terms')}{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDialog('terms')}
                      className="text-green-600 hover:underline"
                    >
                      {t('companyAuth.register.termsLink')}
                    </button>
                    {' '}{t('companyAuth.register.and')}{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDialog('privacy')}
                      className="text-green-600 hover:underline"
                    >
                      {t('companyAuth.register.privacyLink')}
                    </button>
                  </Label>
                </div>
                {errors.termsAccepted && <p className="text-red-500 text-sm">{errors.termsAccepted}</p>}
                
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-amber-900 mb-2">
                    ⚠️ Important Platform Policy
                  </p>
                  <p className="text-sm text-amber-800">
                    It is strictly prohibited to communicate with students you have selected outside of this platform. All communication must remain within the CareerPilot Talent Pool platform to ensure transparency and compliance with our policies.
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    {t('companyAuth.register.freeNote')}
                  </p>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? t('companyAuth.register.loading') : t('companyAuth.register.button')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={legalDialog !== null} onOpenChange={() => setLegalDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {legalDialog === 'terms' ? t('legal.termsTitle') : t('legal.privacyTitle')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="whitespace-pre-wrap text-sm">
              {legalDialog === 'terms' ? t('legal.termsContent') : t('legal.privacyContent')}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CompanyAuth = () => {
  return (
    <TalentPoolLanguageProvider>
      <CompanyAuthContent />
    </TalentPoolLanguageProvider>
  );
};

export default CompanyAuth;