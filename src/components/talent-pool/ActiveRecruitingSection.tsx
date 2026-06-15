import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  MessageCircle, 
  FileText, 
  Building2,
  User,
  CheckCircle,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ActiveRecruitingChat from "./ActiveRecruitingChat";
import ActiveRecruitingDocuments from "./ActiveRecruitingDocuments";

interface RecruitingProcess {
  id: string;
  student_id: string;
  company_id: string;
  next_step: string;
  status: string;
  created_at: string;
  updated_at: string;
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

interface ActiveRecruitingSectionProps {
  userId: string;
  userType: 'STUDENT' | 'COMPANY' | 'ADMIN';
  userName: string;
  userEmail: string;
}

const getNextStepLabel = (step: string) => {
  switch (step) {
    case 'INTERVIEW': return 'Interview';
    case 'ONLINE_ASSESSMENT': return 'Online Assessment';
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

export const ActiveRecruitingSection = ({
  userId,
  userType,
  userName,
  userEmail
}: ActiveRecruitingSectionProps) => {
  const [processes, setProcesses] = useState<RecruitingProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);

  useEffect(() => {
    loadProcesses();
  }, [userId, userType]);

  const loadProcesses = async () => {
    try {
      let query = supabase
        .from('recruiting_processes')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (userType === 'STUDENT') {
        query = query.eq('student_id', userId);
      } else if (userType === 'COMPANY') {
        query = query.eq('company_id', userId);
      }
      // ADMIN sees all

      const { data, error } = await query;

      if (error) throw error;

      // Load additional data for each process
      const enrichedProcesses = await Promise.all((data || []).map(async (process) => {
        // Get company profile
        const { data: companyData } = await supabase
          .from('company_profiles')
          .select('company_name, logo_url, sector')
          .eq('user_id', process.company_id)
          .single();

        // Get student profile
        const { data: studentData } = await supabase
          .from('student_profiles')
          .select('first_name, last_name, photo_url')
          .eq('user_id', process.student_id)
          .single();

        // Get emails
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
      
      // Auto-select first process if available
      if (enrichedProcesses.length > 0 && !selectedProcess) {
        setSelectedProcess(enrichedProcesses[0].id);
      }
    } catch (error) {
      console.error('Error loading recruiting processes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (processes.length === 0) {
    return null; // Don't show section if no active processes
  }

  const currentProcess = processes.find(p => p.id === selectedProcess);

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          Active Recruiting
          <Badge className="ml-2 bg-primary">{processes.length}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Shared space between Student, Company, and Career Pilot
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Process Selector (if multiple) */}
        {processes.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {processes.map((process) => (
              <button
                key={process.id}
                onClick={() => setSelectedProcess(process.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                  selectedProcess === process.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                {userType === 'STUDENT' ? (
                  <>
                    <Building2 className="h-4 w-4" />
                    {process.company_profile?.company_name || 'Company'}
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" />
                    {process.student_profile?.first_name} {process.student_profile?.last_name}
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {currentProcess && (
          <>
            {/* Next Step Banner */}
            <div className="p-4 rounded-lg bg-background border-2 border-dashed">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Next Step</p>
                    <Badge className={`text-sm ${getNextStepColor(currentProcess.next_step)}`}>
                      {getNextStepLabel(currentProcess.next_step)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">With</p>
                  <p className="font-semibold">
                    {userType === 'STUDENT' 
                      ? currentProcess.company_profile?.company_name 
                      : `${currentProcess.student_profile?.first_name} ${currentProcess.student_profile?.last_name}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs for Chat and Documents */}
            <Tabs defaultValue="chat" className="w-full">
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
                  processId={currentProcess.id}
                  currentUserType={userType}
                  currentUserId={userId}
                  currentUserName={userName}
                  studentName={`${currentProcess.student_profile?.first_name} ${currentProcess.student_profile?.last_name}`}
                  studentEmail={currentProcess.student_email || ''}
                  companyName={currentProcess.company_profile?.company_name || 'Company'}
                  companyEmail={currentProcess.company_email || ''}
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <ActiveRecruitingDocuments
                  processId={currentProcess.id}
                  currentUserType={userType}
                  currentUserId={userId}
                  currentUserName={userName}
                  canUpload={true}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveRecruitingSection;
