import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Download, 
  ExternalLink, 
  Trash2,
  Link as LinkIcon,
  User,
  Building2,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Document {
  id: string;
  process_id: string;
  uploader_id: string;
  uploader_type: string;
  uploader_name: string;
  document_type: string;
  filename: string | null;
  storage_path: string | null;
  link_url: string | null;
  created_at: string;
}

interface ActiveRecruitingDocumentsProps {
  processId: string;
  currentUserType: 'STUDENT' | 'COMPANY' | 'ADMIN';
  currentUserId: string;
  currentUserName: string;
  canUpload?: boolean;
}

const getUploaderColor = (type: string) => {
  switch (type) {
    case 'STUDENT': return 'bg-blue-100 text-blue-800';
    case 'COMPANY': return 'bg-green-100 text-green-800';
    case 'ADMIN': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getUploaderIcon = (type: string) => {
  switch (type) {
    case 'STUDENT': return <User className="h-3 w-3" />;
    case 'COMPANY': return <Building2 className="h-3 w-3" />;
    case 'ADMIN': return <Shield className="h-3 w-3" />;
    default: return <User className="h-3 w-3" />;
  }
};

export const ActiveRecruitingDocuments = ({
  processId,
  currentUserType,
  currentUserId,
  currentUserName,
  canUpload = true
}: ActiveRecruitingDocumentsProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [processId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('recruiting_documents')
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${processId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('recruiting-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('recruiting_documents')
        .insert({
          process_id: processId,
          uploader_id: currentUserId,
          uploader_type: currentUserType,
          uploader_name: currentUserName,
          document_type: 'FILE',
          filename: file.name,
          storage_path: fileName
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });

      loadDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;

    // Validate URL
    try {
      new URL(linkUrl);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }

    setAddingLink(true);
    try {
      const { error } = await supabase
        .from('recruiting_documents')
        .insert({
          process_id: processId,
          uploader_id: currentUserId,
          uploader_type: currentUserType,
          uploader_name: currentUserName,
          document_type: 'LINK',
          link_url: linkUrl.trim()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Link added successfully"
      });

      setLinkUrl("");
      loadDocuments();
    } catch (error: any) {
      console.error('Add link error:', error);
      toast({
        title: "Error",
        description: "Failed to add link",
        variant: "destructive"
      });
    } finally {
      setAddingLink(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    if (doc.document_type === 'LINK' && doc.link_url) {
      window.open(doc.link_url, '_blank');
      return;
    }

    if (!doc.storage_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('recruiting-documents')
        .download(doc.storage_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (doc.uploader_id !== currentUserId && currentUserType !== 'ADMIN') {
      toast({
        title: "Permission denied",
        description: "You can only delete your own documents",
        variant: "destructive"
      });
      return;
    }

    try {
      if (doc.storage_path) {
        await supabase.storage
          .from('recruiting-documents')
          .remove([doc.storage_path]);
      }

      const { error } = await supabase
        .from('recruiting_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted"
      });

      loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Shared Documents & Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canUpload && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Upload Document</Label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="doc-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                    disabled={uploading}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('doc-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Add Link</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    disabled={addingLink}
                  />
                  <Button
                    onClick={handleAddLink}
                    disabled={!linkUrl.trim() || addingLink}
                  >
                    {addingLink ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No documents or links shared yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {doc.document_type === 'LINK' ? (
                    <ExternalLink className="h-5 w-5 text-blue-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {doc.document_type === 'LINK' ? doc.link_url : doc.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs ${getUploaderColor(doc.uploader_type)}`}>
                        {getUploaderIcon(doc.uploader_type)}
                        <span className="ml-1">{doc.uploader_name}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                  >
                    {doc.document_type === 'LINK' ? (
                      <ExternalLink className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  {(doc.uploader_id === currentUserId || currentUserType === 'ADMIN') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveRecruitingDocuments;
