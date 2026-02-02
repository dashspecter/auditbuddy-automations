import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Search, Package, Trash2, ArrowLeft } from "lucide-react";
import { useWasteProducts, useCreateWasteProduct, useUpdateWasteProduct, WasteProduct } from "@/hooks/useWaste";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { useSmartBack } from "@/hooks/useSmartBack";

export default function WasteProducts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useSmartBack({ adminFallback: "/admin/waste/entries" });
  
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<WasteProduct | null>(null);

  const { data: products, isLoading } = useWasteProducts(!showInactive);
  const createProduct = useCreateWasteProduct();
  const updateProduct = useUpdateWasteProduct();

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit_cost: 0,
    active: true,
  });

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleOpenDialog = (product?: WasteProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category || "",
        unit_cost: product.unit_cost,
        active: product.active,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        category: "",
        unit_cost: 0,
        active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingProduct) {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        ...formData,
        category: formData.category || null,
      });
    } else {
      await createProduct.mutateAsync({
        name: formData.name,
        category: formData.category || null,
        unit_cost: formData.unit_cost,
        uom: 'g',
        cost_model: 'per_kg',
        active: formData.active,
        photo_hint_url: null,
      });
    }
    setDialogOpen(false);
  };

  return (
    <ModuleGate module="wastage">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Waste Products</h1>
              <p className="text-muted-foreground mt-1">
                Configure products that can be logged as waste
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive" className="text-sm">Show inactive</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No waste products"
                description="Add products that employees can select when logging waste"
                action={{
                  label: "Add Product",
                  onClick: () => handleOpenDialog()
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Cost/kg (RON)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell className="text-right">{product.unit_cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct 
                  ? "Update the waste product details" 
                  : "Add a new product to the waste catalog"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Bread, Chicken, Vegetables"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Bakery, Meat, Produce"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Cost per kg (RON) *</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name || createProduct.isPending || updateProduct.isPending}
              >
                {createProduct.isPending || updateProduct.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGate>
  );
}
