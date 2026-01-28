import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Plus, Trash2, GripVertical, Clock, Target,
  BookOpen, CheckSquare, Edit, Save, X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useTrainingModule,
  useTrainingModuleDays,
  useCreateModuleDay,
  useUpdateModuleDay,
  useDeleteModuleDay,
  useCreateDayTask,
  useDeleteDayTask,
  useUpdateTrainingModule,
} from "@/hooks/useTrainingModules";

const TrainingModuleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const { data: module, isLoading: moduleLoading } = useTrainingModule(id);
  const { data: days = [], isLoading: daysLoading } = useTrainingModuleDays(id);
  
  const createDay = useCreateModuleDay();
  const updateDay = useUpdateModuleDay();
  const deleteDay = useDeleteModuleDay();
  const createTask = useCreateDayTask();
  const deleteTask = useDeleteDayTask();
  const updateModule = useUpdateTrainingModule();
  
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState(false);
  
  const [dayForm, setDayForm] = useState({
    title: "",
    notes: "",
  });
  
  const [taskForm, setTaskForm] = useState({
    task_title: "",
    task_description: "",
    requires_proof: false,
  });

  const [moduleForm, setModuleForm] = useState({
    name: "",
    description: "",
    duration_days: 1,
  });

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    const nextDayNumber = days.length > 0 
      ? Math.max(...days.map(d => d.day_number)) + 1 
      : 1;
    
    await createDay.mutateAsync({
      module_id: id,
      day_number: nextDayNumber,
      title: dayForm.title,
      notes: dayForm.notes || null,
    });
    
    setAddDayOpen(false);
    setDayForm({ title: "", notes: "" });
  };

  const handleAddTask = async (e: React.FormEvent, dayId: string) => {
    e.preventDefault();
    
    const day = days.find(d => d.id === dayId);
    const nextOrder = day?.tasks?.length || 0;
    
    await createTask.mutateAsync({
      module_day_id: dayId,
      task_title: taskForm.task_title,
      task_description: taskForm.task_description || null,
      requires_proof: taskForm.requires_proof,
      sort_order: nextOrder,
    });
    
    setAddTaskOpen(null);
    setTaskForm({ task_title: "", task_description: "", requires_proof: false });
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!id) return;
    if (!confirm(t('training.confirmDeleteDay', 'Delete this day and all its tasks?'))) return;
    await deleteDay.mutateAsync({ id: dayId, moduleId: id });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(t('training.confirmDeleteTask', 'Delete this task?'))) return;
    await deleteTask.mutateAsync(taskId);
  };

  const handleEditModule = () => {
    if (module) {
      setModuleForm({
        name: module.name,
        description: module.description || "",
        duration_days: module.duration_days,
      });
      setEditingModule(true);
    }
  };

  const handleSaveModule = async () => {
    if (!id) return;
    await updateModule.mutateAsync({
      id,
      name: moduleForm.name,
      description: moduleForm.description,
      duration_days: moduleForm.duration_days,
    });
    setEditingModule(false);
  };

  if (moduleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('training.moduleNotFound', 'Module not found')}</p>
        <Button className="mt-4" onClick={() => navigate('/workforce/training')}>
          {t('common.goBack', 'Go back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/workforce/training')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          {editingModule ? (
            <div className="flex items-center gap-2">
              <Input
                value={moduleForm.name}
                onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                className="text-2xl font-bold h-auto py-1"
              />
              <Button size="sm" onClick={handleSaveModule}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingModule(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{module.name}</h1>
              <Button size="sm" variant="ghost" onClick={handleEditModule}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-4 mt-1 text-muted-foreground">
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
            {module.category && (
              <Badge variant="outline">{module.category}</Badge>
            )}
          </div>
        </div>
      </div>

      {module.description && (
        <Card>
          <CardContent className="py-4">
            <p className="text-muted-foreground">{module.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('training.trainingDays', 'Training Days')}
          </CardTitle>
          <Dialog open={addDayOpen} onOpenChange={setAddDayOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('training.addDay', 'Add Day')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('training.addTrainingDay', 'Add Training Day')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDay} className="space-y-4">
                <div>
                  <Label>{t('common.title', 'Title')}</Label>
                  <Input
                    value={dayForm.title}
                    onChange={(e) => setDayForm({ ...dayForm, title: e.target.value })}
                    placeholder={`Day ${days.length + 1}: ...`}
                    required
                  />
                </div>
                <div>
                  <Label>{t('common.notes', 'Notes')}</Label>
                  <Textarea
                    value={dayForm.notes}
                    onChange={(e) => setDayForm({ ...dayForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddDayOpen(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button type="submit" disabled={createDay.isPending}>
                    {t('common.add', 'Add')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {daysLoading ? (
            <div className="py-8 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            </div>
          ) : days.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('training.noDays', 'No training days defined yet')}</p>
              <p className="text-sm">{t('training.addDayHint', 'Add days to structure your training module')}</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {days.map((day) => (
                <AccordionItem key={day.id} value={day.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">Day {day.day_number}</Badge>
                      <span className="font-medium">{day.title}</span>
                      <Badge variant="secondary" className="ml-2">
                        {day.tasks?.length || 0} {t('common.tasks', 'tasks')}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {day.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                          {day.notes}
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        {day.tasks?.map((task, idx) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg group"
                          >
                            <CheckSquare className="h-4 w-4 mt-0.5 text-primary" />
                            <div className="flex-1">
                              <div className="font-medium">{task.task_title}</div>
                              {task.task_description && (
                                <p className="text-sm text-muted-foreground">{task.task_description}</p>
                              )}
                              {task.requires_proof && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {t('training.requiresProof', 'Requires proof')}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Dialog open={addTaskOpen === day.id} onOpenChange={(open) => setAddTaskOpen(open ? day.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="mr-1 h-3 w-3" />
                              {t('training.addTask', 'Add Task')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('training.addTaskToDay', 'Add Task to Day')} {day.day_number}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => handleAddTask(e, day.id)} className="space-y-4">
                              <div>
                                <Label>{t('common.title', 'Title')}</Label>
                                <Input
                                  value={taskForm.task_title}
                                  onChange={(e) => setTaskForm({ ...taskForm, task_title: e.target.value })}
                                  placeholder="e.g., Learn station setup"
                                  required
                                />
                              </div>
                              <div>
                                <Label>{t('common.description', 'Description')}</Label>
                                <Textarea
                                  value={taskForm.task_description}
                                  onChange={(e) => setTaskForm({ ...taskForm, task_description: e.target.value })}
                                  rows={2}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="requires_proof"
                                  checked={taskForm.requires_proof}
                                  onCheckedChange={(v) => setTaskForm({ ...taskForm, requires_proof: v as boolean })}
                                />
                                <label htmlFor="requires_proof" className="text-sm">
                                  {t('training.requiresProofLabel', 'Requires photo/notes as proof')}
                                </label>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setAddTaskOpen(null)}>
                                  {t('common.cancel', 'Cancel')}
                                </Button>
                                <Button type="submit" disabled={createTask.isPending}>
                                  {t('common.add', 'Add')}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteDay(day.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          {t('training.deleteDay', 'Delete Day')}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingModuleDetail;
