import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";

interface DashboardPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  navigateTo: string;
  navigateLabel: string;
  children: ReactNode;
}

export const DashboardPreviewDialog = ({
  open,
  onOpenChange,
  title,
  description,
  navigateTo,
  navigateLabel,
  children,
}: DashboardPreviewDialogProps) => {
  const navigate = useNavigate();

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        {description && (
          <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
        )}
      </ResponsiveDialogHeader>
      <ResponsiveDialogBody>
        {children}
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        <Button
          className="w-full"
          onClick={() => {
            onOpenChange(false);
            navigate(navigateTo);
          }}
        >
          {navigateLabel} <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  );
};
