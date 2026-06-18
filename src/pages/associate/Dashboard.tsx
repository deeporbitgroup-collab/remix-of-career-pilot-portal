import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  LogOut, User, FileText,
  ChevronRight, FileDown,
  Briefcase, History, GraduationCap, UserCircle, TrendingUp,
  MessageCircle, Mail, Clock
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { KpiCarousel } from "@/components/KpiCarousel";
import AnnouncementDisplay from "@/components/AnnouncementDisplay";
import QuickOnboarding from "@/components/associate/QuickOnboarding";
import AssociateClientProjects from "@/components/associate/AssociateClientProjects";
import AssociateVideoCard from "@/components/associate/AssociateVideoCard";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface KPIData {
  definition: {
    id: string;
    key: string;
    label: string;
    description: string | null;
    chart_type: 'number' | 'bar' | 'pie';
  };
  value: number;
  updated_at: string;
}

const sb = supabase as any;

const AssociateDashboard = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { language, t } = useI18n();
  const isEn = language === 'en';

  const loadAll = () => {
    setIsLoading(true);
    fetchUserData();
    fetchKPIs();
    fetchNotifications();
    fetchProjectsForChart();
  };

  useEffect(() => {
    loadAll();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: definitions } = await supabase
        .from('kpi_definitions')
        .select('*')
        .eq('applies_to', 'ASSOCIATE')
        .eq('enabled', true)
        .order('order_index');

      const { data: values } = await supabase
        .from('kpi_values')
        .select('*')
        .eq('user_id', user.id);

      const kpiMap = new Map(values?.map(v => [v.kpi_definition_id, v]) || []);

      const kpiDataFormatted: KPIData[] = (definitions || []).map(def => ({
        definition: def,
        value: kpiMap.get(def.id)?.value || 0,
        updated_at: kpiMap.get(def.id)?.updated_at || new Date().toISOString()
      }));

      setKpiData(kpiDataFormatted);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchProjectsForChart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await sb
        .from('client_projects')
        .select('id, status, updated_at, created_at')
        .eq('associate_id', user.id);
      if (error) throw error;
      const completed = (data || []).filter((p: any) => p.status === 'completed');
      setCompletedProjects(completed);
      setActiveCount((data || []).filter((p: any) => p.status !== 'completed').length);
    } catch (error) {
      console.error('Error fetching projects for chart:', error);
    }
  };

  // Build "completed projects per month" series for the last 12 months
  const performanceSeries = useMemo(() => {
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(isEn ? 'en-US' : 'it-IT', { month: 'short' });
      months.push({ key, label, count: 0 });
    }
    const map = new Map(months.map(m => [m.key, m]));
    completedProjects.forEach(p => {
      const ts = p.updated_at || p.created_at;
      if (!ts) return;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = map.get(key);
      if (m) m.count += 1;
    });
    return months;
  }, [completedProjects, isEn]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // While the profile is loading, show a spinner instead of a half-empty page.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Profile failed to load (e.g. session lost): show an actionable error instead
  // of silently rendering an empty dashboard with no project lists.
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-xl border bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold">{isEn ? "Couldn't load your dashboard" : "Impossibile caricare la dashboard"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isEn
              ? "We couldn't load your profile. Please retry, or sign in again."
              : "Non siamo riusciti a caricare il tuo profilo. Riprova o accedi di nuovo."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={loadAll}>{isEn ? "Retry" : "Riprova"}</Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              {isEn ? "Home" : "Home"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold leading-tight">
                  {t('dashboard.welcome')}, {userProfile?.first_name} {userProfile?.last_name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {t('associate.dashboard')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('auth.logout')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-5">
        {/* Priority announcements */}
        <AnnouncementDisplay userRole="ASSOCIATE" />

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-3 space-y-2">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-sm">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.message}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => markNotificationAsRead(notif.id)}>
                  {t('notifications.markAsRead')}
                </Button>
              </div>
            ))}
          </div>
        )}


        {/* Tabs */}
        <Tabs defaultValue="operations" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/60">
            <TabsTrigger value="operations" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Briefcase className="h-4 w-4" />
              <span className="font-semibold">{isEn ? 'Operations' : 'Operativa'}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-4 w-4" />
              <span className="font-semibold">{isEn ? 'History & Performance' : 'Storico & Performance'}</span>
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
              <span className="font-semibold">{isEn ? 'Onboarding & Prep' : 'Onboarding & Prep.'}</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserCircle className="h-4 w-4" />
              <span className="font-semibold">{isEn ? 'Profile & Contacts' : 'Profilo & Contatti'}</span>
            </TabsTrigger>
          </TabsList>

          {/* === OPERATIONS === */}
          <TabsContent value="operations" className="mt-4 space-y-4">
            {/* Payment note (compact) */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="py-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">!</div>
                  <p className="text-sm text-amber-800 dark:text-amber-200 flex-1 min-w-[200px]">
                    {isEn
                      ? 'Payment to the associate will be made only after the call with the client has been completed.'
                      : "Il pagamento all'associate verrà effettuato solo dopo lo svolgimento della call con il cliente."}
                  </p>
                  <div className="ml-auto bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                    💰 {isEn ? 'Associates earn 70% per service completed' : 'Gli associate ricevono il 70% per ogni servizio realizzato'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service structure overview video */}
            <AssociateVideoCard
              isEn={isEn}
              title={isEn ? 'Service Structure Overview' : 'Panoramica Struttura del Servizio'}
              description={isEn
                ? 'How the service is organised: general structure, email notifications & updates, and how each service is built.'
                : 'Come è organizzato il servizio: struttura generale, notifiche email e aggiornamenti, e composizione dei singoli servizi.'}
              src="/videos/associate-structure.mp4"
              compact
            />

            {userProfile && (
              <AssociateClientProjects associateId={userProfile.id} language={language} mode="active" />
            )}

            {/* Quick guide for non-deliverable projects */}
            <AssociateVideoCard
              isEn={isEn}
              title={isEn ? 'Quick guide' : 'Guida rapida'}
              description={isEn
                ? 'For non-deliverable projects (Associate Office Hours and Expert Career Sessions).'
                : 'Per i progetti senza deliverable (Associate Office Hours ed Expert Career Session).'}
              src="/videos/associate-guide.mp4"
              compact
            />
          </TabsContent>

          {/* === HISTORY & PERFORMANCE === */}
          <TabsContent value="history" className="mt-4 space-y-4">
            {/* Headline KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {isEn ? 'Completed' : 'Completati'}
                  </p>
                  <p className="text-3xl font-bold text-primary">{completedProjects.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {isEn ? 'Active' : 'Attivi'}
                  </p>
                  <p className="text-3xl font-bold text-primary">{activeCount}</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 md:col-span-1">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {isEn ? 'This month' : 'Questo mese'}
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {performanceSeries[performanceSeries.length - 1]?.count ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* KPI carousel from admin */}
            {kpiData.length > 0 && (
              <KpiCarousel kpiData={kpiData} language={language} updateLabel={t('kpi.lastUpdated')} />
            )}

            {/* Performance chart: completed projects per month */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {isEn ? 'Completed projects (last 12 months)' : 'Progetti completati (ultimi 12 mesi)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RechartsBarChart data={performanceSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Completed projects list */}
            {userProfile && (
              <AssociateClientProjects associateId={userProfile.id} language={language} mode="completed" />
            )}
          </TabsContent>

          {/* === ONBOARDING & PREP === */}
          <TabsContent value="onboarding" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Service Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5" />
                    {isEn ? 'Service Documents' : 'Documenti dei Servizi'}
                  </CardTitle>
                  <CardDescription>
                    {isEn
                      ? 'Download documents to better understand our services you can contribute to.'
                      : 'Scarica i documenti per comprendere meglio i nostri servizi a cui puoi contribuire.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { href: "/service-docs/Altitude_-_Internship_Search.pdf", label: "Altitude - Internship Search" },
                    { href: "/service-docs/Takeoff_Layover_-_HIghschool_to_Uni_Transfers.pdf", label: "Takeoff Layover - Highschool to Uni Transfers" },
                    { href: "/service-docs/Summit_-_Masters_Degree.pdf", label: "Summit - Masters Degree" },
                    { href: "/service-docs/CV_Fast_Referral.pdf", label: "CV Fast Referral" },
                  ].map(d => (
                    <a key={d.href} href={d.href} download className="block">
                      <Button variant="outline" className="w-full justify-between" type="button">
                        <span className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{d.label}</span>
                        </span>
                        <FileDown className="h-4 w-4 shrink-0" />
                      </Button>
                    </a>
                  ))}
                </CardContent>
              </Card>

              {/* Quick onboarding */}
              <QuickOnboarding language={language} />
            </div>
          </TabsContent>

          {/* === PROFILE === */}
          <TabsContent value="profile" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/app/associate/documents')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
                    {isEn ? 'My Documents' : 'I miei Documenti'}
                  </CardTitle>
                  <CardDescription>
                    {isEn ? 'View and manage your uploaded documents (CV, certificates, etc.)' : 'Visualizza e gestisci i documenti caricati (CV, certificati, ecc.)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full justify-between">
                    {isEn ? 'Open' : 'Apri'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/app/associate/profile')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCircle className="h-5 w-5 text-primary" />
                    {isEn ? 'Personal Profile' : 'Profilo Personale'}
                  </CardTitle>
                  <CardDescription>
                    {isEn ? 'Update your personal info, photo, professional experiences and password.' : 'Aggiorna info personali, foto, esperienze professionali e password.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full justify-between">
                    {isEn ? 'Open' : 'Apri'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Contacts */}
            <Card className="mt-4 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  {isEn ? 'Need help? Contact us' : 'Hai bisogno di aiuto? Contattaci'}
                </CardTitle>
                <CardDescription>
                  {isEn
                    ? 'Reach out for any question or issue — we will reply within 12 hours.'
                    : 'Scrivici per qualsiasi necessità o dubbio — risponderemo entro 12 ore.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="https://wa.me/message/NE3VRLLZ77CHE1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">WhatsApp</p>
                      <p className="text-xs text-muted-foreground truncate">+44 7826 932893</p>
                    </div>
                  </a>
                  <a
                    href="mailto:Careerpilot2025@gmail.com"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">Email</p>
                      <p className="text-xs text-muted-foreground truncate">Careerpilot2025@gmail.com</p>
                    </div>
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {isEn
                      ? 'Average response time: within 12 hours.'
                      : 'Tempo medio di risposta: entro 12 ore.'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssociateDashboard;
