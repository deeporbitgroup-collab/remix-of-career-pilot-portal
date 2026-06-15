import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plane, ArrowLeftRight, Briefcase, GraduationCap, Globe, Info, ShoppingCart, Sparkles, Check, MessageCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AssociateSelector from "./AssociateSelector";
import ClientCart from "./ClientCart";
import { cn } from "@/lib/utils";

const sb = supabase as any;

const WHATSAPP_URL = "https://wa.me/447826932893";

// These services don't have a fixed price — users contact the team via WhatsApp
const CONTACT_ONLY_SERVICES = ["Talent Pool", "Pathways", "Job Updates Hub"];

// Maps contact-only services to their platform/destination URL
const PLATFORM_URLS: Record<string, string> = {
  "Talent Pool": "/talent-pool",
  "Pathways": "/platforms/pathways",
  "Job Updates Hub": "https://wa.me/447826932893",
};

interface Service {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  requires_university: boolean;
  requires_sector: boolean;
}

interface BookMoreServicesProps {
  clientId: string;
  clientName: string;
  onCartUpdate?: () => void;
}

type CategoryKey = "Take Off" | "Layover" | "Summit" | "Altitude" | "Additional Services";

const categoryMeta: Record<CategoryKey, {
  icon: any;
  shortLabel: string;
  subtitle: string;
  description: string;
  gradient: string;
  accent: string;
}> = {
  "Take Off": {
    icon: Plane,
    shortLabel: "Highschool to Uni",
    subtitle: "From High School to University",
    description: "Plan your university journey with confidence — applications, choices, strategy.",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
    accent: "text-sky-600 dark:text-sky-400",
  },
  "Layover": {
    icon: ArrowLeftRight,
    shortLabel: "Transfer",
    subtitle: "University Transfers",
    description: "Switch universities the smart way — strategy, paperwork, and timing.",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    accent: "text-amber-600 dark:text-amber-400",
  },
  "Summit": {
    icon: GraduationCap,
    shortLabel: "Uni to Master",
    subtitle: "From University to Master Degree",
    description: "Reach top Master programs with personal guidance and insider insights.",
    gradient: "from-violet-500/20 via-violet-500/5 to-transparent",
    accent: "text-violet-600 dark:text-violet-400",
  },
  "Altitude": {
    icon: Briefcase,
    shortLabel: "Internship Placement",
    subtitle: "Internship Placement",
    description: "Land internships at companies you actually want to work at.",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  "Additional Services": {
    icon: Globe,
    shortLabel: "Extras",
    subtitle: "Extra Services",
    description: "Boost your journey with focused add-ons and expert sessions.",
    gradient: "from-slate-500/20 via-slate-500/5 to-transparent",
    accent: "text-slate-600 dark:text-slate-400",
  },
};

const filterCategories: CategoryKey[] = ["Take Off", "Layover", "Summit", "Altitude", "Additional Services"];

const BookMoreServices = ({ clientId, clientName, onCartUpdate }: BookMoreServicesProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [infoService, setInfoService] = useState<Service | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CategoryKey>("Take Off");

  useEffect(() => {
    fetchServices();
    fetchCartCount();
  }, [clientId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await sb
        .from('client_services')
        .select('*')
        .neq('name', 'Additional Call with Associate')
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

  const fetchCartCount = async () => {
    try {
      const { count } = await sb
        .from('client_cart')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
      setCartCount(count || 0);
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  const handleAddToCart = () => {
    fetchCartCount();
    onCartUpdate?.();
  };

  const groupedServices = useMemo(() => {
    return services.reduce((acc, service) => {
      if (!acc[service.category]) acc[service.category] = [];
      acc[service.category].push(service);
      return acc;
    }, {} as Record<string, Service[]>);
  }, [services]);

  const filteredServices = groupedServices[activeFilter] || [];

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeMeta = categoryMeta[activeFilter];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg border-primary/20 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">Book More Services</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Pick a journey, choose a service, and get matched with the right Associate.
                  </CardDescription>
                </div>
              </div>
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative shrink-0">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Your Cart</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <ClientCart
                      clientId={clientId}
                      clientName={clientName}
                      onCartUpdate={() => {
                        fetchCartCount();
                        onCartUpdate?.();
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardHeader>
        </div>
        <CardContent className="pt-6">
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-5 w-5" />
            <AlertDescription className="ml-2">
              <strong>How it works:</strong> All services are delivered by one of our Associates in a 1:1 online meeting and include a downloadable PDF.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Category filter pills */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {filterCategories.map((cat) => {
          const meta = categoryMeta[cat];
          const Icon = meta.icon;
          const isActive = activeFilter === cat;
          const count = (groupedServices[cat] || []).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={cn(
                "group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-300",
                "backdrop-blur-sm bg-background/90 shadow-md hover:shadow-xl hover:-translate-y-0.5",
                isActive
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", meta.gradient)} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-2 rounded-lg bg-background/80", meta.accent)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {isActive && (
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <h3 className={cn("font-bold text-sm md:text-base", isActive && "text-primary")}>
                  {meta.shortLabel}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {count} {count === 1 ? "service" : "services"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active category details */}
      <Card className="backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
        <div className={cn("bg-gradient-to-r p-6 border-b border-border", activeMeta.gradient)}>
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-xl bg-background/80", activeMeta.accent)}>
              <activeMeta.icon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{activeMeta.subtitle}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{activeMeta.description}</p>
            </div>
          </div>
        </div>
        <CardContent className="pt-6">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Info className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No services available in this category yet.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  accent={activeMeta.accent}
                  gradient={activeMeta.gradient}
                  onInfo={() => setInfoService(service)}
                  onSelect={() => setSelectedService(service)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Services now appears as a 5th filter button above */}

      {/* Service Info Dialog */}
      <Dialog open={!!infoService} onOpenChange={(open) => !open && setInfoService(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{infoService?.name}</DialogTitle>
            <DialogDescription className="text-lg font-semibold text-primary">
              {infoService && CONTACT_ONLY_SERVICES.includes(infoService.name)
                ? "Contact us on WhatsApp for details"
                : `€${infoService?.price.toFixed(2)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-foreground whitespace-pre-line leading-relaxed">
              {infoService?.description}
            </p>
            {infoService && CONTACT_ONLY_SERVICES.includes(infoService.name) && (
              <Button
                asChild
                className="w-full bg-[#25D366] hover:bg-[#1ea952] text-white"
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat with our team on WhatsApp
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Associate Selector Dialog */}
      {selectedService && (
        <AssociateSelector
          service={selectedService}
          clientId={clientId}
          onClose={() => setSelectedService(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
};

interface ServiceCardProps {
  service: Service;
  accent: string;
  gradient: string;
  onInfo: () => void;
  onSelect: () => void;
}


const ServiceCard = ({ service, accent, gradient, onInfo, onSelect }: ServiceCardProps) => {
  const isContactOnly = CONTACT_ONLY_SERVICES.includes(service.name);

  return (
    <Card className="group relative overflow-hidden border-2 border-border hover:border-primary/50 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300 flex flex-col">
      {/* Decorative gradient backdrop */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-70 transition-opacity", gradient)} />

      {/* Price ribbon / contact badge */}
      <div className="absolute top-4 right-4 z-10">
        {isContactOnly ? (
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#1ea952] text-white rounded-full px-3 py-1.5 shadow-md text-xs font-bold transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Contact us 💬
          </a>
        ) : (
          <div className="bg-background/95 backdrop-blur-sm border border-primary/20 rounded-full px-3 py-1.5 shadow-md">
            <span className={cn("text-lg font-extrabold", accent)}>€{service.price.toFixed(0)}</span>
          </div>
        )}
      </div>

      <CardHeader className="relative flex-1 pr-24">
        <CardTitle className="text-lg leading-tight">{service.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-3 mt-2">
          {service.description}
        </CardDescription>

        {/* Highlights */}
        <ul className="mt-4 space-y-1.5">
          {isContactOnly ? (
            <>
              <li className="flex items-center gap-2 text-xs text-foreground/80">
                <div className={cn("h-4 w-4 rounded-full bg-background/80 flex items-center justify-center shrink-0", accent)}>
                  <Check className="h-3 w-3" />
                </div>
                <span>Tailored to your profile and goals</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-foreground/80">
                <div className={cn("h-4 w-4 rounded-full bg-background/80 flex items-center justify-center shrink-0", accent)}>
                  <Check className="h-3 w-3" />
                </div>
                <span>Direct line with the Career Pilot team</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-foreground/80">
                <div className={cn("h-4 w-4 rounded-full bg-background/80 flex items-center justify-center shrink-0", accent)}>
                  <Check className="h-3 w-3" />
                </div>
                <span>Fast reply on WhatsApp</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-2 text-xs text-foreground/80">
                <div className={cn("h-4 w-4 rounded-full bg-background/80 flex items-center justify-center shrink-0", accent)}>
                  <Check className="h-3 w-3" />
                </div>
                <span>1:1 online meeting with an Associate</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-foreground/80">
                <div className={cn("h-4 w-4 rounded-full bg-background/80 flex items-center justify-center shrink-0", accent)}>
                  <Check className="h-3 w-3" />
                </div>
                <span>Personalized PDF deliverable</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-foreground/80">
                <div className={cn("h-4 w-4 rounded-full bg-background/80 flex items-center justify-center shrink-0", accent)}>
                  <Check className="h-3 w-3" />
                </div>
                <span>Insider tips from real students</span>
              </li>
            </>
          )}
        </ul>
      </CardHeader>

      <CardContent className="relative space-y-2 pt-0">
        <Button
          onClick={onInfo}
          variant="outline"
          size="sm"
          className="w-full bg-background/80 backdrop-blur-sm"
        >
          <Info className="h-4 w-4 mr-2" />
          View Full Details
        </Button>
        {isContactOnly ? (
          <Button
            asChild
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md group-hover:shadow-lg"
          >
            <a
              href={PLATFORM_URLS[service.name]}
              {...(PLATFORM_URLS[service.name].startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Go to Platform
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        ) : (
          <Button
            onClick={onSelect}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md group-hover:shadow-lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Select & Book
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default BookMoreServices;
