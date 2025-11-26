import { useState } from "react";
import { Header } from "@/components/Header";
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
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { useLocations, useDeleteLocation, Location } from "@/hooks/useLocations";
import { LocationDialog } from "@/components/locations/LocationDialog";
import { Skeleton } from "@/components/ui/skeleton";

const LocationsManagement = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const { data: locations, isLoading } = useLocations(true);
  const deleteLocation = useDeleteLocation();

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Locations Management</h1>
              <p className="text-muted-foreground">
                Manage your business locations and their details
              </p>
            </div>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Locations</CardTitle>
            <CardDescription>
              View and manage all locations in your system
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
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No locations found. Add your first location to get started.</p>
              </div>
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
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this location. This action cannot be undone.
                The location will be removed from all templates, schedules, and reports.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default LocationsManagement;
