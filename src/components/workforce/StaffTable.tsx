import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEmployeesCursor, type Employee, type CursorPage } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, X, Filter, ChevronLeft, ChevronRight, Edit, MapPin, Phone, Mail, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import { ResetPasswordDialog } from "@/components/ResetPasswordDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCard, MobileCardHeader, MobileCardRow } from "@/components/ui/responsive-table";

interface CursorState {
  val: string;
  id: string;
}

export const StaffTable = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [employeeToResetPassword, setEmployeeToResetPassword] = useState<Employee | null>(null);
  const pageSize = 20;
  const isMobile = useIsMobile();

  // Cursor-based pagination state
  const [cursor, setCursor] = useState<CursorState | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(CursorState | null)[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    resetPagination();
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    setSearchTimer(timer);
  };

  const resetPagination = useCallback(() => {
    setCursor(null);
    setCursorHistory([]);
    setPageIndex(0);
  }, []);

  const { data: employeesData, isLoading } = useEmployeesCursor({ 
    locationId: locationFilter || undefined,
    searchTerm: debouncedSearch || undefined,
    roleFilter: roleFilter || undefined,
    statusFilter: statusFilter || undefined,
    pageSize,
    cursor: cursor?.val,
    cursorId: cursor?.id,
  });
  const { data: locations } = useLocations();
  const { data: roles = [] } = useEmployeeRoles();
  const filteredStaff = employeesData?.data || [];

  const roleMap = new Map(roles.map(role => [role.name, role]));
  const uniqueRoles: string[] = roles.map(r => r.name).filter(Boolean);
  const activeFilterCount = [searchTerm, locationFilter, roleFilter, statusFilter].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setLocationFilter("");
    setRoleFilter("");
    setStatusFilter("");
    resetPagination();
  };

  const totalCount = employeesData?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = pageIndex + 1;
  const hasMore = employeesData?.hasMore || false;

  const goNext = () => {
    if (!employeesData?.nextCursor || !employeesData?.nextCursorId) return;
    setCursorHistory(h => [...h, cursor]);
    setCursor({ val: employeesData.nextCursor, id: employeesData.nextCursorId });
    setPageIndex(p => p + 1);
  };

  const goPrev = () => {
    if (cursorHistory.length === 0) return;
    const prev = cursorHistory[cursorHistory.length - 1];
    setCursorHistory(h => h.slice(0, -1));
    setCursor(prev);
    setPageIndex(p => Math.max(0, p - 1));
  };

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value === "all" ? "" : value);
    resetPagination();
  };

  const renderMobileCard = (member: Employee) => {
    const roleData = roleMap.get(member.role);
    const additionalLocationsCount = member.staff_locations?.length || 0;
    const hasMultipleLocations = additionalLocationsCount > 0;
    const totalLocationsCount = additionalLocationsCount + 1;

    return (
      <MobileCard key={member.id}>
        <MobileCardHeader
          title={member.full_name}
          badge={
            roleData ? (
              <Badge 
                variant="outline" 
                style={{ 
                  backgroundColor: `${roleData.color}20`,
                  borderColor: roleData.color,
                  color: roleData.color
                }}
                className="text-xs"
              >
                {member.role}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">{member.role}</Badge>
            )
          }
          actions={
            <div className="flex items-center gap-1">
              {member.user_id && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 w-9 p-0"
                  onClick={() => {
                    setEmployeeToResetPassword(member);
                    setResetPasswordDialogOpen(true);
                  }}
                  title={t('workforce.employees.resetPassword')}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0"
                onClick={() => {
                  setSelectedEmployee(member);
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Link to={`/workforce/staff/${member.id}`}>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          }
        />
        <div className="space-y-1 border-t pt-3">
          <MobileCardRow
            label={t('workforce.components.staffTable.status')}
            value={
              <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-xs">
                {member.status === "active" ? t('workforce.components.staffTable.active') : t('workforce.components.staffTable.inactive')}
              </Badge>
            }
          />
          <MobileCardRow
            label={t('workforce.components.staffTable.location')}
            value={
              hasMultipleLocations ? (
                <Badge variant="secondary" className="text-xs">
                  {t('workforce.components.staffTable.allLocationsCount', { count: totalLocationsCount })}
                </Badge>
              ) : (
                <span className="flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {member.locations?.name || '-'}
                </span>
              )
            }
          />
          {member.contract_type && (
            <MobileCardRow label={t('workforce.components.staffTable.contract')} value={member.contract_type} />
          )}
          {member.email && (
            <MobileCardRow
              label={t('workforce.components.staffTable.contact')}
              value={
                <span className="flex items-center gap-1 text-xs truncate max-w-[150px]">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  {member.email}
                </span>
              }
            />
          )}
          {member.phone && (
            <MobileCardRow
              label={t('workforce.components.staffTable.contact')}
              value={
                <span className="flex items-center gap-1 text-xs">
                  <Phone className="h-3 w-3" />
                  {member.phone}
                </span>
              }
            />
          )}
        </div>
      </MobileCard>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('workforce.components.staffTable.searchPlaceholder')}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Select value={locationFilter || "all"} onValueChange={handleFilterChange(setLocationFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('workforce.components.staffTable.location')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('workforce.components.staffTable.allLocations')}</SelectItem>
                {locations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter || "all"} onValueChange={handleFilterChange(setRoleFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('workforce.components.staffTable.role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('workforce.components.staffTable.allRoles')}</SelectItem>
                {uniqueRoles.filter(role => role && role.trim() !== "").map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter || "all"} onValueChange={handleFilterChange(setStatusFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('workforce.components.staffTable.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('workforce.components.staffTable.allStatus')}</SelectItem>
                <SelectItem value="active">{t('workforce.components.staffTable.active')}</SelectItem>
                <SelectItem value="inactive">{t('workforce.components.staffTable.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                {t('workforce.components.staffTable.filtersActive', { count: activeFilterCount })}
                {` • ${t('workforce.components.staffTable.results', { count: totalCount })}`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              {t('workforce.components.staffTable.clearAll')}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('workforce.components.staffTable.loadingStaff')}</div>
      ) : filteredStaff && filteredStaff.length > 0 ? (
        <>
          {isMobile ? (
            <div className="space-y-3">
              {filteredStaff.map(renderMobileCard)}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('workforce.components.staffTable.name')}</TableHead>
                    <TableHead>{t('workforce.components.staffTable.role')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('workforce.components.staffTable.location')}</TableHead>
                    <TableHead>{t('workforce.components.staffTable.status')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('workforce.components.staffTable.contract')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('workforce.components.staffTable.contact')}</TableHead>
                    <TableHead className="text-right">{t('workforce.components.staffTable.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => {
                    const roleData = roleMap.get(member.role);
                    const additionalLocationsCount = member.staff_locations?.length || 0;
                    const hasMultipleLocations = additionalLocationsCount > 0;
                    const totalLocationsCount = additionalLocationsCount + 1;
                    
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
                      <TableCell className="hidden sm:table-cell">
                        {hasMultipleLocations ? (
                          <Badge variant="secondary" className="text-xs">
                            {t('workforce.components.staffTable.allLocationsCount', { count: totalLocationsCount })}
                          </Badge>
                        ) : (
                          member.locations?.name || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === "active" ? "default" : "secondary"}>
                          {member.status === "active" ? t('workforce.components.staffTable.active') : t('workforce.components.staffTable.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{member.contract_type}</TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">
                        {member.email && <div className="truncate max-w-[150px]">{member.email}</div>}
                        {member.phone && <div className="text-muted-foreground truncate max-w-[150px]">{member.phone}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {member.user_id && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setEmployeeToResetPassword(member);
                                setResetPasswordDialogOpen(true);
                              }}
                              title={t('workforce.employees.resetPassword')}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedEmployee(member);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">{t('workforce.components.staffTable.edit')}</span>
                          </Button>
                          <Link to={`/workforce/staff/${member.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">{t('workforce.components.staffTable.view')}</span>
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                {t('workforce.components.staffTable.showing', { from: (pageIndex * pageSize) + 1, to: Math.min((pageIndex + 1) * pageSize, totalCount), total: totalCount })}
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
                  <span className="hidden sm:inline ml-1">{t('workforce.components.staffTable.previous')}</span>
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
                  <span className="hidden sm:inline mr-1">{t('workforce.components.staffTable.next')}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground space-y-4">
          <div>
            <p className="font-medium">{t('workforce.components.staffTable.noStaffFound')}</p>
            {activeFilterCount > 0 ? (
              <p className="text-sm mt-2">
                {t('workforce.components.staffTable.noResultsFilter')}
              </p>
            ) : (
              <p className="text-sm mt-2">
                {t('workforce.components.staffTable.noStaffAdded')}
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
              {t('workforce.components.staffTable.clearAllFilters')}
            </Button>
          )}
        </div>
      )}

      <EmployeeDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
        employee={selectedEmployee || undefined}
        locations={locations || []}
      />

      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={(open) => {
          setResetPasswordDialogOpen(open);
          if (!open) setEmployeeToResetPassword(null);
        }}
        employee={employeeToResetPassword ? {
          id: employeeToResetPassword.id,
          user_id: employeeToResetPassword.user_id || null,
          full_name: employeeToResetPassword.full_name,
          email: employeeToResetPassword.email || null
        } : null}
      />
    </div>
  );
};
