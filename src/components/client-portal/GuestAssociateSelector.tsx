import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Linkedin, ShoppingCart, FileText } from "lucide-react";
import AssociateChoiceCarousel from "./AssociateChoiceCarousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  company_2?: string;
  overview_url?: string;
  cv_storage_path?: string; // CV from documents table
  professional_experiences?: Array<{ sector?: string; company?: string; role?: string; period?: string }> | null;
}

// Normalize sector names (unify "Audit" -> "Auditing") - module-level so it can be reused
const normalizeSectorName = (s: string): string => {
  const trimmed = (s || '').trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase() === 'audit') return 'Auditing';
  return trimmed;
};

// Collect all sectors declared by an associate: top-level sector / sector_2
// AND every sector listed inside their professional_experiences.
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

interface Service {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  requires_university: boolean;
  requires_sector: boolean;
  requires_associate: boolean;
}

interface GuestCartItem {
  id: string;
  service: Service;
  associate?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  // For comparative services, store both associates separately
  associates?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    university?: string;
    master_program?: string;
  }>;
  university?: string;
  university2?: string;
  sector?: string;
}

interface GuestAssociateSelectorProps {
  service: Service;
  onClose: () => void;
  onAddToCart: (item: GuestCartItem) => void;
}

const GuestAssociateSelector = ({ service, onClose, onAddToCart }: GuestAssociateSelectorProps) => {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [allAssociates, setAllAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(false);
  const [university, setUniversity] = useState("");
  const [university2, setUniversity2] = useState(""); // Second university for Comparative services
  const [sector, setSector] = useState("");
  const [showAssociates, setShowAssociates] = useState(false);
  const [selectedAssociates, setSelectedAssociates] = useState<Associate[]>([]);

  // Check if this is a Comparative service (requires exactly 2 associates, price includes both)
  const isComparativeService = service.name.toLowerCase().includes('comparative');

  // Fetch all associates on mount to get available universities, masters, sectors, and companies
  useEffect(() => {
    const fetchAllAssociates = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('university, university_2, master_program, sector, sector_2, company_name, company_2, professional_experiences')
        .eq('role', 'ASSOCIATE')
        .eq('status', 'approved');
      
      if (data) {
        setAllAssociates(data as Associate[]);
      }
    };
    fetchAllAssociates();
  }, []);

  // Check if this is a Summit service (filter by master) or Take Off service (filter by university)
  const isSummitService = service.category === 'Summit';
  const isTakeOffService = service.category === 'Take Off';
  const isLayoverService = service.name.toLowerCase().includes('layover');

  // Extract unique universities for autocomplete (include both university and university_2 for transfers)
  const availableUniversities = useMemo(() => {
    const unisMap = new Map<string, string>();
    allAssociates.forEach(a => {
      if (a.university) {
        const key = a.university.toLowerCase().trim();
        if (!unisMap.has(key)) unisMap.set(key, a.university.trim());
      }
      // Include university_2 (transfer origin) in the list
      if (a.university_2) {
        const key = a.university_2.toLowerCase().trim();
        if (!unisMap.has(key)) unisMap.set(key, a.university_2.trim());
      }
    });
    return Array.from(unisMap.values()).sort((a, b) => a.localeCompare(b));
  }, [allAssociates]);

  // Extract unique master programs for autocomplete (for Summit services)
  const availableMasterPrograms = useMemo(() => {
    const mastersMap = new Map<string, string>();
    allAssociates.forEach(a => {
      if (a.master_program) {
        const key = a.master_program.toLowerCase().trim();
        if (!mastersMap.has(key)) mastersMap.set(key, a.master_program.trim());
      }
    });
    return Array.from(mastersMap.values()).sort((a, b) => a.localeCompare(b));
  }, [allAssociates]);

  // Helper to normalize sector names (unify "Audit" -> "Auditing")
  const normalizeSector = normalizeSectorName;

  const availableSectors = useMemo(() => {
    const sectorsMap = new Map<string, string>();
    allAssociates.forEach(a => {
      // Include top-level + every sector declared in professional_experiences
      getAssociateSectors(a).forEach((s) => {
        const key = s.toLowerCase();
        if (!sectorsMap.has(key)) sectorsMap.set(key, s);
      });
    });
    return Array.from(sectorsMap.values()).sort((a, b) => a.localeCompare(b));
  }, [allAssociates]);

  useEffect(() => {
    if (!service.requires_associate) {
      const cartItem: GuestCartItem = {
        id: `${service.id}-${Date.now()}`,
        service,
        associate: null,
        university: undefined,
        sector: undefined,
      };
      onAddToCart(cartItem);
    }
  }, []);

  const fetchAssociates = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, photo_url, university, university_2, master_program, sector, sector_2, cv_url, linkedin_url, company_name, company_2, overview_url, professional_experiences')
        .eq('role', 'ASSOCIATE')
        .eq('status', 'approved');

      if (service.requires_university) {
        // For Comparative services: filter by either of the two universities (check both university and university_2)
        if (isComparativeService && university && university2) {
          if (isTakeOffService) {
            query = query.or(`university.ilike.%${university}%,university_2.ilike.%${university}%,university.ilike.%${university2}%,university_2.ilike.%${university2}%`);
          } else if (isSummitService) {
            query = query.or(`master_program.ilike.%${university}%,master_program.ilike.%${university2}%`);
          } else {
            query = query.or(`university.ilike.%${university}%,university_2.ilike.%${university}%,university.ilike.%${university2}%,university_2.ilike.%${university2}%,master_program.ilike.%${university}%,master_program.ilike.%${university2}%`);
          }
        } else if (university) {
          // Standard single university filter - check both university and university_2
          if (isTakeOffService) {
            query = query.or(`university.ilike.%${university}%,university_2.ilike.%${university}%`);
          } else if (isSummitService) {
            query = query.ilike('master_program', `%${university}%`);
          } else {
            query = query.or(`university.ilike.%${university}%,university_2.ilike.%${university}%,master_program.ilike.%${university}%`);
          }
        }
      }

      // NOTE: sector filter is applied client-side below so we can include
      // sectors declared inside professional_experiences (not just sector / sector_2).

      const { data, error } = await query;

      if (error) throw error;

      // Client-side sector filtering: match against top-level sector / sector_2
      // AND any sector inside the associate's professional_experiences.
      let filtered = data || [];
      if (service.requires_sector && sector) {
        const needle = normalizeSectorName(sector).toLowerCase();
        filtered = filtered.filter((a: any) => {
          const sectors = getAssociateSectors(a).map((s) => s.toLowerCase());
          // Strict match: the associate must have declared the requested sector.
          // We allow substring only in the direction "associate sector contains the
          // requested needle" (e.g. "Real Estate Consulting - EMEA" matches
          // "Real Estate Consulting"), but NOT the reverse, otherwise searching
          // "Real Estate Consulting" would also match associates with only "Consulting".
          return sectors.some((s) => s === needle || s.includes(needle));
        });
      }

      // For associates without overview, fetch their CV from documents table
      const associatesWithCvPaths = await Promise.all(
        filtered.map(async (associate: any) => {
          if (!associate.overview_url) {
            // Fetch CV storage path from documents table
            const { data: cvDoc } = await supabase
              .from('documents')
              .select('storage_path')
              .eq('user_id', associate.id)
              .eq('type', 'CV')
              .order('version', { ascending: false })
              .limit(1)
              .single();
            
            return {
              ...associate,
              cv_storage_path: cvDoc?.storage_path || null,
            };
          }
          return associate;
        })
      );
      
      setAssociates(associatesWithCvPaths);
      setShowAssociates(true);
    } catch (error: any) {
      console.error('Error fetching associates:', error);
      toast.error("Failed to load associates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadUrlAsFile = async (url: string) => {
    const fileNameFromUrl = (() => {
      try {
        const u = new URL(url);
        const last = u.pathname.split('/').filter(Boolean).pop();
        return decodeURIComponent(last || 'overview.pdf');
      } catch {
        return 'overview.pdf';
      }
    })();

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileNameFromUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(objectUrl);
  };

  const handleDownloadDocument = async (e: React.MouseEvent, associate: Associate) => {
    e.stopPropagation();

    // Priority: overview_url > cv_storage_path (from documents table)
    const hasOverview = !!associate.overview_url;
    const hasCvStoragePath = !!associate.cv_storage_path;
    
    if (!hasOverview && !hasCvStoragePath) return;

    try {
      if (hasOverview) {
        // Check if it's a public bucket URL (associate-overviews)
        if (associate.overview_url!.includes('/associate-overviews/')) {
          await downloadUrlAsFile(associate.overview_url!);
          return;
        }

        // For legacy overviews in private 'documents' bucket, use edge function
        const { data, error } = await supabase.functions.invoke('get-associate-overview-url', {
          body: { associateId: associate.id, type: 'overview' },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('Missing document URL');

        await downloadUrlAsFile(data.url);
        return;
      }

      // Fallback: download CV via edge function (handles signed URL generation)
      if (hasCvStoragePath) {
        const { data, error } = await supabase.functions.invoke('get-associate-overview-url', {
          body: { associateId: associate.id, type: 'cv' },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('Failed to get CV download URL');

        await downloadUrlAsFile(data.url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDownloadCV = async (e: React.MouseEvent, associate: Associate) => {
    e.stopPropagation();
    
    if (!associate.cv_url) return;
    
    try {
      // Get public URL from storage
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(associate.cv_url);
      
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading CV:', error);
      toast.error("Failed to download CV");
    }
  };

  const handleAddToCart = () => {
    if (isComparativeService) {
      // A comparative service/add-on always compares two options, so it REQUIRES a
      // second associate (from the other university). Hard-guard the cart so it can
      // never be added with fewer than two, regardless of UI state.
      if (selectedAssociates.length !== 2) {
        toast.info("Comparative requires exactly 2 associates — please pick a second one.");
        return;
      }
      // For Comparative services: add as single item with both associates stored correctly
      const cartItem: GuestCartItem = {
        id: `${service.id}-comparative-${Date.now()}`,
        service,
        // Store full name correctly for display
        associate: {
          id: selectedAssociates.map(a => a.id).join(','),
          first_name: `${selectedAssociates[0].first_name} ${selectedAssociates[0].last_name}`,
          last_name: `${selectedAssociates[1].first_name} ${selectedAssociates[1].last_name}`,
        },
        // Store both associates separately with their full details
        associates: selectedAssociates.map(a => ({
          id: a.id,
          first_name: a.first_name,
          last_name: a.last_name,
          university: a.university,
          master_program: a.master_program,
        })),
        university: university || undefined,
        university2: university2 || undefined,
        sector: sector || undefined,
      };
      onAddToCart(cartItem);
    } else {
      // Standard behavior: add each associate as separate item
      selectedAssociates.forEach(associate => {
        const cartItem: GuestCartItem = {
          id: `${service.id}-${associate.id}-${Date.now()}`,
          service,
          associate: {
            id: associate.id,
            first_name: associate.first_name,
            last_name: associate.last_name,
          },
          university: associate.university || university || undefined,
          sector: sector || undefined,
        };
        onAddToCart(cartItem);
      });
    }
    onClose();
  };

  const toggleAssociateSelection = (associate: Associate) => {
    setSelectedAssociates(prev => {
      const isAlreadySelected = prev.find(a => a.id === associate.id);
      if (isAlreadySelected) {
        return prev.filter(a => a.id !== associate.id);
      }
      // For Comparative services: limit to 2 associates
      if (isComparativeService && prev.length >= 2) {
        toast.info("Comparative service requires exactly 2 associates. Deselect one first.");
        return prev;
      }
      return [...prev, associate];
    });
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
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-muted-foreground">€{service.price.toFixed(2)}</p>
            </div>
            
            {service.requires_university && (
              <>
                <div className="space-y-2">
                  <Label>
                    {isComparativeService 
                      ? "First University of Interest"
                      : isSummitService 
                        ? "Master Program of Interest" 
                        : isTakeOffService 
                          ? "University of Interest"
                          : "University / Master Program of Interest"}
                  </Label>
                  <Select value={university} onValueChange={setUniversity}>
                    <SelectTrigger>
                      <SelectValue placeholder={isSummitService ? "Select a master program" : "Select a university"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(isSummitService ? availableMasterPrograms : availableUniversities).map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Second university field for Comparative services */}
                {isComparativeService && (
                  <div className="space-y-2">
                    <Label>Second University of Interest</Label>
                    <Select value={university2} onValueChange={setUniversity2}>
                      <SelectTrigger>
                        <SelectValue placeholder={isSummitService ? "Select a second program" : "Select a second university"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(isSummitService ? availableMasterPrograms : availableUniversities)
                          .filter((u) => u.toLowerCase() !== university.toLowerCase())
                          .map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {university && university2 && university.toLowerCase() === university2.toLowerCase() && (
                      <p className="text-sm text-destructive">Please select two different universities</p>
                    )}
                  </div>
                )}
              </>
            )}

            {service.requires_sector && (
              <div className="space-y-2">
                <Label>Professional Sector of Interest</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sector" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {availableSectors.map((sec) => (
                      <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              onClick={fetchAssociates} 
              className="w-full" 
              disabled={loading || (isComparativeService && (!university || !university2 || university.toLowerCase() === university2.toLowerCase()))}
            >
              {loading ? "Loading..." : "Find Associates"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isComparativeService ? "Choose 2 Associates to Compare" : "Choose your Associate"}
          </DialogTitle>
          {isComparativeService ? (
            <p className="text-sm text-muted-foreground">
              This service includes 2 associates in the price of €{service.price.toFixed(2)} ·{" "}
              {selectedAssociates.length}/2 selected
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selectedAssociates.length > 0
                ? `${selectedAssociates.length} selected · tap a card to add or remove`
                : "Meet the people who can guide you — tap a card to choose."}
            </p>
          )}
        </DialogHeader>

        {associates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No associates found matching your criteria.</p>
            <Button onClick={() => setShowAssociates(false)} className="mt-4" variant="outline">
              Try Different Criteria
            </Button>
            <Button onClick={onClose} className="mt-4 ml-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <AssociateChoiceCarousel
              associates={associates}
              isSelected={(a) => !!selectedAssociates.find((s) => s.id === a.id)}
              onToggle={(a) => toggleAssociateSelection(a as Associate)}
              getSectors={(a) => getAssociateSectors(a as Associate)}
              highlightCard={(a) => isLayoverService && !!a.university_2}
              renderActions={(a) => {
                const associate = a as Associate;
                return (
                  <>
                    {(associate.overview_url || associate.cv_storage_path) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => handleDownloadDocument(e, associate)}
                      >
                        {associate.overview_url ? (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Overview
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            CV
                          </>
                        )}
                      </Button>
                    )}
                    {associate.linkedin_url && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <a
                          href={associate.linkedin_url.startsWith("http") ? associate.linkedin_url : `https://${associate.linkedin_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                  </>
                );
              }}
            />
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background border-t mt-4 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleAddToCart}
                disabled={isComparativeService ? selectedAssociates.length !== 2 : selectedAssociates.length === 0}
                className="flex-1"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {isComparativeService 
                  ? `Add Comparison to Cart` 
                  : `Add ${selectedAssociates.length} to Cart`
                }
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GuestAssociateSelector;
