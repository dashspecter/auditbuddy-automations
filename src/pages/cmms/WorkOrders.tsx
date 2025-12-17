import { useState, useMemo } from "react";
import { Plus, Search, Filter, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkOrderCard, WorkOrderCardData } from "@/components/cmms/WorkOrderCard";
import { WorkOrderDetail } from "@/components/cmms/WorkOrderDetail";
import { NewWorkOrderDialog } from "@/components/cmms/NewWorkOrderDialog";
import { useCmmsWorkOrders, type CmmsWorkOrder } from "@/hooks/useCmmsWorkOrders";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkOrders() {
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<CmmsWorkOrder | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  
  const { data: workOrders, isLoading } = useCmmsWorkOrders();

  const filteredWorkOrders = useMemo(() => {
    if (!workOrders) return [];
    
    let filtered = workOrders;
    
    // Filter by tab
    if (tab === "todo") {
      filtered = filtered.filter(wo => 
        ['Open', 'OnHold', 'InProgress'].includes(wo.status)
      );
    } else {
      filtered = filtered.filter(wo => 
        ['Done', 'Cancelled'].includes(wo.status)
      );
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(wo =>
        wo.title.toLowerCase().includes(query) ||
        wo.wo_number.toString().includes(query)
      );
    }
    
    return filtered;
  }, [workOrders, tab, searchQuery]);

  const mapToCardData = (wo: CmmsWorkOrder): WorkOrderCardData => ({
    id: wo.id,
    wo_number: wo.wo_number,
    title: wo.title,
    status: wo.status as any,
    priority: wo.priority as any,
    due_at: wo.due_at,
    asset_name: null, // Would come from join
    location_name: null, // Would come from join
    assigned_user_name: null, // Would come from join
  });

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Top Bar */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold">Work Orders</h1>
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search work orders (title, asset, location, WO #)"
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                My Filters
              </Button>
              <Button onClick={() => setIsNewDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Work Order
              </Button>
            </div>
          </div>
          
          {/* Filter chips */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              Assigned to
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Due date
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Location
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Priority
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Status
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
              + Add filter
            </Button>
          </div>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Work Order List */}
          <div className="w-80 border-r flex flex-col bg-muted/30">
            <div className="p-3 border-b">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "todo" | "done")}>
                <TabsList className="w-full">
                  <TabsTrigger value="todo" className="flex-1">To Do</TabsTrigger>
                  <TabsTrigger value="done" className="flex-1">Done</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground mt-2">
                {tab === "todo" 
                  ? "To Do shows Open, On Hold, and In Progress."
                  : "Done shows completed and cancelled work orders."
                }
              </p>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))
                ) : filteredWorkOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">
                      {tab === "todo" 
                        ? "You're all clear. No work orders right now."
                        : "No completed work orders yet."
                      }
                    </p>
                  </div>
                ) : (
                  filteredWorkOrders.map((wo) => (
                    <WorkOrderCard
                      key={wo.id}
                      workOrder={mapToCardData(wo)}
                      isSelected={selectedWorkOrder?.id === wo.id}
                      onClick={() => setSelectedWorkOrder(wo)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Middle Column - Work Order Detail */}
          <div className="flex-1 border-r overflow-hidden">
          {selectedWorkOrder ? (
              <WorkOrderDetail workOrder={selectedWorkOrder} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No work order selected</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Select a work order from the list to view details, or create a new one.
                </p>
                <Button onClick={() => setIsNewDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Work Order
                </Button>
              </div>
            )}
          </div>

          {/* Right Column - Activity (collapsed by default) */}
          <div className="w-0 lg:w-64 overflow-hidden transition-all">
            {/* Activity panel - can be expanded later */}
          </div>
        </div>
      </div>

      <NewWorkOrderDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
      />
    </AppLayout>
  );
}
