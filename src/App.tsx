import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/audits" element={<ProtectedRoute><Audits /></ProtectedRoute>} />
            <Route path="/audits/:id" element={<ProtectedRoute><AuditDetail /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/location-audit" element={<ProtectedRoute><LocationAudit /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/templates" element={<ProtectedRoute><AdminTemplates /></ProtectedRoute>} />
            <Route path="/admin/templates/:id" element={<ProtectedRoute><TemplateEditor /></ProtectedRoute>} />
            <Route path="/admin/template-library" element={<ProtectedRoute><TemplateLibrary /></ProtectedRoute>} />
            <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="/notifications" element={<AdminRoute><Notifications /></AdminRoute>} />
            <Route path="/notification-templates" element={<AdminRoute><NotificationTemplates /></AdminRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
