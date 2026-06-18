import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Users, 
  User,
  Building2, 
  UserCheck, 
  UserX, 
  Clock,
  LogOut,
  Shield,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  DoorOpen,
  UserPlus,
  Lock,
  Trash2,
  Bell,
  Briefcase,
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PDFDocument } from 'pdf-lib';
import AdminActiveRecruiting from "@/components/talent-pool/AdminActiveRecruiting";
import KnowledgeBaseAdmin from "@/pages/admin/KnowledgeBaseAdmin";

const COMPANY_SIZES = [
  { value: "STARTUP", label: "Startup (1-10)" },
  { value: "BOUTIQUE", label: "Boutique (11-50)" },
  { value: "MEDIUM_SIZE", label: "Medium (51-200)" },
  { value: "LARGE_COMPANY", label: "Large (200+)" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    approvedStudents: 0,
    admittedStudents: 0,
    pendingStudents: 0,
    totalCompanies: 0,
    approvedCompanies: 0,
    pendingCompanies: 0,
    verifiedPayments: 0,
    pendingPayments: 0
  });
  const [students, setStudents] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'companies' | 'payments' | 'notifications' | 'recruiting' | 'knowledge-base'>('students');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selections, setSelections] = useState<any[]>([]);
  // Admin company-profile editing (writes the SAME company_profiles row the company edits)
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [companyEditData, setCompanyEditData] = useState({
    company_name: '', sector: '', size: '', reference_email: '', linkedin_url: '', description: ''
  });
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadNotifications();
    loadSelections();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load students using admin RPC function
      const { data: studentsRaw, error: studentsError } = await supabase
        .rpc('admin_get_students');

      if (studentsError) {
        console.error('Error loading students:', studentsError);
      }

      // Transform students data to match expected format
      const studentsData = (studentsRaw || []).map((s: any) => ({
        id: s.id,
        email: s.email,
        role: s.role,
        status: s.status,
        registration_status: s.registration_status,
        created_at: s.created_at,
        updated_at: s.updated_at,
        student_profiles: s.profile_id ? [{
          id: s.profile_id,
          first_name: s.first_name,
          last_name: s.last_name,
          phone: s.phone,
          linkedin_url: s.linkedin_url,
          cv_url: s.cv_url,
          cover_letter_url: s.cover_letter_url,
          photo_url: s.photo_url,
          payment_status: s.payment_status,
          access_status: s.access_status,
          payment_reference: s.payment_reference,
          monthly_payment_active: s.monthly_payment_active,
          monthly_payment_start_date: s.monthly_payment_start_date,
          profile_visible_to_companies: s.profile_visible_to_companies,
          passport_url: s.passport_url,
          uk_work_visa: s.uk_work_visa,
          internship_start_date: s.internship_start_date,
          internship_end_date: s.internship_end_date,
          home_address: s.home_address,
          city: s.city,
          country: s.country,
          citizenship: s.citizenship
        }] : []
      }));

      // Enrich with presentation_video_url (not returned by RPC)
      try {
        const userIds = studentsData.map((s: any) => s.id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: videos } = await supabase
            .from('student_profiles')
            .select('user_id, presentation_video_url')
            .in('user_id', userIds);
          const videoMap = new Map((videos || []).map((v: any) => [v.user_id, v.presentation_video_url]));
          studentsData.forEach((s: any) => {
            if (s.student_profiles?.[0]) {
              s.student_profiles[0].presentation_video_url = videoMap.get(s.id) || null;
            }
          });
        }
      } catch (e) {
        console.error('Error enriching student videos:', e);
      }


      // Load companies using admin RPC function
      const { data: companiesRaw, error: companiesError } = await supabase
        .rpc('admin_get_companies');

      if (companiesError) {
        console.error('Error loading companies:', companiesError);
      }

      // Transform companies data to match expected format
      const companiesData = (companiesRaw || []).map((c: any) => ({
        id: c.id,
        email: c.email,
        role: c.role,
        status: c.status, // Add status field for companies
        registration_status: c.registration_status,
        created_at: c.created_at,
        updated_at: c.updated_at,
        company_profiles: c.profile_id ? [{
          id: c.profile_id,
          company_name: c.company_name,
          sector: c.sector,
          size: c.size,
          reference_email: c.reference_email,
          linkedin_url: c.linkedin_url,
          logo_url: c.logo_url,
          description: c.description
        }] : []
      }));

      // Load payment receipts using admin RPC function
      const { data: receiptsRaw, error: receiptsError } = await supabase
        .rpc('admin_get_payment_receipts');

      if (receiptsError) {
        console.error('Error loading receipts:', receiptsError);
      }

      // Transform receipts data to match expected format
      const receiptsData = (receiptsRaw || [])
        .map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          payment_type: r.payment_type,
          amount: r.amount,
          receipt_url: r.receipt_url,
          verification_status: r.verification_status,
          notes: r.notes,
          upload_date: r.upload_date,
          verified_at: r.verified_at,
          verified_by: r.verified_by,
          created_at: r.created_at,
          talent_pool_users: {
            email: r.user_email,
            student_profiles: r.first_name ? [{
              first_name: r.first_name,
              last_name: r.last_name
            }] : []
          }
        }));

      setStudents(studentsData || []);
      setCompanies(companiesData || []);
      setPaymentReceipts(receiptsData || []);

      // Calculate stats
      const studentStats = studentsData || [];
      const companyStats = companiesData || [];
      const receiptStats = receiptsData || [];

      setStats({
        totalStudents: studentStats.length,
        approvedStudents: studentStats.filter(s => s.registration_status === 'APPROVED').length,
        admittedStudents: studentStats.filter(s => s.registration_status === 'ADMITTED').length,
        pendingStudents: studentStats.filter(s => s.registration_status === 'PENDING').length,
        totalCompanies: companyStats.length,
        approvedCompanies: companyStats.filter(c => c.registration_status === 'APPROVED').length,
        pendingCompanies: companyStats.filter(c => c.registration_status === 'PENDING').length,
        verifiedPayments: receiptStats.filter(r => r.verification_status === 'VERIFIED').length,
        pendingPayments: receiptStats.filter(r => r.verification_status === 'PENDING').length
      });

      // Auto-open payments tab if there are pending receipts
      if ((receiptStats?.filter(r => r.verification_status === 'PENDING').length || 0) > 0) {
        setActiveTab('payments');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Could not load the data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_pool_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadSelections = async () => {
    try {
      const { data, error } = await supabase
        .rpc('admin_get_company_selections');

      if (error) throw error;
      setSelections(data || []);
    } catch (error) {
      console.error('Error loading selections:', error);
    }
  };

  const handleStudentAction = async (userId: string, action: 'REJECT' | 'ADMIT' | 'CONFIRM_PAYMENT') => {
    try {
      // Find student data for email
      const student = students.find(s => s.id === userId);
      const studentProfile = student?.student_profiles?.[0];

      let newStatus: 'rejected' | 'accepted_pending_payment' | 'active_member';
      let actionText: string;
      let emailAction: 'REJECTED' | 'PAYMENT_REQUIRED' | 'PAYMENT_VERIFIED' | 'TALENT_POOL_ACCESS' | null = null;

      if (action === 'REJECT') {
        newStatus = 'rejected';
        actionText = 'rejected';
        emailAction = 'REJECTED';
      } else if (action === 'ADMIT') {
        // Free access: admitting approves the student directly — makes them visible
        // to companies (via tp_set_student_status) and sends the access email.
        // No payment step.
        newStatus = 'active_member';
        actionText = 'approved and made visible to companies';
        emailAction = 'TALENT_POOL_ACCESS';
      } else { // CONFIRM_PAYMENT (legacy path, kept for manually-staged students)
        newStatus = 'active_member';
        actionText = 'approved with full access';
        emailAction = 'PAYMENT_VERIFIED';
      }

      // Use SECURITY DEFINER RPC to bypass RLS safely
      const { error } = await supabase.rpc('tp_set_student_status', {
        _student_id: userId,
        _new_status: newStatus,
        _admin_id: null, // Admin is not authenticated in Supabase in current flow
      });

      if (error) throw error;

      // Send email notification to student
      if (studentProfile && emailAction && student?.email) {
        try {
          await supabase.functions.invoke('send-status-change-email', {
            body: {
              email: student.email,
              name: `${studentProfile.first_name} ${studentProfile.last_name}`,
              role: 'STUDENT',
              action: emailAction
            }
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Continue even if email fails
        }
      }

      // On ADMIT (the Block 1 approval — student becomes active_member + visible),
      // notify all approved companies that a new candidate is available.
      // Non-fatal: a failure here must NOT block the approval (already committed by the RPC).
      if (action === 'ADMIT' && studentProfile) {
        try {
          await supabase.functions.invoke('notify-companies-new-student', {
            body: { studentName: `${studentProfile.first_name} ${studentProfile.last_name}`.trim() }
          });
        } catch (notifyError) {
          console.error('Company notification failed (non-fatal):', notifyError);
        }
      }

      toast({
        title: "✅ Success",
        description: `Student ${actionText}. Email sent.`,
      });

      loadDashboardData();
    } catch (error) {
      console.error('Error updating student:', error);
      toast({
        title: "❌ Error",
        description: "Could not update the student status",
        variant: "destructive"
      });
    }
  };

  const handleRejectPayment = async (userId: string) => {
    try {
      // Reject payment - set status back to accepted_pending_payment using RPC
      const { error } = await supabase.rpc('tp_set_student_status', {
        _student_id: userId,
        _new_status: 'accepted_pending_payment',
        _admin_id: null,
      });

      if (error) throw error;

      toast({
        title: "❌ Payment Rejected",
        description: "The student must upload the receipt again",
      });

      loadDashboardData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast({
        title: "❌ Error",
        description: "Could not reject the payment",
        variant: "destructive"
      });
    }
  };

  const handleCompanyAction = async (companyId: string, action: 'REJECT' | 'APPROVE') => {
    try {
      // Find company data for email
      const company = companies.find(c => c.id === companyId);
      const companyProfile = company?.company_profiles?.[0];

      // Use SECURITY DEFINER RPC to bypass RLS safely
      const { error } = await supabase.rpc('tp_set_company_status', {
        _company_id: companyId,
        _new_status: action === 'REJECT' ? 'REJECTED' : 'APPROVED',
        _admin_id: null, // Admin is not authenticated in Supabase in current flow
      });

      if (error) throw error;

      // Send email notification to company using the correct function
      if (companyProfile) {
        try {
          await supabase.functions.invoke('send-status-change-email', {
            body: {
              email: companyProfile.reference_email,
              name: companyProfile.company_name,
              role: 'COMPANY',
              action: action === 'APPROVE' ? 'LOGIN_ACCESS' : 'REJECTED'
            }
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Continue even if email fails
        }
      }

      toast({
        title: "Success",
        description: `Company ${action === 'REJECT' ? 'rejected' : 'approved with full access'}. Email sent.`,
      });

      loadDashboardData();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Could not update the company status",
        variant: "destructive"
      });
    }
  };

  // ---- Admin edit of a company profile (same row + same RPC the company uses) ----
  const openCompanyEdit = (company: any) => {
    const p = company.company_profiles?.[0] || {};
    setEditingCompany(company);
    setCompanyEditData({
      company_name: p.company_name || '',
      sector: p.sector || '',
      size: p.size || '',
      reference_email: p.reference_email || company.email || '',
      linkedin_url: p.linkedin_url || '',
      description: p.description || '',
    });
    setCompanyLogoFile(null);
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
    return btoa(binary);
  };

  const handleSaveCompanyProfile = async () => {
    if (!editingCompany) return;
    if (!companyEditData.company_name || !companyEditData.sector || !companyEditData.size || !companyEditData.reference_email) {
      toast({ title: "Missing required fields", description: "Company name, sector, size and reference email are required.", variant: "destructive" });
      return;
    }
    setSavingCompany(true);
    try {
      // Keep the current logo by default; only replace it if a new file uploads OK.
      let logoUrl = editingCompany.company_profiles?.[0]?.logo_url || null;

      if (companyLogoFile) {
        try {
          const fileBase64 = await fileToBase64(companyLogoFile);
          const { data: up, error: upErr } = await supabase.functions.invoke('upload-company-logo', {
            body: { companyId: editingCompany.id, fileName: companyLogoFile.name, contentType: companyLogoFile.type, fileBase64 }
          });
          if (upErr || !up?.publicUrl) throw upErr || new Error('Logo upload failed');
          logoUrl = up.publicUrl;
        } catch (logoErr) {
          // Non-blocking: keep the existing logo and warn, but still save the rest.
          console.error('Logo upload failed (non-fatal):', logoErr);
          toast({ title: "Logo not updated", description: "The other fields were saved; the logo upload failed.", variant: "destructive" });
        }
      }

      // update_company_profile OVERWRITES every field — pass ALL pre-filled values so
      // editing one field never blanks the others (logo/LinkedIn/description/etc.).
      const { error } = await supabase.rpc('update_company_profile', {
        p_user_id: editingCompany.id,
        p_company_name: companyEditData.company_name,
        p_sector: companyEditData.sector,
        p_size: companyEditData.size as any,
        p_reference_email: companyEditData.reference_email,
        p_linkedin_url: companyEditData.linkedin_url || null,
        p_logo_url: logoUrl || null,
        p_description: companyEditData.description || null,
      });
      if (error) throw error;

      toast({ title: "Saved", description: "Company profile updated." });
      setEditingCompany(null);
      setCompanyLogoFile(null);
      await loadDashboardData();
    } catch (e: any) {
      console.error('Error saving company profile:', e);
      toast({ title: "Error", description: e.message || "Unable to save company profile", variant: "destructive" });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleVerifyPayment = async (receiptId: string, userId: string) => {
    try {
      // Optimistic UI update - update receipt status in state
      setPaymentReceipts(prev => prev.map(r => 
        r.id === receiptId 
          ? { ...r, verification_status: 'VERIFIED', verified_at: new Date().toISOString() }
          : r
      ));

      // Update stats immediately
      setStats(prev => ({
        ...prev,
        verifiedPayments: prev.verifiedPayments + 1,
        pendingPayments: Math.max(0, prev.pendingPayments - 1)
      }));

      // Use secure RPC to bypass RLS and atomically verify + grant access
      const { error } = await supabase.rpc('admin_verify_payment_and_grant_access', {
        _user_id: userId,
        _receipt_id: receiptId
      });

      if (error) throw error;

      toast({
        title: "Payment Verified and Access Granted",
        description: "The student now has full access to the Talent Pool",
      });

      await loadDashboardData();
    } catch (error) {
      console.error('Error verifying payment:', error);
      // Reload to restore correct state on error
      await loadDashboardData();
      toast({
        title: "Error",
        description: "Could not verify the payment",
        variant: "destructive"
      });
    }
  };

  const handleGrantAccess = async (userId: string) => {
    try {
      // Find student data for email
      const student = students.find(s => s.id === userId);
      const studentProfile = student?.student_profiles?.[0];

      // Unlock access + make visible + mark APPROVED via the SECURITY DEFINER RPC.
      // The anon Talent Pool client can't UPDATE these tables directly (RLS), so the
      // previous direct updates silently failed — tp_set_student_status does it all.
      const { error: profileError } = await supabase.rpc('tp_set_student_status', {
        _student_id: userId,
        _new_status: 'active_member',
        _admin_id: null,
      });

      if (profileError) throw profileError;

      // Send email notification to student
      if (studentProfile && student?.email) {
        try {
          await supabase.functions.invoke('send-status-change-email', {
            body: {
              email: student.email,
              name: `${studentProfile.first_name} ${studentProfile.last_name}`,
              role: 'STUDENT',
              action: 'TALENT_POOL_ACCESS'
            }
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Continue even if email fails
        }
      }

      toast({
        title: "Access Granted",
        description: "The student now has full access to the Talent Pool and is visible to companies. Email sent.",
      });

      loadDashboardData();
    } catch (error) {
      console.error('Error granting access:', error);
      toast({
        title: "Error",
        description: "Error while granting access",
        variant: "destructive"
      });
    }
  };

  const handleToggleVisibility = async (userId: string, currentVisibility: boolean, userName: string) => {
    const action = currentVisibility ? 'hide' : 'make visible';
    if (!confirm(`Are you sure you want to ${action} ${userName} from companies?`)) {
      return;
    }

    const loadingKey = `visibility-${userId}`;
    setActionLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      // Optimistic UI update
      setStudents(prev => prev.map(s => 
        s.id === userId 
          ? { 
              ...s, 
              student_profiles: s.student_profiles?.map((p: any) => ({
                ...p,
                profile_visible_to_companies: !currentVisibility
              }))
            }
          : s
      ));

      // Use secure RPC function to toggle visibility
      const { data, error } = await supabase.rpc('admin_toggle_student_visibility', {
        _user_id: userId,
        _visible: !currentVisibility
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Visibility toggled successfully:', data);

      toast({
        title: !currentVisibility ? "Student visible to companies" : "Student hidden from companies",
        description: !currentVisibility 
          ? "The student is now visible to companies in their dashboard" 
          : "The student has been hidden from companies",
      });
    } catch (error) {
      console.error('Error toggling visibility:', error);
      // Revert optimistic update
      setStudents(prev => prev.map(s => 
        s.id === userId 
          ? { 
              ...s, 
              student_profiles: s.student_profiles?.map((p: any) => ({
                ...p,
                profile_visible_to_companies: currentVisibility
              }))
            }
          : s
      ));
      toast({
        title: "Error",
        description: "Unable to modify student visibility",
        variant: "destructive"
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleRevokeAccess = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${userName}? The student will no longer be able to view companies in the Talent Pool.`)) {
      return;
    }

    const loadingKey = `revoke-${userId}`;
    setActionLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id ?? null;

      // Optimistic UI update
      setStudents(prev => prev.map(s => 
        s.id === userId 
          ? { 
              ...s,
              status: 'rejected',
              student_profiles: s.student_profiles?.map((p: any) => ({
                ...p,
                access_status: 'BLOCKED',
                monthly_payment_active: false,
                profile_visible_to_companies: false
              }))
            }
          : s
      ));

      // Revoke completely via SECURITY DEFINER RPC
      const { error: revokeError } = await supabase.rpc('tp_admin_revoke_student', {
        _user_id: userId
      });

      if (revokeError) throw revokeError;

      // Log the action
      await supabase
        .from('talent_pool_logs')
        .insert({
          actor_id: adminId,
          action: 'ACCESS_REVOKED',
          target_type: 'USER',
          target_id: userId,
          payload: { reason: 'Admin action' }
        });

      toast({
        title: "Access revoked",
        description: "Talent Pool access has been successfully revoked",
      });

      // Log the action
      await supabase
        .from('talent_pool_logs')
        .insert({
          actor_id: adminId,
          action: 'ACCESS_REVOKED',
          target_type: 'USER',
          target_id: userId,
          payload: { reason: 'Admin action' }
        });

      toast({
        title: "Access revoked",
        description: "Talent Pool access has been successfully revoked",
      });
    } catch (error) {
      console.error('Error revoking access:', error);
      // Reload to restore correct state on error
      await loadDashboardData();
      toast({
        title: "Error",
        description: "Unable to revoke access",
        variant: "destructive"
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleDeletePaymentReceipt = async (receiptId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete this payment?`)) {
      return;
    }

    const loadingKey = `delete-payment-${receiptId}`;
    setActionLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      // Find the receipt to check its status before deletion
      const receiptToDelete = paymentReceipts.find(r => r.id === receiptId);
      const wasVerified = receiptToDelete?.verification_status === 'VERIFIED';
      const wasPending = receiptToDelete?.verification_status === 'PENDING';

      // Optimistic UI update - immediately remove from state
      setPaymentReceipts(prev => prev.filter(r => r.id !== receiptId));
      
      // Update stats immediately based on the receipt status
      setStats(prev => ({
        ...prev,
        verifiedPayments: wasVerified ? Math.max(0, prev.verifiedPayments - 1) : prev.verifiedPayments,
        pendingPayments: wasPending ? Math.max(0, prev.pendingPayments - 1) : prev.pendingPayments
      }));

      // Delete via RPC (SECURITY DEFINER) to ensure persistence
      const { error } = await supabase.rpc('tp_admin_delete_payment_receipt', {
        _receipt_id: receiptId
      });

      if (error) throw error;

      toast({
        title: "Payment deleted successfully",
        description: "The payment record has been removed from the system",
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      // Reload to restore correct state on error
      await loadDashboardData();
      toast({
        title: "Error",
        description: "Unable to delete payment",
        variant: "destructive"
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userType: 'student' | 'company') => {
    if (!confirm(`WARNING: Are you sure you want to permanently delete ${userName}? This action is irreversible and will delete all associated data.`)) {
      return;
    }

    const loadingKey = `delete-${userId}`;
    setActionLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id ?? null;

      // Optimistic UI update - remove from list immediately
      if (userType === 'student') {
        setStudents(prev => prev.filter(s => s.id !== userId));
        setStats(prev => ({
          ...prev,
          totalStudents: Math.max(0, prev.totalStudents - 1)
        }));
      } else {
        setCompanies(prev => prev.filter(c => c.id !== userId));
        setStats(prev => ({
          ...prev,
          totalCompanies: Math.max(0, prev.totalCompanies - 1)
        }));
      }

      // Log before deletion
      await supabase
        .from('talent_pool_logs')
        .insert({
          actor_id: adminId,
          action: 'USER_DELETED',
          target_type: 'USER',
          target_id: userId,
          payload: { user_type: userType, name: userName }
        });

      // Delete completely via SECURITY DEFINER RPC
      const { error: deleteError } = await supabase.rpc('tp_admin_delete_user', {
        _user_id: userId
      });

      if (deleteError) throw deleteError;

      toast({
        title: "Student deleted permanently",
        description: `${userType === 'student' ? 'The student' : "The company"} has been permanently deleted from the system`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      // Reload to restore correct state on error
      await loadDashboardData();
      toast({
        title: "Error",
        description: "Unable to delete user",
        variant: "destructive"
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const getSignedUrlIfNeeded = async (fileUrl: string): Promise<string> => {
    try {
      const url = new URL(fileUrl);
      const after = url.pathname.split('/storage/v1/object/')[1] || '';
      const parts = after.split('/');
      const isPublic = parts[0] === 'public';
      const bucket = isPublic ? parts[1] : parts[0];
      const objectPath = parts.slice(isPublic ? 2 : 1).join('/');

      if (bucket === 'payment-receipts' && objectPath) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(objectPath, 60);
        if (error) throw error;
        return data.signedUrl;
      }
      return fileUrl;
    } catch (e) {
      return fileUrl;
    }
  };

  const downloadAsPdf = async (fileUrl: string, filename: string) => {
    try {
      const finalUrl = await getSignedUrlIfNeeded(fileUrl);
      const res = await fetch(finalUrl);
      if (!res.ok) throw new Error('Download failed');
      const contentType = res.headers.get('content-type') || '';
      const blob = await res.blob();

      const trigger = (b: Blob, name: string) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };

      if (contentType.includes('pdf') || fileUrl.toLowerCase().endsWith('.pdf')) {
        trigger(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
        return;
      }

      if (contentType.startsWith('image/')) {
        const arrayBuffer = await blob.arrayBuffer();
        const pdfDoc = await PDFDocument.create();
        let image: any;
        if (contentType.includes('png')) {
          image = await pdfDoc.embedPng(arrayBuffer);
        } else {
          image = await pdfDoc.embedJpg(arrayBuffer);
        }
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        const pdfBytes = await pdfDoc.save();
        trigger(new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }), filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
        return;
      }

      // Fallback: download the file as-is
      trigger(blob, filename);
    } catch (error) {
      console.error('Document download error:', error);
      toast({
        title: 'Download error',
        description: 'Could not download the document',
        variant: 'destructive'
      });
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('talentPoolRole');
    localStorage.removeItem('talentPoolUser');
    navigate('/talent-pool');
  };

  const [viewingPassport, setViewingPassport] = useState<string | null>(null);
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

  const ukVisaLabelIt = (v?: string) =>
    v === 'YES' ? 'Yes, can work in the UK' : v === 'NO' ? 'No' : v === 'APPLYING' ? 'Applying' : '—';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return (
          <Badge className="bg-warning text-white">
            <Clock className="h-3 w-3 mr-1" /> Under Review
          </Badge>
        );
      case 'accepted_pending_payment':
        return (
          <Badge className="bg-sky text-white">
            <UserPlus className="h-3 w-3 mr-1" /> Admitted - Awaiting Payment
          </Badge>
        );
      case 'payment_uploaded':
        return (
          <Badge className="bg-warning text-white">
            <Clock className="h-3 w-3 mr-1" /> Payment To Verify
          </Badge>
        );
      case 'active_member':
        return (
          <Badge className="bg-success text-white">
            <CheckCircle className="h-3 w-3 mr-1" /> Active Member
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      case 'left':
        return (
          <Badge className="bg-steel-gray text-white">
            <DoorOpen className="h-3 w-3 mr-1" /> Left Talent Pool
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCompanyRegistrationBadge = (registrationStatus: string, userStatus?: string) => {
    // Show "Left" badge if user status is "left"
    if (userStatus === 'left') {
      return (
        <Badge className="bg-steel-gray text-white">
          <DoorOpen className="h-3 w-3 mr-1" /> Left Talent Pool
        </Badge>
      );
    }

    switch (registrationStatus) {
      case 'PENDING':
        return (
          <Badge className="bg-warning text-white">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-success text-white">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return null;
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
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Admin Dashboard - Talent Pool</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              Back to Site
            </Button>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-steel-gray">
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
              <div className="text-xs text-steel-gray mt-1">
                {stats.approvedStudents} active, {stats.admittedStudents} admitted, {stats.pendingStudents} pending
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-steel-gray">
                Total Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalCompanies}</div>
              <div className="text-xs text-steel-gray mt-1">
                {stats.approvedCompanies} approved, {stats.pendingCompanies} pending
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-steel-gray">
                Verified Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.verifiedPayments}</div>
              <div className="text-xs text-steel-gray mt-1">
                {stats.pendingPayments} pending verification
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-steel-gray">
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.totalStudents > 0 
                  ? Math.round((stats.approvedStudents / stats.totalStudents) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-steel-gray mt-1">
                Students with full access
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'students' | 'companies' | 'payments' | 'notifications' | 'recruiting' | 'knowledge-base')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
              {selections.length > 0 && (
                <Badge className="ml-1 bg-primary">{selections.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recruiting" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Active Recruiting
            </TabsTrigger>
            <TabsTrigger value="knowledge-base" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Student Management - Access Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map((student) => (
                    <Card key={student.id} className="p-4">
                      <div className="space-y-3">
                        {/* Header con stato */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <User className="h-5 w-5 text-primary" />
                              {student.student_profiles?.[0]?.first_name} {student.student_profiles?.[0]?.last_name}
                            </h3>
                            <div className="mt-1">
                              {getStatusBadge(student.status)}
                            </div>
                          </div>
                        </div>

                        {/* Dati dello studente */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-runway-gray rounded-lg">
                          <div className="space-y-1">
                            <p className="text-sm text-steel-gray">📧 Email</p>
                            <p className="font-medium">{student.email}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-steel-gray">📱 Phone</p>
                            <p className="font-medium">{student.student_profiles?.[0]?.phone || 'Not provided'}</p>
                          </div>
                          {student.student_profiles?.[0]?.linkedin_url && (
                            <div className="space-y-1">
                              <p className="text-sm text-steel-gray">🔗 LinkedIn</p>
                              <a
                                href={student.student_profiles[0].linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm"
                              >
                                View Profile
                              </a>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-sm text-steel-gray">📅 Registration Date</p>
                            <p className="font-medium">
                              {new Date(student.created_at).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          {student.student_profiles?.[0]?.monthly_payment_active && (
                            <div className="space-y-1">
                              <p className="text-sm text-steel-gray">💳 Payment Status</p>
                              <Badge className="bg-success text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Documenti */}
                        <div className="p-3 bg-cloud-white rounded-lg">
                          <p className="text-sm font-semibold text-steel-gray mb-2">📄 Uploaded Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {student.student_profiles?.[0]?.cv_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAsPdf(
                                  student.student_profiles[0].cv_url,
                                  `${student.student_profiles?.[0]?.first_name || 'Student'}_${student.student_profiles?.[0]?.last_name || ''}_CV.pdf`
                                )}
                                className="flex items-center gap-1"
                              >
                                <FileText className="h-4 w-4" />
                                Download CV
                              </Button>
                            )}
                            {student.student_profiles?.[0]?.cover_letter_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAsPdf(
                                  student.student_profiles[0].cover_letter_url,
                                  `${student.student_profiles?.[0]?.first_name || 'Student'}_${student.student_profiles?.[0]?.last_name || ''}_CoverLetter.pdf`
                                )}
                                className="flex items-center gap-1"
                              >
                                <FileText className="h-4 w-4" />
                                Download Cover Letter
                              </Button>
                            )}
                            {student.student_profiles?.[0]?.presentation_video_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(student.student_profiles[0].presentation_video_url, '_blank')}
                                className="flex items-center gap-1"
                              >
                                <FileText className="h-4 w-4" />
                                Open Presentation Video
                              </Button>
                            )}
                            {!student.student_profiles?.[0]?.cv_url && !student.student_profiles?.[0]?.cover_letter_url && !student.student_profiles?.[0]?.presentation_video_url && (
                              <p className="text-sm text-steel-gray">No documents uploaded</p>
                            )}
                          </div>
                        </div>


                        {/* Idoneità al lavoro / burocrazia */}
                        {(() => {
                          const p = student.student_profiles?.[0];
                          const has = p && (p.passport_url || p.uk_work_visa || p.citizenship || p.home_address || p.city || p.country || p.internship_start_date || p.internship_end_date);
                          if (!has) return null;
                          return (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
                              <p className="text-sm font-semibold text-steel-gray">🛂 Work Eligibility</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-steel-gray">
                                {p.uk_work_visa && <p><span className="text-muted-foreground">UK Visa:</span> <strong>{ukVisaLabelIt(p.uk_work_visa)}</strong></p>}
                                {p.citizenship && <p><span className="text-muted-foreground">Citizenship:</span> <strong>{p.citizenship}</strong></p>}
                                {(p.internship_start_date || p.internship_end_date) && (
                                  <p className="col-span-2">
                                    <span className="text-muted-foreground">Availability:</span>{' '}
                                    {p.internship_start_date ? new Date(p.internship_start_date).toLocaleDateString() : '—'} → {p.internship_end_date ? new Date(p.internship_end_date).toLocaleDateString() : '—'}
                                  </p>
                                )}
                                {(p.home_address || p.city || p.country) && (
                                  <p className="col-span-2"><span className="text-muted-foreground">Residence:</span> {[p.home_address, p.city, p.country].filter(Boolean).join(', ')}</p>
                                )}
                              </div>
                              {p.passport_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-1 flex items-center gap-1"
                                  onClick={() => handleViewPassport(student.id)}
                                  disabled={viewingPassport === student.id}
                                >
                                  <FileText className="h-4 w-4" />
                                  {viewingPassport === student.id ? 'Opening...' : 'Open Passport'}
                                </Button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Visibilità Aziende */}
                        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-steel-gray">👁️ Company Visibility</p>
                              <p className="text-xs text-steel-gray mt-1">
                                {student.student_profiles?.[0]?.profile_visible_to_companies
                                  ? "✅ Visible to companies"
                                  : "🚫 Hidden from companies"}
                              </p>
                            </div>
                            <Badge 
                              className={
                                student.student_profiles?.[0]?.profile_visible_to_companies 
                                  ? "bg-green-500 text-white" 
                                  : "bg-gray-400 text-white"
                              }
                            >
                              {student.student_profiles?.[0]?.profile_visible_to_companies ? "VISIBLE" : "HIDDEN"}
                            </Badge>
                          </div>
                        </div>

                        {/* Ricevuta Pagamento - mostra solo se status = payment_uploaded */}
                        {student.status === 'payment_uploaded' && (
                          <div className="p-3 bg-warning/10 border border-warning rounded-lg">
                            <p className="text-sm font-semibold text-warning mb-2">💳 Payment Receipt Uploaded</p>
                            <div className="flex gap-2">
                              {/* Find and display receipt if uploaded */}
                              {paymentReceipts
                                .filter((r: any) => r.user_id === student.id && r.verification_status !== 'DELETED')
                                .map((receipt: any) => (
                                  <Button
                                    key={receipt.id}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadAsPdf(
                                      receipt.receipt_url,
                                      `Receipt_${student.student_profiles?.[0]?.first_name}_${student.student_profiles?.[0]?.last_name}.pdf`
                                    )}
                                    className="flex items-center gap-1"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Download Receipt
                                  </Button>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Azioni basate su STATUS */}
                        {student.status === 'pending_review' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="destructive"
                              onClick={() => handleStudentAction(student.id, 'REJECT')}
                              className="flex-1"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => handleStudentAction(student.id, 'ADMIT')}
                              className="flex-1 bg-success hover:bg-success/90 text-white"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Admit
                            </Button>
                          </div>
                        )}

                        {student.status === 'accepted_pending_payment' && (
                          <div className="p-3 bg-sky/10 border border-sky rounded-lg">
                            <p className="text-sm text-steel-gray">
                              ⏳ The student is admitted and must upload the payment receipt. No action required at the moment.
                            </p>
                          </div>
                        )}

                        {student.status === 'payment_uploaded' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="destructive"
                              onClick={() => handleRejectPayment(student.id)}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject Payment
                            </Button>
                            <Button
                              onClick={() => handleStudentAction(student.id, 'CONFIRM_PAYMENT')}
                              className="flex-1 bg-success hover:bg-success/90 text-white"
                            >
                              <DoorOpen className="h-4 w-4 mr-2" />
                              Confirm Payment (Enter)
                            </Button>
                          </div>
                        )}

                        {student.status === 'active_member' && student.student_profiles?.[0]?.access_status === 'UNLOCKED' && (
                          <div className="space-y-2 pt-2">
                            {/* Visibility Toggle */}
                            <Button
                              onClick={() => handleToggleVisibility(
                                student.id,
                                student.student_profiles?.[0]?.profile_visible_to_companies || false,
                                `${student.student_profiles?.[0]?.first_name} ${student.student_profiles?.[0]?.last_name}`
                              )}
                              disabled={actionLoading[`visibility-${student.id}`]}
                              className={
                                student.student_profiles?.[0]?.profile_visible_to_companies
                                  ? "w-full bg-gray-600 hover:bg-gray-700 text-white"
                                  : "w-full bg-green-600 hover:bg-green-700 text-white"
                              }
                            >
                              {actionLoading[`visibility-${student.id}`] ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Processing...
                                </>
                              ) : student.student_profiles?.[0]?.profile_visible_to_companies ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Hide from companies
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Make visible to companies
                                </>
                              )}
                            </Button>

                            {/* Other Actions */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleRevokeAccess(
                                  student.id, 
                                  `${student.student_profiles?.[0]?.first_name} ${student.student_profiles?.[0]?.last_name}`
                                )}
                                disabled={actionLoading[`revoke-${student.id}`]}
                                className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
                              >
                                {actionLoading[`revoke-${student.id}`] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                                    Revoking...
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Revoke access
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDeleteUser(
                                  student.id, 
                                  `${student.student_profiles?.[0]?.first_name} ${student.student_profiles?.[0]?.last_name}`,
                                  'student'
                                )}
                                disabled={actionLoading[`delete-${student.id}`]}
                                className="flex-1"
                              >
                                {actionLoading[`delete-${student.id}`] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete permanently
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                        {student.registration_status === 'REJECTED' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteUser(
                                student.id, 
                                `${student.student_profiles?.[0]?.first_name} ${student.student_profiles?.[0]?.last_name}`,
                                'student'
                              )}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from Dashboard
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {students.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-steel-gray/30 mx-auto mb-3" />
                      <p className="text-steel-gray">No students registered</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <CardTitle>Company Management - Access Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companies.map((company) => (
                    <Card key={company.id} className="p-4">
                      <div className="space-y-3">
                        {/* Header con stato e logo */}
                        <div className="flex items-start gap-4">
                          {company.company_profiles?.[0]?.logo_url ? (
                            <img 
                              src={company.company_profiles[0].logo_url} 
                              alt={`${company.company_profiles[0].company_name} logo`}
                              className="h-16 w-16 object-cover rounded border"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded border bg-runway-gray flex items-center justify-center">
                              <Building2 className="h-8 w-8 text-steel-gray" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Building2 className="h-5 w-5 text-primary" />
                              {company.company_profiles?.[0]?.company_name || 'Name not provided'}
                            </h3>
                            <div className="mt-1">
                              {getCompanyRegistrationBadge(company.registration_status, company.status)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCompanyEdit(company)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Edit profile
                          </Button>
                        </div>

                        {/* Dati dell'azienda */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-runway-gray rounded-lg">
                          <div className="space-y-1">
                            <p className="text-sm text-steel-gray">📧 Reference Email</p>
                            <p className="font-medium">{company.company_profiles?.[0]?.reference_email || company.email}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-steel-gray">🏢 Sector</p>
                            <p className="font-medium">{company.company_profiles?.[0]?.sector || 'Not specified'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-steel-gray">📏 Size</p>
                            <p className="font-medium">
                              {company.company_profiles?.[0]?.size === 'STARTUP' && 'Startup (1-10)'}
                              {company.company_profiles?.[0]?.size === 'BOUTIQUE' && 'Boutique (11-50)'}
                              {company.company_profiles?.[0]?.size === 'MEDIUM_SIZE' && 'Medium (51-200)'}
                              {company.company_profiles?.[0]?.size === 'LARGE_COMPANY' && 'Large (200+)'}
                              {!company.company_profiles?.[0]?.size && 'Not specified'}
                            </p>
                          </div>
                          {company.company_profiles?.[0]?.linkedin_url && (
                            <div className="space-y-1">
                              <p className="text-sm text-steel-gray">🔗 LinkedIn</p>
                              <a 
                                href={company.company_profiles[0].linkedin_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm"
                              >
                                View Company Page
                              </a>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-sm text-steel-gray">📅 Registration Date</p>
                            <p className="font-medium">
                              {new Date(company.created_at).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>

                        {/* Azioni */}
                        {company.registration_status === 'PENDING' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="destructive"
                              onClick={() => handleCompanyAction(company.id, 'REJECT')}
                              className="flex-1"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => handleCompanyAction(company.id, 'APPROVE')}
                              className="flex-1 bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success text-white shadow-lg shadow-success/30 border-2 border-success/50 font-semibold"
                            >
                              <DoorOpen className="h-4 w-4 mr-2" />
                              Grant Access (Enter)
                            </Button>
                          </div>
                        )}
                        {(company.registration_status === 'APPROVED' || company.registration_status === 'REJECTED') && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteUser(
                                company.id, 
                                company.company_profiles?.[0]?.company_name || 'Company',
                                'company'
                              )}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {company.registration_status === 'REJECTED' ? 'Remove from Dashboard' : 'Delete Permanently'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {companies.length === 0 && (
                    <div className="text-center py-12">
                      <Building2 className="h-12 w-12 text-steel-gray/30 mx-auto mb-3" />
                      <p className="text-steel-gray">No companies registered</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Management - Uploaded Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const visibleReceipts = paymentReceipts.filter(r => r.verification_status !== 'DELETED');
                    return (
                      <>
                        {visibleReceipts.map((receipt) => {
                          const student = students.find(s => s.id === receipt.user_id);
                          const isAccessGranted = student?.student_profiles?.[0]?.access_status === 'UNLOCKED';
                          
                          return (
                            <Card key={receipt.id} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold">
                                      {receipt.talent_pool_users?.student_profiles?.[0]?.first_name} {receipt.talent_pool_users?.student_profiles?.[0]?.last_name}
                                    </h4>
                                    <p className="text-sm text-steel-gray">{receipt.talent_pool_users?.email}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                      <span className="text-sm">
                                        Type: <strong>{receipt.payment_type === 'MONTHLY' ? 'Monthly' : 'Internship'}</strong>
                                      </span>
                                      <span className="text-sm">
                                        Amount: <strong>€{receipt.amount}</strong>
                                      </span>
                                      <span className="text-sm">
                                        Date: {new Date(receipt.created_at).toLocaleDateString('it-IT')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                  {receipt.verification_status === 'VERIFIED' ? (
                                    <Badge className="bg-success text-white">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Payment Verified
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleVerifyPayment(receipt.id, receipt.user_id)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Verify Payment
                                    </Button>
                                  )}

                                  {isAccessGranted ? (
                                    <Badge className="bg-green-600 text-white">
                                      <DoorOpen className="h-3 w-3 mr-1" />
                                      Access Granted
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleGrantAccess(receipt.user_id)}
                                      className="bg-success hover:bg-success/90 text-white"
                                    >
                                      <DoorOpen className="h-4 w-4 mr-1" />
                                      Grant Access to the Talent Pool
                                    </Button>
                                  )}

                                  {receipt.receipt_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => downloadAsPdf(
                                        receipt.receipt_url,
                                        `${(receipt.talent_pool_users?.student_profiles?.[0]?.first_name || 'Student')}_${(receipt.talent_pool_users?.student_profiles?.[0]?.last_name || '')}_receipt_${new Date(receipt.created_at).toISOString().slice(0,10)}.pdf`
                                      )}
                                    >
                                      📄 Download document
                                    </Button>
                                  )}
                                  
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeletePaymentReceipt(
                                      receipt.id,
                                      `${receipt.talent_pool_users?.student_profiles?.[0]?.first_name} ${receipt.talent_pool_users?.student_profiles?.[0]?.last_name}`
                                    )}
                                    disabled={actionLoading[`delete-payment-${receipt.id}`]}
                                  >
                                    {actionLoading[`delete-payment-${receipt.id}`] ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                        {visibleReceipts.length === 0 && (
                          <div className="text-center py-12">
                            <CreditCard className="h-12 w-12 text-steel-gray/30 mx-auto mb-3" />
                            <p className="text-steel-gray">No payments registered</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Admin Notifications - Student Selections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selections.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 text-steel-gray/30 mx-auto mb-3" />
                      <p className="text-steel-gray">No selections yet</p>
                    </div>
                  ) : (
                    selections.map((selection) => {
                      const companyName = selection.company_name || selection.company?.company_profiles?.[0]?.company_name || 'Company';
                      const studentName = (selection.student_first_name || selection.student_last_name)
                        ? `${selection.student_first_name || ''} ${selection.student_last_name || ''}`.trim()
                        : `${selection.talent_pool_users?.student_profiles?.[0]?.first_name || ''} ${selection.talent_pool_users?.student_profiles?.[0]?.last_name || ''}`.trim() || 'Student';
                      const studentEmail = selection.student_email || selection.talent_pool_users?.email || '';

                      return (
                        <Card key={selection.id} className="p-4 border-l-4 border-l-primary">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                  <Building2 className="h-5 w-5 text-primary" />
                                  {companyName}
                                </h3>
                                <p className="text-sm text-steel-gray mt-1">
                                  selected <span className="font-semibold">{studentName}</span>
                                </p>
                                <p className="text-xs text-steel-gray mt-1">
                                  <strong>Date and time:</strong> {new Date(selection.selected_at).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                              </div>
                            </div>

                            <div className="p-3 bg-runway-gray rounded-lg">
                              <p className="text-sm">
                                <strong>Student Email:</strong> {studentEmail}
                              </p>
                            </div>

                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Recruiting Tab */}
          <TabsContent value="recruiting">
            <AdminActiveRecruiting />
          </TabsContent>

          {/* Knowledge Base Tab — reuses the full KB admin management (products,
              bundles, orders, clients, audit) embedded, with tier selector. */}
          <TabsContent value="knowledge-base">
            <KnowledgeBaseAdmin embedded />
          </TabsContent>
        </Tabs>

        {/* Admin: edit a company's profile — writes the SAME company_profiles row /
            RPC the company uses. ALL fields are pre-filled so editing one never
            blanks the others (update_company_profile overwrites every column). */}
        <Dialog open={!!editingCompany} onOpenChange={(o) => { if (!o) setEditingCompany(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit company profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {(companyLogoFile || editingCompany?.company_profiles?.[0]?.logo_url) ? (
                    <img
                      src={companyLogoFile ? URL.createObjectURL(companyLogoFile) : editingCompany?.company_profiles?.[0]?.logo_url}
                      alt="logo"
                      className="h-16 w-16 object-cover rounded border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded border bg-runway-gray flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-steel-gray" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (f && f.size > 5 * 1024 * 1024) {
                          toast({ title: "Logo too large", description: "Please select an image under 5MB.", variant: "destructive" });
                          return;
                        }
                        setCompanyLogoFile(f);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Add your logo to stand out — PNG/JPG, max 5MB.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Company name</Label>
                <Input value={companyEditData.company_name} onChange={(e) => setCompanyEditData({ ...companyEditData, company_name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sector</Label>
                  <Input value={companyEditData.sector} onChange={(e) => setCompanyEditData({ ...companyEditData, sector: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Select value={companyEditData.size} onValueChange={(v) => setCompanyEditData({ ...companyEditData, size: v })}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reference email</Label>
                <Input type="email" value={companyEditData.reference_email} onChange={(e) => setCompanyEditData({ ...companyEditData, reference_email: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>LinkedIn (optional)</Label>
                <Input value={companyEditData.linkedin_url} placeholder="https://linkedin.com/company/..." onChange={(e) => setCompanyEditData({ ...companyEditData, linkedin_url: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea value={companyEditData.description} onChange={(e) => setCompanyEditData({ ...companyEditData, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCompany(null)} disabled={savingCompany}>Cancel</Button>
              <Button onClick={handleSaveCompanyProfile} disabled={savingCompany}>{savingCompany ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;