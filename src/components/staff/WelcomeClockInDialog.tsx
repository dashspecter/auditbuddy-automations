import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";

interface WelcomeClockInDialogProps {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  reminders: string[];
}

export function WelcomeClockInDialog({ open, onClose, employeeName, reminders }: WelcomeClockInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Welcome, {employeeName}!</DialogTitle>
              <DialogDescription>You've successfully clocked in</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {reminders.length > 0 && (
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium text-muted-foreground">Daily Reminders:</p>
            <div className="space-y-2">
              {reminders.map((reminder, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10"
                >
                  <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{reminder}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onClose} className="w-full">
          Got it, let's go!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
