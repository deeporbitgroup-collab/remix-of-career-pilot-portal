import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Users, Lock, Mail, Phone, User, ArrowLeft, Upload, Linkedin, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { TalentPoolLanguageProvider, useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";
import { ForgotPasswordDialog } from "@/components/talent-pool/ForgotPasswordDialog";

const studentSchema = z.object({
  firstName: z.string().trim().min(1, "Name required").max(100),
  lastName: z.string().trim().min(1, "Surname required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(10, "Invalid phone number"),
  password: z.string().min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "At least one uppercase letter required")
    .regex(/[0-9]/, "At least one number required"),
  confirmPassword: z.string(),
  linkedin: z.string()
    .optional()
    .refine(
      (val) => !val || val === "" || val.startsWith("https://www.linkedin.com/") || val.startsWith("https://linkedin.com/"),
      "Enter a valid LinkedIn URL (https://www.linkedin.com/...)"
    ),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const StudentAuthContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTalentPoolLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [legalDialog, setLegalDialog] = useState<'terms' | 'privacy' | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
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

  const validateForm = () => {
    try {
      studentSchema.parse(formData);
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
        title: t('studentAuth.errors.validation'),
        description: t('studentAuth.errors.validationDesc'),
        variant: "destructive"
      });
      return;
    }

    if (!cvFile || !coverLetterFile) {
      toast({
        title: t('studentAuth.errors.documentsRequired'),
        description: t('studentAuth.errors.documentsRequiredDesc'),
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
        .eq('email', formData.email)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: t('studentAuth.errors.emailExists'),
          description: t('studentAuth.errors.emailExistsDesc'),
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Create user and profile via secure RPC (avoids RLS issues)
      const { data: newUserId, error: regError } = await supabase.rpc('talent_pool_register_student', {
        _first_name: formData.firstName,
        _last_name: formData.lastName,
        _email: formData.email,
        _phone: formData.phone,
        _linkedin: formData.linkedin || '',
        _password_hash: btoa(formData.password)
      });

      if (regError) {
        // Handle specific errors
        if (regError.code === '23505' || regError.message?.includes('duplicate')) {
          toast({
            title: t('studentAuth.errors.emailExists'),
            description: t('studentAuth.errors.emailExistsDesc'),
            variant: "destructive"
          });
        } else {
          toast({
            title: t('studentAuth.errors.registrationError'),
            description: t('studentAuth.errors.registrationErrorDesc'),
            variant: "destructive"
          });
        }
        setIsLoading(false);
        return;
      }

      if (!newUserId) {
        toast({
          title: t('studentAuth.errors.registrationError'),
          description: t('studentAuth.errors.registrationErrorDesc'),
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Upload CV
      const cvPath = `${newUserId}/cv-${Date.now()}.pdf`;
      const { error: cvError } = await supabase.storage
        .from('talent-pool-cv')
        .upload(cvPath, cvFile);

      if (cvError) throw cvError;

      // Upload Cover Letter
      const coverPath = `${newUserId}/cover-${Date.now()}.pdf`;
      const { error: coverError } = await supabase.storage
        .from('talent-pool-covers')
        .upload(coverPath, coverLetterFile);

      if (coverError) throw coverError;

      // Build public URLs
      const cvPublicUrl = supabase.storage.from('talent-pool-cv').getPublicUrl(cvPath).data.publicUrl;
      const coverPublicUrl = supabase.storage.from('talent-pool-covers').getPublicUrl(coverPath).data.publicUrl;

      // Update profile via secure RPC (avoids RLS)
      const { error: updateError } = await supabase.rpc('talent_pool_update_student_documents', {
        _user_id: newUserId,
        _cv_url: cvPublicUrl,
        _cover_url: coverPublicUrl
      });

      if (updateError) throw updateError;

      // Send email notification to Career Pilot admin
      try {
        await supabase.functions.invoke('send-student-registration', {
          body: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            linkedin: formData.linkedin,
            cvUrl: cvPublicUrl,
            coverLetterUrl: coverPublicUrl
          }
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't throw - email failure shouldn't block registration
      }

      toast({
        title: t('studentAuth.success.registrationComplete'),
        description: "Registration complete! Welcome to the Talent Pool.",
      });

      // Auto-login the newly registered student
      try {
        const { data: loginData } = await supabase.rpc('talent_pool_login', {
          _email: formData.email,
          _password: formData.password,
          _role: 'STUDENT'
        });
        if (loginData) {
          const userData = typeof loginData === 'string' ? JSON.parse(loginData) : loginData;
          localStorage.setItem('talentPoolRole', 'STUDENT');
          localStorage.setItem('talentPoolUser', JSON.stringify(userData));
          navigate("/talent-pool/student/dashboard");
          return;
        }
      } catch (e) {
        console.error('Auto-login error:', e);
      }

      navigate("/talent-pool/student");

    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      toast({
        title: t('studentAuth.errors.unexpectedError'),
        description: t('studentAuth.errors.unexpectedErrorDesc'),
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
        _role: 'STUDENT'
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

      // Check status field for access control
      const userStatus = userData.status;

      if (userStatus === 'rejected') {
        toast({
          title: "Access Denied",
          description: "Your account has been deactivated.",
          variant: "destructive"
        });
        return;
      }


      // Store session
      localStorage.setItem('talentPoolRole', 'STUDENT');
      localStorage.setItem('talentPoolUser', JSON.stringify(userData));

      // Redirect to dashboard - it will handle payment logic
      toast({
        title: t('studentAuth.success.loginSuccess'),
        description: t('studentAuth.success.loginSuccessDesc'),
      });
      navigate("/talent-pool/student/dashboard");
    } catch (error: any) {
      toast({
        title: t('studentAuth.errors.loginError'),
        description: error.message || t('studentAuth.errors.invalidCredentials'),
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
            {t('studentAuth.back')}
          </Button>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-sky-blue/20 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-sky" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-sky">
            {t('studentAuth.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('studentAuth.tabs.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('studentAuth.tabs.register')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('studentAuth.login.email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('studentAuth.login.password')}</Label>
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
                  className="w-full bg-gradient-sky text-white hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? t('studentAuth.login.loading') : t('studentAuth.login.button')}
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
                role="STUDENT"
              />
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('studentAuth.register.firstName')} {t('studentAuth.register.required')}</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('studentAuth.register.lastName')} {t('studentAuth.register.required')}</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('studentAuth.register.cv')} {t('studentAuth.register.required')}
                    </Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                      required
                    />
                    <p className="text-xs text-steel-gray">
                      {cvFile ? cvFile.name : t('studentAuth.register.noFile')}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('studentAuth.register.coverLetter')} {t('studentAuth.register.required')}
                    </Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
                      required
                    />
                    <p className="text-xs text-steel-gray">
                      {coverLetterFile ? coverLetterFile.name : t('studentAuth.register.noFile')}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t('studentAuth.register.email')} {t('studentAuth.register.required')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('studentAuth.register.phone')} {t('studentAuth.register.required')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin">{t('studentAuth.register.linkedin')}</Label>
                  <Input
                    id="linkedin"
                    type="text"
                    placeholder="https://www.linkedin.com/in/your-profile"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                    className={errors.linkedin ? "border-red-500" : ""}
                  />
                  {errors.linkedin && <p className="text-red-500 text-sm">{errors.linkedin}</p>}
                  <p className="text-xs text-steel-gray">Optional - Enter your full LinkedIn profile</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="password">{t('studentAuth.register.password')} {t('studentAuth.register.required')}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                    <p className="text-xs text-steel-gray">{t('studentAuth.register.passwordHint')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('studentAuth.register.confirmPassword')} {t('studentAuth.register.required')}</Label>
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
                    {t('studentAuth.register.terms')}{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDialog('terms')}
                      className="text-sky hover:underline"
                    >
                      {t('studentAuth.register.termsLink')}
                    </button>
                    {' '}{t('studentAuth.register.and')}{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDialog('privacy')}
                      className="text-sky hover:underline"
                    >
                      {t('studentAuth.register.privacyLink')}
                    </button>
                  </Label>
                </div>
                {errors.termsAccepted && <p className="text-red-500 text-sm">{errors.termsAccepted}</p>}
                
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-amber-900 mb-2">
                    ⚠️ Important Platform Policy
                  </p>
                  <p className="text-sm text-amber-800">
                    It is strictly prohibited to communicate with companies that have selected you outside of this platform. All communication must remain within the CareerPilot Talent Pool platform to ensure transparency and compliance with our policies.
                  </p>
                </div>
                
                <div className="bg-sky-blue/10 p-4 rounded-lg border border-sky-blue/20">
                  <p className="text-sm text-steel-gray">
                    {t('studentAuth.register.studentPlan')}
                  </p>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-sky text-white hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? t('studentAuth.register.loading') : t('studentAuth.register.button')}
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

// Talent Pool Student Authentication - Wrapped with Language Provider
const StudentAuth = () => {
  return (
    <TalentPoolLanguageProvider>
      <StudentAuthContent />
    </TalentPoolLanguageProvider>
  );
};

export default StudentAuth;