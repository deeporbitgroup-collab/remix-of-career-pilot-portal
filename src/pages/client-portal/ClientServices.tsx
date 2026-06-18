import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plane, ArrowLeftRight, Briefcase, GraduationCap, Globe, Info, ShoppingCart, ArrowLeft, User, FileText, Users, BookOpen, MessageCircle, Sparkles, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import bgImage from "@/assets/client-portal-bg.jpeg";
import GuestAssociateSelector from "@/components/client-portal/GuestAssociateSelector";
import GuestCart from "@/components/client-portal/GuestCart";
import PackageExperience, { ClientPackage, PackageComponent } from "@/components/client-portal/PackageExperience";
import JobHubFormDialog from "@/components/JobHubFormDialog";
import PilotAdvisor from "@/components/client-portal/PilotAdvisor";
import BookingPopup from "@/components/BookingPopup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Service background images
import bgAssociateOfficeHours from "@/assets/service-bg/associate-office-hours.jpeg";
import bgCareerInsight from "@/assets/service-bg/career-insight.jpeg";
import bgCareerBoost from "@/assets/service-bg/careerboost.png";
import bgOutreachPowerPack from "@/assets/service-bg/outreach-power-pack.webp";
import bgTalentPool from "@/assets/service-bg/talent-pool.webp";
import bgJobUpdatesHub from "@/assets/service-bg/job-updates-hub.png";
import bgPathways from "@/assets/service-bg/pathways.avif";
import bgKnowledgeBase1 from "@/assets/service-bg/knowledge-base-1.png";
import bgKnowledgeBase2 from "@/assets/service-bg/knowledge-base-2.png";
import bgCvCoverLetter from "@/assets/service-bg/cv-cover-letter.png";
import bgUniversityEligibility from "@/assets/service-bg/university-eligibility.png";
const sb = supabase as any;

// Associate type for avatar previews
interface AssociatePreview {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string | null;
  university?: string | null;
  university_2?: string | null;
  master_program?: string | null;
  sector?: string | null;
  sector_2?: string | null;
  company_name?: string | null;
  company_2?: string | null;
  linkedin_url?: string | null;
  overview_url?: string | null;
}

// Service-specific background images (single bg)
const serviceBgImages: Record<string, string> = {
  "Associate Office Hours": bgAssociateOfficeHours,
  "Expert Career Session": bgAssociateOfficeHours,
  "Career Insights": bgCareerInsight,
  "Masterclass Managed by CareerBoost": bgCareerBoost,
  "Outreach Power Pack — Pay Per Interview": bgOutreachPowerPack,
  "Talent Pool": bgTalentPool,
  "Job Updates Hub": bgJobUpdatesHub,
  "Pathways": bgPathways,
  "CV / Cover Letter Rewrite": bgCvCoverLetter,
  "CV Rewriting / Cover Letter Rewriting": bgCvCoverLetter,
  "University Eligibility Verification": bgUniversityEligibility,
};

// Services that show TWO side-by-side images
const serviceDualImages: Record<string, [string, string]> = {
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
  university?: string;
  sector?: string;
  specificRequest?: string;
  packageGroupId?: string;
  packageName?: string;
  packageRole?: "component" | "addon";
}

// Verticals that are sold as fixed-price packages.
const PACKAGE_CATEGORIES = ["Take Off", "Summit", "Altitude", "Layover"];
const TAKE_OFF_PACKAGE_PRICE = 350;

/** Ensure non–add-on component internal prices sum to each package's fixed price. */
function normalizePackagePricing(
  packages: ClientPackage[],
  components: PackageComponent[]
): { packages: ClientPackage[]; components: PackageComponent[] } {
  const packagesOut = packages.map((p) =>
    p.category === "Take Off" ? { ...p, price: TAKE_OFF_PACKAGE_PRICE } : { ...p }
  );
  const componentsOut = components.map((c) => ({ ...c }));

  for (const pkg of packagesOut) {
    const core = componentsOut.filter((c) => c.package_id === pkg.id && !c.is_addon);
    if (!core.length) continue;

    const target = Number(pkg.price);
    let coreSum = core.reduce((s, c) => s + Number(c.internal_price) * c.quantity, 0);
    if (coreSum <= 0 || Math.abs(coreSum - target) < 0.01) continue;

    const factor = target / coreSum;
    for (const c of componentsOut) {
      if (c.package_id === pkg.id && !c.is_addon) {
        c.internal_price = Number(c.internal_price) * factor;
      }
    }

    coreSum = componentsOut
      .filter((c) => c.package_id === pkg.id && !c.is_addon)
      .reduce((s, c) => s + Number(c.internal_price) * c.quantity, 0);
    const diff = target - coreSum;
    if (Math.abs(diff) >= 0.01) {
      const anchor = [...core].sort(
        (a, b) => Number(a.is_removable) - Number(b.is_removable) || a.sort_order - b.sort_order
      )[0];
      const idx = componentsOut.findIndex((c) => c.id === anchor.id);
      if (idx >= 0) {
        componentsOut[idx].internal_price =
          Number(componentsOut[idx].internal_price) + diff / Math.max(anchor.quantity, 1);
      }
    }
  }

  return { packages: packagesOut, components: componentsOut };
}

