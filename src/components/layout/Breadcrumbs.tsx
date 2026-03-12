import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTerminology } from "@/hooks/useTerminology";

const staticRouteNameMap: Record<string, string> = {
  dashboard: "Home",
  workforce: "Workforce",
  "time-off": "Time Off",
  payroll: "Payroll",
  tasks: "Tasks",
  inventory: "Inventory",
  documents: "Documents",
  insights: "Insights",
  integrations: "Integrations",
  admin: "Admin",
  settings: "Settings",
  company: "Company",
  pricing: "Billing & Modules",
  new: "New",
  edit: "Edit",
  reports: "Reports",
  companies: "Companies",
  platform: "Platform Admin",
  mystery: "Mystery",
  shopper: "Shopper",
  all: "All",
};

const pathOverrideMap: Record<string, string> = {
  "/admin": "/admin/platform",
};

const toTitleCaseSegment = (segment: string) =>
  segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const Breadcrumbs = () => {
  const location = useLocation();
  const term = useTerminology();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0 || pathSegments[0] === "dashboard") {
    return null;
  }

  // Dynamic route names that respect terminology overrides
  const dynamicRouteNames: Record<string, string> = {
    staff: term.employees(),
    shifts: term.shifts(),
    attendance: "Attendance",
    audits: term.audits(),
    equipment: term.equipment(),
    locations: term.locations(),
    "staff-audits": `${term.employee()} ${term.audits()}`,
    "audits-calendar": `${term.audits()} Calendar`,
    "recurring-schedules": `Recurring ${term.audits()}`,
    "recurring-audit-schedules": `Recurring ${term.audits()}`,
    "badge-settings": "Badge Settings",
    "mystery-shopper": "Mystery Shopper",
  };

  const routeNameMap = { ...staticRouteNameMap, ...dynamicRouteNames };

  const breadcrumbItems = pathSegments
    .filter((segment) => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      return !isUUID;
    })
    .map((segment, index, filteredSegments) => {
      const originalIndex = pathSegments.indexOf(segment);
      const rawPath = `/${pathSegments.slice(0, originalIndex + 1).join("/")}`;
      const path = pathOverrideMap[rawPath] || rawPath;
      const isLast = index === filteredSegments.length - 1;
      const name = routeNameMap[segment] || toTitleCaseSegment(segment);

      return {
        name,
        path,
        isLast,
      };
    });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="flex items-center">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map((item) => (
          <BreadcrumbItem key={item.path}>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            {item.isLast ? (
              <BreadcrumbPage>{item.name}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link to={item.path}>{item.name}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
