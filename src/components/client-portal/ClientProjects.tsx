import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Upload, Download, FileText, CheckCircle2 } from "lucide-react";
import SharedDocuments from "./SharedDocuments";
const sb = supabase as any;

interface ClientProjectsProps {
  clientId: string;
  clientName: string;
}

const ClientProjects = ({ clientId, clientName }: ClientProjectsProps) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();

    // Subscribe to project updates
    const subscription = sb
      .channel('client_projects_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'client_projects', filter: `client_id=eq.${clientId}` },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [clientId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await sb
        .from('client_projects')
        .select(`
          *,
          service:client_services(name),
          associate:profiles(first_name, last_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = async (projectId: string, slotId: string) => {
    try {
      const { error } = await sb
        .from('client_projects')
        .update({ 
          selected_slot_id: slotId,
          status: 'scheduled',
        })
        .eq('id', projectId);

      if (error) throw error;

      toast.success("Meeting time selected! Google Meet link will be generated.");
      fetchProjects();
    } catch (error: any) {
      console.error('Error selecting slot:', error);
      toast.error("Failed to select time slot");
    }
  };

  if (loading) {
    return <div>Loading projects...</div>;
  }

  const activeProjects = projects.filter(p => p.status !== 'completed');
  const completedProjects = projects.filter(p => p.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="bg-background/95 backdrop-blur-sm p-6 rounded-lg border border-border/50 shadow-lg">
        <h2 className="text-3xl font-bold mb-2 text-foreground">Your Projects</h2>
        <p className="text-foreground/80 font-medium">Track your ongoing and completed services</p>
      </div>

      {/* Active Projects */}
      <div className="space-y-4">
        <div className="bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border/50">
          <h3 className="text-2xl font-semibold text-foreground">Active Projects</h3>
        </div>
        {activeProjects.length === 0 ? (
          <Card className="bg-background/95 backdrop-blur-sm border-border/50">
            <CardContent className="py-8 text-center">
              <p className="text-foreground/70 font-medium">No active projects</p>
            </CardContent>
          </Card>
        ) : (
          activeProjects.map((project) => (
            <Card key={project.id} className="bg-background/95 backdrop-blur-sm border-border/50">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-foreground">{project.service?.name}</CardTitle>
                    {project.associate && (
                      <p className="text-sm text-foreground/70 font-medium mt-1">
                        with {project.associate.first_name} {project.associate.last_name}
                      </p>
                    )}
                  </div>
                  <Badge>{project.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ProjectDetails 
                  project={project} 
                  onSelectSlot={handleSelectSlot}
                  clientId={clientId}
                  clientName={clientName}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <div className="space-y-4">
          <div className="bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border/50">
            <h3 className="text-2xl font-semibold text-foreground">Completed Projects</h3>
          </div>
          {completedProjects.map((project) => (
            <Card key={project.id} className="bg-background/95 backdrop-blur-sm border-border/50">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-foreground">{project.service?.name}</CardTitle>
                    {project.associate && (
                      <p className="text-sm text-foreground/70 font-medium mt-1">
                        with {project.associate.first_name} {project.associate.last_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Completed</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ProjectDocuments projectId={project.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectDetails = ({ project, onSelectSlot, clientId, clientName }: any) => {
  const [slots, setSlots] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchSlots();
    fetchDocuments();
  }, [project.id]);

  const fetchSlots = async () => {
    const { data } = await sb
      .from('client_meeting_slots')
      .select('*')
      .eq('project_id', project.id)
      .order('slot_datetime', { ascending: true });

    setSlots(data || []);
  };

  const fetchDocuments = async () => {
    const { data } = await sb
      .from('client_project_documents')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    setDocuments(data || []);
  };

  return (
    <div className="space-y-4">
      {/* Meeting Slots */}
      {slots.length > 0 && project.status === 'slots_proposed' && (
        <div>
          <Label className="text-base font-semibold">Available Meeting Times</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Select your preferred time slot
          </p>
          <div className="grid gap-2">
            {slots.map((slot) => (
              <Button
                key={slot.id}
                variant="outline"
                className="justify-between"
                onClick={() => onSelectSlot(project.id, slot.id)}
              >
                <span>{new Date(slot.slot_datetime).toLocaleString()}</span>
                <Calendar className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Google Meet Link */}
      {project.meeting_link && (
        <div className="bg-primary/5 p-4 rounded-lg">
          <Label className="text-base font-semibold">Meeting Link</Label>
          <Button asChild className="mt-2 w-full">
            <a href={project.meeting_link} target="_blank" rel="noopener noreferrer">
              Join Google Meet
            </a>
          </Button>
        </div>
      )}

      {/* Shared Documents Area */}
      <SharedDocuments 
        projectId={project.id}
        uploaderId={clientId}
        uploaderType="client"
        uploaderName={clientName}
      />
    </div>
  );
};

const ProjectDocuments = ({ projectId }: { projectId: string }) => {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchDocuments();

    const subscription = sb
      .channel(`project_documents_${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'client_project_documents', filter: `project_id=eq.${projectId}` },
        () => fetchDocuments()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId]);

  const fetchDocuments = async () => {
    const { data } = await sb
      .from('client_project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    setDocuments(data || []);
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await sb.storage
        .from('documents')
        .download(doc.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error("Failed to download document");
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-base font-semibold">Project Documents</Label>
      <div className="mt-2 space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm">{doc.filename}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientProjects;