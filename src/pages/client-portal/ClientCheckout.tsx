import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, ShoppingCart, Trash2, User, LogIn, CalendarIcon, Clock, MessageCircle, Mail, Phone, FileText, Upload as UploadIcon, X as XIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import bcrypt from "bcryptjs";
import bgImage from "@/assets/client-portal-bg.jpeg";
import { BriefOverviewForm, BriefOverviewData } from "@/components/client-portal/BriefOverviewForm";
import OutreachCheckinDialog from "@/components/client-portal/OutreachCheckinDialog";
import CheckoutAssociateProfiles, { CheckoutProfilesEntry } from "@/components/client-portal/CheckoutAssociateProfiles";
import { placeClientOrder, type PlaceOrderItem, type PlaceMeetingSlot, type PlaceSharedDoc } from "@/lib/placeClientOrder";

const sb = supabase as any;

// Time slots for meeting availability
const TIME_SLOTS = [
  { value: "09:00-10:00", label: "09:00 - 10:00" },
  { value: "10:00-11:00", label: "10:00 - 11:00" },
  { value: "11:00-12:00", label: "11:00 - 12:00" },
  { value: "12:00-13:00", label: "12:00 - 13:00" },
  { value: "13:00-14:00", label: "13:00 - 14:00" },
  { value: "14:00-15:00", label: "14:00 - 15:00" },
  { value: "15:00-16:00", label: "15:00 - 16:00" },
  { value: "16:00-17:00", label: "16:00 - 17:00" },
  { value: "17:00-18:00", label: "17:00 - 18:00" },
  { value: "18:00-19:00", label: "18:00 - 19:00" },
  { value: "19:00-20:00", label: "19:00 - 20:00" },
  { value: "20:00-21:00", label: "20:00 - 21:00" },
];

interface AvailabilitySlot {
  date: Date | undefined;
  timeSlot: string;
}

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
  specificRequest?: string;
  packageGroupId?: string;
  packageName?: string;
  packageRole?: "component" | "addon";
}

