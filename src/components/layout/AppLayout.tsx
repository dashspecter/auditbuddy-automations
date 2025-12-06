import { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { AITestAgent } from "@/components/AITestAgent";
import { AIGuideChat } from "@/components/AIGuideChat";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      
      <div className="flex flex-1 flex-col">
        <AppTopBar />
        
        <main className="flex-1 overflow-auto p-4">
          <Breadcrumbs />
          <div className="mt-4">
            {children}
          </div>
        </main>
      </div>
      
      <AITestAgent />
      <AIGuideChat />
    </div>
  );
};