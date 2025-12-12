import { useState } from "react";
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
import { Eye, Loader2, Calendar, Star } from "lucide-react";
import { format } from "date-fns";

export default function MysteryShopperResults() {
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { data: templates } = useMysteryShopperTemplates();
  const { data: locations } = useLocations();
  const { data: submissions, isLoading, error } = useMysteryShopperSubmissions({
    templateId: templateFilter || undefined,
    locationId: locationFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  // Debug logging
  console.log("MysteryShopperResults - submissions:", submissions);
  console.log("MysteryShopperResults - isLoading:", isLoading);
  console.log("MysteryShopperResults - error:", error);

  const selectedSubmission = submissions?.find(s => s.id === selectedSubmissionId);
  const { data: selectedQuestions } = useMysteryShopperQuestions(selectedSubmission?.template_id);

  const getScoreColor = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
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

      {/* Results Table */}
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
                      <p className="font-medium">
                        {question.question_type === 'rating' && answer ? (
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            {answer} / {(question.rating_scale as any)?.max || 5}
                          </span>
                        ) : (
                          answer || <span className="text-muted-foreground italic">No answer</span>
                        )}
                      </p>
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
    </div>
  );
}
