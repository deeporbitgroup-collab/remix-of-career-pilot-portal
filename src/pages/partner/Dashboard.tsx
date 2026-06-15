import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  LogOut, Building, FileText, BarChart, Briefcase,
  ChevronRight, TrendingUp, Users, Target, FileDown, Bell
} from "lucide-react";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { KpiCarousel } from "@/components/KpiCarousel";
import AnnouncementDisplay from "@/components/AnnouncementDisplay";
import PartnerMessaging from "@/components/partner/PartnerMessaging";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
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

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    fetchUserData();
    fetchKPIs();
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
        .eq('applies_to', 'PARTNER')
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'new': return 'secondary';
      case 'in_progress': return 'default';
      case 'closed': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'new': return language === 'it' ? 'Nuova' : 'New';
      case 'in_progress': return language === 'it' ? 'In Corso' : 'In Progress';
      case 'closed': return language === 'it' ? 'Chiusa' : 'Closed';
      default: return status;
    }
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">{userProfile?.company_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {language === 'it' ? 'Dashboard Partner' : 'Partner Dashboard'}
                </p>
              </div>
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
        {/* Priority Announcements */}
        <AnnouncementDisplay userRole="PARTNER" />
        
        {/* KPI Cards with Carousel */}
        <KpiCarousel
          kpiData={kpiData} 
          language={language} 
          updateLabel={language === 'it' ? 'Aggiornato' : 'Updated'}
        />

        <div className="grid grid-cols-1 gap-6">
          {/* Partnership Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Partnership</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart 
                  data={kpiData.filter(kpi => kpi.definition.chart_type === 'bar')}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="definition.label" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10B981" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>

        {/* Opportunities for Partners Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {language === 'it' ? 'Opportunità per Partner' : 'Opportunities for Partners'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <a
                href="/partner-docs/CV_Fast_Referral_Partners.pdf"
                download="CV_Fast_Referral_Partners.pdf"
                className="w-full"
              >
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CV Fast Referral
                  </span>
                  <FileDown className="h-4 w-4" />
                </Button>
              </a>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                <Bell className="inline h-3 w-3 mr-1" />
                {language === 'it' 
                  ? 'Nota: Riceverai una notifica quando questo documento verrà aggiornato.'
                  : 'Note: You will receive a notification when this document is updated.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Messages with Admin */}
        <div className="mt-6">
          <PartnerMessaging language={language} />
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {language === 'it' ? 'Azioni Rapide' : 'Quick Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="justify-between"
                onClick={() => navigate('/app/partner/documents')}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {language === 'it' ? 'Documenti Aziendali' : 'Company Documents'}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-between"
                onClick={() => navigate('/app/partner/profile')}
              >
                <span className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {language === 'it' ? 'Profilo Aziendale' : 'Company Profile'}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerDashboard;