import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Users, 
  Calendar, 
  Clock, 
  CalendarPlus, 
  DollarSign, 
  CheckCircle2,
  ArrowRight,
  Briefcase,
  UserPlus,
  Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTerminology } from "@/hooks/useTerminology";

interface WorkforceGuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  linkLabel: string;
  steps: string[];
  dependencies?: string[];
  order: number;
}

function useWorkforceGuides(): WorkforceGuideStep[] {
  const term = useTerminology();
  const empLower = term.employees().toLowerCase();
  const empSingle = term.employee().toLowerCase();
  const locLower = term.locations().toLowerCase();

  return [
    {
      title: "1. Set Up Roles & Departments",
      description: `Define the roles and departments in your organization before adding ${empLower}`,
      icon: <Briefcase className="h-5 w-5" />,
      link: "/workforce?action=roles",
      linkLabel: "Manage Roles",
      order: 1,
      steps: [
        "Click 'Manage Roles' on the Workforce page",
        "Create departments (e.g., Operations, Administration, Management)",
        "Add roles within each department (e.g., Analyst, Coordinator, Director)",
        "Set colors for easy visual identification"
      ]
    },
    {
      title: `2. Add ${term.employees()}`,
      description: `Create profiles for all your team members with their information`,
      icon: <UserPlus className="h-5 w-5" />,
      link: "/workforce/staff",
      linkLabel: `Add ${term.employees()}`,
      order: 2,
      dependencies: ["Roles & Departments"],
      steps: [
        `Click 'Add ${term.employee()}' to create a new profile`,
        "Enter personal details: name, email, phone",
        `Assign to a ${term.location().toLowerCase()} and role`,
        "Set salary details and contract type",
        "Optionally create a login account for self-service"
      ]
    },
    {
      title: `3. Configure ${term.shift()} Scheduling`,
      description: `Create and publish ${term.shifts().toLowerCase()} for your ${empLower}`,
      icon: <Calendar className="h-5 w-5" />,
      link: "/workforce/shifts",
      linkLabel: `View ${term.shifts()}`,
      order: 3,
      dependencies: [term.employees()],
      steps: [
        `Navigate to ${term.shift()} Scheduling`,
        `Create ${term.shifts().toLowerCase()} by clicking on the calendar`,
        `Assign ${empLower} to ${term.shifts().toLowerCase()} based on their roles`,
        "Use 'Copy Schedule' to replicate weeks",
        `Publish ${term.shifts().toLowerCase()} to notify ${empLower}`
      ]
    },
    {
      title: "4. Set Up Attendance Tracking",
      description: `Track when ${empLower} clock in and out of their ${term.shifts().toLowerCase()}`,
      icon: <Clock className="h-5 w-5" />,
      link: "/workforce/attendance",
      linkLabel: "View Attendance",
      order: 4,
      dependencies: [term.shifts()],
      steps: [
        `${term.employees()} can clock in via the mobile app or kiosk`,
        "Set up QR code kiosks for quick check-ins",
        "Configure auto-clockout settings in Company Settings",
        "Review attendance logs and late arrivals",
        "Approve or adjust attendance records"
      ]
    },
    {
      title: "5. Manage Time Off Requests",
      description: `Handle vacation, sick leave, and other time off requests`,
      icon: <CalendarPlus className="h-5 w-5" />,
      link: "/workforce/time-off",
      linkLabel: "Time Off",
      order: 5,
      dependencies: [term.employees()],
      steps: [
        `${term.employees()} submit time off requests via their portal`,
        "Review pending requests in the approvals section",
        "Approve or deny with comments",
        `Track remaining vacation days per ${empSingle}`,
        "View time off calendar for coverage planning"
      ]
    },
    {
      title: "6. Process Payroll",
      description: `Calculate and manage payroll based on attendance data`,
      icon: <DollarSign className="h-5 w-5" />,
      link: "/workforce/payroll",
      linkLabel: "View Payroll",
      order: 6,
      dependencies: ["Attendance", "Salary Rates"],
      steps: [
        "Select or create a pay period",
        "Review hours worked from attendance logs",
        "System calculates regular and overtime hours",
        `Review total pay per ${empSingle}`,
        "Export payroll data for processing"
      ]
    }
  ];
}

function useHowItWorks() {
  const term = useTerminology();
  return [
    {
      title: `${term.employees()} → ${term.shifts()}`,
      description: `${term.employees()} are assigned to ${term.shifts().toLowerCase()} based on their role and ${term.location().toLowerCase()}`,
      icon: <Users className="h-4 w-4" />
    },
    {
      title: `${term.shifts()} → Attendance`,
      description: `Attendance is tracked against scheduled ${term.shifts().toLowerCase()} to measure punctuality`,
      icon: <Clock className="h-4 w-4" />
    },
    {
      title: "Attendance → Payroll",
      description: "Hours worked from attendance feed into payroll calculations",
      icon: <DollarSign className="h-4 w-4" />
    }
  ];
}

export function WorkforceGuides() {
  const guides = useWorkforceGuides();
  const howItWorks = useHowItWorks();
  const term = useTerminology();

  return (
    <div className="space-y-8">
      {/* How It Works Overview */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">How Workforce Works</h2>
        <p className="text-muted-foreground mb-4">
          Understand how the workforce modules connect and flow together
        </p>
        
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
              {howItWorks.map((item, index) => (
                <div key={item.title} className="flex items-center gap-2">
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background/80 min-w-[200px]">
                    <div className="p-2 bg-primary/10 rounded-full mb-2">
                      {item.icon}
                    </div>
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  {index < howItWorks.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-primary hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup Steps */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Setup Guide</h2>
        <p className="text-muted-foreground mb-4">
          Follow these steps in order to set up your workforce management
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Card key={guide.title} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {guide.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{guide.title}</CardTitle>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">{guide.description}</CardDescription>
                {guide.dependencies && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">Requires:</span>
                    {guide.dependencies.map((dep) => (
                      <Badge key={dep} variant="outline" className="text-xs">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                  {guide.steps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                <Link to={guide.link} className="mt-4">
                  <Button variant="outline" className="w-full gap-2">
                    {guide.linkLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-1">Copy Schedules</h4>
              <p className="text-sm text-muted-foreground">
                Save time by copying an entire week's schedule to future weeks with one click.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-1">{term.shift()} Presets</h4>
              <p className="text-sm text-muted-foreground">
                {`Create ${term.shift().toLowerCase()} presets for common ${term.shift().toLowerCase()} times to speed up scheduling.`}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-1">Auto Clock-out</h4>
              <p className="text-sm text-muted-foreground">
                Configure auto clock-out to prevent forgotten clock-outs from affecting payroll.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-1">{`${term.employee()} Self-Service`}</h4>
              <p className="text-sm text-muted-foreground">
                {`Give ${term.employees().toLowerCase()} login access so they can view schedules, request time off, and clock in.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
