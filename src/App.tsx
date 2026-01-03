import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ManagerRoute } from "@/components/ManagerRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppVisibilityManager } from "@/components/AppVisibilityManager";
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
import SalesManagement from "./pages/workforce/SalesManagement";
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
import StaffEmployeeAudit from "./pages/staff/StaffEmployeeAudit";
import StaffStaffAudit from "./pages/staff/StaffStaffAudit";
import StaffPerformanceReview from "./pages/staff/StaffPerformanceReview";
import TeamView from "./pages/staff/TeamView";
import Tasks from "./pages/Tasks";
import TaskNew from "./pages/TaskNew";
import TaskEdit from "./pages/TaskEdit";
import TasksCalendar from "./pages/TasksCalendar";
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
import StaffDocuments from "./pages/staff/StaffDocuments";
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
            <AppVisibilityManager />
            <CompanyProvider>
              <SidebarProvider>
              <PWAInstallPrompt />
              <Routes>
              <Route path="/" element={<Index />} />
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
              <Route path="/staff/location-audit" element={<ProtectedRoute><StaffLocationAudit /></ProtectedRoute>} />
              <Route path="/staff/employee-audit" element={<ProtectedRoute><StaffEmployeeAudit /></ProtectedRoute>} />
              <Route path="/staff/staff-audit" element={<ProtectedRoute><StaffStaffAudit /></ProtectedRoute>} />
              <Route path="/staff/performance-review" element={<ProtectedRoute><StaffPerformanceReview /></ProtectedRoute>} />
              <Route path="/staff/documents" element={<ProtectedRoute><StaffDocuments /></ProtectedRoute>} />
              {/* Legacy route - redirect to new path */}
              <Route path="/staff-dashboard" element={<ProtectedRoute><StaffHome /></ProtectedRoute>} />
              <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
              <Route path="/onboarding/company" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />
              <Route path="/onboarding/modules" element={<ProtectedRoute><ModuleSelection /></ProtectedRoute>} />
              <Route path="/settings/company" element={<CompanyAdminRoute><CompanySettings /></CompanyAdminRoute>} />
              <Route path="/pricing" element={<CompanyOwnerRoute><PricingPlans /></CompanyOwnerRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/audits" element={<ProtectedRoute><Audits /></ProtectedRoute>} />
              <Route path="/audits/:id" element={<ProtectedRoute><AuditDetail /></ProtectedRoute>} />
              <Route path="/audit-summary/:id" element={<ProtectedRoute><AuditSummary /></ProtectedRoute>} />
              
              {/* New Audit System Routes */}
              <Route path="/audits/templates" element={<ManagerRoute requiredPermission="manage_audits"><Templates /></ManagerRoute>} />
              <Route path="/audits/templates/new" element={<ManagerRoute requiredPermission="manage_audits"><TemplateBuilder /></ManagerRoute>} />
              <Route path="/audits/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><TemplateBuilder /></ManagerRoute>} />
              <Route path="/audits/schedule" element={<ManagerRoute requiredPermission="manage_audits"><ScheduleAudit /></ManagerRoute>} />
              <Route path="/audits/perform/:id" element={<ProtectedRoute><PerformAudit /></ProtectedRoute>} />
              <Route path="/audits/report/:id" element={<ProtectedRoute><AuditReport /></ProtectedRoute>} />
              <Route path="/audits/list" element={<ProtectedRoute><AuditsList /></ProtectedRoute>} />
              
              {/* Mystery Shopper Routes */}
              <Route path="/audits/mystery-shopper" element={<ManagerRoute requiredPermission="manage_audits"><MysteryShopperTemplates /></ManagerRoute>} />
              <Route path="/audits/mystery-shopper/new" element={<ManagerRoute requiredPermission="manage_audits"><MysteryShopperTemplateEditor /></ManagerRoute>} />
              <Route path="/audits/mystery-shopper/:templateId" element={<ManagerRoute requiredPermission="manage_audits"><MysteryShopperTemplateEditor /></ManagerRoute>} />
              <Route path="/audits/mystery-shopper-results" element={<ManagerRoute requiredPermission="manage_audits"><MysteryShopperResults /></ManagerRoute>} />
              <Route path="/audits/vouchers" element={<ManagerRoute requiredPermission="manage_audits"><VouchersManagement /></ManagerRoute>} />
              
              {/* Public Mystery Shopper Routes (no auth required) */}
              <Route path="/mystery/:token" element={<MysteryShopperForm />} />
              <Route path="/voucher/:code" element={<VoucherPage />} />
              
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
              <Route path="/notifications" element={<ManagerRoute requiredPermission="manage_notifications"><Notifications /></ManagerRoute>} />
              <Route path="/notification-templates" element={<ManagerRoute requiredPermission="manage_notifications"><NotificationTemplates /></ManagerRoute>} />
              <Route path="/notification-audit-logs" element={<ManagerRoute requiredPermission="manage_notifications"><NotificationAuditLogs /></ManagerRoute>} />
              <Route path="/notification-analytics" element={<ManagerRoute requiredPermission="manage_notifications"><NotificationAnalytics /></ManagerRoute>} />
              <Route path="/recurring-notifications" element={<ManagerRoute requiredPermission="manage_notifications"><RecurringNotifications /></ManagerRoute>} />
              <Route path="/photos" element={<ProtectedRoute><PhotoGalleryPage /></ProtectedRoute>} />
              <Route path="/documents" element={<ManagerRoute requiredPermission="view_reports"><DocumentManagement /></ManagerRoute>} />
              <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetail /></ProtectedRoute>} />
              <Route path="/training" element={<ProtectedRoute><TrainingPrograms /></ProtectedRoute>} />
              <Route path="/training/:id" element={<ProtectedRoute><TrainingProgramDetail /></ProtectedRoute>} />
              <Route path="/test-creation" element={<ManagerRoute requiredPermission="manage_employees"><TestCreation /></ManagerRoute>} />
              <Route path="/test-management" element={<ManagerRoute requiredPermission="manage_employees"><TestManagement /></ManagerRoute>} />
              <Route path="/test-edit/:id" element={<ManagerRoute requiredPermission="manage_employees"><TestEdit /></ManagerRoute>} />
              <Route path="/take-test/:testId" element={<TakeTest />} />
              <Route path="/t/:shortCode" element={<TakeTest />} />
              <Route path="/test-result/:testId/:score/:passed" element={<TestResult />} />
              <Route path="/admin/locations" element={<ManagerRoute requiredPermission="manage_locations"><LocationsManagement /></ManagerRoute>} />
              <Route path="/audits-calendar" element={<ProtectedRoute><AuditsCalendar /></ProtectedRoute>} />
              <Route path="/recurring-schedules" element={<ManagerRoute requiredPermission="manage_audits"><RecurringAuditSchedules /></ManagerRoute>} />
              <Route path="/staff-audits" element={<ProtectedRoute><StaffAudits /></ProtectedRoute>} />
              <Route path="/staff-audits/all" element={<ProtectedRoute><StaffAuditsViewAll /></ProtectedRoute>} />
              <Route path="/staff-audits/:id" element={<ProtectedRoute><StaffAuditDetail /></ProtectedRoute>} />
              <Route path="/staff-audit/new" element={<ProtectedRoute><StaffAuditNew /></ProtectedRoute>} />
              <Route path="/manual-metrics" element={<ManagerRoute requiredPermission="view_reports"><ManualMetrics /></ManagerRoute>} />
              <Route path="/equipment" element={<ManagerRoute requiredPermission="manage_audits"><EquipmentList /></ManagerRoute>} />
              <Route path="/equipment/bulk-qr" element={<ManagerRoute requiredPermission="manage_audits"><BulkEquipmentQR /></ManagerRoute>} />
              <Route path="/equipment/new" element={<ManagerRoute requiredPermission="manage_audits"><EquipmentForm /></ManagerRoute>} />
              <Route path="/equipment/:id" element={<EquipmentDetail />} />
              <Route path="/equipment/:id/edit" element={<ManagerRoute requiredPermission="manage_audits"><EquipmentForm /></ManagerRoute>} />
              <Route path="/interventions/:id" element={<ProtectedRoute><InterventionDetail /></ProtectedRoute>} />
              <Route path="/maintenance-calendar" element={<ManagerRoute requiredPermission="manage_audits"><MaintenanceCalendar /></ManagerRoute>} />
              <Route path="/recurring-maintenance" element={<ManagerRoute requiredPermission="manage_audits"><RecurringMaintenanceSchedules /></ManagerRoute>} />
              
              {/* CMMS Industrial Routes */}
              <Route path="/cmms" element={<ManagerRoute requiredPermission="manage_audits"><CmmsDashboard /></ManagerRoute>} />
              <Route path="/cmms/overview" element={<ManagerRoute requiredPermission="manage_audits"><CmmsOverview /></ManagerRoute>} />
              <Route path="/cmms/work-orders" element={<ManagerRoute requiredPermission="manage_audits"><CmmsWorkOrders /></ManagerRoute>} />
              <Route path="/cmms/assets" element={<ManagerRoute requiredPermission="manage_audits"><CmmsAssets /></ManagerRoute>} />
              <Route path="/cmms/assets/:id" element={<ManagerRoute requiredPermission="manage_audits"><CmmsAssetDetail /></ManagerRoute>} />
              <Route path="/cmms/procedures" element={<ManagerRoute requiredPermission="manage_audits"><CmmsProcedures /></ManagerRoute>} />
              <Route path="/cmms/procedures/:id" element={<ManagerRoute requiredPermission="manage_audits"><CmmsProcedureDetail /></ManagerRoute>} />
              <Route path="/cmms/pm-schedules" element={<ManagerRoute requiredPermission="manage_audits"><CmmsPmSchedules /></ManagerRoute>} />
              <Route path="/cmms/parts" element={<ManagerRoute requiredPermission="manage_audits"><CmmsPartsInventory /></ManagerRoute>} />
              <Route path="/cmms/purchase-orders" element={<ManagerRoute requiredPermission="manage_audits"><CmmsPurchaseOrders /></ManagerRoute>} />
              <Route path="/cmms/vendors" element={<ManagerRoute requiredPermission="manage_audits"><CmmsVendors /></ManagerRoute>} />
              <Route path="/cmms/teams" element={<ManagerRoute requiredPermission="manage_audits"><CmmsTeams /></ManagerRoute>} />
              <Route path="/cmms/reports" element={<ManagerRoute requiredPermission="manage_audits"><CmmsReporting /></ManagerRoute>} />
              
              {/* Workforce Routes */}
              <Route path="/workforce" element={<ProtectedRoute><Workforce /></ProtectedRoute>} />
              <Route path="/workforce/staff" element={<ManagerRoute requiredPermission="manage_employees"><EmployeeManagement /></ManagerRoute>} />
              <Route path="/workforce/staff/:id" element={<ProtectedRoute><WorkforceStaffProfile /></ProtectedRoute>} />
              <Route path="/workforce/shifts" element={<ProtectedRoute><Shifts /></ProtectedRoute>} />
              <Route path="/workforce/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="/workforce/time-off" element={<ProtectedRoute><TimeOffApprovals /></ProtectedRoute>} />
              <Route path="/workforce/payroll" element={<ManagerRoute requiredPermission="manage_employees"><Payroll /></ManagerRoute>} />
              <Route path="/admin/locations/sales" element={<ManagerRoute requiredPermission="manage_employees"><SalesManagement /></ManagerRoute>} />
              <Route path="/workforce/performance" element={<ManagerRoute requiredPermission="manage_employees"><EmployeePerformance /></ManagerRoute>} />
              
              {/* Tasks Routes */}
              <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/tasks/new" element={<ProtectedRoute><TaskNew /></ProtectedRoute>} />
              <Route path="/tasks/edit/:id" element={<ProtectedRoute><TaskEdit /></ProtectedRoute>} />
              <Route path="/tasks/calendar" element={<ProtectedRoute><TasksCalendar /></ProtectedRoute>} />
              
              {/* Inventory Routes */}
              <Route path="/inventory" element={<ManagerRoute requiredPermission="manage_audits"><Inventory /></ManagerRoute>} />
              
              {/* Insights Routes */}
              <Route path="/insights" element={<ManagerRoute requiredPermission="view_reports"><Insights /></ManagerRoute>} />
              <Route path="/ai-feed" element={<ManagerRoute requiredPermission="view_reports"><AIFeed /></ManagerRoute>} />
              
              {/* Integrations Routes */}
              <Route path="/integrations" element={<ManagerRoute><Integrations /></ManagerRoute>} />
              <Route path="/integrations/:id" element={<ManagerRoute><IntegrationDetail /></ManagerRoute>} />
              
              {/* Marketplace Routes */}
              <Route path="/marketplace" element={<ProtectedRoute><MarketplaceBrowse /></ProtectedRoute>} />
              <Route path="/marketplace/template/:slug" element={<ProtectedRoute><MarketplaceTemplateDetail /></ProtectedRoute>} />
              <Route path="/marketplace/share/:token" element={<MarketplaceShare />} />
              <Route path="/marketplace/publish" element={<ProtectedRoute><MarketplacePublish /></ProtectedRoute>} />
              <Route path="/marketplace/my-templates" element={<ProtectedRoute><MyMarketplaceTemplates /></ProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              
              {/* Attendance Kiosk - Public route for displaying QR codes */}
              <Route path="/kiosk/:token" element={<AttendanceKiosk />} />
              
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
              
              {/* Workforce Agent Routes */}
              <Route path="/workforce/payroll-batches" element={<ManagerRoute requiredPermission="manage_employees"><PayrollBatches /></ManagerRoute>} />
              <Route path="/workforce/attendance-alerts" element={<ManagerRoute requiredPermission="manage_employees"><AttendanceAlerts /></ManagerRoute>} />
              <Route path="/workforce/scheduling-insights" element={<ManagerRoute requiredPermission="manage_shifts"><SchedulingInsights /></ManagerRoute>} />
              
              {/* Company Admin Routes */}
              <Route path="/company/admin" element={<CompanyAdminRoute><CompanySettings /></CompanyAdminRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
              </SidebarProvider>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;