import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MapPin, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewAssetDialog } from "@/components/cmms/NewAssetDialog";
import { AssetStatusBadge } from "@/components/cmms/AssetStatusBadge";
import { CriticalityBadge } from "@/components/cmms/CriticalityBadge";
import { AssetFilters, type AssetFilterValues } from "@/components/cmms/AssetFilters";
import { useCmmsAssets, type CmmsAsset } from "@/hooks/useCmmsAssets";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

export default function Assets() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<AssetFilterValues>({});
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  
  const { data: assets, isLoading } = useCmmsAssets();

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    
    return assets.filter(asset => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          asset.name.toLowerCase().includes(query) ||
          asset.asset_code.toLowerCase().includes(query) ||
          asset.serial_number?.toLowerCase().includes(query) ||
          asset.location?.name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Location filter
      if (filters.locationId && asset.location_id !== filters.locationId) return false;
      
      // Category filter
      if (filters.categoryId && asset.category_id !== filters.categoryId) return false;
      
      // Status filter
      if (filters.status && asset.status !== filters.status) return false;
      
      // Criticality filter
      if (filters.criticality && asset.criticality !== filters.criticality) return false;
      
      return true;
    });
  }, [assets, searchQuery, filters]);

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t('cmms.assets')}</h1>
          
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('cmms.assetsPage.searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsNewDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t('cmms.assetsPage.newAsset')}
            </Button>
          </div>
        </div>

        {/* Filter chips */}
        <AssetFilters filters={filters} onFiltersChange={setFilters} />

        {/* Assets Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12">
                <div className="rounded-full bg-muted p-3 w-fit mx-auto mb-4">
                  <Wrench className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('cmms.assetsPage.noAssets')}</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  {t('cmms.assetsPage.noAssetsDescription')}
                </p>
                <Button onClick={() => setIsNewDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t('cmms.assetsPage.newAsset')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('cmms.assetsPage.table.asset')}</TableHead>
                    <TableHead>{t('cmms.assetsPage.table.location')}</TableHead>
                    <TableHead>{t('cmms.assetsPage.table.status')}</TableHead>
                    <TableHead>{t('cmms.assetsPage.table.criticality')}</TableHead>
                    <TableHead>{t('cmms.assetsPage.table.category')}</TableHead>
                    <TableHead className="text-right">{t('cmms.assetsPage.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow 
                      key={asset.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/cmms/assets/${asset.id}`)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-xs text-muted-foreground">{asset.asset_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {asset.location ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {asset.location.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AssetStatusBadge status={asset.status} />
                      </TableCell>
                      <TableCell>
                        <CriticalityBadge criticality={asset.criticality} />
                      </TableCell>
                      <TableCell>
                        {asset.category ? (
                          <span className="text-sm">{asset.category.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cmms/assets/${asset.id}`);
                          }}
                        >
                          {t('common.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
      </Card>

      <NewAssetDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
      />
    </div>
  );
}
