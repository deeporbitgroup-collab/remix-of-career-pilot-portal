import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Linkedin, Building2 } from "lucide-react";

interface Associate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  photo_url?: string;
  university?: string;
  university_2?: string;
  master_program?: string;
  sector?: string;
  sector_2?: string;
  cv_url?: string;
  linkedin_url?: string;
  company_name?: string;
  professional_experiences?: Array<{ sector?: string; company?: string; role?: string; period?: string }> | null;
}

const normalizeSectorName = (s: string): string => {
  const trimmed = (s || '').trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase() === 'audit') return 'Auditing';
  return trimmed;
};

const getAssociateSectors = (a: Partial<Associate>): string[] => {
  const out = new Set<string>();
  if (a.sector) {
    const n = normalizeSectorName(a.sector);
    if (n) out.add(n);
  }
  if (a.sector_2) {
    const n = normalizeSectorName(a.sector_2);
    if (n) out.add(n);
  }
  if (Array.isArray(a.professional_experiences)) {
    a.professional_experiences.forEach((exp) => {
      if (exp && exp.sector) {
        const n = normalizeSectorName(exp.sector);
        if (n) out.add(n);
      }
    });
  }
  return Array.from(out);
};

interface AssociateSelectorProps {
  service: any;
  clientId: string;
  onClose: () => void;
  onAddToCart?: () => void;
}

const AssociateSelector = ({ service, clientId, onClose, onAddToCart }: AssociateSelectorProps) => {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(false);
  const [university, setUniversity] = useState("");
  const [sector, setSector] = useState("");
  const [showAssociates, setShowAssociates] = useState(false);
  const [selectedAssociates, setSelectedAssociates] = useState<string[]>([]);

  useEffect(() => {
    console.log('AssociateSelector mounted with service:', service);
    if (!service.requires_associate) {
      // If no associate required, skip to adding to cart
      handleAddToCart(null);
    }
  }, []);

  const fetchAssociates = async () => {
    try {
      setLoading(true);
      
      // Build query for approved associates - select all required fields
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, photo_url, university, university_2, master_program, sector, sector_2, cv_url, linkedin_url, company_name, company_2, professional_experiences')
        .eq('role', 'ASSOCIATE')
        .eq('status', 'approved');

      // Apply university filter if required - check both university and university_2
      if (service.requires_university && university) {
        query = query.or(`university.ilike.%${university}%,university_2.ilike.%${university}%,master_program.ilike.%${university}%`);
      }

      // NOTE: sector filter is applied client-side below to also include
      // sectors declared inside professional_experiences (not only sector/sector_2).

      console.log('Fetching associates with filters:', {
        requires_university: service.requires_university,
        university,
        requires_sector: service.requires_sector,
        sector
      });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching associates:', error);
        throw error;
      }

      // Client-side sector filter across top-level sector/sector_2 + professional_experiences[].sector
      let filtered: any[] = data || [];
      if (service.requires_sector && sector) {
        const needle = normalizeSectorName(sector).toLowerCase();
        filtered = filtered.filter((a: any) => {
          const sectors = getAssociateSectors(a).map((s) => s.toLowerCase());
          // Strict: only match if the associate sector contains (or equals) the
          // requested needle. Do NOT match in the reverse direction, otherwise
          // "Real Estate Consulting" would also match associates with only "Consulting".
          return sectors.some((s) => s === needle || s.includes(needle));
        });
      }

      console.log('Fetched associates:', filtered);
      setAssociates(filtered);
      setShowAssociates(true);
    } catch (error: any) {
      console.error('Error fetching associates:', error);
      toast.error("Failed to load associates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (associateIds: string[]) => {
    try {
      const cartItems = associateIds.map(associateId => ({
        client_id: clientId,
        service_id: service.id,
        associate_id: associateId,
        university: university || null,
        sector: sector || null,
      }));

      const { error } = await supabase
        .from('client_cart')
        .insert(cartItems);

      if (error) throw error;

      toast.success(`${associateIds.length} associate(s) added to cart!`);
      onAddToCart?.();
      onClose();
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error(error.message || "Failed to add to cart");
    }
  };

  const toggleAssociateSelection = (associateId: string) => {
    setSelectedAssociates(prev => 
      prev.includes(associateId)
        ? prev.filter(id => id !== associateId)
        : [...prev, associateId]
    );
  };

  if (!service.requires_associate) {
    return null;
  }

  if (!showAssociates) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Your Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {service.requires_university && (
              <div>
                <Label>University / Master Program of Interest</Label>
                <Input
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g., Harvard, LSE"
                />
              </div>
            )}

            {service.requires_sector && (
              <div>
                <Label>Professional Sector of Interest</Label>
                <Input
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="e.g., Investment Banking, Consulting"
                />
              </div>
            )}

            <Button onClick={fetchAssociates} className="w-full" disabled={loading}>
              {loading ? "Loading..." : "Find Associates"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Associates ({selectedAssociates.length} selected)</DialogTitle>
        </DialogHeader>
        
        {associates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No associates found matching your criteria.</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {associates.map((associate) => {
                const isSelected = selectedAssociates.includes(associate.id);
                return (
                  <Card 
                    key={associate.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'border-primary border-2 bg-primary/5' : ''
                    }`}
                    onClick={() => toggleAssociateSelection(associate.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={associate.photo_url} alt={`${associate.first_name} ${associate.last_name}`} />
                          <AvatarFallback className="text-lg">{associate.first_name[0]}{associate.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-xl">{associate.first_name} {associate.last_name}</CardTitle>
                          <div className="flex flex-wrap gap-3 mt-3">
                            {(() => {
                              const companies = Array.from(new Set([
                                (associate as any).company_name,
                                (associate as any).company_2,
                                ...((associate as any).professional_experiences || []).map((e: any) => e?.company),
                              ].filter((c: any): c is string => !!c && String(c).trim() !== '')));
                              if (companies.length === 0) return null;
                              return (
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Company</span>
                                  <div className="flex flex-wrap gap-1">
                                    {companies.map((c) => (
                                      <Badge key={c} variant="default" className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {c}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            {associate.university && (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">University</span>
                                <Badge variant="secondary">
                                  {associate.university}
                                </Badge>
                              </div>
                            )}
                            {associate.master_program && (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Master</span>
                                <Badge variant="secondary">
                                  {associate.master_program}
                                </Badge>
                              </div>
                            )}
                            {(() => {
                              const sectors = getAssociateSectors(associate);
                              if (sectors.length === 0) return null;
                              return (
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Field of Work</span>
                                  <div className="flex flex-wrap gap-1">
                                    {sectors.map((s) => (
                                      <Badge key={s} variant="outline">{s}</Badge>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2">
                        {associate.cv_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(associate.cv_url, '_blank');
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download CV
                          </Button>
                        )}
                        {associate.linkedin_url && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={associate.linkedin_url.startsWith('http') ? associate.linkedin_url : `https://${associate.linkedin_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Linkedin className="h-4 w-4 mr-2" />
                              LinkedIn
                            </a>
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground text-center">
                        {isSelected ? '✓ Selected' : 'Click to select'}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background border-t mt-4 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => handleAddToCart(selectedAssociates)}
                disabled={selectedAssociates.length === 0}
                className="flex-1"
              >
                Add {selectedAssociates.length} Associate(s) to Cart
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssociateSelector;