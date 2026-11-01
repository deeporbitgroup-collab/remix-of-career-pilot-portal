import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { downloadTalentPoolDocument } from "@/lib/talentPoolDocuments";
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
  Play,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TalentPoolLanguageProvider, useTalentPoolLanguage } from "@/contexts/TalentPoolLanguageContext";
import { cn } from "@/lib/utils";
import { formatSlot } from "@/lib/meeting-format";
import { format as formatDate, parseISO, isValid } from "date-fns";
import { it as itLocale } from "date-fns/locale";

import { TALENT_POOL_COMPANY_SECTORS } from "@/data/talentPoolSectors";

const getSizes = (tx: (en: string, it: string) => string) => [
  { value: "STARTUP", label: "Startup" },
  { value: "BOUTIQUE", label: "Boutique" },
  { value: "MEDIUM_SIZE", label: tx("Medium size", "Media impresa") },
  { value: "LARGE_COMPANY", label: tx("Large company", "Grande azienda") }
];

const CompanyDashboardContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, tx, language } = useTalentPoolLanguage();
  const SIZES = getSizes(tx);
  const dateLocale = language === 'it' ? 'it-IT' : 'en-GB';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(dateLocale);
  // Same output as formatSlot, with Italian day/month names when the UI is in Italian.
  const fmtSlot = (datetime?: string | null, timezone?: string | null): string => {
    if (language !== 'it') return formatSlot(datetime, timezone);
    if (!datetime) return "";
    let label = datetime;
    try {
      const d = parseISO(datetime);
      if (isValid(d)) label = formatDate(d, "EEE d MMM yyyy · HH:mm", { locale: itLocale });
    } catch {
      /* keep the raw string */
    }
    return timezone ? `${label} (${timezone})` : label;
  };
  const meetingStatusLabel = (status: string) => ({
    PROPOSED: tx('PROPOSED', 'PROPOSTO'),
    CONFIRMED: tx('CONFIRMED', 'CONFERMATO'),
    DECLINED: tx('DECLINED', 'RIFIUTATO'),
    CANCELLED: tx('CANCELLED', 'ANNULLATO'),
    COMPLETED: tx('COMPLETED', 'COMPLETATO'),
  } as Record<string, string>)[status] || status;
  const testStatusLabel = (status: string) => ({
    SENT: tx('SENT', 'INVIATO'),
    SUBMITTED: tx('SUBMITTED', 'CONSEGNATO'),
    PASSED: tx('PASSED', 'SUPERATO'),
    FAILED: tx('FAILED', 'NON SUPERATO'),
    CANCELLED: tx('CANCELLED', 'ANNULLATO'),
  } as Record<string, string>)[status] || status;
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
    description: '',
    website: ''
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
  // Tests (C3)
  const [companyTests, setCompanyTests] = useState<any[]>([]);
  const [testDialogFor, setTestDialogFor] = useState<any>(null);
  const [testForm, setTestForm] = useState({ title: '', instructions: '', link: '', dueDate: '', timezone: '' });
  const [submittingTest, setSubmittingTest] = useState(false);
  const [testActionId, setTestActionId] = useState<string | null>(null);
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
          description: profile.description || '',
          website: (profile as any).website || ''
        });
      }
      
      if (userData.registration_status !== 'APPROVED') {
        toast({
          title: tx("Access Denied", "Accesso negato"),
          description: tx("Your company account must be approved to access this area", "Il tuo account aziendale deve essere approvato per accedere a quest'area"),
          variant: "destructive"
        });
        navigate('/talent-pool/company');
        return;
      }

      await loadStudents();
      await loadSelectedStudents(userData.id);
      await loadMeetings(userData.id);
      await loadTests(userData.id);
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
          description: profile.description || '',
          website: (profile as any).website || ''
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
          profile_visible_to_companies,
          full_employment_available
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
      toast({ title: tx("Student deselected", "Selezione rimossa"), description: tx(`${studentName} removed from your selections. Their recruiting history is kept.`, `${studentName} è stato rimosso dalle tue selezioni. Lo storico del processo di selezione viene conservato.`) });
      await loadSelectedStudents(company.id);
    } catch (e: any) {
      console.error('Deselect error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to deselect", "Impossibile rimuovere la selezione"), variant: "destructive" });
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
      toast({ title: tx("Two slots required", "Servono due opzioni"), description: tx("Please propose two date + time options.", "Proponi due opzioni di data e ora."), variant: "destructive" });
      return;
    }
    if (!meetingForm.timezone.trim()) {
      toast({ title: tx("Timezone required", "Fuso orario obbligatorio"), description: tx("Add the timezone label shown next to the times.", "Aggiungi l'indicazione del fuso orario da mostrare accanto agli orari."), variant: "destructive" });
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
      toast({ title: tx("Meeting proposed", "Incontro proposto"), description: tx("The candidate and CareerBoost have been notified.", "Il candidato e CareerBoost sono stati informati.") });
      setMeetingDialogFor(null);
      await loadMeetings(company.id);
    } catch (e: any) {
      console.error('Propose meeting error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to propose meeting", "Impossibile proporre l'incontro"), variant: "destructive" });
    } finally {
      setSubmittingMeeting(false);
    }
  };

  // ---- Tests (C3) ----
  const loadTests = async (companyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-recruiting-tests', { body: { companyId } });
      if (error) { console.error('Error loading tests:', error); return; }
      setCompanyTests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading tests:', e);
    }
  };

  const openTestDialog = (selection: any) => {
    setTestDialogFor(selection);
    setTestForm({ title: '', instructions: '', link: '', dueDate: '', timezone: '' });
  };

  const handleSendTest = async () => {
    if (!testDialogFor || !company?.id) return;
    if (!testForm.link.trim()) {
      toast({ title: tx("Test link required", "Link al test obbligatorio"), description: tx("Paste the link the candidate should use for the test.", "Incolla il link che il candidato dovrà usare per svolgere il test."), variant: "destructive" });
      return;
    }
    setSubmittingTest(true);
    try {
      const { error } = await supabase.functions.invoke('recruiting-test-action', {
        body: {
          action: 'send',
          companyId: company.id,
          studentId: testDialogFor.student_id,
          title: testForm.title || null,
          instructions: testForm.instructions || null,
          link: testForm.link.trim(),
          dueAt: testForm.dueDate || null,
          timezone: testForm.timezone.trim() || null,
        }
      });
      if (error) throw error;
      toast({ title: tx("Test sent", "Test inviato"), description: tx("The candidate and CareerBoost have been notified.", "Il candidato e CareerBoost sono stati informati.") });
      setTestDialogFor(null);
      await loadTests(company.id);
    } catch (e: any) {
      console.error('Send test error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to send the test", "Impossibile inviare il test"), variant: "destructive" });
    } finally {
      setSubmittingTest(false);
    }
  };

  const handleMarkTest = async (test: any, result: 'PASSED' | 'FAILED') => {
    if (!company?.id) return;
    setTestActionId(test.id);
    try {
      const { error } = await supabase.functions.invoke('recruiting-test-action', {
        body: { action: 'mark', testId: test.id, result }
      });
      if (error) throw error;
      toast({ title: result === 'PASSED' ? tx("Marked as passed", "Segnato come superato") : tx("Marked as failed", "Segnato come non superato"), description: tx("The candidate and CareerBoost have been notified.", "Il candidato e CareerBoost sono stati informati.") });
      await loadTests(company.id);
    } catch (e: any) {
      console.error('Mark test error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to update the test", "Impossibile aggiornare il test"), variant: "destructive" });
    } finally {
      setTestActionId(null);
    }
  };

  const handleCancelTest = async (test: any) => {
    if (!company?.id) return;
    setTestActionId(test.id);
    try {
      const { error } = await supabase.functions.invoke('recruiting-test-action', {
        body: { action: 'cancel', testId: test.id }
      });
      if (error) throw error;
      toast({ title: tx("Test cancelled", "Test annullato") });
      await loadTests(company.id);
    } catch (e: any) {
      console.error('Cancel test error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to cancel the test", "Impossibile annullare il test"), variant: "destructive" });
    } finally {
      setTestActionId(null);
    }
  };

  const openLinkDialog = (meeting: any) => {
    setLinkDialogFor(meeting);
    setLinkForm({ meetLink: meeting.meet_link || '', description: meeting.description || '' });
  };

  const handleSetLink = async () => {
    if (!linkDialogFor || !company?.id) return;
    if (!linkForm.meetLink.trim()) {
      toast({ title: tx("Link required", "Link obbligatorio"), description: tx("Paste the interview link (e.g. a Google Meet / Zoom URL).", "Incolla il link del colloquio (ad es. un URL Google Meet / Zoom)."), variant: "destructive" });
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
      toast({ title: tx("Interview link saved", "Link del colloquio salvato"), description: tx("The candidate and CareerBoost have been notified.", "Il candidato e CareerBoost sono stati informati.") });
      setLinkDialogFor(null);
      await loadMeetings(company.id);
    } catch (e: any) {
      console.error('Set link error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to save the link", "Impossibile salvare il link"), variant: "destructive" });
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
      toast({ title: tx("Offer sent", "Offerta inviata"), description: tx("The candidate and CareerBoost have been notified.", "Il candidato e CareerBoost sono stati informati.") });
      setOfferDialogFor(null);
      await loadSelectedStudents(company.id);
    } catch (e: any) {
      console.error('Offer error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to send offer", "Impossibile inviare l'offerta"), variant: "destructive" });
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
      toast({ title: tx("Candidate rejected", "Candidato non selezionato"), description: tx("The candidate and CareerBoost have been notified.", "Il candidato e CareerBoost sono stati informati.") });
      setRejectDialogFor(null);
      await loadSelectedStudents(company.id);
    } catch (e: any) {
      console.error('Reject error:', e);
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Failed to reject", "Impossibile registrare il rifiuto"), variant: "destructive" });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: tx("File too large", "File troppo grande"),
        description: tx("Please select an image under 5MB", "Seleziona un'immagine inferiore a 5MB"),
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
          title: tx("Missing required fields", "Campi obbligatori mancanti"),
          description: tx("Company name, sector, size, and reference email are required.", "Nome azienda, settore, dimensione ed email di riferimento sono obbligatori."),
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
            title: tx("Logo not updated", "Logo non aggiornato"),
            description: tx("The other fields will be saved; the logo upload failed. Try again later.", "Gli altri campi verranno salvati, ma il caricamento del logo non è riuscito. Riprova più tardi."),
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
        p_description: editData.description || null,
        p_website: editData.website || null,
      } as any);

      if (error) throw error;

      toast({
        title: tx("Success", "Operazione completata"),
        description: tx("Company information updated successfully", "Informazioni aziendali aggiornate correttamente")
      });

      setEditMode(false);
      setLogoFile(null);
      await loadCompanyData(company.id);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: tx("Error", "Errore"),
        description: error.message || tx("Failed to save company information", "Impossibile salvare le informazioni aziendali"),
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSelectStudent = async (student: any) => {
    if (!company?.id || !student.user_id) {
      toast({
        title: tx("Error", "Errore"),
        description: tx("Missing required information. Please refresh and try again.", "Mancano alcune informazioni necessarie. Aggiorna la pagina e riprova."),
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
        title: tx("✓ Student Selected Successfully", "✓ Candidato selezionato con successo"),
        description: tx(`You have selected ${student.first_name} ${student.last_name}. We will contact you soon.`, `Hai selezionato ${student.first_name} ${student.last_name}. Ti contatteremo a breve.`),
        duration: 4000
      });

      setSelectedStudents(prev => new Set([...prev, student.user_id]));
      await loadSelectedStudents(company.id);
    } catch (error: any) {
      console.error('Selection error:', error);
      const ids = await loadSelectedStudents(company.id);
      if (ids.includes(student.user_id)) {
        toast({
          title: tx("Already Selected", "Già selezionato"),
          description: tx(`${student.first_name} ${student.last_name} was already selected by your company.`, `${student.first_name} ${student.last_name} è già stato selezionato dalla tua azienda.`),
          duration: 4000
        });
      } else {
        toast({
          title: tx("Selection Error", "Errore di selezione"),
          description: error.message || tx("Something went wrong. Please try again.", "Si è verificato un errore. Riprova."),
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
          role: 'COMPANY',
          language
        }
      });

      if (error) throw error;

      toast({
        title: tx("Left Talent Pool", "Hai lasciato il Talent Pool"),
        description: tx("You have successfully left the Talent Pool. You can no longer access this area.", "Hai lasciato il Talent Pool. Non puoi più accedere a quest'area.")
      });

      localStorage.removeItem('talentPoolRole');
      localStorage.removeItem('talentPoolUser');
      navigate('/talent-pool');
    } catch (error: any) {
      console.error('Leave error:', error);
      toast({
        title: tx("Error", "Errore"),
        description: error.message || tx("Failed to leave Talent Pool", "Impossibile lasciare il Talent Pool"),
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
      toast({ title: tx("Error", "Errore"), description: e.message || tx("Could not open the passport", "Impossibile aprire il passaporto"), variant: "destructive" });
    } finally {
      setViewingPassport(null);
    }
  };

  const ukVisaLabel = (v?: string) =>
    v === 'YES' ? tx('Can work in the UK', 'Può lavorare nel Regno Unito') : v === 'NO' ? tx('No UK work right', 'Senza diritto di lavoro nel Regno Unito') : v === 'APPLYING' ? tx('UK visa: applying', 'Visto UK: richiesta in corso') : null;

  const downloadFile = async (url: string, filename: string, bucketHint?: "talent-pool-cv" | "talent-pool-covers") => {
    try {
      await downloadTalentPoolDocument(url, filename, bucketHint);
      toast({
        title: tx("Success", "Operazione completata"),
        description: tx(`${filename} downloaded successfully`, `${filename} scaricato correttamente`)
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: tx("Download Error", "Errore di download"),
        description: tx("Unable to download file", "Impossibile scaricare il file"),
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
                {company?.company_profiles?.[0]?.company_name || tx('Company Dashboard', 'Dashboard Azienda')}
              </h1>
              <p className="text-steel-gray">{tx("Talent Pool - Company Area", "Talent Pool - Area Aziende")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab('selected')}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              {tx("Selected Students", "Candidati selezionati")} ({selectedList.length})
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <DoorOpen className="h-4 w-4" />
                  {tx("Leave Talent Pool", "Lascia il Talent Pool")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{tx("Are you sure you want to leave the Talent Pool?", "Vuoi davvero lasciare il Talent Pool?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tx(
                      "This action will permanently remove your company from the Talent Pool. You will no longer have access to student profiles and all your selections will be lost. This action cannot be undone.",
                      "Questa azione rimuoverà definitivamente la tua azienda dal Talent Pool. Non avrai più accesso ai profili dei candidati e tutte le tue selezioni andranno perse. L'azione è irreversibile."
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tx("Cancel", "Annulla")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveTalentPool} className="bg-destructive text-destructive-foreground">
                    {tx("Yes, Leave Talent Pool", "Sì, lascia il Talent Pool")}
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
              {tx("Logout", "Esci")}
            </Button>
          </div>
        </div>

        {/* Partner status — premium "azienda convenzionata" banner */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-cbind-500/25 bg-gradient-to-br from-cbind-700 via-green-600 to-teal-600 p-6 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.45)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_50%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 md:gap-5">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-300/60 to-cbind-200/40 blur-sm" />
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
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-cbind-600 bg-amber-400 shadow-md">
                  <BadgeCheck className="h-4 w-4 text-cbind-700" />
                </span>
              </div>

              <div className="min-w-0 text-white">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cbind-50 backdrop-blur-sm">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    CareerBoost Partner
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cbind-950/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cbind-100">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cbind-300 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-cbind-200" />
                    </span>
                    {t('companyDashboard.partner.active')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {t('companyDashboard.partner.title')}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-cbind-50/90 md:text-base">
                  {t('companyDashboard.partner.subtitle')}
                </p>
                {company?.approved_at && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-cbind-100/80">
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
                <div className="flex items-center justify-center gap-1.5 text-cbind-100/80">
                  <Users className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {t('companyDashboard.partner.statsCandidates')}
                  </span>
                </div>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">{students.length}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-1.5 text-cbind-100/80">
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
            <span className="text-xs text-cbind-50/75">
              {t('companyDashboard.partner.visibilityNote')}
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'students' | 'selected' | 'profile')} className="space-y-6">
          <TabsList className="max-md:grid max-md:w-full max-md:grid-cols-3 max-md:h-auto max-md:gap-1">
            <TabsTrigger value="students" className="max-md:h-auto max-md:whitespace-normal max-md:px-1 max-md:py-2 max-md:text-[11px] max-md:leading-tight data-[state=active]:bg-cbind-600 data-[state=active]:text-white data-[state=active]:shadow-sm">{tx("Available Students", "Candidati disponibili")}</TabsTrigger>
            <TabsTrigger value="selected" className="max-md:h-auto max-md:whitespace-normal max-md:px-1 max-md:py-2 max-md:text-[11px] max-md:leading-tight data-[state=active]:bg-cbind-600 data-[state=active]:text-white data-[state=active]:shadow-sm">{tx("Selected Students", "Candidati selezionati")} ({selectedList.length})</TabsTrigger>
            <TabsTrigger value="profile" className="max-md:h-auto max-md:whitespace-normal max-md:px-1 max-md:py-2 max-md:text-[11px] max-md:leading-tight data-[state=active]:bg-cbind-600 data-[state=active]:text-white data-[state=active]:shadow-sm">{tx("Company Profile", "Profilo aziendale")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {tx("Company Information", "Informazioni aziendali")}
                </CardTitle>
                <Dialog open={editMode} onOpenChange={setEditMode}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      {tx("Edit", "Modifica")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{tx("Edit Company Information", "Modifica informazioni aziendali")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">{tx("Company Name", "Nome azienda")} *</Label>
                        <Input
                          id="company_name"
                          value={editData.company_name}
                          onChange={(e) => setEditData({...editData, company_name: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sector">{tx("Sector", "Settore")} *</Label>
                          <Select
                            value={editData.sector}
                            onValueChange={(value) => setEditData({...editData, sector: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={tx("Select sector", "Seleziona settore")} />
                            </SelectTrigger>
                            <SelectContent>
                              {TALENT_POOL_COMPANY_SECTORS.map(sector => (
                                <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="size">{tx("Size", "Dimensione")} *</Label>
                          <Select
                            value={editData.size}
                            onValueChange={(value) => setEditData({...editData, size: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={tx("Select size", "Seleziona dimensione")} />
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
                        <Label htmlFor="reference_email">{tx("Reference Email", "Email di riferimento")} *</Label>
                        <Input
                          id="reference_email"
                          type="email"
                          value={editData.reference_email}
                          onChange={(e) => setEditData({...editData, reference_email: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="linkedin_url">{tx("LinkedIn (optional)", "LinkedIn (facoltativo)")}</Label>
                        <Input
                          id="linkedin_url"
                          type="url"
                          placeholder="https://linkedin.com/company/..."
                          value={editData.linkedin_url}
                          onChange={(e) => setEditData({...editData, linkedin_url: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">{tx("Website (optional)", "Sito web (facoltativo)")}</Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://yourcompany.com"
                          value={editData.website}
                          onChange={(e) => setEditData({...editData, website: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">{tx("Description (optional)", "Descrizione (facoltativa)")}</Label>
                        <Textarea
                          id="description"
                          rows={3}
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company_logo">{tx("Company Logo (optional)", "Logo aziendale (facoltativo)")}</Label>
                        <div className="space-y-2">
                          {(logoFile || company?.company_profiles?.[0]?.logo_url) && (
                            <div className="flex items-center gap-4">
                              <img 
                                src={logoFile ? URL.createObjectURL(logoFile) : company?.company_profiles?.[0]?.logo_url} 
                                alt={tx("Company logo preview", "Anteprima logo aziendale")} 
                                className="h-20 w-20 object-cover rounded border"
                              />
                              {logoFile && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setLogoFile(null)}
                                >
                                  {tx("Remove", "Rimuovi")}
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
                            {tx("PNG, JPG, or WebP. Max 5MB.", "PNG, JPG o WebP. Max 5MB.")}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => { setEditMode(false); setLogoFile(null); }}>
                          {tx("Cancel", "Annulla")}
                        </Button>
                        <Button 
                          onClick={handleSaveCompanyInfo} 
                          className="flex items-center gap-2"
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              {tx("Saving...", "Salvataggio...")}
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              {tx("Save Changes", "Salva modifiche")}
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
                  <div className="rounded-xl border border-cbind-500/20 bg-cbind-500/5 p-4 md:col-span-2 lg:col-span-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cbind-600 text-white shadow-md">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-cbind-700">
                          {t('companyDashboard.profile.partnershipStatus')}
                        </p>
                        <p className="font-semibold text-cbind-700">
                          {t('companyDashboard.partner.title')}
                        </p>
                        <p className="text-sm text-steel-gray">
                          {t('companyDashboard.profile.partnershipDesc')}
                        </p>
                      </div>
                      <Badge className="ml-auto bg-cbind-600 text-white hover:bg-cbind-600">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t('companyDashboard.profile.approved')}
                      </Badge>
                    </div>
                  </div>

                  {company?.company_profiles?.[0]?.logo_url && (
                    <div className="flex justify-center md:col-span-2 lg:col-span-3">
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-cbind-400/40 to-green-600/20 blur-sm" />
                        <img
                          src={company.company_profiles[0].logo_url}
                          alt={tx("Company logo", "Logo aziendale")}
                          className="relative h-28 w-28 rounded-2xl border-2 border-white object-cover shadow-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                      {t('companyDashboard.profile.companyName')}
                    </p>
                    <p className="mt-1 font-semibold">{company?.company_profiles?.[0]?.company_name || tx('N/A', 'N/D')}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                      {t('companyDashboard.profile.sector')}
                    </p>
                    <p className="mt-1 font-semibold">{company?.company_profiles?.[0]?.sector || tx('N/A', 'N/D')}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                      {t('companyDashboard.profile.size')}
                    </p>
                    <p className="mt-1 font-semibold">
                      {SIZES.find(s => s.value === company?.company_profiles?.[0]?.size)?.label || tx('N/A', 'N/D')}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">
                      {t('companyDashboard.profile.email')}
                    </p>
                    <p className="mt-1 font-semibold break-all">
                      {company?.company_profiles?.[0]?.reference_email || tx('N/A', 'N/D')}
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
                  {company?.company_profiles?.[0]?.website && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-steel-gray">{tx("Website", "Sito web")}</p>
                      <a
                        href={company.company_profiles[0].website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        {tx("Visit site", "Visita il sito")}
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
                  {tx("Available Students", "Candidati disponibili")} ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cbind-500/10">
                      <Users className="h-8 w-8 text-cbind-600 opacity-80" />
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
                            <Play className="h-4 w-4" /> {tx("Play video", "Guarda video")}
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
                            {student.full_employment_available && (
                              <Badge className="mt-2 gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                                <Briefcase className="h-3 w-3" />
                                {tx("Looking for a full-time job", "Cerca un lavoro full-time")}
                              </Badge>
                            )}
                            {/* Showcase profiles (seeded, no documents yet) carry a
                                small "coming soon" badge so companies understand the
                                CV / cover letter are on the way. */}
                            {!student.cv_url && !student.cover_letter_url && (
                              <Badge variant="secondary" className="mt-2 gap-1 border-amber-200 bg-amber-50 text-amber-700">
                                <CalendarClock className="h-3 w-3" />
                                {tx("CV & cover letter coming soon", "CV e lettera di presentazione in arrivo")}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 pt-2">
                            {(student.cv_url || student.cover_letter_url) && (<>
                            {student.cv_url ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadFile(
                                  student.cv_url,
                                  `${student.first_name}_${student.last_name}_CV.pdf`,
                                  'talent-pool-cv'
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
                                {tx("CV not available", "CV non disponibile")}
                              </Button>
                            )}
                            {student.cover_letter_url ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadFile(
                                  student.cover_letter_url,
                                  `${student.first_name}_${student.last_name}_CoverLetter.pdf`,
                                  'talent-pool-covers'
                                )}
                                className="w-full flex items-center justify-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                {tx("Cover Letter", "Lettera di presentazione")}
                                <Download className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled className="w-full flex items-center justify-center gap-2 opacity-50">
                                <FileText className="h-4 w-4" />
                                {tx("Cover letter not available", "Lettera di presentazione non disponibile")}
                              </Button>
                            )}
                            </>)}
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
                                {tx("Presentation Video", "Video di presentazione")}
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
                                {tx("Unavailable", "Non disponibile")}
                              </Button>
                            ) : selectedStudents.has(student.user_id) ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled
                                className="w-full bg-muted text-muted-foreground cursor-not-allowed"
                              >
                                {tx("Selected", "Selezionato")}
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
                                    <span className="ml-2">{tx("Selecting...", "Selezione in corso...")}</span>
                                  </>
                                ) : (
                                  tx('Select Student', 'Seleziona candidato')
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
                  {tx("Selected Students", "Candidati selezionati")} ({selectedList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedList.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-steel-gray mx-auto mb-4 opacity-50" />
                    <p className="text-steel-gray">{tx("No students selected yet", "Nessun candidato selezionato al momento")}</p>
                    <p className="text-sm text-steel-gray mt-2">
                      {tx('Select candidates from "Available Students" to start a recruiting process.', 'Seleziona i candidati da "Candidati disponibili" per avviare un processo di selezione.')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:pb-2 max-md:[&>*]:w-[85vw] max-md:[&>*]:shrink-0 max-md:[&>*]:snap-center">
                    {selectedList.map((selection) => {
                      const student = selection.profile;
                      if (!student) return null;
                      const stage = selection.stage || 'IN_PROGRESS';
                      const stageMeta: Record<string, { label: string; cls: string }> = {
                        IN_PROGRESS: { label: tx('In progress', 'In corso'), cls: 'bg-amber-100 text-amber-800' },
                        OFFER: { label: tx('Offer', 'Offerta'), cls: 'bg-blue-100 text-blue-800' },
                        REJECTED: { label: tx('Rejected', 'Non selezionato'), cls: 'bg-red-100 text-red-800' },
                        HIRED: { label: tx('Hired', 'Assunto'), cls: 'bg-green-100 text-green-800' },
                      };
                      const sm = stageMeta[stage] || stageMeta.IN_PROGRESS;
                      const myMeetings = companyMeetings.filter((m: any) => m.student_id === selection.student_id);
                      const myTests = companyTests.filter((tst: any) => tst.student_id === selection.student_id);
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
                                {student.full_employment_available && (
                                  <Badge className="mt-1 gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                                    <Briefcase className="h-3 w-3" />
                                    {tx("Looking for a full-time job", "Cerca un lavoro full-time")}
                                  </Badge>
                                )}
                                <p className="text-xs text-steel-gray">
                                  {tx("Selected:", "Selezionato il")} {fmtDate(selection.selected_at)}
                                </p>
                              </div>
                              <Badge className={sm.cls}>{sm.label}</Badge>
                            </div>

                            {/* Documents */}
                            <div className="flex flex-wrap gap-2">
                              {student.cv_url ? (
                                <Button size="sm" variant="outline" onClick={() => downloadFile(student.cv_url, `${student.first_name}_${student.last_name}_CV.pdf`, 'talent-pool-cv')}>
                                  <FileText className="h-4 w-4 mr-1" /> CV <Download className="h-3 w-3 ml-1" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled className="opacity-50">
                                  <FileText className="h-4 w-4 mr-1" /> {tx("CV not available", "CV non disponibile")}
                                </Button>
                              )}
                              {student.cover_letter_url ? (
                                <Button size="sm" variant="outline" onClick={() => downloadFile(student.cover_letter_url, `${student.first_name}_${student.last_name}_CoverLetter.pdf`, 'talent-pool-covers')}>
                                  <FileText className="h-4 w-4 mr-1" /> {tx("Cover", "Lettera")} <Download className="h-3 w-3 ml-1" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled className="opacity-50">
                                  <FileText className="h-4 w-4 mr-1" /> {tx("Cover not available", "Lettera non disponibile")}
                                </Button>
                              )}
                            </div>

                            {/* Work eligibility (bureaucracy: passport, visa, dates, residence) */}
                            {(student.passport_url || student.uk_work_visa || student.citizenship || student.home_address || student.city || student.country || student.internship_start_date || student.internship_end_date) && (
                              <div className="rounded-md border bg-muted/30 p-2 space-y-1 text-xs">
                                <p className="font-medium">{tx("Work eligibility", "Idoneità al lavoro")}</p>
                                {student.uk_work_visa && <p>{ukVisaLabel(student.uk_work_visa)}</p>}
                                {student.uk_work_visa === 'YES' && (student.uk_visa_type || student.uk_visa_expiry) && (
                                  <p>
                                    {tx("Visa", "Visto")}: {student.uk_visa_type || '—'}
                                    {student.uk_visa_expiry && <> · {tx("expires", "scade il")} {fmtDate(student.uk_visa_expiry)}</>}
                                  </p>
                                )}
                                {student.citizenship && <p>{tx("Citizenship", "Cittadinanza")}: <strong>{student.citizenship}</strong></p>}
                                {(student.internship_start_date || student.internship_end_date) && (
                                  <p>
                                    {tx("Availability", "Disponibilità")}: {student.internship_start_date ? fmtDate(student.internship_start_date) : '—'} → {student.internship_end_date ? fmtDate(student.internship_end_date) : '—'}
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
                                    {viewingPassport === selection.student_id ? tx('Opening...', 'Apertura...') : tx('View passport', 'Vedi passaporto')}
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Next step — Schedule meeting is live (C2); the rest arrive in C3/C4 */}
                            <div className="border-t pt-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">{tx("Next step", "Prossimo passo")}</p>
                              <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="outline" onClick={() => openMeetingDialog(selection)}><CalendarClock className="h-4 w-4 mr-1" /> {tx("Schedule meeting", "Fissa un incontro")}</Button>
                                <Button size="sm" variant="outline" onClick={() => openTestDialog(selection)}><ClipboardCheck className="h-4 w-4 mr-1" /> {tx("Test", "Test")}</Button>
                                <Button size="sm" variant="outline" onClick={() => openOfferDialog(selection)}><Handshake className="h-4 w-4 mr-1" /> {tx("Offer", "Offerta")}</Button>
                                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => openRejectDialog(selection)}><XCircle className="h-4 w-4 mr-1" /> {tx("Reject", "Rifiuta")}</Button>
                              </div>
                            </div>

                            {/* Meetings timeline (Tests list arrives in C3) */}
                            <div className="grid grid-cols-1 gap-3">
                              <div className="rounded-md border p-2 space-y-2">
                                <p className="text-xs font-medium">{tx("Meetings", "Incontri")} ({myMeetings.length})</p>
                                {myMeetings.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">{tx("No meetings yet", "Nessun incontro al momento")}</p>
                                ) : (
                                  myMeetings.map((m: any) => (
                                    <div key={m.id} className="rounded border bg-muted/30 p-2 text-xs space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{m.title || tx('Meeting', 'Incontro')}</span>
                                        <Badge variant="outline" className="text-[10px]">{meetingStatusLabel(m.status)}</Badge>
                                      </div>
                                      {m.status === 'CONFIRMED' && m.confirmed_slot ? (
                                        <div className="space-y-1.5">
                                          <p>{tx("Confirmed", "Confermato")}: <strong>{fmtSlot(m.confirmed_slot.datetime, m.timezone)}</strong></p>
                                          {m.meet_link ? (
                                            <a href={m.meet_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                                              <Video className="h-3.5 w-3.5" /> {tx("Interview link", "Link del colloquio")}
                                            </a>
                                          ) : (
                                            <p className="text-muted-foreground">{tx("No interview link yet.", "Nessun link del colloquio al momento.")}</p>
                                          )}
                                          {m.description && <p className="text-muted-foreground">{m.description}</p>}
                                          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openLinkDialog(m)}>
                                            <LinkIcon className="h-3.5 w-3.5 mr-1" />
                                            {m.meet_link ? tx('Edit interview link', 'Modifica link del colloquio') : tx('Add interview link', 'Aggiungi link del colloquio')}
                                          </Button>
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="text-muted-foreground">
                                            {m.proposed_by === 'STUDENT' ? tx('Candidate proposed:', 'Il candidato ha proposto:') : tx('You proposed:', 'Hai proposto:')}
                                          </p>
                                          <ul className="list-disc list-inside">
                                            {(m.proposed_slots || []).map((s: any, i: number) => (
                                              <li key={i}>{fmtSlot(s.datetime, m.timezone)}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                              <div className="rounded-md border p-2 space-y-2">
                                <p className="text-xs font-medium">{tx("Tests", "Test")} ({myTests.length})</p>
                                {myTests.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">{tx("No tests yet", "Nessun test al momento")}</p>
                                ) : (
                                  myTests.map((tst: any) => (
                                    <div key={tst.id} className="rounded border bg-muted/30 p-2 text-xs space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{tst.title || tx('Test', 'Test')}</span>
                                        <Badge variant="outline" className="text-[10px]">{testStatusLabel(tst.status)}</Badge>
                                      </div>
                                      {tst.due_at && <p>{tx("Deadline", "Scadenza")}: <strong>{fmtDate(tst.due_at)}</strong>{tst.timezone ? ` (${tst.timezone})` : ''}</p>}
                                      {tst.link && (
                                        <a href={tst.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                                          <LinkIcon className="h-3.5 w-3.5" /> {tx("Test link", "Link al test")}
                                        </a>
                                      )}
                                      {tst.outcome && <p className="text-muted-foreground">{tst.outcome}</p>}
                                      {tst.status === 'SUBMITTED' && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                          <Button size="sm" className="h-7 text-[11px] bg-green-600 hover:bg-green-700" disabled={testActionId === tst.id} onClick={() => handleMarkTest(tst, 'PASSED')}>{tx("Mark passed", "Segna come superato")}</Button>
                                          <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive hover:text-destructive" disabled={testActionId === tst.id} onClick={() => handleMarkTest(tst, 'FAILED')}>{tx("Mark failed", "Segna come non superato")}</Button>
                                        </div>
                                      )}
                                      {tst.status === 'SENT' && (
                                        <div className="flex items-center justify-between gap-2 pt-0.5">
                                          <span className="text-muted-foreground">{tx("Waiting for the candidate", "In attesa del candidato")}</span>
                                          <Button size="sm" variant="ghost" className="h-6 px-1 text-[11px] text-destructive hover:text-destructive" disabled={testActionId === tst.id} onClick={() => handleCancelTest(tst)}>{tx("Cancel", "Annulla")}</Button>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Deselect (history preserved) */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" disabled={deselecting === selection.student_id} className="w-full">
                                  {deselecting === selection.student_id ? tx('Removing...', 'Rimozione in corso...') : (<><X className="h-4 w-4 mr-1" /> {tx("Deselect", "Rimuovi selezione")}</>)}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{tx("Remove this selection?", "Rimuovere questa selezione?")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {tx(
                                      `Deselect ${student.first_name} ${student.last_name}? Their recruiting history (meetings/tests) is kept.`,
                                      `Rimuovere la selezione di ${student.first_name} ${student.last_name}? Lo storico del processo di selezione (incontri/test) viene conservato.`
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{tx("Cancel", "Annulla")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeselect(selection.student_id, `${student.first_name} ${student.last_name}`)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    {tx("Yes, remove", "Sì, rimuovi")}
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
              <DialogTitle>{tx("Schedule meeting", "Fissa un incontro")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{tx("Title", "Titolo")}</Label>
                <Input
                  placeholder={tx("e.g. First interview", "es. Primo colloquio")}
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{tx("Option 1 (date & time)", "Opzione 1 (data e ora)")}</Label>
                  <Input
                    type="datetime-local"
                    value={meetingForm.slot1}
                    onChange={(e) => setMeetingForm({ ...meetingForm, slot1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx("Option 2 (date & time)", "Opzione 2 (data e ora)")}</Label>
                  <Input
                    type="datetime-local"
                    value={meetingForm.slot2}
                    onChange={(e) => setMeetingForm({ ...meetingForm, slot2: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tx("Timezone", "Fuso orario")}</Label>
                <Input
                  placeholder={tx("e.g. CET, GMT, EST", "es. CET, GMT, EST")}
                  value={meetingForm.timezone}
                  onChange={(e) => setMeetingForm({ ...meetingForm, timezone: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{tx("Shown next to the times as a label — no automatic conversion.", "Mostrato come etichetta accanto agli orari, senza conversione automatica.")}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMeetingDialogFor(null)} disabled={submittingMeeting}>{tx("Cancel", "Annulla")}</Button>
              <Button onClick={handleProposeMeeting} disabled={submittingMeeting}>
                {submittingMeeting ? tx('Sending...', 'Invio in corso...') : tx('Propose meeting', 'Proponi incontro')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign a test (C3) */}
        <Dialog open={!!testDialogFor} onOpenChange={(o) => { if (!o) setTestDialogFor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{tx("Assign a test", "Assegna un test")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{tx("Title (optional)", "Titolo (facoltativo)")}</Label>
                <Input
                  placeholder={tx("e.g. Online assessment", "es. Valutazione online")}
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tx("Test link", "Link al test")}</Label>
                <Input
                  placeholder={tx("https://... (the link the candidate uses)", "https://... (il link che userà il candidato)")}
                  value={testForm.link}
                  onChange={(e) => setTestForm({ ...testForm, link: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{tx("Deadline", "Scadenza")}</Label>
                  <Input
                    type="date"
                    value={testForm.dueDate}
                    onChange={(e) => setTestForm({ ...testForm, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tx("Timezone (optional)", "Fuso orario (facoltativo)")}</Label>
                  <Input
                    placeholder={tx("e.g. CET", "es. CET")}
                    value={testForm.timezone}
                    onChange={(e) => setTestForm({ ...testForm, timezone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tx("Message (optional)", "Messaggio (facoltativo)")}</Label>
                <Textarea
                  placeholder={tx("Instructions for the candidate...", "Istruzioni per il candidato...")}
                  value={testForm.instructions}
                  onChange={(e) => setTestForm({ ...testForm, instructions: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestDialogFor(null)} disabled={submittingTest}>{tx("Cancel", "Annulla")}</Button>
              <Button onClick={handleSendTest} disabled={submittingTest}>
                {submittingTest ? tx('Sending...', 'Invio in corso...') : tx('Send test', 'Invia test')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Interview link — set/edit the call link + description on a CONFIRMED meeting (C2.3) */}
        <Dialog open={!!linkDialogFor} onOpenChange={(o) => { if (!o) setLinkDialogFor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{linkDialogFor?.meet_link ? tx('Edit interview link', 'Modifica link del colloquio') : tx('Add interview link', 'Aggiungi link del colloquio')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{tx("Interview link", "Link del colloquio")}</Label>
                <Input
                  placeholder={tx("https://meet.google.com/... or Zoom URL", "https://meet.google.com/... o URL Zoom")}
                  value={linkForm.meetLink}
                  onChange={(e) => setLinkForm({ ...linkForm, meetLink: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tx("Description (optional)", "Descrizione (facoltativa)")}</Label>
                <Textarea
                  placeholder={tx("e.g. Bring your portfolio. The call lasts ~30 minutes.", "es. Porta il tuo portfolio. La call dura circa 30 minuti.")}
                  value={linkForm.description}
                  onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">{tx("The candidate sees the link and description in their Scheduled events tab.", "Il candidato vedrà link e descrizione nella sezione Eventi programmati.")}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogFor(null)} disabled={submittingLink}>{tx("Cancel", "Annulla")}</Button>
              <Button onClick={handleSetLink} disabled={submittingLink}>
                {submittingLink ? tx('Saving...', 'Salvataggio...') : tx('Save link', 'Salva link')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Offer (C4) */}
        <Dialog open={!!offerDialogFor} onOpenChange={(o) => { if (!o) setOfferDialogFor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{tx("Make an offer", "Fai un'offerta")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{tx("Role / job title (optional)", "Ruolo / posizione (facoltativo)")}</Label>
                <Input
                  placeholder={tx("e.g. Summer Analyst Internship", "es. Summer Analyst Internship")}
                  value={offerForm.jobTitle}
                  onChange={(e) => setOfferForm({ ...offerForm, jobTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tx("Message (optional)", "Messaggio (facoltativo)")}</Label>
                <Textarea
                  placeholder={tx("A short message to the candidate about the offer and next steps.", "Un breve messaggio al candidato sull'offerta e sui prossimi passi.")}
                  value={offerForm.message}
                  onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">{tx(`The candidate and CareerBoost are notified. The candidate's stage becomes "Offer".`, `Il candidato e CareerBoost verranno informati. Lo stato del candidato diventerà "Offerta".`)}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOfferDialogFor(null)} disabled={submittingDecision}>{tx("Cancel", "Annulla")}</Button>
              <Button onClick={handleOffer} disabled={submittingDecision}>
                {submittingDecision ? tx('Sending...', 'Invio in corso...') : tx('Send offer', 'Invia offerta')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject (C4) */}
        <Dialog open={!!rejectDialogFor} onOpenChange={(o) => { if (!o) setRejectDialogFor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{tx("Reject candidate", "Rifiuta candidato")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{tx("Reason (optional)", "Motivazione (facoltativa)")}</Label>
                <Textarea
                  placeholder={tx("An optional note shared with the candidate.", "Una nota facoltativa condivisa con il candidato.")}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">{tx(`The candidate and CareerBoost are notified. The candidate's stage becomes "Rejected" (their recruiting history is kept).`, `Il candidato e CareerBoost verranno informati. Lo stato del candidato diventerà "Non selezionato" (lo storico del processo di selezione viene conservato).`)}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogFor(null)} disabled={submittingDecision}>{tx("Cancel", "Annulla")}</Button>
              <Button variant="destructive" onClick={handleReject} disabled={submittingDecision}>
                {submittingDecision ? tx('Submitting...', 'Invio in corso...') : tx('Reject candidate', 'Rifiuta candidato')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Presentation video popup (UI 3) */}
        <Dialog open={!!videoFor} onOpenChange={(o) => { if (!o) setVideoFor(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{videoFor?.name} — {tx("presentation video", "video di presentazione")}</DialogTitle>
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