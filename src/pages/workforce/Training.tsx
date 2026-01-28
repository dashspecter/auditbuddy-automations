import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, BookOpen, Users, Calendar, Clock, ChevronRight, 
  GraduationCap, Target, Search, Filter
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTrainingModules } from "@/hooks/useTrainingModules";
import { useTrainingAssignments } from "@/hooks/useTrainingAssignments";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTrainingModule } from "@/hooks/useTrainingModules";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";

const Training = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("modules");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: modules = [], isLoading: modulesLoading } = useTrainingModules();
  const { data: assignments = [], isLoading: assignmentsLoading } = useTrainingAssignments(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const { data: roles = [] } = useEmployeeRoles();
  const createModule = useCreateTrainingModule();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    duration_days: 5,
    difficulty_level: 1,
    target_role_id: "__any__",
  });

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    await createModule.mutateAsync({
      ...formData,
      target_role_id: formData.target_role_id === "__any__" ? null : formData.target_role_id,
    });
    setCreateOpen(false);
    setFormData({
      name: "",
      description: "",
      category: "",
      duration_days: 5,
      difficulty_level: 1,
      target_role_id: "__any__",
    });
  };

  const filteredModules = modules.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAssignments = assignments.filter(a =>
    a.trainee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.module?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return { label: 'Beginner', color: 'bg-green-100 text-green-800' };
      case 2: return { label: 'Easy', color: 'bg-lime-100 text-lime-800' };
      case 3: return { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' };
      case 4: return { label: 'Advanced', color: 'bg-orange-100 text-orange-800' };
      case 5: return { label: 'Expert', color: 'bg-red-100 text-red-800' };
      default: return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            {t('training.title', 'Training')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('training.description', 'Manage training modules and staff onboarding')}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('training.newModule', 'New Module')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('training.createModule', 'Create Training Module')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateModule} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('common.name', 'Name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Kitchen Level 1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">{t('common.description', 'Description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">{t('common.category', 'Category')}</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Kitchen, Service"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">{t('training.durationDays', 'Duration (days)')}</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      max={90}
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('training.difficulty', 'Difficulty')}</Label>
                    <Select
                      value={formData.difficulty_level.toString()}
                      onValueChange={(v) => setFormData({ ...formData, difficulty_level: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Beginner</SelectItem>
                        <SelectItem value="2">2 - Easy</SelectItem>
                        <SelectItem value="3">3 - Intermediate</SelectItem>
                        <SelectItem value="4">4 - Advanced</SelectItem>
                        <SelectItem value="5">5 - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('training.targetRole', 'Target Role')}</Label>
                    <Select
                      value={formData.target_role_id}
                      onValueChange={(v) => setFormData({ ...formData, target_role_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any role" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="__any__">Any role</SelectItem>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button type="submit" disabled={createModule.isPending}>
                    {t('common.create', 'Create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => navigate('/workforce/training/assignments/new')}>
            <Users className="mr-2 h-4 w-4" />
            {t('training.assignTrainee', 'Assign Trainee')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="modules" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t('training.modules', 'Modules')}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Users className="h-4 w-4" />
            {t('training.assignments', 'Assignments')}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t('training.calendar', 'Calendar')}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search', 'Search...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeTab === 'assignments' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                <SelectItem value="planned">{t('status.planned', 'Planned')}</SelectItem>
                <SelectItem value="active">{t('status.active', 'Active')}</SelectItem>
                <SelectItem value="completed">{t('status.completed', 'Completed')}</SelectItem>
                <SelectItem value="paused">{t('status.paused', 'Paused')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="modules" className="mt-6">
          {modulesLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            </div>
          ) : filteredModules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t('training.noModules', 'No training modules yet')}</p>
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('training.createFirst', 'Create your first module')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModules.map((module) => {
                const difficulty = getDifficultyLabel(module.difficulty_level);
                return (
                  <Card
                    key={module.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow group"
                    onClick={() => navigate(`/workforce/training/modules/${module.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex gap-2">
                          {!module.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Badge className={difficulty.color}>{difficulty.label}</Badge>
                        </div>
                      </div>
                      <CardTitle className="mt-3 group-hover:text-primary transition-colors">
                        {module.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {module.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {module.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {module.duration_days} {t('common.days', 'days')}
                          </div>
                          {module.target_role && (
                            <div className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {module.target_role.name}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          {assignmentsLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t('training.noAssignments', 'No training assignments yet')}</p>
                <Button className="mt-4" onClick={() => navigate('/workforce/training/assignments/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('training.assignFirst', 'Assign first trainee')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/workforce/training/assignments/${assignment.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-primary/10">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{assignment.trainee?.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.module?.name} • {t('training.startDate', 'Start')}: {assignment.start_date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {assignment.trainer && (
                          <div className="text-sm text-muted-foreground">
                            {t('training.trainer', 'Trainer')}: {assignment.trainer.full_name}
                          </div>
                        )}
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {t('training.calendarComingSoon', 'Training calendar integration with shifts is available in the Shifts page')}
              </p>
              <Button className="mt-4" variant="outline" onClick={() => navigate('/workforce/shifts')}>
                {t('training.viewShifts', 'View Shifts Calendar')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Training;
