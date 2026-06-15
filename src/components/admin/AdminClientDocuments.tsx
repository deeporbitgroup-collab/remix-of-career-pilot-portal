import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

const sb = supabase as any;

interface AdminClientDocumentsProps {
  clientId: string;
}

interface Document {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  document_type: string;
  created_at: string;
}

const AdminClientDocuments = ({ clientId }: AdminClientDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await sb
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching client documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (storagePath: string, filename: string) => {
    try {
      const { data, error } = await sb.storage
        .from('documents')
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading documents...
      </div>
    );
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium mb-2">Client Uploaded Documents</p>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-medium">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(doc.created_at), 'MMM d, yyyy')}
                  {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownload(doc.storage_path, doc.filename)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminClientDocuments;
