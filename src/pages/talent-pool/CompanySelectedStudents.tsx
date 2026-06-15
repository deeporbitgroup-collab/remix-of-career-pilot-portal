import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  User, 
  FileText,
  Download,
  ExternalLink,
  X,
  MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TalentPoolLanguageProvider } from "@/contexts/TalentPoolLanguageContext";
import NextStepSelector from "@/components/talent-pool/NextStepSelector";

const CompanySelectedStudentsContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [deselecting, setDeselecting] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const role = localStorage.getItem('talentPoolRole');
      const userStr = localStorage.getItem('talentPoolUser');
      
      if (role !== 'COMPANY' || !userStr) {
        navigate('/talent-pool/company');
        return;
      }

      const userData = JSON.parse(userStr);
      
      if (userData.registration_status !== 'APPROVED') {
        navigate('/talent-pool/company');
        return;
      }

      setCompanyId(userData.id);
      setCompanyData(userData);
      await loadSelectedStudents(userData.id);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/talent-pool/company');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedStudents = async (companyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-company-selected-students', {
        body: { companyId }
      });

      if (error) throw error;

      const selections = Array.isArray(data) ? data : [];
      setSelectedStudents(selections as any[]);
    } catch (error) {
      console.error('Error loading selected students (edge):', error);
      toast({
        title: "Error",
        description: "Failed to load selected students",
        variant: "destructive"
      });
    }
  };

  const handleDeselectStudent = async (studentId: string, studentName: string) => {
    if (!companyId) return;
    
    setDeselecting(studentId);
    try {
      const { error } = await supabase.functions.invoke('deselect-student', {
        body: {
          companyId,
          studentId
        }
      });

      if (error) throw error;

      toast({
        title: "Student Deselected",
        description: `You have removed ${studentName} from your selections.`,
        duration: 3000
      });

      // Reload the list
      await loadSelectedStudents(companyId);
    } catch (error: any) {
      console.error('Deselect error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deselect student",
        variant: "destructive"
      });
    } finally {
      setDeselecting(null);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Success",
        description: `${filename} downloaded successfully`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Unable to download file",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-cloud-white to-runway-gray p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/talent-pool/company/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-green-600">
              Selected Students
            </h1>
            <p className="text-steel-gray">
              Students you've expressed interest in
            </p>
          </div>
        </div>

        {/* Selected Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Selections ({selectedStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStudents.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-steel-gray mx-auto mb-4 opacity-50" />
                <p className="text-steel-gray">No students selected yet</p>
                <p className="text-sm text-steel-gray mt-2">
                  Go back to the dashboard to select students
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedStudents.map((selection) => {
                  const student = selection.profile;
                  if (!student) return null;

                  return (
                    <Card key={selection.id} className="p-4">
                      <div className="space-y-3">
                        {/* Student Photo and Name */}
                        <div className="flex flex-col items-center text-center">
                          {student.photo_url ? (
                            <img 
                              src={student.photo_url} 
                              alt={`${student.first_name} ${student.last_name}`}
                              className="h-24 w-24 rounded-full object-cover mb-3"
                            />
                          ) : (
                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                              <User className="h-12 w-12 text-primary" />
                            </div>
                          )}
                          <h3 className="text-lg font-semibold">
                            {student.first_name} {student.last_name}
                          </h3>
                          <p className="text-xs text-steel-gray">
                            Selected: {new Date(selection.selected_at).toLocaleDateString()}
                          </p>
                        </div>

                        {/* LinkedIn */}
                        {student.linkedin_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(student.linkedin_url, '_blank')}
                            className="w-full flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            LinkedIn Profile
                          </Button>
                        )}

                        {/* Documents */}
                        <div className="flex flex-col gap-2">
                          {student.cv_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(
                                student.cv_url,
                                `${student.first_name}_${student.last_name}_CV.pdf`
                              )}
                              className="w-full flex items-center justify-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Download CV
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                          {student.cover_letter_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(
                                student.cover_letter_url,
                                `${student.first_name}_${student.last_name}_CoverLetter.pdf`
                              )}
                              className="w-full flex items-center justify-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Download Cover Letter
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {/* Next Step Selector */}
                          <div className="pt-2 border-t">
                            <NextStepSelector
                              studentId={selection.student_id}
                              studentName={`${student.first_name} ${student.last_name}`}
                              studentEmail={student.email || ''}
                              companyId={companyId || ''}
                              companyName={companyData?.company_profiles?.[0]?.company_name || 'Company'}
                              companyEmail={companyData?.email || ''}
                              onComplete={() => loadSelectedStudents(companyId || '')}
                            />
                          </div>
                          
                          {/* Deselect Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={deselecting === selection.student_id}
                                className="w-full flex items-center justify-center gap-2 mt-2"
                              >
                                {deselecting === selection.student_id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Removing...</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="h-4 w-4" />
                                    Deselect
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove this selection?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deselect {student.first_name} {student.last_name}? 
                                  This will remove them from your selected students list.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeselectStudent(
                                    selection.student_id,
                                    `${student.first_name} ${student.last_name}`
                                  )}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Yes, Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const CompanySelectedStudents = () => {
  return (
    <TalentPoolLanguageProvider>
      <CompanySelectedStudentsContent />
    </TalentPoolLanguageProvider>
  );
};

export default CompanySelectedStudents;
