import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Trash2, Camera, Hash, List } from 'lucide-react';
import { CmmsProcedureStep } from '@/hooks/useCmmsProcedures';

interface ProcedureStepEditorProps {
  step: Partial<CmmsProcedureStep>;
  index: number;
  onChange: (updates: Partial<CmmsProcedureStep>) => void;
  onDelete: () => void;
}

export function ProcedureStepEditor({ step, index, onChange, onDelete }: ProcedureStepEditorProps) {
  const [choices, setChoices] = useState<string[]>(
    step.choices_json ? (Array.isArray(step.choices_json) ? step.choices_json : []) : []
  );

  const handleChoicesChange = (value: string) => {
    const newChoices = value.split('\n').filter(c => c.trim());
    setChoices(newChoices);
    onChange({ choices_json: newChoices });
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <GripVertical className="h-4 w-4 cursor-grab" />
            <span className="font-medium text-sm">{index + 1}</span>
          </div>
          
          <div className="flex-1 space-y-4">
            <Input
              placeholder="Step title (e.g., Inspect belt tension)"
              value={step.title || ''}
              onChange={(e) => onChange({ title: e.target.value })}
            />
            
            <Textarea
              placeholder="Instructions (optional)"
              value={step.instruction_text || ''}
              onChange={(e) => onChange({ instruction_text: e.target.value })}
              rows={2}
            />
            
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id={`photo-${step.id || index}`}
                  checked={step.requires_photo || false}
                  onCheckedChange={(checked) => onChange({ requires_photo: checked })}
                />
                <Label htmlFor={`photo-${step.id || index}`} className="flex items-center gap-1.5 cursor-pointer">
                  <Camera className="h-4 w-4" />
                  Requires photo
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id={`value-${step.id || index}`}
                  checked={step.requires_value || false}
                  onCheckedChange={(checked) => onChange({ requires_value: checked })}
                />
                <Label htmlFor={`value-${step.id || index}`} className="flex items-center gap-1.5 cursor-pointer">
                  <Hash className="h-4 w-4" />
                  Requires value
                </Label>
              </div>
            </div>
            
            {step.requires_value && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Value type:</Label>
                  <Select
                    value={step.value_type || 'text'}
                    onValueChange={(value) => onChange({ value_type: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="rating">Rating (1-5)</SelectItem>
                      <SelectItem value="choice">Choice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {step.value_type === 'choice' && (
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1.5">
                      <List className="h-4 w-4" />
                      Choices (one per line)
                    </Label>
                    <Textarea
                      placeholder="Pass&#10;Fail&#10;N/A"
                      value={choices.join('\n')}
                      onChange={(e) => handleChoicesChange(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
