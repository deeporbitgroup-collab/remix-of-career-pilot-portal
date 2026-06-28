import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/i18n";
import { PathwaysAuthProvider } from "./contexts/PathwaysAuthContext";
import Index from "./pages/Index";
import Terms from "./pages/Terms";
import AssociateTerms from "./pages/AssociateTerms";
import Privacy from "./pages/Privacy";
import TalentPoolMain from "./pages/talent-pool/TalentPool";
import TalentPoolAdminLogin from "./pages/talent-pool/AdminLogin";
import TalentPoolAdminDashboard from "./pages/talent-pool/AdminDashboard";
import StudentAuth from "./pages/talent-pool/StudentAuth";
import StudentDashboard from "./pages/talent-pool/StudentDashboard";
import CompanyAuth from "./pages/talent-pool/CompanyAuth";
import CompanyDashboard from "./pages/talent-pool/CompanyDashboard";
import CompanySelectedStudents from "./pages/talent-pool/CompanySelectedStudents";
import ResetPassword from "./pages/talent-pool/ResetPassword";
import ReservedAreaResetPassword from "./pages/ResetPassword";
import Pathways from "./pages/platforms/Pathways";
import PathwaysCatalog from "./pages/platforms/PathwaysCatalog";
import PathwaysAccount from "./pages/platforms/PathwaysAccount";
import PathwaysForgotPassword from "./pages/platforms/PathwaysForgotPassword";
import PathwaysResetPassword from "./pages/platforms/PathwaysResetPassword";
import PathwaysAdminLogin from "./pages/platforms/PathwaysAdminLogin";
import PathwaysAdminDashboard from "./pages/platforms/PathwaysAdminDashboard";
import PathwaysStudentDashboard from "./pages/platforms/PathwaysStudentDashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import PathwaysLayout from "./components/PathwaysLayout";
import AssociateDashboard from "./pages/associate/Dashboard";
import AssociateDocuments from "./pages/associate/Documents";
import AssociateProfile from "./pages/associate/Profile";
import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerDocuments from "./pages/partner/Documents";
import PartnerProfile from "./pages/partner/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import Associates from "./pages/admin/Associates";
import Partners from "./pages/admin/Partners";
import AssociateDetail from "./pages/admin/AssociateDetail";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { TalentPoolLanguageProvider } from "@/contexts/TalentPoolLanguageContext";
import ClientAuth from "./pages/client-portal/ClientAuth";
import ClientDashboard from "./pages/client-portal/ClientDashboard";
import ClientServices from "./pages/client-portal/ClientServices";
import ClientCheckout from "./pages/client-portal/ClientCheckout";
import PayOrder from "./pages/client-portal/PayOrder";
import ClientResetPassword from "./pages/client-portal/ClientResetPassword";
import KnowledgeBase from "./pages/KnowledgeBase";
import KnowledgeBaseCheckout from "./pages/KnowledgeBaseCheckout";
import KnowledgeBaseAdmin from "./pages/admin/KnowledgeBaseAdmin";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <PathwaysAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/associate-terms" element={<AssociateTerms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/talent-pool" element={<TalentPoolLanguageProvider><TalentPoolMain /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/admin" element={<TalentPoolLanguageProvider><TalentPoolAdminLogin /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/admin/dashboard" element={<TalentPoolLanguageProvider><TalentPoolAdminDashboard /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/student/auth" element={<TalentPoolLanguageProvider><StudentAuth /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/student" element={<TalentPoolLanguageProvider><StudentAuth /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/student/dashboard" element={<TalentPoolLanguageProvider><StudentDashboard /></TalentPoolLanguageProvider>} />
              
              <Route path="/talent-pool/company/auth" element={<TalentPoolLanguageProvider><CompanyAuth /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/company" element={<TalentPoolLanguageProvider><CompanyAuth /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/company/dashboard" element={<TalentPoolLanguageProvider><CompanyDashboard /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/company/selected-students" element={<TalentPoolLanguageProvider><CompanySelectedStudents /></TalentPoolLanguageProvider>} />
              <Route path="/talent-pool/reset-password" element={<TalentPoolLanguageProvider><ResetPassword /></TalentPoolLanguageProvider>} />
              
              {/* Pathways Routes - Wrapped in PathwaysLayout */}
              <Route element={<PathwaysLayout />}>
                <Route path="/platforms/pathways" element={<Pathways />} />
                <Route path="/platforms/pathways/catalog" element={<PathwaysCatalog />} />
                <Route path="/platforms/pathways/account" element={<PathwaysAccount />} />
                <Route path="/platforms/pathways/forgot-password" element={<PathwaysForgotPassword />} />
                <Route path="/platforms/pathways/reset-password" element={<PathwaysResetPassword />} />
                <Route path="/platforms/pathways/student/dashboard" element={<PathwaysStudentDashboard />} />
                <Route path="/platforms/pathways/admin/login" element={<PathwaysAdminLogin />} />
                <Route path="/platforms/pathways/admin" element={<PathwaysAdminDashboard />} />
              </Route>
              
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ReservedAreaResetPassword />} />

              {/* Client Portal */}
              <Route path="/client-portal" element={<ClientServices />} />
              <Route path="/client-portal/services" element={<ClientServices />} />
              <Route path="/client-portal/checkout" element={<ClientCheckout />} />
              <Route path="/client-portal/auth" element={<ClientAuth />} />
              <Route path="/client-portal/dashboard" element={<ClientDashboard />} />
              <Route path="/client-portal/pay" element={<PayOrder />} />
              <Route path="/client-portal/reset-password" element={<ClientResetPassword />} />

              {/* Knowledge Base */}
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/knowledge-base/checkout" element={<KnowledgeBaseCheckout />} />
              <Route path="/admin/knowledge-base" element={<KnowledgeBaseAdmin />} />

              {/* Stripe Payment Result Pages */}
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-canceled" element={<PaymentCanceled />} />
              
              {/* Protected Routes - Associate */}
              <Route path="/app/associate" element={
                <ProtectedRoute role="ASSOCIATE">
                  <AssociateDashboard />
                </ProtectedRoute>
              } />
              <Route path="/app/associate/documents" element={
                <ProtectedRoute role="ASSOCIATE">
                  <AssociateDocuments />
                </ProtectedRoute>
              } />
              <Route path="/app/associate/profile" element={
                <ProtectedRoute role="ASSOCIATE">
                  <AssociateProfile />
                </ProtectedRoute>
              } />

              {/* Protected Routes - Partner */}
              <Route path="/app/partner" element={
                <ProtectedRoute role="PARTNER">
                  <PartnerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/app/partner/documents" element={
                <ProtectedRoute role="PARTNER">
                  <PartnerDocuments />
                </ProtectedRoute>
              } />
              <Route path="/app/partner/profile" element={
                <ProtectedRoute role="PARTNER">
                  <PartnerProfile />
                </ProtectedRoute>
              } />
              
              {/* Protected Routes - Admin */}
              <Route path="/app/admin" element={
                <ProtectedRoute role="ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/app/admin/associates" element={
                <ProtectedRoute role="ADMIN">
                  <Associates />
                </ProtectedRoute>
              } />
              <Route path="/app/admin/partners" element={
                <ProtectedRoute role="ADMIN">
                  <Partners />
                </ProtectedRoute>
              } />
              <Route path="/app/admin/associates/:id" element={
                <ProtectedRoute role="ADMIN">
                  <AssociateDetail />
                </ProtectedRoute>
              } />
              
              {/* Legacy routes - redirect to new paths */}
              <Route path="/associate/dashboard" element={<Navigate to="/app/associate" replace />} />
              <Route path="/partner/dashboard" element={<Navigate to="/app/partner" replace />} />
              <Route path="/admin/dashboard" element={<Navigate to="/app/admin" replace />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PathwaysAuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;