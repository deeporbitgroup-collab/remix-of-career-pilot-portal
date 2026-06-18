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
import OutreachDocumentsUpload from "@/components/client-portal/OutreachDocumentsUpload";
import BackupAssociateBlock, { BackupSelection } from "@/components/client-portal/BackupAssociateBlock";
import CheckoutAssociateProfiles, { CheckoutProfilesEntry } from "@/components/client-portal/CheckoutAssociateProfiles";
import { type PendingClientOrder, type PendingOrderItem, type PendingMeetingSlot, type PendingSharedDoc } from "@/lib/fulfillClientOrder";

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

// Per-service availability slots
interface ServiceAvailability {
  serviceItemId: string;
  slots: AvailabilitySlot[];
}

const ClientCheckout = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<GuestCartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");
  
  // Per-service availability slots (each service that requires an associate gets 3 time slots)
  const [serviceAvailabilities, setServiceAvailabilities] = useState<ServiceAvailability[]>([]);
  // Per-service backup associate selection + 3 slots
  const [backupSelections, setBackupSelections] = useState<Record<string, BackupSelection>>({});
  // Per-service number of available backup candidates (0 = backup hidden/not required)
  const [backupCandidatesCount, setBackupCandidatesCount] = useState<Record<string, number>>({});
  
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
  const [outreachCvFile, setOutreachCvFile] = useState<File | null>(null);
  const [outreachCoverLetterFile, setOutreachCoverLetterFile] = useState<File | null>(null);
  const [outreachCustomEmail, setOutreachCustomEmail] = useState("");
  const [useCustomEmail, setUseCustomEmail] = useState(false);

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

  // Initialize serviceAvailabilities when cart items change
  useEffect(() => {
    const servicesWithAssociates = itemsNeedingMeeting(cartItems);
    const newAvailabilities: ServiceAvailability[] = servicesWithAssociates.map(item => {
      // Check if we already have availability for this item
      const existing = serviceAvailabilities.find(sa => sa.serviceItemId === item.id);
      if (existing) return existing;
      return {
        serviceItemId: item.id,
        slots: [
          { date: undefined, timeSlot: "" },
          { date: undefined, timeSlot: "" },
          { date: undefined, timeSlot: "" },
        ]
      };
    });
    setServiceAvailabilities(newAvailabilities);
  }, [cartItems, cvRewriteSkipMeeting]);

  const updateServiceAvailabilitySlot = (serviceItemId: string, slotIndex: number, field: 'date' | 'timeSlot', value: Date | string | undefined) => {
    setServiceAvailabilities(prev => prev.map(sa => {
      if (sa.serviceItemId !== serviceItemId) return sa;
      const updatedSlots = [...sa.slots];
      if (field === 'date') {
        updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], date: value as Date | undefined };
      } else {
        updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], timeSlot: value as string };
      }
      return { ...sa, slots: updatedSlots };
    }));
  };
  
  const hasValidAvailability = () => {
    // Check if each service with an associate has ALL slots filled (and on different days)
    const servicesWithAssociates = itemsNeedingMeeting(cartItems);
    if (servicesWithAssociates.length === 0) return true;

    return servicesWithAssociates.every(item => {
      const serviceAvail = serviceAvailabilities.find(sa => sa.serviceItemId === item.id);
      if (!serviceAvail) return false;
      // All 3 primary slots must be filled
      const primaryComplete = serviceAvail.slots.every(slot => slot.date && slot.timeSlot);
      if (!primaryComplete) return false;
      // Primary slots must be on 3 different days
      const primaryDates = serviceAvail.slots.map(s => format(s.date!, "yyyy-MM-dd"));
      if (new Set(primaryDates).size !== 3) return false;

      // If backup candidates exist for this primary, backup must be fully selected
      const candidates = backupCandidatesCount[item.id] ?? 0;
      if (candidates > 0) {
        const backup = backupSelections[item.id];
        if (!backup?.associateId) return false;
        const backupComplete = backup.slots?.every(s => s?.date && s?.timeSlot);
        if (!backupComplete) return false;
        const backupDates = backup.slots.map(s => format(s.date!, "yyyy-MM-dd"));
        if (new Set(backupDates).size !== 3) return false;
      }
      return true;
    });
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

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.service.price), 0);
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

    // Validate Outreach Power Pack documents
    const hasOutreachPowerPack = cartItems.some(item => item.service.name?.startsWith('Outreach Power Pack'));
    if (hasOutreachPowerPack) {
      if (!outreachCvFile) {
        toast.error("Please upload your CV for the Outreach Power Pack");
        return;
      }
      if (!outreachCoverLetterFile) {
        toast.error("Please upload your Cover Letter for the Outreach Power Pack");
        return;
      }
    }

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
      toast.error("Please complete all 3 time slots (on different days) for both your primary and backup associate.");
      setAvailabilityNeedsAttention(true);
      window.setTimeout(() => setAvailabilityNeedsAttention(false), 1200);
      availabilitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsProcessing(true);

    try {
      const { subtotal, discountPercentage, total } = calculateTotals();

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

      // Outreach Power Pack documents
      let outreachCvUrl: string | null = null;
      let outreachCoverLetterUrl: string | null = null;
      const hasOutreachPowerPackService = cartItems.some(item => item.service.name?.startsWith('Outreach Power Pack'));

      if (hasOutreachPowerPackService && outreachCvFile) {
        const cvExt = outreachCvFile.name.split('.').pop();
        const cvFileName = `${clientUser.id}-outreach-cv-${Date.now()}.${cvExt}`;
        const { data: cvUpload, error: cvUploadError } = await sb.storage
          .from('documents')
          .upload(`outreach-documents/${cvFileName}`, outreachCvFile);
        if (cvUploadError) throw cvUploadError;
        outreachCvUrl = cvUpload.path;
      }

      if (hasOutreachPowerPackService && outreachCoverLetterFile) {
        const clExt = outreachCoverLetterFile.name.split('.').pop();
        const clFileName = `${clientUser.id}-outreach-cover-${Date.now()}.${clExt}`;
        const { data: clUpload, error: clUploadError } = await sb.storage
          .from('documents')
          .upload(`outreach-documents/${clFileName}`, outreachCoverLetterFile);
        if (clUploadError) throw clUploadError;
        outreachCoverLetterUrl = clUpload.path;
      }

      // Build the per-item fulfillment payload (resolved associate, slots, backup,
      // and any CV-rewrite documents uploaded to a pre-payment path).
      const pendingItems: PendingOrderItem[] = [];
      for (const item of cartItems) {
        const backupSel = backupSelections[item.id];
        const backupCount = backupCandidatesCount[item.id] ?? 0;
        const hasBackup = !!(item.associate?.id && backupCount > 0 && backupSel?.associateId);
        const backupAssociateId = hasBackup ? backupSel!.associateId : null;

        const isCvRewriteNoMeeting = isCvRewriteItem(item) && !!cvRewriteSkipMeeting[item.id];

        // For Comparative items the deliverable is produced by the 2nd associate.
        const resolvedAssociateId =
          item.associates && item.associates.length === 2
            ? item.associates[1].id
            : (item.associate?.id || null);

        // Upload CV-rewrite docs now (no project id yet → use a pending path; the
        // stored path is what client_shared_documents references, prefix is irrelevant).
        const cvRewriteDocs: PendingSharedDoc[] = [];
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

        // Primary meeting slots
        const slots: PendingMeetingSlot[] = [];
        if (resolvedAssociateId && !isCvRewriteNoMeeting) {
          const serviceAvail = serviceAvailabilities.find(sa => sa.serviceItemId === item.id);
          for (const slot of serviceAvail?.slots ?? []) {
            if (slot.date && slot.timeSlot) {
              const dateStr = format(slot.date, "yyyy-MM-dd");
              slots.push({ proposedDate: dateStr, proposedTime: `${dateStr} ${slot.timeSlot}` });
            }
          }
        }

        // Backup meeting slots
        const backupSlots: PendingMeetingSlot[] = [];
        if (resolvedAssociateId && !isCvRewriteNoMeeting && hasBackup) {
          for (const slot of backupSel!.slots) {
            if (slot.date && slot.timeSlot) {
              const dateStr = format(slot.date, "yyyy-MM-dd");
              backupSlots.push({ proposedDate: dateStr, proposedTime: `${dateStr} ${slot.timeSlot}` });
            }
          }
        }

        pendingItems.push({
          serviceId: item.service.id,
          price: Number(item.service.price),
          resolvedAssociateId,
          isCvRewriteNoMeeting,
          specificRequest: item.specificRequest || null,
          additionalCallReason: (item as any).additionalCallReason || null,
          packageName: item.packageName || null,
          slots,
          backupAssociateId,
          backupSlots,
          cvRewriteDocs,
        });
      }

      const pendingOrder: PendingClientOrder = {
        clientId: clientUser.id,
        totalAmount: subtotal,
        discountPercentage,
        receiptUrl,
        outreachCvUrl,
        outreachCoverLetterUrl,
        outreachCustomEmail: hasOutreachPowerPackService && useCustomEmail ? outreachCustomEmail : null,
        items: pendingItems,
      };

      // Create Stripe Checkout session and redirect. No order_id is passed: the
      // order doesn't exist yet, so verify-payment's client_order branch is a
      // no-op and won't send premature emails.
      const origin = window.location.origin;
      const lineItems = cartItems.map((item) => ({
        name: item.service.name,
        description: item.associate
          ? `Associate: ${item.associate.first_name} ${item.associate.last_name}`
          : undefined,
        amount: Number(item.service.price),
        quantity: 1,
      }));

      if (discountPercentage > 0) {
        const factor = 1 - discountPercentage / 100;
        lineItems.forEach((li) => {
          li.amount = Math.round(li.amount * factor * 100) / 100;
        });
      }

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
              client_id: clientUser.id,
            },
          },
        }
      );

      if (stripeError) throw stripeError;
      if (!stripeSession?.url) throw new Error('Stripe session URL missing');

      // Stage the fulfillment payload keyed by the Stripe session id, so the order
      // can be created AFTER payment by either the payment-success page or the
      // Stripe webhook (whichever runs first) — making it tab-close proof.
      const sessionId = stripeSession.session_id || stripeSession.id;
      if (!sessionId) throw new Error('Stripe session id missing');
      const { error: pendingError } = await sb
        .from('pending_orders')
        .insert({ session_id: sessionId, client_id: clientUser.id, payload: pendingOrder });
      if (pendingError) throw pendingError;

      // Redirect to Stripe Checkout — break out of any iframe (Lovable preview, etc.)
      // Stripe Checkout sets X-Frame-Options: DENY and won't render inside iframes.
      toast.success('Opening secure Stripe Checkout…');
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = stripeSession.url;
        } else {
          window.location.href = stripeSession.url;
        }
      } catch {
        // Cross-origin iframe — fall back to opening in a new tab
        window.open(stripeSession.url, '_blank', 'noopener,noreferrer');
      }
      return;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || "Failed to complete checkout");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const newItems = cartItems.filter(item => item.id !== itemId);
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
                  return (
                    <div key={item.id} className="flex justify-between items-start border-b pb-3">
                      <div className="flex-1">
                        {item.packageName && (
                          <Badge variant="outline" className="mb-1 border-primary/40 text-primary text-[10px]">
                            {item.packageRole === "addon" ? "Add-on" : "Package"}: {item.packageName}
                          </Badge>
                        )}
                        <h4 className="font-medium">{item.service.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.service.category}</p>
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

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">€{item.service.price.toFixed(2)}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
              </CardContent>
            </Card>

            {/* Outreach Power Pack Documents Upload */}
            {cartItems.some(item => item.service.name?.startsWith('Outreach Power Pack')) && (
              <OutreachDocumentsUpload
                cvFile={outreachCvFile}
                coverLetterFile={outreachCoverLetterFile}
                customEmail={outreachCustomEmail}
                useCustomEmail={useCustomEmail}
                onCvChange={setOutreachCvFile}
                onCoverLetterChange={setOutreachCoverLetterFile}
                onCustomEmailChange={setOutreachCustomEmail}
                onUseCustomEmailChange={setUseCustomEmail}
              />
            )}
            
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
                  {itemsNeedingMeeting(cartItems).map((item) => {
                    const serviceAvail = serviceAvailabilities.find(sa => sa.serviceItemId === item.id);
                    if (!serviceAvail) return null;
                    
                    const isComparative = item.associates && item.associates.length === 2;
                    
                    const isAltitudeItem = (item.service.category || '').toLowerCase() === 'altitude';
                    return (
                      <div key={item.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{item.service.name}</h4>
                          {isComparative ? (
                            <span className="text-xs text-muted-foreground">
                              ({item.associates![0].first_name} {item.associates![0].last_name} & {item.associates![1].first_name} {item.associates![1].last_name})
                            </span>
                          ) : item.associate && (
                            <span className="text-xs text-muted-foreground">
                              ({item.associate.first_name} {item.associate.last_name})
                            </span>
                          )}
                        </div>
                        {isAltitudeItem && (
                          <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-xs p-2">
                            <strong>Tip:</strong> For Altitude services, we recommend scheduling meetings on the <strong>weekend</strong>. Associates are usually busy with work during weekdays.
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Pick 3 time slots, each on a different day.
                        </p>
                        {/* Mobile: stack the 3 slots full-width for usable pickers; 3-up from sm on (desktop unchanged) */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {[0, 1, 2].map((slotIndex) => {
                            const usedDateKeys = serviceAvail.slots.map(s => s.date ? format(s.date, "yyyy-MM-dd") : null);
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
                                      !serviceAvail.slots[slotIndex].date && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                    {serviceAvail.slots[slotIndex].date 
                                      ? format(serviceAvail.slots[slotIndex].date!, "dd/MM")
                                      : "Date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={serviceAvail.slots[slotIndex].date}
                                    onSelect={(date) => updateServiceAvailabilitySlot(item.id, slotIndex, 'date', date)}
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
                                value={serviceAvail.slots[slotIndex].timeSlot}
                                onValueChange={(value) => updateServiceAvailabilitySlot(item.id, slotIndex, 'timeSlot', value)}
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

                        {/* Backup associate (only for non-comparative items where primary is a single associate) */}
                        {!isComparative && item.associate?.id && (
                          <BackupAssociateBlock
                            primaryAssociateId={item.associate.id}
                            serviceItemId={item.id}
                            serviceLabel={item.service.name}
                            serviceCategory={item.service.category}
                            serviceSector={item.sector}
                            minDate={minDate}
                            value={
                              backupSelections[item.id] || {
                                associateId: null,
                                slots: [
                                  { date: undefined, timeSlot: "" },
                                  { date: undefined, timeSlot: "" },
                                  { date: undefined, timeSlot: "" },
                                ],
                              }
                            }
                            onChange={(next) =>
                              setBackupSelections((prev) => ({ ...prev, [item.id]: next }))
                            }
                            onCandidatesLoaded={(count) =>
                              setBackupCandidatesCount((prev) =>
                                prev[item.id] === count ? prev : { ...prev, [item.id]: count }
                              )
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground">
                    * Dates available from {format(minDate, "dd MMM yyyy")}
                  </p>
                </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Account & Payment */}
          <div className="flex flex-col gap-4 min-h-0">
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
                        <div className="grid grid-cols-2 gap-3">
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
                        <div className="grid grid-cols-2 gap-3">
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
                        
                        <div className="grid grid-cols-2 gap-3">
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
                    <p className="text-sm text-muted-foreground">
                      You will be redirected to Stripe to complete your payment securely. Once paid, your order is automatically confirmed and your Associate is notified.
                    </p>
                  </div>

                  {/* Downloadable associate profiles (primary + backup per service) */}
                  {(() => {
                    const entries: CheckoutProfilesEntry[] = cartItems
                      .filter((item) => item.associate && !item.associate.id.includes(","))
                      .map((item) => ({
                        serviceItemId: item.id,
                        serviceLabel: item.service.name,
                        primaryId: item.associate!.id,
                        backupId: backupSelections[item.id]?.associateId || null,
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
                    {isProcessing ? "Redirecting…" : `Pay €${total.toFixed(2)} with Stripe`}
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
