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

const routeNameMap: Record<string, string> = {
  dashboard: "Home",
  workforce: "Workforce",
  staff: "Staff",
  shifts: "Shifts",
  attendance: "Attendance",
  "time-off": "Time Off",
  payroll: "Payroll",
  audits: "Audits",
  tasks: "Tasks",
  equipment: "Equipment",
  inventory: "Inventory",
  documents: "Documents",
  insights: "Insights",
  integrations: "Integrations",
  locations: "Locations",
  admin: "Admin",
  settings: "Settings",
  company: "Company",
  pricing: "Billing & Modules",
  new: "New",
  edit: "Edit",
  "staff-audits": "Employee Audits",
  reports: "Reports",
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0 || pathSegments[0] === "dashboard") {
    return null; // Don't show breadcrumbs on home page
  }

  const breadcrumbItems = pathSegments
    .filter((segment, index) => {
      // Hide UUID segments (staff-audits/:id pattern)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      return !isUUID;
    })
    .map((segment, index, filteredSegments) => {
      // Build path from original segments up to this filtered segment
      const originalIndex = pathSegments.indexOf(segment);
      const path = `/${pathSegments.slice(0, originalIndex + 1).join("/")}`;
      const isLast = index === filteredSegments.length - 1;
      const name = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

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
        
        {breadcrumbItems.map((item, index) => (
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