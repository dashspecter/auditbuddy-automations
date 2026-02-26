import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ManagerRoute } from "@/components/ManagerRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdateReadyToast } from "@/components/PWAUpdateReadyToast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppVisibilityManager } from "@/components/AppVisibilityManager";
import { useIsScoutsDomain } from "@/hooks/useIsScoutsDomain";
import ScoutPortalApp from "./pages/scout-portal/ScoutPortalApp";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import FullPresentation from "./pages/FullPresentation";
import SalesOffer from "./pages/SalesOffer";
import LandingNFX from "./pages/LandingNFX";
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
import TestEdit from "./pages/TestEdit";
import TakeTest from "./pages/TakeTest";
import TestResult from "./pages/TestResult";
import LocationsManagement from "./pages/LocationsManagement";
import AuditSummary from "./pages/AuditSummary";
import AuditsCalendar from "./pages/AuditsCalendar";
import RecurringAuditSchedules from "./pages/RecurringAuditSchedules";
import RecurringMaintenanceSchedules from "./pages/RecurringMaintenanceSchedules";
import EmployeeManagement from "./pages/EmployeeManagement";
import StaffAudits from "./pages/StaffAudits";
import StaffAuditsViewAll from "./pages/StaffAuditsViewAll";
import StaffAuditDetail from "./pages/StaffAuditDetail";
import StaffAuditNew from "./pages/StaffAuditNew";
import ManualMetrics from "./pages/ManualMetrics";
import EquipmentList from "./pages/EquipmentList";
import EquipmentForm from "./pages/EquipmentForm";
import EquipmentDetail from "./pages/EquipmentDetail";
import BulkEquipmentQR from "./pages/BulkEquipmentQR";
import InterventionDetail from "./pages/InterventionDetail";
import MaintenanceCalendar from "./pages/MaintenanceCalendar";
import CmmsWorkOrders from "./pages/cmms/WorkOrders";
import CmmsAssets from "./pages/cmms/Assets";
import CmmsAssetDetail from "./pages/cmms/AssetDetail";
import CmmsProcedures from "./pages/cmms/Procedures";
import CmmsProcedureDetail from "./pages/cmms/ProcedureDetail";
import CmmsPmSchedules from "./pages/cmms/PmSchedules";
import CmmsPartsInventory from "./pages/cmms/PartsInventory";
import CmmsPurchaseOrders from "./pages/cmms/PurchaseOrders";
import CmmsVendors from "./pages/cmms/Vendors";
import CmmsTeams from "./pages/cmms/Teams";
import CmmsDashboard from "./pages/cmms/CmmsDashboard";
import CmmsReporting from "./pages/cmms/CmmsReporting";
import CmmsOverview from "./pages/cmms/CmmsOverview";
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
import WorkforceStaffProfile from "./pages/workforce/StaffProfile";
import Shifts from "./pages/workforce/Shifts";
import Attendance from "./pages/workforce/Attendance";
import TimeOffApprovals from "./pages/workforce/TimeOffApprovals";
import Payroll from "./pages/workforce/Payroll";
import EmployeePerformance from "./pages/workforce/EmployeePerformance";
import BadgeSettings from "./pages/workforce/BadgeSettings";
import SalesManagement from "./pages/workforce/SalesManagement";
import Training from "./pages/workforce/Training";
import TrainingModuleDetail from "./pages/workforce/TrainingModuleDetail";
import TrainingAssignmentNew from "./pages/workforce/TrainingAssignmentNew";
import TrainingAssignmentDetail from "./pages/workforce/TrainingAssignmentDetail";
import StaffLogin from "./pages/StaffLogin";
import StaffHome from "./pages/staff/StaffHome";
import StaffSchedule from "./pages/staff/StaffSchedule";
import StaffShifts from "./pages/staff/StaffShifts";
import StaffShiftPool from "./pages/staff/StaffShiftPool";
import StaffSwapRequests from "./pages/staff/StaffSwapRequests";
import StaffTimeOff from "./pages/staff/StaffTimeOff";
import StaffProfile from "./pages/staff/StaffProfile";
import StaffMessages from "./pages/staff/StaffMessages";
import StaffEarnings from "./pages/staff/StaffEarnings";
import StaffTasks from "./pages/staff/StaffTasks";
import ManagerSchedule from "./pages/staff/ManagerSchedule";
import StaffLocationAudit from "./pages/staff/StaffLocationAudit";
import StaffLocationAudits from "./pages/staff/StaffLocationAudits";
import StaffLocationAuditDetail from "./pages/staff/StaffLocationAuditDetail";
import StaffEmployeeAudit from "./pages/staff/StaffEmployeeAudit";
import StaffStaffAudit from "./pages/staff/StaffStaffAudit";
import StaffPerformanceReview from "./pages/staff/StaffPerformanceReview";
import StaffWarnings from "./pages/staff/StaffWarnings";
import TeamView from "./pages/staff/TeamView";
import StaffCheckpoints from "./pages/staff/StaffCheckpoints";
import StaffScoreBreakdown from "./pages/staff/StaffScoreBreakdown";
import Tasks from "./pages/Tasks";
import TaskNew from "./pages/TaskNew";
import TaskEdit from "./pages/TaskEdit";
import TasksCalendar from "./pages/TasksCalendar";
import ComplianceDossier from "./pages/ComplianceDossier";
import EvidenceReview from "./pages/EvidenceReview";
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
import SystemHealthData from "./pages/debug/SystemHealthData";
import AttendanceKiosk from "./pages/AttendanceKiosk";
import StaffScanAttendance from "./pages/staff/StaffScanAttendance";
import StaffScanVoucher from "./pages/staff/StaffScanVoucher";
import MarketplaceBrowse from "./pages/marketplace/MarketplaceBrowse";
import MarketplaceTemplateDetail from "./pages/marketplace/MarketplaceTemplateDetail";
import MarketplacePublish from "./pages/marketplace/MarketplacePublish";
import MyMarketplaceTemplates from "./pages/marketplace/MyMarketplaceTemplates";
import MarketplaceShare from "./pages/marketplace/MarketplaceShare";
import AgentsDashboard from "./pages/admin/AgentsDashboard";
import AgentPolicies from "./pages/admin/AgentPolicies";
import AgentLogs from "./pages/admin/AgentLogs";
import AgentWorkflows from "./pages/admin/AgentWorkflows";
import RunAgent from "./pages/admin/RunAgent";
import DailyOps from "./pages/operations/DailyOps";
import DailyOpsDetail from "./pages/operations/DailyOpsDetail";
import MaintenanceTasks from "./pages/operations/MaintenanceTasks";
import SLAManagement from "./pages/operations/SLAManagement";
import MysteryShopperForm from "./pages/mystery-shopper/MysteryShopperForm";
import VoucherPage from "./pages/mystery-shopper/VoucherPage";
import MysteryShopperTemplates from "./pages/audits/MysteryShopperTemplates";
import MysteryShopperTemplateEditor from "./pages/audits/MysteryShopperTemplateEditor";
import MysteryShopperResults from "./pages/audits/MysteryShopperResults";
import VouchersManagement from "./pages/audits/VouchersManagement";
import PayrollBatches from "./pages/workforce/PayrollBatches";
import AttendanceAlerts from "./pages/workforce/AttendanceAlerts";
import SchedulingInsights from "./pages/workforce/SchedulingInsights";
import Warnings from "./pages/workforce/Warnings";
import StaffDocuments from "./pages/staff/StaffDocuments";
import AddWasteEntry from "./pages/staff/AddWasteEntry";
import MyWasteEntries from "./pages/staff/MyWasteEntries";
import WasteProducts from "./pages/admin/waste/WasteProducts";
import WasteReasons from "./pages/admin/waste/WasteReasons";
import WasteSettings from "./pages/admin/waste/WasteSettings";
import AdminAddWasteEntry from "./pages/admin/waste/AdminAddWasteEntry";
import AdminWasteEntries from "./pages/admin/waste/AdminWasteEntries";
import WasteReports from "./pages/reports/WasteReports";
import ActivityLog from "./pages/ActivityLog";
import RoleTemplates from "./pages/RoleTemplates";
import PolicyRules from "./pages/PolicyRules";
import QrFormTemplates from "./pages/qr-forms/QrFormTemplates";
import QrFormTemplateEditor from "./pages/qr-forms/QrFormTemplateEditor";
import QrFormAssignments from "./pages/qr-forms/QrFormAssignments";
import QrFormRecords from "./pages/qr-forms/QrFormRecords";
import QrFormEntry from "./pages/qr-forms/QrFormEntry";
import CorrectiveActionsList from "./pages/correctiveActions/CorrectiveActionsList";
import CorrectiveActionDetail from "./pages/correctiveActions/CorrectiveActionDetail";
import CorrectiveActionRules from "./pages/correctiveActions/CorrectiveActionRules";
import WhatsAppTemplates from "./pages/WhatsAppTemplates";
import WhatsAppRules from "./pages/WhatsAppRules";
import WhatsAppBroadcast from "./pages/WhatsAppBroadcast";
import WhatsAppLogs from "./pages/WhatsAppLogs";
import ScoutsOverview from "./pages/scouts/ScoutsOverview";
import ScoutsJobs from "./pages/scouts/ScoutsJobs";
import ScoutsJobNew from "./pages/scouts/ScoutsJobNew";
import ScoutsReview from "./pages/scouts/ScoutsReview";
import ScoutsTemplates from "./pages/scouts/ScoutsTemplates";
import ScoutsJobDetail from "./pages/scouts/ScoutsJobDetail";
import ScoutsPayouts from "./pages/scouts/ScoutsPayouts";
import ScoutsRoster from "./pages/scouts/ScoutsRoster";
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

