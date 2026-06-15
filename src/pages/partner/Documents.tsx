import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Upload, Download, File, Trash2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface PartnerDocument {
  id: string;
  partner_id: string;
  type: 'contract' | 'document';
  filename: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  version: number;
  created_at: string;
  updated_at: string;
}

const PartnerDocuments = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [contract, setContract] = useState<PartnerDocument | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('partner_documents')
        .select('*')
        .eq('partner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const contractDoc = data?.find(d => d.type === 'contract') as PartnerDocument | null;
      const personalDocs = (data?.filter(d => d.type === 'document') || []) as PartnerDocument[];
      
      setContract(contractDoc);
      setDocuments(personalDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: language === 'it' ? "File troppo grande" : "File too large",
        description: language === 'it' 
          ? "Il file non può superare i 10MB" 
          : "File cannot exceed 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingDoc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('partner-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save document record
      const { error: dbError } = await supabase
        .from('partner_documents')
        .insert({
          partner_id: user.id,
          type: 'document',
          filename: file.name,
          storage_path: uploadData.path,
          mime_type: file.type,
          size_bytes: file.size,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: language === 'it' ? "Documento caricato" : "Document uploaded",
        description: language === 'it' 
          ? "Il documento è stato caricato con successo" 
          : "Document uploaded successfully"
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingDoc(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleDownload = async (doc: PartnerDocument) => {
    try {
      if (!doc.storage_path) {
        throw new Error('Storage path not found');
      }

      const { data, error } = await supabase.storage
        .from('partner-documents')
        .download(doc.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: language === 'it' ? "Errore download" : "Download error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (doc: PartnerDocument) => {
    if (!confirm(language === 'it' 
      ? 'Sei sicuro di voler eliminare questo documento?' 
      : 'Are you sure you want to delete this document?')) {
      return;
    }

    try {
      // Delete from storage
      if (doc.storage_path) {
        await supabase.storage
          .from('partner-documents')
          .remove([doc.storage_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('partner_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: language === 'it' ? "Documento eliminato" : "Document deleted",
        description: language === 'it' 
          ? "Il documento è stato eliminato" 
          : "Document has been deleted"
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/partner")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === 'it' ? 'Torna alla Dashboard' : 'Back to Dashboard'}
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            {language === 'it' ? 'Documenti Aziendali' : 'Company Documents'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'it' 
              ? 'Gestisci i documenti della tua azienda' 
              : 'Manage your company documents'}
          </p>
        </div>

        <div className="grid gap-6">
          {/* Contract Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'it' ? 'Contratto Firmato' : 'Signed Contract'}
              </CardTitle>
              <CardDescription>
                {language === 'it' 
                  ? 'Contratto caricato da CareerPilot' 
                  : 'Contract uploaded by CareerPilot'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contract ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{contract.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'it' ? 'Caricato il' : 'Uploaded on'}{' '}
                        {format(new Date(contract.created_at), 'dd MMM yyyy', { 
                          locale: language === 'it' ? it : enUS 
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(contract)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'it' ? 'Scarica' : 'Download'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>
                    {language === 'it' 
                      ? 'Il contratto non è ancora stato caricato' 
                      : 'Contract has not been uploaded yet'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'it' ? 'I Miei Documenti' : 'My Documents'}
              </CardTitle>
              <CardDescription>
                {language === 'it' 
                  ? 'Carica e gestisci i tuoi documenti personali' 
                  : 'Upload and manage your personal documents'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload Section */}
              <div className="mb-6">
                <Label htmlFor="file-upload">
                  {language === 'it' ? 'Carica nuovo documento' : 'Upload new document'}
                </Label>
                <div className="flex gap-3 mt-2">
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingDoc}
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                  />
                  {uploadingDoc && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      {language === 'it' ? 'Caricamento...' : 'Uploading...'}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX, TXT, XLS, XLSX - Max 10MB
                </p>
              </div>

              {/* Documents List */}
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <File className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(doc.size_bytes)} • {' '}
                            {format(new Date(doc.created_at), 'dd MMM yyyy', { 
                              locale: language === 'it' ? it : enUS 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>
                    {language === 'it' 
                      ? 'Nessun documento caricato' 
                      : 'No documents uploaded'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerDocuments;