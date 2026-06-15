import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePathwaysAuth } from '@/contexts/PathwaysAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { Upload, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

const PathwaysAccount = () => {
  const navigate = useNavigate();
  const { user, logout } = usePathwaysAuth();
  const { language, t } = useI18n();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/platforms/pathways');
      return;
    }
    loadReceipts();
  }, [user, navigate]);

  const loadReceipts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pathways_payment_receipts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setReceipts(data || []);
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const file = formData.get('file') as File;

    if (!file) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: language === 'it' ? 'Seleziona un file' : 'Select a file',
      });
      setUploading(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: language === 'it' ? 'Il file non può superare 10MB' : 'File cannot exceed 10MB',
      });
      setUploading(false);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!fileExt || !allowedExts.includes(fileExt.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: language === 'it' ? 'Formato file non valido (solo jpg, png, pdf)' : 'Invalid file format (only jpg, png, pdf)',
      });
      setUploading(false);
      return;
    }

    const filePath = `${user!.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('pathways-receipts')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore caricamento' : 'Upload error',
        description: uploadError.message,
      });
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from('pathways_payment_receipts').insert({
      user_id: user!.id,
      file_url: filePath,
      notes: formData.get('notes') as string,
    });

    if (insertError) {
      toast({
        variant: 'destructive',
        title: language === 'it' ? 'Errore' : 'Error',
        description: insertError.message,
      });
      setUploading(false);
      return;
    }

    // Send email notifications
    await supabase.functions.invoke('send-pathways-receipt-upload', {
      body: {
        studentEmail: user!.email,
        studentName: `${user!.first_name || ''} ${user!.last_name || ''}`.trim() || user!.email,
        fileName: file.name,
        notes: formData.get('notes') as string || undefined,
      },
    });

    // Update user status to payment_uploaded
    await supabase
      .from('pathways_users')
      .update({ status: 'payment_uploaded' })
      .eq('id', user!.id);

    toast({
      title: language === 'it' ? 'Ricevuta caricata' : 'Receipt uploaded',
      description: language === 'it' ? 'La tua ricevuta è in fase di verifica' : 'Your receipt is being verified',
    });

    setUploading(false);
    window.location.reload();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'payment_uploaded':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case 'admitted_to_payment':
        return <AlertCircle className="h-8 w-8 text-blue-500" />;
      case 'revoked':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Clock className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    if (language === 'it') {
      switch (status) {
        case 'registered':
          return 'Registrato - In attesa di valutazione';
        case 'admitted_to_payment':
          return 'Ammesso al pagamento';
        case 'payment_uploaded':
          return 'Pagamento in revisione';
        case 'active':
          return 'Accesso attivo';
        case 'revoked':
          return 'Accesso revocato';
        default:
          return status;
      }
    } else {
      switch (status) {
        case 'registered':
          return 'Registered - Pending evaluation';
        case 'admitted_to_payment':
          return 'Admitted to payment';
        case 'payment_uploaded':
          return 'Payment under review';
        case 'active':
          return 'Active access';
        case 'revoked':
          return 'Access revoked';
        default:
          return status;
      }
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Header with Logout */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                logout();
                navigate('/platforms/pathways');
              }}
            >
              ← {language === 'it' ? 'Indietro' : 'Back'}
            </Button>
            <div className="h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              {user.first_name} {user.last_name}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              logout();
              navigate('/platforms/pathways');
            }}
          >
            {language === 'it' ? 'Esci' : 'Logout'}
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'it' ? 'Il tuo Account Pathways' : 'Your Pathways Account'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'it' ? 'Gestisci il tuo accesso alla piattaforma' : 'Manage your platform access'}
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getStatusIcon(user.status)}
              {language === 'it' ? 'Stato Account' : 'Account Status'}
            </CardTitle>
            <CardDescription className="text-lg font-medium">
              {getStatusText(user.status)}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Payment Instructions */}
        {user.status === 'admitted_to_payment' && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle>{language === 'it' ? 'Istruzioni per il Bonifico' : 'Bank Transfer Instructions'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg space-y-2">
                <div>
                  <Label className="text-sm text-muted-foreground">{language === 'it' ? 'Beneficiario' : 'Beneficiary'}</Label>
                  <p className="font-semibold">Eric Petersen</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{language === 'it' ? 'Riferimento' : 'Reference'}</Label>
                  <p className="font-semibold">22324242</p>
                </div>
              </div>
              
              <form onSubmit={handleUploadReceipt} className="space-y-4">
                <div>
                  <Label htmlFor="file">
                    {language === 'it' ? 'Carica ricevuta (jpg, png, pdf - max 10MB)' : 'Upload receipt (jpg, png, pdf - max 10MB)'}
                  </Label>
                  <Input id="file" name="file" type="file" accept=".jpg,.jpeg,.png,.pdf" required />
                </div>
                <div>
                  <Label htmlFor="notes">{language === 'it' ? 'Note (opzionale)' : 'Notes (optional)'}</Label>
                  <Input id="notes" name="notes" placeholder={language === 'it' ? 'Aggiungi note...' : 'Add notes...'} />
                </div>
                <Button type="submit" disabled={uploading} className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? (language === 'it' ? 'Caricamento...' : 'Uploading...') : (language === 'it' ? 'Carica ricevuta' : 'Upload receipt')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Active Access */}
        {user.status === 'active' && (
          <Card className="mb-6 border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <Button onClick={() => navigate('/platforms/pathways/catalog')} className="w-full" size="lg">
                {language === 'it' ? 'Vai al Catalogo Opportunità' : 'Go to Opportunities Catalog'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Receipts History */}
        {receipts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'it' ? 'Storico Ricevute' : 'Receipts History'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="p-3 bg-muted rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(receipt.uploaded_at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US')}
                      </p>
                      {receipt.notes && <p className="text-xs text-muted-foreground">{receipt.notes}</p>}
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PathwaysAccount;
