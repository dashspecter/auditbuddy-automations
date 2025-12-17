import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, FileText, Clock, CheckCircle, Edit } from 'lucide-react';
import { useCmmsProcedures } from '@/hooks/useCmmsProcedures';
import { NewProcedureDialog } from '@/components/cmms/NewProcedureDialog';
import { useNavigate } from 'react-router-dom';

export default function Procedures() {
  const navigate = useNavigate();
  const { data: procedures, isLoading } = useCmmsProcedures();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);

  const filteredProcedures = procedures?.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Procedures</h1>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Procedure
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search procedures (title, steps, tags)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Procedures List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading procedures...</div>
        ) : filteredProcedures.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No procedures yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Create reusable procedures with step-by-step checklists for your maintenance tasks.
              </p>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Procedure
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProcedures.map((procedure) => (
              <Card 
                key={procedure.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/cmms/procedures/${procedure.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold line-clamp-1">{procedure.title}</h3>
                    {procedure.is_published ? (
                      <Badge variant="default" className="shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        v{procedure.version}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        <Edit className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                  </div>
                  
                  {procedure.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {procedure.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {procedure.estimated_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {procedure.estimated_minutes} min
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NewProcedureDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </AppLayout>
  );
}
