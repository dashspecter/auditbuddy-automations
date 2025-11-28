import { TourStep } from '@/components/onboarding/FeatureTour';
import { ClipboardList, Users, Wrench, Bell, Briefcase } from 'lucide-react';

export const MODULE_TOURS: Record<string, { icon: React.ReactNode; steps: TourStep[] }> = {
  location_audits: {
    icon: <ClipboardList className="h-5 w-5" />,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Location Audits! 🎉',
        description: 'This module helps you conduct comprehensive audits of your locations with custom templates, scheduling, and compliance tracking.',
        placement: 'center',
      },
      {
        id: 'create_audit',
        title: 'Start Your First Audit',
        description: 'Click the "New Audit" button to begin an audit. You can select from pre-built templates or create custom ones.',
        target: '[data-tour="new-audit-button"]',
        placement: 'bottom',
      },
      {
        id: 'templates',
        title: 'Manage Templates',
        description: 'Create and customize audit templates to match your specific requirements. Templates can include custom fields, sections, and scoring criteria.',
        target: '[data-tour="templates-menu"]',
        placement: 'bottom',
      },
      {
        id: 'calendar',
        title: 'Schedule Audits',
        description: 'Use the calendar view to schedule audits in advance and track upcoming inspections across all your locations.',
        target: '[data-tour="calendar-link"]',
        placement: 'bottom',
      },
      {
        id: 'reports',
        title: 'View Reports',
        description: 'Access detailed reports and analytics to track compliance trends and identify areas for improvement.',
        target: '[data-tour="reports-link"]',
        placement: 'bottom',
      },
    ],
  },
  staff_performance: {
    icon: <Users className="h-5 w-5" />,
    steps: [
      {
        id: 'welcome',
        title: 'Staff Performance Tracking 👥',
        description: 'Monitor and improve your team\'s performance with detailed audits, metrics, and analytics.',
        placement: 'center',
      },
      {
        id: 'employee_management',
        title: 'Manage Employees',
        description: 'Add and organize your team members. Assign them to specific locations and track their performance over time.',
        target: '[data-tour="employees-menu"]',
        placement: 'bottom',
      },
      {
        id: 'staff_audits',
        title: 'Conduct Staff Audits',
        description: 'Create personalized audits to evaluate individual employee performance and provide constructive feedback.',
        target: '[data-tour="staff-audits-link"]',
        placement: 'bottom',
      },
      {
        id: 'leaderboards',
        title: 'Track Top Performers',
        description: 'View leaderboards to recognize high-performing team members and motivate your entire team.',
        target: '[data-tour="leaderboard"]',
        placement: 'left',
      },
    ],
  },
  equipment_management: {
    icon: <Wrench className="h-5 w-5" />,
    steps: [
      {
        id: 'welcome',
        title: 'Equipment Management 🔧',
        description: 'Track all your equipment, schedule maintenance, and manage interventions to ensure everything runs smoothly.',
        placement: 'center',
      },
      {
        id: 'equipment_list',
        title: 'Your Equipment Inventory',
        description: 'Browse and manage all equipment across your locations. Track status, maintenance history, and upcoming checks.',
        target: '[data-tour="equipment-list"]',
        placement: 'bottom',
      },
      {
        id: 'add_equipment',
        title: 'Add New Equipment',
        description: 'Register new equipment by providing details like name, location, model type, and power specifications.',
        target: '[data-tour="add-equipment-button"]',
        placement: 'bottom',
      },
      {
        id: 'maintenance_calendar',
        title: 'Schedule Maintenance',
        description: 'Use the maintenance calendar to plan and track all equipment interventions and preventive maintenance.',
        target: '[data-tour="maintenance-calendar"]',
        placement: 'bottom',
      },
      {
        id: 'qr_codes',
        title: 'Generate QR Codes',
        description: 'Create QR codes for quick equipment access. Scan codes to view equipment details and log interventions instantly.',
        target: '[data-tour="bulk-qr-link"]',
        placement: 'bottom',
      },
    ],
  },
  notifications: {
    icon: <Bell className="h-5 w-5" />,
    steps: [
      {
        id: 'welcome',
        title: 'Notifications System 🔔',
        description: 'Stay connected with your team through customizable notifications, templates, and automated alerts.',
        placement: 'center',
      },
      {
        id: 'notification_center',
        title: 'Notification Center',
        description: 'View all active notifications here. You can see unread notifications and manage your notification preferences.',
        target: '[data-tour="notifications-dropdown"]',
        placement: 'bottom',
      },
      {
        id: 'create_notification',
        title: 'Send Notifications',
        description: 'Create and send notifications to specific roles. Target checkers, managers, or admins with relevant information.',
        target: '[data-tour="notifications-page"]',
        placement: 'bottom',
      },
      {
        id: 'templates',
        title: 'Use Templates',
        description: 'Save time with notification templates for common messages. Create templates for recurring announcements.',
        target: '[data-tour="notification-templates"]',
        placement: 'bottom',
      },
      {
        id: 'recurring',
        title: 'Schedule Recurring Alerts',
        description: 'Set up automated notifications that send on a regular schedule - daily, weekly, or monthly.',
        target: '[data-tour="recurring-notifications"]',
        placement: 'bottom',
      },
    ],
  },
  reports: {
    icon: <Briefcase className="h-5 w-5" />,
    steps: [
      {
        id: 'welcome',
        title: 'Reports & Analytics 📊',
        description: 'Gain insights into your operations with comprehensive reports, charts, and data visualization.',
        placement: 'center',
      },
      {
        id: 'dashboard',
        title: 'Analytics Dashboard',
        description: 'Your dashboard shows key metrics at a glance - compliance rates, trends, and performance indicators.',
        target: '[data-tour="dashboard-stats"]',
        placement: 'bottom',
      },
      {
        id: 'reports_page',
        title: 'Detailed Reports',
        description: 'Access in-depth reports for audits, locations, and staff performance. Filter by date range and location.',
        target: '[data-tour="reports-link"]',
        placement: 'bottom',
      },
      {
        id: 'export',
        title: 'Export Data',
        description: 'Export reports to PDF or Excel for sharing with stakeholders or offline analysis.',
        target: '[data-tour="export-button"]',
        placement: 'left',
      },
    ],
  },
};