const categoryIcons: Record<string, any> = {
  "Take Off": Plane,
  "Layover": ArrowLeftRight,
  "Altitude": Briefcase,
  "Summit": GraduationCap,
  "Additional Services": Globe
};
const categorySubtitles: Record<string, string> = {
  "Take Off": "From High School to University",
  "Layover": "University Transfers",
  "Altitude": "Internship Placement",
  "Summit": "From University to Master Degree",
  "Additional Services": "Extra Services"
};
const categoryOrder = ["Take Off", "Layover", "Altitude", "Summit", "Additional Services"];
// Mapping Take Off services to their example PDF files
const takeOffExamplePdfs: Record<string, string> = {
  "Personalized Timeline": "/service-docs/Admission_Timeline.pdf",
  "Comparative Presentations": "/service-docs/Comparative_Analysis.pdf",
  "In-Depth Presentations": "/service-docs/In-depth_Presentation.pdf",
};

// Mapping for Layover service example PDFs
const layoverExamplePdfs: Record<string, string> = {
  "Personalized Timeline": "/service-docs/Layover_Timeline.pdf",
  "Comparative Presentations": "/service-docs/Layover_Comparative_Analysis.pdf",
  "In-Depth Presentations": "/service-docs/Layover_In-depth_Presentation.pdf",
};

// Mapping for Summit service example PDFs
const summitExamplePdfs: Record<string, string> = {
  "Personalized Timeline": "/service-docs/Summit_Timeline.pdf",
  "Comparative Analysis": "/service-docs/Summit_Comparative_Analysis.pdf",
  "In-Depth Presentations": "/service-docs/Summit_In-depth_Presentation.pdf",
};

// Mapping for Altitude service example PDFs
const altitudeExamplePdfs: Record<string, string> = {
  "Personalized Career Roadmap": "/service-docs/Altitude_Career_Roadmap.pdf",
};

// Mapping service preview images (first page rendered from example PDF)
const servicePreviewImages: Record<string, Record<string, string>> = {
  "Take Off": {
    "Personalized Timeline": "/service-previews/Admission_Timeline.jpg",
    "Comparative Presentations": "/service-previews/Comparative_Analysis.jpg",
    "In-Depth Presentations": "/service-previews/In-depth_Presentation.jpg",
  },
  "Layover": {
    "Personalized Timeline": "/service-previews/Layover_Timeline.jpg",
    "Comparative Presentations": "/service-previews/Layover_Comparative_Analysis.jpg",
    "In-Depth Presentations": "/service-previews/Layover_In-depth_Presentation.jpg",
  },
  "Summit": {
    "Personalized Timeline": "/service-previews/Summit_Timeline.jpg",
    "Comparative Analysis": "/service-previews/Summit_Comparative_Analysis.jpg",
    "In-Depth Presentations": "/service-previews/Summit_In-depth_Presentation.jpg",
  },
  "Altitude": {
    "Personalized Career Roadmap": "/service-previews/Altitude_Career_Roadmap.jpg",
  },
};

const getServicePreview = (category: string, name: string): string | undefined =>
  servicePreviewImages[category]?.[name];

const ClientServicesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightCategory = searchParams.get("category");
  const highlightService = searchParams.get("service");
  const openAdvisorParam = searchParams.get("advisor") === "1";
  const highlightRef = useRef<HTMLDivElement>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [packageComponents, setPackageComponents] = useState<PackageComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [infoService, setInfoService] = useState<Service | null>(null);
  const [cartItems, setCartItems] = useState<GuestCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isJobHubFormOpen, setIsJobHubFormOpen] = useState(false);
  const [associates, setAssociates] = useState<AssociatePreview[]>([]);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const checkoutAfterAdvisorAddRef = useRef(false);

  // Scroll to highlighted service after loading
  useEffect(() => {
    if (!loading && highlightService && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [loading, highlightService]);

  // Auto-open the Pilot Advisor when arriving with ?advisor=1
  useEffect(() => {
    if (!loading && openAdvisorParam) {
      setAdvisorOpen(true);
    }
  }, [loading, openAdvisorParam]);

  // Helper to check if service is a monthly subscription
  const isMonthlyService = (serviceName: string) => ['Pathways', 'Talent Pool', 'Job Updates Hub'].includes(serviceName);

  // Helper to get example PDF for Take Off services
  const getExamplePdf = (serviceName: string): string | null => {
    return takeOffExamplePdfs[serviceName] || null;
  };

  // Helper to get example PDF for Layover services
  const getLayoverExamplePdf = (serviceName: string): string | null => {
    return layoverExamplePdfs[serviceName] || null;
  };

  // Helper to get example PDF for Summit services
  const getSummitExamplePdf = (serviceName: string): string | null => {
    return summitExamplePdfs[serviceName] || null;
  };

  // Helper to get example PDF for Altitude services
  const getAltitudeExamplePdf = (serviceName: string): string | null => {
    return altitudeExamplePdfs[serviceName] || null;
  };

  // Whether a service in a given category ships with a downloadable demo PDF.
  const hasDemoPdf = (serviceName: string, category: string): boolean => {
    if (category === "Take Off") return !!takeOffExamplePdfs[serviceName];
    if (category === "Layover") return !!layoverExamplePdfs[serviceName];
    if (category === "Summit") return !!summitExamplePdfs[serviceName];
    if (category === "Altitude") return !!altitudeExamplePdfs[serviceName];
    return false;
  };

  // Function to download PDF
  const handleDownloadPdf = (serviceName: string, category: string) => {
    let pdfPath: string | null = null;
    if (category === "Take Off") {
      pdfPath = getExamplePdf(serviceName);
    } else if (category === "Layover") {
      pdfPath = getLayoverExamplePdf(serviceName);
    } else if (category === "Summit") {
      pdfPath = getSummitExamplePdf(serviceName);
    } else if (category === "Altitude") {
      pdfPath = getAltitudeExamplePdf(serviceName);
    }
    if (pdfPath) {
      const link = document.createElement('a');
      link.href = pdfPath;
      link.download = pdfPath.split('/').pop() || 'example.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('guest_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }

    // Check if user is logged in
    const clientUser = localStorage.getItem('client_user');
    setIsLoggedIn(!!clientUser);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('guest_cart', JSON.stringify(cartItems));
  }, [cartItems]);
  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      try {
        // Wait for services, packages and associates together so package
        // verticals never flash the legacy accordion while packages load.
        await Promise.all([fetchServices(), fetchAssociates(), fetchPackages()]);
      } finally {
        setLoading(false);
      }
    };
    loadPageData();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data: pkgs, error: pkgErr } = await sb
        .from('client_packages')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (pkgErr) throw pkgErr;

      const { data: comps, error: compErr } = await sb
        .from('client_package_components')
        .select('*, service:client_services(*)')
        .order('sort_order', { ascending: true });
      if (compErr) throw compErr;

      const { packages: normalizedPkgs, components: normalizedComps } = normalizePackagePricing(
        (pkgs || []) as ClientPackage[],
        (comps || []) as PackageComponent[]
      );
      setPackages(normalizedPkgs);
      setPackageComponents(normalizedComps);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };
  const fetchAssociates = async () => {
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('id, first_name, last_name, photo_url, university, university_2, master_program, sector, sector_2, company_name, company_2, linkedin_url, overview_url')
        .eq('role', 'ASSOCIATE')
        .eq('status', 'approved')
        .not('photo_url', 'is', null);
      if (error) throw error;
      setAssociates(data || []);
    } catch (error) {
      console.error('Error fetching associates:', error);
    }
  };
  // Returns up to 4 associate previews matching a given service's category
  const getAssociatePreviewsForService = (service: Service): AssociatePreview[] => {
    if (service.category === 'Additional Services') return [];
    if (!service.requires_associate) return [];
    const cat = service.category;
    const filtered = associates.filter(a => {
      if (cat === 'Take Off' || cat === 'Layover') {
        return !!(a.university || a.university_2);
      }
      if (cat === 'Summit') {
        return !!a.master_program;
      }
      if (cat === 'Altitude') {
        return !!(a.sector || a.sector_2);
      }
      return true;
    });
    // Stable pseudo-random pick by service id
    const seed = service.id.charCodeAt(0) + service.id.charCodeAt(service.id.length - 1);
    const rotated = [...filtered].sort((a, b) => a.id.localeCompare(b.id));
    const start = filtered.length > 0 ? seed % filtered.length : 0;
    const picked = [...rotated.slice(start), ...rotated.slice(0, start)].slice(0, 4);
    return picked;
  };
  const fetchServices = async () => {
    try {
      const {
        data,
        error
      } = await sb.from('client_services').select('*')
        .neq('name', 'Additional Call with Associate')
        .order('category', {
        ascending: true
      }).order('price', {
        ascending: false
      });
      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast.error("Failed to load services");
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

  // Pin "University Eligibility Verification" to the top of its category
  const orderedGroupedServices = useMemo(() => {
    const result: Record<string, Service[]> = {};
    Object.keys(groupedServices).forEach((cat) => {
      const list = [...groupedServices[cat]];
      list.sort((a, b) => {
        if (a.name === 'University Eligibility Verification') return -1;
        if (b.name === 'University Eligibility Verification') return 1;
        return 0;
      });
      result[cat] = list;
    });
    return result;
  }, [groupedServices]);

  const sortedCategories = Object.keys(orderedGroupedServices)
    .filter(c => !highlightCategory || c === highlightCategory)
    .sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return indexA - indexB;
    });
  const handleAddToCart = (item: GuestCartItem) => {
    const goToCheckout = checkoutAfterAdvisorAddRef.current;
    setCartItems(prev => {
      const next = [...prev, item];
      localStorage.setItem('guest_cart', JSON.stringify(next));
      return next;
    });
    toast.success("Added to cart!");
    setSelectedService(null);
    if (goToCheckout) {
      checkoutAfterAdvisorAddRef.current = false;
      navigate('/client-portal/checkout');
    }
  };

  // Direct add to cart without associate selection
  const handleDirectAddToCart = (service: Service, goToCheckout = false) => {
    const cartItem: GuestCartItem = {
      id: `${service.id}-${Date.now()}`,
      service: service,
    };
    setCartItems(prev => {
      const next = [...prev, cartItem];
      localStorage.setItem('guest_cart', JSON.stringify(next));
      return next;
    });
    toast.success("Added to cart!");
    if (goToCheckout) navigate('/client-portal/checkout');
  };
  const handleRemoveFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast.success("Removed from cart");
  };
  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/client-portal/checkout');
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  const isPackageView = !!(highlightCategory && PACKAGE_CATEGORIES.includes(highlightCategory));
  return <div className={`min-h-screen relative ${isPackageView ? 'p-3 md:p-4' : 'p-4 md:p-8'}`} style={{
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  }}>
      <div className="absolute inset-0 bg-black/40" />
      
      <div className={`max-w-7xl mx-auto relative z-10 ${isPackageView ? 'space-y-3' : 'space-y-6'}`}>
        {/* Header */}
        <div className={`flex justify-between items-center backdrop-blur-sm bg-background/80 rounded-lg shadow-lg ${isPackageView ? 'px-4 py-2.5' : 'p-4'}`}>
          <div>
            <h1 className={`font-bold ${isPackageView ? 'text-xl' : 'text-2xl md:text-3xl'}`}>Book Flight Plan</h1>
            {!isPackageView && <p className="text-muted-foreground">Browse our career services</p>}
          </div>
          <div className="flex gap-2">
            {/* Cart Icon */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItems.length > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {cartItems.length}
                    </Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <GuestCart cartItems={cartItems} onRemoveItem={handleRemoveFromCart} onCheckout={handleCheckout} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Account / Login button */}
            {isLoggedIn ? <Button variant="outline" onClick={() => navigate('/client-portal/dashboard')}>
                <User className="mr-2 h-4 w-4" />
                My Account
              </Button> : <Button variant="outline" onClick={() => navigate('/client-portal/auth')}>
                <User className="mr-2 h-4 w-4" />
                Login
              </Button>}

            {/* Back to Main Website */}
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Main Website</span>
            </Button>
          </div>
        </div>

        {/* Introduction — hidden on package verticals (each PackageExperience has its own header) */}
        {!(highlightCategory && PACKAGE_CATEGORIES.includes(highlightCategory)) && (
          <Card className="backdrop-blur-sm bg-background/90 shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">Our Premium Services</CardTitle>
              <CardDescription>Choose the perfect service to advance your career</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">How it works</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Pick a service, choose your Associate, and meet 1:1 online. You'll also get a PDF in your personal area.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Ongoing support</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        A dedicated WhatsApp group with you, your Associate, and a Career Pilot supervisor keeps your journey on track.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Services by Category */}
        <div className="space-y-4">
          {sortedCategories.map(category => {
          const Icon = categoryIcons[category] || Globe;
          const categoryServices = orderedGroupedServices[category];
          // Package verticals get the dedicated package experience — never fall
          // back to the legacy accordion (avoids a flash if packages load late).
          const pkg = packages.find((p) => p.category === category);
          if (PACKAGE_CATEGORIES.includes(category)) {
            if (!pkg) return null;
            return (
              <PackageExperience
                key={category}
                pkg={pkg}
                components={packageComponents.filter((c) => c.package_id === pkg.id)}
                services={categoryServices}
                associates={associates}
                onSelectService={(svc) => setSelectedService(svc)}
                onAddToCart={handleAddToCart}
                onShowInfo={(svc) => setInfoService(svc)}
                onDownloadPdf={handleDownloadPdf}
                getPreviewImage={(name) => getServicePreview(category, name)}
                hasDemo={(name) => hasDemoPdf(name, category)}
              />
            );
          }
          return <Card key={category} className="backdrop-blur-sm bg-background/90 shadow-lg overflow-hidden">
                <Accordion type="single" collapsible defaultValue={highlightCategory === category ? category : undefined}>
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
                      {category === "Additional Services" && (
                        <Alert className="bg-muted/50 border-primary/20 mb-4">
                          <Info className="h-4 w-4 text-primary" />
                          <AlertDescription className="ml-2 text-sm">
                            <strong>No automatic renewal:</strong> After the 3-month period, your subscription will not renew automatically. Our team will reach out to you for feedback on your experience and, only if you wish to continue, you can make a new payment to extend your access.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="grid gap-5 md:grid-cols-2">
                        {categoryServices.map(service => {
                          const previewImg = getServicePreview(category, service.name);
                          const customBg = serviceBgImages[service.name];
                          const dualBg = serviceDualImages[service.name];
                          const isContainImage =
                            service.name === 'Masterclass Managed by CareerBoost' ||
                            service.name === 'Job Updates Hub';
                          const CategoryIcon = categoryIcons[category] || Globe;
                          const associatePreviews = getAssociatePreviewsForService(service);
                          const hasExamplePdf =
                            (category === "Take Off" && getExamplePdf(service.name)) ||
                            (category === "Layover" && getLayoverExamplePdf(service.name)) ||
                            (category === "Summit" && getSummitExamplePdf(service.name)) ||
                            (category === "Altitude" && getAltitudeExamplePdf(service.name));
                          return (
                          <Card
                            key={service.id}
                            ref={highlightService === service.name ? highlightRef : undefined}
                            className={`group relative overflow-hidden flex flex-col border-primary/10 hover:border-primary/40 bg-card transition-all hover:shadow-2xl hover:-translate-y-1 duration-300 ${highlightService === service.name ? 'ring-2 ring-primary shadow-xl' : ''}`}
                          >
                            {/* Suggested sticker for University Eligibility Verification */}
                            {service.name === 'University Eligibility Verification' && (
                              <div className="absolute top-3 right-3 z-30">
                                <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs font-semibold px-2.5 py-1 shadow-lg">
                                  ★ Suggested
                                </Badge>
                              </div>
                            )}

                            {/* Preview hero (custom bg, dual bg, PDF preview, or icon) */}
                            <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/15 via-primary/10 to-secondary/15">
                              {dualBg ? (
                                <>
                                  <div className="absolute inset-0 grid grid-cols-2 gap-1 p-2 bg-gradient-to-br from-primary/10 to-secondary/10">
                                    <div className="relative rounded-md overflow-hidden bg-background/40 flex items-center justify-center">
                                      <img
                                        src={dualBg[0]}
                                        alt={`${service.name} visual 1`}
                                        loading="lazy"
                                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                      />
                                    </div>
                                    <div className="relative rounded-md overflow-hidden bg-background/40 flex items-center justify-center">
                                      <img
                                        src={dualBg[1]}
                                        alt={`${service.name} visual 2`}
                                        loading="lazy"
                                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                      />
                                    </div>
                                  </div>
                                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent pointer-events-none" />
                                </>
                              ) : customBg ? (
                                <>
                                  <img
                                    src={customBg}
                                    alt={`${service.name} background`}
                                    loading="lazy"
                                    className={`absolute inset-0 w-full h-full ${isContainImage ? 'object-contain p-3 bg-white' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-card/10 to-transparent" />
                                </>
                              ) : previewImg ? (
                                <>
                                  <img
                                    src={previewImg}
                                    alt={`${service.name} preview`}
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                                </>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <CategoryIcon className="h-20 w-20 text-primary/30" />
                                </div>
                              )}
                              {/* Category chip */}
                              <div className="absolute top-3 left-3 z-10">
                                <Badge variant="secondary" className="backdrop-blur-md bg-background/80 border border-primary/20 text-foreground font-semibold gap-1.5 shadow-sm">
                                  <CategoryIcon className="h-3.5 w-3.5 text-primary" />
                                  {category}
                                </Badge>
                              </div>
                              {/* Associate avatars preview - top right (skipped for Additional Services or 'Suggested' sticker) */}
                              {associatePreviews.length > 0 && service.name !== 'University Eligibility Verification' && (
                                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 backdrop-blur-md bg-background/80 border border-primary/20 rounded-full pl-1.5 pr-2 py-1 shadow-sm">
                                  <div className="flex -space-x-2">
                                    {associatePreviews.map((a) => (
                                      <Avatar key={a.id} className="h-6 w-6 ring-2 ring-background">
                                        <AvatarImage src={a.photo_url || undefined} alt={`${a.first_name} ${a.last_name}`} />
                                        <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-semibold">
                                          {a.first_name?.[0]}{a.last_name?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                  <span className="text-[10px] font-medium text-foreground/80 hidden sm:inline">Associates</span>
                                </div>
                              )}
                              {/* Price badge - prominent (or Contact us for contact-only services) */}
                              <div className="absolute bottom-3 right-3 z-10">
                                {['Talent Pool', 'Pathways', 'Job Updates Hub'].includes(service.name) ? (
                                  <a
                                    href="https://wa.me/447826932893"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Badge className="text-sm font-bold whitespace-nowrap bg-[#25D366] hover:bg-[#1ea952] text-white shadow-lg px-3 py-1.5 cursor-pointer transition-colors gap-1.5">
                                      <MessageCircle className="h-3.5 w-3.5" />
                                      Contact us
                                    </Badge>
                                  </a>
                                ) : (
                                  <Badge className="text-base font-bold whitespace-nowrap bg-primary text-primary-foreground shadow-lg px-3 py-1.5">
                                    {service.name === 'Masterclass Managed by CareerBoost'
                                      ? 'On request'
                                      : isMonthlyService(service.name) ? `€${service.price.toFixed(0)}/3 mo` : `€${service.price.toFixed(2)}`}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors">
                                {service.name}
                              </CardTitle>
                              <CardDescription className="text-sm line-clamp-2 mt-1">
                                {service.description}
                              </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-2 mt-auto pt-0">
                              <div className="flex gap-2">
                                <Button onClick={() => setInfoService(service)} variant="outline" className="flex-1 border-primary/20 hover:border-primary/50 hover:bg-primary/5">
                                  <Info className="h-4 w-4 mr-2" />
                                  Full Details
                                </Button>
                                {hasExamplePdf && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDownloadPdf(service.name, category)}
                                    title="Download Example PDF"
                                    className="shrink-0 border-primary/30 hover:border-primary hover:bg-primary/10"
                                  >
                                    <FileText className="h-4 w-4 text-primary" />
                                  </Button>
                                )}
                              </div>
                              {service.name === 'Pathways' ? <Button onClick={() => window.location.href = '/platforms/pathways'} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md">
                                  Go to Platform
                                </Button> : service.name === 'Talent Pool' ? <Button onClick={() => window.location.href = '/talent-pool'} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md">
                                  Go to Platform
                                </Button> : service.name === 'Job Updates Hub' ? <Button onClick={() => setIsJobHubFormOpen(true)} className="w-full bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#1ea952] hover:to-[#128C47] shadow-md">
                                  Activate Membership
                                </Button> : service.name === 'Masterclass Managed by CareerBoost' ? <Button asChild className="w-full bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#1ea952] hover:to-[#128C47] shadow-md">
                                  <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Request a Quote on WhatsApp
                                  </a>
                                </Button> : service.name?.startsWith('Outreach Power Pack') ? <Button asChild className="w-full bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#1ea952] hover:to-[#128C47] shadow-md">
                                  <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Contact us
                                  </a>
                                </Button> : service.name === 'University Eligibility Verification' ? <Button onClick={() => handleDirectAddToCart(service)} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md">
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Add to Cart
                                </Button> : <Button onClick={() => setSelectedService(service)} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md font-bold text-base">
                                  <ShoppingCart className="h-5 w-5 mr-2" />
                                  Select Associate
                                </Button>}
                            </CardContent>
                          </Card>
                          );
                        })}
                        {/* Knowledge Base & Direct Contacts - inside Additional Services */}
                        {category === "Additional Services" && (
                          <Card className="group relative overflow-hidden flex flex-col border-primary/10 hover:border-primary/40 bg-card transition-all hover:shadow-2xl hover:-translate-y-1 duration-300">
                            {/* Dual image hero */}
                            <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/15 via-primary/10 to-secondary/15">
                              <div className="absolute inset-0 grid grid-cols-2 gap-1 p-2">
                                <div className="relative rounded-md overflow-hidden bg-background/40 flex items-center justify-center">
                                  <img
                                    src={bgKnowledgeBase1}
                                    alt="Knowledge Base interview prep"
                                    loading="lazy"
                                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                  />
                                </div>
                                <div className="relative rounded-md overflow-hidden bg-background/40 flex items-center justify-center">
                                  <img
                                    src={bgKnowledgeBase2}
                                    alt="Direct contacts database"
                                    loading="lazy"
                                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                  />
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent pointer-events-none" />
                              <div className="absolute top-3 left-3 z-10">
                                <Badge variant="secondary" className="backdrop-blur-md bg-background/80 border border-primary/20 text-foreground font-semibold gap-1.5 shadow-sm">
                                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                                  Additional Services
                                </Badge>
                              </div>
                            </div>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                Knowledge Base & Direct Contacts
                              </CardTitle>
                              <CardDescription className="text-sm line-clamp-2 mt-1">
                                Access exclusive interview prep material and direct contact details — emails and phone numbers — of professionals across all industries from our proprietary database.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 mt-auto pt-0">
                              <Button
                                onClick={() => window.location.href = '/knowledge-base'}
                                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md"
                              >
                                Go to Knowledge Base
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>;
        })}
        </div>

        {/* Floating Cart Button for Mobile */}
        {cartItems.length > 0 && <div className="fixed bottom-6 right-6 md:hidden z-50">
            <Button size="lg" className="rounded-full shadow-lg h-14 w-14 p-0" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="h-6 w-6" />
              <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0">
                {cartItems.length}
              </Badge>
            </Button>
          </div>}
      </div>

      {/* Service Info Dialog */}
      <Dialog open={!!infoService} onOpenChange={open => !open && setInfoService(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{infoService?.name}</DialogTitle>
            <DialogDescription className="text-lg font-semibold text-primary">
              {infoService?.name === 'Masterclass Managed by CareerBoost'
                ? 'Price on request'
                : `€${Number(infoService?.price ?? 0).toFixed(2)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-foreground whitespace-pre-line leading-relaxed">
              {infoService?.name === 'Expert Career Session (1:1)' ? (
                <>
                  This is a fully customized 1:1 career session with an associate working in your target field.
                  {'\n\n'}Before the session, you specify exactly what you need help with, so the associate can prepare in advance and deliver maximum value.
                  {'\n\n'}The session can cover:
                  {'\n'}• Interview preparation (behavioral, technical, case-based)
                  {'\n'}• Role-specific technical prep (Excel tests, modeling, analytics, tools)
                  {'\n'}• Skill gap analysis
                  {'\n'}• CV and profile review
                  {'\n'}• Transition into a new role or industry
                </>
              ) : infoService?.name?.startsWith('Outreach Power Pack') ? (
                <>
                  This is a "done-for-you" outreach service with a <strong>pay-per-interview</strong> pricing model. You don't pay for emails sent — you pay only for results.
                  {'\n\n'}<strong>How it works:</strong>
                  {'\n'}• We create a dedicated outreach email using your first and last name to which you will have access
                  {'\n'}• We identify companies/teams where your profile is most likely to get traction (based on your CV)
                  {'\n'}• We run a targeted outreach campaign on your behalf and, where available, leverage internal team contacts to surface opportunities faster
                  {'\n'}• You receive a summary of what was sent, who was contacted, and recommended follow-ups
                  {'\n\n'}<strong>Pricing:</strong> €250 per interview secured. No upfront fee, no per-email cost — you are billed only when one of these conversations turns into an actual interview.
                  {'\n\n'}<strong>Important:</strong> An interview means a confirmed scheduled call/meeting with a hiring manager, recruiter or relevant team member as a result of our outreach.
                </>
              ) : infoService?.description}
            </p>
          </div>
          <div className="mt-6">
            {infoService?.name === 'Masterclass Managed by CareerBoost' ? (
              <Button asChild className="w-full bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#1ea952] hover:to-[#128C47]">
                <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Request a Quote on WhatsApp
                </a>
              </Button>
            ) : infoService?.name?.startsWith('Outreach Power Pack') ? (
              <Button asChild className="w-full bg-gradient-to-r from-[#25D366] to-[#1ea952] hover:from-[#1ea952] hover:to-[#128C47]">
                <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact us
                </a>
              </Button>
            ) : (
              <Button onClick={() => {
                setInfoService(null);
                setSelectedService(infoService);
              }} className="w-full font-bold text-base">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Select Associate
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Associate Selector Dialog */}
      {selectedService && <GuestAssociateSelector service={selectedService} onClose={() => {
        checkoutAfterAdvisorAddRef.current = false;
        setSelectedService(null);
      }} onAddToCart={handleAddToCart} />}

      {/* Job Hub Form Dialog */}
      <JobHubFormDialog isOpen={isJobHubFormOpen} onClose={() => setIsJobHubFormOpen(false)} />

      {/* Pilot Advisor — wow guided experience across Take Off / Summit / Altitude */}
      <PilotAdvisor
        open={advisorOpen}
        onOpenChange={setAdvisorOpen}
        services={services
          .filter(s => ["Take Off", "Summit", "Altitude", "Layover"].includes(s.category) && s.name !== "Additional Call with Associate" && s.name !== "Take Off Package")
          .map(s => {
            let pdfPath: string | null = null;
            if (s.category === "Take Off") pdfPath = getExamplePdf(s.name);
            else if (s.category === "Layover") pdfPath = getLayoverExamplePdf(s.name);
            else if (s.category === "Summit") pdfPath = getSummitExamplePdf(s.name);
            else if (s.category === "Altitude") pdfPath = getAltitudeExamplePdf(s.name);
            return {
              id: s.id,
              name: s.name,
              description: s.description,
              price: Number(s.price),
              category: s.category,
              categorySubtitle: categorySubtitles[s.category],
              image: getServicePreview(s.category, s.name) || serviceBgImages[s.name],
              pdfPath,
              requiresAssociate: s.name === 'University Eligibility Verification' ? false : s.requires_associate,
            };
          })}
        onBookFreeCall={() => {
          // Keep advisor open behind the booking popup
          setBookingOpen(true);
        }}
        onSelectAssociate={(name, category) => {
          const svc = services.find(s => s.name === name && (!category || s.category === category));
          if (svc) {
            // Keep advisor mounted — GuestAssociateSelector dialog opens on top.
            // After associate is chosen and item added, parent navigates to /checkout.
            checkoutAfterAdvisorAddRef.current = true;
            setSelectedService(svc);
          }
        }}
        onViewDetails={(name, category) => {
          const svc = services.find(s => s.name === name && s.category === category);
          if (svc) setInfoService(svc);
        }}
        onDirectAddToCart={(name, category) => {
          const svc = services.find(s => s.name === name && s.category === category);
          if (svc) handleDirectAddToCart(svc, true);
        }}
        onDownloadPdf={(name, category) => handleDownloadPdf(name, category)}
        packages={packages.map((p) => ({
          code_name: p.code_name,
          subtitle: p.subtitle,
          category: p.category,
          price: Number(p.price),
          description: p.description || undefined,
          components: packageComponents
            .filter((c) => c.package_id === p.id && !c.is_addon)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((c) => ({
              label: c.label || c.service?.name || "Component",
              is_removable: c.is_removable,
            })),
        }))}
        onSelectPackage={(category) => {
          setAdvisorOpen(false);
          navigate(`/client-portal/services?category=${encodeURIComponent(category)}`);
        }}
        onCustomizePackage={(category) => {
          setAdvisorOpen(false);
          navigate(`/client-portal/services?category=${encodeURIComponent(category)}`);
        }}
        onGoTalentPool={() => {
          setAdvisorOpen(false);
          navigate('/talent-pool');
        }}
        onExit={() => navigate('/')}
      />



      {/* Free Booking Call */}
      <BookingPopup isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>;
};
export default ClientServicesPage;