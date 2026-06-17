import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, BookOpen, ShoppingCart, GraduationCap, Briefcase, Rocket, Shield, Home, Eye, Users, Zap, ExternalLink, Package, FileText, Search, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { FaWhatsapp } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import careerPilotLogoKb from "@/assets/career-pilot-logo-kb.png";

const sb = supabase as any;

// Smart search: keyword associations for intelligent matching
const KEYWORD_ASSOCIATIONS: Record<string, string[]> = {
  "private equity": ["private equity", "lbo", "leveraged buyout", "buyout", "pe", "deal", "valuation", "dcf", "financial model", "excel", "m&a", "merger", "acquisition", "investment banking"],
  "lbo": ["lbo", "leveraged buyout", "private equity", "pe", "buyout", "deal", "financial model", "excel"],
  "investment banking": ["investment banking", "ib", "m&a", "merger", "acquisition", "dcf", "valuation", "financial model", "excel", "deal", "pitchbook", "private equity"],
  "consulting": ["consulting", "case study", "case interview", "strategy", "mckinsey", "bain", "bcg", "management"],
  "m&a": ["m&a", "merger", "acquisition", "deal", "valuation", "dcf", "investment banking", "financial model"],
  "excel": ["excel", "financial model", "model", "spreadsheet", "lbo", "dcf", "valuation"],
  "valuation": ["valuation", "dcf", "financial model", "excel", "investment banking", "private equity"],
  "dcf": ["dcf", "discounted cash flow", "valuation", "financial model", "excel"],
  "internship": ["internship", "intern", "application", "cv", "cover letter", "resume", "career"],
  "cv": ["cv", "resume", "cover letter", "application", "internship", "career"],
  "master": ["master", "masters", "msc", "mba", "university", "admission", "application", "degree"],
  "university": ["university", "uni", "admission", "application", "master", "degree", "transfer"],
};

const getExpandedSearchTerms = (query: string): string[] => {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];
  const terms = new Set<string>([lower]);
  // Check each association key
  for (const [key, related] of Object.entries(KEYWORD_ASSOCIATIONS)) {
    if (lower.includes(key) || key.includes(lower)) {
      related.forEach((r) => terms.add(r));
    }
  }
  return Array.from(terms);
};

const categories = [
{ id: "Take Off & Layover", label: "Take Off & Layover", icon: Rocket, description: "Resources for starting your academic journey and transferring between universities." },
{ id: "Summit", label: "Summit", icon: GraduationCap, description: "Master's degree guidance, applications, and comparative analyses." },
{ id: "Altitude", label: "Altitude", icon: Briefcase, description: "Career development, internship search, and professional growth." }];


