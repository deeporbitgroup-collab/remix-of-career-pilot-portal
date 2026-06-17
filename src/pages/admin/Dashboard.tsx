import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogOut, Users, Shield, Activity, FileText, 
  Search, Filter, CheckCircle, XCircle, Clock,
  UserCheck, UserX, ChevronRight, Building, Send, ShoppingCart, Briefcase, BookOpen, ExternalLink, FolderOpen, FileCode
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PendingApprovals from "@/components/admin/PendingApprovals";
import UserManagement from "@/components/admin/UserManagement";
import KPIManagement from "@/components/admin/KPIManagement";
import ActivityLogs from "@/components/admin/ActivityLogs";
import AnnouncementManagement from "@/components/admin/AnnouncementManagement";
import ClientManagement from "@/components/admin/ClientManagement";
import AdminClientFeedback from "@/components/admin/AdminClientFeedback";
import AdminClientProjects from "@/components/admin/AdminClientProjects";
import PrepMaterialsManagement from "@/components/admin/PrepMaterialsManagement";
import AdminCRM from "@/components/admin/AdminCRM";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [mainTab, setMainTab] = useState("associates");
  const [stats, setStats] = useState({
    verifiedPayments: 0,
    totalAssociates: 0,
    totalPartners: 0,
    activeUsers: 0,
    pendingClients: 0,
    pendingPayments: 0,
    pendingAssociateApprovals: 0,
    pendingPartnerApprovals: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch pending associate approvals count
      const { count: pendingAssociatesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('role', 'ASSOCIATE');

      // Fetch pending partner approvals count
      const { count: pendingPartnersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('role', 'PARTNER');

      // Fetch associates count
      const { count: associatesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'ASSOCIATE')
        .eq('status', 'approved');

      // Fetch partners count
      const { count: partnersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'PARTNER')
        .eq('status', 'approved');

      // Fetch client portal stats
      const { count: pendingClientsCount } = await supabase
        .from('client_users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: pendingPaymentsCount } = await supabase
        .from('client_orders')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending');

      // Fetch verified payments count (clienti assistiti)
      const { count: verifiedPaymentsCount } = await supabase
        .from('client_orders')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'verified');

      setStats({
        verifiedPayments: verifiedPaymentsCount || 0,
        totalAssociates: associatesCount || 0,
        totalPartners: partnersCount || 0,
        activeUsers: (associatesCount || 0) + (partnersCount || 0),
        pendingClients: pendingClientsCount || 0,
        pendingPayments: pendingPaymentsCount || 0,
        pendingAssociateApprovals: pendingAssociatesCount || 0,
        pendingPartnerApprovals: pendingPartnersCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Career Pilot Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {language === 'it' ? 'Esci' : 'Logout'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clienti assistiti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.verifiedPayments}</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Associates attivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.totalAssociates}</span>
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Partners attivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.totalPartners}</span>
                <Building className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utenti totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.activeUsers}</span>
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* External Extensions */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5 text-primary" />
              Extensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href="https://www.dropbox.com/scl/fo/9z8jcf96dh3i51gxadcih/AKzb4hP8UHXeHmV51OHnuc0?rlkey=xylzv0qp7i2lerjfww8tjz2er&e=1&st=k7hcdbdb&dl=0"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Shared Resources Library</div>
                    <div className="text-xs text-muted-foreground">Dropbox shared folder</div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <button
                type="button"
                onClick={() => setMainTab("crm")}
                className="group flex items-center justify-between gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileCode className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">CRM</div>
                    <div className="text-xs text-muted-foreground">Client Email Tracker</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="associates" className="gap-2">
              <Users className="h-4 w-4" />
              ASSOCIATES
            </TabsTrigger>
            <TabsTrigger value="partners" className="gap-2">
              <Briefcase className="h-4 w-4" />
              PARTNERS
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              CLIENTI
              {(stats.pendingClients > 0 || stats.pendingPayments > 0) && (
                <Badge variant="destructive" className="ml-1">
                  {stats.pendingClients + stats.pendingPayments}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="crm" className="gap-2">
              <FileCode className="h-4 w-4" />
              CRM
            </TabsTrigger>
          </TabsList>

          {/* ASSOCIATES AREA */}
          <TabsContent value="associates">
            <Tabs defaultValue="approvals" className="space-y-4">
              <TabsList className="w-full flex flex-wrap">
                <TabsTrigger value="approvals" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Approvazioni
                  {stats.pendingAssociateApprovals > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {stats.pendingAssociateApprovals}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Gestione Utenti
                </TabsTrigger>
                <TabsTrigger value="kpi" className="gap-2">
                  <Activity className="h-4 w-4" />
                  KPI Management
                </TabsTrigger>
                <TabsTrigger value="prep" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Prep Materials
                </TabsTrigger>
                <TabsTrigger value="announcements" className="gap-2">
                  <Send className="h-4 w-4" />
                  {language === 'it' ? 'Comunicazioni' : 'Announcements'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approvals">
                <PendingApprovals onUpdate={fetchStats} roleFilter="ASSOCIATE" />
              </TabsContent>

              <TabsContent value="users">
                <UserManagement roleFilter="ASSOCIATE" />
              </TabsContent>

              <TabsContent value="kpi">
                <KPIManagement roleFilter="ASSOCIATE" />
              </TabsContent>

              <TabsContent value="prep">
                <PrepMaterialsManagement />
              </TabsContent>

              <TabsContent value="announcements">
                <AnnouncementManagement targetAudience="associates" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* PARTNERS AREA */}
          <TabsContent value="partners">
            <Tabs defaultValue="approvals" className="space-y-4">
              <TabsList className="w-full flex flex-wrap">
                <TabsTrigger value="approvals" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Approvazioni
                  {stats.pendingPartnerApprovals > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {stats.pendingPartnerApprovals}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="management" className="gap-2">
                  <Building className="h-4 w-4" />
                  Partners Management
                </TabsTrigger>
                <TabsTrigger value="kpi" className="gap-2">
                  <Activity className="h-4 w-4" />
                  KPI Management
                </TabsTrigger>
                <TabsTrigger value="announcements" className="gap-2">
                  <Send className="h-4 w-4" />
                  {language === 'it' ? 'Comunicazioni' : 'Announcements'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approvals">
                <PendingApprovals onUpdate={fetchStats} roleFilter="PARTNER" />
              </TabsContent>

              <TabsContent value="management">
                <UserManagement roleFilter="PARTNER" />
              </TabsContent>

              <TabsContent value="kpi">
                <KPIManagement roleFilter="PARTNER" />
              </TabsContent>

              <TabsContent value="announcements">
                <AnnouncementManagement targetAudience="partners" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* CLIENTI AREA */}
          <TabsContent value="clients">
            <Tabs defaultValue="projects" className="space-y-4">
              <TabsList className="w-full flex flex-wrap">
                <TabsTrigger value="projects" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Progetti
                </TabsTrigger>
                <TabsTrigger value="registrations" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Approvazioni
                </TabsTrigger>
                <TabsTrigger value="feedback" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Feedback
                </TabsTrigger>
                <TabsTrigger value="data" className="gap-2">
                  <Users className="h-4 w-4" />
                  Dati Clienti
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects">
                <AdminClientProjects />
              </TabsContent>

              <TabsContent value="registrations">
                <ClientManagement />
              </TabsContent>

              <TabsContent value="feedback">
                <AdminClientFeedback />
              </TabsContent>

              <TabsContent value="data">
                <Card>
                  <CardHeader>
                    <CardTitle>Dati Clienti</CardTitle>
                    <CardDescription>Visualizza informazioni clienti (solo lettura)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ClientManagement />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* CRM AREA */}
          <TabsContent value="crm">
            <AdminCRM />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
