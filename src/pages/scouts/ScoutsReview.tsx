import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useScoutSubmissions, useScoutStepAnswers, useScoutMedia, useReviewSubmission } from "@/hooks/useScoutSubmissions";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import { format } from "date-fns";

const ScoutsReview = () => {
  const { data: submissions = [], isLoading } = useScoutSubmissions('pending_review');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = submissions.find(s => s.id === selectedId);
  const { data: answers = [] } = useScoutStepAnswers(selectedId ?? undefined);
  const { data: media = [] } = useScoutMedia(selectedId ?? undefined);
  const reviewMutation = useReviewSubmission();
  const [reviewNotes, setReviewNotes] = useState('');
  const [stepResults, setStepResults] = useState<Record<string, 'passed' | 'failed'>>({});

  const handleReview = (status: 'approved' | 'rejected' | 'resubmit_required') => {
    if (!selected) return;
    reviewMutation.mutate({
      submissionId: selected.id,
      jobId: selected.job_id,
      status,
      reviewerNotes: reviewNotes,
      stepResults: answers.map(a => ({
        stepAnswerId: a.id,
        status: stepResults[a.id] || 'passed',
      })),
    }, {
      onSuccess: () => {
        setSelectedId(null);
        setReviewNotes('');
        setStepResults({});
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground">Review submitted scout jobs step-by-step.</p>
        </div>
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          <Clock className="h-3 w-3 mr-1" /> {submissions.length} pending
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Scout</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : submissions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No submissions pending review.</TableCell></TableRow>
              ) : submissions.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{(sub as any).scout_jobs?.title || '–'}</TableCell>
                  <TableCell>{(sub as any).scouts?.full_name || '–'}</TableCell>
                  <TableCell className="text-muted-foreground">{(sub as any).scout_jobs?.locations?.name || '–'}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(sub.submitted_at), 'dd MMM yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(sub.id)}>
                      <Eye className="h-4 w-4 mr-1" /> Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selected?.overall_notes && (
              <div className="p-3 rounded-md bg-muted">
                <p className="text-sm font-medium mb-1">Scout Notes</p>
                <p className="text-sm text-muted-foreground">{selected.overall_notes}</p>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Steps ({answers.length})</h3>
              {answers.map((answer: any) => {
                const step = answer.scout_job_steps;
                const stepMedia = media.filter((m: any) => m.step_id === answer.step_id);
                const result = stepResults[answer.id];
                
                return (
                  <Card key={answer.id} className={`border ${result === 'failed' ? 'border-destructive/50' : result === 'passed' ? 'border-emerald-500/50' : ''}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{step?.prompt || 'Step'}</p>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={result === 'passed' ? 'default' : 'outline'}
                            onClick={() => setStepResults(p => ({ ...p, [answer.id]: 'passed' }))}
                            className="h-7 px-2"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Pass
                          </Button>
                          <Button
                            size="sm"
                            variant={result === 'failed' ? 'destructive' : 'outline'}
                            onClick={() => setStepResults(p => ({ ...p, [answer.id]: 'failed' }))}
                            className="h-7 px-2"
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Fail
                          </Button>
                        </div>
                      </div>
                      
                      {answer.answer_text && <p className="text-sm text-muted-foreground">{answer.answer_text}</p>}
                      {answer.answer_bool !== null && <p className="text-sm">Answer: {answer.answer_bool ? 'Yes' : 'No'}</p>}
                      {answer.answer_number !== null && <p className="text-sm">Value: {answer.answer_number}</p>}
                      
                      {stepMedia.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {stepMedia.map((m: any) => (
                            <div key={m.id} className="w-16 h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground border">
                              {m.media_type === 'photo' ? '📷' : '🎥'}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reviewer Notes</label>
              <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add review comments..." />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleReview('resubmit_required')} disabled={reviewMutation.isPending}>
              Request Resubmission
            </Button>
            <Button variant="destructive" onClick={() => handleReview('rejected')} disabled={reviewMutation.isPending}>
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button onClick={() => handleReview('approved')} disabled={reviewMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScoutsReview;
