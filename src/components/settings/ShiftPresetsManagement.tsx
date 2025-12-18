import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { useShiftPresets, useCreateShiftPreset, useUpdateShiftPreset, useDeleteShiftPreset, ShiftPreset } from "@/hooks/useShiftPresets";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const ShiftPresetsManagement = () => {
  const { t } = useTranslation();
  const { data: presets = [], isLoading } = useShiftPresets();
  const createPreset = useCreateShiftPreset();
  const updatePreset = useUpdateShiftPreset();
  const deletePreset = useDeleteShiftPreset();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ShiftPreset | null>(null);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    start_time: "",
    end_time: "",
    display_order: presets.length,
  });

  const handleOpenDialog = (preset?: ShiftPreset) => {
    if (preset) {
      setEditingPreset(preset);
      setFormData({
        name: preset.name,
        start_time: preset.start_time,
        end_time: preset.end_time,
        display_order: preset.display_order,
      });
    } else {
      setEditingPreset(null);
      setFormData({
        name: "",
        start_time: "",
        end_time: "",
        display_order: presets.length,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPreset(null);
    setFormData({
      name: "",
      start_time: "",
      end_time: "",
      display_order: presets.length,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.start_time || !formData.end_time) {
      return;
    }

    try {
      if (editingPreset) {
        await updatePreset.mutateAsync({
          id: editingPreset.id,
          ...formData,
        });
      } else {
        await createPreset.mutateAsync({
          ...formData,
          is_active: true,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving shift preset:", error);
    }
  };

  const handleDelete = async () => {
    if (!deletingPresetId) return;
    
    try {
      await deletePreset.mutateAsync(deletingPresetId);
      setDeleteDialogOpen(false);
      setDeletingPresetId(null);
    } catch (error) {
      console.error("Error deleting shift preset:", error);
    }
  };

  const openDeleteDialog = (presetId: string) => {
    setDeletingPresetId(presetId);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return <div>{t('locations.shiftPresets.loading')}</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('locations.shiftPresets.title')}
              </CardTitle>
              <CardDescription>
                {t('locations.shiftPresets.subtitle')}
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('locations.shiftPresets.addPreset')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {presets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('locations.shiftPresets.noPresets')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('locations.shiftPresets.table.name')}</TableHead>
                  <TableHead>{t('locations.shiftPresets.table.startTime')}</TableHead>
                  <TableHead>{t('locations.shiftPresets.table.endTime')}</TableHead>
                  <TableHead>{t('locations.shiftPresets.table.duration')}</TableHead>
                  <TableHead className="text-right">{t('locations.shiftPresets.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presets.map((preset) => {
                  const start = preset.start_time;
                  const end = preset.end_time;
                  const duration = calculateDuration(start, end);
                  
                  return (
                    <TableRow key={preset.id}>
                      <TableCell className="font-medium">{preset.name}</TableCell>
                      <TableCell>{start}</TableCell>
                      <TableCell>{end}</TableCell>
                      <TableCell>{duration}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(preset)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(preset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPreset ? t('locations.shiftPresets.editPreset') : t('locations.shiftPresets.createPreset')}
            </DialogTitle>
            <DialogDescription>
              {t('locations.shiftPresets.dialogDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('locations.shiftPresets.presetName')} *</Label>
                <Input
                  id="name"
                  placeholder={t('locations.shiftPresets.presetNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">{t('locations.shiftPresets.startTime')} *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">{t('locations.shiftPresets.endTime')} *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createPreset.isPending || updatePreset.isPending}
              >
                {editingPreset ? t('common.update') : t('common.create')} {t('locations.shiftPresets.preset')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('locations.shiftPresets.deletePreset')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('locations.shiftPresets.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPresetId(null)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function calculateDuration(start: string, end: string): string {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  
  let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  
  // Handle overnight shifts
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
