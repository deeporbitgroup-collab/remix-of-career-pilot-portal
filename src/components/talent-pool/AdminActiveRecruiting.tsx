import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  MessageCircle, 
  FileText, 
  Building2,
  User,
  ArrowRight,
  Target,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ActiveRecruitingChat from "./ActiveRecruitingChat";
import ActiveRecruitingDocuments from "./ActiveRecruitingDocuments";
import AdminMeetingLinks from "./AdminMeetingLinks";
import { format } from "date-fns";

interface RecruitingProcess {
  id: string;
  student_id: string;
  company_id: string;
  next_step: string;
  status: string;
  created_at: string;
  company_profile?: {
    company_name: string;
    logo_url: string | null;
    sector: string;
  };
  student_profile?: {
    first_name: string;
    last_name: string;
    photo_url: string | null;
  };
  company_email?: string;
  student_email?: string;
}

const getNextStepLabel = (step: string) => {
  switch (step) {
    case 'INTERVIEW': return 'Interview';
    case 'ONLINE_ASSESSMENT': return 'Assessment';
    case 'DIRECT_HIRING': return 'Direct Hiring';
    default: return step;
  }
};

const getNextStepColor = (step: string) => {
  switch (step) {
    case 'INTERVIEW': return 'bg-blue-100 text-blue-800';
    case 'ONLINE_ASSESSMENT': return 'bg-orange-100 text-orange-800';
    case 'DIRECT_HIRING': return 'bg-green-100 text-green-800';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const AdminActiveRecruiting = () => {
  const [processes, setProcesses] = useState<RecruitingProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<RecruitingProcess | null>(null);

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recruiting_processes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with profiles
      const enrichedProcesses = await Promise.all((data || []).map(async (process) => {
        const { data: companyData } = await supabase
          .from('company_profiles')
          .select('company_name, logo_url, sector')
          .eq('user_id', process.company_id)
          .single();

        const { data: studentData } = await supabase
          .from('student_profiles')
          .select('first_name, last_name, photo_url')
          .eq('user_id', process.student_id)
          .single();

        const { data: companyUser } = await supabase
          .from('talent_pool_users')
          .select('email')
          .eq('id', process.company_id)
          .single();

        const { data: studentUser } = await supabase
          .from('talent_pool_users')
          .select('email')
          .eq('id', process.student_id)
          .single();

        return {
          ...process,
          company_profile: companyData,
          student_profile: studentData,
          company_email: companyUser?.email,
          student_email: studentUser?.email
        };
      }));

      setProcesses(enrichedProcesses);
    } catch (error) {
      console.error('Error loading processes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Active Recruiting Overview
          </h2>
          <p className="text-muted-foreground">
            Manage all recruiting processes between students and companies
          </p>
        </div>
        <Button variant="outline" onClick={loadProcesses} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Admin fallback: set interview links on confirmed meetings (C2.3) */}
      <AdminMeetingLinks />

      {processes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No active recruiting processes yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Process List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              All Processes ({processes.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {processes.map((process) => (
                <Card
                  key={process.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedProcess?.id === process.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedProcess(process)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={process.student_profile?.photo_url || undefined} />
                        <AvatarFallback>
                          {process.student_profile?.first_name?.[0] || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={process.company_profile?.logo_url || undefined} />
                        <AvatarFallback>
                          {process.company_profile?.company_name?.[0] || 'C'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {process.student_profile?.first_name} {process.student_profile?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        ↔ {process.company_profile?.company_name}
                      </p>
                    </div>
                    <Badge className={`text-xs ${getNextStepColor(process.next_step)}`}>
                      {getNextStepLabel(process.next_step)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Started: {format(new Date(process.created_at), 'dd MMM yyyy')}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected Process Detail */}
          <div className="lg:col-span-2">
            {selectedProcess ? (
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedProcess.student_profile?.photo_url || undefined} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {selectedProcess.student_profile?.first_name} {selectedProcess.student_profile?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{selectedProcess.student_email}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedProcess.company_profile?.logo_url || undefined} />
                          <AvatarFallback>
                            <Building2 className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{selectedProcess.company_profile?.company_name}</p>
                          <p className="text-xs text-muted-foreground">{selectedProcess.company_email}</p>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getNextStepColor(selectedProcess.next_step)}`}>
                      <Target className="h-3 w-3 mr-1" />
                      {getNextStepLabel(selectedProcess.next_step)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="chat">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chat" className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documents
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="chat" className="mt-4">
                      <ActiveRecruitingChat
                        processId={selectedProcess.id}
                        currentUserType="ADMIN"
                        currentUserId="admin"
                        currentUserName="Career Pilot"
                        studentName={`${selectedProcess.student_profile?.first_name} ${selectedProcess.student_profile?.last_name}`}
                        studentEmail={selectedProcess.student_email || ''}
                        companyName={selectedProcess.company_profile?.company_name || 'Company'}
                        companyEmail={selectedProcess.company_email || ''}
                      />
                    </TabsContent>

                    <TabsContent value="documents" className="mt-4">
                      <ActiveRecruitingDocuments
                        processId={selectedProcess.id}
                        currentUserType="ADMIN"
                        currentUserId="admin"
                        currentUserName="Career Pilot"
                        canUpload={true}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">
                    Select a recruiting process to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminActiveRecruiting;