const App = () => {
  const isScoutsDomain = useIsScoutsDomain();

  // Scout portal: completely separate app shell
  if (isScoutsDomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScoutPortalApp />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdateReadyToast />
        <BrowserRouter>
          <Routes>
            {/* Public kiosk route - fully outside Auth/Company contexts for anonymous access */}
            <Route path="/kiosk/:token" element={<AttendanceKiosk />} />
            
            {/* QR Forms entry - needs Auth but accessible via QR scan */}
            <Route path="/qr/forms/:token" element={
              <AuthProvider>
                <QrFormEntry />
              </AuthProvider>
            } />
            
            {/* All other routes go through Auth/Company contexts */}
            <Route path="/*" element={
              <AuthProvider>
                <AppVisibilityManager />
                <CompanyProvider>
                  <SidebarProvider>
                    <PWAInstallPrompt />
                    <Routes>
                      <Route path="/" element={<LandingNFX />} />
                      <Route path="/full-presentation" element={<FullPresentation />} />
                      <Route path="/full" element={<FullPresentation />} />
                      <Route path="/sales-offer" element={<SalesOffer />} />
                      <Route path="/go" element={<LandingNFX />} />
                      <Route path="/old-home" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/staff-login" element={<StaffLogin />} />
                      <Route path="/staff" element={<ProtectedRoute><StaffHome /></ProtectedRoute>} />
                      <Route path="/staff/schedule" element={<ProtectedRoute><StaffSchedule /></ProtectedRoute>} />
                      <Route path="/staff/manager-schedule" element={<ProtectedRoute><ManagerSchedule /></ProtectedRoute>} />
                      <Route path="/staff/shifts" element={<ProtectedRoute><StaffShifts /></ProtectedRoute>} />
                      <Route path="/staff/shift-pool" element={<ProtectedRoute><StaffShiftPool /></ProtectedRoute>} />
                      <Route path="/staff/swap-requests" element={<ProtectedRoute><StaffSwapRequests /></ProtectedRoute>} />
                      <Route path="/staff/time-off" element={<ProtectedRoute><StaffTimeOff /></ProtectedRoute>} />
                      <Route path="/staff/messages" element={<ProtectedRoute><StaffMessages /></ProtectedRoute>} />
                      <Route path="/staff/earnings" element={<ProtectedRoute><StaffEarnings /></ProtectedRoute>} />
                      <Route path="/staff/tasks" element={<ProtectedRoute><StaffTasks /></ProtectedRoute>} />
                      <Route path="/staff/profile" element={<ProtectedRoute><StaffProfile /></ProtectedRoute>} />
                      <Route path="/staff/team" element={<ProtectedRoute><TeamView /></ProtectedRoute>} />
                      <Route path="/staff/scan-attendance" element={<ProtectedRoute><StaffScanAttendance /></ProtectedRoute>} />
                      <Route path="/staff/scan-voucher" element={<ProtectedRoute><StaffScanVoucher /></ProtectedRoute>} />
                      <Route path="/staff/checkpoints" element={<ProtectedRoute><StaffCheckpoints /></ProtectedRoute>} />
                      <Route path="/staff/audits" element={<ProtectedRoute><StaffLocationAudits /></ProtectedRoute>} />
                      <Route path="/staff/audits/:id" element={<ProtectedRoute><StaffLocationAuditDetail /></ProtectedRoute>} />
                      <Route path="/staff/location-audit" element={<ProtectedRoute><StaffLocationAudit /></ProtectedRoute>} />
                      <Route path="/staff/employee-audit" element={<ProtectedRoute><StaffEmployeeAudit /></ProtectedRoute>} />
                      <Route path="/staff/staff-audit" element={<ProtectedRoute><StaffStaffAudit /></ProtectedRoute>} />
                      <Route path="/staff/performance-review" element={<ProtectedRoute><StaffPerformanceReview /></ProtectedRoute>} />
                      <Route path="/staff/warnings" element={<ProtectedRoute><StaffWarnings /></ProtectedRoute>} />
                      <Route path="/staff/score" element={<ProtectedRoute><StaffScoreBreakdown /></ProtectedRoute>} />
                      <Route path="/staff/documents" element={<ProtectedRoute><StaffDocuments /></ProtectedRoute>} />
                      <Route path="/staff/waste" element={<ProtectedRoute><MyWasteEntries /></ProtectedRoute>} />
                      <Route path="/staff/waste/new" element={<ProtectedRoute><AddWasteEntry /></ProtectedRoute>} />
                      <Route path="/staff/tests/:testId" element={<ProtectedRoute><TakeTest /></ProtectedRoute>} />
                      {/* Legacy waste routes - redirect to new paths */}
                      <Route path="/waste/add" element={<Navigate to="/staff/waste/new" replace />} />
                      <Route path="/waste/entries" element={<Navigate to="/staff/waste" replace />} />
                      {/* Legacy route - redirect to new path */}
                      <Route path="/staff-dashboard" element={<ProtectedRoute><StaffHome /></ProtectedRoute>} />
                      <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
                      <Route path="/onboarding/company" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />
                      <Route path="/onboarding/modules" element={<ProtectedRoute><ModuleSelection /></ProtectedRoute>} />
                      <Route path="/settings/company" element={<CompanyAdminRoute><CompanySettings /></CompanyAdminRoute>} />
                      <Route path="/activity-log" element={<CompanyAdminRoute><ActivityLog /></CompanyAdminRoute>} />
                      <Route path="/role-templates" element={<CompanyAdminRoute><RoleTemplates /></CompanyAdminRoute>} />
                      <Route path="/policy-rules" element={<CompanyAdminRoute><PolicyRules /></CompanyAdminRoute>} />
                      <Route path="/pricing" element={<CompanyOwnerRoute><PricingPlans /></CompanyOwnerRoute>} />
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/audits" element={<ProtectedRoute><Audits /></ProtectedRoute>} />
                      <Route path="/audits/:id" element={<ProtectedRoute><AuditDetail /></ProtectedRoute>} />
                      <Route path="/audit-summary/:id" element={<ProtectedRoute><AuditSummary /></ProtectedRoute>} />
                      
                      {/* New Audit System Routes */}
                      <Route path="/location-audit" element={<ProtectedRoute><LocationAudit /></ProtectedRoute>} />
                      <Route path="/location-audit/:auditId" element={<ProtectedRoute><LocationAudit /></ProtectedRoute>} />
                      
                      <Route path="/reports" element={<ManagerRoute requiredPermission="view_reports"><Reports /></ManagerRoute>} />
                      <Route path="/equipment" element={<ProtectedRoute><EquipmentList /></ProtectedRoute>} />
                      <Route path="/equipment/new" element={<ProtectedRoute><EquipmentForm /></ProtectedRoute>} />
                      <Route path="/equipment/:id" element={<ProtectedRoute><EquipmentDetail /></ProtectedRoute>} />
                      <Route path="/equipment/:id/edit" element={<ProtectedRoute><EquipmentForm /></ProtectedRoute>} />
                      <Route path="/equipment/bulk-qr" element={<ProtectedRoute><BulkEquipmentQR /></ProtectedRoute>} />
                      <Route path="/interventions/:id" element={<ProtectedRoute><InterventionDetail /></ProtectedRoute>} />
                      <Route path="/maintenance-calendar" element={<ManagerRoute requiredPermission="manage_audits"><MaintenanceCalendar /></ManagerRoute>} />
                      <Route path="/admin/templates" element={<ManagerRoute requiredPermission="manage_audits"><AdminTemplates /></ManagerRoute>} />
                      <Route path="/admin/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><TemplateEditor /></ManagerRoute>} />
                      <Route path="/admin/template-library" element={<ManagerRoute requiredPermission="manage_audits"><TemplateLibrary /></ManagerRoute>} />
                      <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
                      <Route path="/admin/locations" element={<AdminRoute><LocationsManagement /></AdminRoute>} />
                      <Route path="/admin/locations/sales" element={<ManagerRoute requiredPermission="manage_employees"><SalesManagement /></ManagerRoute>} />
                      <Route path="/admin/employees" element={<ManagerRoute requiredPermission="manage_employees"><EmployeeManagement /></ManagerRoute>} />
                      <Route path="/admin/platform" element={<AdminRoute><PlatformAdmin /></AdminRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/notifications" element={<ManagerRoute requiredPermission="view_reports"><Notifications /></ManagerRoute>} />
                      <Route path="/notification-templates" element={<ManagerRoute requiredPermission="manage_notifications"><NotificationTemplates /></ManagerRoute>} />
                      <Route path="/recurring-notifications" element={<ManagerRoute requiredPermission="manage_notifications"><RecurringNotifications /></ManagerRoute>} />
                      <Route path="/notification-audit-logs" element={<ManagerRoute requiredPermission="manage_notifications"><NotificationAuditLogs /></ManagerRoute>} />
                      <Route path="/notification-analytics" element={<ManagerRoute requiredPermission="manage_notifications"><NotificationAnalytics /></ManagerRoute>} />
                      <Route path="/admin/debug" element={<AdminRoute><DebugInfo /></AdminRoute>} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/photos" element={<ManagerRoute requiredPermission="manage_audits"><PhotoGalleryPage /></ManagerRoute>} />
                      <Route path="/audit/:id/photos" element={<ProtectedRoute><PhotoGalleryPage /></ProtectedRoute>} />
                      <Route path="/documents" element={<ManagerRoute requiredPermission="manage_audits"><DocumentManagement /></ManagerRoute>} />
                      <Route path="/documents/:id" element={<ManagerRoute requiredPermission="manage_audits"><DocumentDetail /></ManagerRoute>} />
                      {/* Waste Module Admin Routes */}
                      <Route path="/admin/waste/add" element={<ManagerRoute requiredPermission="manage_audits"><AdminAddWasteEntry /></ManagerRoute>} />
                      <Route path="/admin/waste/entries" element={<ManagerRoute requiredPermission="manage_audits"><AdminWasteEntries /></ManagerRoute>} />
                      <Route path="/admin/waste/products" element={<ManagerRoute requiredPermission="manage_audits"><WasteProducts /></ManagerRoute>} />
                      <Route path="/admin/waste/reasons" element={<ManagerRoute requiredPermission="manage_audits"><WasteReasons /></ManagerRoute>} />
                      <Route path="/admin/waste/settings" element={<ManagerRoute requiredPermission="manage_audits"><WasteSettings /></ManagerRoute>} />
                      {/* Waste Reports */}
                      <Route path="/reports/waste" element={<ManagerRoute requiredPermission="view_reports"><WasteReports /></ManagerRoute>} />
                      <Route path="/test-creation" element={<ManagerRoute requiredPermission="manage_audits"><TestCreation /></ManagerRoute>} />
                      <Route path="/test-management" element={<ManagerRoute requiredPermission="manage_audits"><TestManagement /></ManagerRoute>} />
                      <Route path="/test-edit/:id" element={<ManagerRoute requiredPermission="manage_audits"><TestEdit /></ManagerRoute>} />
                      <Route path="/take-test/:id" element={<TakeTest />} />
                      <Route path="/t/:shortCode" element={<TakeTest />} />
                      <Route path="/test-result/:testId/:score/:passed" element={<TestResult />} />
                      <Route path="/test-result/:id" element={<TestResult />} />
                      <Route path="/audits-calendar" element={<ProtectedRoute><AuditsCalendar /></ProtectedRoute>} />
                      <Route path="/recurring-schedules" element={<ManagerRoute requiredPermission="manage_audits"><RecurringAuditSchedules /></ManagerRoute>} />
                      <Route path="/recurring-maintenance-schedules" element={<ManagerRoute requiredPermission="manage_audits"><RecurringMaintenanceSchedules /></ManagerRoute>} />
                      <Route path="/staff-audits" element={<ManagerRoute requiredPermission="manage_employees"><StaffAudits /></ManagerRoute>} />
                      <Route path="/staff-audits/all" element={<ManagerRoute requiredPermission="manage_employees"><StaffAuditsViewAll /></ManagerRoute>} />
                      <Route path="/staff-audits/:id" element={<ManagerRoute requiredPermission="manage_employees"><StaffAuditDetail /></ManagerRoute>} />
                      <Route path="/staff-audits/new" element={<ManagerRoute requiredPermission="manage_employees"><StaffAuditNew /></ManagerRoute>} />
                      <Route path="/manual-metrics" element={<ManagerRoute requiredPermission="manage_employees"><ManualMetrics /></ManagerRoute>} />
                      <Route path="/integrations" element={<AdminRoute><Integrations /></AdminRoute>} />
                      <Route path="/integrations/:integrationId" element={<AdminRoute><IntegrationDetail /></AdminRoute>} />
                      
                      {/* Workforce Module Routes */}
                      <Route path="/workforce" element={<ManagerRoute requiredPermission="manage_employees"><Workforce /></ManagerRoute>} />
                      <Route path="/workforce/staff" element={<ManagerRoute requiredPermission="manage_employees"><Staff /></ManagerRoute>} />
                      <Route path="/workforce/staff/:id" element={<ManagerRoute requiredPermission="manage_employees"><WorkforceStaffProfile /></ManagerRoute>} />
                      <Route path="/workforce/shifts" element={<ManagerRoute requiredPermission="manage_shifts"><Shifts /></ManagerRoute>} />
                      <Route path="/workforce/attendance" element={<ManagerRoute requiredPermission="manage_employees"><Attendance /></ManagerRoute>} />
                      <Route path="/workforce/time-off" element={<ManagerRoute requiredPermission="manage_employees"><TimeOffApprovals /></ManagerRoute>} />
                      <Route path="/workforce/payroll" element={<ManagerRoute requiredPermission="manage_employees"><Payroll /></ManagerRoute>} />
                      <Route path="/workforce/payroll-batches" element={<ManagerRoute requiredPermission="manage_employees"><PayrollBatches /></ManagerRoute>} />
                      <Route path="/workforce/badge-settings" element={<ManagerRoute requiredPermission="manage_employees"><BadgeSettings /></ManagerRoute>} />
                      <Route path="/workforce/performance/:employeeId" element={<ManagerRoute requiredPermission="manage_employees"><EmployeePerformance /></ManagerRoute>} />
                      <Route path="/workforce/sales" element={<ManagerRoute requiredPermission="manage_employees"><SalesManagement /></ManagerRoute>} />
                      <Route path="/workforce/attendance-alerts" element={<ManagerRoute requiredPermission="manage_employees"><AttendanceAlerts /></ManagerRoute>} />
                      <Route path="/workforce/scheduling-insights" element={<ManagerRoute requiredPermission="manage_shifts"><SchedulingInsights /></ManagerRoute>} />
                      <Route path="/workforce/warnings" element={<ManagerRoute requiredPermission="manage_employees"><Warnings /></ManagerRoute>} />
                      <Route path="/workforce/training" element={<ManagerRoute requiredPermission="manage_employees"><Training /></ManagerRoute>} />
                      <Route path="/workforce/training/modules/:id" element={<ManagerRoute requiredPermission="manage_employees"><TrainingModuleDetail /></ManagerRoute>} />
                      <Route path="/workforce/training/assignments/new" element={<ManagerRoute requiredPermission="manage_employees"><TrainingAssignmentNew /></ManagerRoute>} />
                      <Route path="/workforce/training/assignments/:id" element={<ManagerRoute requiredPermission="manage_employees"><TrainingAssignmentDetail /></ManagerRoute>} />
                      
                      {/* CMMS Routes */}
                      <Route path="/cmms" element={<ManagerRoute requiredPermission="manage_audits"><CmmsOverview /></ManagerRoute>} />
                      <Route path="/cmms/overview" element={<ManagerRoute requiredPermission="manage_audits"><CmmsOverview /></ManagerRoute>} />
                      <Route path="/cmms/dashboard" element={<ManagerRoute requiredPermission="manage_audits"><CmmsDashboard /></ManagerRoute>} />
                      <Route path="/cmms/assets" element={<ManagerRoute requiredPermission="manage_audits"><CmmsAssets /></ManagerRoute>} />
                      <Route path="/cmms/assets/:id" element={<ProtectedRoute><CmmsAssetDetail /></ProtectedRoute>} />
                      <Route path="/cmms/work-orders" element={<ProtectedRoute><CmmsWorkOrders /></ProtectedRoute>} />
                      <Route path="/cmms/preventive" element={<ManagerRoute requiredPermission="manage_audits"><CmmsPmSchedules /></ManagerRoute>} />
                      <Route path="/cmms/inventory" element={<ManagerRoute requiredPermission="manage_audits"><CmmsPartsInventory /></ManagerRoute>} />
                      <Route path="/cmms/vendors" element={<ManagerRoute requiredPermission="manage_audits"><CmmsVendors /></ManagerRoute>} />
                      <Route path="/cmms/teams" element={<ManagerRoute requiredPermission="manage_audits"><CmmsTeams /></ManagerRoute>} />
                      <Route path="/cmms/procedures" element={<ManagerRoute requiredPermission="manage_audits"><CmmsProcedures /></ManagerRoute>} />
                      <Route path="/cmms/procedures/:id" element={<ProtectedRoute><CmmsProcedureDetail /></ProtectedRoute>} />
                      <Route path="/cmms/purchase-orders" element={<ManagerRoute requiredPermission="manage_audits"><CmmsPurchaseOrders /></ManagerRoute>} />
                      <Route path="/cmms/reports" element={<ManagerRoute requiredPermission="manage_audits"><CmmsReporting /></ManagerRoute>} />
                      
                      {/* Inventory Routes */}
                      <Route path="/inventory" element={<ManagerRoute requiredPermission="manage_audits"><Inventory /></ManagerRoute>} />
                      
                      {/* Tasks Routes */}
                      <Route path="/tasks" element={<ManagerRoute requiredPermission="manage_audits"><Tasks /></ManagerRoute>} />
                      <Route path="/tasks/new" element={<ManagerRoute requiredPermission="manage_audits"><TaskNew /></ManagerRoute>} />
                      <Route path="/tasks/:id/edit" element={<ManagerRoute requiredPermission="manage_audits"><TaskEdit /></ManagerRoute>} />
                      <Route path="/tasks/calendar" element={<ManagerRoute requiredPermission="manage_audits"><TasksCalendar /></ManagerRoute>} />
                      <Route path="/evidence-review" element={<ProtectedRoute><EvidenceReview /></ProtectedRoute>} />
                      <Route path="/compliance-dossier" element={<ProtectedRoute><ComplianceDossier /></ProtectedRoute>} />
                      
                      {/* Insights/AI Routes */}
                      <Route path="/insights" element={<ManagerRoute requiredPermission="view_reports"><Insights /></ManagerRoute>} />
                      <Route path="/ai-feed" element={<ManagerRoute requiredPermission="view_reports"><AIFeed /></ManagerRoute>} />
                      
                      {/* Training Routes */}
                      <Route path="/training" element={<ManagerRoute requiredPermission="manage_audits"><TrainingPrograms /></ManagerRoute>} />
                      <Route path="/training/:id" element={<ProtectedRoute><TrainingProgramDetail /></ProtectedRoute>} />
                      
                      {/* Audits Routes */}
                      <Route path="/audits/templates" element={<ManagerRoute requiredPermission="manage_audits"><Templates /></ManagerRoute>} />
                      <Route path="/audits/templates/new" element={<ManagerRoute requiredPermission="manage_audits"><TemplateBuilder /></ManagerRoute>} />
                      <Route path="/audits/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><TemplateBuilder /></ManagerRoute>} />
                      <Route path="/audits/schedule" element={<ManagerRoute requiredPermission="manage_audits"><ScheduleAudit /></ManagerRoute>} />
                      <Route path="/audits/perform/:id" element={<ProtectedRoute><PerformAudit /></ProtectedRoute>} />
                      <Route path="/audits/report/:id" element={<ProtectedRoute><AuditReport /></ProtectedRoute>} />
                      <Route path="/audits/list" element={<ProtectedRoute><AuditsList /></ProtectedRoute>} />
                      
                      {/* Mystery Shopper Routes */}
                      <Route path="/mystery-shopper/:token" element={<MysteryShopperForm />} />
                      <Route path="/voucher/:code" element={<VoucherPage />} />
                      <Route path="/audits/mystery-shopper" element={<ManagerRoute requiredPermission="manage_audits"><MysteryShopperTemplates /></ManagerRoute>} />
                      <Route path="/audits/mystery-shopper/new" element={<ManagerRoute requiredPermission="manage_audits"><MysteryShopperTemplateEditor /></ManagerRoute>} />
                      <Route path="/audits/mystery-shopper/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><MysteryShopperTemplateEditor /></ManagerRoute>} />
                      <Route path="/audits/mystery-shopper/results" element={<ManagerRoute requiredPermission="manage_audits"><MysteryShopperResults /></ManagerRoute>} />
                      <Route path="/audits/vouchers" element={<ManagerRoute requiredPermission="manage_audits"><VouchersManagement /></ManagerRoute>} />
                      
                      {/* Template Marketplace Routes */}
                      <Route path="/marketplace" element={<ProtectedRoute><MarketplaceBrowse /></ProtectedRoute>} />
                      <Route path="/marketplace/:id" element={<ProtectedRoute><MarketplaceTemplateDetail /></ProtectedRoute>} />
                      <Route path="/marketplace/share/:token" element={<MarketplaceShare />} />
                      <Route path="/marketplace/publish" element={<ProtectedRoute><MarketplacePublish /></ProtectedRoute>} />
                      <Route path="/marketplace/my-templates" element={<ProtectedRoute><MyMarketplaceTemplates /></ProtectedRoute>} />
                      
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      
                      {/* QR Forms Module Routes */}
                      <Route path="/admin/qr-forms/templates" element={<ManagerRoute requiredPermission="manage_audits"><QrFormTemplates /></ManagerRoute>} />
                      <Route path="/admin/qr-forms/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><QrFormTemplateEditor /></ManagerRoute>} />
                      <Route path="/admin/qr-forms/assignments" element={<ManagerRoute requiredPermission="manage_audits"><QrFormAssignments /></ManagerRoute>} />
                      <Route path="/admin/qr-forms/records" element={<ManagerRoute requiredPermission="manage_audits"><QrFormRecords /></ManagerRoute>} />
                      
                      {/* System Health - Internal Diagnostics */}
                      <Route path="/system-health" element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />
                      <Route path="/debug/system-health" element={<AdminRoute><SystemHealthData /></AdminRoute>} />
                      
                      {/* Agent Admin Routes */}
                      <Route path="/admin/agents" element={<AdminRoute><AgentsDashboard /></AdminRoute>} />
                      <Route path="/admin/agents/policies" element={<AdminRoute><AgentPolicies /></AdminRoute>} />
                      <Route path="/admin/agents/logs" element={<AdminRoute><AgentLogs /></AdminRoute>} />
                      <Route path="/admin/agents/workflows" element={<AdminRoute><AgentWorkflows /></AdminRoute>} />
                      <Route path="/admin/agents/workflows/:id" element={<AdminRoute><AgentWorkflows /></AdminRoute>} />
                      <Route path="/admin/agents/run" element={<AdminRoute><RunAgent /></AdminRoute>} />
                      
                      {/* Operations Agent Routes */}
                       <Route path="/operations/daily" element={<ManagerRoute requiredPermission="manage_audits"><DailyOps /></ManagerRoute>} />
                       <Route path="/operations/daily/:id" element={<ManagerRoute requiredPermission="manage_audits"><DailyOpsDetail /></ManagerRoute>} />
                       <Route path="/operations/maintenance" element={<ManagerRoute requiredPermission="manage_audits"><MaintenanceTasks /></ManagerRoute>} />
                       <Route path="/operations/slas" element={<ManagerRoute requiredPermission="manage_audits"><SLAManagement /></ManagerRoute>} />
                       
                       {/* Corrective Actions (CAPA-lite) Routes */}
                       <Route path="/corrective-actions" element={<ManagerRoute requiredPermission="manage_audits"><CorrectiveActionsList /></ManagerRoute>} />
                       <Route path="/corrective-actions/rules" element={<ManagerRoute requiredPermission="manage_audits"><CorrectiveActionRules /></ManagerRoute>} />
                       
                       {/* WhatsApp Messaging Routes */}
                       <Route path="/whatsapp-templates" element={<ManagerRoute requiredPermission="manage_notifications"><WhatsAppTemplates /></ManagerRoute>} />
                       <Route path="/whatsapp-rules" element={<ManagerRoute requiredPermission="manage_notifications"><WhatsAppRules /></ManagerRoute>} />
                       <Route path="/whatsapp-broadcast" element={<ManagerRoute requiredPermission="manage_notifications"><WhatsAppBroadcast /></ManagerRoute>} />
                       <Route path="/whatsapp-logs" element={<ManagerRoute requiredPermission="manage_notifications"><WhatsAppLogs /></ManagerRoute>} />
                       <Route path="/corrective-actions/:id" element={<ManagerRoute requiredPermission="manage_audits"><CorrectiveActionDetail /></ManagerRoute>} />
                      
                      {/* Workforce Agent Routes */}
                      <Route path="/workforce/payroll-batches" element={<ManagerRoute requiredPermission="manage_employees"><PayrollBatches /></ManagerRoute>} />
                      <Route path="/workforce/attendance-alerts" element={<ManagerRoute requiredPermission="manage_employees"><AttendanceAlerts /></ManagerRoute>} />
                       <Route path="/workforce/scheduling-insights" element={<ManagerRoute requiredPermission="manage_shifts"><SchedulingInsights /></ManagerRoute>} />
                       
                       {/* Scouts Module Routes */}
                       <Route path="/scouts" element={<ManagerRoute requiredPermission="manage_audits"><ScoutsOverview /></ManagerRoute>} />
                       <Route path="/scouts/jobs" element={<ManagerRoute requiredPermission="manage_audits"><ScoutsJobs /></ManagerRoute>} />
                       <Route path="/scouts/jobs/new" element={<ManagerRoute requiredPermission="manage_audits"><ScoutsJobNew /></ManagerRoute>} />
                       <Route path="/scouts/review" element={<ManagerRoute requiredPermission="manage_audits"><ScoutsReview /></ManagerRoute>} />
                       <Route path="/scouts/templates" element={<ManagerRoute requiredPermission="manage_audits"><ScoutsTemplates /></ManagerRoute>} />
                       <Route path="/scouts/jobs/:id" element={<ManagerRoute requiredPermission="manage_audits"><ScoutsJobDetail /></ManagerRoute>} />
                       <Route path="/scouts/payouts" element={<ManagerRoute requiredPermission="manage_audits"><ScoutsPayouts /></ManagerRoute>} />
                       <Route path="/scouts/roster" element={<ManagerRoute requiredPermission="manage_audits"><ScoutsRoster /></ManagerRoute>} />
                       
                       <Route path="*" element={<NotFound />} />
                    </Routes>
                  </SidebarProvider>
                </CompanyProvider>
              </AuthProvider>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;