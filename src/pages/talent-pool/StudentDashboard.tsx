import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  User,
  FileText,
  CreditCard,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Download,
  Eye,
  AlertCircle,
  Upload,
  Briefcase,
  Euro,
  Calendar as CalendarIcon,
  Search,
  Filter,
  MapPin,
  Linkedin,
  DoorOpen,
  Bell,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ActiveRecruitingSection from "@/components/talent-pool/ActiveRecruitingSection";
import StudentScheduledEventsTab from "@/components/talent-pool/StudentScheduledEventsTab";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";
import { PDFDocument } from 'pdf-lib';

const COMPANY_TYPES = ["STARTUP", "BOUTIQUE", "MEDIUM_SIZE", "LARGE_COMPANY"];
const SECTORS = [
  "Technology", "Finance", "Healthcare", "Education", 
  "Marketing", "Consulting", "Retail", "Manufacturing"
];
const LOCATIONS = ["London", "Milan"];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useTalentPoolLanguage();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<any[]>([]);
  
  // Refs for file inputs
  const cvInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPassport, setUploadingPassport] = useState(false);
  const [savingBureaucracy, setSavingBureaucracy] = useState(false);
  const [viewingPassport, setViewingPassport] = useState(false);

  const COMPENSATION_OPTIONS = [
    { value: "PAID", label: t('studentTalentPool.compensation.paid') },
    { value: "UNPAID", label: t('studentTalentPool.compensation.unpaid') },
    { value: "BOTH", label: t('studentTalentPool.compensation.both') }
  ];

  useEffect(() => {
    const user = localStorage.getItem('talentPoolUser');
    if (!user) {
      navigate('/talent-pool/student');
      return;
    }
    
    const userData = JSON.parse(user);
    if (userData.role !== 'STUDENT') {
      navigate('/talent-pool');
      return;
    }

    setUserInfo(userData);
    loadDashboardData(userData.id);
  }, [navigate]);

  useEffect(() => {
    filterCompanies();
  }, [companies, selectedSectors, searchQuery]);

  // Refetch the companies that currently have this student selected.
  const refreshSelections = useCallback(async () => {
    if (!userInfo?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke('get-student-selections', {
        body: { studentId: userInfo.id }
      });
      if (error) {
        console.error('Error fetching selections:', error);
        return;
      }
      const mapped = (data || []).map((s: any) => ({
        ...s,
        talent_pool_users: { company_profiles: s.company_profile ? [s.company_profile] : [] }
      }));
      setSelectedCompanies(mapped);
    } catch (e) {
      console.error('Refresh selections error:', e);
    }
  }, [userInfo?.id]);

  // Realtime updates: refresh when a company SELECTS or DESELECTS this student.
  // company_selected_students has REPLICA IDENTITY FULL, so the DELETE event still
  // carries the old row and the student_id filter matches on removal too.
  useEffect(() => {
    if (!userInfo?.id) return;
    const channel = supabase
      .channel('student-selections')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_selected_students', filter: `student_id=eq.${userInfo.id}` },
        () => { refreshSelections(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userInfo?.id, refreshSelections]);

  // Safety net: also refresh when the tab regains focus, so a withdrawn company
  // never lingers in "Interested Companies" even if a realtime event is missed.
  useEffect(() => {
    if (!userInfo?.id) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshSelections();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userInfo?.id, refreshSelections]);
  const filterCompanies = () => {
    let filtered = companies;


    if (selectedSectors.length > 0) {
      filtered = filtered.filter(c => selectedSectors.includes(c.sector));
    }

    if (searchQuery) {
      filtered = filtered.filter(c =>
        (c.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.sector || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCompanies(filtered);
  };

  const loadDashboardData = async (userId: string) => {
    setLoading(true);
    try {
      // Load student profile
      const { data: profileData } = await supabase
        .rpc('talent_pool_get_student_profile', { _user_id: userId });

      setStudentProfile(profileData);

      // Load payment info
      const { data: paymentData } = await supabase
        .rpc('talent_pool_get_latest_payment', { _user_id: userId });

      if (paymentData) {
        setPaymentInfo(paymentData);
      }

      // Load notifications
      const { data: notificationsData } = await supabase
        .from('talent_pool_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setNotifications(notificationsData || []);

      // Load companies that selected this student via Edge Function (bypass RLS)
      const { data: selectionsData, error: selectionsErr } = await supabase
        .functions.invoke('get-student-selections', { body: { studentId: userId } });

      if (selectionsErr) {
        console.error('Error loading selections:', selectionsErr);
        setSelectedCompanies([]);
      } else {
        const merged = (selectionsData || []).map((s: any) => ({
          ...s,
          talent_pool_users: { company_profiles: s.company_profile ? [s.company_profile] : [] }
        }));
        setSelectedCompanies(merged);
      }

      // Load approved companies (all active students have access)
      const { data: companiesData } = await supabase
        .rpc('talent_pool_get_companies_for_student', { _user_id: userId });

      setCompanies(companiesData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Unable to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('studentTalentPool.errors.photoError'),
        description: t('studentTalentPool.errors.photoTypeError'),
        variant: "destructive"
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: t('studentTalentPool.errors.photoError'),
        description: t('studentTalentPool.errors.photoSizeError'),
        variant: "destructive"
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userInfo.id}/photo.${fileExt}`;

      try {
        await supabase.storage
          .from('talent-pool-photos')
          .remove([fileName]);
      } catch (e) {}

      const { data, error: uploadError } = await supabase.storage
        .from('talent-pool-photos')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('talent-pool-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .rpc('talent_pool_update_student_photo', {
          _user_id: userInfo.id,
          _photo_url: publicUrl
        });

      if (updateError) throw updateError;

      setStudentProfile(prev => ({ ...prev, photo_url: publicUrl }));
      toast({ 
        title: t('studentTalentPool.success.photoUploaded'),
        description: t('studentTalentPool.success.photoUploadedDesc')
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: t('studentTalentPool.errors.photoError'),
        description: error.message || t('studentTalentPool.errors.photoUploadError'),
        variant: "destructive"
      });
    }
  };

  const handleDocumentUpload = async (type: 'cv' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isDoc = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.type);

    const isImage = ['image/jpeg', 'image/png'].includes(file.type);

    if (!isDoc && !isImage) {
      toast({
        title: t('studentTalentPool.errors.documentError'),
        description: 'Allowed types: PDF, DOC, DOCX, JPG, PNG',
        variant: "destructive"
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: t('studentTalentPool.errors.documentError'),
        description: t('studentTalentPool.errors.documentSizeError'),
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare file for upload (convert images to PDF)
      let uploadFile = file;
      let uploadExt = file.name.split('.').pop() as string;
      let uploadType = file.type;

      if (['image/jpeg', 'image/png'].includes(file.type)) {
        const arrayBuf = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.create();
        const image = file.type === 'image/png' ? await pdfDoc.embedPng(arrayBuf) : await pdfDoc.embedJpg(arrayBuf);
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        uploadFile = new File([pdfBlob], `${file.name.replace(/\.[^.]+$/, '')}.pdf`, { type: 'application/pdf' });
        uploadExt = 'pdf';
        uploadType = 'application/pdf';
      }

      const bucket = type === 'cv' ? 'talent-pool-cv' : 'talent-pool-covers';
      const fileName = `${userInfo.id}/${type}-${Date.now()}.${uploadExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, uploadFile, { 
          upsert: true,
          contentType: uploadType
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .rpc('talent_pool_update_student_documents', {
          _user_id: userInfo.id,
          _cv_url: type === 'cv' ? publicUrl : null,
          _cover_url: type === 'cover' ? publicUrl : null
        });

      if (updateError) throw updateError;

      setStudentProfile(prev => ({ 
        ...prev, 
        [type === 'cv' ? 'cv_url' : 'cover_letter_url']: publicUrl 
      }));
      toast({ 
        title: t('studentTalentPool.success.documentUploaded'),
        description: type === 'cv' ? t('studentTalentPool.success.cvUploaded') : t('studentTalentPool.success.coverUploaded')
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: t('studentTalentPool.errors.documentError'),
        description: error.message || t('studentTalentPool.errors.documentUploadError'),
        variant: "destructive"
      });
    }
  };

  // Max video size = 50 MB (the free-plan global Supabase Storage limit).
  const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

  // Shared by both the file input and drag & drop. Independent of the rest of the
  // profile save, so a video failure never blocks CV / photo / LinkedIn.
  const processVideoFile = async (file: File) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isMp4 = file.type === 'video/mp4' || ext === 'mp4';
    const isMov = file.type === 'video/quicktime' || ext === 'mov';

    if (!isMp4 && !isMov) {
      toast({ title: "Unsupported format", description: "Use MP4 or MOV.", variant: "destructive" });
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      toast({
        title: "Video too large",
        description: "Max 50MB — try recording at lower quality or shorter.",
        variant: "destructive"
      });
      return;
    }

    setUploadingVideo(true);
    try {
      // Force the content type by extension so the bucket's MIME restriction
      // (video/mp4, video/quicktime) always matches, even if the browser reports
      // an empty/odd file.type for a phone-recorded .mov.
      const contentType = isMov ? 'video/quicktime' : 'video/mp4';
      const fileExt = isMov ? 'mov' : 'mp4';
      const fileName = `${userInfo.id}/presentation-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('talent-pool-videos')
        .upload(fileName, file, { upsert: true, contentType });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('talent-pool-videos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase.rpc('talent_pool_update_student_video' as any, {
        _user_id: userInfo.id,
        _video_url: publicUrl
      });
      if (updateError) throw updateError;

      setStudentProfile((prev: any) => ({ ...prev, presentation_video_url: publicUrl }));
      toast({ title: "Video uploaded", description: "Your presentation video is now visible to companies." });
    } catch (err: any) {
      console.error('Video upload error:', err);
      toast({ title: "Upload error", description: err.message || "Unable to upload video", variant: "destructive" });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processVideoFile(file);
    e.target.value = ''; // allow re-selecting the same file
  };

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadingVideo) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processVideoFile(file);
  };

  const handleVideoRemove = async () => {
    try {
      const { error } = await supabase.rpc('talent_pool_update_student_video' as any, {
        _user_id: userInfo.id,
        _video_url: null
      });
      if (error) throw error;
      setStudentProfile((prev: any) => ({ ...prev, presentation_video_url: null }));
      toast({ title: "Video removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Force download via fetch+blob to avoid popup blockers and cross-origin issues
  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast({ title: t('studentTalentPool.success.documentDownloaded') });
    } catch (e: any) {
      console.error('Download error:', e);
      // Fallback: try opening in new tab
      try { window.open(url, '_blank'); } catch {}
      toast({
        title: t('studentTalentPool.errors.documentError'),
        description: e?.message || 'Unable to download the file',
        variant: 'destructive'
      });
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      const { error } = await supabase
        .rpc('talent_pool_update_student_preferences', {
          _user_id: userInfo.id,
          _preferred_company_types: studentProfile?.preferred_company_types || [],
          _preferred_sectors: studentProfile?.preferred_sectors || [],
          _internship_period: studentProfile?.internship_period || null,
          _compensation_preference: studentProfile?.compensation_preference || 'BOTH',
          _internship_start_date: studentProfile?.internship_start_date || null,
          _internship_end_date: studentProfile?.internship_end_date || null,
          _preferred_locations: studentProfile?.preferred_locations || []
        });

      if (error) throw error;

      toast({ 
        title: t('studentTalentPool.success.preferencesSaved'),
        description: t('studentTalentPool.success.preferencesSavedDesc')
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: t('studentTalentPool.errors.preferencesError'),
        description: t('studentTalentPool.errors.preferencesErrorDesc'),
        variant: "destructive"
      });
    }
  };

  // Save the student's LinkedIn URL via the dedicated SECURITY DEFINER RPC.
  // Optional: an empty value clears it. Independent of the other profile saves.
  const handleSaveLinkedIn = async () => {
    try {
      const url = (studentProfile?.linkedin_url || '').trim();
      const { error } = await supabase.rpc('talent_pool_update_student_linkedin' as any, {
        _user_id: userInfo.id,
        _linkedin_url: url || null,
      });
      if (error) throw error;
      setStudentProfile((prev: any) => prev ? { ...prev, linkedin_url: url || null } : prev);
      toast({ title: "LinkedIn saved", description: url ? "Your LinkedIn link has been updated." : "Your LinkedIn link has been removed." });
    } catch (e: any) {
      console.error('Error saving LinkedIn:', e);
      toast({ title: "Error", description: e.message || "Unable to save LinkedIn", variant: "destructive" });
    }
  };

  // --- Work eligibility / bureaucracy (passport, visa, address, dates) ---
  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
    if (!allowed) {
      toast({ title: "Invalid file", description: "Upload a JPG, PNG or PDF of your passport.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please keep the passport scan under 10MB.", variant: "destructive" });
      return;
    }
    setUploadingPassport(true);
    try {
      // Fixed object name so a re-upload replaces the previous scan.
      const path = `${userInfo.id}/passport`;
      const { error: upErr } = await supabase.storage
        .from('talent-pool-passports')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { error: rpcErr } = await supabase.rpc('talent_pool_update_student_bureaucracy' as any, {
        _user_id: userInfo.id,
        _passport_url: path,
      });
      if (rpcErr) throw rpcErr;

      setStudentProfile((prev: any) => prev ? { ...prev, passport_url: path } : prev);
      toast({ title: "Passport uploaded", description: "Your passport scan has been saved securely." });
    } catch (err: any) {
      console.error('Passport upload error:', err);
      toast({ title: "Upload failed", description: err.message || "Could not upload the passport.", variant: "destructive" });
    } finally {
      setUploadingPassport(false);
      if (passportInputRef.current) passportInputRef.current.value = '';
    }
  };

  const handleViewPassport = async (studentId: string) => {
    setViewingPassport(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-passport-url', { body: { studentId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
      else throw new Error('No passport found');
    } catch (e: any) {
      console.error('View passport error:', e);
      toast({ title: "Error", description: e.message || "Could not open the passport.", variant: "destructive" });
    } finally {
      setViewingPassport(false);
    }
  };

  const handleSaveBureaucracy = async () => {
    setSavingBureaucracy(true);
    try {
      const { error } = await supabase.rpc('talent_pool_update_student_bureaucracy' as any, {
        _user_id: userInfo.id,
        _uk_work_visa: studentProfile?.uk_work_visa || null,
        _work_start_date: studentProfile?.internship_start_date || null,
        _work_end_date: studentProfile?.internship_end_date || null,
        _home_address: studentProfile?.home_address ?? '',
        _city: studentProfile?.city ?? '',
        _country: studentProfile?.country ?? '',
        _citizenship: studentProfile?.citizenship ?? '',
      });
      if (error) throw error;
      toast({ title: "Details saved", description: "Your work-eligibility details have been updated." });
    } catch (e: any) {
      console.error('Save bureaucracy error:', e);
      toast({ title: "Error", description: e.message || "Could not save your details.", variant: "destructive" });
    } finally {
      setSavingBureaucracy(false);
    }
  };

  const toggleCompanyType = (type: string) => {
    setStudentProfile(prev => {
      if (!prev) return prev;
      const types = prev.preferred_company_types || [];
      const newTypes = types.includes(type)
        ? types.filter(t => t !== type)
        : [...types, type];
      return { ...prev, preferred_company_types: newTypes };
    });
  };

  const toggleSector = (sector: string) => {
    setStudentProfile(prev => {
      if (!prev) return prev;
      const sectors = prev.preferred_sectors || [];
      const newSectors = sectors.includes(sector)
        ? sectors.filter(s => s !== sector)
        : [...sectors, sector];
      return { ...prev, preferred_sectors: newSectors };
    });
  };

  const toggleLocation = (location: string) => {
    setStudentProfile(prev => {
      if (!prev) return prev;
      const locations = prev.preferred_locations || [];
      const newLocations = locations.includes(location)
        ? locations.filter(l => l !== location)
        : [...locations, location];
      return { ...prev, preferred_locations: newLocations };
    });
  };

  const toggleFilterSector = (sector: string) => {
    setSelectedSectors(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  const handleLeaveTalentPool = async () => {
    if (!userInfo?.id || !studentProfile) return;

    try {
      const studentName = `${studentProfile.first_name} ${studentProfile.last_name}`;
      
      const { error } = await supabase.functions.invoke('send-talent-pool-leave', {
        body: {
          userId: userInfo.id,
          name: studentName,
          email: userInfo.email,
          role: 'STUDENT'
        }
      });

      if (error) throw error;

      toast({
        title: "Left Talent Pool",
        description: "You have successfully left the Talent Pool. You can no longer access this area."
      });

      // Logout after leaving
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge className="bg-warning text-white"><Clock className="h-3 w-3 mr-1" /> Under Review</Badge>;
      case 'accepted_pending_payment':
        return <Badge className="bg-sky text-white"><CheckCircle className="h-3 w-3 mr-1" /> Admitted - Upload Payment</Badge>;
      case 'payment_uploaded':
        return <Badge className="bg-warning text-white"><Clock className="h-3 w-3 mr-1" /> Payment Under Verification</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'active_member':
        return <Badge className="bg-success text-white"><CheckCircle className="h-3 w-3 mr-1" /> Active Member</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Student Dashboard</h1>
            <p className="text-steel-gray mt-1">Welcome, {studentProfile?.first_name} {studentProfile?.last_name}</p>
          </div>
          <div className="flex items-center gap-2">
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
                    This action will permanently remove your profile from the Talent Pool. 
                    Companies will no longer be able to view your profile and you will lose access to company listings.
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

        {/* Status Overview */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getStatusBadge(userInfo?.status || 'pending_review')}
            </CardContent>
          </Card>

          {/* Companies that selected this student */}
          <Card className="border-2 border-success">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-success" />
                Interested Companies
                {selectedCompanies.length > 0 && (
                  <Badge className="ml-2 bg-success">{selectedCompanies.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCompanies.length === 0 ? (
                <div className="text-steel-gray text-sm">No companies have selected your profile yet.</div>
              ) : (
                <div className="space-y-3">
                  {selectedCompanies.map((selection) => {
                    const company = selection.talent_pool_users?.company_profiles?.[0];
                    return (
                      <Card key={selection.id} className="p-4 border-l-4 border-l-success">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={company?.logo_url || undefined} />
                            <AvatarFallback>{company?.company_name?.[0] || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{company?.company_name || 'Company'}</h4>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary">{company?.size || 'N/A'}</Badge>
                              <Badge variant="outline">{company?.sector || 'N/A'}</Badge>
                            </div>
                            {company?.description && (
                              <p className="text-sm text-steel-gray mt-2">{company.description}</p>
                            )}
                            <p className="text-xs text-steel-gray mt-2">
                              Selected: {new Date(selection.selected_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All registered students have full access immediately */}
        {(

          <>
            {/* Active Recruiting Section */}
            <div className="mb-6">
              <ActiveRecruitingSection
                userId={userInfo.id}
                userType="STUDENT"
                userName={`${studentProfile?.first_name || ''} ${studentProfile?.last_name || ''}`}
                userEmail={userInfo.email || ''}
              />
            </div>
            {/* Disclaimer about company selection notifications */}
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-steel-gray">
                    <p className="font-medium text-foreground mb-1">
                      {language === 'it' ? 'Come funziona la selezione' : 'How selection works'}
                    </p>
                    <p>
                      {language === 'it' 
                        ? 'Quando un\'azienda seleziona il tuo profilo, verrai notificato sia nella tua area personale che via email. Il team di Career Pilot ti contatterà per organizzare i prossimi step.'
                        : 'When a company selects your profile, you will be notified both in your personal area and by email. The Career Pilot team will reach out to organize the next steps.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Three sections as tabs (overview above stays outside) */}
            <Tabs defaultValue="companies" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="companies">Partner Companies</TabsTrigger>
                <TabsTrigger value="events">Scheduled events</TabsTrigger>
                <TabsTrigger value="prep">Prep Material</TabsTrigger>
                <TabsTrigger value="profile">Personal Profile</TabsTrigger>
              </TabsList>

              {/* SECTION 3 — Personal Profile */}
              <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('studentTalentPool.profile.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={studentProfile.photo_url || undefined} />
                      <AvatarFallback>
                        {studentProfile.first_name?.[0]}{studentProfile.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Upload className="h-4 w-4" />
                        {t('studentTalentPool.profile.uploadPhoto')}
                      </div>
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </Label>
                  </div>

                  <div>
                    <p className="font-semibold text-lg text-center">
                      {studentProfile.first_name} {studentProfile.last_name}
                    </p>
                    {studentProfile.linkedin_url && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <a 
                          href={studentProfile.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Linkedin className="h-3 w-3" />
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                  </div>

                  {/* LinkedIn — editable (optional) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn (optional)
                    </Label>
                    <Input
                      type="url"
                      placeholder="https://www.linkedin.com/in/your-profile"
                      value={studentProfile.linkedin_url || ''}
                      onChange={(e) => setStudentProfile((prev: any) => prev ? { ...prev, linkedin_url: e.target.value } : prev)}
                    />
                    <Button size="sm" variant="outline" className="w-full" onClick={handleSaveLinkedIn}>
                      Save LinkedIn
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('studentTalentPool.profile.preferences')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4" />
                      {t('studentTalentPool.profile.companyTypes')}
                    </Label>
                    <div className="space-y-2">
                      {COMPANY_TYPES.map(type => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox
                            checked={studentProfile.preferred_company_types?.includes(type)}
                            onCheckedChange={() => toggleCompanyType(type)}
                          />
                          <Label className="cursor-pointer">{type}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4" />
                      {t('studentTalentPool.profile.sectors')}
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {SECTORS.map(sector => (
                        <div key={sector} className="flex items-center gap-2">
                          <Checkbox
                            checked={studentProfile.preferred_sectors?.includes(sector)}
                            onCheckedChange={() => toggleSector(sector)}
                          />
                          <Label className="cursor-pointer">{sector}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      {t('studentTalentPool.profile.locations')}
                    </Label>
                    <div className="space-y-2">
                      {LOCATIONS.map(location => (
                        <div key={location} className="flex items-center gap-2">
                          <Checkbox
                            checked={studentProfile.preferred_locations?.includes(location)}
                            onCheckedChange={() => toggleLocation(location)}
                          />
                          <Label className="cursor-pointer">{location}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4" />
                      {t('studentTalentPool.profile.period')}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !studentProfile.internship_start_date && !studentProfile.internship_end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {studentProfile.internship_start_date && studentProfile.internship_end_date ? (
                            <>
                              {format(new Date(studentProfile.internship_start_date), "dd MMM yyyy", { locale: language === 'en' ? enUS : it })} -{" "}
                              {format(new Date(studentProfile.internship_end_date), "dd MMM yyyy", { locale: language === 'en' ? enUS : it })}
                            </>
                          ) : (
                            <span>{t('studentTalentPool.profile.selectPeriod')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{
                            from: studentProfile.internship_start_date ? new Date(studentProfile.internship_start_date) : undefined,
                            to: studentProfile.internship_end_date ? new Date(studentProfile.internship_end_date) : undefined,
                          }}
                          onSelect={(range) => {
                            setStudentProfile(prev => prev ? {
                              ...prev,
                              internship_start_date: range?.from ? range.from.toISOString().split('T')[0] : null,
                              internship_end_date: range?.to ? range.to.toISOString().split('T')[0] : null
                            } : null);
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          numberOfMonths={2}
                          locale={language === 'en' ? enUS : it}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Euro className="h-4 w-4" />
                      {t('studentTalentPool.profile.compensation')}
                    </Label>
                    <Select
                      value={studentProfile.compensation_preference || 'BOTH'}
                      onValueChange={(value) => setStudentProfile(prev => prev ? { ...prev, compensation_preference: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPENSATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleUpdatePreferences} className="w-full">
                    {t('studentTalentPool.profile.saveButton')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('studentTalentPool.profile.documents')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      {t('studentTalentPool.profile.cv')}
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div 
                          onClick={() => cvInputRef.current?.click()}
                          className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </div>
                        <Input
                          ref={cvInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload('cv', e)}
                          className="hidden"
                        />
                        {studentProfile.cv_url && (
                          <p className="text-xs text-muted-foreground mt-1">File uploaded</p>
                        )}
                      </div>
                      {studentProfile.cv_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(studentProfile.cv_url, 'CV.pdf')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t('studentTalentPool.profile.download')}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      {t('studentTalentPool.profile.coverLetter')}
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div 
                          onClick={() => coverInputRef.current?.click()}
                          className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </div>
                        <Input
                          ref={coverInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload('cover', e)}
                          className="hidden"
                        />
                        {studentProfile.cover_letter_url && (
                          <p className="text-xs text-muted-foreground mt-1">File uploaded</p>
                        )}
                      </div>
                      {studentProfile.cover_letter_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(studentProfile.cover_letter_url, 'Cover-Letter.pdf')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t('studentTalentPool.profile.download')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Presentation Video (optional)
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="What to say in your video"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm leading-relaxed">
                        <p className="font-medium mb-1">What to record</p>
                        <p className="text-muted-foreground">
                          Record a 2-minute video introducing yourself: who you are, what you've studied,
                          what you enjoy doing, and why you'd be a great fit. Keep it under 2 minutes, and
                          record it in English.
                        </p>
                        <p className="text-muted-foreground mt-2">
                          Keep the file under 50MB — record at standard quality (not 4K) or keep it short.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload a short video presenting yourself: who you are, what you do and what you're looking for. Companies and Career Pilot will be able to watch and download it.
                  </p>
                  {studentProfile.presentation_video_url ? (
                    <div className="space-y-2">
                      <video
                        src={studentProfile.presentation_video_url}
                        controls
                        className="w-full rounded-md border bg-black"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(studentProfile.presentation_video_url, 'My-Presentation.mp4')}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => videoInputRef.current?.click()}
                          className="flex-1"
                          disabled={uploadingVideo}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Replace
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleVideoRemove}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploadingVideo && videoInputRef.current?.click()}
                      onDrop={handleVideoDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-input bg-background px-3 text-sm text-center hover:bg-accent cursor-pointer"
                    >
                      {uploadingVideo ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          Uploading...
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 font-medium">
                            <Upload className="h-4 w-4" />
                            Drag &amp; drop a video here, or click to choose
                          </div>
                          <span className="text-xs text-muted-foreground">MP4 or MOV · max 50MB</span>
                        </>
                      )}
                    </div>
                  )}
                  <Input
                    ref={videoInputRef}
                    type="file"
                    accept=".mp4,.mov,video/mp4,video/quicktime"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </CardContent>
              </Card>



              {/* Work eligibility & bureaucracy — passport, visa, dates, address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    {language === 'it' ? 'Idoneità al lavoro & documenti' : 'Work Eligibility & Documents'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {language === 'it'
                      ? 'Questi dati aiutano le aziende con le pratiche burocratiche (visto, documento, date, residenza). Visibili alle aziende che ti selezionano e al team Career Pilot.'
                      : 'These details help companies with paperwork (visa, ID, dates, residence). Visible to companies that select you and the Career Pilot team.'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Passport */}
                  <div className="space-y-2">
                    <Label>{language === 'it' ? 'Passaporto' : 'Passport'}</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" onClick={() => passportInputRef.current?.click()} disabled={uploadingPassport}>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingPassport
                          ? (language === 'it' ? 'Caricamento...' : 'Uploading...')
                          : studentProfile.passport_url
                            ? (language === 'it' ? 'Sostituisci passaporto' : 'Replace passport')
                            : (language === 'it' ? 'Carica passaporto' : 'Upload passport')}
                      </Button>
                      {studentProfile.passport_url && (
                        <Button variant="outline" onClick={() => handleViewPassport(userInfo.id)} disabled={viewingPassport}>
                          <Eye className="h-4 w-4 mr-2" />
                          {viewingPassport ? (language === 'it' ? 'Apertura...' : 'Opening...') : (language === 'it' ? 'Visualizza' : 'View')}
                        </Button>
                      )}
                      {studentProfile.passport_url && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" /> {language === 'it' ? 'Caricato' : 'Uploaded'}
                        </span>
                      )}
                    </div>
                    <Input
                      ref={passportInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={handlePassportUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'it'
                        ? 'JPG, PNG o PDF (max 10MB). Conservato in modo sicuro e mostrato solo tramite link temporaneo.'
                        : 'JPG, PNG or PDF (max 10MB). Stored securely and shown only via a temporary link.'}
                    </p>
                  </div>

                  {/* UK work visa */}
                  <div className="space-y-2">
                    <Label>{language === 'it' ? 'Diritto a lavorare nel Regno Unito' : 'Right to work in the UK'}</Label>
                    <Select
                      value={studentProfile.uk_work_visa || ''}
                      onValueChange={(v) => setStudentProfile(prev => prev ? { ...prev, uk_work_visa: v } : prev)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'it' ? 'Seleziona...' : 'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YES">{language === 'it' ? 'Sì, posso lavorare in UK' : 'Yes, I can work in the UK'}</SelectItem>
                        <SelectItem value="NO">{language === 'it' ? 'No' : 'No'}</SelectItem>
                        <SelectItem value="APPLYING">{language === 'it' ? 'In richiesta' : 'Applying / in progress'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Work dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{language === 'it' ? 'Inizio lavoro' : 'Work start date'}</Label>
                      <Input
                        type="date"
                        value={studentProfile.internship_start_date || ''}
                        onChange={(e) => setStudentProfile(prev => prev ? { ...prev, internship_start_date: e.target.value || null } : prev)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'it' ? 'Fine lavoro' : 'Work end date'}</Label>
                      <Input
                        type="date"
                        value={studentProfile.internship_end_date || ''}
                        onChange={(e) => setStudentProfile(prev => prev ? { ...prev, internship_end_date: e.target.value || null } : prev)}
                      />
                    </div>
                  </div>

                  {/* Residence + citizenship */}
                  <div className="space-y-2">
                    <Label>{language === 'it' ? 'Indirizzo di casa' : 'Home address'}</Label>
                    <Input
                      value={studentProfile.home_address || ''}
                      onChange={(e) => setStudentProfile(prev => prev ? { ...prev, home_address: e.target.value } : prev)}
                      placeholder={language === 'it' ? 'Via, numero civico...' : 'Street, number...'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{language === 'it' ? 'Città' : 'City'}</Label>
                      <Input
                        value={studentProfile.city || ''}
                        onChange={(e) => setStudentProfile(prev => prev ? { ...prev, city: e.target.value } : prev)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'it' ? 'Paese' : 'Country'}</Label>
                      <Input
                        value={studentProfile.country || ''}
                        onChange={(e) => setStudentProfile(prev => prev ? { ...prev, country: e.target.value } : prev)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'it' ? 'Cittadinanza' : 'Citizenship'}</Label>
                    <Input
                      value={studentProfile.citizenship || ''}
                      onChange={(e) => setStudentProfile(prev => prev ? { ...prev, citizenship: e.target.value } : prev)}
                      placeholder={language === 'it' ? 'es. Italiana' : 'e.g. Italian'}
                    />
                  </div>

                  <Button onClick={handleSaveBureaucracy} disabled={savingBureaucracy} className="w-full">
                    {savingBureaucracy ? (language === 'it' ? 'Salvataggio...' : 'Saving...') : (language === 'it' ? 'Salva dettagli' : 'Save details')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Profile Visibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="profile-visible"
                      checked={studentProfile.profile_visible_to_companies || false}
                      onCheckedChange={async (checked) => {
                        try {
                          // Talent Pool client is unauthenticated (anon), so a direct
                          // UPDATE is blocked by RLS — go through the SECURITY DEFINER RPC.
                          // (Cast: this RPC isn't in the generated types yet.)
                          const { error } = await (supabase.rpc as any)('tp_set_profile_visibility', {
                            _student_id: userInfo.id,
                            _visible: checked as boolean,
                          });

                          if (error) throw error;

                          setStudentProfile(prev => prev ? { ...prev, profile_visible_to_companies: checked as boolean } : null);
                          
                          toast({
                            title: checked ? "Profile Visible" : "Profile Hidden",
                            description: checked 
                              ? "Your profile is now visible to companies" 
                              : "Your profile has been hidden from companies"
                          });
                        } catch (error) {
                          console.error('Error updating visibility:', error);
                          toast({
                            title: "Error",
                            description: "Unable to update profile visibility",
                            variant: "destructive"
                          });
                        }
                      }}
                    />
                    <Label htmlFor="profile-visible" className="cursor-pointer">
                      Make my profile visible to companies
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    When enabled, companies will be able to see my name, photo, CV, and cover letter.
                  </p>
                </CardContent>
              </Card>

              </TabsContent>

              {/* SECTION 2 — Prep Material */}
              <TabsContent value="prep" className="space-y-4">
                <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {language === 'it' ? 'Materiale di Preparazione' : 'Prep Material'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-steel-gray">
                      {language === 'it'
                        ? 'Accedi al materiale Knowledge Base dedicato all\'Internship Placement: guide PDF, modelli Excel e pacchetti pronti per le selezioni. Acquista e scarica tutto ciò che ti serve.'
                        : 'Access the Knowledge Base material dedicated to Internship Placement: PDF guides, Excel models and ready-made packages for your selections. Buy and download everything you need.'}
                    </p>
                    <Button
                      onClick={() => navigate('/knowledge-base?tier=Internship+Placement')}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {language === 'it' ? 'Apri Prep Material' : 'Open Prep Material'}
                    </Button>
                    <p className="md:hidden text-xs text-muted-foreground">
                      {language === 'it'
                        ? 'Per sfogliare comodamente tutto il materiale, ti consigliamo di aprirlo su desktop.'
                        : 'To browse all the material comfortably, we recommend opening it on desktop.'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SECTION 1 — Partner Companies (kept as-is, no redesign) */}
              <TabsContent value="companies" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('studentTalentPool.companies.filters')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('studentTalentPool.companies.search')}
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Filter className="h-4 w-4" />
                      {t('studentTalentPool.companies.sector')}
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {SECTORS.map(sector => (
                        <Badge
                          key={sector}
                          variant={selectedSectors.includes(sector) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleFilterSector(sector)}
                        >
                          {sector}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {t('studentTalentPool.companies.title')} ({filteredCompanies.length})
                </h2>
                {filteredCompanies.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      {t('studentTalentPool.companies.noCompanies')}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="md:space-y-4 max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:gap-3 max-md:overflow-x-auto max-md:px-4 max-md:pb-2">
                  {filteredCompanies.map(company => (
                    <Card key={company.id} className="max-md:snap-center max-md:shrink-0 max-md:w-[85vw]">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={company.logo_url || undefined} />
                            <AvatarFallback>{company.company_name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{company.company_name}</h3>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary">{company.size}</Badge>
                              <Badge variant="outline">{company.sector}</Badge>
                            </div>
                            {company.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {company.description}
                              </p>
                            )}
                            {company.linkedin_url && (
                              <Button
                                variant="link"
                                size="sm"
                                className="px-0 mt-2"
                                onClick={() => window.open(company.linkedin_url, '_blank')}
                              >
                                <Linkedin className="h-4 w-4 mr-1" />
                                {t('studentTalentPool.companies.linkedinProfile')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                )}
              </div>
              </TabsContent>

              {/* SECTION 4 — Scheduled events (meeting accept / decline / counter) */}
              <TabsContent value="events" className="space-y-4">
                <StudentScheduledEventsTab studentId={userInfo.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;