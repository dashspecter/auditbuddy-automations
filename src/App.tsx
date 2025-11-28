import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ManagerRoute } from "@/components/ManagerRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import LocationAudit from "./pages/LocationAudit";
import Audits from "./pages/Audits";
import AuditDetail from "./pages/AuditDetail";
import Reports from "./pages/Reports";
import AdminTemplates from "./pages/AdminTemplates";
import TemplateEditor from "./pages/TemplateEditor";
import TemplateLibrary from "./pages/TemplateLibrary";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import NotificationTemplates from "./pages/NotificationTemplates";
import NotificationAuditLogs from "./pages/NotificationAuditLogs";
import NotificationAnalytics from "./pages/NotificationAnalytics";
import RecurringNotifications from "./pages/RecurringNotifications";
import DebugInfo from "./pages/DebugInfo";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PhotoGalleryPage from "./pages/PhotoGalleryPage";
import DocumentManagement from "./pages/DocumentManagement";
import TestCreation from "./pages/TestCreation";
import TestManagement from "./pages/TestManagement";
import TakeTest from "./pages/TakeTest";
import TestResult from "./pages/TestResult";
import LocationsManagement from "./pages/LocationsManagement";
import AuditSummary from "./pages/AuditSummary";
import AuditsCalendar from "./pages/AuditsCalendar";
import RecurringAuditSchedules from "./pages/RecurringAuditSchedules";
import RecurringMaintenanceSchedules from "./pages/RecurringMaintenanceSchedules";
import EmployeeManagement from "./pages/EmployeeManagement";
import StaffAudits from "./pages/StaffAudits";
import StaffAuditNew from "./pages/StaffAuditNew";
import ManualMetrics from "./pages/ManualMetrics";
import EquipmentList from "./pages/EquipmentList";
import EquipmentForm from "./pages/EquipmentForm";
import EquipmentDetail from "./pages/EquipmentDetail";
import BulkEquipmentQR from "./pages/BulkEquipmentQR";
import InterventionDetail from "./pages/InterventionDetail";
import MaintenanceCalendar from "./pages/MaintenanceCalendar";
import CompanyOnboarding from "./pages/CompanyOnboarding";
import CompanySettings from "./pages/CompanySettings";
import ModuleSelection from "./pages/ModuleSelection";
import { CompanyAdminRoute } from "./components/CompanyAdminRoute";
import { CompanyOwnerRoute } from "./components/CompanyOwnerRoute";
import PricingPlans from "./pages/PricingPlans";
import PlatformAdmin from "./pages/PlatformAdmin";
import PendingApproval from "./pages/PendingApproval";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // Prevent refetch on tab focus (important for mobile)
      refetchOnReconnect: false, // Prevent refetch on network reconnect
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <PWAInstallPrompt />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
              <Route path="/onboarding/company" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />
              <Route path="/onboarding/modules" element={<ProtectedRoute><ModuleSelection /></ProtectedRoute>} />
              <Route path="/settings/company" element={<CompanyOwnerRoute><CompanySettings /></CompanyOwnerRoute>} />
              <Route path="/pricing" element={<CompanyOwnerRoute><PricingPlans /></CompanyOwnerRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/audits" element={<ProtectedRoute><Audits /></ProtectedRoute>} />
              <Route path="/audits/:id" element={<ProtectedRoute><AuditDetail /></ProtectedRoute>} />
              <Route path="/audit-summary/:id" element={<ProtectedRoute><AuditSummary /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/location-audit" element={<ProtectedRoute><LocationAudit /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/templates" element={<ProtectedRoute><AdminTemplates /></ProtectedRoute>} />
              <Route path="/admin/templates/:id" element={<ProtectedRoute><TemplateEditor /></ProtectedRoute>} />
              <Route path="/admin/template-library" element={<ProtectedRoute><TemplateLibrary /></ProtectedRoute>} />
              <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="/admin/debug" element={<AdminRoute><DebugInfo /></AdminRoute>} />
              <Route path="/admin/platform" element={<AdminRoute><PlatformAdmin /></AdminRoute>} />
              <Route path="/notifications" element={<ManagerRoute><Notifications /></ManagerRoute>} />
              <Route path="/notification-templates" element={<ManagerRoute><NotificationTemplates /></ManagerRoute>} />
              <Route path="/notification-audit-logs" element={<ManagerRoute><NotificationAuditLogs /></ManagerRoute>} />
              <Route path="/notification-analytics" element={<ManagerRoute><NotificationAnalytics /></ManagerRoute>} />
              <Route path="/recurring-notifications" element={<ManagerRoute><RecurringNotifications /></ManagerRoute>} />
              <Route path="/photos" element={<ProtectedRoute><PhotoGalleryPage /></ProtectedRoute>} />
              <Route path="/documents" element={<ManagerRoute><DocumentManagement /></ManagerRoute>} />
              <Route path="/test-creation" element={<ManagerRoute><TestCreation /></ManagerRoute>} />
              <Route path="/test-management" element={<ManagerRoute><TestManagement /></ManagerRoute>} />
              <Route path="/take-test/:testId" element={<TakeTest />} />
              <Route path="/t/:shortCode" element={<TakeTest />} />
              <Route path="/test-result/:testId/:score/:passed" element={<TestResult />} />
              <Route path="/admin/locations" element={<AdminRoute><LocationsManagement /></AdminRoute>} />
              <Route path="/admin/employees" element={<ManagerRoute><EmployeeManagement /></ManagerRoute>} />
              <Route path="/audits-calendar" element={<ProtectedRoute><AuditsCalendar /></ProtectedRoute>} />
              <Route path="/recurring-schedules" element={<ManagerRoute><RecurringAuditSchedules /></ManagerRoute>} />
              <Route path="/staff-audits" element={<ProtectedRoute><StaffAudits /></ProtectedRoute>} />
              <Route path="/staff-audit/new" element={<ProtectedRoute><StaffAuditNew /></ProtectedRoute>} />
              <Route path="/manual-metrics" element={<ManagerRoute><ManualMetrics /></ManagerRoute>} />
              <Route path="/equipment" element={<ManagerRoute><EquipmentList /></ManagerRoute>} />
              <Route path="/equipment/bulk-qr" element={<ManagerRoute><BulkEquipmentQR /></ManagerRoute>} />
              <Route path="/equipment/new" element={<ManagerRoute><EquipmentForm /></ManagerRoute>} />
              <Route path="/equipment/:id" element={<EquipmentDetail />} />
              <Route path="/equipment/:id/edit" element={<ManagerRoute><EquipmentForm /></ManagerRoute>} />
              <Route path="/interventions/:id" element={<ProtectedRoute><InterventionDetail /></ProtectedRoute>} />
              <Route path="/maintenance-calendar" element={<ManagerRoute><MaintenanceCalendar /></ManagerRoute>} />
              <Route path="/recurring-maintenance" element={<ManagerRoute><RecurringMaintenanceSchedules /></ManagerRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
