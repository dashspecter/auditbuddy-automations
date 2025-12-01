import { useState } from "react";
import { useEmployeesPaginated } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, X, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export const StaffTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  const { data: employeesData, isLoading } = useEmployeesPaginated({ 
    locationId: locationFilter || undefined,
    page: currentPage,
    pageSize 
  });
  const { data: locations } = useLocations();
  const { data: roles = [] } = useEmployeeRoles();
  
  const staff = employeesData?.data || [];

  // Create a map of role names to role objects for quick lookup
  const roleMap = new Map(roles.map(role => [role.name, role]));

  // Client-side filtering for search, role, and status (after server-side location filtering)
  const filteredStaff = staff.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      member.full_name?.toLowerCase().includes(searchLower) ||
      member.role?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower);
    
    const matchesRole = !roleFilter || member.role === roleFilter;
    const matchesStatus = !statusFilter || member.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = [...new Set(staff.map(s => s.role) || [])];

  const activeFilterCount = [searchTerm, locationFilter, roleFilter, statusFilter].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchTerm("");
    setLocationFilter("");
    setRoleFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };
  
  const totalPages = employeesData?.pageCount || 1;
  const totalCount = employeesData?.count || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2">
            <Select value={locationFilter || "all"} onValueChange={(value) => setLocationFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[160px]">
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

            <Select value={roleFilter || "all"} onValueChange={(value) => setRoleFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Info & Clear Button */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                {filteredStaff && ` • ${filteredStaff.length} result${filteredStaff.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading staff...</div>
      ) : filteredStaff && filteredStaff.length > 0 ? (
        <>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Contract</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => {
                  const roleData = roleMap.get(member.role);
                  return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>
                      {roleData ? (
                        <Badge 
                          variant="outline" 
                          style={{ 
                            backgroundColor: `${roleData.color}20`,
                            borderColor: roleData.color,
                            color: roleData.color
                          }}
                        >
                          {member.role}
                        </Badge>
                      ) : (
                        <span>{member.role}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{member.locations?.name}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{member.contract_type}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">
                      {member.email && <div className="truncate max-w-[150px]">{member.email}</div>}
                      {member.phone && <div className="text-muted-foreground truncate max-w-[150px]">{member.phone}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/workforce/staff/${member.id}`}>
                        <Button variant="ghost" size="sm" className="touch-target">
                          <Eye className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} staff members
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
        <div className="text-center py-12 text-muted-foreground space-y-4">
          <div>
            <p className="font-medium">No staff members found</p>
            {activeFilterCount > 0 ? (
              <p className="text-sm mt-2">
                No results match your current filters. Try adjusting or clearing them.
              </p>
            ) : (
              <p className="text-sm mt-2">
                No staff members have been added yet.
              </p>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
