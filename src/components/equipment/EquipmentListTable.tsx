import { useState, useCallback } from "react";
import { useEquipmentCursor, type Equipment, type EquipmentCursorPage } from "@/hooks/useEquipment";
import { useLocations } from "@/hooks/useLocations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, ChevronLeft, ChevronRight, MapPin, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { EquipmentRiskBadge } from "./EquipmentRiskBadge";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCard, MobileCardHeader, MobileCardRow } from "@/components/ui/responsive-table";

interface CursorState {
  val: string;
  id: string;
}

export const EquipmentListTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const pageSize = 20;
  const isMobile = useIsMobile();

  // Cursor-based pagination state
  const [cursor, setCursor] = useState<CursorState | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(CursorState | null)[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  const resetPagination = useCallback(() => {
    setCursor(null);
    setCursorHistory([]);
    setPageIndex(0);
  }, []);
  
  const { data: equipmentData, isLoading } = useEquipmentCursor({ 
    locationId: locationFilter !== "all" ? locationFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    pageSize,
    cursor: cursor?.val,
    cursorId: cursor?.id,
  });
  const { data: locations } = useLocations();
  
  const equipment = equipmentData?.data || [];

  // Client-side search filtering
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.model_type && item.model_type.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });
  
  const totalCount = equipmentData?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = pageIndex + 1;
  const hasMore = equipmentData?.hasMore || false;

  const goNext = () => {
    if (!equipmentData?.nextCursor || !equipmentData?.nextCursorId) return;
    setCursorHistory(h => [...h, cursor]);
    setCursor({ val: equipmentData.nextCursor, id: equipmentData.nextCursorId });
    setPageIndex(p => p + 1);
  };

  const goPrev = () => {
    if (cursorHistory.length === 0) return;
    const prev = cursorHistory[cursorHistory.length - 1];
    setCursorHistory(h => h.slice(0, -1));
    setCursor(prev);
    setPageIndex(p => Math.max(0, p - 1));
  };

  const renderMobileCard = (item: typeof filteredEquipment[0]) => (
    <MobileCard key={item.id}>
      <MobileCardHeader
        title={item.name}
        subtitle={item.model_type || "No model specified"}
        badge={
          <EquipmentRiskBadge
            lastCheckDate={item.last_check_date}
            nextCheckDate={item.next_check_date}
            status={item.status}
          />
        }
        actions={
          <Link to={`/equipment/${item.id}`}>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
      <div className="space-y-1 border-t pt-3">
        <MobileCardRow
          label="Location"
          value={
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.locations?.name || "-"}
            </span>
          }
        />
        <MobileCardRow
          label="Last Check"
          value={
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {item.last_check_date ? format(new Date(item.last_check_date), "PP") : "-"}
            </span>
          }
        />
        <MobileCardRow
          label="Next Check"
          value={item.next_check_date ? format(new Date(item.next_check_date), "PP") : "-"}
        />
      </div>
    </MobileCard>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
          <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); resetPagination(); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPagination(); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading equipment...</div>
      ) : filteredEquipment && filteredEquipment.length > 0 ? (
        <>
          {isMobile ? (
            <div className="space-y-3">
              {filteredEquipment.map(renderMobileCard)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Model/Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead>Next Check</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.model_type || "-"}</TableCell>
                    <TableCell>{item.locations?.name}</TableCell>
                    <TableCell>
                      {item.last_check_date ? format(new Date(item.last_check_date), "PP") : "-"}
                    </TableCell>
                    <TableCell>
                      {item.next_check_date ? format(new Date(item.next_check_date), "PP") : "-"}
                    </TableCell>
                    <TableCell>
                      <EquipmentRiskBadge
                        lastCheckDate={item.last_check_date}
                        nextCheckDate={item.next_check_date}
                        status={item.status}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/equipment/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {(pageIndex * pageSize) + 1} to {Math.min((pageIndex + 1) * pageSize, totalCount)} of {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrev}
                  disabled={pageIndex === 0}
                  className="h-10 sm:h-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>
                <div className="text-sm text-muted-foreground px-2">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goNext}
                  disabled={!hasMore}
                  className="h-10 sm:h-9"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No equipment found.</p>
          <p className="text-sm mt-2">Try adjusting your filters or add new equipment.</p>
        </div>
      )}
    </div>
  );
};
