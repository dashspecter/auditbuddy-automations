import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, MapPin, Clock, ChevronRight, Banknote } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAvailableJobs,
  useMyJobs,
  useJobHistory,
  type ScoutFeedJob,
} from "@/hooks/useScoutJobFeed";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  posted: "bg-blue-500/10 text-blue-600 border-blue-200",
  accepted: "bg-amber-500/10 text-amber-600 border-amber-200",
  in_progress: "bg-purple-500/10 text-purple-600 border-purple-200",
  submitted: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  approved: "bg-green-500/10 text-green-600 border-green-200",
  rejected: "bg-red-500/10 text-red-600 border-red-200",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

function JobCard({ job, onClick }: { job: ScoutFeedJob; onClick: () => void }) {
  const locationName = (job.locations as any)?.name ?? "Unknown";
  const companyName = (job.companies as any)?.name ?? "";

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
            {companyName && (
              <p className="text-xs text-muted-foreground">{companyName}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={statusColors[job.status] ?? ""}
          >
            {job.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {locationName}
          </span>
          {job.time_window_start && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(job.time_window_start), "MMM d")}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 font-semibold text-primary">
            <Banknote className="h-4 w-4" />
            {job.payout_amount} {job.currency}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function JobList({
  jobs,
  isLoading,
  emptyMessage,
}: {
  jobs: ScoutFeedJob[] | undefined;
  isLoading: boolean;
  emptyMessage: string;
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!jobs?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onClick={() => navigate(`/jobs/${job.id}`)}
        />
      ))}
    </div>
  );
}

export default function ScoutHome() {
  const [tab, setTab] = useState("available");
  const available = useAvailableJobs();
  const myJobs = useMyJobs();
  const history = useJobHistory();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">
            Available
            {available.data?.length ? (
              <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {available.data.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="my-jobs">
            My Jobs
            {myJobs.data?.length ? (
              <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {myJobs.data.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4">
          <JobList
            jobs={available.data}
            isLoading={available.isLoading}
            emptyMessage="No available jobs right now. Check back later!"
          />
        </TabsContent>

        <TabsContent value="my-jobs" className="mt-4">
          <JobList
            jobs={myJobs.data}
            isLoading={myJobs.isLoading}
            emptyMessage="You haven't accepted any jobs yet."
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <JobList
            jobs={history.data}
            isLoading={history.isLoading}
            emptyMessage="No completed jobs yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
