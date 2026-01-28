import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, GraduationCap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTrainingModules } from "@/hooks/useTrainingModules";
import { useCreateTrainingAssignment, useGenerateTrainingTasks } from "@/hooks/useTrainingAssignments";
import { useEmployees } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { format } from "date-fns";

const TrainingAssignmentNew = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const { data: modules = [] } = useTrainingModules();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  
  const createAssignment = useCreateTrainingAssignment();
  const generateTasks = useGenerateTrainingTasks();
  
  const [formData, setFormData] = useState({
    trainee_employee_id: "",
    module_id: "",
    trainer_employee_id: "__none__",
    location_id: "__any__",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    experience_level: "__none__",
    notes: "",
  });

  const activeEmployees = employees.filter(e => e.status === 'active');
  const activeModules = modules.filter(m => m.is_active !== false);
  
  // Filter trainers (could be anyone, but preferably not the trainee)
  const potentialTrainers = activeEmployees.filter(e => e.id !== formData.trainee_employee_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createAssignment.mutateAsync({
        trainee_employee_id: formData.trainee_employee_id,
        module_id: formData.module_id,
        trainer_employee_id: formData.trainer_employee_id === "__none__" ? null : formData.trainer_employee_id,
        location_id: formData.location_id === "__any__" ? null : formData.location_id,
        start_date: formData.start_date,
        experience_level: formData.experience_level === "__none__" ? null : formData.experience_level,
        notes: formData.notes || null,
        status: 'active',
      });
      
      // Generate training tasks for the assignment
      if (result?.id) {
        await generateTasks.mutateAsync(result.id);
      }
      
      navigate('/workforce/training');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const selectedModule = modules.find(m => m.id === formData.module_id);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/workforce/training')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('training.assignTrainee', 'Assign Trainee')}</h1>
          <p className="text-muted-foreground">
            {t('training.assignDescription', 'Assign a training module to a staff member')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t('training.assignmentDetails', 'Assignment Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('training.trainee', 'Trainee')} *</Label>
                <Select
                  value={formData.trainee_employee_id}
                  onValueChange={(v) => setFormData({ ...formData, trainee_employee_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('training.selectTrainee', 'Select trainee')} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} {emp.role && `(${emp.role})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('training.module', 'Training Module')} *</Label>
                <Select
                  value={formData.module_id}
                  onValueChange={(v) => setFormData({ ...formData, module_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('training.selectModule', 'Select module')} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeModules.map(mod => (
                      <SelectItem key={mod.id} value={mod.id}>
                        {mod.name} ({mod.duration_days} {t('common.days', 'days')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('training.trainer', 'Trainer')}</Label>
                <Select
                  value={formData.trainer_employee_id}
                  onValueChange={(v) => setFormData({ ...formData, trainer_employee_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('training.selectTrainer', 'Select trainer (optional)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No trainer assigned</SelectItem>
                    {potentialTrainers.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} {emp.role && `(${emp.role})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('common.location', 'Location')}</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(v) => setFormData({ ...formData, location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.selectLocation', 'Select location (optional)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any location</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('training.startDate', 'Start Date')} *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>{t('training.experienceLevel', 'Experience Level')}</Label>
                <Select
                  value={formData.experience_level}
                  onValueChange={(v) => setFormData({ ...formData, experience_level: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('training.selectLevel', 'Select level (optional)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    <SelectItem value="junior">Junior / Entry-level</SelectItem>
                    <SelectItem value="mid">Mid-level</SelectItem>
                    <SelectItem value="senior">Senior / Experienced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('common.notes', 'Notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('training.notesPlaceholder', 'Any special notes about this training assignment...')}
                rows={3}
              />
            </div>

            {selectedModule && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{t('training.moduleInfo', 'Module Info')}</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedModule.name}</strong> - {selectedModule.duration_days} {t('common.days', 'days')}
                </p>
                {selectedModule.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedModule.description}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/workforce/training')}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createAssignment.isPending || generateTasks.isPending}
              >
                {createAssignment.isPending || generateTasks.isPending 
                  ? t('common.saving', 'Saving...') 
                  : t('training.createAssignment', 'Create Assignment')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingAssignmentNew;
