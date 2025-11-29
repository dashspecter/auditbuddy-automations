import { useCompanyContext } from "@/contexts/CompanyContext";
import { ModuleGuideCard } from "./ModuleGuideCard";
import { ClipboardList, Users, Wrench, Bell, Briefcase, Video } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Import tutorial images
import locationAuditsStep1 from "@/assets/tutorials/location-audits-step1.png";
import locationAuditsStep2 from "@/assets/tutorials/location-audits-step2.png";
import locationAuditsStep3 from "@/assets/tutorials/location-audits-step3.png";
import locationAuditsStep4 from "@/assets/tutorials/location-audits-step4.png";
import locationAuditsStep5 from "@/assets/tutorials/location-audits-step5.png";

import staffPerformanceStep1 from "@/assets/tutorials/staff-performance-step1.png";
import staffPerformanceStep2 from "@/assets/tutorials/staff-performance-step2.png";
import staffPerformanceStep3 from "@/assets/tutorials/staff-performance-step3.png";
import staffPerformanceStep4 from "@/assets/tutorials/staff-performance-step4.png";
import staffPerformanceStep5 from "@/assets/tutorials/staff-performance-step5.png";

import equipmentManagementStep1 from "@/assets/tutorials/equipment-management-step1.png";
import equipmentManagementStep2 from "@/assets/tutorials/equipment-management-step2.png";
import equipmentManagementStep3 from "@/assets/tutorials/equipment-management-step3.png";
import equipmentManagementStep4 from "@/assets/tutorials/equipment-management-step4.png";
import equipmentManagementStep5 from "@/assets/tutorials/equipment-management-step5.png";

import notificationsStep1 from "@/assets/tutorials/notifications-step1.png";
import notificationsStep2 from "@/assets/tutorials/notifications-step2.png";
import notificationsStep3 from "@/assets/tutorials/notifications-step3.png";
import notificationsStep4 from "@/assets/tutorials/notifications-step4.png";
import notificationsStep5 from "@/assets/tutorials/notifications-step5.png";

import reportsStep1 from "@/assets/tutorials/reports-step1.png";
import reportsStep2 from "@/assets/tutorials/reports-step2.png";
import reportsStep3 from "@/assets/tutorials/reports-step3.png";
import reportsStep4 from "@/assets/tutorials/reports-step4.png";
import reportsStep5 from "@/assets/tutorials/reports-step5.png";

const MODULE_GUIDES = {
  location_audits: {
    name: "location_audits",
    title: "Location Audits",
    description: "Conduct comprehensive audits with custom templates and scheduling",
    icon: <ClipboardList className="h-5 w-5" />,
    stepImages: [
      locationAuditsStep1,
      locationAuditsStep2,
      locationAuditsStep3,
      locationAuditsStep4,
      locationAuditsStep5
    ],
    steps: [
      "Click 'New Audit' to start your first location audit",
      "Select a pre-built template or create a custom one",
      "Fill in the audit sections with scores and notes",
      "Add photos to document findings",
      "Submit and view the audit in Reports"
    ],
    primaryAction: {
      label: "Start New Audit",
      to: "/location-audit"
    },
    secondaryAction: {
      label: "View Templates",
      to: "/admin-templates"
    }
  },
  staff_performance: {
    name: "staff_performance",
    title: "Staff Performance",
    description: "Monitor and improve team performance with detailed tracking",
    icon: <Users className="h-5 w-5" />,
    stepImages: [
      staffPerformanceStep1,
      staffPerformanceStep2,
      staffPerformanceStep3,
      staffPerformanceStep4,
      staffPerformanceStep5
    ],
    steps: [
      "Add your team members in Employee Management",
      "Assign employees to their respective locations",
      "Create staff audits to evaluate performance",
      "Review the leaderboard to identify top performers",
      "Track trends and provide constructive feedback"
    ],
    primaryAction: {
      label: "Manage Employees",
      to: "/employees"
    },
    secondaryAction: {
      label: "Staff Audits",
      to: "/staff-audits"
    }
  },
  equipment_management: {
    name: "equipment_management",
    title: "Equipment Management",
    description: "Track equipment, schedule maintenance, and manage interventions",
    icon: <Wrench className="h-5 w-5" />,
    stepImages: [
      equipmentManagementStep1,
      equipmentManagementStep2,
      equipmentManagementStep3,
      equipmentManagementStep4,
      equipmentManagementStep5
    ],
    steps: [
      "Register new equipment with location and specifications",
      "Generate QR codes for quick equipment access",
      "Schedule preventive maintenance on the calendar",
      "Log interventions with before/after photos",
      "Track equipment status and maintenance history"
    ],
    primaryAction: {
      label: "Add Equipment",
      to: "/equipment/new"
    },
    secondaryAction: {
      label: "View Calendar",
      to: "/maintenance-calendar"
    }
  },
  notifications: {
    name: "notifications",
    title: "Notifications",
    description: "Stay connected with customizable alerts and templates",
    icon: <Bell className="h-5 w-5" />,
    stepImages: [
      notificationsStep1,
      notificationsStep2,
      notificationsStep3,
      notificationsStep4,
      notificationsStep5
    ],
    steps: [
      "Create notification templates for common messages",
      "Send notifications to specific roles (checkers, managers, admins)",
      "Set up recurring notifications for regular reminders",
      "Track notification analytics and engagement",
      "Manage notification preferences and history"
    ],
    primaryAction: {
      label: "Send Notification",
      to: "/notifications"
    },
    secondaryAction: {
      label: "View Templates",
      to: "/notification-templates"
    }
  },
  reports: {
    name: "reports",
    title: "Reports & Analytics",
    description: "Comprehensive insights with detailed reports and visualizations",
    icon: <Briefcase className="h-5 w-5" />,
    stepImages: [
      reportsStep1,
      reportsStep2,
      reportsStep3,
      reportsStep4,
      reportsStep5
    ],
    steps: [
      "View key metrics on your dashboard",
      "Filter reports by date range and location",
      "Analyze compliance trends and patterns",
      "Export reports to PDF or Excel",
      "Share insights with stakeholders"
    ],
    primaryAction: {
      label: "View Reports",
      to: "/reports"
    },
    secondaryAction: {
      label: "Dashboard",
      to: "/"
    }
  }
};

export function ModuleGuides() {
  const { modules, isLoading } = useCompanyContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Getting Started</h2>
          <p className="text-muted-foreground mt-1">Loading your modules...</p>
        </div>
      </div>
    );
  }

  const activeModules = modules.filter(m => m.is_active) || [];
  const activeGuides = activeModules
    .map(m => MODULE_GUIDES[m.module_name as keyof typeof MODULE_GUIDES])
    .filter(Boolean);

  if (activeGuides.length === 0) {
    return (
      <Alert>
        <Video className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>No modules are currently active. Visit Company Settings to activate modules and get started.</span>
          <Button asChild variant="outline" size="sm" className="ml-4">
            <Link to="/settings/company?tab=modules">Go to Settings</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Getting Started</h2>
        <p className="text-muted-foreground mt-1">
          Learn how to use your active modules with these step-by-step guides
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {activeGuides.map((guide) => (
          <ModuleGuideCard key={guide.name} guide={guide} />
        ))}
      </div>
    </div>
  );
}
