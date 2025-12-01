import { ReactNode } from "react";
import { AppLayout } from "./AppLayout";
import { TrialBanner } from "@/components/TrialBanner";

interface ProtectedLayoutProps {
  children: ReactNode;
  hideTrialBanner?: boolean;
}

export const ProtectedLayout = ({ children, hideTrialBanner }: ProtectedLayoutProps) => {
  return (
    <AppLayout>
      {!hideTrialBanner && <TrialBanner />}
      {children}
    </AppLayout>
  );
};
