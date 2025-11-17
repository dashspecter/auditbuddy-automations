import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="bg-header text-header-foreground border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-2">
              <ClipboardCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">QSR Audit Platform</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-accent transition-colors">
              Dashboard
            </Link>
            <Link to="/audits" className="hover:text-accent transition-colors">
              Audits
            </Link>
            <Link to="/reports" className="hover:text-accent transition-colors">
              Reports
            </Link>
            <Button variant="outline" size="sm" className="border-header-foreground/20 hover:bg-primary/10">
              Export Data
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};
