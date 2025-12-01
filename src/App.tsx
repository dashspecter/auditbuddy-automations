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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
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
import Workforce from "./pages/Workforce";
import Staff from "./pages/workforce/Staff";
import StaffProfile from "./pages/workforce/StaffProfile";
import Shifts from "./pages/workforce/Shifts";
import Attendance from "./pages/workforce/Attendance";
import TimeOff from "./pages/workforce/TimeOff";
import Payroll from "./pages/workforce/Payroll";
import Tasks from "./pages/Tasks";
import Inventory from "./pages/Inventory";
import Insights from "./pages/Insights";
import AIFeed from "./pages/AIFeed";
import Integrations from "./pages/Integrations";
import IntegrationDetail from "./pages/IntegrationDetail";
import Templates from "./pages/audits/Templates";
import TemplateBuilder from "./pages/audits/TemplateBuilder";
import ScheduleAudit from "./pages/audits/ScheduleAudit";
import PerformAudit from "./pages/audits/PerformAudit";
import AuditReport from "./pages/audits/AuditReport";
import AuditsList from "./pages/audits/AuditsList";
import DocumentDetail from "./pages/documents/DocumentDetail";
import TrainingPrograms from "./pages/training/TrainingPrograms";
import TrainingProgramDetail from "./pages/training/TrainingProgramDetail";
import SystemHealth from "./pages/SystemHealth";

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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <PWAInstallPrompt />
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
              <Route path="/onboarding/company" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />
              <Route path="/onboarding/modules" element={<ProtectedRoute><ModuleSelection /></ProtectedRoute>} />
              <Route path="/settings/company" element={<CompanyOwnerRoute><CompanySettings /></CompanyOwnerRoute>} />
              <Route path="/pricing" element={<CompanyOwnerRoute><AppLayout><PricingPlans /></AppLayout></CompanyOwnerRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/audits" element={<ProtectedRoute><AppLayout><Audits /></AppLayout></ProtectedRoute>} />
              <Route path="/audits/:id" element={<ProtectedRoute><AppLayout><AuditDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/audit-summary/:id" element={<ProtectedRoute><AppLayout><AuditSummary /></AppLayout></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
              <Route path="/location-audit" element={<ProtectedRoute><AppLayout><LocationAudit /></AppLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/templates" element={<ProtectedRoute><AppLayout><AdminTemplates /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/templates/:id" element={<ProtectedRoute><AppLayout><TemplateEditor /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/template-library" element={<ProtectedRoute><AppLayout><TemplateLibrary /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AppLayout><UserManagement /></AppLayout></AdminRoute>} />
              <Route path="/admin/debug" element={<AdminRoute><AppLayout><DebugInfo /></AppLayout></AdminRoute>} />
              <Route path="/admin/platform" element={<AdminRoute><AppLayout><PlatformAdmin /></AppLayout></AdminRoute>} />
              <Route path="/notifications" element={<ManagerRoute><AppLayout><Notifications /></AppLayout></ManagerRoute>} />
              <Route path="/notification-templates" element={<ManagerRoute><AppLayout><NotificationTemplates /></AppLayout></ManagerRoute>} />
              <Route path="/notification-audit-logs" element={<ManagerRoute><AppLayout><NotificationAuditLogs /></AppLayout></ManagerRoute>} />
              <Route path="/notification-analytics" element={<ManagerRoute><AppLayout><NotificationAnalytics /></AppLayout></ManagerRoute>} />
              <Route path="/recurring-notifications" element={<ManagerRoute><AppLayout><RecurringNotifications /></AppLayout></ManagerRoute>} />
              <Route path="/photos" element={<ProtectedRoute><AppLayout><PhotoGalleryPage /></AppLayout></ProtectedRoute>} />
              <Route path="/documents" element={<ManagerRoute><AppLayout><DocumentManagement /></AppLayout></ManagerRoute>} />
              <Route path="/documents/:id" element={<ProtectedRoute><AppLayout><DocumentDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/training" element={<ProtectedRoute><AppLayout><TrainingPrograms /></AppLayout></ProtectedRoute>} />
              <Route path="/training/:id" element={<ProtectedRoute><AppLayout><TrainingProgramDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/test-creation" element={<ManagerRoute><AppLayout><TestCreation /></AppLayout></ManagerRoute>} />
              <Route path="/test-management" element={<ManagerRoute><AppLayout><TestManagement /></AppLayout></ManagerRoute>} />
              <Route path="/take-test/:testId" element={<TakeTest />} />
              <Route path="/t/:shortCode" element={<TakeTest />} />
              <Route path="/test-result/:testId/:score/:passed" element={<TestResult />} />
              <Route path="/admin/locations" element={<AdminRoute><AppLayout><LocationsManagement /></AppLayout></AdminRoute>} />
              <Route path="/admin/employees" element={<ManagerRoute><AppLayout><EmployeeManagement /></AppLayout></ManagerRoute>} />
              <Route path="/audits-calendar" element={<ProtectedRoute><AppLayout><AuditsCalendar /></AppLayout></ProtectedRoute>} />
              <Route path="/recurring-schedules" element={<ManagerRoute><AppLayout><RecurringAuditSchedules /></AppLayout></ManagerRoute>} />
              <Route path="/staff-audits" element={<ProtectedRoute><AppLayout><StaffAudits /></AppLayout></ProtectedRoute>} />
              <Route path="/staff-audit/new" element={<ProtectedRoute><AppLayout><StaffAuditNew /></AppLayout></ProtectedRoute>} />
              <Route path="/manual-metrics" element={<ManagerRoute><AppLayout><ManualMetrics /></AppLayout></ManagerRoute>} />
              <Route path="/equipment" element={<ManagerRoute><AppLayout><EquipmentList /></AppLayout></ManagerRoute>} />
              <Route path="/equipment/bulk-qr" element={<ManagerRoute><AppLayout><BulkEquipmentQR /></AppLayout></ManagerRoute>} />
              <Route path="/equipment/new" element={<ManagerRoute><AppLayout><EquipmentForm /></AppLayout></ManagerRoute>} />
              <Route path="/equipment/:id" element={<AppLayout><EquipmentDetail /></AppLayout>} />
              <Route path="/equipment/:id/edit" element={<ManagerRoute><AppLayout><EquipmentForm /></AppLayout></ManagerRoute>} />
              <Route path="/interventions/:id" element={<ProtectedRoute><AppLayout><InterventionDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/maintenance-calendar" element={<ManagerRoute><AppLayout><MaintenanceCalendar /></AppLayout></ManagerRoute>} />
              <Route path="/recurring-maintenance" element={<ManagerRoute><AppLayout><RecurringMaintenanceSchedules /></AppLayout></ManagerRoute>} />
              
              {/* Workforce Routes */}
              <Route path="/workforce" element={<ProtectedRoute><AppLayout><Workforce /></AppLayout></ProtectedRoute>} />
              <Route path="/workforce/staff" element={<ProtectedRoute><AppLayout><Staff /></AppLayout></ProtectedRoute>} />
              <Route path="/workforce/staff/:id" element={<ProtectedRoute><AppLayout><StaffProfile /></AppLayout></ProtectedRoute>} />
              <Route path="/workforce/shifts" element={<ProtectedRoute><AppLayout><Shifts /></AppLayout></ProtectedRoute>} />
              <Route path="/workforce/attendance" element={<ProtectedRoute><AppLayout><Attendance /></AppLayout></ProtectedRoute>} />
              <Route path="/workforce/time-off" element={<ProtectedRoute><AppLayout><TimeOff /></AppLayout></ProtectedRoute>} />
              <Route path="/workforce/payroll" element={<ManagerRoute><AppLayout><Payroll /></AppLayout></ManagerRoute>} />
              
              {/* Tasks Routes */}
              <Route path="/tasks" element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
              
              {/* Inventory Routes */}
              <Route path="/inventory" element={<ManagerRoute><AppLayout><Inventory /></AppLayout></ManagerRoute>} />
              
              {/* Insights Routes */}
              <Route path="/insights" element={<ManagerRoute><AppLayout><Insights /></AppLayout></ManagerRoute>} />
              <Route path="/ai-feed" element={<ManagerRoute><AppLayout><AIFeed /></AppLayout></ManagerRoute>} />
              
              {/* Integrations Routes */}
              <Route path="/integrations" element={<ManagerRoute><AppLayout><Integrations /></AppLayout></ManagerRoute>} />
              <Route path="/integrations/:id" element={<ManagerRoute><AppLayout><IntegrationDetail /></AppLayout></ManagerRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              
              {/* System Health - Internal Diagnostics */}
              <Route path="/system-health" element={<ProtectedRoute><AppLayout><SystemHealth /></AppLayout></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
