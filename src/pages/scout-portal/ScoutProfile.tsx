import { User } from 'lucide-react';

export default function ScoutProfile() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </div>
      <p className="text-muted-foreground">
        Manage your scout profile, availability, and settings here.
      </p>
    </div>
  );
}
