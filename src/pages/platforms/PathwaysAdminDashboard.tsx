import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePathwaysAuth } from '@/contexts/PathwaysAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { Users, FileText, Database, Activity, LogOut, Plus, Pencil, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';

const PathwaysAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = usePathwaysAuth();
  const { language } = useI18n();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/platforms/pathways/admin/login');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Pathways Admin Dashboard</h1>
            <p className="text-muted-foreground">
              {language === 'it' ? 'Gestisci studenti, candidature e catalogo' : 'Manage students, applications and catalog'}
            </p>
          </div>
          <Button variant="outline" onClick={() => { logout(); navigate('/platforms/pathways'); }}>
            <LogOut className="mr-2 h-4 w-4" />
            {language === 'it' ? 'Esci' : 'Logout'}
          </Button>
        </div>

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="students">
              <Users className="mr-2 h-4 w-4" />
              {language === 'it' ? 'Studenti' : 'Students'}
            </TabsTrigger>
            <TabsTrigger value="applications">
              <FileText className="mr-2 h-4 w-4" />
              {language === 'it' ? 'Candidature' : 'Applications'}
            </TabsTrigger>
            <TabsTrigger value="catalog">
              <Database className="mr-2 h-4 w-4" />
              {language === 'it' ? 'Catalogo' : 'Catalog'}
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="mr-2 h-4 w-4" />
              {language === 'it' ? 'Log' : 'Logs'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentsTab language={language} toast={toast} />
          </TabsContent>

          <TabsContent value="applications">
            <ApplicationsTab language={language} toast={toast} />
          </TabsContent>

          <TabsContent value="catalog">
            <CatalogTab language={language} toast={toast} />
          </TabsContent>

          <TabsContent value="logs">
            <LogsTab language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Students Tab Component
function StudentsTab({ language, toast }: any) {
  const [students, setStudents] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pathways_users')
      .select('*')
      .eq('role', 'STUDENT')
      .order('created_at', { ascending: false });
    
    if (data) {
      setStudents(data);
      // Load receipts for students who have uploaded payment
      const studentsWithReceipts = data.filter(s => s.status === 'payment_uploaded');
      for (const student of studentsWithReceipts) {
        await loadReceipts(student.id);
      }
    }
    
    setLoading(false);
  };

  const loadReceipts = async (userId: string) => {
    const { data } = await supabase
      .from('pathways_payment_receipts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setReceipts(prev => ({ ...prev, [userId]: data }));
    }
  };

  const handleApprove = async (userId: string) => {
    const student = students.find(s => s.id === userId);
    
    const { error } = await supabase
      .from('pathways_users')
      .update({ status: 'admitted_to_payment' })
      .eq('id', userId);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: error.message,
      });
      return;
    }

    // Send email notification
    if (student) {
      await supabase.functions.invoke('send-pathways-access-decision', {
        body: {
          studentEmail: student.email,
          studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email,
          decision: 'approved',
        },
      });
    }

    toast({
      title: language === 'it' ? 'Accesso approvato' : 'Access approved',
      description: language === 'it' ? 'Lo studente può ora accedere alla piattaforma e caricare la ricevuta' : 'The student can now access the platform and upload the receipt',
    });

    loadStudents();
  };

  const handleActivate = async (userId: string) => {
    const student = students.find(s => s.id === userId);
    
    const { error } = await supabase
      .from('pathways_users')
      .update({ status: 'active' })
      .eq('id', userId);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: error.message,
      });
      return;
    }

    // Send email notification
    if (student) {
      await supabase.functions.invoke('send-pathways-activation', {
        body: {
          studentEmail: student.email,
          studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email,
          studentPhone: student.phone,
          studentSchool: student.school,
        },
      });
    }

    toast({
      title: language === 'it' ? 'Studente attivato' : 'Student activated',
      description: language === 'it' ? 'Lo studente ha ora accesso completo alla piattaforma' : 'The student now has full access to the platform',
    });

    loadStudents();
  };

  const handleReject = async (userId: string) => {
    const student = students.find(s => s.id === userId);
    
    const { error } = await supabase
      .from('pathways_users')
      .update({ status: 'revoked' })
      .eq('id', userId);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: error.message,
      });
      return;
    }

    // Send email notification
    if (student) {
      await supabase.functions.invoke('send-pathways-access-decision', {
        body: {
          studentEmail: student.email,
          studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email,
          decision: 'rejected',
        },
      });
    }

    toast({
      title: language === 'it' ? 'Accesso rifiutato' : 'Access rejected',
      description: language === 'it' ? 'Lo studente non potrà accedere alla piattaforma' : 'The student will not be able to access the platform',
    });

    loadStudents();
  };

  const downloadReceipt = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('pathways-receipts')
      .download(filePath);

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore download' : 'Download error',
        description: error?.message || 'File not found',
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US');
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      registered: 'bg-yellow-100 text-yellow-800',
      admitted_to_payment: 'bg-blue-100 text-blue-800',
      payment_uploaded: 'bg-purple-100 text-purple-800',
      active: 'bg-green-100 text-green-800',
      revoked: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status] || 'bg-muted'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">{language === 'it' ? 'Caricamento...' : 'Loading...'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'it' ? 'Gestione Studenti Registrati' : 'Registered Students Management'}</CardTitle>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {language === 'it' ? 'Nessuno studente registrato' : 'No students registered'}
          </p>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <Card key={student.id} className="border-l-4 border-l-primary/20">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">{language === 'it' ? 'Nome completo' : 'Full name'}</p>
                        <p className="font-semibold">{student.first_name} {student.last_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{student.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{language === 'it' ? 'Telefono' : 'Phone'}</p>
                        <p className="font-medium">{student.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">{language === 'it' ? 'Scuola' : 'School'}</p>
                        <p className="font-medium">{student.school || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{language === 'it' ? 'Data registrazione' : 'Registration date'}</p>
                        <p className="font-medium">{formatDate(student.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{language === 'it' ? 'Stato' : 'Status'}</p>
                        <div className="mt-1">{getStatusBadge(student.status)}</div>
                      </div>
                    </div>
                  </div>
                  {student.status === 'registered' && (
                    <div className="flex gap-3 mt-6 pt-4 border-t">
                      <Button 
                        variant="default" 
                        className="flex-1"
                        onClick={() => handleApprove(student.id)}
                      >
                        {language === 'it' ? 'Approva accesso' : 'Approve access'}
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => handleReject(student.id)}
                      >
                        {language === 'it' ? 'Rifiuta accesso' : 'Reject access'}
                      </Button>
                    </div>
                  )}
                  {student.status === 'payment_uploaded' && receipts[student.id] && (
                    <div className="mt-6 pt-4 border-t space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">
                          {language === 'it' ? 'Ricevuta di pagamento caricata:' : 'Payment receipt uploaded:'}
                        </p>
                        {receipts[student.id].map((receipt: any) => (
                          <div key={receipt.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                            <span className="text-sm flex-1">
                              {new Date(receipt.created_at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US')}
                            </span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => downloadReceipt(receipt.file_url, `receipt-${student.first_name}-${student.last_name}.pdf`)}
                            >
                              {language === 'it' ? 'Scarica' : 'Download'}
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={() => handleActivate(student.id)}
                      >
                        {language === 'it' ? 'Attiva studente e concedi accesso completo' : 'Activate student and grant full access'}
                      </Button>
                    </div>
                  )}
                  {student.status === 'active' && (
                    <div className="mt-6 pt-4 border-t">
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => handleReject(student.id)}
                      >
                        {language === 'it' ? 'Revoca accesso ed espelli dalla piattaforma' : 'Revoke access and expel from platform'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Applications Tab Component
function ApplicationsTab({ language, toast }: any) {
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    const { data } = await supabase
      .from('pathways_applications')
      .select(`
        *,
        user:pathways_users(first_name, last_name, email),
        provider:pathways_providers(name)
      `)
      .order('created_at', { ascending: false});
    setApplications(data || []);
  };

  const updateApplicationStatus = async (appId: string, newStatus: 'submitted' | 'in_review' | 'accepted' | 'rejected', studentEmail: string, organizationName: string) => {
    const { error } = await supabase
      .from('pathways_applications')
      .update({ 
        status: newStatus,
        notified_student: false 
      })
      .eq('id', appId);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: error.message,
      });
      return;
    }

    // Send email notification to student
    if (newStatus === 'accepted' || newStatus === 'rejected') {
      await supabase.functions.invoke('send-application-status', {
        body: {
          studentEmail,
          organizationName,
          status: newStatus,
        },
      });

      // Mark as notified
      await supabase
        .from('pathways_applications')
        .update({ notified_student: true })
        .eq('id', appId);
    }

    toast({
      title: language === 'it' ? 'Candidatura aggiornata' : 'Application updated',
    });

    loadApplications();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'it' ? 'Gestione Candidature Studenti' : 'Student Applications Management'}</CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {language === 'it' ? 'Nessuna candidatura' : 'No applications'}
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app: any) => {
              const statusBadge = {
                submitted: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
                in_review: { color: 'bg-blue-100 text-blue-800', icon: Clock },
                accepted: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
                rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
              }[app.status] || { color: 'bg-muted', icon: Clock };
              const StatusIcon = statusBadge.icon;

              return (
                <Card key={app.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-lg">{app.user?.first_name} {app.user?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{app.user?.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusBadge.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {app.status}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 text-sm mb-4">
                      <div>
                        <strong>{language === 'it' ? 'Ente:' : 'Organization:'}</strong> {app.organization_name || app.provider?.name}
                      </div>
                      <div>
                        <strong>{language === 'it' ? 'Periodo:' : 'Period:'}</strong> {app.period_from} → {app.period_to}
                      </div>
                      <div>
                        <strong>{language === 'it' ? 'Data candidatura:' : 'Applied on:'}</strong> {new Date(app.created_at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US')}
                      </div>
                      <div>
                        <strong>{language === 'it' ? 'Categoria:' : 'Category:'}</strong> {app.category}
                      </div>
                    </div>
                    {(app.status === 'submitted' || app.status === 'in_review') && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button 
                          size="sm" 
                          variant="default" 
                          onClick={() => updateApplicationStatus(app.id, 'accepted', app.user?.email, app.organization_name || app.provider?.name)}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          {language === 'it' ? '✅ Accetta' : '✅ Accept'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => updateApplicationStatus(app.id, 'rejected', app.user?.email, app.organization_name || app.provider?.name)}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          {language === 'it' ? '❌ Rifiuta' : '❌ Reject'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// Catalog Tab Component
function CatalogTab({ language, toast }: any) {
  const [providers, setProviders] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'VOLUNTEERING' as 'VOLUNTEERING' | 'LANGUAGE_COURSE' | 'PUBLIC_SPEAKING' | 'EXCHANGE',
    subcategory: [] as string[],
    city: '',
    country: '',
    is_online: false,
    website_url: '',
    contact_email: '',
    logo_url: '',
    requirements: '',
    active: true,
  });

  const subcategoryOptions: Record<string, string[]> = {
    VOLUNTEERING: ['Social', 'Educational', 'Environmental', 'Healthcare', 'Animals', 'Cultural'],
    LANGUAGE_COURSE: ['English', 'French', 'Italian', 'Spanish', 'German', 'Chinese', 'Russian'],
    PUBLIC_SPEAKING: ['Effective Communication', 'Professional Presentations', 'Debate', 'Advanced Public Speaking'],
    EXCHANGE: ['Cultural', 'Academic', 'Professional', 'Linguistic'],
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    const { data } = await supabase
      .from('pathways_providers')
      .select('*')
      .order('created_at', { ascending: false });
    setProviders(data || []);
  };

  const handleAdd = () => {
    setEditingProvider(null);
    setFormData({
      name: '',
      description: '',
      category: 'VOLUNTEERING' as 'VOLUNTEERING' | 'LANGUAGE_COURSE' | 'PUBLIC_SPEAKING' | 'EXCHANGE',
      subcategory: [],
      city: '',
      country: '',
      is_online: false,
      website_url: '',
      contact_email: '',
      logo_url: '',
      requirements: '',
      active: true,
    });
    setShowDialog(true);
  };

  const handleEdit = (provider: any) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      description: provider.description || '',
      category: provider.category,
      subcategory: Array.isArray(provider.subcategory) ? provider.subcategory : (provider.subcategory ? [provider.subcategory] : []),
      city: provider.city || '',
      country: provider.country || '',
      is_online: provider.is_online || false,
      website_url: provider.website_url || '',
      contact_email: provider.contact_email || '',
      logo_url: provider.logo_url || '',
      requirements: provider.requirements || '',
      active: provider.active,
    });
    setShowDialog(true);
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm(language === 'it' ? 'Sei sicuro di voler eliminare questo ente?' : 'Are you sure you want to delete this provider?')) {
      return;
    }

    const { error } = await supabase
      .from('pathways_providers')
      .delete()
      .eq('id', providerId);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: error.message,
      });
      return;
    }

    toast({
      title: language === 'it' ? 'Ente eliminato' : 'Provider deleted',
    });

    loadProviders();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProvider) {
      // Update existing provider
      const { error } = await supabase
        .from('pathways_providers')
        .update(formData as any)
        .eq('id', editingProvider.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: language === 'it' ? 'Errore' : 'Error',
          description: error.message,
        });
        return;
      }

      toast({
        title: language === 'it' ? 'Ente aggiornato' : 'Provider updated',
      });
    } else {
      // Create new provider
      const { error } = await supabase
        .from('pathways_providers')
        .insert(formData as any);

      if (error) {
        toast({
          variant: 'destructive',
          title: language === 'it' ? 'Errore' : 'Error',
          description: error.message,
        });
        return;
      }

      toast({
        title: language === 'it' ? 'Ente aggiunto' : 'Provider added',
      });
    }

    setShowDialog(false);
    loadProviders();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{language === 'it' ? 'Gestione Catalogo Enti' : 'Providers Catalog Management'}</CardTitle>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {language === 'it' ? 'Aggiungi Ente' : 'Add Provider'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <Card 
                key={provider.id} 
                className="flex flex-col h-[280px] hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleEdit(provider)}
                data-name={provider.name}
                data-description={provider.description}
                data-website={provider.website_url}
              >
                <CardContent className="pt-6 flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-2">{provider.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-4 overflow-hidden">{provider.description}</p>
                    <div className="flex gap-2 flex-wrap text-xs mb-2">
                      <span className={`px-2 py-1 rounded ${provider.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {provider.active ? (language === 'it' ? 'Attivo' : 'Active') : (language === 'it' ? 'Disattivato' : 'Inactive')}
                      </span>
                      <span className="px-2 py-1 rounded bg-muted text-muted-foreground">
                        {provider.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-3 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(provider);
                      }}
                      className="flex-1"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      {language === 'it' ? 'Modifica' : 'Edit'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(provider.id);
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {language === 'it' ? 'Elimina' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProvider 
                ? (language === 'it' ? 'Modifica Ente' : 'Edit Provider')
                : (language === 'it' ? 'Aggiungi Nuovo Ente' : 'Add New Provider')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{language === 'it' ? 'Nome Ente' : 'Provider Name'} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">{language === 'it' ? 'Descrizione' : 'Description'}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">{language === 'it' ? 'Categoria' : 'Category'} *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    category: value as typeof formData.category,
                    subcategory: [] // Reset subcategory when category changes
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VOLUNTEERING">{language === 'it' ? 'Volontariato' : 'Volunteering'}</SelectItem>
                    <SelectItem value="LANGUAGE_COURSE">{language === 'it' ? 'Corsi di Lingua' : 'Language Courses'}</SelectItem>
                    <SelectItem value="PUBLIC_SPEAKING">Public Speaking</SelectItem>
                    <SelectItem value="EXCHANGE">{language === 'it' ? 'Scambi' : 'Exchanges'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{language === 'it' ? 'Sottocategorie' : 'Subcategories'} *</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {subcategoryOptions[formData.category]?.map((sub) => (
                    <div key={sub} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`sub-${sub}`}
                        checked={formData.subcategory.includes(sub)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, subcategory: [...formData.subcategory, sub] });
                          } else {
                            setFormData({ ...formData, subcategory: formData.subcategory.filter(s => s !== sub) });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <label htmlFor={`sub-${sub}`} className="text-sm cursor-pointer">{sub}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">{language === 'it' ? 'Città' : 'City'}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="country">{language === 'it' ? 'Paese' : 'Country'}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_online"
                checked={formData.is_online}
                onCheckedChange={(checked) => setFormData({ ...formData, is_online: checked })}
              />
              <Label htmlFor="is_online">{language === 'it' ? 'Disponibile Online' : 'Available Online'}</Label>
            </div>

            <div>
              <Label htmlFor="website_url">{language === 'it' ? 'Sito Web' : 'Website URL'}</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="contact_email">{language === 'it' ? 'Email di Contatto' : 'Contact Email'}</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="logo_url">{language === 'it' ? 'URL Logo' : 'Logo URL'}</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="requirements">{language === 'it' ? 'Requisiti' : 'Requirements'}</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">{language === 'it' ? 'Ente Attivo' : 'Active Provider'}</Label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                {editingProvider 
                  ? (language === 'it' ? 'Salva Modifiche' : 'Save Changes')
                  : (language === 'it' ? 'Aggiungi Ente' : 'Add Provider')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Logs Tab Component
function LogsTab({ language }: any) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase
      .from('pathways_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs(data || []);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'it' ? 'Log Attività' : 'Activity Logs'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="p-3 bg-muted rounded text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{log.action}</span>
                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              {log.target_type && (
                <p className="text-xs text-muted-foreground mt-1">
                  {log.target_type}: {log.target_id}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PathwaysAdminDashboard;
