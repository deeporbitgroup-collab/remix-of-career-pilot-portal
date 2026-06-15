import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Upload, Download, Eye, Clock, FileCheck, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Document {
  id: string;
  type: 'CV' | 'CONTRACT' | 'PARTNER_DOC' | 'ADMIN_TEMPLATE';
  filename: string;
  storage_path: string;
  size_bytes: number;
  mime: string;
  version: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const AssociateDocuments = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [currentCV, setCurrentCV] = useState<Document | null>(null);
  const [currentContract, setCurrentContract] = useState<Document | null>(null);
  const [cvHistory, setCvHistory] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const isEnglish = language === 'en';
  const locale = isEnglish ? enUS : it;

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all documents for the user
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('version', { ascending: false });

      if (error) throw error;

      const allDocs = data || [];
      
      // Separate CV and Contract documents
      const cvDocs = allDocs.filter(d => d.type === 'CV');
      const contractDocs = allDocs.filter(d => d.type === 'CONTRACT');
      
      // Get latest versions
      if (cvDocs.length > 0) {
        setCurrentCV(cvDocs[0]);
        setCvHistory(cvDocs.slice(1));
      }
      
      if (contractDocs.length > 0) {
        setCurrentContract(contractDocs[0]);
      }
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: error.message || (isEnglish ? "Unable to load documents" : "Impossibile caricare i documenti"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: isEnglish ? "Unsupported file format. Use PDF or DOCX." : "Formato file non supportato. Usa PDF o DOCX.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: isEnglish ? "File is too large. Maximum 5MB." : "Il file è troppo grande. Massimo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate next version
      const nextVersion = (currentCV?.version || 0) + 1;
      const fileName = file.name;
      const storagePath = `${user.id}/CV/v${nextVersion}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Insert document record using RPC
      const { data: docId, error: insertError } = await supabase.rpc('doc_insert', {
        _user_id: user.id,
        _type: 'CV',
        _filename: fileName,
        _size: file.size,
        _mime: file.type,
        _storage_path: storagePath
      });

      if (insertError) throw insertError;

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: isEnglish ? 'CV Updated' : 'CV Aggiornato',
          message: isEnglish ? `Your CV has been successfully updated (version ${nextVersion})` : `Il tuo CV è stato aggiornato con successo (versione ${nextVersion})`,
          type: 'document'
        });

      toast({
        title: isEnglish ? "Success" : "Successo",
        description: isEnglish ? "CV uploaded successfully" : "CV caricato con successo"
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: error.message || (isEnglish ? "Unable to upload CV" : "Impossibile caricare il CV"),
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      // Verifica che storage_path sia presente
      if (!doc.storage_path) {
        toast({
          title: isEnglish ? "Document not available" : "Documento non disponibile",
          description: isEnglish ? "The document needs to be re-uploaded. Please upload a new version of your CV." : "Il documento deve essere ricaricato. Per favore carica una nuova versione del tuo CV.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 300); // 5 minuti

      if (error) throw error;
      const fullUrl = data?.signedUrl?.startsWith('http') 
        ? data.signedUrl 
        : `https://gqmmgyoviwhgqvzqbbja.supabase.co/storage/v1${data?.signedUrl}`;
      if (!fullUrl) throw new Error('URL non generato');

      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('Download non riuscito');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = doc.filename || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: isEnglish ? "Error" : "Errore",
        description: error.message || (isEnglish ? "Unable to download document" : "Impossibile scaricare il documento"),
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/associate")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isEnglish ? 'Back to Dashboard' : 'Torna alla Dashboard'}
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            {isEnglish ? 'My Documents' : 'I miei Documenti'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEnglish ? 'Manage your CV' : 'Gestisci il tuo CV'}
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* CV Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Curriculum Vitae
              </CardTitle>
              <CardDescription>
                {isEnglish ? 'Upload and manage your CV' : 'Carica e gestisci il tuo CV'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentCV ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{currentCV.filename}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{isEnglish ? 'Version' : 'Versione'} {currentCV.version}</span>
                          <span>{formatFileSize(currentCV.size_bytes)}</span>
                          <span>
                            {format(new Date(currentCV.created_at), 'dd MMM yyyy', { locale })}
                          </span>
                        </div>
                      </div>
                      {currentCV.storage_path ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <FileCheck className="mr-1 h-3 w-3" />
                          {isEnglish ? 'Current' : 'Corrente'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          {isEnglish ? 'Needs reupload' : 'Da ricaricare'}
                        </Badge>
                      )}
                    </div>
                    {currentCV.storage_path ? (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDocument(currentCV)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {isEnglish ? 'Download' : 'Scarica CV'}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                        <p className="text-sm text-destructive">
                          {isEnglish ? 'This document needs to be re-uploaded. Please upload a new version of your CV.' : 'Questo documento deve essere ricaricato. Per favore carica una nuova versione del tuo CV.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cv-upload">{isEnglish ? 'Upload new version' : 'Carica nuova versione'}</Label>
                    <Input
                      id="cv-upload"
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleCVUpload}
                      disabled={isUploading}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {isEnglish ? 'PDF or DOCX, maximum 5MB' : 'PDF o DOCX, massimo 5MB'}
                    </p>
                  </div>

                  {cvHistory.length > 0 && (
                    <Accordion type="single" collapsible>
                      <AccordionItem value="history">
                        <AccordionTrigger>
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {isEnglish ? 'Document history' : 'Storico versioni'} ({cvHistory.length})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {cvHistory.map((doc) => (
                              <div key={doc.id} className="p-3 border rounded-lg bg-muted/50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{doc.filename}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {isEnglish ? 'Version' : 'Versione'} {doc.version} • {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')}
                                      </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => downloadDocument(doc)}
                                    disabled={!doc.storage_path}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">{isEnglish ? 'No CV uploaded' : 'Nessun CV caricato'}</p>
                  <div>
                    <Label htmlFor="cv-first-upload">{isEnglish ? 'Upload your CV' : 'Carica il tuo CV'}</Label>
                    <Input
                      id="cv-first-upload"
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleCVUpload}
                      disabled={isUploading}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default AssociateDocuments;