import {
  LayoutDashboard,
  ListTodo,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  Users,
  UserSearch,
  Trash2,
  Package,
  Wrench,
  Settings2,
  FileBarChart,
  Bot,
  Building2,
  LucideIcon,
} from "lucide-react";

// ============================================================================
// MODULE DATA V2 - Enhanced with categories, maturity, and details
// ============================================================================

export type CategoryType = "Operations" | "Quality" | "People" | "Assets" | "Finance" | "AI";
export type MaturityStage = "Setup" | "Adopt" | "Optimize";

export interface ModuleV2 {
  id: string;
  name: string;
  icon: LucideIcon;
  category: CategoryType;
  optional: boolean;
  maturityStage: MaturityStage;
  summary: string;
  highlights: string[];
  outputs: string[];
  bestFor: string[];
  details: {
    howTeamsUseIt: string[];
    sampleArtifacts: string[];
  };
  recommended?: boolean;
}

export const modulesV2: ModuleV2[] = [
  {
    id: "dashboard",
    name: "Operations Dashboard",
    icon: LayoutDashboard,
    category: "Operations",
    optional: false,
    maturityStage: "Setup",
    summary: "Your command center for real-time visibility across all locations.",
    highlights: [
      "Track live task completion rates",
      "Monitor overdue items and approvals",
      "Compare location performance instantly",
      "Drill down from summary to detail",
    ],
    outputs: ["Daily snapshot", "Location comparison", "Overdue report", "Trend summary"],
    bestFor: ["Owner/COO", "Ops Manager", "Area Manager"],
    details: {
      howTeamsUseIt: [
        "Morning check: Review overnight completions and flag issues",
        "Weekly reviews: Compare location scores side-by-side",
        "Board reporting: Export key metrics for stakeholders",
      ],
      sampleArtifacts: [
        "Weekly Operations Summary showing 94% task completion",
        "Location ranking with top/bottom performers highlighted",
      ],
    },
    recommended: true,
  },
  {
    id: "tasks",
    name: "Tasks & Daily Execution",
    icon: ListTodo,
    category: "Operations",
    optional: false,
    maturityStage: "Setup",
    summary: "Assign, track, and verify daily tasks with photo evidence.",
    highlights: [
      "Create recurring daily/weekly tasks",
      "Require photo proof of completion",
      "Track rates by location and role",
      "Mobile-first for frontline staff",
    ],
    outputs: ["Daily completion report", "Task trends", "Non-compliance alerts", "Role performance"],
    bestFor: ["Ops Manager", "Store Manager", "Shift Lead"],
    details: {
      howTeamsUseIt: [
        "Opening/closing checklists executed consistently every shift",
        "Managers verify critical tasks with photo evidence review",
        "Weekly trends identify locations that need coaching",
      ],
      sampleArtifacts: [
        "Daily task completion: 47/50 tasks done (94%)",
        "Photo gallery of completed cleaning tasks",
      ],
    },
    recommended: true,
  },
  {
    id: "audits",
    name: "Audits & Checklists",
    icon: ClipboardCheck,
    category: "Quality",
    optional: false,
    maturityStage: "Adopt",
    summary: "Standardize inspections with custom templates and instant scoring.",
    highlights: [
      "Build scored audit templates",
      "Capture photos and notes per item",
      "Schedule recurring audits",
      "Generate PDF reports instantly",
    ],
    outputs: ["Score trends", "Section breakdown", "Photo gallery", "Corrective tracker", "Compliance report"],
    bestFor: ["QA Manager", "Ops Manager", "Store Manager", "Auditor"],
    details: {
      howTeamsUseIt: [
        "Monthly health & safety audits across all locations",
        "Compare scores to identify training gaps",
        "Track corrective action completion rates",
      ],
      sampleArtifacts: [
        "Food Safety Audit Score: 92/100 (+3 from last month)",
        "Top issue: Temperature logs incomplete (4 locations)",
      ],
    },
    recommended: true,
  },
  {
    id: "incidents",
    name: "Incident Reporting & CAPA",
    icon: AlertTriangle,
    category: "Quality",
    optional: false,
    maturityStage: "Adopt",
    summary: "Capture incidents in real-time with structured follow-up.",
    highlights: [
      "Log incidents with photos",
      "Assign corrective actions",
      "Track completion and due dates",
      "Analyze recurring issues",
    ],
    outputs: ["Incident log", "CAPA rates", "Root cause summary", "Recurring alerts"],
    bestFor: ["Ops Manager", "Store Manager", "QA", "HR"],
    details: {
      howTeamsUseIt: [
        "Staff report near-misses before they become incidents",
        "Managers assign and track corrective actions",
        "Monthly review identifies patterns by location/category",
      ],
      sampleArtifacts: [
        "This Month: 12 incidents reported, 10 resolved",
        "Top category: Slip/trip hazards (5 incidents)",
      ],
    },
    recommended: true,
  },
  {
    id: "training",
    name: "Training & Certifications",
    icon: GraduationCap,
    category: "People",
    optional: false,
    maturityStage: "Adopt",
    summary: "Track completion and keep certifications current.",
    highlights: [
      "Assign training by role",
      "Track quiz scores",
      "Set expiry reminders",
      "Mobile-friendly modules",
    ],
    outputs: ["Completion by employee", "Expiry alerts", "Quiz analysis", "Gap report"],
    bestFor: ["HR/Training Manager", "Ops Manager", "Store Manager"],
    details: {
      howTeamsUseIt: [
        "Onboarding: New hires complete required modules in week one",
        "Compliance: Track food handler certifications expiring soon",
        "Skills: Identify who's qualified for specific equipment",
      ],
      sampleArtifacts: [
        "Training Compliance: 87% complete across all locations",
        "Alert: 12 food handler certs expiring in 30 days",
      ],
    },
    recommended: true,
  },
  {
    id: "workforce",
    name: "Workforce & Scheduling",
    icon: Users,
    category: "People",
    optional: false,
    maturityStage: "Setup",
    summary: "Schedule shifts, manage attendance, and track labor costs.",
    highlights: [
      "Build and publish schedules",
      "QR/kiosk clock-in/out",
      "Manage time-off requests",
      "Calculate hours and costs",
    ],
    outputs: ["Weekly schedule", "Attendance summary", "Late/absence alerts", "Labor cost breakdown"],
    bestFor: ["Ops Manager", "Store Manager", "HR", "Shift Lead"],
    details: {
      howTeamsUseIt: [
        "Managers publish schedules a week ahead",
        "Staff clock in via mobile or shared kiosk",
        "Payroll team exports hours for processing",
      ],
      sampleArtifacts: [
        "This Week: 240 scheduled hours, 238 worked",
        "Late arrivals: 3 (down from 7 last week)",
      ],
    },
    recommended: true,
  },
  {
    id: "mystery-shopper",
    name: "Mystery Shopper",
    icon: UserSearch,
    category: "Quality",
    optional: true,
    maturityStage: "Optimize",
    summary: "Capture real guest experiences with anonymous evaluations.",
    highlights: [
      "Create custom evaluation forms",
      "Generate unique links",
      "Score service quality",
      "Issue participation vouchers",
    ],
    outputs: ["Mystery shop scores", "Service trends", "Experience breakdown", "Voucher report"],
    bestFor: ["Owner/COO", "Ops Manager", "QA"],
    details: {
      howTeamsUseIt: [
        "Monthly mystery shops reveal true guest experience",
        "Compare service scores across locations",
        "Reward top performers based on objective data",
      ],
      sampleArtifacts: [
        "Average mystery shop score: 4.2/5",
        "Key gap: Greeting within 30 seconds (68% compliance)",
      ],
    },
  },
  {
    id: "waste",
    name: "Waste & Loss Prevention",
    icon: Trash2,
    category: "Finance",
    optional: false,
    maturityStage: "Adopt",
    summary: "Track waste by category and reduce losses.",
    highlights: [
      "Log waste by product/reason",
      "Set waste targets",
      "Track variance vs. sales",
      "Identify top waste items",
    ],
    outputs: ["Daily summary", "Category breakdown", "Cost impact", "Top 10 waste items"],
    bestFor: ["Ops Manager", "Store Manager", "Kitchen Manager"],
    details: {
      howTeamsUseIt: [
        "Kitchen logs waste at end of each shift",
        "Managers review daily totals and investigate spikes",
        "Monthly targets drive behavior change",
      ],
      sampleArtifacts: [
        "Weekly Waste: $1,240 (1.2% of sales, target 1.0%)",
        "Top item: Prepped salads ($180, 15% of total)",
      ],
    },
    recommended: true,
  },
  {
    id: "inventory",
    name: "Inventory Signals",
    icon: Package,
    category: "Finance",
    optional: true,
    maturityStage: "Optimize",
    summary: "Monitor stock levels and track variances.",
    highlights: [
      "Track counts by location",
      "Calculate expected usage variance",
      "Set low-stock alerts",
      "Identify shrinkage patterns",
    ],
    outputs: ["Count report", "Variance analysis", "Low-stock alerts", "Shrinkage summary"],
    bestFor: ["Ops Manager", "Store Manager", "Kitchen Manager"],
    details: {
      howTeamsUseIt: [
        "Weekly counts compared against POS usage",
        "Variance flags potential theft or waste issues",
        "Low-stock alerts prevent stockouts",
      ],
      sampleArtifacts: [
        "Inventory accuracy: 96% (target 98%)",
        "Alert: High variance on protein items at Location #3",
      ],
    },
  },
  {
    id: "equipment",
    name: "Equipment & Assets",
    icon: Wrench,
    category: "Assets",
    optional: false,
    maturityStage: "Setup",
    summary: "Maintain a complete asset register with QR tracking.",
    highlights: [
      "Create records with photos/specs",
      "Generate QR codes",
      "Track warranty and service",
      "Log maintenance history",
    ],
    outputs: ["Asset register", "Warranty alerts", "Maintenance log", "Utilization report"],
    bestFor: ["Ops Manager", "Maintenance", "Store Manager"],
    details: {
      howTeamsUseIt: [
        "Every asset tagged with QR for quick lookup",
        "Warranty expiry alerts prevent surprise costs",
        "Full history available when issues arise",
      ],
      sampleArtifacts: [
        "Total assets: 247 tracked across 8 locations",
        "Expiring warranties: 3 in next 30 days",
      ],
    },
    recommended: true,
  },
  {
    id: "maintenance",
    name: "Maintenance & CMMS",
    icon: Settings2,
    category: "Assets",
    optional: false,
    maturityStage: "Adopt",
    summary: "Schedule preventive maintenance and manage work orders.",
    highlights: [
      "Create and assign work orders",
      "Schedule PM cycles",
      "Track parts inventory",
      "Analyze equipment reliability",
    ],
    outputs: ["Open work orders", "PM compliance", "Parts usage", "Downtime analysis"],
    bestFor: ["Maintenance Manager", "Ops Manager", "Facilities"],
    details: {
      howTeamsUseIt: [
        "Preventive maintenance schedules reduce breakdowns",
        "Work orders track time to resolution",
        "Parts usage helps with reordering",
      ],
      sampleArtifacts: [
        "PM compliance: 91% (target 95%)",
        "Avg. work order resolution: 2.3 days",
      ],
    },
    recommended: true,
  },
  {
    id: "vendor",
    name: "Vendor & Invoice Insights",
    icon: FileBarChart,
    category: "Finance",
    optional: true,
    maturityStage: "Optimize",
    summary: "Track vendor performance and gain spend visibility.",
    highlights: [
      "Maintain vendor database",
      "Analyze spend by category",
      "Rate vendor performance",
      "Set contract reminders",
    ],
    outputs: ["Spend analysis", "Invoice aging", "Vendor scorecard", "Contract alerts"],
    bestFor: ["Owner/COO", "Ops Manager", "Finance"],
    details: {
      howTeamsUseIt: [
        "Finance tracks spend trends by vendor",
        "Operations rates vendor reliability",
        "Contract renewals never slip through",
      ],
      sampleArtifacts: [
        "Top 5 vendors account for 60% of spend",
        "3 contracts up for renewal in Q2",
      ],
    },
  },
  {
    id: "reporting",
    name: "Reporting & Analytics",
    icon: FileBarChart,
    category: "Operations",
    optional: false,
    maturityStage: "Optimize",
    summary: "Generate cross-module reports and turn data into insights.",
    highlights: [
      "Build custom reports",
      "Schedule automated delivery",
      "Export to PDF/Excel/email",
      "Trend analysis with charts",
    ],
    outputs: ["Executive dashboard", "Location scorecard", "Custom templates", "Scheduled reports"],
    bestFor: ["Owner/COO", "Ops Manager", "QA Manager"],
    details: {
      howTeamsUseIt: [
        "Weekly exec summary auto-delivered Monday AM",
        "Location scorecards for manager reviews",
        "Custom reports for specific use cases",
      ],
      sampleArtifacts: [
        "Executive Summary: Week of Jan 27",
        "Top metrics: 94% task completion, 89% audit average",
      ],
    },
    recommended: true,
  },
  {
    id: "ai-assistant",
    name: "AI Ops Copilot",
    icon: Bot,
    category: "AI",
    optional: true,
    maturityStage: "Optimize",
    summary: "Ask questions in natural language and get instant insights.",
    highlights: [
      "Query data naturally",
      "Get instant insights",
      "Identify anomalies",
      "Generate recommendations",
    ],
    outputs: ["Natural language insights", "Anomaly alerts", "AI summaries", "Recommendations"],
    bestFor: ["Owner/COO", "Ops Manager"],
    details: {
      howTeamsUseIt: [
        "Ask: 'Which locations had the most incidents last month?'",
        "Get: Instant analysis with context and recommendations",
        "Save hours of report pulling and analysis",
      ],
      sampleArtifacts: [
        "Query: 'Waste trends this quarter'",
        "Response: Waste down 8% QoQ, main driver: reduced prep waste",
      ],
    },
  },
  {
    id: "governance",
    name: "Governance & Permissions",
    icon: Building2,
    category: "Operations",
    optional: false,
    maturityStage: "Setup",
    summary: "Control who sees what across locations with granular permissions.",
    highlights: [
      "Define roles with permissions",
      "Restrict by location/region",
      "Audit user activity",
      "Enforce approval workflows",
    ],
    outputs: ["Access report", "Activity log", "Permission matrix", "Change history"],
    bestFor: ["Owner/COO", "IT/Admin", "Ops Manager"],
    details: {
      howTeamsUseIt: [
        "Managers see only their locations, execs see all",
        "Activity logs for compliance and audits",
        "Permission changes require admin approval",
      ],
      sampleArtifacts: [
        "Active users: 142 across 8 locations",
        "Role distribution: 8 Admins, 24 Managers, 110 Staff",
      ],
    },
    recommended: true,
  },
];
