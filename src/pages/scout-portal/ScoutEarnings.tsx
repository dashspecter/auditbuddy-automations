import { Wallet } from 'lucide-react';

export default function ScoutEarnings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
      </div>
      <p className="text-muted-foreground">
        Your payout history and pending earnings will appear here.
      </p>
    </div>
  );
}
