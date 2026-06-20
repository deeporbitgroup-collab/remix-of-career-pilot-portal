import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  LogOut,
  User,
  FileText,
  Download,
  Edit,
  Save,
  Upload,
  DoorOpen,
  CalendarClock,
  ClipboardCheck,
  Handshake,
  XCircle,
  X,
  Video,
  Link as LinkIcon,
  ShieldCheck,
  Sparkles,
  BadgeCheck,
  Users,
  CheckCircle2,
  Eye,
  Play
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TalentPoolLanguageProvider, useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";
import { cn } from "@/lib/utils";
import { formatSlot } from "@/lib/meeting-format";

const SECTORS = [
  "Consulting", "Finance", "Technology", "Healthcare", "Manufacturing",
  "Retail", "Education", "Energy", "Real Estate", "Telecommunications",
  "Transportation", "Fashion", "Media & Entertainment", "Legal", "Altro"
];

const SIZES = [
  { value: "STARTUP", label: "Startup" },
  { value: "BOUTIQUE", label: "Boutique" },
  { value: "MEDIUM_SIZE", label: "Medium size" },
  { value: "LARGE_COMPANY", label: "Large company" }
];

const CompanyDashboardContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useTalentPoolLanguage();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    company_name: '',
    sector: '',
    size: '',
    reference_email: '',
    linkedin_url: '',
    description: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'selected' | 'profile'>('students');
  const [selectedList, setSelectedList] = useState<any[]>([]);
  const [deselecting, setDeselecting] = useState<string | null>(null);
  const [companyMeetings, setCompanyMeetings] = useState<any[]>([]);
  const [meetingDialogFor, setMeetingDialogFor] = useState<any>(null);
  const [meetingForm, setMeetingForm] = useState({ title: '', slot1: '', slot2: '', timezone: '' });
  const [submittingMeeting, setSubmittingMeeting] = useState(false);
  // Interview link (C2.3): set/edit the call link + description on a CONFIRMED meeting.
  const [linkDialogFor, setLinkDialogFor] = useState<any>(null);
  const [linkForm, setLinkForm] = useState({ meetLink: '', description: '' });
  const [submittingLink, setSubmittingLink] = useState(false);
  // Decision (C4): offer / reject the candidate.
  const [offerDialogFor, setOfferDialogFor] = useState<any>(null);
  const [offerForm, setOfferForm] = useState({ jobTitle: '', message: '' });
  const [rejectDialogFor, setRejectDialogFor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const role = localStorage.getItem('talentPoolRole');
      const userStr = localStorage.getItem('talentPoolUser');
      
      if (role !== 'COMPANY' || !userStr) {
        navigate('/talent-pool/company');
        return;
      }

      const stored = JSON.parse(userStr);

      // Always refresh user + profile from DB so registration_status is current
      let userData: any = stored;
      try {
        const { data: fresh, error: freshErr } = await (supabase.rpc as any)(
          'talent_pool_get_user_with_profile',
          { _user_id: stored.id }
        );
        if (!freshErr && fresh) {
          userData = fresh;
          localStorage.setItem('talentPoolUser', JSON.stringify(fresh));
        }
      } catch (e) {
        console.warn('Could not refresh user data, using cached:', e);
      }

      setCompany(userData);
      if (userData.company_profiles && userData.company_profiles.length > 0) {
        const profile = userData.company_profiles[0];
        setEditData({
          company_name: profile.company_name || '',
          sector: profile.sector || '',
          size: profile.size || '',
          reference_email: profile.reference_email || '',
          linkedin_url: profile.linkedin_url || '',
          description: profile.description || ''
        });
      }
      
      if (userData.registration_status !== 'APPROVED') {
        toast({
          title: "Access Denied",
          description: "Your company account must be approved to access this area",
          variant: "destructive"
        });
        navigate('/talent-pool/company');
        return;
      }

      await loadStudents();
      await loadSelectedStudents(userData.id);
      await loadMeetings(userData.id);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/talent-pool/company');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('talent_pool_users')
        .select(`
          *,
          company_profiles (*)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      setCompany(data);
      localStorage.setItem('talentPoolUser', JSON.stringify(data));

      if (data.company_profiles && data.company_profiles.length > 0) {
        const profile = data.company_profiles[0];
        setEditData({
          company_name: profile.company_name || '',
          sector: profile.sector || '',
          size: profile.size || '',
          reference_email: profile.reference_email || '',
          linkedin_url: profile.linkedin_url || '',
          description: profile.description || ''
        });
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('talent_pool_get_students_for_company');

      if (!error && Array.isArray(data)) {
        setStudents(data);
        return;
      }

      if (error) {
        console.warn('RPC talent_pool_get_students_for_company unavailable, using fallback:', error.message);
      }

      // Fallback: visible + unlocked profiles (pre-migration or RPC not yet deployed)
      const { data: fallback, error: fallbackErr } = await supabase
        .from('student_profiles')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          photo_url,
          cv_url,
          cover_letter_url,
          linkedin_url,
          presentation_video_url,
          payment_status,
          access_status,
          profile_visible_to_companies
        `)
        .eq('profile_visible_to_companies', true)
        .eq('access_status', 'UNLOCKED')
        .not('user_id', 'is', null);

      if (fallbackErr) {
        console.error('Error loading students:', fallbackErr);
        return;
      }

      setStudents(fallback || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadSelectedStudents = async (companyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-company-selected-students', {
        body: { companyId }
      });

      if (error) {
        console.error('Error loading selected students:', error);
        return [];
      }

      const selections = Array.isArray(data) ? data : [];
      const ids = selections.map((s: any) => s.student_id as string);
      setSelectedStudents(new Set(ids));
      setSelectedList(selections);
      return ids;
    } catch (error) {
      console.error('Error loading selected students:', error);
      return [];
    }
  };

  const handleDeselect = async (studentId: string, studentName: string) => {
    if (!company?.id) return;
    setDeselecting(studentId);
    try {
      const { error } = await supabase.functions.invoke('deselect-student', {
        body: { companyId: company.id, studentId }
      });
      if (error) throw error;
      toast({ title: "Student deselected", description: `${studentName} removed from your selections. Their recruiting history is kept.` });
      await loadSelectedStudents(company.id);
    } catch (e: any) {
      console.error('Deselect error:', e);
      toast({ title: "Error", description: e.message || "Failed to deselect", variant: "destructive" });
    } finally {
      setDeselecting(null);
    }
  };

  const loadMeetings = async (companyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-recruiting-meetings', { body: { companyId } });
      if (error) { console.error('Error loading meetings:', error); return; }
      setCompanyMeetings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading meetings:', e);
    }
  };

  const openMeetingDialog = (selection: any) => {
    setMeetingDialogFor(selection);
    setMeetingForm({ title: '', slot1: '', slot2: '', timezone: '' });
  };

  const handleProposeMeeting = async () => {
    if (!meetingDialogFor || !company?.id) return;
    if (!meetingForm.slot1 || !meetingForm.slot2) {
      toast({ title: "Two slots required", description: "Please propose two date + time options.", variant: "destructive" });
      return;
    }
    if (!meetingForm.timezone.trim()) {
      toast({ title: "Timezone required", description: "Add the timezone label shown next to the times.", variant: "destructive" });
      return;
    }
    setSubmittingMeeting(true);
    try {
      const { error } = await supabase.functions.invoke('recruiting-meeting-action', {
        body: {
          action: 'propose',
          by: 'COMPANY',
          companyId: company.id,
          studentId: meetingDialogFor.student_id,
          title: meetingForm.title || null,
          proposedSlots: [{ datetime: meetingForm.slot1 }, { datetime: meetingForm.slot2 }],
          timezone: meetingForm.timezone.trim(),
        }
      });
      if (error) throw error;
      toast({ title: "Meeting proposed", description: "The candidate and Career Pilot have been notified." });
      setMeetingDialogFor(null);
      await loadMeetings(company.id);
    } catch (e: any) {
      console.error('Propose meeting error:', e);
      toast({ title: "Error", description: e.message || "Failed to propose meeting", variant: "destructive" });
    } finally {
      setSubmittingMeeting(false);
    }
  };

  const openLinkDialog = (meeting: any) => {
    setLinkDialogFor(meeting);
    setLinkForm({ meetLink: meeting.meet_link || '', description: meeting.description || '' });
  };

  const handleSetLink = async () => {
    if (!linkDialogFor || !company?.id) return;
    if (!linkForm.meetLink.trim()) {
      toast({ title: "Link required", description: "Paste the interview link (e.g. a Google Meet / Zoom URL).", variant: "destructive" });
      return;
    }
    setSubmittingLink(true);
    try {
      const { error } = await supabase.functions.invoke('recruiting-meeting-action', {
        body: {
          action: 'set-link',
          by: 'COMPANY',
          meetingId: linkDialogFor.id,
          meetLink: linkForm.meetLink.trim(),
          description: linkForm.description.trim() || null,
        }
      });
      if (error) throw error;
      toast({ title: "Interview link saved", description: "The candidate and Career Pilot have been notified." });
      setLinkDialogFor(null);
      await loadMeetings(company.id);
    } catch (e: any) {
      console.error('Set link error:', e);
      toast({ title: "Error", description: e.message || "Failed to save the link", variant: "destructive" });
    } finally {
      setSubmittingLink(false);
    }
  };

  // ---- C4: offer / reject decision (recruiting-decision) ----
  const openOfferDialog = (selection: any) => {
    setOfferDialogFor(selection);
    setOfferForm({ jobTitle: '', message: '' });
  };

  const handleOffer = async () => {
    if (!offerDialogFor || !company?.id) return;
    setSubmittingDecision(true);
    try {
      const { error } = await supabase.functions.invoke('recruiting-decision', {
        body: {
          action: 'offer',
          companyId: company.id,
          studentId: offerDialogFor.student_id,
          jobTitle: offerForm.jobTitle.trim() || null,
          message: offerForm.message.trim() || null,
        }
      });
      if (error) throw error;
      toast({ title: "Offer sent", description: "The candidate and Career Pilot have been notified." });
      setOfferDialogFor(null);
      await loadSelectedStudents(company.id);
    } catch (e: any) {
      console.error('Offer error:', e);
      toast({ title: "Error", description: e.message || "Failed to send offer", variant: "destructive" });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const openRejectDialog = (selection: any) => {
    setRejectDialogFor(selection);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectDialogFor || !company?.id) return;
    setSubmittingDecision(true);
    try {
      const { error } = await supabase.functions.invoke('recruiting-decision', {
        body: {
          action: 'reject',
          companyId: company.id,
          studentId: rejectDialogFor.student_id,
          reason: rejectReason.trim() || null,
        }
      });
      if (error) throw error;
      toast({ title: "Candidate rejected", description: "The candidate and Career Pilot have been notified." });
      setRejectDialogFor(null);
      await loadSelectedStudents(company.id);
    } catch (e: any) {
      console.error('Reject error:', e);
      toast({ title: "Error", description: e.message || "Failed to reject", variant: "destructive" });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    setLogoFile(file);
  };

  const handleSaveCompanyInfo = async () => {
    try {
      if (!company?.id) {
        console.error("No company ID found");
        return;
      }

      if (!editData.company_name || !editData.sector || !editData.size || !editData.reference_email) {
        toast({
          title: "Missing required fields",
          description: "Company name, sector, size, and reference email are required.",
          variant: "destructive"
        });
        return;
      }

      setUploading(true);
      let logoUrl = company.company_profiles?.[0]?.logo_url;

      if (logoFile) {
        const arrayBuffer = await logoFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const fileBase64 = btoa(binary);

        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-company-logo', {
          body: {
            companyId: company.id,
            fileName: logoFile.name,
            contentType: logoFile.type,
            fileBase64
          }
        });

        if (uploadError || !uploadData?.publicUrl) {
          // Non-blocking: keep the existing logo and warn, but still save the rest.
          console.error('Logo upload failed (non-fatal):', uploadError);
          toast({
            title: "Logo not updated",
            description: "The other fields will be saved; the logo upload failed. Try again later.",
            variant: "destructive"
          });
        } else {
          logoUrl = uploadData.publicUrl;
        }
      }

      const { data, error } = await supabase.rpc('update_company_profile', {
        p_user_id: company.id,
        p_company_name: editData.company_name,
        p_sector: editData.sector,
        p_size: editData.size as any,
        p_reference_email: editData.reference_email,
        p_linkedin_url: editData.linkedin_url || null,
        p_logo_url: logoUrl || null,
        p_description: editData.description || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company information updated successfully"
      });

      setEditMode(false);
      setLogoFile(null);
      await loadCompanyData(company.id);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save company information",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSelectStudent = async (student: any) => {
    if (!company?.id || !student.user_id) {
      toast({
        title: "Error",
        description: "Missing required information. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    setSelecting(student.id);
    
    try {
      const { error } = await supabase.functions.invoke('send-student-selection', {
        body: {
          companyId: company.id,
          studentId: student.user_id,
          companyName: company.company_profiles?.[0]?.company_name || 'Company',
          companyEmail: company.email,
          studentName: `${student.first_name} ${student.last_name}`,
          studentEmail: student.email || ''
        }
      });

      if (error) throw error;

      toast({
        title: "✓ Student Selected Successfully",
        description: `You have selected ${student.first_name} ${student.last_name}. We will contact you soon.`,
        duration: 4000
      });

      setSelectedStudents(prev => new Set([...prev, student.user_id]));
      await loadSelectedStudents(company.id);
    } catch (error: any) {
      console.error('Selection error:', error);
      const ids = await loadSelectedStudents(company.id);
      if (ids.includes(student.user_id)) {
        toast({
          title: "Already Selected",
          description: `${student.first_name} ${student.last_name} was already selected by your company.`,
          duration: 4000
        });
      } else {
        toast({
          title: "Selection Error",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
          duration: 5000
        });
      }
    } finally {
      setSelecting(null);
    }
  };

  const handleLeaveTalentPool = async () => {
    if (!company?.id) return;

    try {
      const companyName = company.company_profiles?.[0]?.company_name || 'Company';
      
      const { error } = await supabase.functions.invoke('send-talent-pool-leave', {
        body: {
          userId: company.id,
          name: companyName,
          email: company.email,
          role: 'COMPANY'
        }
      });

      if (error) throw error;

      toast({
        title: "Left Talent Pool",
        description: "You have successfully left the Talent Pool. You can no longer access this area."
      });

      localStorage.removeItem('talentPoolRole');
      localStorage.removeItem('talentPoolUser');
      navigate('/talent-pool');
    } catch (error: any) {
      console.error('Leave error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to leave Talent Pool",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('talentPoolRole');
    localStorage.removeItem('talentPoolUser');
    navigate('/talent-pool');
  };

  const [viewingPassport, setViewingPassport] = useState<string | null>(null);
  const [videoFor, setVideoFor] = useState<{ url: string; name: string } | null>(null);
  const handleViewPassport = async (studentId: string) => {
    setViewingPassport(studentId);
    try {
      const { data, error } = await supabase.functions.invoke('get-passport-url', { body: { studentId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
      else throw new Error('No passport found');
    } catch (e: any) {
      console.error('View passport error:', e);
      toast({ title: "Error", description: e.message || "Could not open the passport", variant: "destructive" });
    } finally {
      setViewingPassport(null);
    }
  };

  const ukVisaLabel = (v?: string) =>
    v === 'YES' ? 'Can work in the UK' : v === 'NO' ? 'No UK work right' : v === 'APPLYING' ? 'UK visa: applying' : null;

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch file');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Success",
        description: `${filename} downloaded successfully`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Unable to download file",
        variant: "destructive"
      });
    }
  };

  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-cloud-white to-runway-gray p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-green-600">
                {company?.company_profiles?.[0]?.company_name || 'Company Dashboard'}
              </h1>
              <p className="text-steel-gray">Talent Pool - Company Area</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab('selected')}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Selected Students ({selectedList.length})
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <DoorOpen className="h-4 w-4" />
                  Leave Talent Pool
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to leave the Talent Pool?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently remove your company from the Talent Pool. 
                    You will no longer have access to student profiles and all your selections will be lost.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveTalentPool} className="bg-destructive text-destructive-foreground">
                    Yes, Leave Talent Pool
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Partner status — premium "azienda convenzionata" banner */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-700 via-green-600 to-teal-600 p-6 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.45)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_50%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 md:gap-5">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-300/60 to-emerald-200/40 blur-sm" />
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/30 bg-white/15 shadow-lg backdrop-blur-sm md:h-20 md:w-20">
                  {company?.company_profiles?.[0]?.logo_url ? (
                    <img
                      src={company.company_profiles[0].logo_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-white md:h-9 md:w-9" />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-600 bg-amber-400 shadow-md">
                  <BadgeCheck className="h-4 w-4 text-emerald-900" />
                </span>
              </div>

              <div className="min-w-0 text-white">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-50 backdrop-blur-sm">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    Career Pilot Partner
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-200" />
                    </span>
                    {t('companyDashboard.partner.active')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {t('companyDashboard.partner.title')}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-emerald-50/90 md:text-base">
                  {t('companyDashboard.partner.subtitle')}
                </p>
                {company?.approved_at && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-100/80">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {t('companyDashboard.partner.since')}{' '}
                    {new Date(company.approved_at).toLocaleDateString(
                      language === 'it' ? 'it-IT' : 'en-GB',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:shrink-0">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-1.5 text-emerald-100/80">
                  <Users className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {t('companyDashboard.partner.statsCandidates')}
                  </span>
                </div>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">{students.length}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-1.5 text-emerald-100/80">
                  <Handshake className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {t('companyDashboard.partner.statsSelected')}
                  </span>
                </div>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">{selectedList.length}</p>
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              {t('companyDashboard.partner.verified')}
            </span>
            <span className="text-xs text-emerald-50/75">
              {t('companyDashboard.partner.visibilityNote')}
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'students' | 'selected' | 'profile')} className="space-y-6">
          <TabsList className="max-md:grid max-md:w-full max-md:grid-cols-3 max-md:h-auto max-md:gap-1">
            <TabsTrigger value="students" className="max-md:h-auto max-md:whitespace-normal max-md:px-1 max-md:py-2 max-md:text-[11px] max-md:leading-tight">Available Students</TabsTrigger>
            <TabsTrigger value="selected" className="max-md:h-auto max-md:whitespace-normal max-md:px-1 max-md:py-2 max-md:text-[11px] max-md:leading-tight">Selected Students ({selectedList.length})</TabsTrigger>
            <TabsTrigger value="profile" className="max-md:h-auto max-md:whitespace-normal max-md:px-1 max-md:py-2 max-md:text-[11px] max-md:leading-tight">Company Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <Dialog open={editMode} onOpenChange={setEditMode}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Edit Company Information</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company Name *</Label>
                        <Input
                          id="company_name"
                          value={editData.company_name}
                          onChange={(e) => setEditData({...editData, company_name: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sector">Sector *</Label>
                          <Select
                            value={editData.sector}
                            onValueChange={(value) => setEditData({...editData, sector: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select sector" />
                            </SelectTrigger>
                            <SelectContent>
                              {SECTORS.map(sector => (
                                <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="size">Size *</Label>
                          <Select
                            value={editData.size}
                            onValueChange={(value) => setEditData({...editData, size: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              {SIZES.map(size => (
                                <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reference_email">Reference Email *</Label>
                        <Input
                          id="reference_email"
                          type="email"
                          value={editData.reference_email}
                          onChange={(e) => setEditData({...editData, reference_email: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="linkedin_url">LinkedIn (optional)</Label>
                        <Input
                          id="linkedin_url"
                          type="url"
                          placeholder="https://linkedin.com/company/..."
                          value={editData.linkedin_url}
                          onChange={(e) => setEditData({...editData, linkedin_url: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          rows={3}
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company_logo">Company Logo (optional)</Label>
                        <div className="space-y-2">
                          {(logoFile || company?.company_profiles?.[0]?.logo_url) && (
                            <div className="flex items-center gap-4">
                              <img 
                                src={logoFile ? URL.createObjectURL(logoFile) : company?.company_profiles?.[0]?.logo_url} 
                                alt="Company logo preview" 
                                className="h-20 w-20 object-cover rounded border"
                              />
                              {logoFile && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setLogoFile(null)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          )}
                          <Input
                            id="company_logo"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleLogoChange}
                          />
                          <p className="text-xs text-steel-gray">
                            PNG, JPG, or WebP. Max 5MB.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => { setEditMode(false); setLogoFile(null); }}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSaveCompanyInfo} 
                          className="flex items-center gap-2"
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:col-span-2 lg:col-span-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          {t('companyDashboard.profile.partnershipStatus')}
                        </p>
                        <p className="font-semibold text-emerald-900">
                          {t('companyDashboard.partner.title')}
                        </p>
                        <p className="text-sm text-steel-gray">
                          {t('companyDashboard.profile.partnershipDesc')}
                        </p>
                      </div>
                      <Badge className="ml-auto bg-emerald-600 text-white hover:bg-emerald-600">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t('companyDashboard.profile.approved')}
                      </Badge>
                    </div>
                  </div>

                  {company?.company_profiles?.[0]?.logo_url && (
                    <div className="flex justify-center md:col-span-2 lg:col-span-3">
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/40 to-green-600/20 blur-sm" />
                        <img
                          src={company.company_profiles[0].logo_url}
                          alt="Company logo"
                          className="relative h-28 w-28 rounded-2xl border-2 border-white object-cover shadow-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                      {t('companyDashboard.profile.companyName')}
                    </p>
                    <p className="mt-1 font-semibold">{company?.company_profiles?.[0]?.company_name || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                      {t('companyDashboard.profile.sector')}
                    </p>
                    <p className="mt-1 font-semibold">{company?.company_profiles?.[0]?.sector || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                      {t('companyDashboard.profile.size')}
                    </p>
                    <p className="mt-1 font-semibold">
                      {SIZES.find(s => s.value === company?.company_profiles?.[0]?.size)?.label || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                      {t('companyDashboard.profile.email')}
                    </p>
                    <p className="mt-1 font-semibold break-all">
                      {company?.company_profiles?.[0]?.reference_email || 'N/A'}
                    </p>
                  </div>
                  {company?.company_profiles?.[0]?.linkedin_url && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">LinkedIn</p>
                      <a
                        href={company.company_profiles[0].linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        {t('companyDashboard.profile.viewLinkedin')}
                        <LinkIcon className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                  {company?.company_profiles?.[0]?.description && (
                    <div className="rounded-lg border bg-muted/30 p-4 md:col-span-2 lg:col-span-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                        {t('companyDashboard.profile.description')}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap font-medium">
                        {company.company_profiles[0].description}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Available Students ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <Users className="h-8 w-8 text-emerald-600 opacity-80" />
                    </div>
                    <p className="font-medium text-foreground">{t('companyDashboard.students.emptyTitle')}</p>
                    <p className="text-sm text-steel-gray mt-2 max-w-md mx-auto">
                      {t('companyDashboard.students.emptyDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:pb-2 max-md:[&>*]:w-[82vw] max-md:[&>*]:shrink-0 max-md:[&>*]:snap-center">
                    {students.map((student) => (
                      <Card key={student.id} className="relative p-4 hover:shadow-lg transition-shadow">
                        {student.presentation_video_url && (
                          <Button
                            size="sm"
                            onClick={() => setVideoFor({ url: student.presentation_video_url, name: `${student.first_name} ${student.last_name}` })}
                            className="absolute right-2 top-2 z-10 gap-1 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                          >
                            <Play className="h-4 w-4" /> Play video
                          </Button>
                        )}
                        <div className="space-y-3">
                          <div className="flex flex-col items-center text-center">
                            {student.photo_url ? (
                              <img 
                                src={student.photo_url} 
                                alt={`${student.first_name} ${student.last_name}`}
                                className="h-24 w-24 rounded-full object-cover mb-3"
                              />
                            ) : (
                              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                <User className="h-12 w-12 text-primary" />
                              </div>
                            )}
                            <h3 className="text-lg font-semibold">
                              {student.first_name} {student.last_name}
                            </h3>
                          </div>

                          <div className="flex flex-col gap-2 pt-2">
                            {student.cv_url ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadFile(
                                  student.cv_url,
                                  `${student.first_name}_${student.last_name}_CV.pdf`
                                )}
                                className="w-full flex items-center justify-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                Curriculum Vitae
                                <Download className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled className="w-full flex items-center justify-center gap-2 opacity-50">
                                <FileText className="h-4 w-4" />
                                CV not available
                              </Button>
                            )}
                            {student.cover_letter_url ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadFile(
                                  student.cover_letter_url,
                                  `${student.first_name}_${student.last_name}_CoverLetter.pdf`
                                )}
                                className="w-full flex items-center justify-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                Cover Letter
                                <Download className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled className="w-full flex items-center justify-center gap-2 opacity-50">
                                <FileText className="h-4 w-4" />
                                Cover letter not available
                              </Button>
                            )}
                            {student.presentation_video_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadFile(
                                  student.presentation_video_url,
                                  `${student.first_name}_${student.last_name}_Presentation.mp4`
                                )}
                                className="w-full flex items-center justify-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                Presentation Video
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            

                            
                            {!student.user_id ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="w-full"
                              >
                                Unavailable
                              </Button>
                            ) : selectedStudents.has(student.user_id) ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled
                                className="w-full bg-muted text-muted-foreground cursor-not-allowed"
                              >
                                Selected
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleSelectStudent(student)}
                                disabled={selecting === student.id}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                {selecting === student.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span className="ml-2">Selecting...</span>
                                  </>
                                ) : (
                                  'Select Student'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 2 — Selected Students (recruiting hub). Actions wired in C2–C4. */}
          <TabsContent value="selected">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Selected Students ({selectedList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedList.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-steel-gray mx-auto mb-4 opacity-50" />
                    <p className="text-steel-gray">No students selected yet</p>
                    <p className="text-sm text-steel-gray mt-2">
                      Select candidates from "Available Students" to start a recruiting process.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:pb-2 max-md:[&>*]:w-[85vw] max-md:[&>*]:shrink-0 max-md:[&>*]:snap-center">
                    {selectedList.map((selection) => {
                      const student = selection.profile;
                      if (!student) return null;
                      const stage = selection.stage || 'IN_PROGRESS';
                      const stageMeta: Record<string, { label: string; cls: string }> = {
                        IN_PROGRESS: { label: 'In progress', cls: 'bg-amber-100 text-amber-800' },
                        OFFER: { label: 'Offer', cls: 'bg-blue-100 text-blue-800' },
                        REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800' },
                        HIRED: { label: 'Hired', cls: 'bg-green-100 text-green-800' },
                      };
                      const sm = stageMeta[stage] || stageMeta.IN_PROGRESS;
                      const myMeetings = companyMeetings.filter((m: any) => m.student_id === selection.student_id);
                      return (
                        <Card key={selection.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              {student.photo_url ? (
                                <img src={student.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                              ) : (
                                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-7 w-7 text-primary" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold">{student.first_name} {student.last_name}</h3>
                                <p className="text-xs text-steel-gray">
                                  Selected: {new Date(selection.selected_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge className={sm.cls}>{sm.label}</Badge>
                            </div>

                            {/* Documents */}
                            <div className="flex flex-wrap gap-2">
                              {student.cv_url ? (
                                <Button size="sm" variant="outline" onClick={() => downloadFile(student.cv_url, `${student.first_name}_${student.last_name}_CV.pdf`)}>
                                  <FileText className="h-4 w-4 mr-1" /> CV <Download className="h-3 w-3 ml-1" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled className="opacity-50">
                                  <FileText className="h-4 w-4 mr-1" /> CV not available
                                </Button>
                              )}
                              {student.cover_letter_url ? (
                                <Button size="sm" variant="outline" onClick={() => downloadFile(student.cover_letter_url, `${student.first_name}_${student.last_name}_CoverLetter.pdf`)}>
                                  <FileText className="h-4 w-4 mr-1" /> Cover <Download className="h-3 w-3 ml-1" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled className="opacity-50">
                                  <FileText className="h-4 w-4 mr-1" /> Cover not available
                                </Button>
                              )}
                            </div>

                            {/* Work eligibility (bureaucracy: passport, visa, dates, residence) */}
                            {(student.passport_url || student.uk_work_visa || student.citizenship || student.home_address || student.city || student.country || student.internship_start_date || student.internship_end_date) && (
                              <div className="rounded-md border bg-muted/30 p-2 space-y-1 text-xs">
                                <p className="font-medium">Work eligibility</p>
                                {student.uk_work_visa && <p>{ukVisaLabel(student.uk_work_visa)}</p>}
                                {student.citizenship && <p>Citizenship: <strong>{student.citizenship}</strong></p>}
                                {(student.internship_start_date || student.internship_end_date) && (
                                  <p>
                                    Availability: {student.internship_start_date ? new Date(student.internship_start_date).toLocaleDateString() : '—'} → {student.internship_end_date ? new Date(student.internship_end_date).toLocaleDateString() : '—'}
                                  </p>
                                )}
                                {(student.home_address || student.city || student.country) && (
                                  <p className="text-muted-foreground">{[student.home_address, student.city, student.country].filter(Boolean).join(', ')}</p>
                                )}
                                {student.passport_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[11px]"
                                    onClick={() => handleViewPassport(selection.student_id)}
                                    disabled={viewingPassport === selection.student_id}
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    {viewingPassport === selection.student_id ? 'Opening...' : 'View passport'}
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Next step — Schedule meeting is live (C2); the rest arrive in C3/C4 */}
                            <div className="border-t pt-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Next step</p>
                              <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="outline" onClick={() => openMeetingDialog(selection)}><CalendarClock className="h-4 w-4 mr-1" /> Schedule meeting</Button>
                                <Button size="sm" variant="outline" disabled title="Coming soon"><ClipboardCheck className="h-4 w-4 mr-1" /> Test</Button>
                                <Button size="sm" variant="outline" onClick={() => openOfferDialog(selection)}><Handshake className="h-4 w-4 mr-1" /> Offer</Button>
                                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => openRejectDialog(selection)}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
                              </div>
                            </div>

                            {/* Meetings timeline (Tests list arrives in C3) */}
                            <div className="grid grid-cols-1 gap-3">
                              <div className="rounded-md border p-2 space-y-2">
                                <p className="text-xs font-medium">Meetings ({myMeetings.length})</p>
                                {myMeetings.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No meetings yet</p>
                                ) : (
                                  myMeetings.map((m: any) => (
                                    <div key={m.id} className="rounded border bg-muted/30 p-2 text-xs space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{m.title || 'Meeting'}</span>
                                        <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                                      </div>
                                      {m.status === 'CONFIRMED' && m.confirmed_slot ? (
                                        <div className="space-y-1.5">
                                          <p>Confirmed: <strong>{formatSlot(m.confirmed_slot.datetime, m.timezone)}</strong></p>
                                          {m.meet_link ? (
                                            <a href={m.meet_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                                              <Video className="h-3.5 w-3.5" /> Interview link
                                            </a>
                                          ) : (
                                            <p className="text-muted-foreground">No interview link yet.</p>
                                          )}
                                          {m.description && <p className="text-muted-foreground">{m.description}</p>}
                                          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openLinkDialog(m)}>
                                            <LinkIcon className="h-3.5 w-3.5 mr-1" />
                                            {m.meet_link ? 'Edit interview link' : 'Add interview link'}
                                          </Button>
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="text-muted-foreground">
                                            {m.proposed_by === 'STUDENT' ? 'Candidate proposed:' : 'You proposed:'}
                                          </p>
                                          <ul className="list-disc list-inside">
                                            {(m.proposed_slots || []).map((s: any, i: number) => (
                                              <li key={i}>{formatSlot(s.datetime, m.timezone)}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                              <div className="rounded-md border p-2">
                                <p className="text-xs font-medium">Tests (0)</p>
                                <p className="text-xs text-muted-foreground">No tests yet</p>
                              </div>
                            </div>

                            {/* Deselect (history preserved) */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" disabled={deselecting === selection.student_id} className="w-full">
                                  {deselecting === selection.student_id ? 'Removing...' : (<><X className="h-4 w-4 mr-1" /> Deselect</>)}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove this selection?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Deselect {student.first_name} {student.last_name}? Their recruiting history (meetings/tests) is kept.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeselect(selection.student_id, `${student.first_name} ${student.last_name}`)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Yes, remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Schedule meeting — propose 2 date+time options (C2.1) */}
        <Dialog open={!!meetingDialogFor} onOpenChange={(o) => { if (!o) setMeetingDialogFor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. First interview"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Option 1 (date &amp; time)</Label>
                  <Input
                    type="datetime-local"
                    value={meetingForm.slot1}
                    onChange={(e) => setMeetingForm({ ...meetingForm, slot1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Option 2 (date &amp; time)</Label>
                  <Input
                    type="datetime-local"
                    value={meetingForm.slot2}
                    onChange={(e) => setMeetingForm({ ...meetingForm, slot2: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  placeholder="e.g. CET, GMT, EST"
                  value={meetingForm.timezone}
                  onChange={(e) => setMeetingForm({ ...meetingForm, timezone: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Shown next to the times as a label — no automatic conversion.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMeetingDialogFor(null)} disabled={submittingMeeting}>Cancel</Button>
              <Button onClick={handleProposeMeeting} disabled={submittingMeeting}>
                {submittingMeeting ? 'Sending...' : 'Propose meeting'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Interview link — set/edit the call link + description on a CONFIRMED meeting (C2.3) */}
        <Dialog open={!!linkDialogFor} onOpenChange={(o) => { if (!o) setLinkDialogFor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{linkDialogFor?.meet_link ? 'Edit interview link' : 'Add interview link'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Interview link</Label>
                <Input
                  placeholder="https://meet.google.com/... or Zoom URL"
                  value={linkForm.meetLink}
                  onChange={(e) => setLinkForm({ ...linkForm, meetLink: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="e.g. Bring your portfolio. The call lasts ~30 minutes."
                  value={linkForm.description}
                  onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">The candidate sees the link and description in their Scheduled events tab.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogFor(null)} disabled={submittingLink}>Cancel</Button>
              <Button onClick={handleSetLink} disabled={submittingLink}>
                {submittingLink ? 'Saving...' : 'Save link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Offer (C4) */}
        <Dialog open={!!offerDialogFor} onOpenChange={(o) => { if (!o) setOfferDialogFor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Make an offer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role / job title (optional)</Label>
                <Input
                  placeholder="e.g. Summer Analyst Internship"
                  value={offerForm.jobTitle}
                  onChange={(e) => setOfferForm({ ...offerForm, jobTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  placeholder="A short message to the candidate about the offer and next steps."
                  value={offerForm.message}
                  onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">The candidate and Career Pilot are notified. The candidate's stage becomes "Offer".</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOfferDialogFor(null)} disabled={submittingDecision}>Cancel</Button>
              <Button onClick={handleOffer} disabled={submittingDecision}>
                {submittingDecision ? 'Sending...' : 'Send offer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject (C4) */}
        <Dialog open={!!rejectDialogFor} onOpenChange={(o) => { if (!o) setRejectDialogFor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reject candidate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder="An optional note shared with the candidate."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">The candidate and Career Pilot are notified. The candidate's stage becomes "Rejected" (their recruiting history is kept).</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogFor(null)} disabled={submittingDecision}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={submittingDecision}>
                {submittingDecision ? 'Submitting...' : 'Reject candidate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Presentation video popup (UI 3) */}
        <Dialog open={!!videoFor} onOpenChange={(o) => { if (!o) setVideoFor(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{videoFor?.name} — presentation video</DialogTitle>
            </DialogHeader>
            {videoFor && (
              <video src={videoFor.url} controls autoPlay className="w-full rounded-md border bg-black" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const CompanyDashboard = () => {
  return (
    <TalentPoolLanguageProvider>
      <CompanyDashboardContent />
    </TalentPoolLanguageProvider>
  );
};

export default CompanyDashboard;