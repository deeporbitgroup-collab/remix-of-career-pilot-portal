import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Check,
  Euro,
  Calendar as CalendarIcon,
  Search,
  Filter,
  MapPin,
  Linkedin,
  DoorOpen,
  Bell,
  Info,
  Sparkles,
  LayoutDashboard,
  ExternalLink,
  Video
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StudentScheduledEventsTab from "@/components/talent-pool/StudentScheduledEventsTab";
import BoostResources from "@/components/talent-pool/BoostResources";
import StudentTestsTab from "@/components/talent-pool/StudentTestsTab";
import { downloadTalentPoolDocument } from "@/lib/talentPoolDocuments";
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
import { TALENT_POOL_COMPANY_SECTORS, sectorsFromCompanies } from "@/data/talentPoolSectors";

const COMPANY_TYPES = ["STARTUP", "BOUTIQUE", "MEDIUM_SIZE", "LARGE_COMPANY"];
const LOCATIONS = ["London", "Milan"];
// Display labels only — the stored values stay the enum codes / English city names.
const COMPANY_TYPE_LABELS_IT: Record<string, string> = {
  STARTUP: "STARTUP",
  BOUTIQUE: "BOUTIQUE",
  MEDIUM_SIZE: "MEDIA IMPRESA",
  LARGE_COMPANY: "GRANDE AZIENDA",
};
const LOCATION_LABELS_IT: Record<string, string> = { London: "Londra", Milan: "Milano" };

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, tx, language, setLanguage } = useTalentPoolLanguage();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<any[]>([]);
  // "+N" badge on the Scheduled events tab: number of meetings awaiting the
  // student's response. Derived from meeting state, so it persists until the
  // student actually acts (which changes the meeting status), not on tab open.
  const [actionableMeetings, setActionableMeetings] = useState(0);
  // "+N" badge on the Tests tab: number of tests still to complete (status SENT).
  const [actionableTests, setActionableTests] = useState(0);

  // Industry filter chips = distinct sector values from company profiles (company or admin).
  const companyFilterSectors = useMemo(() => sectorsFromCompanies(companies), [companies]);
  
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

  // Count meetings the student still has to respond to (company proposed, status PROPOSED).
  const refreshMeetingBadge = useCallback(async () => {
    if (!userInfo?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke('get-recruiting-meetings', {
        body: { studentId: userInfo.id }
      });
      if (error) return;
      const n = (Array.isArray(data) ? data : []).filter(
        (m: any) => m.status === 'PROPOSED' && m.proposed_by === 'COMPANY'
      ).length;
      setActionableMeetings(n);
    } catch (e) {
      console.error('Meeting badge error:', e);
    }
  }, [userInfo?.id]);

  useEffect(() => { refreshMeetingBadge(); }, [refreshMeetingBadge]);

  // Count tests the student still has to complete (status SENT).
  const refreshTestBadge = useCallback(async () => {
    if (!userInfo?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke('get-recruiting-tests', {
        body: { studentId: userInfo.id }
      });
      if (error) return;
      const n = (Array.isArray(data) ? data : []).filter((t: any) => t.status === 'SENT').length;
      setActionableTests(n);
    } catch (e) {
      console.error('Test badge error:', e);
    }
  }, [userInfo?.id]);

  useEffect(() => { refreshTestBadge(); }, [refreshTestBadge]);

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
      if (document.visibilityState === 'visible') { refreshSelections(); refreshMeetingBadge(); refreshTestBadge(); }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id, refreshSelections]);
  const filterCompanies = () => {
    let filtered = companies;


    if (selectedSectors.length > 0) {
      filtered = filtered.filter((c) =>
        selectedSectors.includes((c.sector || "").trim())
      );
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

      // Companies hidden from the student "Partner Companies" list (still registered in the DB)
      const HIDDEN_PARTNER_COMPANIES = ['optera labs'];
      setCompanies(
        (companiesData || []).filter(
          (c: any) => !HIDDEN_PARTNER_COMPANIES.some((name) => (c.company_name || '').toLowerCase().includes(name))
        )
      );

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: tx("Error", "Errore"),
        description: tx("Unable to load data", "Impossibile caricare i dati"),
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
        description: tx('Allowed types: PDF, DOC, DOCX, JPG, PNG', 'Formati consentiti: PDF, DOC, DOCX, JPG, PNG'),
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
      toast({ title: tx("Unsupported format", "Formato non supportato"), description: tx("Use MP4 or MOV.", "Usa MP4 o MOV."), variant: "destructive" });
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      toast({
        title: tx("Video too large", "Video troppo pesante"),
        description: tx("Max 50MB — try recording at lower quality or shorter.", "Max 50MB — prova a registrare a qualità più bassa o più breve."),
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
      toast({ title: tx("Video uploaded", "Video caricato"), description: tx("Your presentation video is now visible to companies.", "Il tuo video di presentazione è ora visibile alle aziende.") });
    } catch (err: any) {
      console.error('Video upload error:', err);
      toast({ title: tx("Upload error", "Errore di caricamento"), description: err.message || tx("Unable to upload video", "Impossibile caricare il video"), variant: "destructive" });
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
      toast({ title: tx("Video removed", "Video rimosso") });
    } catch (err: any) {
      toast({ title: tx("Error", "Errore"), description: err.message, variant: "destructive" });
    }
  };

  // Force download via Storage API / fetch+blob — never window.open (avoids the
  // browser's broken "could not load PDF" viewer on missing or stale URLs).
  const handleDownload = async (url: string, filename: string, bucketHint?: "talent-pool-cv" | "talent-pool-covers") => {
    try {
      await downloadTalentPoolDocument(url, filename, bucketHint);
      toast({ title: t('studentTalentPool.success.documentDownloaded') });
    } catch (e: any) {
      console.error('Download error:', e);
      toast({
        title: t('studentTalentPool.errors.documentError'),
        description: tx('This file could not be loaded. Please re-upload the document.', 'Impossibile caricare questo file. Carica di nuovo il documento.'),
        variant: 'destructive'
      });
    }
  };

  // "Looking for a full-time job" flag, saved right away (next to the internship period)
  const toggleFullTime = async () => {
    if (!studentProfile || !userInfo?.id) return;
    const next = !studentProfile.full_employment_available;
    setStudentProfile(prev => prev ? { ...prev, full_employment_available: next } : prev);
    const { error } = await supabase.rpc('talent_pool_update_student_full_time' as any, {
      _user_id: userInfo.id,
      _full_time: next,
    });
    if (error) {
      console.error('Error updating full-time preference:', error);
      setStudentProfile(prev => prev ? { ...prev, full_employment_available: !next } : prev);
      toast({
        title: tx("Couldn't save", "Salvataggio non riuscito"),
        description: tx("Please try again in a moment.", "Riprova tra poco."),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: next
        ? tx("You're looking for a full-time job", "Cerchi un lavoro full-time")
        : tx("Full-time search turned off", "Ricerca full-time disattivata"),
    });
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
      toast({ title: tx("LinkedIn saved", "LinkedIn salvato"), description: url ? tx("Your LinkedIn link has been updated.", "Il tuo link LinkedIn è stato aggiornato.") : tx("Your LinkedIn link has been removed.", "Il tuo link LinkedIn è stato rimosso.") });
    } catch (e: any) {
      console.error('Error saving LinkedIn:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Unable to save LinkedIn", "Impossibile salvare LinkedIn"), variant: "destructive" });
    }
  };

  // --- Work eligibility / bureaucracy (passport, visa, address, dates) ---
  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
    if (!allowed) {
      toast({ title: tx("Invalid file", "File non valido"), description: tx("Upload a JPG, PNG or PDF of your passport.", "Carica il passaporto in formato JPG, PNG o PDF."), variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: tx("File too large", "File troppo pesante"), description: tx("Please keep the passport scan under 10MB.", "La scansione del passaporto deve essere inferiore a 10MB."), variant: "destructive" });
      return;
    }
    setUploadingPassport(true);
    try {
      // The passport bucket is PRIVATE — an anon client can't INSERT via RLS — so
      // the upload goes through a service-role edge function. Send the file as base64.
      const fileBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error(tx('Could not read the file', 'Impossibile leggere il file')));
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('upload-passport', {
        body: { studentId: userInfo.id, contentType: file.type, fileBase64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error(tx('Upload failed', 'Caricamento non riuscito'));

      setStudentProfile((prev: any) => prev ? { ...prev, passport_url: data.path } : prev);
      toast({ title: tx("Passport uploaded", "Passaporto caricato"), description: tx("Your passport scan has been saved securely.", "La scansione del passaporto è stata salvata in modo sicuro.") });
    } catch (err: any) {
      console.error('Passport upload error:', err);
      toast({ title: tx("Upload failed", "Caricamento non riuscito"), description: err.message || tx("Could not upload the passport.", "Impossibile caricare il passaporto."), variant: "destructive" });
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
      else throw new Error(tx('No passport found', 'Nessun passaporto trovato'));
    } catch (e: any) {
      console.error('View passport error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Could not open the passport.", "Impossibile aprire il passaporto."), variant: "destructive" });
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
      // Visa type + expiry are only kept when the student has the right to work in the UK
      const hasUkRight = studentProfile?.uk_work_visa === 'YES';
      const { error: visaError } = await supabase.rpc('talent_pool_update_student_uk_visa' as any, {
        _user_id: userInfo.id,
        _visa_type: hasUkRight ? (studentProfile?.uk_visa_type || null) : null,
        _visa_expiry: hasUkRight ? (studentProfile?.uk_visa_expiry || null) : null,
      });
      if (visaError) throw visaError;
      toast({ title: tx("Details saved", "Dettagli salvati"), description: tx("Your work-eligibility details have been updated.", "I tuoi dati di idoneità al lavoro sono stati aggiornati.") });
    } catch (e: any) {
      console.error('Save bureaucracy error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Could not save your details.", "Impossibile salvare i tuoi dati."), variant: "destructive" });
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
          role: 'STUDENT',
          language
        }
      });

      if (error) throw error;

      toast({
        title: tx("Left Talent Pool", "Hai lasciato la Talent Pool"),
        description: tx("You have successfully left the Talent Pool. You can no longer access this area.", "Hai lasciato la Talent Pool. Non puoi più accedere a quest'area.")
      });

      // Logout after leaving
      localStorage.removeItem('talentPoolRole');
      localStorage.removeItem('talentPoolUser');
      navigate('/talent-pool');
    } catch (error: any) {
      console.error('Leave error:', error);
      toast({
        title: tx("Error", "Errore"),
        description: error.message || tx("Failed to leave Talent Pool", "Impossibile lasciare la Talent Pool"),
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
        return <Badge className="bg-warning text-white"><Clock className="h-3 w-3 mr-1" /> {tx("Under Review", "In revisione")}</Badge>;
      case 'accepted_pending_payment':
        return <Badge className="bg-sky text-white"><CheckCircle className="h-3 w-3 mr-1" /> {tx("Admitted - Upload Payment", "Ammissione confermata - Carica il pagamento")}</Badge>;
      case 'payment_uploaded':
        return <Badge className="bg-warning text-white"><Clock className="h-3 w-3 mr-1" /> {tx("Payment Under Verification", "Pagamento in verifica")}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> {tx("Rejected", "Non ammesso")}</Badge>;
      case 'active_member':
        return <Badge className="bg-success text-white"><CheckCircle className="h-3 w-3 mr-1" /> {tx("Active Member", "Membro attivo")}</Badge>;
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
            <h1 className="text-3xl font-bold text-primary">{tx("Student Dashboard", "Dashboard studente")}</h1>
            <p className="text-steel-gray mt-1">{tx("Welcome,", "Ciao,")} {studentProfile?.first_name} {studentProfile?.last_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Language for the whole Talent Pool — pages and the emails you receive */}
            <div role="group" aria-label={tx("Language", "Lingua")} className="flex items-center rounded-full border bg-card p-0.5">
              {(['it', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  aria-pressed={language === lang}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold tracking-wide transition-colors ${
                    language === lang ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {tx("Logout", "Esci")}
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5" />
                {tx("Profile Status", "Stato del profilo")}
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
                {tx("Interested Companies", "Aziende interessate")}
                {selectedCompanies.length > 0 && (
                  <Badge className="ml-2 bg-success">{selectedCompanies.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCompanies.length === 0 ? (
                <div className="text-steel-gray text-sm">{tx("No companies have selected your profile yet.", "Nessuna azienda ha ancora selezionato il tuo profilo.")}</div>
              ) : (
                <div className="space-y-3 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:gap-3 max-md:space-y-0 max-md:overflow-x-auto max-md:pb-2 max-md:[&>*]:w-[85vw] max-md:[&>*]:shrink-0 max-md:[&>*]:snap-center">
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
                            <h4 className="font-semibold text-lg">{company?.company_name || tx('Company', 'Azienda')}</h4>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary">{company?.size || 'N/A'}</Badge>
                              <Badge variant="outline">{company?.sector || 'N/A'}</Badge>
                            </div>
                            {company?.description && (
                              <p className="text-sm text-steel-gray mt-2">{company.description}</p>
                            )}
                            <p className="text-xs text-steel-gray mt-2">
                              {tx("Selected:", "Selezionato il:")} {new Date(selection.selected_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
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
            {/* How it works — young, punchy: companies come to YOU, track it all here */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cbsky-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-cbsky-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  {language === 'it' ? 'Come funziona' : 'How it works'}
                </span>
                <span className="text-xs font-bold text-cbind-700">
                  {language === 'it' ? 'Sono le aziende a cercare te 🎯' : 'The companies come to you 🎯'}
                </span>
              </div>
              {/* Timeline: dots joined by a line (horizontal on desktop, vertical on mobile) */}
              <ol className="relative mt-5 grid gap-6 sm:grid-cols-3 sm:gap-8">
                <li aria-hidden="true" className="pointer-events-none absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/60 via-primary/30 to-primary/10 sm:left-3 sm:right-3 sm:top-[11px] sm:bottom-auto sm:h-px sm:w-auto sm:bg-gradient-to-r" />
                {[
                  {
                    icon: <Sparkles className="h-5 w-5" />,
                    accent: "from-cbsky-500 to-cbsky-600",
                    title: language === 'it' ? 'Sei già dentro' : "You're already in",
                    desc: language === 'it'
                      ? 'Niente candidature da inviare: il tuo profilo è live nella Talent Pool.'
                      : 'No applications to send — your profile is live in the Talent Pool.',
                  },
                  {
                    icon: <Building2 className="h-5 w-5" />,
                    accent: "from-cbind-500 to-cbind-600",
                    title: language === 'it' ? 'Le aziende scelgono te' : 'Companies pick you',
                    desc: language === 'it'
                      ? 'Le aziende partner sfogliano i profili e selezionano te — non il contrario.'
                      : 'Partner companies browse profiles and select you — not the other way around.',
                  },
                  {
                    icon: <LayoutDashboard className="h-5 w-5" />,
                    accent: "from-cbsky-500 to-cbind-500",
                    title: language === 'it' ? 'Monitori tutto qui' : 'Track everything here',
                    desc: language === 'it'
                      ? 'Selezioni, colloqui, test e materiali in un\'unica piattaforma. CareerBoost organizza i prossimi step e ti avvisa via email.'
                      : 'Selections, interviews, tests and prep in one platform. CareerBoost organizes the next steps and notifies you by email.',
                  },
                ].map((s, i) => (
                  <li key={i} className="relative flex gap-4 sm:flex-col sm:gap-3">
                    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground ring-4 ring-background">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-tight text-foreground">{s.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Three sections as tabs (overview above stays outside) */}
            <Tabs defaultValue="companies" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 mb-4 bg-transparent p-0 md:grid-cols-5">
                <TabsTrigger value="companies" className="h-auto min-h-[44px] touch-manipulation whitespace-normal py-2 text-xs leading-tight md:text-sm border border-[#1B2A8E]/20 bg-[#1B2A8E]/[0.06] text-[#1B2A8E] data-[state=active]:bg-[#1B2A8E] data-[state=active]:text-[#fff] data-[state=active]:shadow-md">{tx("Partner Companies", "Aziende partner")}</TabsTrigger>
                <TabsTrigger value="events" className="relative h-auto min-h-[44px] touch-manipulation whitespace-normal py-2 text-xs leading-tight md:text-sm border border-[#1B2A8E]/20 bg-[#1B2A8E]/[0.06] text-[#1B2A8E] data-[state=active]:bg-[#1B2A8E] data-[state=active]:text-[#fff] data-[state=active]:shadow-md">
                  <span className="inline-flex items-center gap-1.5">
                    {tx("Interviews", "Colloqui")}
                    {actionableMeetings > 0 && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                        +{actionableMeetings}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="tests" className="relative h-auto min-h-[44px] touch-manipulation whitespace-normal py-2 text-xs leading-tight md:text-sm border border-[#1B2A8E]/20 bg-[#1B2A8E]/[0.06] text-[#1B2A8E] data-[state=active]:bg-[#1B2A8E] data-[state=active]:text-[#fff] data-[state=active]:shadow-md">
                  <span className="inline-flex items-center gap-1.5">
                    {tx("Assessments", "Test di valutazione")}
                    {actionableTests > 0 && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                        +{actionableTests}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="prep" className="h-auto min-h-[44px] touch-manipulation whitespace-normal py-2 text-xs leading-tight md:text-sm border border-amber-300/70 bg-amber-50 text-amber-800 data-[state=active]:border-amber-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-300 data-[state=active]:to-amber-400 data-[state=active]:text-[#1A1205] data-[state=active]:shadow-md">Boost Resources</TabsTrigger>
                <TabsTrigger value="profile" className="h-auto min-h-[44px] touch-manipulation whitespace-normal py-2 text-xs leading-tight md:text-sm border border-slate-300 bg-slate-200/70 text-slate-800 data-[state=active]:bg-slate-800 data-[state=active]:text-[#fff] data-[state=active]:shadow-md">{tx("Personal Profile", "Profilo personale")}</TabsTrigger>
              </TabsList>

              {/* SECTION 3 — Personal Profile */}
              <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('studentTalentPool.profile.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    {/* Photo + identity */}
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start lg:w-[46%] lg:shrink-0">
                      {studentProfile.photo_url ? (
                        <img
                          src={studentProfile.photo_url}
                          alt={`${studentProfile.first_name} ${studentProfile.last_name}`}
                          className="h-44 w-44 shrink-0 rounded-xl border object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border bg-muted text-4xl font-semibold text-muted-foreground">
                          {studentProfile.first_name?.[0]}{studentProfile.last_name?.[0]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-3">
                        <p className="text-2xl font-semibold leading-tight">
                          {studentProfile.first_name} {studentProfile.last_name}
                        </p>
                        <Label htmlFor="photo-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground">
                          <Upload className="h-4 w-4" />
                          {t('studentTalentPool.profile.uploadPhoto')}
                          <Input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                        </Label>

                        {/* LinkedIn — link + editable (optional) */}
                        <div className="space-y-2 pt-1">
                          {studentProfile.linkedin_url ? (
                            <a
                              href={studentProfile.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                            >
                              <Linkedin className="h-4 w-4" />
                              {tx("LinkedIn Profile", "Profilo LinkedIn")}
                            </a>
                          ) : (
                            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Linkedin className="h-4 w-4" />
                              {tx("LinkedIn (optional)", "LinkedIn (facoltativo)")}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Input
                              type="url"
                              className="h-9"
                              placeholder={tx("https://www.linkedin.com/in/your-profile", "https://www.linkedin.com/in/il-tuo-profilo")}
                              value={studentProfile.linkedin_url || ''}
                              onChange={(e) => setStudentProfile((prev: any) => prev ? { ...prev, linkedin_url: e.target.value } : prev)}
                            />
                            <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={handleSaveLinkedIn}>
                              {tx("Save", "Salva")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Documents: download current / replace, or upload if missing */}
                    <div className="flex-1 space-y-3 lg:border-l lg:pl-8">
                      {([
                        {
                          key: 'cv',
                          label: t('studentTalentPool.profile.cv'),
                          url: studentProfile.cv_url,
                          onDownload: () => handleDownload(studentProfile.cv_url, 'CV.pdf', 'talent-pool-cv'),
                          onUpload: () => cvInputRef.current?.click(),
                        },
                        {
                          key: 'cover',
                          label: t('studentTalentPool.profile.coverLetter'),
                          url: studentProfile.cover_letter_url,
                          onDownload: () => handleDownload(studentProfile.cover_letter_url, 'Cover-Letter.pdf', 'talent-pool-covers'),
                          onUpload: () => coverInputRef.current?.click(),
                        },
                        {
                          key: 'video',
                          label: tx("Presentation video", "Video di presentazione"),
                          url: studentProfile.presentation_video_url,
                          onDownload: () => handleDownload(studentProfile.presentation_video_url, 'My-Presentation.mp4'),
                          onUpload: () => !uploadingVideo && videoInputRef.current?.click(),
                        },
                      ] as const).map((doc) => (
                        <div key={doc.key} className="rounded-xl border bg-background/60 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              {doc.key === 'video' ? <Video className="h-4 w-4 shrink-0 text-primary" /> : <FileText className="h-4 w-4 shrink-0 text-primary" />}
                              <span className="font-medium">{doc.label}</span>
                              {doc.url ? (
                                <Badge variant="secondary" className="text-[10px]">{tx("Uploaded", "Caricato")}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">{tx("Missing", "Mancante")}</Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {doc.url ? (
                                <>
                                  <Button size="sm" variant="outline" onClick={doc.onDownload}>
                                    <Download className="mr-1 h-4 w-4" /> {tx("Download", "Scarica")}
                                  </Button>
                                  <Button size="sm" onClick={doc.onUpload} disabled={doc.key === 'video' && uploadingVideo}>
                                    <Upload className="mr-1 h-4 w-4" /> {tx("Replace", "Sostituisci")}
                                  </Button>
                                  {doc.key === 'video' && (
                                    <Button size="sm" variant="ghost" className="px-2 text-destructive" onClick={handleVideoRemove} aria-label={tx("Remove video", "Rimuovi video")}>
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button size="sm" onClick={doc.onUpload} disabled={doc.key === 'video' && uploadingVideo}>
                                  <Upload className="mr-1 h-4 w-4" />
                                  {doc.key === 'video' && uploadingVideo ? tx("Uploading...", "Caricamento...") : tx("Upload", "Carica")}
                                </Button>
                              )}
                            </div>
                          </div>
                          {doc.key === 'video' && (
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                              {tx(
                                "Optional, but highly recommended: it's the first impression companies get of you. Up to 2 minutes, in English — who you are, what you've studied and what you're looking for (MP4 or MOV, max 50MB).",
                                "Facoltativo, ma fortemente consigliato: è la prima impressione che le aziende hanno di te. Massimo 2 minuti, in inglese — chi sei, cosa hai studiato e cosa stai cercando (MP4 o MOV, max 50MB)."
                              )}
                            </p>
                          )}
                        </div>
                      ))}
                      <Input
                        ref={cvInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload('cv', e)}
                        className="hidden"
                      />
                      <Input
                        ref={coverInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload('cover', e)}
                        className="hidden"
                      />
                      <Input
                        ref={videoInputRef}
                        type="file"
                        accept=".mp4,.mov,video/mp4,video/quicktime"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </div>
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
                          <Label className="cursor-pointer">{tx(location, LOCATION_LABELS_IT[location] ?? location)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4" />
                      {t('studentTalentPool.profile.period')}
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex-1">
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
                    <Button
                      type="button"
                      variant={studentProfile.full_employment_available ? "default" : "outline"}
                      aria-pressed={!!studentProfile.full_employment_available}
                      onClick={toggleFullTime}
                      className="shrink-0 gap-2"
                    >
                      {studentProfile.full_employment_available ? <Check className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                      {tx("Looking for a full-time job", "Cerco un lavoro full-time")}
                    </Button>
                    </div>
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

              {/* Work eligibility & bureaucracy — passport, visa, dates, address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    {language === 'it' ? 'Idoneità al lavoro & documenti' : 'Work Eligibility & Documents'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {language === 'it'
                      ? 'Questi dati aiutano le aziende con le pratiche burocratiche (visto, documento, date, residenza). Visibili alle aziende che ti selezionano e al team CareerBoost.'
                      : 'These details help companies with paperwork (visa, ID, dates, residence). Visible to companies that select you and the CareerBoost team.'}
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

                  {/* Visa details — only when the student can work in the UK */}
                  {studentProfile.uk_work_visa === 'YES' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{tx("Visa type", "Tipo di visto")}</Label>
                        <Input
                          placeholder={tx("e.g. Graduate visa, Skilled Worker, settled status…", "es. Graduate visa, Skilled Worker, settled status…")}
                          value={studentProfile.uk_visa_type || ''}
                          onChange={(e) => setStudentProfile(prev => prev ? { ...prev, uk_visa_type: e.target.value } : prev)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tx("Visa expiry date", "Data di scadenza del visto")}</Label>
                        <Input
                          type="date"
                          value={studentProfile.uk_visa_expiry || ''}
                          onChange={(e) => setStudentProfile(prev => prev ? { ...prev, uk_visa_expiry: e.target.value || null } : prev)}
                        />
                      </div>
                    </div>
                  )}

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

                  {/* City, country + citizenship */}
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
                  <CardTitle>{tx("Profile Visibility", "Visibilità del profilo")}</CardTitle>
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
                            title: checked ? tx("Profile Visible", "Profilo visibile") : tx("Profile Hidden", "Profilo nascosto"),
                            description: checked 
                              ? tx("Your profile is now visible to companies", "Il tuo profilo è ora visibile alle aziende") 
                              : tx("Your profile has been hidden from companies", "Il tuo profilo è stato nascosto alle aziende")
                          });
                        } catch (error) {
                          console.error('Error updating visibility:', error);
                          toast({
                            title: tx("Error", "Errore"),
                            description: tx("Unable to update profile visibility", "Impossibile aggiornare la visibilità del profilo"),
                            variant: "destructive"
                          });
                        }
                      }}
                    />
                    <Label htmlFor="profile-visible" className="cursor-pointer">
                      {tx("Make my profile visible to companies", "Rendi il mio profilo visibile alle aziende")}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {tx(
                      "When enabled, companies will be able to see my name, photo, CV, and cover letter.",
                      "Se attivo, le aziende potranno vedere il mio nome, la foto, il CV e la lettera di presentazione."
                    )}
                  </p>
                </CardContent>
              </Card>

              </TabsContent>

              {/* SECTION 2 — Prep Material (KB items shown inline) */}
              <TabsContent value="prep" className="space-y-4">
                <BoostResources />
              </TabsContent>

              {/* SECTION 1 — Partner Companies (kept as-is, no redesign) */}
              <TabsContent value="companies" className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {t('studentTalentPool.companies.title')}
                      <span className="ml-2 align-middle rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                        {filteredCompanies.length}
                      </span>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tx(
                        "These companies can see your profile and select you. Here's who they are.",
                        "Queste aziende possono vedere il tuo profilo e selezionarti. Ecco chi sono."
                      )}
                    </p>
                  </div>
                </div>

                {filteredCompanies.length === 0 ? (
                  <div className="rounded-2xl border border-dashed py-14 text-center text-sm text-muted-foreground">
                    {tx("No partner companies yet — new ones are joining soon.", "Nessuna azienda partner al momento — nuove aziende in arrivo.")}
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:px-4 max-md:pb-2">
                    {filteredCompanies.map((company) => {
                      const sizeLabel: Record<string, string> = {
                        STARTUP: 'Startup',
                        BOUTIQUE: 'Boutique',
                        MEDIUM_SIZE: tx('Mid-size company', 'Media impresa'),
                        LARGE_COMPANY: tx('Large company', 'Grande azienda'),
                      };
                      const expanded = expandedCompanies.includes(company.id);
                      const longDesc = (company.description || '').length > 160;
                      return (
                        <article
                          key={company.id}
                          className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10 max-md:w-[85vw] max-md:shrink-0 max-md:snap-center"
                        >
                          {/* Cover */}
                          <div className="relative h-24 overflow-hidden">
                            {company.cover_photo_url ? (
                              <img src={company.cover_photo_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                              <div
                                className="h-full w-full"
                                style={{ background: "linear-gradient(135deg, #0A0A1F 0%, #142C8A 60%, #2430D4 110%)" }}
                              />
                            )}
                          </div>

                          <div className="relative flex flex-1 flex-col px-5 pb-5">
                            {/* Logo tile overlapping the cover */}
                            <div className="-mt-9 mb-3 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-[#fff] shadow-md">
                              {company.logo_url ? (
                                <img src={company.logo_url} alt={company.company_name} className="h-full w-full object-contain p-1.5" />
                              ) : (
                                <span className="text-2xl font-bold text-primary">{company.company_name?.[0] || '?'}</span>
                              )}
                            </div>

                            <h3 className="text-lg font-semibold leading-tight">{company.company_name}</h3>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {company.sector?.trim() && (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                  {company.sector.trim()}
                                </span>
                              )}
                              {company.size && (
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                  {sizeLabel[company.size] || company.size}
                                </span>
                              )}
                            </div>

                            {company.description && (
                              <div className="mt-3 flex-1">
                                <p className={`text-sm leading-relaxed text-muted-foreground ${expanded ? '' : 'line-clamp-3'}`}>
                                  {company.description}
                                </p>
                                {longDesc && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedCompanies((prev) =>
                                        prev.includes(company.id) ? prev.filter((id) => id !== company.id) : [...prev, company.id]
                                      )
                                    }
                                    className="mt-1 text-xs font-semibold text-primary hover:underline"
                                  >
                                    {expanded ? tx('Show less', 'Mostra meno') : tx('Read more', 'Leggi di più')}
                                  </button>
                                )}
                              </div>
                            )}

                            {(company.linkedin_url || company.website) && (
                              <div className="mt-auto pt-5"><div className="flex items-center gap-2 border-t pt-4">
                                {company.linkedin_url && (
                                  <a
                                    href={company.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`LinkedIn — ${company.company_name}`}
                                    title="LinkedIn"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
                                  >
                                    <Linkedin className="h-5 w-5" />
                                  </a>
                                )}
                                {company.website && (
                                  <Button asChild size="sm" className="flex-1 rounded-full">
                                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                                      {tx('Website', 'Sito web')} <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                )}
                              </div></div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* SECTION 4 — Scheduled events (meeting accept / decline / counter) */}
              <TabsContent value="events" className="space-y-4">
                <StudentScheduledEventsTab studentId={userInfo.id} onMeetingsChange={refreshMeetingBadge} />
              </TabsContent>

              {/* SECTION 5 — Tests (C3) */}
              <TabsContent value="tests" className="space-y-4">
                <StudentTestsTab studentId={userInfo.id} onTestsChange={refreshTestBadge} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;