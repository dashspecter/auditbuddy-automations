import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface SectionFollowUpInputProps {
  sectionId: string;
  followUpNeeded?: boolean;
  followUpNotes?: string | null;
  onFollowUpChange: (needed: boolean, notes?: string) => void;
  disabled?: boolean;
}

export default function SectionFollowUpInput({
  sectionId,
  followUpNeeded = false,
  followUpNotes = null,
  onFollowUpChange,
  disabled = false,
}: SectionFollowUpInputProps) {
  const [needed, setNeeded] = useState(followUpNeeded);
  const [notes, setNotes] = useState(followUpNotes || "");

  useEffect(() => {
    setNeeded(followUpNeeded);
    setNotes(followUpNotes || "");
  }, [followUpNeeded, followUpNotes]);

  const handleNeededChange = (isNeeded: boolean) => {
    setNeeded(isNeeded);
    if (!isNeeded) {
      setNotes("");
      onFollowUpChange(isNeeded, "");
    } else {
      onFollowUpChange(isNeeded, notes);
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onFollowUpChange(needed, value);
  };

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardContent className="pt-4 space-y-3">
        <Label className="text-base font-semibold">Follow-up Actions Required?</Label>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={needed ? "default" : "outline"}
            className={`h-12 text-base font-semibold transition-all ${
              needed 
                ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-md' 
                : 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300'
            }`}
            onClick={() => handleNeededChange(true)}
            disabled={disabled}
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            Needed
          </Button>
          
          <Button
            type="button"
            variant={!needed ? "default" : "outline"}
            className={`h-12 text-base font-semibold transition-all ${
              !needed 
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-md' 
                : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
            }`}
            onClick={() => handleNeededChange(false)}
            disabled={disabled}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Not Needed
          </Button>
        </div>

        {needed && (
          <div className="space-y-2 pt-2">
            <Label>Follow-up Notes *</Label>
            <Textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Describe what follow-up actions are needed..."
              disabled={disabled}
              rows={3}
              className="resize-none"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
