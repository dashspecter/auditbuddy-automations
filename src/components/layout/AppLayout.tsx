import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="relative flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex flex-1 flex-col">
          <AppTopBar />
          
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-4">
              <Breadcrumbs />
              <div className="mt-4">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};