const KnowledgeBase = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromEcosystem = searchParams.get("from") === "ecosystem";
  // Tier mode: when launched from the Talent Pool as "Prep Material", the store is
  // locked to a single tier (Internship Placement) instead of letting the user pick
  // a category. The paid cart/checkout flow stays identical, so purchases land in the
  // same shared registry (kb_orders / kb_client_access).
  const tierParam = searchParams.get("tier");
  const tierMode = !!tierParam;
  const tierToCategory = (t: string) =>
    t === "Internship Placement" ? "Altitude" : t === "Uni / Master" ? "Summit" : "Take Off & Layover";
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<"bundles" | "singles">("bundles");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewImages, setOverviewImages] = useState<string[]>([]);
  const [showOutreach, setShowOutreach] = useState(false);

  // Check if client is logged in
  const clientUser = JSON.parse(localStorage.getItem("client_user") || "null");

  // Sync category from URL (?category=Summit, Altitude, Take Off, takeoff, etc.)
  useEffect(() => {
    // Tier mode locks the view to the tier's underlying category and skips the
    // category-selection screen entirely.
    if (tierParam) {
      const cat = tierToCategory(tierParam);
      if (cat !== selectedCategory) {
        setSelectedCategory(cat);
        setShowOutreach(false);
      }
      return;
    }
    const raw = searchParams.get("category");
    if (!raw) return;
    const norm = raw.toLowerCase().trim();
    const match = categories.find(
      (c) =>
        c.id.toLowerCase() === norm ||
        c.id.toLowerCase().startsWith(norm) ||
        norm.startsWith(c.id.toLowerCase().split(" ")[0])
    );
    if (match && match.id !== selectedCategory) {
      setSelectedCategory(match.id);
      setShowOutreach(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchProducts = async (category: string) => {
    setLoading(true);
    let query = sb.from("kb_products").select("*").eq("is_active", true);
    // In tier mode filter by tier (across categories); otherwise by the picked category.
    query = tierParam ? query.eq("tier", tierParam) : query.eq("category", category);
    const { data } = await query.order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const addToCart = (productId: string) => {
    if (!clientUser) {
      navigate("/client-portal/auth");
      return;
    }
    setCart((prev) => prev.includes(productId) ? prev : [...prev, productId]);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((id) => id !== productId));
  };

  const proceedToCheckout = () => {
    if (!clientUser) {
      navigate("/client-portal/auth");
      return;
    }
    const selectedProducts = products.filter((p: any) => cart.includes(p.id));
    localStorage.setItem("kb_cart", JSON.stringify(selectedProducts));
    navigate("/knowledge-base/checkout");
  };

  const totalAmount = products.
  filter((p: any) => cart.includes(p.id)).
  reduce((sum: number, p: any) => sum + Number(p.price), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onOpenBooking={() => {}} />
      <main className="pt-16 pb-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <BookOpen className="h-7 w-7 text-primary" />
              <h1 className="text-2xl md:text-4xl font-bold text-foreground">{tierMode ? "Prep Material" : "Knowledge Base"}</h1>
              <Badge className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 animate-pulse">New</Badge>
            </div>
            <p className="text-muted-foreground text-base max-w-2xl mx-auto">{tierMode ? "Internship Placement prep material — PDF guides, Excel models and ready-made packages." : "Exclusive digital resources & Prep Material to accelerate your academic and career journey."}</p>
            <div className="flex items-center justify-center gap-3 mt-3">
              {tierMode ? (
                <Button variant="outline" size="sm" onClick={() => navigate("/talent-pool/student/dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Talent Pool
                </Button>
              ) : fromEcosystem ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/?openEcosystem=1")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Softwares & Preparation
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin/knowledge-base")}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                    <Home className="mr-2 h-4 w-4" /> Main Site
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin/knowledge-base")}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Back button when viewing products or outreach (hidden when launched from ecosystem with category locked) */}
          {(selectedCategory || showOutreach) && !fromEcosystem && !tierMode &&
            <Button variant="ghost" onClick={() => {setSelectedCategory(null);setCart([]);setShowOutreach(false);setProductFilter("bundles");setSearchQuery("");}} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Categories
            </Button>
          }

          {/* Executive Outreach Detail View */}
          {showOutreach && !selectedCategory &&
            <div className="flex flex-col md:flex-row gap-6 py-8">
              {/* Outreach Pro Promo Card - Left */}
              <div className="md:w-[340px] flex-shrink-0">
                <Card className="h-full border-2 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] bg-white dark:bg-card">
                  <CardContent className="pt-6 text-center space-y-4">
                    <img src={careerPilotLogoKb} alt="Career Pilot" className="h-10 mx-auto object-contain" />
                    <div className="mx-auto bg-sky-500/10 w-14 h-14 rounded-full flex items-center justify-center">
                      <Zap className="h-7 w-7 text-sky-500" />
                    </div>
                    <h3 className="text-lg font-bold text-sky-600">Outreach Pro by Career Pilot</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Our automated email outreach software sends emails for you with smart delays and anti-spam code structure — <span className="font-semibold text-foreground">your emails never land in spam</span>.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Pair it with the Executive Outreach List and let the software contact thousands of professionals automatically on your behalf.
                    </p>
                    <Button
                      asChild
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2"
                    >
                      <a href="https://outreachprobycp.lovable.app/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Find Out More
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Executive Outreach Content - Right */}
              <div className="flex-1 text-center space-y-6">
                <div className="mx-auto bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Executive Outreach List</h2>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Career Pilot maintains an exclusive database of <span className="font-semibold text-foreground">20,000+ verified professional contacts</span> — including MDs, VPs, CEOs, COOs, and senior associates — across every major industry worldwide, complete with direct email addresses and phone numbers.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Due to the sensitive and confidential nature of this data, access is provided on a case-by-case basis. Contact us on WhatsApp and we will send you a tailored Excel file filtered to your target industry and preferences.
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-semibold text-destructive">⚠️ Sharing or redistributing this information is strictly prohibited.</p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold text-base px-8 gap-2"
                >
                  <a href="https://wa.me/447826932893" target="_blank" rel="noopener noreferrer">
                    <FaWhatsapp className="h-5 w-5" />
                    Contact Us on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          }

          {/* Categories */}
          {!selectedCategory && !showOutreach &&
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((cat) =>
            <Card
              key={cat.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30"
              onClick={() => setSelectedCategory(cat.id)}>

                  <CardHeader className="text-center pb-3">
                    <div className="mx-auto bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mb-3">
                      <cat.icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{cat.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">{cat.description}</CardDescription>
                  </CardContent>
                </Card>
            )}
            </div>
          }

          {/* Executive Outreach & Outreach Pro Cards */}
          {!selectedCategory && !showOutreach &&
            <div className="mt-6 flex justify-center max-w-3xl mx-auto">
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border-2 border-green-500/40 hover:border-green-500 w-full max-w-sm"
                onClick={() => setShowOutreach(true)}
              >
                <CardHeader className="text-center pb-3">
                  <div className="mx-auto bg-green-500/10 w-14 h-14 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-7 w-7 text-green-500" />
                  </div>
                  <CardTitle className="text-xl text-green-600">Executive Outreach List</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">Access personal contacts of MDs, VPs, CEOs, COOs and senior professionals working in your dream industry.</CardDescription>
                </CardContent>
              </Card>
            </div>
          }

          {/* Products List */}
          {selectedCategory &&
          <>
              <h2 className="text-2xl font-bold mb-4">{tierMode ? "Prep Material" : selectedCategory}</h2>

              {/* Format indicators for Altitude */}
              {selectedCategory === "Altitude" && !loading && products.length > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                  <span className="text-sm text-muted-foreground font-medium">Contents include:</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M21.17 3H7.83A1.83 1.83 0 0 0 6 4.83v14.34A1.83 1.83 0 0 0 7.83 21h13.34A1.83 1.83 0 0 0 23 19.17V4.83A1.83 1.83 0 0 0 21.17 3zM12 18l-4-4h3V9h2v5h3l-4 4z"/><path d="M3 5H1v16a2 2 0 0 0 2 2h16v-2H3V5z"/></svg>
                    <span className="text-sm font-medium text-green-700">Excel Models</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4.5-2h-2v1h2v1.5h-2v2H19.5V7h3.5v1.5zM9 9.5h1v-1H9v1zM14 12h1V8.5h-1V12z"/><path d="M3 6H1v16a2 2 0 0 0 2 2h16v-2H3V6z"/></svg>
                    <span className="text-sm font-medium text-red-600">PDF Guides</span>
                  </div>
                </div>
              )}

              {/* Book Expert Session CTA for Altitude - optional suggestion */}
              {selectedCategory === "Altitude" && !loading && products.length > 0 && (
                <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">Need direct, targeted support?</span>{" "}
                    If you'd like personalised guidance alongside your materials, you can optionally book a 1:1 session with one of our experts.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/client-portal/services?category=Altitude&service=Expert+Career+Session")}
                    className="gap-2 border-primary/30 hover:bg-primary/10"
                  >
                    <Briefcase className="h-4 w-4" />
                    Book a Session with an Expert
                  </Button>
                </div>
              )}

              {/* Filter Tabs - hide for Altitude (bundles only) */}
              {selectedCategory !== "Altitude" && !loading && products.length > 0 && (
                <div className="space-y-4 mb-6">
                  <Tabs value={productFilter} onValueChange={(v) => { setProductFilter(v as any); setSearchQuery(""); }}>
                    <TabsList className="grid w-full max-w-xs grid-cols-2">
                      <TabsTrigger value="bundles" className="gap-1.5">
                        <Package className="h-3.5 w-3.5" /> Bundles
                      </TabsTrigger>
                      <TabsTrigger value="singles" className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Singles
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {productFilter === "singles" && (
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products (e.g. Private Equity, LBO, Excel...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {loading ?
            <p className="text-muted-foreground">Loading products...</p> :
            products.length === 0 ?
            <p className="text-muted-foreground">No products available in this category yet.</p> :

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    // Collect all product IDs that are inside a bundle
                    const bundledIds = new Set<string>();
                    products.forEach((p: any) => {
                      if (p.is_bundle && p.bundle_product_ids?.length) {
                        p.bundle_product_ids.forEach((id: string) => bundledIds.add(id));
                      }
                    });

                    let visibleProducts: any[];
                    
                    // Altitude always shows bundles only
                    const effectiveFilter = selectedCategory === "Altitude" ? "bundles" : productFilter;
                    
                    if (effectiveFilter === "singles") {
                      // Show ALL individual products with override pricing
                      visibleProducts = products
                        .filter((p: any) => !p.is_bundle)
                        .map((p: any) => {
                          const filename = (p.asset_filename || p.asset_storage_path || "").toLowerCase();
                          const isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls") || filename.endsWith(".csv");
                          const isPdf = filename.endsWith(".pdf");
                          const overridePrice = isExcel ? 5.00 : isPdf ? 2.50 : Number(p.price);
                          return { ...p, price: overridePrice };
                        });

                      // Apply smart search filtering
                      if (searchQuery.trim()) {
                        const expandedTerms = getExpandedSearchTerms(searchQuery);
                        visibleProducts = visibleProducts.filter((p: any) => {
                          const text = `${p.title} ${p.description || ""} ${p.asset_filename || ""}`.toLowerCase();
                          return expandedTerms.some((term) => text.includes(term));
                        });
                      }
                    } else {
                      // Bundles only
                      visibleProducts = products.filter((p: any) => p.is_bundle);
                    }

                    if (visibleProducts.length === 0) {
                      return <p className="text-muted-foreground col-span-full text-center py-8">No {productFilter === "bundles" ? "bundles" : "single products"} available in this category.</p>;
                    }

                    return visibleProducts.map((product: any) => {
                      const inCart = cart.includes(product.id);
                      // Resolve bundle product names
                      const bundleProductNames = product.is_bundle && product.bundle_product_ids?.length
                        ? product.bundle_product_ids
                            .map((id: string) => products.find((p: any) => p.id === id)?.title)
                            .filter(Boolean)
                        : [];

                      return (
                        <Card key={product.id} className={`transition-all duration-300 ${inCart ? "border-primary ring-2 ring-primary/20" : ""}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{product.title}</CardTitle>
                                {product.is_bundle && (
                                  <Badge className="mt-1 bg-primary/20 text-primary text-xs">📦 Bundle</Badge>
                                )}
                              </div>
                              <Badge variant="secondary" className="text-lg font-bold">€{Number(product.price).toFixed(2)}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                            {product.is_bundle && bundleProductNames.length > 0 && (
                              <div className="bg-muted/50 rounded-md p-3 space-y-1">
                                <p className="text-xs font-semibold text-foreground">Includes:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {bundleProductNames.map((name: string, i: number) => (
                                    <li key={i} className="text-sm text-muted-foreground">{name}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(() => {
                              // For bundles, aggregate overview images from child products if bundle itself has none
                              const hasOwnOverview = product.overview_images?.length > 0;
                              const isBundleWithChildren = product.is_bundle && product.bundle_product_ids?.length > 0;
                              const showOverview = hasOwnOverview || isBundleWithChildren;

                              if (!showOverview) return null;

                              return (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={async () => {
                                    const urls: string[] = [];
                                    let imagePaths: string[] = [];

                                    if (hasOwnOverview) {
                                      imagePaths = product.overview_images;
                                    } else if (isBundleWithChildren) {
                                      // Collect overview images from child products
                                      const childProducts = products.filter((p: any) => product.bundle_product_ids.includes(p.id));
                                      for (const child of childProducts) {
                                        if (child.overview_images?.length > 0) {
                                          imagePaths.push(...child.overview_images);
                                        }
                                      }
                                    }

                                    for (const p of imagePaths) {
                                      const { data } = await sb.storage.from("kb-assets").createSignedUrl(p, 600);
                                      if (data?.signedUrl) urls.push(data.signedUrl);
                                    }
                                    if (urls.length > 0) {
                                      setOverviewImages(urls);
                                      setOverviewOpen(true);
                                    }
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Overview
                                </Button>
                              );
                            })()}
                            <Button
                              className="w-full"
                              variant={inCart ? "outline" : "default"}
                              onClick={() => inCart ? removeFromCart(product.id) : addToCart(product.id)}
                            >
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              {inCart ? "Remove from Cart" : "Add to Cart"}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    });
                  })()}
                </div>
            }

              {/* Cart Summary */}
              {cart.length > 0 &&
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-2xl rounded-2xl p-4 md:p-6 flex items-center gap-4 z-50 max-w-md w-[90%]">
                  <div className="flex-1">
                    <p className="font-semibold">{cart.length} item{cart.length > 1 ? "s" : ""} in cart</p>
                    <p className="text-primary font-bold text-lg">Total: €{totalAmount.toFixed(2)}</p>
                  </div>
                  <Button onClick={proceedToCheckout}>
                    Checkout
                  </Button>
                </div>
            }
            </>
          }
        </div>
      </main>

      {/* Overview Images Dialog */}
      <Dialog open={overviewOpen} onOpenChange={setOverviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Product Overview</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            {overviewImages.map((url, i) => (
              <img key={i} src={url} alt={`Overview ${i + 1}`} className="w-full rounded-lg border" />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>);

};

export default KnowledgeBase;