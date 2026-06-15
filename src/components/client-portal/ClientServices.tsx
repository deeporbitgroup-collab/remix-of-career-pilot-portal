import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Plane, ArrowLeftRight, Briefcase, GraduationCap, Globe, Info } from "lucide-react";
import AssociateSelector from "./AssociateSelector";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const sb = supabase as any;

interface Service {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  requires_university: boolean;
  requires_sector: boolean;
}

interface ClientServicesProps {
  clientId: string;
  onAddToCart?: () => void;
}

const categoryIcons: Record<string, any> = {
  "Take Off": Plane,
  "Layover": ArrowLeftRight,
  "Altitude": Briefcase,
  "Summit": GraduationCap,
  "Additional Services": Globe,
};

const categorySubtitles: Record<string, string> = {
  "Take Off": "From High School to University",
  "Layover": "University Transfers",
  "Altitude": "Internship Placement",
  "Summit": "From University to Master Degree",
  "Additional Services": "Extra Services",
};

const categoryOrder = ["Take Off", "Layover", "Altitude", "Summit", "Additional Services"];

const ClientServices = ({ clientId, onAddToCart }: ClientServicesProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [infoService, setInfoService] = useState<Service | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await sb
        .from('client_services')
        .select('*')
        .order('category', { ascending: true })
        .order('price', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const groupedServices = useMemo(() => {
    return services.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {} as Record<string, Service[]>);
  }, [services]);

  // Sort categories according to specified order
  const sortedCategories = Object.keys(groupedServices).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return indexA - indexB;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Our Premium Services</CardTitle>
          <CardDescription>Choose the perfect service to advance your career</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-5 w-5" />
            <AlertDescription className="ml-2">
              <strong>How It Works:</strong> All these products are created by one of our Associates (a student from the university, master, or field of interest) and presented in a 1:1 online meeting. Each product is also downloadable as a PDF from your personal area.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Services by Category */}
      <div className="space-y-4">
      {sortedCategories.map((category) => {
          const Icon = categoryIcons[category] || Globe;
          const categoryServices = groupedServices[category];

          return (
            <Card key={category} className="backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
              <Accordion type="single" collapsible>
                <AccordionItem value={category} className="border-0">
                  <AccordionTrigger className="px-6 py-5 hover:no-underline bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20 transition-all">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6 text-primary" />
                      <div className="text-left">
                        <span className="font-bold text-xl text-primary">{category}</span>
                        <p className="text-sm font-medium text-foreground/80 mt-1">
                          {categorySubtitles[category]}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {categoryServices.length} {categoryServices.length === 1 ? 'service' : 'services'} available
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="grid gap-4 md:grid-cols-2">
                      {categoryServices.map((service) => (
                        <Card 
                          key={service.id} 
                          className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-xl hover:scale-105 duration-300"
                        >
                          <CardHeader>
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-2">{service.name}</CardTitle>
                                <CardDescription className="text-sm line-clamp-2">
                                  {service.description}
                                </CardDescription>
                              </div>
                              <Badge variant="secondary" className="text-lg font-bold whitespace-nowrap">
                                €{service.price.toFixed(2)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Button 
                              onClick={() => setInfoService(service)}
                              variant="outline"
                              className="w-full"
                            >
                              <Info className="h-4 w-4 mr-2" />
                              View Full Details
                            </Button>
                            <Button 
                              onClick={() => setSelectedService(service)}
                              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                            >
                              Select Service
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          );
        })}
      </div>

      {/* Service Info Dialog */}
      <Dialog open={!!infoService} onOpenChange={(open) => !open && setInfoService(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{infoService?.name}</DialogTitle>
            <DialogDescription className="text-lg font-semibold text-primary">
              €{infoService?.price.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-foreground whitespace-pre-line leading-relaxed">
              {infoService?.description}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Associate Selector Dialog */}
      {selectedService && (
        <AssociateSelector
          service={selectedService}
          clientId={clientId}
          onClose={() => setSelectedService(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
};

export default ClientServices;
