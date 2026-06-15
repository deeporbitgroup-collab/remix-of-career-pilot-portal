import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Users, Building, Shield, ArrowLeft } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import AssociateSignupForm from "@/components/auth/AssociateSignupForm";
import PartnerSignupForm from "@/components/auth/PartnerSignupForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import crewPortalBg from "@/assets/crew-portal-bg-mountain.jpeg";

const Auth = () => {
  const [activeRole, setActiveRole] = useState<'associate' | 'partner' | 'admin'>('associate');
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url(${crewPortalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="container mx-auto px-4 py-4 relative z-10">
        {/* Header with Back Button and Language Switcher */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'it' ? 'Torna al sito' : 'Back to site'}
          </Button>
          <LanguageSwitcher />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2 text-white">
              {language === 'it' ? 'Crew Portal' : 'Crew Portal'}
            </h1>
            <p className="text-white/90 text-base">
              {language === 'it' 
                ? 'Accedi al tuo spazio professionale Career Pilot'
                : 'Access your Career Pilot professional space'}
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-2">
            <Card 
              className={`cursor-pointer transition-all duration-300 backdrop-blur-md bg-background/95 relative ${
                activeRole === 'associate' 
                  ? 'ring-2 ring-primary shadow-lg scale-105' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setActiveRole('associate')}
            >
              {/* Join Us Badge */}
              <div className="absolute -top-1 -left-1 z-10">
                <div className="bg-blue-500 text-white text-xs font-semibold px-4 py-1 rounded-br-lg shadow-md transform -rotate-12 origin-top-left">
                  Join Us!
                </div>
              </div>
              {/* Earnings Badge */}
              <div className="absolute -top-2 -right-2 z-10">
                <div className="bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                  💰 Earn 70% per service
                </div>
              </div>
              <CardHeader className="text-center py-4">
                <Users className="h-10 w-10 mx-auto mb-2 text-primary" />
                <CardTitle>Associate</CardTitle>
                <CardDescription>
                  {language === 'it' 
                    ? 'Accedi come collaboratore Career Pilot'
                    : 'Login as Career Pilot associate'}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-300 backdrop-blur-md bg-background/95 ${
                activeRole === 'partner' 
                  ? 'ring-2 ring-primary shadow-lg scale-105' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setActiveRole('partner')}
            >
              <CardHeader className="text-center py-4">
                <Building className="h-10 w-10 mx-auto mb-2 text-primary" />
                <CardTitle>Partner</CardTitle>
                <CardDescription>
                  {language === 'it' 
                    ? 'Accedi come azienda partner'
                    : 'Login as partner company'}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Discreet CPA (Admin) access */}
          <div className="text-center mb-4">
            <button
              type="button"
              onClick={() => setActiveRole('admin')}
              className={`text-xs tracking-[0.3em] font-semibold transition-colors ${
                activeRole === 'admin'
                  ? 'text-primary underline underline-offset-4'
                  : 'text-white/80 hover:text-white'
              }`}
              aria-label="CPA access"
            >
              CPA
            </button>
          </div>

          {/* Authentication Forms */}
          <Card className="max-w-2xl mx-auto backdrop-blur-md bg-background/95 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">
                {activeRole === 'associate' && (language === 'it' ? 'Area Associate' : 'Associate Area')}
                {activeRole === 'partner' && (language === 'it' ? 'Area Partner' : 'Partner Area')}
                {activeRole === 'admin' && (language === 'it' ? 'Area Admin' : 'Admin Area')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {activeRole === 'admin' ? (
                <LoginForm role="ADMIN" />
              ) : (
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">{language === 'it' ? 'Accedi' : 'Login'}</TabsTrigger>
                    <TabsTrigger value="register">{language === 'it' ? 'Registrati / Join' : 'Register / Join'}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <LoginForm role={activeRole === 'associate' ? 'ASSOCIATE' : 'PARTNER'} />
                  </TabsContent>
                  
                  <TabsContent value="register">
                    {activeRole === 'associate' ? (
                      <AssociateSignupForm />
                    ) : (
                      <PartnerSignupForm />
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;