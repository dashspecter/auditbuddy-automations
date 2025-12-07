import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface SidebarContextType {
  expandedGroups: Record<string, boolean>;
  toggleGroup: (title: string) => void;
  expandGroup: (title: string) => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleGroup = useCallback((title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  }, []);

  const expandGroup = useCallback((title: string) => {
    setExpandedGroups(prev => {
      if (prev[title]) return prev;
      return { ...prev, [title]: true };
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  return (
    <SidebarContext.Provider value={{ expandedGroups, toggleGroup, expandGroup, isCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }
  return context;
}
