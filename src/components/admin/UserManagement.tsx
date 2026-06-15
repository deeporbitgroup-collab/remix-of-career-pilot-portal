import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, User, Building, Mail, Phone, CheckCircle, XCircle, Clock, Download, Upload, Trash2, GraduationCap, Briefcase, ChevronDown, ChevronUp, Edit
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserMetadata {
  status?: {
    university_student: boolean;
    master_student: boolean;
    professional: boolean;
  };
  university?: string;
  master_program?: string;
  sector?: string;
  experiences?: Array<{
    id: string;
    company: string;
    role: string;
    sector: string;
    period?: string;
  }>;
}

interface UserProfile {
  id: string;
  email: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  role: 'ASSOCIATE' | 'PARTNER' | 'ADMIN';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  photo_url?: string | null;
  metadata?: UserMetadata;
}

interface Document {
  id: string;
  user_id: string;
  type: 'CV' | 'CONTRACT';
  version: number;
  storage_path: string;
}

interface PartnerDocument {
  id: string;
  partner_id: string;
  type: string;
  filename: string;
  storage_path: string | null;
  created_at: string;
  version?: number;
}

interface UserManagementProps {
  roleFilter?: 'ASSOCIATE' | 'PARTNER';
}

const UserManagement = ({ roleFilter }: UserManagementProps = {}) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<'all' | 'ASSOCIATE' | 'PARTNER'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [userContracts, setUserContracts] = useState<{ [key: string]: boolean }>({});
  const [partnerContracts, setPartnerContracts] = useState<Record<string, PartnerDocument>>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const { toast } = useToast();
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; user: UserProfile | null; reason: string}>({ open: false, user: null, reason: '' });
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [isSendingExpulsion, setIsSendingExpulsion] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchUserContracts();
    fetchPartnerContracts();
  }, []);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*');
      
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }
      
      const { data: profiles, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!profiles) {
        setUsers([]);
        return;
      }
      
      // Map profiles to UserProfile with metadata from database
      const usersWithMetadata: UserProfile[] = profiles.map((profile): UserProfile => {
        const metadata: UserMetadata = {
          status: profile.profile_status as any || { university_student: false, master_student: false, professional: false },
          university: profile.university || undefined,
          master_program: profile.master_program || undefined,
          sector: profile.sector || undefined,
          experiences: (profile.professional_experiences as any) || []
        };
        
        return {
          id: profile.id,
          email: profile.email,
          phone: profile.phone,
          first_name: profile.first_name,
          last_name: profile.last_name,
          company_name: profile.company_name,
          role: profile.role as 'ASSOCIATE' | 'PARTNER' | 'ADMIN',
          status: profile.status as 'pending' | 'approved' | 'rejected',
          created_at: profile.created_at,
          photo_url: profile.photo_url,
          metadata
        };
      });
      
      setUsers(usersWithMetadata);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const fetchUserContracts = async () => {
    try {
      // Get all documents of type CONTRACT
      const { data, error } = await supabase
        .from('documents')
        .select('user_id')
        .eq('type', 'CONTRACT');

      if (error) throw error;
      
      // Create a map of user_id -> has contract
      const contractsMap: { [key: string]: boolean } = {};
      if (data) {
        data.forEach(doc => {
          contractsMap[doc.user_id] = true;
        });
      }
      setUserContracts(contractsMap);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchPartnerContracts = async () => {
    try {
      // Get all partner profiles
      const { data: partners } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'PARTNER');

      if (partners && partners.length > 0) {
        const partnerIds = partners.map(p => p.id);
        
        // Get contracts for all partners
        const { data: contracts, error } = await supabase
          .from('partner_documents')
          .select('*')
          .eq('type', 'contract')
          .in('partner_id', partnerIds);
        
        if (!error && contracts) {
          const contractsMap: Record<string, PartnerDocument> = {};
          contracts.forEach(contract => {
            contractsMap[contract.partner_id] = contract;
          });
          setPartnerContracts(contractsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching partner contracts:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    // Apply search filter
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const company = (user.company_name || '').toLowerCase();
    const email = user.email.toLowerCase();
    
    const matchesSearch = fullName.includes(searchLower) || 
                         company.includes(searchLower) || 
                         email.includes(searchLower);
    
    // Apply role filter
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    // Apply status filter
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'approved':
        return 'default' as const;
      case 'rejected':
        return 'destructive' as const;
      case 'pending':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const handleDownloadCV = async (userId: string, userName: string) => {
    try {
      // Get the latest CV document
      const { data: cv } = await supabase.rpc('doc_latest', {
        _user_id: userId,
        _type: 'CV'
      });

      if (!cv || !cv.storage_path) {
        toast({
          title: "CV non disponibile",
          description: "L'associato non ha ancora caricato il CV",
          variant: "destructive"
        });
        return;
      }

      // Try multiple buckets (legacy CVs were stored in 'cv' bucket)
      const buckets = ['documents', 'cv'];
      let data: { signedUrl: string } | null = null;
      let lastError: any = null;
      for (const bucket of buckets) {
        const res = await supabase.storage.from(bucket).createSignedUrl(cv.storage_path, 300);
        if (res.data?.signedUrl) {
          data = res.data;
          break;
        }
        lastError = res.error;
      }
      if (!data) throw lastError || new Error('File non trovato');

      // Download using blob
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error('Download fallito');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cv.filename || `CV_${userName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "CV scaricato",
        description: "Il CV è stato scaricato con successo"
      });
    } catch (error: any) {
      console.error("Errore download CV:", error);
      toast({
        title: "Errore download",
        description: error.message || "Impossibile scaricare il CV",
        variant: "destructive"
      });
    }
  };

  const handleUploadPartnerContract = async (partnerId: string, file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No admin user found');

      // Check if partner already has a contract
      const existingContract = partnerContracts[partnerId];
      
      // If there's an existing contract, delete it first
      if (existingContract && existingContract.storage_path) {
        await supabase.storage
          .from('partner-documents')
          .remove([existingContract.storage_path]);
        
        await supabase
          .from('partner_documents')
          .delete()
          .eq('id', existingContract.id);
      }

      // Upload new contract to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${partnerId}/contract_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('partner-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save contract record in database
      const { error: dbError } = await supabase
        .from('partner_documents')
        .insert({
          partner_id: partnerId,
          type: 'contract',
          filename: file.name,
          storage_path: uploadData.path,
          mime_type: file.type,
          size_bytes: file.size,
          uploaded_by: user.id,
          version: existingContract ? (existingContract.version || 1) + 1 : 1
        });

      if (dbError) throw dbError;

      toast({
        title: "Contratto caricato",
        description: existingContract 
          ? "Il contratto è stato aggiornato con successo"
          : "Il contratto è stato caricato con successo",
      });

      // Refresh contracts
      fetchPartnerContracts();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPartnerDocuments = async (partnerId: string) => {
    try {
      // Fetch all documents uploaded by the partner
      const { data: documents, error } = await supabase
        .from('partner_documents')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('type', 'document')
        .eq('uploaded_by', partnerId);

      if (error) throw error;

      if (!documents || documents.length === 0) {
        toast({
          title: "Nessun documento",
          description: "Il partner non ha caricato documenti",
        });
        return;
      }

      // Download each document
      for (const doc of documents) {
        if (!doc.storage_path) continue;
        
        const { data, error } = await supabase.storage
          .from('partner-documents')
          .download(doc.storage_path);

        if (error) continue;

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Download completato",
        description: `Scaricati ${documents.length} documenti`,
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePartnerContractFileSelect = (partnerId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadPartnerContract(partnerId, file);
    }
    // Reset input
    event.target.value = '';
  };

  const handleDeleteAssociate = async () => {
    if (!deleteDialog.user) return;

    setIsSendingExpulsion(true);
    try {
      // Send expulsion email first
      const userName = `${deleteDialog.user.first_name || ''} ${deleteDialog.user.last_name || ''}`.trim() || 'Associate';
      
      const { error: emailError } = await supabase.functions.invoke('send-associate-expulsion', {
        body: {
          associateName: userName,
          associateEmail: deleteDialog.user.email,
          reason: deleteDialog.reason || undefined
        }
      });

      if (emailError) {
        console.error('Error sending expulsion email:', emailError);
        // Continue with deletion even if email fails
      }

      // Use the database function to delete the user completely
      const { error } = await supabase.rpc('delete_user_completely', {
        user_id: deleteDialog.user.id
      });

      if (error) throw error;

      toast({
        title: "Associate eliminato",
        description: "L'Associate è stato eliminato e notificato via email",
      });

      // Refresh the users list
      fetchUsers();
      setDeleteDialog({ open: false, user: null, reason: '' });
    } catch (error: any) {
      toast({
        title: "Errore eliminazione",
        description: error.message || "Impossibile eliminare l'Associate",
        variant: "destructive",
      });
    } finally {
      setIsSendingExpulsion(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!deleteDialog.user) return;

    try {
      // Use the database function to delete the user completely
      const { error } = await supabase.rpc('delete_user_completely', {
        user_id: deleteDialog.user.id
      });

      if (error) throw error;

      toast({
        title: "Partner eliminato",
        description: "Il Partner è stato eliminato definitivamente dal sistema",
      });

      // Refresh the users list
      fetchUsers();
      setDeleteDialog({ open: false, user: null, reason: '' });
    } catch (error: any) {
      toast({
        title: "Errore eliminazione",
        description: error.message || "Impossibile eliminare il Partner",
        variant: "destructive",
      });
    }

  };

  const handleUploadContract = async (userId: string, file: File) => {
    try {
      // Upload file to storage - using correct path structure
      const storageKey = `${userId}/CONTRACT/v1/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storageKey, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Save document record
      const { error: dbError } = await supabase.rpc('doc_insert', {
        _user_id: userId,
        _type: 'CONTRACT',
        _filename: file.name,
        _size: file.size,
        _mime: file.type,
        _storage_path: storageKey
      });

      if (dbError) throw dbError;

      toast({
        title: "Contratto caricato",
        description: "Il contratto è stato caricato con successo"
      });
      
      // Update the contracts map
      setUserContracts(prev => ({ ...prev, [userId]: true }));
    } catch (error: any) {
      console.error("Errore upload contratto:", error);
      toast({
        title: "Errore caricamento",
        description: error.message || "Impossibile caricare il contratto",
        variant: "destructive"
      });
    }
  };

  const handleContractFileSelect = (userId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadContract(userId, file);
    }
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Gestione Utenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome, email o azienda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border rounded-md"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
              >
                <option value="all">Tutti i ruoli</option>
                <option value="ASSOCIATE">Associate</option>
                <option value="PARTNER">Partner</option>
              </select>
              <select
                className="px-3 py-2 border rounded-md"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">Tutti gli stati</option>
                <option value="pending">In attesa</option>
                <option value="approved">Approvati</option>
                <option value="rejected">Rifiutati</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map(user => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {user.photo_url ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photo_url} />
                        <AvatarFallback>
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      user.role === 'ASSOCIATE' ? (
                        <User className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Building className="h-5 w-5 text-green-500" />
                      )
                    )}
                    <span className="font-semibold text-lg">
                      {user.role === 'ASSOCIATE' 
                        ? `${user.first_name || ''} ${user.last_name || ''}`
                        : user.company_name}
                    </span>
                    <Badge variant={user.role === 'ASSOCIATE' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(user.status)}
                      <Badge variant={getStatusVariant(user.status)}>
                        {user.status === 'pending' ? 'In attesa' : 
                         user.status === 'approved' ? 'Approvato' : 'Rifiutato'}
                      </Badge>
                    </div>
                  </div>
                   <div className="flex flex-col md:flex-row gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {user.phone}
                    </div>
                  </div>
                  
                  {/* Associate Professional Info */}
                  {user.role === 'ASSOCIATE' && user.metadata && (
                    <>
                      {/* Only show if there's actual data */}
                      {(user.metadata.status && (user.metadata.status.university_student || user.metadata.status.master_student || user.metadata.status.professional)) && (
                        <div className="mt-3 space-y-2">
                          {/* Status badges */}
                          <div className="flex flex-wrap gap-2">
                            {user.metadata.status.university_student && (
                              <Badge variant="outline" className="bg-blue-50">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Studente Universitario
                              </Badge>
                            )}
                            {user.metadata.status.master_student && (
                              <Badge variant="outline" className="bg-purple-50">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Studente Master
                              </Badge>
                            )}
                            {user.metadata.status.professional && (
                              <Badge variant="outline" className="bg-green-50">
                                <Briefcase className="h-3 w-3 mr-1" />
                                Professional
                              </Badge>
                            )}
                          </div>
                          
                          {/* University/Master/Sector info */}
                          {(user.metadata.university || user.metadata.master_program || user.metadata.sector) && (
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {user.metadata.university && (
                                <div className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3" />
                                  <span className="font-medium">Università:</span> {user.metadata.university}
                                </div>
                              )}
                              {user.metadata.master_program && (
                                <div className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3" />
                                  <span className="font-medium">Master:</span> {user.metadata.master_program}
                                </div>
                              )}
                              {user.metadata.sector && (
                                <div className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  <span className="font-medium">Settore:</span> {user.metadata.sector}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Experiences - Collapsible */}
                          {user.metadata.experiences && user.metadata.experiences.length > 0 && (
                            <div className="mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleUserExpansion(user.id)}
                                className="h-auto p-1 text-xs"
                              >
                                {expandedUsers.has(user.id) ? (
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                )}
                                {expandedUsers.has(user.id) ? 'Nascondi' : 'Mostra'} {user.metadata.experiences.length} {user.metadata.experiences.length === 1 ? 'esperienza' : 'esperienze'}
                              </Button>
                              
                              {expandedUsers.has(user.id) && (
                                <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
                                  {user.metadata.experiences.map((exp) => (
                                    <div key={exp.id} className="text-xs bg-muted/30 p-2 rounded">
                                      <div className="font-medium">{exp.company}</div>
                                      <div className="text-muted-foreground">
                                        {exp.role} - {exp.sector}
                                        {exp.period && <span className="ml-2">({exp.period})</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {user.role === 'ASSOCIATE' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => navigate(`/app/admin/associates/${user.id}`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Modifica
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadCV(user.id, `${user.first_name || ''} ${user.last_name || ''}`)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Scarica CV
                    </Button>
                    <div>
                      <input
                        ref={(el) => (fileInputRefs.current[user.id] = el)}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleContractFileSelect(user.id, e)}
                      />
                      <Button
                        size="sm"
                        variant={userContracts[user.id] ? "secondary" : "outline"}
                        onClick={() => fileInputRefs.current[user.id]?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {userContracts[user.id] ? "Sostituisci Contratto" : "Carica Contratto"}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteDialog({ open: true, user, reason: '' })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Elimina
                    </Button>
                  </div>
                )}
                {user.role === 'PARTNER' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPartnerDocuments(user.id)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Scarica Documenti
                    </Button>
                    <div>
                      <input
                        ref={(el) => (fileInputRefs.current[`partner-${user.id}`] = el)}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handlePartnerContractFileSelect(user.id, e)}
                      />
                      <Button
                        size="sm"
                        variant={partnerContracts[user.id] ? "secondary" : "outline"}
                        onClick={() => fileInputRefs.current[`partner-${user.id}`]?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {partnerContracts[user.id] ? "Sostituisci Contratto" : "Carica Contratto"}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteDialog({ open: true, user, reason: '' })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Elimina
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Nessun utente trovato</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: null, reason: '' })}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Sei sicuro di voler eliminare definitivamente{' '}
                  {deleteDialog.user?.role === 'ASSOCIATE' ? "l'Associate" : "il Partner"}{' '}
                  <strong>
                    {deleteDialog.user?.first_name} {deleteDialog.user?.last_name}
                  </strong>
                  ? Questa azione non può essere annullata.
                </p>
                <p className="mt-4">Verranno eliminati:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Account e accesso alla piattaforma</li>
                  <li>Curriculum vitae e documenti</li>
                  <li>Disponibilità e dati personali</li>
                  <li>Tutti i dati associati</li>
                </ul>
                {deleteDialog.user?.role === 'ASSOCIATE' && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-foreground mb-2">
                      Motivazione espulsione (opzionale):
                    </p>
                    <Textarea
                      placeholder="Inserisci la motivazione dell'espulsione che verrà comunicata via email all'associate..."
                      value={deleteDialog.reason}
                      onChange={(e) => setDeleteDialog(prev => ({ ...prev, reason: e.target.value }))}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      L'associate riceverà un'email di notifica all'indirizzo: {deleteDialog.user?.email}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSendingExpulsion}>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteDialog.user?.role === 'ASSOCIATE') {
                  handleDeleteAssociate();
                } else if (deleteDialog.user?.role === 'PARTNER') {
                  handleDeletePartner();
                }
              }}
              disabled={isSendingExpulsion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSendingExpulsion ? "Eliminazione..." : "Elimina definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;