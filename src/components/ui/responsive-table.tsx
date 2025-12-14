import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableContextType {
  isMobile: boolean;
}

const ResponsiveTableContext = React.createContext<ResponsiveTableContextType>({
  isMobile: false,
});

export const useResponsiveTable = () => React.useContext(ResponsiveTableContext);

export const ResponsiveTable = ({ children, className }: ResponsiveTableProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveTableContext.Provider value={{ isMobile }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </ResponsiveTableContext.Provider>
  );
};

interface MobileCardListProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function MobileCardList<T>({ 
  data, 
  renderCard, 
  keyExtractor,
  className 
}: MobileCardListProps<T>) {
  return (
    <div className={cn("space-y-3", className)}>
      {data.map((item, index) => (
        <div key={keyExtractor(item)}>
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  );
}

interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MobileCard = ({ children, onClick, className }: MobileCardProps) => {
  return (
    <Card 
      className={cn(
        "cursor-pointer active:scale-[0.98] transition-transform",
        onClick && "hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
};

interface MobileCardRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export const MobileCardRow = ({ label, value, className }: MobileCardRowProps) => {
  return (
    <div className={cn("flex justify-between items-center py-1", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
};

interface MobileCardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const MobileCardHeader = ({ 
  title, 
  subtitle, 
  actions, 
  badge,
  className 
}: MobileCardHeaderProps) => {
  return (
    <div className={cn("flex items-start justify-between gap-2 mb-3", className)}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{title}</span>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
