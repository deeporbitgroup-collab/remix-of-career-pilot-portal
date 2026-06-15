import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Calendar, FileText, Upload, Download, Mail, Phone, Shield, KeyRound, CheckCircle, XCircle, Edit, Save, X, Loader2 as Spinner, Camera, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RegistrationDataDisplay from "@/components/admin/RegistrationDataDisplay";

interface Associate {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  company_name: string | null;
  company_2: string | null;
  status: string;
  created_at: string;
  university: string | null;
  university_2: string | null;
  master_program: string | null;
  sector: string | null;
  sector_2: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  overview_url: string | null;
  // Registration data fields
  about_data: any;
  languages: any;
  certifications: any;
  profile_presentation: any;
}

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

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

export default function AssociateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [associate, setAssociate] = useState<Associate | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingOverview, setIsUploadingOverview] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{ open: boolean; newStatus: string | null }>({ 
    open: false, 
    newStatus: null 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    company_name: '',
    company_2: '',
    university: '',
    university_2: '',
    master_program: '',
    sector: '',
    sector_2: '',
    linkedin_url: ''
  });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const overviewInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      fetchAssociateData();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAvailability();
    }
  }, [id, currentWeek]);

  const fetchAssociateData = async () => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) throw profileError;
      setAssociate(profile);

      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", id)
        .order("version", { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docs || []);
    } catch (error) {
      console.error("Error fetching associate:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati dell'associate",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const end = endOfWeek(currentWeek, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("user_id", id)
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"))
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setAvailabilitySlots(data || []);
    } catch (error) {
      console.error("Error fetching availability:", error);
    }
  };

  const handleResetPassword = async () => {
    if (!associate?.email) return;
    
    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(associate.email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;

      toast({
        title: "Email di reset inviata",
        description: `Un'email di reset password è stata inviata a ${associate.email}`
      });
      setResetPasswordDialog(false);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile inviare l'email di reset",
        variant: "destructive"
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleStatusChange = async () => {
    if (!id || !statusChangeDialog.newStatus) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: statusChangeDialog.newStatus as "pending" | "approved" | "rejected" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Stato aggiornato",
        description: `Lo stato è stato cambiato in ${statusChangeDialog.newStatus}`
      });
      
      setStatusChangeDialog({ open: false, newStatus: null });
      fetchAssociateData();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive"
      });
    }
  };

  const startEditing = () => {
    if (associate) {
      setEditForm({
        first_name: associate.first_name || '',
        last_name: associate.last_name || '',
        phone: associate.phone || '',
        company_name: associate.company_name || '',
        company_2: associate.company_2 || '',
        university: associate.university || '',
        university_2: associate.university_2 || '',
        master_program: associate.master_program || '',
        sector: associate.sector || '',
        sector_2: associate.sector_2 || '',
        linkedin_url: associate.linkedin_url || ''
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({
      first_name: '',
      last_name: '',
      phone: '',
      company_name: '',
      company_2: '',
      university: '',
      university_2: '',
      master_program: '',
      sector: '',
      sector_2: '',
      linkedin_url: ''
    });
  };

  const saveProfile = async () => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name || null,
          last_name: editForm.last_name || null,
          phone: editForm.phone,
          company_name: editForm.company_name || null,
          company_2: editForm.company_2 || null,
          university: editForm.university || null,
          university_2: editForm.university_2 || null,
          master_program: editForm.master_program || null,
          sector: editForm.sector || null,
          sector_2: editForm.sector_2 || null,
          linkedin_url: editForm.linkedin_url || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche sono state salvate con successo"
      });
      
      setIsEditing(false);
      fetchAssociateData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare le modifiche",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Errore",
        description: "Seleziona un file immagine valido",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Errore",
        description: "L'immagine deve essere inferiore a 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/profile_${Date.now()}.${fileExt}`;

      // Delete old photo if exists
      if (associate?.photo_url) {
        const oldPath = associate.photo_url.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-photos').remove([oldPath]);
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: "Foto aggiornata",
        description: "La foto profilo è stata aggiornata con successo"
      });

      fetchAssociateData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare la foto",
        variant: "destructive"
      });
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleOverviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      toast({
        title: "Errore",
        description: "Seleziona un file PDF valido",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Errore",
        description: "Il file deve essere inferiore a 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingOverview(true);
    try {
      const fileName = `${id}/overview_${Date.now()}.pdf`;

      // Delete old overview if exists (check both buckets for migration)
      if (associate?.overview_url) {
        const oldPath = associate.overview_url.split('/').slice(-2).join('/');
        // Try to delete from both buckets (old and new)
        await supabase.storage.from('associate-overviews').remove([oldPath]);
        await supabase.storage.from('documents').remove([oldPath]);
      }

      // Upload new overview to public bucket
      const { error: uploadError } = await supabase.storage
        .from('associate-overviews')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('associate-overviews')
        .getPublicUrl(fileName);

      // Update profile with new overview URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ overview_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: "Overview caricato",
        description: "Il file Overview è stato caricato con successo"
      });

      fetchAssociateData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare l'Overview",
        variant: "destructive"
      });
    } finally {
      setIsUploadingOverview(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDeleteOverview = async () => {
    if (!id || !associate?.overview_url) return;

    try {
      // Delete from storage (try both buckets for migration)
      const oldPath = associate.overview_url.split('/').slice(-2).join('/');
      await supabase.storage.from('associate-overviews').remove([oldPath]);
      await supabase.storage.from('documents').remove([oldPath]);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ overview_url: null, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: "Overview eliminato",
        description: "Il file Overview è stato rimosso"
      });

      fetchAssociateData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'Overview",
        variant: "destructive"
      });
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      // Check if contract already exists
      const existingContract = documents.find(d => d.type === "CONTRACT");
      const nextVersion = existingContract ? existingContract.version + 1 : 1;
      
      const storagePath = `${id}/CONTRACT/v${nextVersion}/${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Insert document record using RPC
      const { error: insertError } = await supabase.rpc("doc_insert", {
        _user_id: id,
        _type: "CONTRACT",
        _filename: file.name,
        _size: file.size,
        _mime: file.type,
        _storage_path: storagePath
      });

      if (insertError) throw insertError;

      // Create notification for associate
      await supabase
        .from("notifications")
        .insert({
          user_id: id,
          title: "Contratto Caricato",
          message: "Il tuo contratto è stato caricato dall'amministratore",
          type: "document"
        });

      toast({
        title: "Successo",
        description: "Contratto caricato con successo"
      });

      fetchAssociateData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare il contratto",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      // Verifica che storage_path sia presente
      if (!doc.storage_path) {
        toast({
          title: "Documento non disponibile",
          description: "Il documento deve essere ricaricato. L'associate deve caricare una nuova versione.",
          variant: "destructive"
        });
        return;
      }

      // Determine the correct bucket based on document type and storage path
      // CV files uploaded during registration go to 'cv' bucket
      // Other documents (contracts, etc.) go to 'documents' bucket
      const bucketName = doc.type === 'CV' && !doc.storage_path.includes('/CV/') ? 'cv' : 'documents';

      const { data, error } = await supabase.storage
        .from(bucketName)
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
        title: "Errore",
        description: error.message || "Impossibile scaricare il documento",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!associate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Associate non trovato</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/admin/associates")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna all'elenco
          </Button>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={associate.photo_url || undefined} alt={`${associate.first_name} ${associate.last_name}`} />
                <AvatarFallback className="text-2xl bg-primary/10">
                  {associate.first_name?.[0]}{associate.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <Spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {associate.first_name} {associate.last_name}
              </h1>
              <p className="text-muted-foreground mt-1">{associate.email}</p>
            </div>
          </div>
          {getStatusBadge(associate.status)}
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profilo
            </TabsTrigger>
            <TabsTrigger value="registration">
              <ClipboardList className="h-4 w-4 mr-2" />
              Dati Registrazione
            </TabsTrigger>
            <TabsTrigger value="availability">
              <Calendar className="h-4 w-4 mr-2" />
              Disponibilità
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documenti
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Informazioni Personali</CardTitle>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSaving}>
                      <X className="h-4 w-4 mr-2" />
                      Annulla
                    </Button>
                    <Button size="sm" onClick={saveProfile} disabled={isSaving}>
                      {isSaving ? (
                        <Spinner className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salva
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Nome</Label>
                      <Input
                        id="first_name"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        placeholder="Nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Cognome</Label>
                      <Input
                        id="last_name"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        placeholder="Cognome"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (non modificabile)</Label>
                      <Input
                        id="email"
                        value={associate.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefono</Label>
                      <Input
                        id="phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="Telefono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Azienda</Label>
                      <Input
                        id="company_name"
                        value={editForm.company_name}
                        onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                        placeholder="Azienda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="university">Università</Label>
                      <Input
                        id="university"
                        value={editForm.university}
                        onChange={(e) => setEditForm({ ...editForm, university: e.target.value })}
                        placeholder="Università"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="university_2">Università II</Label>
                      <Input
                        id="university_2"
                        value={editForm.university_2}
                        onChange={(e) => setEditForm({ ...editForm, university_2: e.target.value })}
                        placeholder="Università precedente (trasferimento)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="master_program">Programma Master</Label>
                      <Input
                        id="master_program"
                        value={editForm.master_program}
                        onChange={(e) => setEditForm({ ...editForm, master_program: e.target.value })}
                        placeholder="Programma Master"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sector">Settore</Label>
                      <Input
                        id="sector"
                        value={editForm.sector}
                        onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                        placeholder="Settore"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sector_2">Settore II</Label>
                      <Input
                        id="sector_2"
                        value={editForm.sector_2}
                        onChange={(e) => setEditForm({ ...editForm, sector_2: e.target.value })}
                        placeholder="Settore secondario"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_2">Azienda II</Label>
                      <Input
                        id="company_2"
                        value={editForm.company_2}
                        onChange={(e) => setEditForm({ ...editForm, company_2: e.target.value })}
                        placeholder="Azienda secondaria"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                      <Input
                        id="linkedin_url"
                        value={editForm.linkedin_url}
                        onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{associate.first_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cognome</p>
                      <p className="font-medium">{associate.last_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{associate.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <p className="font-medium">{associate.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Azienda</p>
                      <p className="font-medium">{associate.company_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Università</p>
                      <p className="font-medium">{associate.university || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Università II</p>
                      <p className="font-medium">{associate.university_2 || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Programma Master</p>
                      <p className="font-medium">{associate.master_program || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Settore</p>
                      <p className="font-medium">{associate.sector || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Settore II</p>
                      <p className="font-medium">{associate.sector_2 || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Azienda II</p>
                      <p className="font-medium">{associate.company_2 || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">LinkedIn</p>
                      <p className="font-medium">
                        {associate.linkedin_url ? (
                          <a href={associate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {associate.linkedin_url}
                          </a>
                        ) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Registrato il</p>
                      <p className="font-medium">
                        {format(new Date(associate.created_at), "dd/MM/yyyy", { locale: it })}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Azioni Admin</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResetPasswordDialog(true)}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                    {associate.status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setStatusChangeDialog({ open: true, newStatus: 'approved' })}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approva
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setStatusChangeDialog({ open: true, newStatus: 'rejected' })}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Respingi
                        </Button>
                      </>
                    )}
                    {associate.status === 'approved' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setStatusChangeDialog({ open: true, newStatus: 'rejected' })}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Revoca Approvazione
                      </Button>
                    )}
                    {associate.status === 'rejected' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setStatusChangeDialog({ open: true, newStatus: 'approved' })}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approva
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registration">
            <RegistrationDataDisplay
              aboutData={associate.about_data}
              languages={associate.languages}
              certifications={associate.certifications}
              profilePresentation={associate.profile_presentation}
              linkedinUrl={associate.linkedin_url}
            />
          </TabsContent>

          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle>Disponibilità Settimanale</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                  >
                    ← Settimana precedente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(new Date())}
                  >
                    Oggi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                  >
                    Settimana successiva →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const daySlots = availabilitySlots.filter(
                      slot => slot.date === format(day, "yyyy-MM-dd")
                    );
                    return (
                      <div key={day.toISOString()} className="border rounded-lg p-2">
                        <p className="font-medium text-sm mb-2">
                          {format(day, "EEE dd", { locale: it })}
                        </p>
                        {daySlots.length > 0 ? (
                          <div className="space-y-1">
                            {daySlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="bg-primary/10 rounded px-2 py-1 text-xs"
                              >
                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Non disponibile</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Overview Section */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Overview (PDF per clienti)</CardTitle>
                </CardHeader>
                <CardContent>
                  <input
                    ref={overviewInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleOverviewUpload}
                  />
                  {associate?.overview_url ? (
                    <div className="p-3 border rounded-lg bg-purple-50 mb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Overview.pdf</p>
                          <p className="text-xs text-muted-foreground">
                            PDF visibile ai clienti nel Book Flight Plan
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(associate.overview_url!, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => overviewInputRef.current?.click()}
                            disabled={isUploadingOverview}
                          >
                            {isUploadingOverview ? (
                              <Spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDeleteOverview}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-sm">
                        Nessun Overview caricato. Carica un PDF che sarà mostrato ai clienti nel Book Flight Plan.
                        Se non presente, verrà mostrato il CV dell'associate.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => overviewInputRef.current?.click()}
                        disabled={isUploadingOverview}
                      >
                        {isUploadingOverview ? (
                          <Spinner className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Carica Overview PDF
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CV Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Curriculum Vitae</CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.filter(d => d.type === "CV").map((doc, index) => (
                    <div key={doc.id} className={`p-3 border rounded-lg ${index === 0 ? "bg-green-50" : "bg-muted/50"} mb-2`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            Versione {doc.version} • {formatFileSize(doc.size_bytes)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDocument(doc)}
                          disabled={!doc.storage_path}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {documents.filter(d => d.type === "CV").length === 0 && (
                    <p className="text-muted-foreground text-sm">Nessun CV caricato</p>
                  )}
                </CardContent>
              </Card>

              {/* Contract Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Contratto</CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.filter(d => d.type === "CONTRACT").map((doc) => (
                    <div key={doc.id} className="p-3 border rounded-lg bg-blue-50 mb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.size_bytes)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDocument(doc)}
                          disabled={!doc.storage_path}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {documents.filter(d => d.type === "CONTRACT").length === 0 && (
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-sm">Nessun contratto caricato</p>
                      <div>
                        <Label htmlFor="contract-upload">Carica contratto</Label>
                        <Input
                          id="contract-upload"
                          type="file"
                          accept=".pdf,.docx"
                          onChange={handleContractUpload}
                          disabled={isUploading}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Alert Dialogs */}
        <AlertDialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Password</AlertDialogTitle>
              <AlertDialogDescription>
                Verrà inviata un'email di reset password a {associate?.email}. 
                L'utente riceverà un link per impostare una nuova password.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetPassword} disabled={isResettingPassword}>
                {isResettingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Invia Email"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog 
          open={statusChangeDialog.open} 
          onOpenChange={(open) => setStatusChangeDialog({ open, newStatus: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma Cambio Stato</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler cambiare lo stato di questo associate a{' '}
                <strong>{statusChangeDialog.newStatus}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleStatusChange}>
                Conferma
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}