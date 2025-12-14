import { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar - hidden on mobile */}
      {!isMobile && <AppSidebar />}
      
      <div className="flex flex-1 flex-col min-w-0">
        <AppTopBar />
        
        <main className="flex-1 overflow-auto p-3 md:p-4">
          <Breadcrumbs />
          <div className="mt-3 md:mt-4">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav />}
      </div>
    </div>
  );
};