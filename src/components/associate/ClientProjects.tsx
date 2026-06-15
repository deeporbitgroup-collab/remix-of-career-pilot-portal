import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Calendar, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const sb = supabase as any;

const ClientProjects = ({ associateId }: { associateId: string }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [meetingSlots, setMeetingSlots] = useState<string[]>(['', '', '', '']);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [associateId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await sb
        .from('client_projects')
        .select(`
          *,
          client_users!inner(first_name, last_name, email),
          client_services(name, category)
        `)
        .eq('associate_id', associateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error("Failed to load projects");
    }
  };

  const handleSetAvailability = async (projectId: string) => {
    try {
      const validSlots = meetingSlots.filter(s => s.trim() !== '');
      
      if (validSlots.length < 4) {
        toast.error("Please provide at least 4 time slots");
        return;
      }

      for (const slot of validSlots) {
        const { error } = await sb
          .from('client_meeting_slots')
          .insert({
            project_id: projectId,
            proposed_time: slot,
            status: 'proposed'
          });

        if (error) throw error;
      }

      toast.success("Availability set successfully");
      setSelectedProject(null);
      setMeetingSlots(['', '', '', '']);
      fetchProjects();
    } catch (error: any) {
      console.error('Error setting availability:', error);
      toast.error("Failed to set availability");
    }
  };

  const handleUploadDocument = async (projectId: string, file: File) => {
    setUploadingDoc(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await sb.storage
        .from('documents')
        .upload(`client-projects/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await sb
        .from('client_project_documents')
        .insert({
          project_id: projectId,
          filename: file.name,
          storage_path: uploadData.path,
          uploaded_by: 'associate'
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      fetchProjects();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Client Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {project.client_users?.first_name} {project.client_users?.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {project.client_services?.name}
                      </p>
                      <Badge className="mt-2">{project.status}</Badge>
                    </div>
                    <div className="flex gap-2">
                      {project.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Set Availability
                        </Button>
                      )}
                      <label>
                        <Button size="sm" variant="outline" disabled={uploadingDoc} asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Document
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDocument(project.id, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Meeting Availability</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide 4 time slots when you're available for the consultation call
            </p>
            {meetingSlots.map((slot, index) => (
              <div key={index}>
                <Label>Time Slot {index + 1}</Label>
                <Input
                  type="datetime-local"
                  value={slot}
                  onChange={(e) => {
                    const newSlots = [...meetingSlots];
                    newSlots[index] = e.target.value;
                    setMeetingSlots(newSlots);
                  }}
                />
              </div>
            ))}
            <Button
              onClick={() => selectedProject && handleSetAvailability(selectedProject.id)}
              className="w-full"
            >
              Confirm Availability
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientProjects;
