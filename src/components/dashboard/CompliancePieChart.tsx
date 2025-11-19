import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useLocationAudits } from "@/hooks/useAudits";
import { useMemo, useRef } from "react";
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
const COLORS = {
  compliant: "hsl(var(--success))",
  nonCompliant: "hsl(var(--destructive))",
};

export const CompliancePieChart = () => {
  const { data: audits, isLoading } = useLocationAudits();
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const pieData = useMemo(() => {
    if (!audits || audits.length === 0) return [];

    const compliant = audits.filter(a => (a.overall_score || 0) >= COMPLIANCE_THRESHOLD).length;
    const nonCompliant = audits.length - compliant;

    return [
      { name: 'Compliant', value: compliant },
      { name: 'Non-Compliant', value: nonCompliant },
    ];
  }, [audits]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Compliance</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!audits || audits.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Compliance</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No audit data available
        </div>
      </Card>
    );
  }

  const compliantPercentage = Math.round((pieData[0].value / audits.length) * 100);

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
        const filename = `compliance-overview-${new Date().toISOString().split('T')[0]}.png`;
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
        const filename = `compliance-overview-${new Date().toISOString().split('T')[0]}.svg`;
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
        <h3 className="text-lg font-semibold">Overall Compliance</h3>
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
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-primary">{compliantPercentage}%</div>
        <p className="text-sm text-muted-foreground">
          {pieData[0].value} of {audits.length} audits compliant
        </p>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            <Cell key="compliant" fill={COLORS.compliant} />
            <Cell key="nonCompliant" fill={COLORS.nonCompliant} />
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
