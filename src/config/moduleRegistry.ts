import {
  MapPin, Users, Settings, Bell, BarChart3, Briefcase,
  FileText, Package, Lightbulb, Link, Trash2, QrCode,
  MessageSquare, DollarSign, Wrench, AlertTriangle,
  ClipboardList, Search, LucideIcon,
} from 'lucide-react';

export interface ModuleDefinition {
  code: string;
  displayName: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  /** Tailwind text-color class for the icon */
  color: string;
  /** Group for UI organisation */
  category: 'core' | 'operations' | 'communication' | 'analytics';
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  // ── Core ──────────────────────────────────────────
  {
    code: 'location_audits',
    displayName: 'Location Audits',
    description: 'Complete audit management system for location inspections and compliance',
    features: ['Custom audit templates', 'Schedule recurring audits', 'Photo documentation', 'Real-time compliance scores'],
    icon: MapPin,
    color: 'text-blue-500',
    category: 'core',
  },
  {
    code: 'staff_performance',
    displayName: 'Staff Performance',
    description: 'Track employee performance and conduct staff evaluations',
    features: ['Employee performance audits', 'Performance leaderboards', 'Skills assessment tests', 'Progress tracking & reports'],
    icon: Users,
    color: 'text-green-500',
    category: 'core',
  },
  {
    code: 'equipment_management',
    displayName: 'Equipment Management',
    description: 'Manage equipment inventory, maintenance schedules, and interventions',
    features: ['Equipment tracking with QR codes', 'Maintenance scheduling', 'Status history & logs', 'Intervention management'],
    icon: Settings,
    color: 'text-purple-500',
    category: 'core',
  },
  {
    code: 'workforce',
    displayName: 'Workforce',
    description: 'Manage employees, shifts, attendance, training, and time-off requests',
    features: ['Shift scheduling', 'Attendance tracking', 'Training management', 'Time-off requests'],
    icon: Briefcase,
    color: 'text-indigo-500',
    category: 'core',
  },

  // ── Operations ────────────────────────────────────
  {
    code: 'operations',
    displayName: 'Operations',
    description: 'Operational workflows and daily task management',
    features: ['Daily operations checklists', 'Workflow automation', 'Operational KPIs', 'Team coordination'],
    icon: ClipboardList,
    color: 'text-cyan-500',
    category: 'operations',
  },
  {
    code: 'wastage',
    displayName: 'Wastage',
    description: 'Track and reduce waste across locations',
    features: ['Waste logging', 'Category tracking', 'Cost analysis', 'Reduction goals'],
    icon: Trash2,
    color: 'text-amber-500',
    category: 'operations',
  },
  {
    code: 'qr_forms',
    displayName: 'QR Forms (HACCP / Quality Records)',
    description: 'Digital HACCP and quality record forms accessible via QR code',
    features: ['QR-code triggered forms', 'HACCP compliance', 'Temperature logging', 'Audit trails'],
    icon: QrCode,
    color: 'text-teal-500',
    category: 'operations',
  },
  {
    code: 'cmms',
    displayName: 'CMMS (Maintenance)',
    description: 'Computerized maintenance management for assets and work orders',
    features: ['Work order management', 'Preventive maintenance plans', 'Parts inventory', 'Asset lifecycle tracking'],
    icon: Wrench,
    color: 'text-orange-600',
    category: 'operations',
  },
  {
    code: 'corrective_actions',
    displayName: 'Corrective Actions',
    description: 'Track and resolve non-conformances with structured corrective actions',
    features: ['CA creation from audits', 'Root cause analysis', 'Due-date tracking', 'Evidence attachments'],
    icon: AlertTriangle,
    color: 'text-red-500',
    category: 'operations',
  },
  {
    code: 'inventory',
    displayName: 'Inventory',
    description: 'Manage stock levels, orders, and inventory across locations',
    features: ['Stock tracking', 'Low-stock alerts', 'Order management', 'Multi-location inventory'],
    icon: Package,
    color: 'text-lime-600',
    category: 'operations',
  },
  {
    code: 'documents',
    displayName: 'Documents',
    description: 'Centralized document storage and version management',
    features: ['Document library', 'Version control', 'Role-based access', 'Expiry reminders'],
    icon: FileText,
    color: 'text-slate-500',
    category: 'operations',
  },
  {
    code: 'scouts',
    displayName: 'Dashspect Scouts',
    description: 'Field worker jobs, submissions, and evidence management',
    features: ['Job creation & templates', 'Photo/video evidence', 'Review queue', 'Payout management'],
    icon: Search,
    color: 'text-violet-500',
    category: 'operations',
  },
  {
    code: 'payroll',
    displayName: 'Payroll & Labor Costs',
    description: 'Calculate payroll, track labor costs, and generate pay summaries',
    features: ['Payroll calculations', 'Overtime tracking', 'Cost per location', 'Export reports'],
    icon: DollarSign,
    color: 'text-emerald-500',
    category: 'operations',
  },

  // ── Communication ─────────────────────────────────
  {
    code: 'notifications',
    displayName: 'Notifications',
    description: 'Automated notification system with templates and scheduling',
    features: ['Notification templates', 'Recurring alerts', 'Role-based targeting', 'Delivery analytics'],
    icon: Bell,
    color: 'text-orange-500',
    category: 'communication',
  },
  {
    code: 'whatsapp_messaging',
    displayName: 'WhatsApp Messaging',
    description: 'Send messages and updates to staff via WhatsApp',
    features: ['Template messages', 'Bulk messaging', 'Delivery tracking', 'Two-way communication'],
    icon: MessageSquare,
    color: 'text-green-600',
    category: 'communication',
  },

  // ── Analytics ─────────────────────────────────────
  {
    code: 'reports',
    displayName: 'Reports & Analytics',
    description: 'Comprehensive reporting and data analytics dashboard',
    features: ['Performance trends', 'Location analytics', 'Export to PDF', 'Custom date ranges'],
    icon: BarChart3,
    color: 'text-pink-500',
    category: 'analytics',
  },
  {
    code: 'insights',
    displayName: 'Insights',
    description: 'AI-powered insights and recommendations for your business',
    features: ['AI feed', 'Scheduling insights', 'Trend detection', 'Actionable recommendations'],
    icon: Lightbulb,
    color: 'text-yellow-500',
    category: 'analytics',
  },
  {
    code: 'integrations',
    displayName: 'Integrations',
    description: 'Connect with third-party tools and services',
    features: ['API connections', 'Webhook support', 'Data sync', 'Custom integrations'],
    icon: Link,
    color: 'text-sky-500',
    category: 'analytics',
  },
];

/** Look up a module display name by its code. Falls back to the code itself. */
export const getModuleDisplayName = (code: string): string => {
  return MODULE_REGISTRY.find((m) => m.code === code)?.displayName ?? code;
};

/** Get a module definition by code */
export const getModuleByCode = (code: string): ModuleDefinition | undefined => {
  return MODULE_REGISTRY.find((m) => m.code === code);
};

/** Category labels for grouping in the UI */
export const CATEGORY_LABELS: Record<ModuleDefinition['category'], string> = {
  core: 'Core',
  operations: 'Operations',
  communication: 'Communication',
  analytics: 'Analytics & Insights',
};
