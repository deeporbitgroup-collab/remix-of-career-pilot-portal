import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Plus, Edit, Package, ShoppingBag, Users, Shield, FileText, Search, Eye, Trash2, History, Home, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sb = supabase as any;

// The four KB tiers an admin assigns. They drive where a product is shown:
//   Internship Placement -> students in the Talent Pool ("Prep Material")
//   the other three       -> clients in their personal area (Knowledge Base)
const KB_TIERS = ["High School / Uni", "Uni / Master", "Transfer / Layover", "Internship Placement"] as const;

// The legacy `category` column is kept valid by deriving it from the tier.
const tierToCategory = (tier: string): string =>
  tier === "Internship Placement" ? "Altitude" : tier === "Uni / Master" ? "Summit" : "Take Off & Layover";

// For legacy rows created before tiers existed, derive a sensible tier from category.
const categoryToTier = (category: string, existingTier?: string | null): string =>
  existingTier ||
  (category === "Altitude" ? "Internship Placement" : category === "Summit" ? "Uni / Master" : "High School / Uni");

const KnowledgeBaseAdmin = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ title: "", description: "", tier: "High School / Uni", price: "", is_bundle: false, bundle_product_ids: [] as string[] });
  const [productFile, setProductFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bundle dialog state
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<any>(null);
  const [bundleForm, setBundleForm] = useState({ title: "", description: "", tier: "High School / Uni", price: "", bundle_product_ids: [] as string[] });

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderCategoryFilter, setOrderCategoryFilter] = useState("all");

  // Clients state
  const [clientAccess, setClientAccess] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  // Block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState<any>(null);
  const [blockReason, setBlockReason] = useState("");

  // Receipt dialog
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);

  // Overview images state
  const [overviewFiles, setOverviewFiles] = useState<File[]>([]);
  const [uploadingOverview, setUploadingOverview] = useState(false);
  const [overviewPreviewOpen, setOverviewPreviewOpen] = useState(false);
  const [overviewPreviewImages, setOverviewPreviewImages] = useState<string[]>([]);

  useEffect(() => {
    // When embedded inside the Talent Pool admin dashboard, that dashboard already
    // gates access (talentPoolRole=ADMIN), so we skip the separate KB login.
    if (embedded) {
      setIsLoggedIn(true);
      setAdminUsername("Talent Pool Admin");
      return;
    }
    const session = localStorage.getItem("kb_admin_session");
    if (session) {
      const parsed = JSON.parse(session);
      setIsLoggedIn(true);
      setAdminUsername(parsed.username || "Admin");
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
      fetchOrders();
      fetchClientAccess();
      fetchAuditLogs();
    }
  }, [isLoggedIn]);

  const logAuditAction = async (action: string, target_type?: string, target_id?: string, details?: string) => {
    try {
      await sb.functions.invoke("kb-admin-audit", {
        body: { admin_username: adminUsername, action, target_type, target_id, details },
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const { data, error } = await sb.functions.invoke("kb-admin-login", {
        body: { username, password },
      });
      if (error) {
        // Check for rate limiting
        if (error.message?.includes("429") || data?.error?.includes("Too many")) {
          setLoginError("Too many login attempts. Please wait 15 minutes.");
          return;
        }
        setLoginError("Invalid credentials");
        return;
      }
      if (!data?.success) {
        setLoginError(data?.error || "Invalid credentials");
        return;
      }
      localStorage.setItem("kb_admin_session", JSON.stringify(data.admin));
      setAdminUsername(data.admin.username);
      setIsLoggedIn(true);
    } catch (e: any) {
      setLoginError(e.message || "Login error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logAuditAction("LOGOUT");
    localStorage.removeItem("kb_admin_session");
    setIsLoggedIn(false);
  };

  const fetchProducts = async () => {
    const { data } = await sb.from("kb_products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
  };

  const fetchOrders = async () => {
    const { data } = await sb
      .from("kb_orders")
      .select("*, client_users(first_name, last_name, email, phone), kb_order_items(*, kb_products(title, category))")
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const fetchClientAccess = async () => {
    const { data } = await sb
      .from("kb_client_access")
      .select("*, client_users(first_name, last_name, email, phone), kb_products(title, category)")
      .order("created_at", { ascending: false });
    setClientAccess(data || []);
  };

  const fetchAuditLogs = async () => {
    try {
      const { data } = await sb.functions.invoke("kb-admin-get-audit-logs");
      setAuditLogs(data?.logs || []);
    } catch (e) {
      console.error("Error fetching audit logs:", e);
    }
  };

  const handleSaveProduct = async () => {
    setSaving(true);
    try {
      let assetPath = editingProduct?.asset_storage_path || null;
      let assetFilename = editingProduct?.asset_filename || null;

      if (productFile) {
        const ext = productFile.name.split(".").pop();
        const path = `products/${Date.now()}.${ext}`;
        const { error } = await sb.storage.from("kb-assets").upload(path, productFile);
        if (error) throw error;
        assetPath = path;
        assetFilename = productFile.name;
      }

      const payload: any = {
        title: productForm.title,
        description: productForm.description,
        tier: productForm.tier,
        category: tierToCategory(productForm.tier),
        price: parseFloat(productForm.price),
        asset_storage_path: assetPath,
        asset_filename: assetFilename,
        is_bundle: false,
        bundle_product_ids: [],
      };

      // Upload overview images
      let overviewImagePaths = editingProduct?.overview_images || [];
      if (overviewFiles.length > 0) {
        for (const file of overviewFiles) {
          const ext = file.name.split(".").pop();
          const path = `overview/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: ovErr } = await sb.storage.from("kb-assets").upload(path, file);
          if (!ovErr) overviewImagePaths = [...overviewImagePaths, path];
        }
      }
      payload.overview_images = overviewImagePaths;

      if (editingProduct) {
        await sb.from("kb_products").update(payload).eq("id", editingProduct.id);
        await logAuditAction("PRODUCT_UPDATED", "product", editingProduct.id, `Updated: ${productForm.title}`);
      } else {
        await sb.from("kb_products").insert(payload);
        await logAuditAction("PRODUCT_CREATED", "product", null, `Created: ${productForm.title}`);
      }

      toast({ title: editingProduct ? "Product updated" : "Product created" });
      setDialogOpen(false);
      setEditingProduct(null);
      setProductForm({ title: "", description: "", tier: "High School / Uni", price: "", is_bundle: false, bundle_product_ids: [] });
      setProductFile(null);
      setOverviewFiles([]);
      fetchProducts();
    } catch (e: any) {
      toast({ title: "Error saving product", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleProductActive = async (product: any) => {
    const newState = !product.is_active;
    await sb.from("kb_products").update({ is_active: newState }).eq("id", product.id);
    await logAuditAction(
      newState ? "PRODUCT_ACTIVATED" : "PRODUCT_DEACTIVATED",
      "product",
      product.id,
      `${product.title} ${newState ? "activated" : "deactivated"}`
    );
    fetchProducts();
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      // Remove associated file if exists
      if (deletingProduct.asset_storage_path) {
        await sb.storage.from("kb-assets").remove([deletingProduct.asset_storage_path]);
      }
      await sb.from("kb_products").delete().eq("id", deletingProduct.id);
      await logAuditAction("PRODUCT_DELETED", "product", deletingProduct.id, `Deleted: ${deletingProduct.title}`);
      toast({ title: "Product deleted" });
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
      fetchProducts();
    } catch (e: any) {
      toast({ title: "Error deleting product", description: e.message, variant: "destructive" });
    }
  };

  const removeProductFile = async (product: any) => {
    if (!product.asset_storage_path) return;
    try {
      await sb.storage.from("kb-assets").remove([product.asset_storage_path]);
      await sb.from("kb_products").update({ asset_storage_path: null, asset_filename: null }).eq("id", product.id);
      await logAuditAction("PRODUCT_FILE_REMOVED", "product", product.id, `File removed from: ${product.title}`);
      toast({ title: "File removed" });
      fetchProducts();
    } catch (e: any) {
      toast({ title: "Error removing file", description: e.message, variant: "destructive" });
    }
  };

  const removeOverviewImage = async (product: any, imagePath: string) => {
    try {
      await sb.storage.from("kb-assets").remove([imagePath]);
      const updated = (product.overview_images || []).filter((p: string) => p !== imagePath);
      await sb.from("kb_products").update({ overview_images: updated }).eq("id", product.id);
      await logAuditAction("OVERVIEW_IMAGE_REMOVED", "product", product.id, `Removed overview image from: ${product.title}`);
      toast({ title: "Image removed" });
      fetchProducts();
    } catch (e: any) {
      toast({ title: "Error removing image", description: e.message, variant: "destructive" });
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = sb.storage.from("kb-assets").getPublicUrl(path);
    return data?.publicUrl || "";
  };

  const viewOverviewImages = (product: any) => {
    const images = (product.overview_images || []).map((p: string) => getPublicUrl(p));
    if (images.length === 0) {
      toast({ title: "No overview images available" });
      return;
    }
    setOverviewPreviewImages(images);
    setOverviewPreviewOpen(true);
  };

  const approveOrder = async (order: any) => {
    await sb.from("kb_orders").update({ payment_status: "approved" }).eq("id", order.id);
    await logAuditAction("ORDER_APPROVED", "order", order.id, `Order approved for ${order.client_users?.email}`);
    toast({ title: "Order approved" });
    fetchOrders();
  };

  const openBlockDialog = (access: any) => {
    setBlockTarget(access);
    setBlockReason("");
    setBlockDialogOpen(true);
  };

  const handleBlockClient = async () => {
    if (!blockTarget) return;

    if (!blockTarget.is_blocked && !blockReason.trim()) {
      toast({ title: "Block reason is mandatory", variant: "destructive" });
      return;
    }

    const newBlocked = !blockTarget.is_blocked;
    await sb
      .from("kb_client_access")
      .update({ is_blocked: newBlocked, block_reason: newBlocked ? blockReason.trim() : null })
      .eq("id", blockTarget.id);

    await logAuditAction(
      newBlocked ? "CLIENT_BLOCKED" : "CLIENT_UNBLOCKED",
      "client_access",
      blockTarget.id,
      newBlocked
        ? `Blocked ${blockTarget.client_users?.email} - Reason: ${blockReason.trim()}`
        : `Unblocked ${blockTarget.client_users?.email}`
    );

    toast({ title: newBlocked ? "Client blocked" : "Client unblocked" });
    setBlockDialogOpen(false);
    setBlockTarget(null);
    fetchClientAccess();
  };

  const viewReceipt = async (receiptPath: string) => {
    if (!receiptPath) return;
    const { data } = await sb.storage.from("kb-assets").createSignedUrl(receiptPath, 300);
    if (data?.signedUrl) {
      setReceiptUrl(data.signedUrl);
      setReceiptDialogOpen(true);
    } else {
      toast({ title: "Could not load receipt", variant: "destructive" });
    }
  };

  const openEditDialog = (product: any) => {
    if (product.is_bundle) {
      // Open bundle dialog for editing bundles
      setEditingBundle(product);
      setBundleForm({
        title: product.title,
        description: product.description || "",
        tier: categoryToTier(product.category, product.tier),
        price: String(product.price),
        bundle_product_ids: product.bundle_product_ids || [],
      });
      setBundleDialogOpen(true);
      return;
    }
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      description: product.description || "",
      tier: categoryToTier(product.category, product.tier),
      price: String(product.price),
      is_bundle: false,
      bundle_product_ids: [],
    });
    setOverviewFiles([]);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setProductForm({ title: "", description: "", tier: "High School / Uni", price: "", is_bundle: false, bundle_product_ids: [] });
    setProductFile(null);
    setOverviewFiles([]);
    setDialogOpen(true);
  };

  const openCreateBundleDialog = () => {
    setEditingBundle(null);
    setBundleForm({ title: "", description: "", tier: "High School / Uni", price: "", bundle_product_ids: [] });
    setOverviewFiles([]);
    setBundleDialogOpen(true);
  };

  // Non-bundle products for bundle selection
  const availableProductsForBundle = products.filter(
    (p: any) => !p.is_bundle && p.is_active && p.id !== editingBundle?.id
  );

  const handleSaveBundle = async () => {
    if (bundleForm.bundle_product_ids.length < 2) {
      toast({ title: "Select at least 2 products for a bundle", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: bundleForm.title,
        description: bundleForm.description,
        tier: bundleForm.tier,
        category: tierToCategory(bundleForm.tier),
        price: parseFloat(bundleForm.price),
        is_bundle: true,
        bundle_product_ids: bundleForm.bundle_product_ids,
      };

      // Upload overview images for bundle
      let overviewImagePaths = editingBundle?.overview_images || [];
      if (overviewFiles.length > 0) {
        for (const file of overviewFiles) {
          const ext = file.name.split(".").pop();
          const path = `overview/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: ovErr } = await sb.storage.from("kb-assets").upload(path, file);
          if (!ovErr) overviewImagePaths = [...overviewImagePaths, path];
        }
      }
      payload.overview_images = overviewImagePaths;

      if (editingBundle) {
        await sb.from("kb_products").update(payload).eq("id", editingBundle.id);
        await logAuditAction("BUNDLE_UPDATED", "product", editingBundle.id, `Updated bundle: ${bundleForm.title}`);
      } else {
        await sb.from("kb_products").insert(payload);
        await logAuditAction("BUNDLE_CREATED", "product", null, `Created bundle: ${bundleForm.title} (${bundleForm.bundle_product_ids.length} products)`);
      }

      toast({ title: editingBundle ? "Bundle updated" : "Bundle created" });
      setBundleDialogOpen(false);
      setEditingBundle(null);
      setOverviewFiles([]);
      fetchProducts();
    } catch (e: any) {
      toast({ title: "Error saving bundle", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      const search = orderSearch.toLowerCase();
      const matchesSearch =
        !search ||
        o.id?.toLowerCase().includes(search) ||
        o.client_users?.first_name?.toLowerCase().includes(search) ||
        o.client_users?.last_name?.toLowerCase().includes(search) ||
        o.client_users?.email?.toLowerCase().includes(search) ||
        o.kb_order_items?.some((i: any) => i.kb_products?.title?.toLowerCase().includes(search));

      const matchesStatus = orderStatusFilter === "all" || o.payment_status === orderStatusFilter;

      const matchesCategory =
        orderCategoryFilter === "all" ||
        o.kb_order_items?.some((i: any) => i.kb_products?.category === orderCategoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [orders, orderSearch, orderStatusFilter, orderCategoryFilter]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    const search = clientSearch.toLowerCase();
    if (!search) return clientAccess;
    return clientAccess.filter((a: any) =>
      a.client_users?.first_name?.toLowerCase().includes(search) ||
      a.client_users?.last_name?.toLowerCase().includes(search) ||
      a.client_users?.email?.toLowerCase().includes(search) ||
      a.client_users?.phone?.includes(search) ||
      a.kb_products?.title?.toLowerCase().includes(search)
    );
  }, [clientAccess, clientSearch]);

  // Login screen (skipped when embedded — the Talent Pool admin already authed)
  if (!isLoggedIn && !embedded) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle>Knowledge Base Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            {loginError && <p className="text-sm text-destructive">{loginError}</p>}
            <Button className="w-full" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? "Logging in..." : "Login"}
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
              <Home className="mr-2 h-4 w-4" /> Back to Main Site
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-background p-4 md:p-8"}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
        {/* Header — hidden when embedded inside the Talent Pool admin dashboard */}
        {!embedded && (
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Package className="h-7 w-7 text-primary" /> Knowledge Base Admin
            </h1>
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                <Home className="mr-2 h-4 w-4" /> Main Site
              </Button>
              <span className="text-sm text-muted-foreground hidden md:inline">
                Logged in as <strong>{adminUsername}</strong>
              </span>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="products">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products" className="flex items-center gap-1 text-xs md:text-sm">
              <Package className="h-4 w-4" /> Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1 text-xs md:text-sm">
              <ShoppingBag className="h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-1 text-xs md:text-sm">
              <Users className="h-4 w-4" /> Clients
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1 text-xs md:text-sm">
              <History className="h-4 w-4" /> Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={openCreateBundleDialog}>
                <Package className="mr-2 h-4 w-4" /> Create Bundle
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                    </div>
                    <div>
                      <Label>Tier</Label>
                      <Select value={productForm.tier} onValueChange={(v) => setProductForm({ ...productForm, tier: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {KB_TIERS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        "Internship Placement" is shown to students in the Talent Pool. The others are shown to clients in their personal area.
                      </p>
                    </div>
                    <div>
                      <Label>Price (€)</Label>
                      <Input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                    </div>
                    <div>
                      <Label>Digital Asset (File)</Label>
                      <Input type="file" onChange={(e) => setProductFile(e.target.files?.[0] || null)} />
                      {editingProduct?.asset_filename && !productFile && (
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">Current: {editingProduct.asset_filename}</p>
                          <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => removeProductFile(editingProduct)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Remove
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* Overview Images */}
                    <div>
                      <Label className="flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Overview Images</Label>
                      <Input type="file" accept="image/*" multiple onChange={(e) => setOverviewFiles(Array.from(e.target.files || []))} />
                      <p className="text-xs text-muted-foreground mt-1">Upload images that users can preview. You can select multiple.</p>
                      {editingProduct?.overview_images?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {editingProduct.overview_images.map((img: string, i: number) => (
                            <div key={i} className="relative group">
                              <img src={getPublicUrl(img)} alt="" className="h-16 w-16 object-cover rounded border" />
                              <button
                                type="button"
                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeOverviewImage(editingProduct, img)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button className="w-full" onClick={handleSaveProduct} disabled={saving || !productForm.title || !productForm.price}>
                      {saving ? "Saving..." : "Save Product"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Bundle Dialog */}
            <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    {editingBundle ? "Edit Bundle" : "Create Bundle"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Bundle Name</Label>
                    <Input
                      value={bundleForm.title}
                      onChange={(e) => setBundleForm({ ...bundleForm, title: e.target.value })}
                      placeholder="e.g. Summit Complete Pack"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={bundleForm.description}
                      onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })}
                      placeholder="Describe what's included in this bundle..."
                    />
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <Select value={bundleForm.tier} onValueChange={(v) => setBundleForm({ ...bundleForm, tier: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KB_TIERS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bundle Price (€)</Label>
                    <Input
                      type="number"
                      value={bundleForm.price}
                      onChange={(e) => setBundleForm({ ...bundleForm, price: e.target.value })}
                      placeholder="Set a discounted bundle price"
                    />
                  </div>

                  {/* Product selection */}
                  <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-3">
                    <Label className="font-semibold">Select Products to Include</Label>
                    <p className="text-xs text-muted-foreground">Choose at least 2 existing products to group into this bundle.</p>
                    {availableProductsForBundle.length === 0 ? (
                      <p className="text-sm text-destructive">No active products available. Create individual products first.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableProductsForBundle.map((p: any) => (
                          <label
                            key={p.id}
                            className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                              bundleForm.bundle_product_ids.includes(p.id)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={bundleForm.bundle_product_ids.includes(p.id)}
                              onCheckedChange={(checked) => {
                                setBundleForm((prev) => ({
                                  ...prev,
                                  bundle_product_ids: checked
                                    ? [...prev.bundle_product_ids, p.id]
                                    : prev.bundle_product_ids.filter((id) => id !== p.id),
                                }));
                              }}
                            />
                            <span className="text-sm flex-1">{p.title}</span>
                            <Badge variant="outline" className="text-xs">{p.category} — €{p.price}</Badge>
                          </label>
                        ))}
                      </div>
                    )}
                    {bundleForm.bundle_product_ids.length > 0 && (
                      <p className="text-xs text-primary font-medium">
                        {bundleForm.bundle_product_ids.length} product{bundleForm.bundle_product_ids.length > 1 ? "s" : ""} selected
                        {bundleForm.price && (() => {
                          const originalTotal = availableProductsForBundle
                            .filter((p: any) => bundleForm.bundle_product_ids.includes(p.id))
                            .reduce((sum: number, p: any) => sum + Number(p.price), 0);
                          const savings = originalTotal - Number(bundleForm.price);
                          return savings > 0 ? ` • Original: €${originalTotal} → Save €${savings.toFixed(0)}` : "";
                        })()}
                      </p>
                    )}
                  </div>

                  {/* Overview Images for bundle */}
                  <div>
                    <Label className="flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Overview Images</Label>
                    <Input type="file" accept="image/*" multiple onChange={(e) => setOverviewFiles(Array.from(e.target.files || []))} />
                    <p className="text-xs text-muted-foreground mt-1">Upload images that users can preview.</p>
                    {editingBundle?.overview_images?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {editingBundle.overview_images.map((img: string, i: number) => (
                          <div key={i} className="relative group">
                            <img src={getPublicUrl(img)} alt="" className="h-16 w-16 object-cover rounded border" />
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeOverviewImage(editingBundle, img)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleSaveBundle}
                    disabled={saving || !bundleForm.title || !bundleForm.price || bundleForm.bundle_product_ids.length < 2}
                  >
                    {saving ? "Saving..." : editingBundle ? "Update Bundle" : "Create Bundle"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.title}
                      {p.is_bundle && <Badge className="ml-2 text-xs bg-primary/20 text-primary">Bundle</Badge>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.tier || categoryToTier(p.category)}</Badge></TableCell>
                    <TableCell>€{Number(p.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{p.asset_filename || "—"}</span>
                        {p.overview_images?.length > 0 && (
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => viewOverviewImages(p)}>
                            <Eye className="h-3 w-3 mr-1" />{p.overview_images.length} img
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={p.is_active} onCheckedChange={() => toggleProductActive(p)} />
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => { setDeletingProduct(p); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client, email, order ID, product..."
                  className="pl-9"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
              </div>
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={orderCategoryFilter} onValueChange={setOrderCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Take Off & Layover">Take Off & Layover</SelectItem>
                  <SelectItem value="Summit">Summit</SelectItem>
                  <SelectItem value="Altitude">Altitude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id.substring(0, 8)}...</TableCell>
                    <TableCell className="text-sm">
                      {new Date(o.created_at).toLocaleDateString()}{" "}
                      <span className="text-muted-foreground text-xs">{new Date(o.created_at).toLocaleTimeString()}</span>
                    </TableCell>
                    <TableCell>{o.client_users?.first_name} {o.client_users?.last_name}</TableCell>
                    <TableCell className="text-sm">{o.client_users?.email}</TableCell>
                    <TableCell className="text-sm">{o.client_users?.phone}</TableCell>
                    <TableCell className="text-sm">
                      {o.kb_order_items?.map((i: any) => i.kb_products?.title).join(", ")}
                    </TableCell>
                    <TableCell className="font-semibold">€{o.total_amount}</TableCell>
                    <TableCell>
                      <Badge variant={o.payment_status === "approved" ? "default" : "secondary"}>
                        {o.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {o.payment_receipt_url && (
                        <Button variant="ghost" size="sm" onClick={() => viewReceipt(o.payment_receipt_url)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.payment_status === "pending" && (
                        <Button size="sm" onClick={() => approveOrder(o)}>Approve</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, product..."
                className="pl-9"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.client_users?.first_name} {a.client_users?.last_name}</TableCell>
                    <TableCell className="text-sm">{a.client_users?.email}</TableCell>
                    <TableCell className="text-sm">{a.client_users?.phone}</TableCell>
                    <TableCell className="text-sm">{a.kb_products?.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.kb_products?.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={a.is_blocked ? "destructive" : "default"}>
                        {a.is_blocked ? "Blocked" : "Active"}
                      </Badge>
                      {a.block_reason && <p className="text-xs text-muted-foreground mt-1">{a.block_reason}</p>}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={a.is_blocked ? "outline" : "destructive"}
                        onClick={() => openBlockDialog(a)}
                      >
                        {a.is_blocked ? "Unblock" : "Block"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No clients found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Recent admin actions (last 200)</p>
              <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
                Refresh
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString()}{" "}
                      {new Date(log.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-medium">{log.admin_username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.target_type && `${log.target_type}`}
                      {log.target_id && <span className="text-muted-foreground ml-1">({log.target_id.substring(0, 8)}...)</span>}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.details}</TableCell>
                  </TableRow>
                ))}
                {auditLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No audit logs yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>

      {/* Block Confirmation Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {blockTarget?.is_blocked ? "Unblock Client Access" : "Block Client Access"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Client: <strong>{blockTarget?.client_users?.first_name} {blockTarget?.client_users?.last_name}</strong>
              <br />
              Product: <strong>{blockTarget?.kb_products?.title}</strong>
            </p>
            {!blockTarget?.is_blocked && (
              <div>
                <Label>Reason for blocking (mandatory) *</Label>
                <Textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Enter the reason for blocking this client's access..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
            <Button
              variant={blockTarget?.is_blocked ? "default" : "destructive"}
              onClick={handleBlockClient}
              disabled={!blockTarget?.is_blocked && !blockReason.trim()}
            >
              {blockTarget?.is_blocked ? "Unblock" : "Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Viewer Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {receiptUrl && (
            <div className="max-h-[70vh] overflow-auto">
              <img src={receiptUrl} alt="Payment Receipt" className="w-full rounded" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }} />
              <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                <Button variant="outline" className="w-full">
                  <FileText className="mr-2 h-4 w-4" /> Open in New Tab
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{deletingProduct?.title}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overview Images Preview Dialog */}
      <Dialog open={overviewPreviewOpen} onOpenChange={setOverviewPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Overview Images</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overviewPreviewImages.map((url, i) => (
              <img key={i} src={url} alt={`Overview ${i + 1}`} className="w-full rounded-lg border" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBaseAdmin;
