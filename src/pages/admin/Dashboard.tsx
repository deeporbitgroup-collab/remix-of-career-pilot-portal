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
  UserCheck, UserX, ChevronRight, Building, Send, ShoppingCart, Briefcase, BookOpen, ExternalLink, FileCode, ListTodo, Mail, ArrowLeft, GraduationCap
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
import AdminTasks from "@/components/admin/AdminTasks";
import NewsletterManagement from "@/components/admin/NewsletterManagement";
import TalentPoolAdmin from "@/pages/talent-pool/AdminDashboard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

// Top-level "hub" blocks the admin lands on. Each one is just a container that
// groups already-existing sections together — nothing is created or removed,
// only regrouped to keep the dashboard tidy.
type BlockId = "ap" | "team" | "clients" | "newsletter" | "talent_pool";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isIt = language === "it";
  // null = the hub with the four big blocks. Set = inside that block.
  const [activeBlock, setActiveBlock] = useState<BlockId | null>(null);
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

  const blocks: Array<{
    id: BlockId;
    title: string;
    desc: string;
    icon: typeof Users;
    pending: number;
  }> = [
    {
      id: "ap",
      title: "Associates & Partnerships",
      desc: isIt
        ? "Approvazioni, gestione utenti, KPI, materiali e comunicazioni per Associates e Partners."
        : "Approvals, user management, KPIs, materials and announcements for Associates and Partners.",
      icon: Users,
      pending: stats.pendingAssociateApprovals + stats.pendingPartnerApprovals,
    },
    {
      id: "team",
      title: "Team",
      desc: isIt ? "CRM e task tracker interno del team." : "Internal CRM and the team task tracker.",
      icon: ListTodo,
      pending: 0,
    },
    {
      id: "clients",
      title: "Clients",
      desc: isIt
        ? "Progetti, approvazioni, feedback e dati dei clienti."
        : "Projects, registrations, feedback and client data.",
      icon: ShoppingCart,
      pending: stats.pendingClients + stats.pendingPayments,
    },
    {
      id: "newsletter",
      title: "Newsletter",
      desc: isIt ? "Componi e invia alle tue audience." : "Compose and send to your audiences.",
      icon: Mail,
      pending: 0,
    },
    {
      id: "talent_pool",
      title: "Talent Pool",
      desc: isIt
        ? "Studenti, aziende, pagamenti e knowledge base della Talent Pool."
        : "Talent Pool students, companies, payments and knowledge base.",
      icon: GraduationCap,
      pending: 0,
    },
  ];

  const activeMeta = blocks.find((b) => b.id === activeBlock);

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
                {isIt ? 'Esci' : 'Logout'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeBlock === null ? (
          /* ===================== HUB — overview + four blocks ===================== */
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Clienti assistiti</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Associates attivi</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Partners attivi</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Utenti totali</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{stats.activeUsers}</span>
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Four blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {blocks.map((b) => {
                const Icon = b.icon;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBlock(b.id)}
                    className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-5 md:p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 to-secondary/60 opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{b.title}</h3>
                        {b.pending > 0 && <Badge variant="destructive">{b.pending}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* ===================== A BLOCK is open ===================== */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveBlock(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {isIt ? 'Torna alla dashboard' : 'Back to dashboard'}
            </button>

            <div className="flex items-center gap-2.5">
              {activeMeta && (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <activeMeta.icon className="h-5 w-5" />
                </span>
              )}
              <h2 className="text-2xl font-bold">{activeMeta?.title}</h2>
            </div>

            {/* BLOCK 1 — Associates & Partnerships */}
            {activeBlock === "ap" && (
              <Tabs defaultValue="associates" className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="associates" className="gap-2">
                    <Users className="h-4 w-4" />
                    Associates
                    {stats.pendingAssociateApprovals > 0 && (
                      <Badge variant="destructive" className="ml-1">{stats.pendingAssociateApprovals}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="partners" className="gap-2">
                    <Briefcase className="h-4 w-4" />
                    Partners
                    {stats.pendingPartnerApprovals > 0 && (
                      <Badge variant="destructive" className="ml-1">{stats.pendingPartnerApprovals}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Associates */}
                <TabsContent value="associates">
                  <Tabs defaultValue="approvals" className="space-y-4">
                    <TabsList className="w-full flex flex-wrap">
                      <TabsTrigger value="approvals" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Approvazioni
                        {stats.pendingAssociateApprovals > 0 && (
                          <Badge variant="destructive" className="ml-1">{stats.pendingAssociateApprovals}</Badge>
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
                        {isIt ? 'Comunicazioni' : 'Announcements'}
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

                {/* Partners */}
                <TabsContent value="partners">
                  <Tabs defaultValue="approvals" className="space-y-4">
                    <TabsList className="w-full flex flex-wrap">
                      <TabsTrigger value="approvals" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Approvazioni
                        {stats.pendingPartnerApprovals > 0 && (
                          <Badge variant="destructive" className="ml-1">{stats.pendingPartnerApprovals}</Badge>
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
                        {isIt ? 'Comunicazioni' : 'Announcements'}
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
              </Tabs>
            )}

            {/* BLOCK 2 — Team (CRM + Tasks) */}
            {activeBlock === "team" && (
              <Tabs defaultValue="crm" className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="crm" className="gap-2">
                    <FileCode className="h-4 w-4" />
                    CRM
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2">
                    <ListTodo className="h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="crm">
                  <AdminCRM />
                </TabsContent>
                <TabsContent value="tasks">
                  <AdminTasks />
                </TabsContent>
              </Tabs>
            )}

            {/* BLOCK 3 — Clients */}
            {activeBlock === "clients" && (
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
            )}

            {/* BLOCK 4 — Newsletter */}
            {activeBlock === "newsletter" && <NewsletterManagement />}

            {/* BLOCK 5 — Talent Pool (full Talent Pool admin, embedded) */}
            {activeBlock === "talent_pool" && <TalentPoolAdmin embedded />}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
