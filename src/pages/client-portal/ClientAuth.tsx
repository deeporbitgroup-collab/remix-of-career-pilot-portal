import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import bcrypt from "bcryptjs";
import { ArrowLeft } from "lucide-react";
import bgImage from "@/assets/client-portal-bg.jpeg";
import { BriefOverviewForm, BriefOverviewData } from "@/components/client-portal/BriefOverviewForm";
import { ForgotPasswordDialog } from "@/components/client-portal/ForgotPasswordDialog";
const sb = supabase as any;
const ClientAuth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [briefOverviewData, setBriefOverviewData] = useState<BriefOverviewData | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    status: "",
    linkedinUrl: ""
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const isGraduateOrProfessional = signupData.status === "graduate" || signupData.status === "professional" || signupData.status === "master";
  const validateProfileInfo = () => {
    if (isGraduateOrProfessional) {
      return cvFile !== null;
    }
    return cvFile !== null || briefOverviewData !== null;
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupData.status) {
      toast.error("Please select your status");
      return;
    }
    if (!validateProfileInfo()) {
      setShowValidation(true);
      if (isGraduateOrProfessional) {
        toast.error("Please upload your CV to continue");
      } else {
        toast.error("Please upload your CV or complete the Brief Overview form");
      }
      return;
    }
    setIsLoading(true);
    try {
      const normalizedEmail = signupData.email.trim().toLowerCase();

      // Upload CV if provided
      let cvUrl = null;
      if (cvFile) {
        const fileExt = cvFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const {
          data: uploadData,
          error: uploadError
        } = await sb.storage.from('documents').upload(`client-cvs/${fileName}`, cvFile);
        if (uploadError) throw uploadError;
        cvUrl = uploadData.path;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(signupData.password, 10);

      // Insert client user with brief_overview data
      const {
        error: insertError
      } = await sb.from('client_users').insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        first_name: signupData.firstName,
        last_name: signupData.lastName,
        phone: signupData.phone,
        student_status: signupData.status,
        linkedin_url: signupData.linkedinUrl || null,
        cv_url: cvUrl,
        brief_overview: briefOverviewData || null
      });
      if (insertError) throw insertError;

      // Send notification emails
      await sb.functions.invoke('send-client-registration', {
        body: {
          firstName: signupData.firstName,
          lastName: signupData.lastName,
          email: normalizedEmail,
          phone: signupData.phone,
          status: signupData.status,
          linkedinUrl: signupData.linkedinUrl
        }
      });
      toast.success("Thank you for registering! The Career Pilot team will verify your request and send you a confirmation email.");

      // Reset form
      setSignupData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        status: "",
        linkedinUrl: ""
      });
      setCvFile(null);
      setBriefOverviewData(null);
      setShowValidation(false);
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const normalizedEmail = loginData.email.trim().toLowerCase();
      const trimmedPassword = loginData.password.trim();

      // Get user from database
      const {
        data: user,
        error: userError
      } = await sb.from('client_users').select('*').eq('email', normalizedEmail).single();
      if (userError || !user) {
        throw new Error("Invalid email or password");
      }

      // Check if approved
      if (user.status !== 'approved') {
        throw new Error("Your registration is still pending approval. Please wait for admin confirmation.");
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(trimmedPassword, user.password_hash);
      if (!passwordMatch) {
        throw new Error("Invalid email or password");
      }

      // Store session in localStorage
      localStorage.setItem('client_user', JSON.stringify(user));
      toast.success("Login successful!");
      navigate('/client-portal/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center p-4 relative" style={{
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  }}>
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Back to Main Website Button */}
      <Button variant="ghost" size="sm" className="absolute top-4 left-4 z-10 text-white hover:bg-white/20" onClick={() => window.location.href = '/'}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Main Website
      </Button>

      <Card className="w-full max-w-2xl backdrop-blur-sm bg-background/95 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Your Flight Plan</CardTitle>
          <CardDescription>To track your purchased services, access exclusive discounts and network benefits, and purchase additional services, we invite you to register.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" value={loginData.email} onChange={e => setLoginData({
                  ...loginData,
                  email: e.target.value
                })} required />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" value={loginData.password} onChange={e => setLoginData({
                  ...loginData,
                  password: e.target.value
                })} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
                <div className="text-center">
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
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={signupData.firstName} onChange={e => setSignupData({
                    ...signupData,
                    firstName: e.target.value
                  })} required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={signupData.lastName} onChange={e => setSignupData({
                    ...signupData,
                    lastName: e.target.value
                  })} required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={signupData.email} onChange={e => setSignupData({
                  ...signupData,
                  email: e.target.value
                })} required />
                </div>

                <div>
                  <Label htmlFor="phone">Phone (with international prefix) *</Label>
                  <Input id="phone" type="tel" placeholder="+44 1234567890" value={signupData.phone} onChange={e => setSignupData({
                  ...signupData,
                  phone: e.target.value
                })} required />
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" value={signupData.password} onChange={e => setSignupData({
                  ...signupData,
                  password: e.target.value
                })} required minLength={6} />
                </div>

                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select value={signupData.status} onValueChange={value => {
                  setSignupData({
                    ...signupData,
                    status: value
                  });
                  setShowValidation(false);
                  setBriefOverviewData(null);
                  setCvFile(null);
                }} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">High School Student</SelectItem>
                      <SelectItem value="university">University Student</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Brief Overview / CV Section */}
                {signupData.status && <BriefOverviewForm status={signupData.status} cvFile={cvFile} onCvChange={setCvFile} onBriefOverviewChange={setBriefOverviewData} briefOverviewData={briefOverviewData} showValidation={showValidation} />}

                <div>
                  <Label htmlFor="linkedin">LinkedIn Profile URL (Optional)</Label>
                  <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/yourprofile" value={signupData.linkedinUrl} onChange={e => setSignupData({
                  ...signupData,
                  linkedinUrl: e.target.value
                })} />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Registering..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>;
};
export default ClientAuth;