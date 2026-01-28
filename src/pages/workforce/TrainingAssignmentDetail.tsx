import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, GraduationCap, Calendar, MapPin, User, 
  CheckCircle2, Circle, Clock, Play, Pause, CheckCheck,
  XCircle, ClipboardList, Plus, ExternalLink, FileCheck, CalendarPlus
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useTrainingAssignment, useUpdateTrainingAssignment, useTrainingEvaluations, useCreateTrainingEvaluation, useStartAuditEvaluation, useGenerateTrainingSessions, useGenerateTrainingTasks } from "@/hooks/useTrainingAssignments";
import { useTrainingModuleDays, useTrainingModuleEvaluations } from "@/hooks/useTrainingModules";
import { format, addDays, differenceInDays, isAfter, isBefore, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TrainingAssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const { data: assignment, isLoading } = useTrainingAssignment(id);
  const { data: days = [] } = useTrainingModuleDays(assignment?.module_id);
  const { data: evaluations = [] } = useTrainingEvaluations(id);
  const { data: requiredEvaluations = [] } = useTrainingModuleEvaluations(assignment?.module_id);
  
  const updateAssignment = useUpdateTrainingAssignment();
  const createEvaluation = useCreateTrainingEvaluation();
  const startAuditEvaluation = useStartAuditEvaluation();
  const generateSessions = useGenerateTrainingSessions();
  const generateTasks = useGenerateTrainingTasks();
  
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [evalForm, setEvalForm] = useState({
    module_day_id: "__general__",
    score: 0,
    passed: false,
    notes: "",
  });

  // Fetch generated tasks for this assignment
  const { data: generatedTasks = [] } = useQuery({
    queryKey: ["training_generated_tasks", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("training_generated_tasks")
        .select(`
          *,
          task:tasks(id, title, status)
        `)
        .eq("assignment_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch training sessions for this assignment
  const { data: trainingSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["training_sessions", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, title")
        .eq("assignment_id", id)
        .order("session_date");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch current user's employee record
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    await updateAssignment.mutateAsync({ id, status: newStatus as any });
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment || !currentEmployee) {
      alert("You must be an employee to submit evaluations");
      return;
    }
    
    await createEvaluation.mutateAsync({
      assignment_id: id!,
      trainee_employee_id: assignment.trainee_employee_id,
      trainer_employee_id: currentEmployee.id,
      module_day_id: evalForm.module_day_id === "__general__" ? null : evalForm.module_day_id,
      evaluation_date: format(new Date(), 'yyyy-MM-dd'),
      score: evalForm.score,
      passed: evalForm.passed,
      notes: evalForm.notes || null,
    });
    
    setEvalDialogOpen(false);
    setEvalForm({ module_day_id: "__general__", score: 0, passed: false, notes: "" });
  };

  const handleStartAuditEvaluation = async (requiredEval: any) => {
    if (!assignment || !currentEmployee) {
      alert("You must be an employee to start evaluations");
      return;
    }

    const result = await startAuditEvaluation.mutateAsync({
      assignmentId: id!,
      traineeEmployeeId: assignment.trainee_employee_id,
      trainerEmployeeId: currentEmployee.id,
      moduleDayId: requiredEval.module_day_id || undefined,
      auditTemplateId: requiredEval.audit_template_id,
      locationId: assignment.location_id || undefined,
    });

    // Navigate to the audit
    if (result.auditInstance?.id) {
      navigate(`/audits/${result.auditInstance.id}`);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!id) return;
    try {
      const [sessions, tasks] = await Promise.all([
        generateSessions.mutateAsync(id),
        generateTasks.mutateAsync(id),
      ]);
      console.log("Generated sessions:", sessions);
      console.log("Generated tasks:", tasks);
      refetchSessions();
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('training.assignmentNotFound', 'Assignment not found')}</p>
        <Button className="mt-4" onClick={() => navigate('/workforce/training')}>
          {t('common.goBack', 'Go back')}
        </Button>
      </div>
    );
  }

  const startDate = parseISO(assignment.start_date);
  const durationDays = assignment.module?.duration_days || days.length || 1;
  const endDate = addDays(startDate, durationDays - 1);
  const today = new Date();
  const currentDay = Math.max(1, Math.min(durationDays, differenceInDays(today, startDate) + 1));
  
  const completedTasks = generatedTasks.filter(gt => gt.task?.status === 'completed').length;
  const totalTasks = generatedTasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Check which required evaluations have been completed
  const getEvaluationStatus = (requiredEval: any) => {
    const existingEval = evaluations.find(e => 
      e.audit_instance_id && 
      (e.module_day_id === requiredEval.module_day_id || 
       (!e.module_day_id && !requiredEval.module_day_id))
    );
    
    if (!existingEval) return 'not_started';
    if (existingEval.audit_instance?.status === 'completed' || 
        existingEval.audit_instance?.status === 'compliant' ||
        existingEval.audit_instance?.status === 'non_compliant') {
      return 'completed';
    }
    return 'in_progress';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCheck className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workforce/training')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{assignment.trainee?.full_name}</h1>
              <Badge className={getStatusColor(assignment.status)}>
                {getStatusIcon(assignment.status)}
                <span className="ml-1">{assignment.status}</span>
              </Badge>
            </div>
            <p className="text-muted-foreground">{assignment.module?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trainingSessions.length === 0 && (
            <Button 
              variant="outline"
              onClick={handleGenerateSchedule}
              disabled={generateSessions.isPending || generateTasks.isPending}
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              {generateSessions.isPending || generateTasks.isPending 
                ? t('common.generating', 'Generating...') 
                : t('training.generateSchedule', 'Generate Schedule')}
            </Button>
          )}
          <Select value={assignment.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('training.trainee', 'Trainee')}</p>
                <p className="font-medium">{assignment.trainee?.full_name}</p>
                {assignment.trainee?.role && (
                  <p className="text-xs text-muted-foreground">{assignment.trainee.role}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('training.trainer', 'Trainer')}</p>
                <p className="font-medium">
                  {assignment.trainer?.full_name || t('training.notAssigned', 'Not assigned')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('training.duration', 'Duration')}</p>
                <p className="font-medium">
                  {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('training.dayOf', 'Day')} {currentDay} / {durationDays}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {t('training.taskProgress', 'Task Progress')}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {completedTasks}/{totalTasks} {t('common.completed', 'completed')}
            </span>
          </CardHeader>
          <CardContent>
            <Progress value={taskProgress} className="h-3 mb-4" />
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {days.map((day) => {
                const dayDate = addDays(startDate, day.day_number - 1);
                const dayTasks = generatedTasks.filter(gt => gt.module_day_id === day.id);
                const dayCompleted = dayTasks.filter(gt => gt.task?.status === 'completed').length;
                const isPast = isBefore(dayDate, today);
                const isToday = format(dayDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                
                return (
                  <div 
                    key={day.id} 
                    className={`p-3 rounded-lg border ${isToday ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={isToday ? 'default' : 'outline'} className="text-xs">
                          {t('training.day', 'Day')} {day.day_number}
                        </Badge>
                        <span className="text-sm font-medium">{day.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(dayDate, 'MMM d')}
                        </span>
                        {dayTasks.length > 0 && (
                          <Badge variant={dayCompleted === dayTasks.length ? 'default' : 'secondary'}>
                            {dayCompleted}/{dayTasks.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t('training.evaluations', 'Evaluations')}
            </CardTitle>
            <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-4 w-4" />
                  {t('training.manualScore', 'Manual Score')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('training.newEvaluation', 'New Manual Evaluation')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitEvaluation} className="space-y-4">
                  <div>
                    <Label>{t('training.trainingDay', 'Training Day')}</Label>
                    <Select
                      value={evalForm.module_day_id}
                      onValueChange={(v) => setEvalForm({ ...evalForm, module_day_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('training.selectDay', 'Select day (optional)')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__general__">General evaluation</SelectItem>
                        {days.map(day => (
                          <SelectItem key={day.id} value={day.id}>
                            Day {day.day_number}: {day.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('training.score', 'Score')} (0-100)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={evalForm.score}
                      onChange={(e) => setEvalForm({ ...evalForm, score: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="passed"
                      checked={evalForm.passed}
                      onCheckedChange={(v) => setEvalForm({ ...evalForm, passed: v as boolean })}
                    />
                    <label htmlFor="passed" className="text-sm font-medium">
                      {t('training.passed', 'Passed')}
                    </label>
                  </div>
                  <div>
                    <Label>{t('common.notes', 'Notes')}</Label>
                    <Textarea
                      value={evalForm.notes}
                      onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEvalDialogOpen(false)}>
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button type="submit" disabled={createEvaluation.isPending}>
                      {t('common.save', 'Save')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {/* Required Audit-Based Evaluations */}
            {requiredEvaluations.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  {t('training.requiredEvaluations', 'Required Evaluations')}
                </h4>
                <div className="space-y-2">
                  {requiredEvaluations.map((reqEval) => {
                    const status = getEvaluationStatus(reqEval);
                    const existingEval = evaluations.find(e => 
                      e.audit_instance_id && 
                      (e.module_day_id === reqEval.module_day_id || (!e.module_day_id && !reqEval.module_day_id))
                    );
                    
                    return (
                      <div key={reqEval.id} className="p-3 rounded-lg border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${
                            status === 'completed' ? 'bg-green-100' : 
                            status === 'in_progress' ? 'bg-yellow-100' : 'bg-gray-100'
                          }`}>
                            {status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : status === 'in_progress' ? (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {reqEval.audit_template?.name || 'Evaluation'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reqEval.module_day?.day_number ? `Day ${reqEval.module_day.day_number}` : 'General'}
                              {reqEval.is_required && ' • Required'}
                            </p>
                          </div>
                        </div>
                        <div>
                          {status === 'completed' && existingEval?.audit_instance && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/audits/${existingEval.audit_instance_id}`)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {t('common.view', 'View')}
                            </Button>
                          )}
                          {status === 'in_progress' && existingEval?.audit_instance_id && (
                            <Button 
                              size="sm"
                              onClick={() => navigate(`/audits/${existingEval.audit_instance_id}`)}
                            >
                              {t('common.continue', 'Continue')}
                            </Button>
                          )}
                          {status === 'not_started' && (
                            <Button 
                              size="sm"
                              onClick={() => handleStartAuditEvaluation(reqEval)}
                              disabled={startAuditEvaluation.isPending}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {t('training.startEvaluation', 'Start')}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Existing Evaluations (including manual scores) */}
            {evaluations.length === 0 && requiredEvaluations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{t('training.noEvaluations', 'No evaluations yet')}</p>
              </div>
            ) : evaluations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t('training.completedEvaluations', 'Completed Evaluations')}</h4>
                <div className="space-y-3">
                  {evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {evaluation.audit_instance ? (
                              <Badge variant="secondary" className="text-xs">
                                {evaluation.audit_instance.template?.name || 'Audit'}
                              </Badge>
                            ) : (
                              <Badge variant={evaluation.passed ? 'default' : 'destructive'}>
                                {evaluation.passed ? t('training.passed', 'Passed') : t('training.failed', 'Failed')}
                              </Badge>
                            )}
                            {evaluation.score !== null && (
                              <span className="font-medium">{evaluation.score}/100</span>
                            )}
                            {evaluation.audit_instance?.overall_score !== undefined && evaluation.audit_instance.overall_score !== null && (
                              <span className="font-medium">{evaluation.audit_instance.overall_score}%</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('training.by', 'By')} {evaluation.trainer?.full_name} • {format(parseISO(evaluation.evaluation_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        {evaluation.audit_instance_id && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/audits/${evaluation.audit_instance_id}`)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {evaluation.notes && (
                        <p className="text-sm mt-2 text-muted-foreground">{evaluation.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {assignment.location && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{t('common.location', 'Location')}: {assignment.location.name}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrainingAssignmentDetail;
