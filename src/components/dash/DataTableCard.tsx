import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataTableCardProps {
  columns: string[];
  rows: (string | number | null)[][];
  title?: string;
}

export function DataTableCard({ columns, rows, title }: DataTableCardProps) {
  if (!columns?.length || !rows?.length) return null;

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden my-2">
      {title && (
        <div className="px-3 py-2 bg-muted/40 border-b border-border/40">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
        </div>
      )}
      <ScrollArea className="max-h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className="text-xs font-semibold py-2 px-3 whitespace-nowrap">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, ri) => (
              <TableRow key={ri}>
                {row.map((cell, ci) => (
                  <TableCell key={ci} className="text-xs py-1.5 px-3 whitespace-nowrap">
                    {cell ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
