import { Briefcase } from 'lucide-react';

export default function ScoutHome() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">My Jobs</h1>
      </div>
      <p className="text-muted-foreground">
        Available jobs and your assignments will appear here once your account is fully set up.
      </p>
    </div>
  );
}
