import { useState, useMemo } from "react";
import { useMysteryShopperSubmissions } from "@/hooks/useMysteryShopperSubmissions";
import { useMysteryShopperTemplates, useMysteryShopperQuestions } from "@/hooks/useMysteryShopperTemplates";
import { useLocations } from "@/hooks/useLocations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Eye, Loader2, Calendar, Star, BarChart3, Image, X } from "lucide-react";
import { format } from "date-fns";

export default function MysteryShopperResults() {
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const { data: templates } = useMysteryShopperTemplates();
  const { data: locations } = useLocations();
  const { data: submissions, isLoading, error } = useMysteryShopperSubmissions({
    templateId: templateFilter || undefined,
    locationId: locationFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const selectedSubmission = submissions?.find(s => s.id === selectedSubmissionId);
  const { data: selectedQuestions } = useMysteryShopperQuestions(selectedSubmission?.template_id);
  
  // Auto-detect template from submissions if not explicitly selected
  const effectiveTemplateId = useMemo(() => {
    if (templateFilter) return templateFilter;
    // If no filter, find the most common template in submissions
    if (!submissions || submissions.length === 0) return undefined;
    
    const templateCounts = submissions.reduce((acc, s) => {
      acc[s.template_id] = (acc[s.template_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostUsedTemplateId = Object.entries(templateCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    return mostUsedTemplateId;
  }, [templateFilter, submissions]);
  
  // Get questions for the effective template (for template analysis)
  const { data: templateQuestions } = useMysteryShopperQuestions(effectiveTemplateId);
  
  // Get the template name for display
  const effectiveTemplateName = useMemo(() => {
    if (!effectiveTemplateId) return null;
    return templates?.find(t => t.id === effectiveTemplateId)?.name || null;
  }, [effectiveTemplateId, templates]);

  // Calculate question statistics for template analysis
  const questionStats = useMemo(() => {
    if (!effectiveTemplateId || !templateQuestions || !submissions || submissions.length === 0) return null;

    const filteredSubmissions = submissions.filter(s => s.template_id === effectiveTemplateId);
    if (filteredSubmissions.length === 0) return null;

    const stats = templateQuestions.map((question) => {
      const answers = filteredSubmissions
        .map(s => s.raw_answers?.[question.id])
        .filter(a => a !== undefined && a !== null);

      if (question.question_type === 'rating') {
        const numericAnswers = answers.map(a => Number(a)).filter(n => !isNaN(n));
        const avgScore = numericAnswers.length > 0 
          ? numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length 
          : null;
        const maxScale = (question.rating_scale as any)?.max || 5;
        
        return {
          question,
          totalResponses: answers.length,
          avgScore,
          maxScale,
          avgPercentage: avgScore !== null ? (avgScore / maxScale) * 100 : null,
          distribution: numericAnswers.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {} as Record<number, number>),
        };
      } else if (question.question_type === 'multiple_choice') {
        const distribution = answers.reduce((acc, val) => {
          acc[String(val)] = (acc[String(val)] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          question,
          totalResponses: answers.length,
          distribution,
        };
      } else if (question.question_type === 'photo') {
        const photoUrls = answers.filter(a => typeof a === 'string' && a.startsWith('http'));
        return {
          question,
          totalResponses: answers.length,
          photos: photoUrls as string[],
        };
      } else {
        return {
          question,
          totalResponses: answers.length,
          textAnswers: answers.map(a => String(a)),
        };
      }
    });

    return stats;
  }, [effectiveTemplateId, templateQuestions, submissions]);

  // Collect all photos from submissions for the photo gallery
  const allPhotos = useMemo(() => {
    if (!submissions) return [];
    
    const photos: { url: string; submissionId: string; customerName: string; date: string; questionText?: string }[] = [];
    
    submissions.forEach(submission => {
      if (submission.raw_answers) {
        Object.entries(submission.raw_answers).forEach(([questionId, answer]) => {
          if (typeof answer === 'string' && answer.startsWith('http')) {
            const question = templateQuestions?.find(q => q.id === questionId);
            photos.push({
              url: answer,
              submissionId: submission.id,
              customerName: submission.customer_name,
              date: submission.submitted_at,
              questionText: question?.question_text,
            });
          }
        });
      }
    });
    
    return photos;
  }, [submissions, templateQuestions]);

  const getScoreColor = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const isPhotoUrl = (value: any): boolean => {
    return typeof value === 'string' && value.startsWith('http');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mystery Shopper Results</h2>
        <p className="text-muted-foreground">View and analyze customer feedback submissions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateFilter || "all"} onValueChange={(v) => setTemplateFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All templates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All templates</SelectItem>
                  {templates?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationFilter || "all"} onValueChange={(v) => setLocationFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations?.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2" disabled={!effectiveTemplateId}>
            <BarChart3 className="h-4 w-4" />
            Question Analysis
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Photos ({allPhotos.length})
          </TabsTrigger>
        </TabsList>

        {/* Submissions Tab */}
        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Submissions ({submissions?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-8 text-destructive">
                  Error loading submissions: {error.message}
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : submissions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No submissions found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Voucher</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions?.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(submission.submitted_at), "MMM d, yyyy HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{submission.customer_name}</TableCell>
                        <TableCell>{submission.mystery_shopper_templates?.name || "-"}</TableCell>
                        <TableCell>{submission.locations?.name || "-"}</TableCell>
                        <TableCell>
                          {submission.overall_score !== null ? (
                            <Badge variant={getScoreColor(submission.overall_score)}>
                              <Star className="h-3 w-3 mr-1" />
                              {submission.overall_score}%
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.vouchers ? (
                            <Badge variant={submission.vouchers.status === 'active' ? 'default' : 'secondary'}>
                              {submission.vouchers.code}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedSubmissionId(submission.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Question Analysis Tab */}
        <TabsContent value="analysis">
          {!effectiveTemplateId ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No submissions found. Submit some surveys to see question analysis.
              </CardContent>
            </Card>
          ) : !questionStats ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Overall Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Template Summary
                    {effectiveTemplateName && !templateFilter && (
                      <Badge variant="secondary" className="font-normal">
                        {effectiveTemplateName}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Submissions</p>
                      <p className="text-2xl font-bold">{submissions?.filter(s => s.template_id === effectiveTemplateId).length || 0}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Questions</p>
                      <p className="text-2xl font-bold">{templateQuestions?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Overall Score</p>
                      <p className="text-2xl font-bold">
                        {(() => {
                          const filtered = submissions?.filter(s => s.template_id === effectiveTemplateId && s.overall_score !== null);
                          if (!filtered || filtered.length === 0) return "-";
                          const avg = filtered.reduce((sum, s) => sum + (s.overall_score || 0), 0) / filtered.length;
                          return `${Math.round(avg)}%`;
                        })()}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Photos Collected</p>
                      <p className="text-2xl font-bold">{allPhotos.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Question by Question Analysis */}
              {questionStats.map((stat, index) => (
                <Card key={stat.question.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="outline">Q{index + 1}</Badge>
                      {stat.question.question_text}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stat.totalResponses} response{stat.totalResponses !== 1 ? 's' : ''}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {stat.question.question_type === 'rating' && 'avgScore' in stat && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Average Rating</span>
                              <span className="text-sm font-bold">
                                {stat.avgScore !== null ? stat.avgScore.toFixed(1) : '-'} / {stat.maxScale}
                              </span>
                            </div>
                            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`absolute inset-y-0 left-0 ${getProgressColor(stat.avgPercentage || 0)} transition-all`}
                                style={{ width: `${stat.avgPercentage || 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-5 w-5 fill-current" />
                            <span className="text-lg font-bold">
                              {stat.avgPercentage !== null ? Math.round(stat.avgPercentage) : 0}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Rating Distribution */}
                        {'distribution' in stat && Object.keys(stat.distribution).length > 0 && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Rating Distribution</p>
                            <div className="grid grid-cols-5 gap-2">
                              {Array.from({ length: stat.maxScale }, (_, i) => i + 1).map(rating => (
                                <div key={rating} className="text-center">
                                  <div className="text-sm text-muted-foreground mb-1">{rating}</div>
                                  <div className="h-16 bg-secondary rounded relative">
                                    <div 
                                      className="absolute bottom-0 left-0 right-0 bg-primary rounded transition-all"
                                      style={{ 
                                        height: `${((stat.distribution as Record<number, number>)[rating] || 0) / stat.totalResponses * 100}%` 
                                      }}
                                    />
                                  </div>
                                  <div className="text-xs mt-1">{(stat.distribution as Record<number, number>)[rating] || 0}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {stat.question.question_type === 'multiple_choice' && 'distribution' in stat && (
                      <div className="space-y-2">
                        {Object.entries(stat.distribution as Record<string, number>)
                          .sort((a, b) => b[1] - a[1])
                          .map(([option, count]) => (
                            <div key={option} className="flex items-center gap-4">
                              <span className="flex-1 text-sm truncate">{option}</span>
                              <Progress 
                                value={(count / stat.totalResponses) * 100} 
                                className="w-32"
                              />
                              <span className="text-sm text-muted-foreground w-16 text-right">
                                {count} ({Math.round((count / stat.totalResponses) * 100)}%)
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                    {stat.question.question_type === 'photo' && 'photos' in stat && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {(stat.photos as string[]).slice(0, 12).map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedPhotoUrl(url)}
                            className="aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                          >
                            <img 
                              src={url} 
                              alt={`Response ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                        {(stat.photos as string[]).length > 12 && (
                          <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                            +{(stat.photos as string[]).length - 12} more
                          </div>
                        )}
                      </div>
                    )}

                    {stat.question.question_type === 'text' && 'textAnswers' in stat && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(stat.textAnswers as string[]).slice(0, 10).map((answer, i) => (
                          <div key={i} className="p-2 bg-muted rounded text-sm">
                            "{answer}"
                          </div>
                        ))}
                        {(stat.textAnswers as string[]).length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            ... and {(stat.textAnswers as string[]).length - 10} more responses
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>All Photos ({allPhotos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {allPhotos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No photos found in submissions.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {allPhotos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPhotoUrl(photo.url)}
                      className="group relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                    >
                      <img 
                        src={photo.url} 
                        alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs">
                          <p className="font-medium truncate">{photo.customerName}</p>
                          <p className="opacity-75">{format(new Date(photo.date), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmissionId} onOpenChange={() => setSelectedSubmissionId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedSubmission.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {format(new Date(selectedSubmission.submitted_at), "PPpp")}
                  </p>
                </div>
                {selectedSubmission.customer_email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedSubmission.customer_email}</p>
                  </div>
                )}
                {selectedSubmission.customer_phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedSubmission.customer_phone}</p>
                  </div>
                )}
              </div>

              {/* Answers */}
              <div className="space-y-4">
                <h4 className="font-semibold">Answers</h4>
                {selectedQuestions?.map((question, index) => {
                  const answer = selectedSubmission.raw_answers?.[question.id];
                  return (
                    <div key={question.id} className="border-b pb-4 last:border-0">
                      <p className="text-sm text-muted-foreground mb-1">
                        Q{index + 1}: {question.question_text}
                      </p>
                      {question.question_type === 'rating' && answer ? (
                        <span className="flex items-center gap-1 font-medium">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          {answer} / {(question.rating_scale as any)?.max || 5}
                        </span>
                      ) : question.question_type === 'photo' && isPhotoUrl(answer) ? (
                        <button
                          onClick={() => setSelectedPhotoUrl(answer as string)}
                          className="mt-2 rounded-lg overflow-hidden border hover:border-primary transition-colors inline-block"
                        >
                          <img 
                            src={answer as string} 
                            alt="Response photo" 
                            className="max-w-xs max-h-48 object-cover"
                          />
                        </button>
                      ) : (
                        <p className="font-medium">
                          {answer || <span className="text-muted-foreground italic">No answer</span>}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Voucher Info */}
              {selectedSubmission.vouchers && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="font-semibold mb-2">Generated Voucher</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Code: </span>
                      <span className="font-mono font-bold">{selectedSubmission.vouchers.code}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value: </span>
                      <span className="font-medium">
                        {selectedSubmission.vouchers.value} {selectedSubmission.vouchers.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      <Badge variant={selectedSubmission.vouchers.status === 'active' ? 'default' : 'secondary'}>
                        {selectedSubmission.vouchers.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox Dialog */}
      <Dialog open={!!selectedPhotoUrl} onOpenChange={() => setSelectedPhotoUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <button
            onClick={() => setSelectedPhotoUrl(null)}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          {selectedPhotoUrl && (
            <img 
              src={selectedPhotoUrl} 
              alt="Full size photo" 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
