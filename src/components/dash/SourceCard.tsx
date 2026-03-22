import { Badge } from "@/components/ui/badge";
import { Database, MapPin, Users, ClipboardCheck, Wrench, FileText } from "lucide-react";

const MODULE_ICONS: Record<string, React.ElementType> = {
  audits: ClipboardCheck,
  workforce: Users,
  locations: MapPin,
  cmms: Wrench,
  documents: FileText,
  default: Database,
};

const MODULE_COLORS: Record<string, string> = {
  audits: "bg-blue-500/10 text-blue-600 border-blue-200",
  workforce: "bg-green-500/10 text-green-600 border-green-200",
  locations: "bg-orange-500/10 text-orange-600 border-orange-200",
  cmms: "bg-purple-500/10 text-purple-600 border-purple-200",
  documents: "bg-amber-500/10 text-amber-600 border-amber-200",
  default: "bg-muted text-muted-foreground border-border",
};

interface SourceCardProps {
  module: string;
  entity: string;
  id?: string;
  label?: string;
}

export function SourceCard({ module, entity, label }: SourceCardProps) {
  const Icon = MODULE_ICONS[module] || MODULE_ICONS.default;
  const colorClass = MODULE_COLORS[module] || MODULE_COLORS.default;

  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-normal rounded-lg ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{label || entity}</span>
    </Badge>
  );
}
