import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

interface ClarificationCardProps {
  question: string;
  options?: string[];
  onSelect: (answer: string) => void;
}

export function ClarificationCard({ question, options, onSelect }: ClarificationCardProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40 p-3 my-2">
      <div className="flex items-start gap-2">
        <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-foreground">{question}</p>
          {options && options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs rounded-lg"
                  onClick={() => onSelect(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
