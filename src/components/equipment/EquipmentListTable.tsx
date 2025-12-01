import { useState } from "react";
import { useEquipmentPaginated } from "@/hooks/useEquipment";
import { useLocations } from "@/hooks/useLocations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EquipmentRiskBadge } from "./EquipmentRiskBadge";
import { format } from "date-fns";

export const EquipmentListTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  const { data: equipmentData, isLoading } = useEquipmentPaginated({ 
    locationId: locationFilter || undefined,
    status: statusFilter || undefined,
    page: currentPage,
    pageSize 
  });
  const { data: locations } = useLocations();
  
  const equipment = equipmentData?.data || [];

  // Client-side search filtering (after server-side location and status filtering)
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.model_type && item.model_type.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });
  
  const totalPages = equipmentData?.pageCount || 1;
  const totalCount = equipmentData?.count || 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Locations</SelectItem>
            {locations?.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading equipment...</div>
      ) : filteredEquipment && filteredEquipment.length > 0 ? (
        <>
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
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} equipment items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
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
