import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, MapPin, Clock } from "lucide-react";
import { useLocations, useDeleteLocation, Location } from "@/hooks/useLocations";
import { LocationDialog } from "@/components/locations/LocationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationDataMigration } from "@/components/locations/LocationDataMigration";
import { EmptyState } from "@/components/EmptyState";
import { AutoClockoutSettings } from "@/components/settings/AutoClockoutSettings";
import { ShiftPresetsManagement } from "@/components/settings/ShiftPresetsManagement";
import { useCompany } from "@/hooks/useCompany";

const LocationsManagement = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "locations";
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const { data: company } = useCompany();
  const { data: locations, isLoading } = useLocations(true);
  const deleteLocation = useDeleteLocation();

  const handleTabChange = (value: string) => {
    if (value === "locations") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setLocationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (locationToDelete) {
      await deleteLocation.mutateAsync(locationToDelete);
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    }
  };

  const handleAddNew = () => {
    setSelectedLocation(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t('locations.management.title')}</h1>
            <p className="text-muted-foreground">
              {t('locations.management.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('locations.management.tabs.locations')}
          </TabsTrigger>
          <TabsTrigger value="auto-clockout" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('locations.management.tabs.autoClockOut')}
          </TabsTrigger>
          <TabsTrigger value="shift-presets" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('locations.management.tabs.shiftPresets')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t('locations.management.addLocation')}
            </Button>
          </div>

          {/* Migration Tool */}
          <LocationDataMigration />

        <Card>
          <CardHeader>
            <CardTitle>{t('locations.management.allLocations')}</CardTitle>
            <CardDescription>
              {t('locations.management.allLocationsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : locations && locations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('locations.management.table.name')}</TableHead>
                    <TableHead>{t('locations.management.table.city')}</TableHead>
                    <TableHead>{t('locations.management.table.type')}</TableHead>
                    <TableHead>{t('locations.management.table.address')}</TableHead>
                    <TableHead>{t('locations.management.table.status')}</TableHead>
                    <TableHead className="text-right">{t('locations.management.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.city || "-"}</TableCell>
                      <TableCell>{location.type || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {location.address || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={location.status === "active" ? "default" : "secondary"}
                        >
                          {location.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(location)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(location.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={MapPin}
                title={t('locations.management.noLocations')}
                description={t('locations.management.noLocationsDesc')}
                action={{
                  label: t('locations.management.addLocation'),
                  onClick: handleAddNew
                }}
              />
            )}
          </CardContent>
        </Card>

        <LocationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          location={selectedLocation}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('locations.management.deleteDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('locations.management.deleteDialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>{t('common.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </TabsContent>

        <TabsContent value="auto-clockout" className="mt-6">
          {company && <AutoClockoutSettings company={company} />}
        </TabsContent>

        <TabsContent value="shift-presets" className="mt-6">
          <ShiftPresetsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LocationsManagement;
