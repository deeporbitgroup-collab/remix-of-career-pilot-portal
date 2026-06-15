import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GraduationCap, Globe, Users, Award, Loader2, MapPin, Info } from 'lucide-react';
import { usePathwaysAuth } from '@/contexts/PathwaysAuthContext';
import { useI18n } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import BookingPopup from '@/components/BookingPopup';
import pathwaysHero from '@/assets/pathways-hero.jpg';

const Pathways = () => {
  const navigate = useNavigate();
  const { login, register, user } = usePathwaysAuth();
  const { language, t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    school: '',
    password: '',
    confirmPassword: '',
  });

  // Redirect if already logged in
  if (user) {
    if (user.role === 'ADMIN') {
      navigate('/platforms/pathways/admin');
    } else {
      if (user.status === 'active') {
        navigate('/platforms/pathways/catalog');
      } else {
        navigate('/platforms/pathways/account');
      }
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(loginEmail, loginPassword);
    
    setLoading(false);

    if (result.success) {
      toast({
        title: language === 'it' ? 'Accesso effettuato' : 'Login successful',
        description: language === 'it' ? 'Benvenuto!' : 'Welcome!',
      });
    } else {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: result.error || (language === 'it' ? 'Credenziali non valide' : 'Invalid credentials'),
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: language === 'it' ? 'Le password non coincidono' : 'Passwords do not match',
      });
      return;
    }

    if (registerData.password.length < 8) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: language === 'it' ? 'La password deve essere almeno 8 caratteri' : 'Password must be at least 8 characters',
      });
      return;
    }

    setLoading(true);

    const result = await register(registerData);
    
    setLoading(false);

    if (result.success) {
      toast({
        title: language === 'it' ? 'Registrazione completata' : 'Registration successful',
        description: language === 'it' ? 'Benvenuto su Pathways!' : 'Welcome to Pathways!',
      });
    } else {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: result.error || (language === 'it' ? 'Registrazione fallita' : 'Registration failed'),
      });
    }
  };

  const categoryDetails = {
    volunteering: {
      title: language === 'it' ? 'Volontariato' : 'Volunteering',
      description: language === 'it' 
        ? 'Scopri opportunità di volontariato in diversi settori: sociale, educativo, ambientale, sanitario, animali e culturale. Il volontariato ti permette di fare la differenza nella comunità mentre sviluppi competenze preziose e arricchisci il tuo percorso personale.'
        : 'Discover volunteering opportunities in various sectors: social, educational, environmental, healthcare, animals, and cultural. Volunteering allows you to make a difference in the community while developing valuable skills and enriching your personal journey.',
    },
    languages: {
      title: language === 'it' ? 'Corsi di Lingua' : 'Language Courses',
      description: language === 'it'
        ? 'Esplora corsi di lingua in Inglese, Francese, Italiano, Spagnolo, Tedesco, Cinese e Russo. Impara nuove lingue per ampliare i tuoi orizzonti, migliorare le tue opportunità professionali e connetterti con culture diverse in tutto il mondo.'
        : 'Explore language courses in English, French, Italian, Spanish, German, Chinese, and Russian. Learn new languages to broaden your horizons, improve your professional opportunities, and connect with different cultures around the world.',
    },
    exchange: {
      title: language === 'it' ? 'Exchange' : 'Exchange',
      description: language === 'it'
        ? 'Partecipa a programmi di scambio culturale e accademico. Vivi esperienze internazionali uniche, studia all\'estero, scopri nuove culture e crea connessioni globali che dureranno tutta la vita.'
        : 'Participate in cultural and academic exchange programs. Experience unique international opportunities, study abroad, discover new cultures, and create global connections that will last a lifetime.',
    },
    public_speaking: {
      title: language === 'it' ? 'Public Speaking' : 'Public Speaking',
      description: language === 'it'
        ? 'Migliora le tue capacità di comunicazione e presentazione in pubblico. Impara tecniche professionali per parlare con sicurezza, persuadere il tuo pubblico e lasciare un\'impressione duratura in ogni contesto professionale o accademico.'
        : 'Improve your communication and public presentation skills. Learn professional techniques to speak confidently, persuade your audience, and make a lasting impression in any professional or academic context.',
    },
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 via-sky-blue/5 to-background">
      {/* Language Switcher and Info Button - Top Right */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowInfoDialog(true)}
          className="bg-white/90 hover:bg-white shadow-sm"
        >
          <Info className="h-5 w-5 text-primary" />
        </Button>
        <LanguageSwitcher />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden h-[200px] md:h-[240px]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${pathwaysHero})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-sky-blue/80" />
        </div>
        <div className="relative container mx-auto h-full flex flex-col items-center justify-center text-center text-white px-4">
          <GraduationCap className="h-12 w-12 md:h-16 md:w-16 mb-3 animate-float" />
          <h1 className="text-2xl md:text-4xl font-bold mb-2 animate-fade-up">
            {t('pathways.title')}
          </h1>
          <p className="text-sm md:text-lg animate-fade-up animation-delay-100 max-w-2xl">
            {t('pathways.description')}
          </p>
        </div>
      </div>

      {/* Eligibility Notice */}
      <div className="container mx-auto px-4 pt-4 pb-3">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Platform under development banner */}
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border-2 border-amber-500/40 rounded-lg p-3 shadow-sm animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-spin" />
              <p className="text-xs md:text-sm text-amber-900 dark:text-amber-200 font-semibold text-center">
                Platform under development — features and access are being finalised. Thanks for your patience!
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 via-sky-blue/10 to-primary/10 border border-primary/20 rounded-lg p-2 shadow-sm animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
              <p className="text-xs md:text-sm text-steel-gray font-medium text-center">
                {language === 'it' 
                  ? 'La piattaforma è dedicata esclusivamente a studenti dei licei di Milano (Italia).'
                  : 'This platform is exclusively dedicated to high school students in Milan (Italy).'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
          <Card 
            className="text-center animate-scale-in hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => setSelectedCategory('volunteering')}
          >
            <CardContent className="pt-3 pb-3">
              <Globe className="h-7 w-7 md:h-8 md:w-8 mx-auto mb-1 text-primary" />
              <h3 className="font-bold text-xs md:text-sm">{t('pathways.categories.volunteering')}</h3>
            </CardContent>
          </Card>
          <Card 
            className="text-center animate-scale-in animation-delay-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => setSelectedCategory('languages')}
          >
            <CardContent className="pt-3 pb-3">
              <Users className="h-7 w-7 md:h-8 md:w-8 mx-auto mb-1 text-primary" />
              <h3 className="font-bold text-xs md:text-sm">{t('pathways.categories.languages')}</h3>
            </CardContent>
          </Card>
          <Card 
            className="text-center animate-scale-in animation-delay-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => setSelectedCategory('exchange')}
          >
            <CardContent className="pt-3 pb-3">
              <GraduationCap className="h-7 w-7 md:h-8 md:w-8 mx-auto mb-1 text-primary" />
              <h3 className="font-bold text-xs md:text-sm">{t('pathways.categories.exchange')}</h3>
            </CardContent>
          </Card>
          <Card 
            className="text-center animate-scale-in animation-delay-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => setSelectedCategory('public_speaking')}
          >
            <CardContent className="pt-3 pb-3">
              <Award className="h-7 w-7 md:h-8 md:w-8 mx-auto mb-1 text-primary" />
              <h3 className="font-bold text-xs md:text-sm">{t('pathways.categories.public_speaking')}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Login/Register Forms */}
        <div className="max-w-md mx-auto pb-3">
          <Tabs defaultValue="login" className="w-full animate-fade-in animation-delay-400">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('pathways.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('pathways.signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>{t('pathways.login')}</CardTitle>
                  <CardDescription>{language === 'it' ? 'Accedi al tuo account Pathways' : 'Access your Pathways account'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">{t('auth.email')}</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password">{t('auth.password')}</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="text-right">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => navigate('/platforms/pathways/forgot-password')}
                        className="text-xs text-muted-foreground hover:text-primary p-0 h-auto"
                      >
                        {language === 'it' ? 'Password dimenticata?' : 'Forgot password?'}
                      </Button>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('pathways.login')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>{t('pathways.signup')}</CardTitle>
                  <CardDescription>{language === 'it' ? 'Crea il tuo account Pathways' : 'Create your Pathways account'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">{t('pathways.application.firstName')}</Label>
                        <Input
                          id="firstName"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">{t('pathways.application.lastName')}</Label>
                        <Input
                          id="lastName"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">{t('pathways.application.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{t('pathways.application.phone')}</Label>
                      <Input
                        id="phone"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="school">{t('pathways.application.school')}</Label>
                      <Input
                        id="school"
                        value={registerData.school}
                        onChange={(e) => setRegisterData({ ...registerData, school: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">{t('auth.password')}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        minLength={8}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                        minLength={8}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('pathways.signup')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Admin Login Link */}
          <div className="text-center mt-2">
            <Button
              variant="link"
              onClick={() => navigate('/platforms/pathways/admin/login')}
              className="text-steel-gray hover:text-primary text-xs"
            >
              {language === 'it' ? 'Accesso Amministratore' : 'Admin Login'}
            </Button>
          </div>
        </div>
      </div>

      {/* Category Details Dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedCategory && categoryDetails[selectedCategory as keyof typeof categoryDetails].title}
            </DialogTitle>
            <DialogDescription className="text-base pt-4">
              {selectedCategory && categoryDetails[selectedCategory as keyof typeof categoryDetails].description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setSelectedCategory(null)} variant="outline">
              {language === 'it' ? 'Chiudi' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {language === 'it' ? 'Come Funziona Pathways' : 'How Pathways Works'}
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-4">
              <p>
                {language === 'it' 
                  ? 'Prima di utilizzare questa piattaforma, è necessario fare una chiamata gratuita con un membro del nostro team che ti indirizzerà su cosa fare in base al tuo profilo e ai tuoi obiettivi.'
                  : 'Before using this platform, you need to have a free call with a member of our team who will guide you on what to do based on your profile and goals.'}
              </p>
              <p className="font-semibold">
                {language === 'it' 
                  ? 'Prenota ora il tuo check-in gratuito per iniziare!'
                  : 'Book your free check-in now to get started!'}
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => setShowInfoDialog(false)} variant="outline" className="flex-1">
              {language === 'it' ? 'Chiudi' : 'Close'}
            </Button>
            <Button 
              onClick={() => {
                setShowInfoDialog(false);
                setShowBookingPopup(true);
              }} 
              className="flex-1 bg-gradient-sky"
            >
              {language === 'it' ? 'Prenota Check-in Gratuito' : 'Book Free Check-in'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Popup */}
      <BookingPopup isOpen={showBookingPopup} onClose={() => setShowBookingPopup(false)} />
    </div>
  );
};

export default Pathways;