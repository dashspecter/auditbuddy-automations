import { useCompanyContext } from "@/contexts/CompanyContext";
import { ModuleGuideCard } from "./ModuleGuideCard";
import { ClipboardList, Users, Wrench, Bell, Briefcase, Video } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

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

export function ModuleGuides() {
  const { t } = useTranslation();
  const { modules, isLoading } = useCompanyContext();

  const MODULE_GUIDES = {
    location_audits: {
      name: "location_audits",
      title: t('modules.locationAudits.title'),
      description: t('modules.locationAudits.description'),
      icon: <ClipboardList className="h-5 w-5" />,
      stepImages: [
        locationAuditsStep1,
        locationAuditsStep2,
        locationAuditsStep3,
        locationAuditsStep4,
        locationAuditsStep5
      ],
      steps: [
        t('modules.locationAudits.steps.step1'),
        t('modules.locationAudits.steps.step2'),
        t('modules.locationAudits.steps.step3'),
        t('modules.locationAudits.steps.step4'),
        t('modules.locationAudits.steps.step5')
      ],
      primaryAction: {
        label: t('modules.locationAudits.startNewAudit'),
        to: "/location-audit"
      },
      secondaryAction: {
        label: t('modules.locationAudits.viewTemplates'),
        to: "/admin-templates"
      }
    },
    staff_performance: {
      name: "staff_performance",
      title: t('modules.staffPerformance.title'),
      description: t('modules.staffPerformance.description'),
      icon: <Users className="h-5 w-5" />,
      stepImages: [
        staffPerformanceStep1,
        staffPerformanceStep2,
        staffPerformanceStep3,
        staffPerformanceStep4,
        staffPerformanceStep5
      ],
      steps: [
        t('modules.staffPerformance.steps.step1'),
        t('modules.staffPerformance.steps.step2'),
        t('modules.staffPerformance.steps.step3'),
        t('modules.staffPerformance.steps.step4'),
        t('modules.staffPerformance.steps.step5')
      ],
      primaryAction: {
        label: t('modules.staffPerformance.manageEmployees'),
        to: "/employees"
      },
      secondaryAction: {
        label: t('modules.staffPerformance.staffAudits'),
        to: "/staff-audits"
      }
    },
    equipment_management: {
      name: "equipment_management",
      title: t('modules.equipmentManagement.title'),
      description: t('modules.equipmentManagement.description'),
      icon: <Wrench className="h-5 w-5" />,
      stepImages: [
        equipmentManagementStep1,
        equipmentManagementStep2,
        equipmentManagementStep3,
        equipmentManagementStep4,
        equipmentManagementStep5
      ],
      steps: [
        t('modules.equipmentManagement.steps.step1'),
        t('modules.equipmentManagement.steps.step2'),
        t('modules.equipmentManagement.steps.step3'),
        t('modules.equipmentManagement.steps.step4'),
        t('modules.equipmentManagement.steps.step5')
      ],
      primaryAction: {
        label: t('modules.equipmentManagement.addEquipment'),
        to: "/equipment/new"
      },
      secondaryAction: {
        label: t('modules.equipmentManagement.viewCalendar'),
        to: "/maintenance-calendar"
      }
    },
    notifications: {
      name: "notifications",
      title: t('modules.notifications.title'),
      description: t('modules.notifications.description'),
      icon: <Bell className="h-5 w-5" />,
      stepImages: [
        notificationsStep1,
        notificationsStep2,
        notificationsStep3,
        notificationsStep4,
        notificationsStep5
      ],
      steps: [
        t('modules.notifications.steps.step1'),
        t('modules.notifications.steps.step2'),
        t('modules.notifications.steps.step3'),
        t('modules.notifications.steps.step4'),
        t('modules.notifications.steps.step5')
      ],
      primaryAction: {
        label: t('modules.notifications.sendNotification'),
        to: "/notifications"
      },
      secondaryAction: {
        label: t('modules.notifications.viewTemplates'),
        to: "/notification-templates"
      }
    },
    reports: {
      name: "reports",
      title: t('modules.reports.title'),
      description: t('modules.reports.description'),
      icon: <Briefcase className="h-5 w-5" />,
      stepImages: [
        reportsStep1,
        reportsStep2,
        reportsStep3,
        reportsStep4,
        reportsStep5
      ],
      steps: [
        t('modules.reports.steps.step1'),
        t('modules.reports.steps.step2'),
        t('modules.reports.steps.step3'),
        t('modules.reports.steps.step4'),
        t('modules.reports.steps.step5')
      ],
      primaryAction: {
        label: t('modules.reports.viewReports'),
        to: "/reports"
      },
      secondaryAction: {
        label: t('modules.reports.dashboard'),
        to: "/"
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.gettingStarted')}</h2>
          <p className="text-muted-foreground mt-1">{t('dashboard.loadingModules')}</p>
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
          <span>{t('dashboard.noActiveModules')}</span>
          <Button asChild variant="outline" size="sm" className="ml-4">
            <Link to="/settings/company?tab=modules">{t('dashboard.goToSettings')}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.gettingStarted')}</h2>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.learnModules')}
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
