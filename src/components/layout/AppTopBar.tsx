import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  ChevronDown,
  User,
  LogOut,
  Plus,
  ClipboardCheck,
  ListTodo,
  Users as UsersIcon,
  Wrench,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export const AppTopBar = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { data: company } = useCompany();
  const { hasModule } = useCompanyContext();
  const navigate = useNavigate();

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || "U";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {company?.name || t("common.company")}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background">
            <DropdownMenuLabel>{company?.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Badge variant="secondary">{company?.subscription_tier}</Badge>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.quickActions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background">
            <DropdownMenuLabel>{t("common.createNew")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/tasks/new" className="cursor-pointer">
                <ListTodo className="mr-2 h-4 w-4" />
                {t("common.createTask")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/location-audit" className="cursor-pointer">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {t("common.createAudit")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/workforce/staff" className="cursor-pointer">
                <UsersIcon className="mr-2 h-4 w-4" />
                {t("common.addStaff")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/equipment/new" className="cursor-pointer">
                <Wrench className="mr-2 h-4 w-4" />
                {t("common.addEquipment")}
              </Link>
            </DropdownMenuItem>
            {hasModule('wastage') && (
              <DropdownMenuItem asChild>
                <Link to="/waste/add" className="cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("nav.wasteAdd", "Add Waste Entry")}
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.email}</span>
                <span className="text-xs text-muted-foreground">{company?.name}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                {t("common.profileSettings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/tasks?filter=my-tasks" className="cursor-pointer">
                <ListTodo className="mr-2 h-4 w-4" />
                {t("common.myTasks")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