const ClientCheckout = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<GuestCartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");
  
  // One set of 3 availability slots for the whole order. The client picks 3
  // preferred date/time windows once and they apply to every meeting in the
  // order — a single Associate runs the package, so per-service slots made no
  // sense; comparative's 2nd Associate reuses the same windows.
  const [orderSlots, setOrderSlots] = useState<AvailabilitySlot[]>([
    { date: undefined, timeSlot: "" },
    { date: undefined, timeSlot: "" },
    { date: undefined, timeSlot: "" },
  ]);
  
  // Login form
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  
  // Signup form
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    studentStatus: "",
    linkedinUrl: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [briefOverviewData, setBriefOverviewData] = useState<BriefOverviewData | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Outreach Power Pack specific state
  // Outreach Power Pack — free check-in (no upfront charge, billed per interview).
  const [outreachDialogOpen, setOutreachDialogOpen] = useState(false);
  const [outreachCheckinBooked, setOutreachCheckinBooked] = useState(false);

  // CV / Cover Letter Rewrite (Altitude): skip-meeting toggle + uploaded docs per cart item
  const [cvRewriteSkipMeeting, setCvRewriteSkipMeeting] = useState<Record<string, boolean>>({});
  const [cvRewriteCvFile, setCvRewriteCvFile] = useState<Record<string, File | null>>({});
  const [cvRewriteCoverLetterFile, setCvRewriteCoverLetterFile] = useState<Record<string, File | null>>({});

  const isCvRewriteItem = (item: GuestCartItem) =>
    (item.service.category || '').toLowerCase() === 'altitude' &&
    item.service.name === 'CV / Cover Letter Rewrite';

  // Logged in user
  const [clientUser, setClientUser] = useState<any>(null);
  
  // Minimum date: 1 week from now
  const minDate = addDays(new Date(), 7);
  const availabilitySectionRef = useRef<HTMLDivElement | null>(null);
  const [availabilityNeedsAttention, setAvailabilityNeedsAttention] = useState(false);

  // Items that require an associate meeting (excludes CV-rewrite items where client skipped the meeting)
  const itemsNeedingMeeting = (items: GuestCartItem[]) =>
    items.filter(item => item.associate && !(isCvRewriteItem(item) && cvRewriteSkipMeeting[item.id]));

  const updateOrderSlot = (slotIndex: number, field: 'date' | 'timeSlot', value: Date | string | undefined) => {
    setOrderSlots(prev => prev.map((slot, i) => {
      if (i !== slotIndex) return slot;
      return field === 'date'
        ? { ...slot, date: value as Date | undefined }
        : { ...slot, timeSlot: value as string };
    }));
  };

  const hasValidAvailability = () => {
    // Only required when at least one item in the order needs a meeting.
    if (itemsNeedingMeeting(cartItems).length === 0) return true;
    // All 3 order slots must be filled and fall on 3 different days.
    if (!orderSlots.every(slot => slot.date && slot.timeSlot)) return false;
    const days = orderSlots.map(s => format(s.date!, "yyyy-MM-dd"));
    return new Set(days).size === 3;
  };

  useEffect(() => {
    // Load cart
    const savedCart = localStorage.getItem('guest_cart');
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        if (items.length === 0) {
          navigate('/client-portal/services');
          return;
        }
        setCartItems(items);
      } catch (e) {
        navigate('/client-portal/services');
      }
    } else {
      navigate('/client-portal/services');
    }

    // Check if already logged in
    const user = localStorage.getItem('client_user');
    if (user) {
      setClientUser(JSON.parse(user));
    }
  }, [navigate]);

  const isOutreachItem = (item: GuestCartItem) => !!item.service.name?.startsWith('Outreach Power Pack');

  const calculateTotals = () => {
    // Outreach Power Pack is pay-per-interview (free check-in) → excluded from the total.
    const subtotal = cartItems.reduce(
      (sum, item) => (isOutreachItem(item) ? sum : sum + Number(item.service.price)),
      0
    );
    return { subtotal, discountPercentage: 0, discountAmount: 0, total: subtotal };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const { data: user, error } = await sb
        .from('client_users')
        .select('*')
        .eq('email', loginData.email.toLowerCase())
        .single();

      if (error || !user) {
        throw new Error('Invalid email or password');
      }

      const isValid = await bcrypt.compare(loginData.password, user.password_hash);
      if (!isValid) {
        throw new Error('Invalid email or password');
      }

      if (user.status !== 'approved') {
        throw new Error('Your account is pending approval. Please wait for confirmation.');
      }

      localStorage.setItem('client_user', JSON.stringify(user));
      setClientUser(user);
      toast.success('Logged in successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.studentStatus) {
      toast.error("Please select your status");
      return;
    }

    const isGraduateOrProfessional = signupData.studentStatus === "graduate" || signupData.studentStatus === "professional";
    
    // Validate CV or Brief Overview
    if (isGraduateOrProfessional && !cvFile) {
      setShowValidation(true);
      toast.error("Please upload your CV to continue");
      return;
    }
    
    if (!isGraduateOrProfessional && !cvFile && !briefOverviewData) {
      setShowValidation(true);
      toast.error("Please upload your CV or complete the Brief Overview form");
      return;
    }
    
    if (signupData.password !== signupData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (signupData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsProcessing(true);

    try {
      // Upload CV if provided
      let cvUrl = null;
      if (cvFile) {
        const fileExt = cvFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await sb.storage
          .from('documents')
          .upload(`client-cvs/${fileName}`, cvFile);

        if (uploadError) throw uploadError;
        cvUrl = uploadData.path;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(signupData.password, 10);

      // Create user (auto-approved for checkout flow)
      const { data: newUser, error } = await sb
        .from('client_users')
        .insert({
          first_name: signupData.firstName,
          last_name: signupData.lastName,
          email: signupData.email.toLowerCase(),
          phone: signupData.phone,
          password_hash: passwordHash,
          student_status: signupData.studentStatus,
          linkedin_url: signupData.linkedinUrl || null,
          cv_url: cvUrl,
          brief_overview: briefOverviewData || null,
          status: 'approved', // Auto-approve for checkout
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('An account with this email already exists. Please login instead.');
        }
        throw error;
      }

      localStorage.setItem('client_user', JSON.stringify(newUser));
      setClientUser(newUser);
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!clientUser) {
      toast.error("Please login or create an account to continue");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    // Validate Expert Career Session specific request
    const expertSessionItem = cartItems.find(item => item.service.name === 'Expert Career Session (1:1)');
    if (expertSessionItem && (!expertSessionItem.specificRequest || expertSessionItem.specificRequest.trim() === '')) {
      toast.error("Please describe what you need help with for your Expert Career Session");
      return;
    }

    // Validate Associate Office Hours reason for call (skipped for package components —
    // these are bundled deliverables, not a standalone call the client books a reason for).
    const officeHoursItems = cartItems.filter(item => item.service.name === 'Associate Office Hours' && !item.packageGroupId);
    for (const item of officeHoursItems) {
      if (!item.specificRequest || item.specificRequest.trim() === '') {
        toast.error("Please describe the reason for your call for Associate Office Hours");
        return;
      }
    }

    // Outreach Power Pack: no documents at checkout — it's handled via a free
    // check-in (booked from its own popup) and billed per interview, not here.

    // Validate CV / Cover Letter Rewrite items with skip-meeting option: require at least one document
    for (const item of cartItems) {
      if (isCvRewriteItem(item) && cvRewriteSkipMeeting[item.id]) {
        const cv = cvRewriteCvFile[item.id];
        const cl = cvRewriteCoverLetterFile[item.id];
        if (!cv && !cl) {
          toast.error("Please upload your CV and/or Cover Letter for the CV / Cover Letter Rewrite service.");
          return;
        }
      }
    }



    
    if (!hasValidAvailability()) {
      toast.error("Please complete all 3 time slots, each on a different day.");
      setAvailabilityNeedsAttention(true);
      window.setTimeout(() => setAvailabilityNeedsAttention(false), 1200);
      availabilitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsProcessing(true);

    try {
      const { discountPercentage } = calculateTotals();

      // ── Upload files to storage NOW (File objects can't survive the Stripe
      //    redirect), but DO NOT create any order / project / slot yet. Those are
      //    created only after the payment is confirmed (see PaymentSuccess), so
      //    nothing reaches the Associate until the client has actually paid.

      // Receipt (optional manual upload)
      let receiptUrl: string | null = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${clientUser.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await sb.storage
          .from('documents')
          .upload(`client-receipts/${fileName}`, receiptFile);
        if (uploadError) throw uploadError;
        receiptUrl = uploadData.path;
      }

      // Outreach Power Pack is never charged at checkout (pay-per-interview, handled
      // via its free check-in popup), so no documents/fields are collected here.
      const outreachCvUrl: string | null = null;
      const outreachCoverLetterUrl: string | null = null;

      // Build the per-item order data (resolved associate, slots, CV-rewrite docs).
      const orderItems: PlaceOrderItem[] = [];
      for (const item of cartItems) {
        const isCvRewriteNoMeeting = isCvRewriteItem(item) && !!cvRewriteSkipMeeting[item.id];

        // For Comparative items the deliverable is produced by the 2nd associate.
        const isComparative = !!(item.associates && item.associates.length === 2);
        const resolvedAssociateId = isComparative
          ? item.associates![1].id
          : (item.associate?.id || null);
        const associateName = isComparative
          ? `${item.associates![1].first_name} ${item.associates![1].last_name}`
          : item.associate
          ? `${item.associate.first_name} ${item.associate.last_name}`
          : null;

        // Upload CV-rewrite docs now (no project id yet → use a pending path; the
        // stored path is what client_shared_documents references, prefix is irrelevant).
        const cvRewriteDocs: PlaceSharedDoc[] = [];
        if (isCvRewriteNoMeeting) {
          const uploads: Array<{ file: File; label: string }> = [];
          const cv = cvRewriteCvFile[item.id];
          const cl = cvRewriteCoverLetterFile[item.id];
          if (cv) uploads.push({ file: cv, label: 'CV' });
          if (cl) uploads.push({ file: cl, label: 'CoverLetter' });
          for (const u of uploads) {
            const safeName = u.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `pending/${clientUser.id}/${Date.now()}_${u.label}_${safeName}`;
            const { error: upErr } = await sb.storage
              .from('client-project-documents')
              .upload(path, u.file);
            if (upErr) throw upErr;
            cvRewriteDocs.push({
              path,
              filename: u.file.name,
              fileSize: u.file.size,
              mimeType: u.file.type || 'application/octet-stream',
            });
          }
        }

        // Meeting slots — the single order-level availability applies to every
        // meeting in the order (same Associate, or comparative's 2nd Associate).
        const slots: PlaceMeetingSlot[] = [];
        if (resolvedAssociateId && !isCvRewriteNoMeeting) {
          for (const slot of orderSlots) {
            if (slot.date && slot.timeSlot) {
              const dateStr = format(slot.date, "yyyy-MM-dd");
              slots.push({ proposedDate: dateStr, proposedTime: `${dateStr} ${slot.timeSlot}` });
            }
          }
        }

        orderItems.push({
          serviceId: item.service.id,
          serviceName: item.service.name,
          price: Number(item.service.price),
          resolvedAssociateId,
          associateName,
          isCvRewriteNoMeeting,
          specificRequest: item.specificRequest || null,
          additionalCallReason: (item as any).additionalCallReason || null,
          packageName: item.packageName || null,
          slots,
          cvRewriteDocs,
        });
      }

      // Create the order group(s) NOW, unpaid. Associate groups wait for the
      // associate to confirm a meeting time before payment is due; the immediate
      // group (no associate/meeting) is paid right away via Stripe below.
      const placed = await placeClientOrder({
        clientId: clientUser.id,
        discountPercentage,
        receiptUrl,
        outreachCvUrl,
        outreachCoverLetterUrl,
        outreachCustomEmail: null,
        items: orderItems,
      });

      // Notify the associate (+ admin + client) for each unpaid associate order:
      // "new request — please confirm a time".
      await Promise.allSettled(
        placed.associateOrders.map((o) =>
          supabase.functions.invoke('send-order-email', { body: { orderId: o.orderId, type: 'order_received' } })
        )
      );

      localStorage.removeItem('guest_cart');

      // If there's an immediate group with a real amount, pay it now. (A €0 immediate
      // group — e.g. pay-per-result services — needs no Stripe redirect.)
      if (placed.immediate && placed.immediate.amount > 0) {
        const origin = window.location.origin;
        const factor = discountPercentage > 0 ? 1 - discountPercentage / 100 : 1;
        const immediateItems = cartItems.filter((it) => {
          const isComp = !!(it.associates && it.associates.length === 2);
          const rid = isComp ? it.associates![1].id : (it.associate?.id || null);
          const noMeeting = isCvRewriteItem(it) && !!cvRewriteSkipMeeting[it.id];
          if (it.service.name?.startsWith('Outreach Power Pack')) return false; // never charged
          return !(rid && !noMeeting); // immediate = anything that doesn't need an associate meeting
        });
        const lineItems = immediateItems.map((item) => ({
          name: item.service.name,
          amount: Math.round(Number(item.service.price) * factor * 100) / 100,
          quantity: 1,
        }));

        const { data: stripeSession, error: stripeError } = await supabase.functions.invoke(
          'create-payment',
          {
            body: {
              customer_email: clientUser.email,
              success_url: `${origin}/payment-success?kind=client_order&session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${origin}/payment-canceled?kind=client_order`,
              items: lineItems,
              metadata: {
                kind: 'client_order',
                order_id: placed.immediate.orderId,
                client_id: clientUser.id,
              },
            },
          }
        );
        if (stripeError) throw stripeError;
        if (!stripeSession?.url) throw new Error('Stripe session URL missing');

        const sessionId = stripeSession.session_id || stripeSession.id;
        if (sessionId) {
          await sb.from('client_orders')
            .update({ stripe_session_id: sessionId })
            .eq('id', placed.immediate.orderId);
        }

        // Redirect to Stripe Checkout — break out of any iframe (Lovable preview, etc.)
        toast.success('Opening secure Stripe Checkout…');
        try {
          if (window.top && window.top !== window.self) {
            window.top.location.href = stripeSession.url;
          } else {
            window.location.href = stripeSession.url;
          }
        } catch {
          window.open(stripeSession.url, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      // No immediate payment due: everything waits for the associate's confirmation.
      toast.success("Request sent! Your associate will confirm a time, then you'll be able to pay.");
      navigate('/client-portal/dashboard');
      return;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || "Failed to complete checkout");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    // Package components share one packageGroupId — removing any of them clears
    // the whole package so nothing is left behind.
    const target = cartItems.find(item => item.id === itemId);
    const groupId = target?.packageGroupId;
    const newItems = groupId
      ? cartItems.filter(item => item.packageGroupId !== groupId)
      : cartItems.filter(item => item.id !== itemId);
    setCartItems(newItems);
    localStorage.setItem('guest_cart', JSON.stringify(newItems));

    if (newItems.length === 0) {
      navigate('/client-portal/services');
    }
  };

  const updateItemSpecificRequest = (itemId: string, value: string) => {
    const newItems = cartItems.map(item => 
      item.id === itemId ? { ...item, specificRequest: value } : item
    );
    setCartItems(newItems);
    localStorage.setItem('guest_cart', JSON.stringify(newItems));
  };

  const { subtotal, discountPercentage, discountAmount, total } = calculateTotals();

  // Split the cart total into "pay now" (no associate/meeting) vs "pay after the
  // associate confirms a time". Drives the payment copy + button label below.
  const paymentSplit = (() => {
    let payNow = 0;
    let payLater = 0;
    for (const item of cartItems) {
      // Outreach Power Pack is never charged here (free check-in, pay per interview).
      if (item.service.name?.startsWith('Outreach Power Pack')) continue;
      const isComp = !!(item.associates && item.associates.length === 2);
      const rid = isComp ? item.associates![1].id : (item.associate?.id || null);
      const noMeeting = isCvRewriteItem(item) && !!cvRewriteSkipMeeting[item.id];
      const needsMeeting = !!rid && !noMeeting;
      if (needsMeeting) payLater += Number(item.service.price);
      else payNow += Number(item.service.price);
    }
    return { payNow, payLater };
  })();

  const payButtonLabel = isProcessing
    ? "Processing…"
    : paymentSplit.payNow > 0 && paymentSplit.payLater > 0
    ? `Place order & pay €${paymentSplit.payNow.toFixed(2)} now`
    : paymentSplit.payNow > 0
    ? `Pay €${paymentSplit.payNow.toFixed(2)} with Stripe`
    : "Place order — pay after confirmation";

  return (
    <div 
      className="min-h-screen p-4 md:p-6 relative overflow-y-auto"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="fixed inset-0 bg-black/40 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/client-portal/services')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Checkout</h1>
          </div>
          
          {/* Contact Us */}
          <div className="flex items-center gap-3">
            <a 
              href="https://wa.me/447826932893" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <a 
              href="mailto:CareerPilot.team@gmail.com"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Summary + Availability */}
          <div className="flex flex-col gap-4">
            <Card className="backdrop-blur-sm bg-background/95 shadow-lg">
              <CardHeader className="py-4 px-5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-4">
                {cartItems.map((item) => {
                  const isComparative = item.associates && item.associates.length === 2;
                  const gid = item.packageGroupId;
                  const inPackage = !!gid;
                  const groupItems = inPackage ? cartItems.filter((i) => i.packageGroupId === gid) : [];
                  const isFirstOfGroup = inPackage && groupItems[0]?.id === item.id;
                  const groupTotal = groupItems.reduce((s, i) => s + Number(i.service.price), 0);
                  return (
                    <div key={item.id}>
                      {isFirstOfGroup && (
                        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Package</p>
                            <h4 className="font-semibold leading-tight">{item.packageName || "Package"}</h4>
                            {item.associate && (
                              <p className="text-xs text-muted-foreground">
                                with {item.associate.first_name} {item.associate.last_name}
                              </p>
                            )}
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {groupItems.length} item{groupItems.length > 1 ? "s" : ""} included
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-lg font-bold">€{groupTotal.toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" /> Remove
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className={cn("flex items-start justify-between gap-2", inPackage ? "pb-2 pl-3" : "border-b pb-3")}>
                      <div className="flex-1 min-w-0">
                        {!inPackage && item.packageName && (
                          <Badge variant="outline" className="mb-1 border-primary/40 text-primary text-[10px]">
                            {item.packageRole === "addon" ? "Add-on" : "Package"}: {item.packageName}
                          </Badge>
                        )}
                        <h4 className="font-medium">{item.service.name}</h4>
                        {!inPackage && <p className="text-sm text-muted-foreground">{item.service.category}</p>}
                        {isComparative ? (
                          <div className="space-y-2 mt-2">
                            {item.associates!.map((assoc, idx) => (
                              <div key={assoc.id} className="text-sm">
                                <span className="font-medium">Associate {idx + 1}:</span> {assoc.first_name} {assoc.last_name}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {assoc.university && <Badge variant="secondary" className="text-xs">{assoc.university}</Badge>}
                                  {assoc.master_program && <Badge variant="secondary" className="text-xs">{assoc.master_program}</Badge>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : item.associate && (
                          <p className="text-sm">
                            Associate: {item.associate.first_name} {item.associate.last_name}
                          </p>
                        )}
                        {!isComparative && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.university && <Badge variant="secondary">{item.university}</Badge>}
                            {item.sector && <Badge variant="outline">{item.sector}</Badge>}
                          </div>
                        )}
                        {isComparative && item.sector && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline">{item.sector}</Badge>
                          </div>
                        )}
                        {/* Specific Request field for Expert Career Session */}
                        {item.service.name === 'Expert Career Session (1:1)' && (
                          <div className="mt-3 space-y-1">
                            <Label className="text-xs font-medium">What do you need help with? <span className="text-destructive">*</span></Label>
                            <textarea
                              className="w-full min-h-[80px] p-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="E.g., interview prep for consulting firms, Excel modeling test preparation, CV review for finance roles..."
                              value={item.specificRequest || ''}
                              onChange={(e) => updateItemSpecificRequest(item.id, e.target.value)}
                            />
                          </div>
                        )}
                        {/* Reason for Call field for Associate Office Hours */}
                        {item.service.name === 'Associate Office Hours' && (
                          <div className="mt-3 space-y-1">
                            <Label className="text-xs font-medium">Reason for Call <span className="text-destructive">*</span></Label>
                            <textarea
                              className="w-full min-h-[80px] p-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="E.g., SAT preparation, GMAT prep, mock interview, study strategies, career advice..."
                              value={item.specificRequest || ''}
                              onChange={(e) => updateItemSpecificRequest(item.id, e.target.value)}
                            />
                          </div>
                        )}
                        {/* CV / Cover Letter Rewrite (Altitude): meeting vs upload-only choice */}
                        {isCvRewriteItem(item) && (
                          <div className="mt-3 space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                            <Label className="text-xs font-semibold">How would you like the Associate to work on your documents?</Label>
                            <div className="flex flex-col gap-2">
                              <label className="flex items-start gap-2 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name={`cv-rewrite-mode-${item.id}`}
                                  checked={!cvRewriteSkipMeeting[item.id]}
                                  onChange={() => setCvRewriteSkipMeeting(prev => ({ ...prev, [item.id]: false }))}
                                  className="mt-0.5"
                                />
                                <span>
                                  <span className="font-medium">Schedule a meeting with the Associate</span>
                                  <span className="text-muted-foreground"> — the Associate will take notes on your background and goals during the call before rewriting your CV / Cover Letter.</span>
                                </span>
                              </label>
                              <label className="flex items-start gap-2 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name={`cv-rewrite-mode-${item.id}`}
                                  checked={!!cvRewriteSkipMeeting[item.id]}
                                  onChange={() => setCvRewriteSkipMeeting(prev => ({ ...prev, [item.id]: true }))}
                                  className="mt-0.5"
                                />
                                <span>
                                  <span className="font-medium">Skip the meeting — I'll upload my CV and/or Cover Letter</span>
                                  <span className="text-muted-foreground"> — the Associate will rewrite the documents you provide. You can upload one or both.</span>
                                </span>
                              </label>
                            </div>

                            {cvRewriteSkipMeeting[item.id] && (
                              <div className="space-y-3 pt-2 border-t border-primary/20">
                                {/* CV */}
                                <div className="space-y-1">
                                  <Label className="text-xs">Your CV (optional if you upload a Cover Letter)</Label>
                                  {cvRewriteCvFile[item.id] ? (
                                    <div className="flex items-center justify-between p-2 bg-background rounded border text-xs">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-3 w-3 shrink-0 text-primary" />
                                        <span className="truncate">{cvRewriteCvFile[item.id]!.name}</span>
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => setCvRewriteCvFile(prev => ({ ...prev, [item.id]: null }))}
                                      >
                                        <XIcon className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      className="text-xs h-8"
                                      onChange={(e) => setCvRewriteCvFile(prev => ({ ...prev, [item.id]: e.target.files?.[0] || null }))}
                                    />
                                  )}
                                </div>
                                {/* Cover Letter */}
                                <div className="space-y-1">
                                  <Label className="text-xs">Your Cover Letter (optional if you upload a CV)</Label>
                                  {cvRewriteCoverLetterFile[item.id] ? (
                                    <div className="flex items-center justify-between p-2 bg-background rounded border text-xs">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-3 w-3 shrink-0 text-primary" />
                                        <span className="truncate">{cvRewriteCoverLetterFile[item.id]!.name}</span>
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => setCvRewriteCoverLetterFile(prev => ({ ...prev, [item.id]: null }))}
                                      >
                                        <XIcon className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      className="text-xs h-8"
                                      onChange={(e) => setCvRewriteCoverLetterFile(prev => ({ ...prev, [item.id]: e.target.files?.[0] || null }))}
                                    />
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Upload at least one document. Files will be visible to you, your Associate, and the admin team in the project area.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!inPackage && (
                        <div className="flex items-center gap-2">
                          {isOutreachItem(item) ? (
                            <span className="text-sm font-semibold text-amber-600 whitespace-nowrap">Free check-in</span>
                          ) : (
                            <span className="font-bold text-lg">€{item.service.price.toFixed(2)}</span>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                      </div>
                    </div>
                  );
                })}

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>€{subtotal.toFixed(2)}</span>
                  </div>
                  {discountPercentage > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discountPercentage}%):</span>
                      <span>-€{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Clear next-step choice: keep shopping or move on to account/payment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                  <Button variant="outline" onClick={() => navigate('/client-portal/services')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Browse other services
                  </Button>
                  <Button
                    onClick={() => {
                      if (clientUser) {
                        handleCheckout();
                      } else {
                        document.getElementById('checkout-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  >
                    Proceed to checkout
                    <CreditCard className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Outreach Power Pack — free check-in required (pay per interview, €0 now) */}
            {cartItems.some(isOutreachItem) && (
              <Card className="backdrop-blur-sm bg-amber-50/95 dark:bg-amber-950/30 border-amber-200 shadow-lg">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white text-lg">📣</div>
                    <div>
                      <h3 className="font-bold text-amber-900 dark:text-amber-200">Outreach Power Pack — free check-in required</h3>
                      <p className="text-sm text-amber-800/90 dark:text-amber-200/80 mt-1">
                        This is <strong>pay-per-interview</strong>: €250 only when we secure an interview in your target sectors &amp; cities — <strong>nothing is charged now</strong>. First, book a quick free check-in so we can explain how it works.
                      </p>
                    </div>
                  </div>
                  {outreachCheckinBooked ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                      ✅ Check-in requested — we'll confirm a time by email.
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:opacity-90"
                      onClick={() => setOutreachDialogOpen(true)}
                    >
                      Book your free check-in
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <OutreachCheckinDialog
              open={outreachDialogOpen}
              onClose={() => setOutreachDialogOpen(false)}
              clientId={clientUser?.id || null}
              defaultName={clientUser ? `${clientUser.first_name} ${clientUser.last_name}` : ''}
              defaultEmail={clientUser?.email || ''}
              onConfirmed={() => setOutreachCheckinBooked(true)}
            />
            
            {/* Meeting Availability Selection - Per Service */}
            {itemsNeedingMeeting(cartItems).length > 0 && (
              <div ref={availabilitySectionRef}>
                <Card className={cn(
                  "backdrop-blur-sm bg-background/95 shadow-lg transition-shadow",
                  availabilityNeedsAttention && "ring-2 ring-primary"
                )}>
                <CardHeader className="py-4 px-5">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarIcon className="h-5 w-5" />
                    Meeting Availability
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Select 3 preferred time slots for each service. Your Associate will confirm the final time. <span className="font-medium">(All times are in Italian timezone - CET/CEST)</span>
                    <span className="mt-2 block rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
                      <span className="font-semibold">Tip:</span> weekend slots (Saturday & Sunday) are strongly recommended. Our Associates work on Take Off, Summit and Layover services during the week, so weekend availability greatly increases the chance of a quick confirmation.
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-6">
                  <p className="text-xs text-muted-foreground">
                    Pick 3 time slots, each on a different day. The same availability is used for every meeting in your order.
                  </p>
                  {/* Mobile: stack the 3 slots full-width for usable pickers; 3-up from sm on (desktop unchanged) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((slotIndex) => {
                      const usedDateKeys = orderSlots.map(s => s.date ? format(s.date, "yyyy-MM-dd") : null);
                      return (
                      <div key={slotIndex} className="space-y-2">
                        <Label className="text-xs font-medium">Slot {slotIndex + 1}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left font-normal text-xs",
                                !orderSlots[slotIndex].date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {orderSlots[slotIndex].date
                                ? format(orderSlots[slotIndex].date!, "dd/MM")
                                : "Date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={orderSlots[slotIndex].date}
                              onSelect={(date) => updateOrderSlot(slotIndex, 'date', date)}
                              disabled={(date) => {
                                if (date < minDate) return true;
                                const k = format(date, "yyyy-MM-dd");
                                return usedDateKeys.some((u, idx) => idx !== slotIndex && u === k);
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <Select
                          value={orderSlots[slotIndex].timeSlot}
                          onValueChange={(value) => updateOrderSlot(slotIndex, 'timeSlot', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            <SelectValue placeholder="Time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((slot) => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Dates available from {format(minDate, "dd MMM yyyy")}
                  </p>
                </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Account & Payment */}
          <div id="checkout-account" className="flex flex-col gap-4 min-h-0 scroll-mt-4">
            {clientUser ? (
              /* Logged in - show payment */
              <Card className="backdrop-blur-sm bg-background/95 shadow-lg">
                <CardHeader className="py-4 px-5">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Account
                  </CardTitle>
                  <CardDescription>
                    Logged in as {clientUser.first_name} {clientUser.last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('client_user');
                      setClientUser(null);
                    }}
                  >
                    Use Different Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Not logged in - show login/signup */
              <Card className="backdrop-blur-sm bg-background/95 shadow-lg">
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-lg">Complete Your Purchase</CardTitle>
                  <CardDescription>
                    Login or create an account to complete your order
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">
                        <LogIn className="h-4 w-4 mr-2" />
                        Login
                      </TabsTrigger>
                      <TabsTrigger value="signup">
                        <User className="h-4 w-4 mr-2" />
                        Create Account
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-3 mt-4">
                      <form onSubmit={handleLogin} className="space-y-3">
                        <div>
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="login-password">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={isProcessing}>
                          {isProcessing ? "Logging in..." : "Login"}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-3 mt-4">
                      <form onSubmit={handleSignup} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={signupData.firstName}
                              onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={signupData.lastName}
                              onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="signup-email">Email</Label>
                            <Input
                              id="signup-email"
                              type="email"
                              value={signupData.email}
                              onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={signupData.phone}
                              onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="studentStatus">Current Status *</Label>
                          <Select 
                            value={signupData.studentStatus} 
                            onValueChange={(value) => {
                              setSignupData({ ...signupData, studentStatus: value });
                              setShowValidation(false);
                              setBriefOverviewData(null);
                              setCvFile(null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select your status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high_school">High School Student</SelectItem>
                              <SelectItem value="university">University Student</SelectItem>
                              <SelectItem value="graduate">Graduate</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Brief Overview / CV Section */}
                        {signupData.studentStatus && (
                          <BriefOverviewForm
                            status={signupData.studentStatus}
                            cvFile={cvFile}
                            onCvChange={setCvFile}
                            onBriefOverviewChange={setBriefOverviewData}
                            briefOverviewData={briefOverviewData}
                            showValidation={showValidation}
                          />
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="signup-password">Password</Label>
                            <Input
                              id="signup-password"
                              type="password"
                              value={signupData.password}
                              onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={signupData.confirmPassword}
                              onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isProcessing}>
                          {isProcessing ? "Creating Account..." : "Create Account & Continue"}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Payment Section */}
            {clientUser && (
              <Card className="backdrop-blur-sm bg-background/95 shadow-lg flex-1">
                <CardHeader className="py-4 px-5">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Secure Payment by Stripe
                    </p>
                    {paymentSplit.payLater > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Your request is sent to your Associate first. <strong>You pay only after the Associate confirms your meeting time</strong> — you'll get an email with a secure payment button, and a payment banner will appear in your dashboard.
                        {paymentSplit.payNow > 0 && (
                          <> Services that don't need an associate (€{paymentSplit.payNow.toFixed(2)}) are paid now via Stripe.</>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        You will be redirected to Stripe to complete your payment securely. Once paid, your order is automatically confirmed.
                      </p>
                    )}
                  </div>

                  {/* Downloadable associate profiles (primary + backup per service) */}
                  {(() => {
                    const entries: CheckoutProfilesEntry[] = cartItems
                      .filter((item) => item.associate && !item.associate.id.includes(","))
                      .map((item) => ({
                        serviceItemId: item.id,
                        serviceLabel: item.service.name,
                        primaryId: item.associate!.id,
                      }));
                    return entries.length > 0 ? (
                      <CheckoutAssociateProfiles entries={entries} />
                    ) : null;
                  })()}

                  {/* Refund Policy Notice - Hide for University Eligibility Verification, show custom for Outreach Power Pack */}
                  {(() => {
                    const hasOutreachPowerPack = cartItems.some(item => item.service.name?.startsWith('Outreach Power Pack'));
                    const hasUniversityEligibility = cartItems.some(item => item.service.name === 'University Eligibility Verification');
                    const hasOtherServices = cartItems.some(item => 
                      !item.service.name?.startsWith('Outreach Power Pack') && 
                      item.service.name !== 'University Eligibility Verification'
                    );
                    
                    return (
                      <>
                        {/* Custom refund for Outreach Power Pack */}
                        {hasOutreachPowerPack && (
                          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                              Outreach Power Pack — Pay Per Interview
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-300">
                              You only pay <strong>€250 per interview secured</strong>. No upfront fee, no per-email cost. You will have access to the dedicated email account used for the outreach campaign so you can verify every conversation. The €250 charge applies only when one of the contacted leads turns into a confirmed interview.
                            </p>
                          </div>
                        )}
                        
                        {/* Standard refund for other services (excluding University Eligibility Verification) */}
                        {hasOtherServices && (
                          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                              Refund Guarantee
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-300">
                              If the Associate does not show up for the meeting or does not have the project ready, 
                              <strong> you are entitled to a full refund</strong>. Your satisfaction is our priority.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <Button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    {payButtonLabel}
                  </Button>

                  {!hasValidAvailability() && (
                    <p className="text-sm text-primary text-center">
                      Select all 3 slots (date + time) to proceed
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientCheckout;
