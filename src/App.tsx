import { lazy, Suspense } from "react";
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
import { PlatformAdminRoute } from "@/components/PlatformAdminRoute";
import { ManagerRoute } from "@/components/ManagerRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdateReadyToast } from "@/components/PWAUpdateReadyToast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { ModuleGate } from "@/components/ModuleGate";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppVisibilityManager } from "@/components/AppVisibilityManager";
import { LazyLoadFallback } from "@/components/LazyLoadFallback";
import { useIsScoutsDomain } from "@/hooks/useIsScoutsDomain";
import { CompanyAdminRoute } from "./components/CompanyAdminRoute";
import { CompanyOwnerRoute } from "./components/CompanyOwnerRoute";

// Eager: Scout portal (separate domain app shell)
import ScoutPortalApp from "./pages/scout-portal/ScoutPortalApp";

// === Lazy-loaded pages ===

// Public / Auth
const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing"));
const LandingNFX = lazy(() => import("./pages/LandingNFX"));
const FullPresentation = lazy(() => import("./pages/FullPresentation"));
const SalesOffer = lazy(() => import("./pages/SalesOffer"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const MobileCommand = lazy(() => import("./pages/MobileCommand"));

// Core app pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationTemplates = lazy(() => import("./pages/NotificationTemplates"));
const NotificationAuditLogs = lazy(() => import("./pages/NotificationAuditLogs"));
const NotificationAnalytics = lazy(() => import("./pages/NotificationAnalytics"));
const RecurringNotifications = lazy(() => import("./pages/RecurringNotifications"));
const PhotoGalleryPage = lazy(() => import("./pages/PhotoGalleryPage"));
const DocumentManagement = lazy(() => import("./pages/DocumentManagement"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Insights = lazy(() => import("./pages/Insights"));
const AIFeed = lazy(() => import("./pages/AIFeed"));
const Integrations = lazy(() => import("./pages/Integrations"));
const IntegrationDetail = lazy(() => import("./pages/IntegrationDetail"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));
const RoleTemplates = lazy(() => import("./pages/RoleTemplates"));
const PolicyRules = lazy(() => import("./pages/PolicyRules"));
const EvidenceReview = lazy(() => import("./pages/EvidenceReview"));
const ComplianceDossier = lazy(() => import("./pages/ComplianceDossier"));
const EmployeeDossier = lazy(() => import("./pages/EmployeeDossier"));

// Onboarding / Company settings
const CompanyOnboarding = lazy(() => import("./pages/CompanyOnboarding"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const ModuleSelection = lazy(() => import("./pages/ModuleSelection"));
const PricingPlans = lazy(() => import("./pages/PricingPlans"));
const TerminologySettings = lazy(() => import("./pages/settings/TerminologySettings"));
const ApprovalQueue = lazy(() => import("./pages/ApprovalQueue"));
const ApprovalWorkflowsPage = lazy(() => import("./pages/settings/ApprovalWorkflows"));

// Audits
const Audits = lazy(() => import("./pages/Audits"));
const AuditDetail = lazy(() => import("./pages/AuditDetail"));
const AuditSummary = lazy(() => import("./pages/AuditSummary"));
const AuditsCalendar = lazy(() => import("./pages/AuditsCalendar"));
const LocationAudit = lazy(() => import("./pages/LocationAudit"));
const RecurringAuditSchedules = lazy(() => import("./pages/RecurringAuditSchedules"));
const RecurringMaintenanceSchedules = lazy(() => import("./pages/RecurringMaintenanceSchedules"));
const AdminTemplates = lazy(() => import("./pages/AdminTemplates"));
const TemplateEditor = lazy(() => import("./pages/TemplateEditor"));
const TemplateLibrary = lazy(() => import("./pages/TemplateLibrary"));
const Templates = lazy(() => import("./pages/audits/Templates"));
const TemplateBuilder = lazy(() => import("./pages/audits/TemplateBuilder"));
const ScheduleAudit = lazy(() => import("./pages/audits/ScheduleAudit"));
const PerformAudit = lazy(() => import("./pages/audits/PerformAudit"));
const AuditReport = lazy(() => import("./pages/audits/AuditReport"));
const AuditsList = lazy(() => import("./pages/audits/AuditsList"));

// Staff Audits
const StaffAudits = lazy(() => import("./pages/StaffAudits"));
const StaffAuditsViewAll = lazy(() => import("./pages/StaffAuditsViewAll"));
const StaffAuditDetail = lazy(() => import("./pages/StaffAuditDetail"));
const StaffAuditNew = lazy(() => import("./pages/StaffAuditNew"));
const ManualMetrics = lazy(() => import("./pages/ManualMetrics"));

// Equipment / CMMS
const EquipmentList = lazy(() => import("./pages/EquipmentList"));
const EquipmentForm = lazy(() => import("./pages/EquipmentForm"));
const EquipmentDetail = lazy(() => import("./pages/EquipmentDetail"));
const BulkEquipmentQR = lazy(() => import("./pages/BulkEquipmentQR"));
const InterventionDetail = lazy(() => import("./pages/InterventionDetail"));
const MaintenanceCalendar = lazy(() => import("./pages/MaintenanceCalendar"));
const CmmsWorkOrders = lazy(() => import("./pages/cmms/WorkOrders"));
const CmmsAssets = lazy(() => import("./pages/cmms/Assets"));
const CmmsAssetDetail = lazy(() => import("./pages/cmms/AssetDetail"));
const CmmsProcedures = lazy(() => import("./pages/cmms/Procedures"));
const CmmsProcedureDetail = lazy(() => import("./pages/cmms/ProcedureDetail"));
const CmmsPmSchedules = lazy(() => import("./pages/cmms/PmSchedules"));
const CmmsPartsInventory = lazy(() => import("./pages/cmms/PartsInventory"));
const CmmsPurchaseOrders = lazy(() => import("./pages/cmms/PurchaseOrders"));
const CmmsVendors = lazy(() => import("./pages/cmms/Vendors"));
const CmmsTeams = lazy(() => import("./pages/cmms/Teams"));
const CmmsDashboard = lazy(() => import("./pages/cmms/CmmsDashboard"));
const CmmsReporting = lazy(() => import("./pages/cmms/CmmsReporting"));
const CmmsOverview = lazy(() => import("./pages/cmms/CmmsOverview"));

// Workforce
const Workforce = lazy(() => import("./pages/Workforce"));
const Staff = lazy(() => import("./pages/workforce/Staff"));
const WorkforceStaffProfile = lazy(() => import("./pages/workforce/StaffProfile"));
const Shifts = lazy(() => import("./pages/workforce/Shifts"));
const Attendance = lazy(() => import("./pages/workforce/Attendance"));
const TimeOffApprovals = lazy(() => import("./pages/workforce/TimeOffApprovals"));
const Payroll = lazy(() => import("./pages/workforce/Payroll"));
const PayrollBatches = lazy(() => import("./pages/workforce/PayrollBatches"));
const EmployeePerformance = lazy(() => import("./pages/workforce/EmployeePerformance"));
const BadgeSettings = lazy(() => import("./pages/workforce/BadgeSettings"));
const SalesManagement = lazy(() => import("./pages/workforce/SalesManagement"));
const Training = lazy(() => import("./pages/workforce/Training"));
const TrainingModuleDetail = lazy(() => import("./pages/workforce/TrainingModuleDetail"));
const TrainingAssignmentNew = lazy(() => import("./pages/workforce/TrainingAssignmentNew"));
const TrainingAssignmentDetail = lazy(() => import("./pages/workforce/TrainingAssignmentDetail"));
const AttendanceAlerts = lazy(() => import("./pages/workforce/AttendanceAlerts"));
const SchedulingInsights = lazy(() => import("./pages/workforce/SchedulingInsights"));
const Warnings = lazy(() => import("./pages/workforce/Warnings"));
const EmployeeManagement = lazy(() => import("./pages/EmployeeManagement"));
const LocationsManagement = lazy(() => import("./pages/LocationsManagement"));
const UserManagement = lazy(() => import("./pages/UserManagement"));

// Staff portal
const StaffHome = lazy(() => import("./pages/staff/StaffHome"));
const StaffSchedule = lazy(() => import("./pages/staff/StaffSchedule"));
const StaffShifts = lazy(() => import("./pages/staff/StaffShifts"));
const StaffShiftPool = lazy(() => import("./pages/staff/StaffShiftPool"));
const StaffSwapRequests = lazy(() => import("./pages/staff/StaffSwapRequests"));
const StaffTimeOff = lazy(() => import("./pages/staff/StaffTimeOff"));
const StaffProfile = lazy(() => import("./pages/staff/StaffProfile"));
const StaffMessages = lazy(() => import("./pages/staff/StaffMessages"));
const StaffEarnings = lazy(() => import("./pages/staff/StaffEarnings"));
const StaffTasks = lazy(() => import("./pages/staff/StaffTasks"));
const ManagerSchedule = lazy(() => import("./pages/staff/ManagerSchedule"));
const StaffLocationAudit = lazy(() => import("./pages/staff/StaffLocationAudit"));
const StaffLocationAudits = lazy(() => import("./pages/staff/StaffLocationAudits"));
const StaffLocationAuditDetail = lazy(() => import("./pages/staff/StaffLocationAuditDetail"));
const StaffEmployeeAudit = lazy(() => import("./pages/staff/StaffEmployeeAudit"));
const StaffStaffAudit = lazy(() => import("./pages/staff/StaffStaffAudit"));
const StaffPerformanceReview = lazy(() => import("./pages/staff/StaffPerformanceReview"));
const StaffWarnings = lazy(() => import("./pages/staff/StaffWarnings"));
const TeamView = lazy(() => import("./pages/staff/TeamView"));
const StaffCheckpoints = lazy(() => import("./pages/staff/StaffCheckpoints"));
const StaffScoreBreakdown = lazy(() => import("./pages/staff/StaffScoreBreakdown"));
const StaffDocuments = lazy(() => import("./pages/staff/StaffDocuments"));
const StaffScanAttendance = lazy(() => import("./pages/staff/StaffScanAttendance"));
const StaffScanVoucher = lazy(() => import("./pages/staff/StaffScanVoucher"));
const AddWasteEntry = lazy(() => import("./pages/staff/AddWasteEntry"));
const MyWasteEntries = lazy(() => import("./pages/staff/MyWasteEntries"));

// Tasks
const Tasks = lazy(() => import("./pages/Tasks"));
const TaskNew = lazy(() => import("./pages/TaskNew"));
const TaskEdit = lazy(() => import("./pages/TaskEdit"));
const TasksCalendar = lazy(() => import("./pages/TasksCalendar"));

// Tests
const TestCreation = lazy(() => import("./pages/TestCreation"));
const TestManagement = lazy(() => import("./pages/TestManagement"));
const TestEdit = lazy(() => import("./pages/TestEdit"));
const TakeTest = lazy(() => import("./pages/TakeTest"));
const TestResult = lazy(() => import("./pages/TestResult"));

// Documents & Training
const DocumentDetail = lazy(() => import("./pages/documents/DocumentDetail"));
const TrainingPrograms = lazy(() => import("./pages/training/TrainingPrograms"));
const TrainingProgramDetail = lazy(() => import("./pages/training/TrainingProgramDetail"));

// Marketplace
const MarketplaceBrowse = lazy(() => import("./pages/marketplace/MarketplaceBrowse"));
const MarketplaceTemplateDetail = lazy(() => import("./pages/marketplace/MarketplaceTemplateDetail"));
const MarketplacePublish = lazy(() => import("./pages/marketplace/MarketplacePublish"));
const MyMarketplaceTemplates = lazy(() => import("./pages/marketplace/MyMarketplaceTemplates"));
const MarketplaceShare = lazy(() => import("./pages/marketplace/MarketplaceShare"));

// Mystery Shopper
const MysteryShopperForm = lazy(() => import("./pages/mystery-shopper/MysteryShopperForm"));
const VoucherPage = lazy(() => import("./pages/mystery-shopper/VoucherPage"));
const MysteryShopperTemplates = lazy(() => import("./pages/audits/MysteryShopperTemplates"));
const MysteryShopperTemplateEditor = lazy(() => import("./pages/audits/MysteryShopperTemplateEditor"));
const MysteryShopperResults = lazy(() => import("./pages/audits/MysteryShopperResults"));
const VouchersManagement = lazy(() => import("./pages/audits/VouchersManagement"));

// QR Forms
const QrFormTemplates = lazy(() => import("./pages/qr-forms/QrFormTemplates"));
const QrFormTemplateEditor = lazy(() => import("./pages/qr-forms/QrFormTemplateEditor"));
const QrFormAssignments = lazy(() => import("./pages/qr-forms/QrFormAssignments"));
const QrFormRecords = lazy(() => import("./pages/qr-forms/QrFormRecords"));
const QrFormEntry = lazy(() => import("./pages/qr-forms/QrFormEntry"));
const QrFormInspectorView = lazy(() => import("./pages/qr-forms/QrFormInspectorView"));

// Operations
const DailyOps = lazy(() => import("./pages/operations/DailyOps"));
const DailyOpsDetail = lazy(() => import("./pages/operations/DailyOpsDetail"));
const MaintenanceTasks = lazy(() => import("./pages/operations/MaintenanceTasks"));
const SLAManagement = lazy(() => import("./pages/operations/SLAManagement"));

// Corrective Actions
const CorrectiveActionsList = lazy(() => import("./pages/correctiveActions/CorrectiveActionsList"));
const CorrectiveActionDetail = lazy(() => import("./pages/correctiveActions/CorrectiveActionDetail"));
const CorrectiveActionRules = lazy(() => import("./pages/correctiveActions/CorrectiveActionRules"));

// WhatsApp
const WhatsAppTemplates = lazy(() => import("./pages/WhatsAppTemplates"));
const WhatsAppRules = lazy(() => import("./pages/WhatsAppRules"));
const WhatsAppBroadcast = lazy(() => import("./pages/WhatsAppBroadcast"));
const WhatsAppLogs = lazy(() => import("./pages/WhatsAppLogs"));

// Scouts (admin)
const ScoutsOverview = lazy(() => import("./pages/scouts/ScoutsOverview"));
const ScoutsJobs = lazy(() => import("./pages/scouts/ScoutsJobs"));
const ScoutsJobNew = lazy(() => import("./pages/scouts/ScoutsJobNew"));
const ScoutsReview = lazy(() => import("./pages/scouts/ScoutsReview"));
const ScoutsTemplates = lazy(() => import("./pages/scouts/ScoutsTemplates"));
const ScoutsJobDetail = lazy(() => import("./pages/scouts/ScoutsJobDetail"));
const ScoutsPayouts = lazy(() => import("./pages/scouts/ScoutsPayouts"));
const ScoutsRoster = lazy(() => import("./pages/scouts/ScoutsRoster"));
const ScoutsAnalytics = lazy(() => import("./pages/scouts/ScoutsAnalytics"));

// Waste admin
const WasteProducts = lazy(() => import("./pages/admin/waste/WasteProducts"));
const WasteReasons = lazy(() => import("./pages/admin/waste/WasteReasons"));
const WasteSettings = lazy(() => import("./pages/admin/waste/WasteSettings"));
const AdminAddWasteEntry = lazy(() => import("./pages/admin/waste/AdminAddWasteEntry"));
const AdminWasteEntries = lazy(() => import("./pages/admin/waste/AdminWasteEntries"));
const WasteReports = lazy(() => import("./pages/reports/WasteReports"));

// Agent admin
const AgentsDashboard = lazy(() => import("./pages/admin/AgentsDashboard"));
const AgentPolicies = lazy(() => import("./pages/admin/AgentPolicies"));
const AgentLogs = lazy(() => import("./pages/admin/AgentLogs"));
const AgentWorkflows = lazy(() => import("./pages/admin/AgentWorkflows"));
const RunAgent = lazy(() => import("./pages/admin/RunAgent"));

// Platform admin
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
const CompanyDetail = lazy(() => import("./pages/admin/CompanyDetail"));
const DebugInfo = lazy(() => import("./pages/DebugInfo"));
const SystemHealthData = lazy(() => import("./pages/debug/SystemHealthData"));

// Dash
const DashWorkspace = lazy(() => import("./pages/DashWorkspace"));
const DashAnalytics = lazy(() => import("./pages/DashAnalytics"));

// Kiosk
const AttendanceKiosk = lazy(() => import("./pages/AttendanceKiosk"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const App = () => {
  const isScoutsDomain = useIsScoutsDomain();

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
          <Suspense fallback={<LazyLoadFallback />}>
            <Routes>
              {/* Public kiosk route */}
              <Route path="/kiosk/:token" element={<RouteErrorBoundary><AttendanceKiosk /></RouteErrorBoundary>} />
              
              {/* Public inspector view */}
              <Route path="/qr/inspect/:token" element={<RouteErrorBoundary><QrFormInspectorView /></RouteErrorBoundary>} />
              
              {/* QR Forms entry */}
              <Route path="/qr/forms/:token" element={
                <AuthProvider>
                  <RouteErrorBoundary><QrFormEntry /></RouteErrorBoundary>
                </AuthProvider>
              } />
              
              {/* All other routes */}
              <Route path="/*" element={
                <AuthProvider>
                  <AppVisibilityManager />
                  <CompanyProvider>
                    <SidebarProvider>
                      <PWAInstallPrompt />
                      <Routes>
                        <Route path="/" element={<RouteErrorBoundary><Index /></RouteErrorBoundary>} />
                        <Route path="/go" element={<RouteErrorBoundary><LandingNFX /></RouteErrorBoundary>} />
                        <Route path="/landing" element={<RouteErrorBoundary><LandingNFX /></RouteErrorBoundary>} />
                        <Route path="/full-presentation" element={<RouteErrorBoundary><FullPresentation /></RouteErrorBoundary>} />
                        <Route path="/full" element={<RouteErrorBoundary><FullPresentation /></RouteErrorBoundary>} />
                        <Route path="/sales-offer" element={<RouteErrorBoundary><SalesOffer /></RouteErrorBoundary>} />
                        <Route path="/auth" element={<RouteErrorBoundary><Auth /></RouteErrorBoundary>} />
                        <Route path="/forgot-password" element={<RouteErrorBoundary><ForgotPassword /></RouteErrorBoundary>} />
                        <Route path="/reset-password" element={<RouteErrorBoundary><ResetPassword /></RouteErrorBoundary>} />
                        <Route path="/staff-login" element={<RouteErrorBoundary><StaffLogin /></RouteErrorBoundary>} />
                        
                        {/* Staff portal */}
                        <Route path="/staff" element={<ProtectedRoute><RouteErrorBoundary><StaffHome /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/schedule" element={<ProtectedRoute><RouteErrorBoundary><StaffSchedule /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/manager-schedule" element={<ProtectedRoute><RouteErrorBoundary><ManagerSchedule /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/shifts" element={<ProtectedRoute><RouteErrorBoundary><StaffShifts /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/shift-pool" element={<ProtectedRoute><RouteErrorBoundary><StaffShiftPool /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/swap-requests" element={<ProtectedRoute><RouteErrorBoundary><StaffSwapRequests /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/time-off" element={<ProtectedRoute><RouteErrorBoundary><StaffTimeOff /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/messages" element={<ProtectedRoute><RouteErrorBoundary><StaffMessages /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/earnings" element={<ProtectedRoute><RouteErrorBoundary><StaffEarnings /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/tasks" element={<ProtectedRoute><RouteErrorBoundary><StaffTasks /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/profile" element={<ProtectedRoute><RouteErrorBoundary><StaffProfile /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/team" element={<ProtectedRoute><RouteErrorBoundary><TeamView /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/scan-attendance" element={<ProtectedRoute><RouteErrorBoundary><StaffScanAttendance /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/scan-voucher" element={<ProtectedRoute><RouteErrorBoundary><StaffScanVoucher /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/checkpoints" element={<ProtectedRoute><RouteErrorBoundary><StaffCheckpoints /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/audits" element={<ProtectedRoute><RouteErrorBoundary><StaffLocationAudits /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/audits/:id" element={<ProtectedRoute><RouteErrorBoundary><StaffLocationAuditDetail /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/location-audit" element={<ProtectedRoute><RouteErrorBoundary><StaffLocationAudit /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/employee-audit" element={<ProtectedRoute><RouteErrorBoundary><StaffEmployeeAudit /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/staff-audit" element={<ProtectedRoute><RouteErrorBoundary><StaffStaffAudit /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/performance-review" element={<ProtectedRoute><RouteErrorBoundary><StaffPerformanceReview /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/warnings" element={<ProtectedRoute><RouteErrorBoundary><StaffWarnings /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/score" element={<ProtectedRoute><RouteErrorBoundary><StaffScoreBreakdown /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/documents" element={<ProtectedRoute><RouteErrorBoundary><StaffDocuments /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/waste" element={<ProtectedRoute><RouteErrorBoundary><MyWasteEntries /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/waste/new" element={<ProtectedRoute><RouteErrorBoundary><AddWasteEntry /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/staff/tests/:testId" element={<ProtectedRoute><RouteErrorBoundary><TakeTest /></RouteErrorBoundary></ProtectedRoute>} />
                        
                        {/* Legacy waste routes */}
                        <Route path="/waste/add" element={<Navigate to="/staff/waste/new" replace />} />
                        <Route path="/waste/entries" element={<Navigate to="/staff/waste" replace />} />
                        <Route path="/staff-dashboard" element={<ProtectedRoute><RouteErrorBoundary><StaffHome /></RouteErrorBoundary></ProtectedRoute>} />
                        
                        {/* Onboarding & Settings */}
                        <Route path="/pending-approval" element={<ProtectedRoute><RouteErrorBoundary><PendingApproval /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/onboarding/company" element={<ProtectedRoute><RouteErrorBoundary><CompanyOnboarding /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/onboarding/modules" element={<ProtectedRoute><RouteErrorBoundary><ModuleSelection /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/settings/company" element={<CompanyAdminRoute><RouteErrorBoundary><CompanySettings /></RouteErrorBoundary></CompanyAdminRoute>} />
                        <Route path="/activity-log" element={<CompanyAdminRoute><RouteErrorBoundary><ActivityLog /></RouteErrorBoundary></CompanyAdminRoute>} />
                        <Route path="/role-templates" element={<CompanyAdminRoute><RouteErrorBoundary><RoleTemplates /></RouteErrorBoundary></CompanyAdminRoute>} />
                        <Route path="/policy-rules" element={<CompanyAdminRoute><RouteErrorBoundary><PolicyRules /></RouteErrorBoundary></CompanyAdminRoute>} />
                        <Route path="/settings/terminology" element={<CompanyAdminRoute><RouteErrorBoundary><TerminologySettings /></RouteErrorBoundary></CompanyAdminRoute>} />
                        <Route path="/approvals" element={<ProtectedRoute><ModuleGate module="government_ops"><RouteErrorBoundary><ApprovalQueue /></RouteErrorBoundary></ModuleGate></ProtectedRoute>} />
                        <Route path="/settings/approval-workflows" element={<CompanyAdminRoute><RouteErrorBoundary><ApprovalWorkflowsPage /></RouteErrorBoundary></CompanyAdminRoute>} />
                        <Route path="/pricing" element={<CompanyOwnerRoute><RouteErrorBoundary><PricingPlans /></RouteErrorBoundary></CompanyOwnerRoute>} />
                        
                        {/* Dash */}
                        <Route path="/command" element={<ProtectedRoute><RouteErrorBoundary><MobileCommand /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/dash" element={<ManagerRoute><AppLayout><RouteErrorBoundary><DashWorkspace /></RouteErrorBoundary></AppLayout></ManagerRoute>} />
                        <Route path="/dash/analytics" element={<AdminRoute><AppLayout><RouteErrorBoundary><DashAnalytics /></RouteErrorBoundary></AppLayout></AdminRoute>} />
                        
                        {/* Dashboard & Audits */}
                        <Route path="/dashboard" element={<ProtectedRoute><RouteErrorBoundary><Dashboard /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/audits" element={<ProtectedRoute><RouteErrorBoundary><Audits /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/audits/:id" element={<ProtectedRoute><RouteErrorBoundary><AuditDetail /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/audit-summary/:id" element={<ProtectedRoute><RouteErrorBoundary><AuditSummary /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/location-audit" element={<ProtectedRoute><RouteErrorBoundary><LocationAudit /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/location-audit/:auditId" element={<ProtectedRoute><RouteErrorBoundary><LocationAudit /></RouteErrorBoundary></ProtectedRoute>} />
                        
                        <Route path="/reports" element={<ManagerRoute requiredPermission="view_reports"><RouteErrorBoundary><Reports /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Equipment */}
                        <Route path="/equipment" element={<ProtectedRoute><RouteErrorBoundary><EquipmentList /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/equipment/new" element={<ProtectedRoute><RouteErrorBoundary><EquipmentForm /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/equipment/:id" element={<ProtectedRoute><RouteErrorBoundary><EquipmentDetail /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/equipment/:id/edit" element={<ProtectedRoute><RouteErrorBoundary><EquipmentForm /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/equipment/bulk-qr" element={<ProtectedRoute><RouteErrorBoundary><BulkEquipmentQR /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/interventions/:id" element={<ProtectedRoute><RouteErrorBoundary><InterventionDetail /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/maintenance-calendar" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><MaintenanceCalendar /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Admin */}
                        <Route path="/admin/templates" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><AdminTemplates /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TemplateEditor /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/template-library" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TemplateLibrary /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/users" element={<PlatformAdminRoute><RouteErrorBoundary><UserManagement /></RouteErrorBoundary></PlatformAdminRoute>} />
                        <Route path="/admin/locations" element={<AdminRoute><RouteErrorBoundary><LocationsManagement /></RouteErrorBoundary></AdminRoute>} />
                        <Route path="/admin/locations/sales" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><SalesManagement /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/employees" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><EmployeeManagement /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/platform" element={<PlatformAdminRoute><RouteErrorBoundary><PlatformAdmin /></RouteErrorBoundary></PlatformAdminRoute>} />
                        <Route path="/admin/companies/:id" element={<PlatformAdminRoute><RouteErrorBoundary><CompanyDetail /></RouteErrorBoundary></PlatformAdminRoute>} />
                        
                        <Route path="/settings" element={<ProtectedRoute><RouteErrorBoundary><Settings /></RouteErrorBoundary></ProtectedRoute>} />
                        
                        {/* Notifications */}
                        <Route path="/notifications" element={<ManagerRoute requiredPermission="view_reports"><RouteErrorBoundary><Notifications /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/notification-templates" element={<ManagerRoute requiredPermission="manage_notifications"><RouteErrorBoundary><NotificationTemplates /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/recurring-notifications" element={<ManagerRoute requiredPermission="manage_notifications"><RouteErrorBoundary><RecurringNotifications /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/notification-audit-logs" element={<ManagerRoute requiredPermission="manage_notifications"><RouteErrorBoundary><NotificationAuditLogs /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/notification-analytics" element={<ManagerRoute requiredPermission="manage_notifications"><RouteErrorBoundary><NotificationAnalytics /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/debug" element={<PlatformAdminRoute><RouteErrorBoundary><DebugInfo /></RouteErrorBoundary></PlatformAdminRoute>} />
                        
                        <Route path="/photos" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><PhotoGalleryPage /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audit/:id/photos" element={<ProtectedRoute><RouteErrorBoundary><PhotoGalleryPage /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/documents" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><DocumentManagement /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/documents/:id" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><DocumentDetail /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Waste Admin */}
                        <Route path="/admin/waste/add" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><AdminAddWasteEntry /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/waste/entries" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><AdminWasteEntries /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/waste/products" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><WasteProducts /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/waste/reasons" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><WasteReasons /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/waste/settings" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><WasteSettings /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/reports/waste" element={<ManagerRoute requiredPermission="view_reports"><RouteErrorBoundary><WasteReports /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Tests */}
                        <Route path="/test-creation" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TestCreation /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/test-management" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TestManagement /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/test-edit/:id" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TestEdit /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/take-test/:id" element={<RouteErrorBoundary><TakeTest /></RouteErrorBoundary>} />
                        <Route path="/t/:shortCode" element={<RouteErrorBoundary><TakeTest /></RouteErrorBoundary>} />
                        <Route path="/test-result/:testId/:score/:passed" element={<RouteErrorBoundary><TestResult /></RouteErrorBoundary>} />
                        <Route path="/test-result/:id" element={<RouteErrorBoundary><TestResult /></RouteErrorBoundary>} />
                        
                        {/* Calendar & Schedules */}
                        <Route path="/audits-calendar" element={<ProtectedRoute><RouteErrorBoundary><AuditsCalendar /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/recurring-schedules" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><RecurringAuditSchedules /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/recurring-maintenance-schedules" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><RecurringMaintenanceSchedules /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Staff Audits */}
                        <Route path="/staff-audits" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><StaffAudits /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/staff-audits/all" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><StaffAuditsViewAll /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/staff-audits/:id" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><StaffAuditDetail /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/staff-audits/new" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><StaffAuditNew /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/manual-metrics" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><ManualMetrics /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Integrations */}
                        <Route path="/integrations" element={<AdminRoute><RouteErrorBoundary><Integrations /></RouteErrorBoundary></AdminRoute>} />
                        <Route path="/integrations/:integrationId" element={<AdminRoute><RouteErrorBoundary><IntegrationDetail /></RouteErrorBoundary></AdminRoute>} />
                        
                        {/* Workforce */}
                        <Route path="/workforce" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><Workforce /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/staff" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><Staff /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/staff/:id" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><WorkforceStaffProfile /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/shifts" element={<ManagerRoute requiredPermission="manage_shifts"><RouteErrorBoundary><Shifts /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/attendance" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><Attendance /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/time-off" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><TimeOffApprovals /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/payroll" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><Payroll /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/payroll-batches" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><PayrollBatches /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/badge-settings" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><BadgeSettings /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/performance/:employeeId" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><EmployeePerformance /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/sales" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><SalesManagement /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/attendance-alerts" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><AttendanceAlerts /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/scheduling-insights" element={<ManagerRoute requiredPermission="manage_shifts"><RouteErrorBoundary><SchedulingInsights /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/warnings" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><Warnings /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/training" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><Training /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/training/modules/:id" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><TrainingModuleDetail /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/training/assignments/new" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><TrainingAssignmentNew /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/workforce/training/assignments/:id" element={<ManagerRoute requiredPermission="manage_employees"><RouteErrorBoundary><TrainingAssignmentDetail /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* CMMS */}
                        <Route path="/cmms" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsOverview /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/overview" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsOverview /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/dashboard" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsDashboard /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/assets" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsAssets /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/assets/:id" element={<ModuleGate module="cmms"><ProtectedRoute><RouteErrorBoundary><CmmsAssetDetail /></RouteErrorBoundary></ProtectedRoute></ModuleGate>} />
                        <Route path="/cmms/work-orders" element={<ModuleGate module="cmms"><ProtectedRoute><RouteErrorBoundary><CmmsWorkOrders /></RouteErrorBoundary></ProtectedRoute></ModuleGate>} />
                        <Route path="/cmms/preventive" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsPmSchedules /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/inventory" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsPartsInventory /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/vendors" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsVendors /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/teams" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsTeams /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/procedures" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsProcedures /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/procedures/:id" element={<ModuleGate module="cmms"><ProtectedRoute><RouteErrorBoundary><CmmsProcedureDetail /></RouteErrorBoundary></ProtectedRoute></ModuleGate>} />
                        <Route path="/cmms/purchase-orders" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsPurchaseOrders /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/cmms/reports" element={<ModuleGate module="cmms"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CmmsReporting /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        
                        {/* Inventory */}
                        <Route path="/inventory" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><Inventory /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Tasks */}
                        <Route path="/tasks" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><Tasks /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/tasks/new" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TaskNew /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/tasks/:id/edit" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TaskEdit /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/tasks/calendar" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TasksCalendar /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/evidence-review" element={<ProtectedRoute><RouteErrorBoundary><EvidenceReview /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/compliance-dossier" element={<ProtectedRoute><RouteErrorBoundary><ComplianceDossier /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/employee-dossier" element={<ManagerRoute requiredPermission="view_reports"><RouteErrorBoundary><EmployeeDossier /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/employee-dossier/:employeeId" element={<ManagerRoute requiredPermission="view_reports"><RouteErrorBoundary><EmployeeDossier /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Insights/AI */}
                        <Route path="/insights" element={<ManagerRoute requiredPermission="view_reports"><RouteErrorBoundary><Insights /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/ai-feed" element={<ManagerRoute requiredPermission="view_reports"><RouteErrorBoundary><AIFeed /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Training */}
                        <Route path="/training" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TrainingPrograms /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/training/:id" element={<ProtectedRoute><RouteErrorBoundary><TrainingProgramDetail /></RouteErrorBoundary></ProtectedRoute>} />
                        
                        {/* Audit Templates & System */}
                        <Route path="/audits/templates" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><Templates /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audits/templates/new" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TemplateBuilder /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audits/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><TemplateBuilder /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audits/schedule" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><ScheduleAudit /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audits/perform/:id" element={<ProtectedRoute><RouteErrorBoundary><PerformAudit /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/audits/report/:id" element={<ProtectedRoute><RouteErrorBoundary><AuditReport /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/audits/list" element={<ProtectedRoute><RouteErrorBoundary><AuditsList /></RouteErrorBoundary></ProtectedRoute>} />
                        
                        {/* Mystery Shopper */}
                        <Route path="/mystery-shopper/:token" element={<RouteErrorBoundary><MysteryShopperForm /></RouteErrorBoundary>} />
                        <Route path="/voucher/:code" element={<RouteErrorBoundary><VoucherPage /></RouteErrorBoundary>} />
                        <Route path="/audits/mystery-shopper" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><MysteryShopperTemplates /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audits/mystery-shopper/new" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><MysteryShopperTemplateEditor /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audits/mystery-shopper/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><MysteryShopperTemplateEditor /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audits/mystery-shopper/results" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><MysteryShopperResults /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/audits/vouchers" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><VouchersManagement /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Marketplace */}
                        <Route path="/marketplace" element={<ProtectedRoute><RouteErrorBoundary><MarketplaceBrowse /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/marketplace/template/:slug" element={<ProtectedRoute><RouteErrorBoundary><MarketplaceTemplateDetail /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/marketplace/share/:token" element={<RouteErrorBoundary><MarketplaceShare /></RouteErrorBoundary>} />
                        <Route path="/marketplace/publish" element={<ProtectedRoute><RouteErrorBoundary><MarketplacePublish /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/marketplace/my-templates" element={<ProtectedRoute><RouteErrorBoundary><MyMarketplaceTemplates /></RouteErrorBoundary></ProtectedRoute>} />
                        
                        {/* QR Forms */}
                        <Route path="/admin/qr-forms/templates" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><QrFormTemplates /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/qr-forms/templates/:id" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><QrFormTemplateEditor /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/qr-forms/assignments" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><QrFormAssignments /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/admin/qr-forms/records" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><QrFormRecords /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* System Health */}
                        <Route path="/system-health" element={<ProtectedRoute><RouteErrorBoundary><SystemHealth /></RouteErrorBoundary></ProtectedRoute>} />
                        <Route path="/debug/system-health" element={<AdminRoute><RouteErrorBoundary><SystemHealthData /></RouteErrorBoundary></AdminRoute>} />
                        
                        {/* Agent Admin */}
                        <Route path="/admin/agents" element={<AdminRoute><RouteErrorBoundary><AgentsDashboard /></RouteErrorBoundary></AdminRoute>} />
                        <Route path="/admin/agents/policies" element={<AdminRoute><RouteErrorBoundary><AgentPolicies /></RouteErrorBoundary></AdminRoute>} />
                        <Route path="/admin/agents/logs" element={<AdminRoute><RouteErrorBoundary><AgentLogs /></RouteErrorBoundary></AdminRoute>} />
                        <Route path="/admin/agents/workflows" element={<AdminRoute><RouteErrorBoundary><AgentWorkflows /></RouteErrorBoundary></AdminRoute>} />
                        <Route path="/admin/agents/workflows/:id" element={<AdminRoute><RouteErrorBoundary><AgentWorkflows /></RouteErrorBoundary></AdminRoute>} />
                        <Route path="/admin/agents/run" element={<AdminRoute><RouteErrorBoundary><RunAgent /></RouteErrorBoundary></AdminRoute>} />
                        
                        {/* Operations */}
                        <Route path="/operations/daily" element={<ModuleGate module="operations"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><DailyOps /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/operations/daily/:id" element={<ModuleGate module="operations"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><DailyOpsDetail /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/operations/maintenance" element={<ModuleGate module="operations"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><MaintenanceTasks /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/operations/slas" element={<ModuleGate module="operations"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><SLAManagement /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        
                        {/* Corrective Actions */}
                        <Route path="/corrective-actions" element={<ModuleGate module="corrective_actions"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CorrectiveActionsList /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/corrective-actions/rules" element={<ModuleGate module="corrective_actions"><ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CorrectiveActionRules /></RouteErrorBoundary></ManagerRoute></ModuleGate>} />
                        <Route path="/corrective-actions/:id" element={<ManagerRoute requiredPermission="manage_audits"><RouteErrorBoundary><CorrectiveActionDetail /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* WhatsApp */}
                        <Route path="/whatsapp-templates" element={<ManagerRoute requiredPermission="manage_notifications"><RouteErrorBoundary><WhatsAppTemplates /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/whatsapp-rules" element={<ManagerRoute requiredPermission="manage_notifications"><RouteErrorBoundary><WhatsAppRules /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/whatsapp-broadcast" element={<ManagerRoute requiredPermission="manage_notifications"><RouteErrorBoundary><WhatsAppBroadcast /></RouteErrorBoundary></ManagerRoute>} />
                        <Route path="/whatsapp-logs" element={<ManagerRoute requiredPermission="manage_notifications"><RouteErrorBoundary><WhatsAppLogs /></RouteErrorBoundary></ManagerRoute>} />
                        
                        {/* Scouts */}
                        <Route path="/scouts" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsOverview /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        <Route path="/scouts/jobs" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsJobs /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        <Route path="/scouts/jobs/new" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsJobNew /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        <Route path="/scouts/review" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsReview /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        <Route path="/scouts/templates" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsTemplates /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        <Route path="/scouts/jobs/:id" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsJobDetail /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        <Route path="/scouts/payouts" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsPayouts /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        <Route path="/scouts/roster" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsRoster /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        <Route path="/scouts/analytics" element={<ManagerRoute requiredPermission="manage_audits"><ModuleGate module="scouts"><RouteErrorBoundary><ScoutsAnalytics /></RouteErrorBoundary></ModuleGate></ManagerRoute>} />
                        
                        {/* Install */}
                        <Route path="/install" element={<ProtectedRoute><RouteErrorBoundary><InstallApp /></RouteErrorBoundary></ProtectedRoute>} />
                        
                        <Route path="*" element={<RouteErrorBoundary><NotFound /></RouteErrorBoundary>} />
                      </Routes>
                    </SidebarProvider>
                  </CompanyProvider>
                </AuthProvider>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
