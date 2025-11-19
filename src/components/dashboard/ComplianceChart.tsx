import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLocationAudits } from "@/hooks/useAudits";
import { useMemo, useRef } from "react";
import { subWeeks, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Download, Image } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COMPLIANCE_THRESHOLD = 80;

export const ComplianceChart = () => {
  const { data: audits, isLoading } = useLocationAudits();
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const weeklyData = useMemo(() => {
    if (!audits) return [];

    const now = new Date();
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, 3 - i));
      const weekEnd = endOfWeek(subWeeks(now, 3 - i));
      return {
        name: `Week ${i + 1}`,
        start: weekStart,
        end: weekEnd,
        compliant: 0,
        nonCompliant: 0,
      };
    });

    audits.forEach(audit => {
      const auditDate = new Date(audit.audit_date || audit.created_at);
      const score = audit.overall_score || 0;
      const isCompliant = score >= COMPLIANCE_THRESHOLD;

      weeks.forEach(week => {
        if (isWithinInterval(auditDate, { start: week.start, end: week.end })) {
          if (isCompliant) {
            week.compliant++;
          } else {
            week.nonCompliant++;
          }
        }
      });
    });

    return weeks.map(week => ({
      name: week.name,
      compliant: week.compliant,
      nonCompliant: week.nonCompliant,
    }));
  }, [audits]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  const exportChart = async (format: 'png' | 'svg') => {
    if (!chartRef.current) return;

    try {
      if (format === 'png') {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
        });
        const link = document.createElement('a');
        const filename = `compliance-trends-${new Date().toISOString().split('T')[0]}.png`;
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast({ title: "Success", description: "Chart exported as PNG" });
      } else {
        const svgElement = chartRef.current.querySelector('svg');
        if (!svgElement) throw new Error('No SVG found');
        
        const clonedSvg = svgElement.cloneNode(true) as SVGElement;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', 'white');
        clonedSvg.insertBefore(rect, clonedSvg.firstChild);

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(clonedSvg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        const filename = `compliance-trends-${new Date().toISOString().split('T')[0]}.svg`;
        link.download = filename;
        link.href = svgUrl;
        link.click();
        URL.revokeObjectURL(svgUrl);
        toast({ title: "Success", description: "Chart exported as SVG" });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  };

  return (
    <Card className="p-6" ref={chartRef}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Compliance Trends (Last 4 Weeks)</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportChart('png')}>
              <Image className="h-4 w-4 mr-2" />
              Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportChart('svg')}>
              <Download className="h-4 w-4 mr-2" />
              Export as SVG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="name" 
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
          <Bar 
            dataKey="compliant" 
            fill="hsl(var(--success))" 
            name="Compliant" 
            radius={[8, 8, 0, 0]}
          />
          <Bar 
            dataKey="nonCompliant" 
            fill="hsl(var(--destructive))" 
            name="Non-Compliant" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
