import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Filter, Building, Upload, Download, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Partner {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  company_name: string | null;
  status: string;
  created_at: string;
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

export default function Partners() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState<{open: boolean; partner: Partner | null}>({ open: false, partner: null });
  const [uploadingContract, setUploadingContract] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [partnerContracts, setPartnerContracts] = useState<Record<string, PartnerDocument>>({});

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    filterPartners();
  }, [searchQuery, filterStatus, partners]);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "PARTNER")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPartners(data || []);
      
      // Fetch contracts for all partners
      if (data && data.length > 0) {
        const partnerIds = data.map(p => p.id);
        const { data: contracts, error: contractsError } = await supabase
          .from("partner_documents")
          .select("*")
          .eq("type", "contract")
          .in("partner_id", partnerIds);
        
        if (!contractsError && contracts) {
          const contractsMap: Record<string, PartnerDocument> = {};
          contracts.forEach(contract => {
            contractsMap[contract.partner_id] = contract;
          });
          setPartnerContracts(contractsMap);
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPartners = () => {
    let filtered = [...partners];

    if (searchQuery) {
      filtered = filtered.filter(
        (partner) =>
          partner.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          partner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          partner.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          partner.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((partner) => partner.status === filterStatus);
    }

    setFilteredPartners(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      approved: "default",
      pending: "secondary",
      rejected: "outline",
    };
    
    const labels: Record<string, string> = {
      approved: "Approvato",
      pending: "In attesa",
      rejected: "Rifiutato",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleUploadContract = async () => {
    if (!contractFile || !uploadDialog.partner) return;

    setUploadingContract(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No admin user found');

      // Check if partner already has a contract
      const existingContract = partnerContracts[uploadDialog.partner.id];
      
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
      const fileExt = contractFile.name.split('.').pop();
      const fileName = `${uploadDialog.partner.id}/contract_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('partner-documents')
        .upload(fileName, contractFile);

      if (uploadError) throw uploadError;

      // Save contract record in database
      const { error: dbError } = await supabase
        .from('partner_documents')
        .insert({
          partner_id: uploadDialog.partner.id,
          type: 'contract',
          filename: contractFile.name,
          storage_path: uploadData.path,
          mime_type: contractFile.type,
          size_bytes: contractFile.size,
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

      // Refresh partners and contracts
      fetchPartners();
      setUploadDialog({ open: false, partner: null });
      setContractFile(null);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingContract(false);
    }
  };

  const handleDownloadContract = async (partner: Partner) => {
    const contract = partnerContracts[partner.id];
    if (!contract || !contract.storage_path) {
      toast({
        title: "Errore",
        description: "Nessun contratto trovato",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('partner-documents')
        .download(contract.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = contract.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Errore download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPartnerDocuments = async (partner: Partner) => {
    try {
      // Fetch all documents uploaded by the partner
      const { data: documents, error } = await supabase
        .from('partner_documents')
        .select('*')
        .eq('partner_id', partner.id)
        .eq('type', 'document')
        .eq('uploaded_by', partner.id);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/admin")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Dashboard
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            Gestione Partner
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualizza e gestisci tutti i partner aziendali
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Cerca per nome, email o azienda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="approved">Approvati</SelectItem>
                  <SelectItem value="rejected">Rifiutati</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Partners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner) => {
            const hasContract = !!partnerContracts[partner.id];
            
            return (
              <Card key={partner.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{partner.company_name || "N/A"}</span>
                    {getStatusBadge(partner.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {partner.first_name} {partner.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{partner.email}</span>
                    </div>
                    {partner.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{partner.phone}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Registrato il {format(new Date(partner.created_at), "dd MMM yyyy", { locale: it })}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <div className="w-full flex gap-2">
                    <Button
                      size="sm"
                      variant={hasContract ? "outline" : "default"}
                      className="flex-1"
                      onClick={() => {
                        setUploadDialog({ open: true, partner });
                        setContractFile(null);
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {hasContract ? "Sostituisci" : "Carica"} Contratto
                    </Button>
                    {hasContract && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadContract(partner)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDownloadPartnerDocuments(partner)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Scarica Documenti Partner
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {filteredPartners.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterStatus !== "all"
                  ? "Nessun partner trovato con i filtri applicati"
                  : "Nessun partner registrato"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Contract Dialog */}
      <Dialog open={uploadDialog.open} onOpenChange={(open) => !uploadingContract && setUploadDialog({ open, partner: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {partnerContracts[uploadDialog.partner?.id || ''] ? 'Sostituisci' : 'Carica'} Contratto per {uploadDialog.partner?.company_name}
            </DialogTitle>
            <DialogDescription>
              Seleziona il file del contratto da caricare per questo partner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contract-file">File Contratto</Label>
              <Input
                id="contract-file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                disabled={uploadingContract}
              />
              <p className="text-xs text-muted-foreground mt-1">
                PDF o DOCX, massimo 10MB
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setUploadDialog({ open: false, partner: null })}
                disabled={uploadingContract}
              >
                Annulla
              </Button>
              <Button
                onClick={handleUploadContract}
                disabled={!contractFile || uploadingContract}
              >
                {uploadingContract && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {uploadingContract ? 'Caricamento...' : 'Carica Contratto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}