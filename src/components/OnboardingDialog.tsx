import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck,
  FileText,
  BarChart3,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const checkerSteps: OnboardingStep[] = [
  {
    title: "Welcome to Dashspect!",
    description: "You're set up as a Checker. Let's walk through what you can do.",
    icon: <ClipboardCheck className="h-12 w-12 text-primary" />,
    features: [
      "Complete location audits using templates",
      "View your audit history",
      "Track your compliance scores",
    ],
  },
  {
    title: "Creating Audits",
    description: "Your main task is to complete location audits.",
    icon: <FileText className="h-12 w-12 text-primary" />,
    features: [
      "Navigate to 'Audits' in the menu",
      "Select 'Start New Audit'",
      "Choose a template and location",
      "Fill out the audit checklist",
    ],
  },
  {
    title: "Your Dashboard",
    description: "Keep track of your work on the Dashboard.",
    icon: <BarChart3 className="h-12 w-12 text-primary" />,
    features: [
      "View recent audits",
      "See compliance trends",
      "Access draft audits to continue",
    ],
  },
];

const managerSteps: OnboardingStep[] = [
  {
    title: "Welcome to Dashspect!",
    description: "You're set up as a Manager. You have expanded permissions to oversee audits and team.",
    icon: <ClipboardCheck className="h-12 w-12 text-primary" />,
    features: [
      "Complete and review all audits",
      "Create and manage audit templates",
      "Generate compliance reports",
      "Invite and manage Checker users",
    ],
  },
  {
    title: "Managing Templates",
    description: "Create custom audit templates for your locations.",
    icon: <FileText className="h-12 w-12 text-primary" />,
    features: [
      "Access 'Templates' from the menu",
      "Create new templates or edit existing ones",
      "Customize sections and fields",
      "Assign templates to specific locations",
    ],
  },
  {
    title: "Reports & Team Management",
    description: "Monitor performance and manage your team.",
    icon: <BarChart3 className="h-12 w-12 text-primary" />,
    features: [
      "Generate detailed compliance reports",
      "Export audit data for analysis",
      "Invite Checkers to the platform",
      "View team activity and audit history",
    ],
  },
];

const adminSteps: OnboardingStep[] = [
  {
    title: "Welcome to Dashspect!",
    description: "You're set up as an Admin with full system access.",
    icon: <ClipboardCheck className="h-12 w-12 text-primary" />,
    features: [
      "Complete and review all audits",
      "Full template management",
      "Generate comprehensive reports",
      "Manage all users and roles",
      "Access system-wide settings",
    ],
  },
  {
    title: "User & Role Management",
    description: "Control access and permissions across your organization.",
    icon: <Users className="h-12 w-12 text-primary" />,
    features: [
      "Invite users with Admin, Manager, or Checker roles",
      "Modify user permissions",
      "View user activity logs",
      "Manage team structure",
    ],
  },
  {
    title: "Advanced Features",
    description: "Leverage all platform capabilities for maximum efficiency.",
    icon: <BarChart3 className="h-12 w-12 text-primary" />,
    features: [
      "Create global or location-specific templates",
      "Export comprehensive data sets",
      "Monitor organization-wide compliance",
      "Configure system settings and preferences",
    ],
  },
];

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OnboardingDialog = ({ open, onOpenChange }: OnboardingDialogProps) => {
  const { data: roleData } = useUserRole();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = roleData?.isAdmin
    ? adminSteps
    : roleData?.isManager
    ? managerSteps
    : checkerSteps;

  const roleName = roleData?.isAdmin
    ? "Admin"
    : roleData?.isManager
    ? "Manager"
    : "Checker";

  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onOpenChange(false);
      localStorage.setItem("dashspect_onboarding_completed", "true");
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    localStorage.setItem("dashspect_onboarding_completed", "true");
  };

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
    }
  }, [open]);

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {currentStepData.icon}
            <Badge variant="secondary" className="text-sm">
              {roleName} Role
            </Badge>
          </div>
          <DialogTitle className="text-2xl">{currentStepData.title}</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            What you can do:
          </h4>
          <ul className="space-y-3">
            {currentStepData.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 justify-center mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-primary"
                  : index < currentStep
                  ? "w-2 bg-primary/50"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
            <Button onClick={handleNext}>
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
