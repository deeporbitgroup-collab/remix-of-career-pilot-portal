import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText } from "lucide-react";

const sb = supabase as any;

interface SharedDocumentsProps {
  projectId: string;
  uploaderId: string;
  uploaderType: 'client' | 'associate' | 'admin';
  uploaderName: string;
}

const SharedDocuments = ({ projectId, uploaderId, uploaderType, uploaderName }: SharedDocumentsProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();

    const subscription = sb
      .channel('shared_documents')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'client_shared_documents', filter: `project_id=eq.${projectId}` },
        () => fetchDocuments()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await sb
        .from('client_shared_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const filePath = `${projectId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await sb.storage
        .from('client-project-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await sb
        .from('client_shared_documents')
        .insert({
          project_id: projectId,
          filename: file.name,
          storage_path: filePath,
          uploaded_by_type: uploaderType,
          uploaded_by_id: uploaderId,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;

      // Get project details for notifications
      const { data: project } = await sb
        .from('client_projects')
        .select(`
          client_id,
          associate_id,
          client_users!inner(email, first_name, last_name)
        `)
        .eq('id', projectId)
        .single();

      // Send notifications
      const recipients = [];
      
      if (project) {
        // Add client
        recipients.push({
          email: project.client_users.email,
          name: `${project.client_users.first_name} ${project.client_users.last_name}`,
        });

        // Add associate
        const { data: associate } = await sb
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', project.associate_id)
          .single();
        
        if (associate) {
          recipients.push({
            email: associate.email,
            name: `${associate.first_name} ${associate.last_name}`,
          });
        }

        // Add admin
        recipients.push({
          email: 'careerpilot2025@gmail.com',
          name: 'Career Pilot Admin',
        });
      }

      await supabase.functions.invoke('send-document-notification', {
        body: {
          recipients,
          uploaderName,
          filename: file.name,
          action: 'uploaded',
        },
      });

      toast.success("Document uploaded successfully!");
      e.target.value = ''; // Reset input
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await sb.storage
        .from('client-project-documents')
        .download(doc.storage_path);

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
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm(`Are you sure you want to delete ${doc.filename}?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await sb.storage
        .from('client-project-documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await sb
        .from('client_shared_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      // Send notifications (similar to upload)
      const { data: project } = await sb
        .from('client_projects')
        .select(`
          client_id,
          associate_id,
          client_users!inner(email, first_name, last_name)
        `)
        .eq('id', projectId)
        .single();

      const recipients = [];
      
      if (project) {
        recipients.push({
          email: project.client_users.email,
          name: `${project.client_users.first_name} ${project.client_users.last_name}`,
        });

        const { data: associate } = await sb
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', project.associate_id)
          .single();
        
        if (associate) {
          recipients.push({
            email: associate.email,
            name: `${associate.first_name} ${associate.last_name}`,
          });
        }

        recipients.push({
          email: 'careerpilot2025@gmail.com',
          name: 'Career Pilot Admin',
        });
      }

      await supabase.functions.invoke('send-document-notification', {
        body: {
          recipients,
          uploaderName,
          filename: doc.filename,
          action: 'deleted',
        },
      });

      toast.success("Document deleted");
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error("Failed to delete document");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Shared Documents</span>
          <div className="relative">
            <Input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild disabled={uploading}>
                <span className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </span>
              </Button>
            </label>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          This is where completed project files will be uploaded. Documents will be uploaded the evening before the meeting.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No documents yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {doc.filename}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.uploaded_by_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(doc.file_size / 1024).toFixed(1)} KB
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {doc.uploaded_by_id === uploaderId && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SharedDocuments;