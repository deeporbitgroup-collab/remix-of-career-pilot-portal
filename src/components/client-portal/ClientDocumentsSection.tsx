import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Download, 
  Upload, 
  FileText, 
  Trash2, 
  Loader2,
  Calendar,
  User,
  FolderOpen
} from "lucide-react";
import { format } from "date-fns";

const sb = supabase as any;

interface ClientDocumentsSectionProps {
  clientId: string;
  clientName: string;
}

interface Document {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: string;
  created_at: string;
}

interface SharedDocument {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  uploaded_by_type: string;
  uploaded_by_id: string;
  project_id: string;
  project?: {
    client_services?: {
      name: string;
    };
    associate_id?: string;
  };
  associate?: {
    first_name: string;
    last_name: string;
  };
}

const ClientDocumentsSection = ({ clientId, clientName }: ClientDocumentsSectionProps) => {
  const [myDocuments, setMyDocuments] = useState<Document[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<SharedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const fetchDocuments = async () => {
    try {
      // Fetch client's own uploaded documents
      const { data: clientDocs, error: clientError } = await sb
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (clientError) throw clientError;
      setMyDocuments(clientDocs || []);

      // Fetch shared documents from all projects (uploaded by associates)
      const { data: projects, error: projectsError } = await sb
        .from('client_projects')
        .select('id, associate_id, client_services(name)')
        .eq('client_id', clientId);

      if (projectsError) throw projectsError;

      if (projects && projects.length > 0) {
        const projectIds = projects.map((p: any) => p.id);
        
        const { data: shared, error: sharedError } = await sb
          .from('client_shared_documents')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        if (sharedError) throw sharedError;

        // Enrich shared documents with project and associate info
        const enrichedShared = await Promise.all(
          (shared || []).map(async (doc: any) => {
            const project = projects.find((p: any) => p.id === doc.project_id);
            let associate = null;
            
            if (project?.associate_id) {
              const { data: assocData } = await sb
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', project.associate_id)
                .single();
              associate = assocData;
            }

            return {
              ...doc,
              project,
              associate
            };
          })
        );

        setSharedDocuments(enrichedShared);
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const filePath = `${clientId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await sb.storage
        .from('documents')
        .upload(`client-uploads/${filePath}`, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await sb
        .from('client_documents')
        .insert({
          client_id: clientId,
          filename: file.name,
          storage_path: `client-uploads/${filePath}`,
          file_size: file.size,
          mime_type: file.type,
          document_type: 'general'
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully!");
      fetchDocuments();
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (storagePath: string, filename: string, bucket: string = 'documents') => {
    try {
      const { data, error } = await sb.storage
        .from(bucket)
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Download started!");
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (docId: string, storagePath: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Delete from storage
      await sb.storage
        .from('documents')
        .remove([storagePath]);

      // Delete from database
      const { error } = await sb
        .from('client_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast.success("Document deleted");
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error("Failed to delete document");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUploaderLabel = (doc: SharedDocument) => {
    if (doc.uploaded_by_type === 'associate' && doc.associate) {
      return `${doc.associate.first_name} ${doc.associate.last_name}`;
    }
    if (doc.uploaded_by_type === 'admin') return 'Career Pilot Team';
    if (doc.uploaded_by_type === 'client') return 'You';
    return 'Unknown';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Documents</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your files and download project deliverables in one place
              </p>
            </div>
          </div>
        </div>
      </Card>

    <Card className="backdrop-blur-sm bg-background/95 shadow-lg">
      <CardContent className="space-y-6 pt-6">
        {/* Upload Section */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-4">
            <Upload className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Upload your documents</h4>
              <p className="text-sm text-muted-foreground mt-1">
                You can upload files about your background and goals (e.g., CV, notes, documents). 
                The Career Pilot team will be able to view and download them to better support your journey.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              className="flex-1"
            />
            {uploading && <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
        </div>

        {/* My Uploaded Documents */}
        {myDocuments.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Uploaded Documents
            </h4>
            <div className="space-y-2">
              {myDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc.storage_path, doc.filename)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc.id, doc.storage_path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Shared Documents from Projects */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Shared Documents
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            This is where completed project files will be uploaded. Documents will be uploaded the evening before the meeting.
          </p>

          {sharedDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No shared documents yet.</p>
              <p className="text-sm">Documents from your projects will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sharedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.filename}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        <span>•</span>
                        <User className="h-3 w-3" />
                        {getUploaderLabel(doc)}
                        {doc.project?.client_services?.name && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              {doc.project.client_services.name}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(doc.storage_path, doc.filename, 'client-project-documents')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

export default ClientDocumentsSection;
