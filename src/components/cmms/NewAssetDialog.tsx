import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCmmsAsset, useCmmsAssetCategories, useCreateCmmsAssetCategory } from "@/hooks/useCmmsAssets";
import { useLocations } from "@/hooks/useLocations";
import { useToast } from "@/hooks/use-toast";

interface NewAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAssetDialog({ open, onOpenChange }: NewAssetDialogProps) {
  const { toast } = useToast();
  const createAsset = useCreateCmmsAsset();
  const createCategory = useCreateCmmsAssetCategory();
  const { data: locations } = useLocations();
  const { data: categories } = useCmmsAssetCategories();
  
  const [name, setName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [criticality, setCriticality] = useState("Medium");
  const [notes, setNotes] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await createCategory.mutateAsync({ name: newCategoryName.trim() });
      setCategoryId(newCat.id);
      setNewCategoryName("");
      setShowNewCategory(false);
      toast({ title: "Category created" });
    } catch {
      toast({ title: "Failed to create category", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !assetCode.trim()) {
      toast({ title: "Name and asset code are required", variant: "destructive" });
      return;
    }

    try {
      await createAsset.mutateAsync({
        name: name.trim(),
        asset_code: assetCode.trim(),
        location_id: locationId || undefined,
        category_id: categoryId || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        serial_number: serialNumber.trim() || undefined,
        criticality: criticality as any,
        notes: notes.trim() || undefined,
      });
      
      toast({ title: "Asset created" });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({ title: "Failed to create asset", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setName("");
    setAssetCode("");
    setLocationId("");
    setCategoryId("");
    setBrand("");
    setModel("");
    setSerialNumber("");
    setCriticality("Medium");
    setNotes("");
    setNewCategoryName("");
    setShowNewCategory(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., HVAC Unit 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-code">Asset Code *</Label>
              <Input
                id="asset-code"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                placeholder="e.g., HVAC-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              {showNewCategory ? (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleCreateCategory}
                    disabled={createCategory.isPending}
                  >
                    Add
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setShowNewCategory(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    onClick={() => setShowNewCategory(true)}
                    title="Create new category"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Carrier"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., 24ACC636"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g., SN-12345"
              />
            </div>
            <div className="space-y-2">
              <Label>Criticality</Label>
              <Select value={criticality} onValueChange={setCriticality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this asset..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createAsset.isPending}>
            {createAsset.isPending ? "Creating..." : "Create Asset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
