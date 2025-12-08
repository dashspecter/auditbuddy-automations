import { 
  CheckCircle2, Circle, ToggleLeft, Type, Hash, Calendar,
  ListChecks, AlignLeft, Scale, Image as ImageIcon, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface TemplateField {
  name: string;
  type: string;
  options?: string[];
  required?: boolean;
}

interface TemplateSection {
  name: string;
  description?: string;
  fields: TemplateField[];
}

interface TemplateContent {
  sections?: TemplateSection[];
}

interface TemplateContentPreviewProps {
  content: TemplateContent | null;
  templateType?: string;
}

const fieldTypeIcons: Record<string, typeof Type> = {
  text: Type,
  number: Hash,
  date: Calendar,
  yes_no: ToggleLeft,
  checkbox: CheckCircle2,
  radio: Circle,
  select: ListChecks,
  textarea: AlignLeft,
  scale: Scale,
  photo: ImageIcon,
  file: FileText,
};

function FieldPreview({ field, index }: { field: TemplateField; index: number }) {
  const Icon = fieldTypeIcons[field.type] || Type;
  
  const renderFieldInput = () => {
    switch (field.type) {
      case 'yes_no':
        return (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              </div>
              <span className="text-sm text-muted-foreground">Yes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-red-500 flex items-center justify-center">
                <Circle className="h-3 w-3 text-red-500" />
              </div>
              <span className="text-sm text-muted-foreground">No</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">N/A</span>
              </div>
              <span className="text-sm text-muted-foreground">N/A</span>
            </div>
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox disabled className="border-primary/50" />
            <span className="text-sm text-muted-foreground">Check if complete</span>
          </div>
        );
      
      case 'scale':
        return (
          <div className="flex items-center gap-3 w-full max-w-xs">
            <span className="text-xs text-muted-foreground">1</span>
            <Slider 
              defaultValue={[3]} 
              max={5} 
              min={1} 
              step={1} 
              disabled 
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground">5</span>
          </div>
        );
      
      case 'radio':
      case 'select':
        return (
          <RadioGroup disabled className="flex flex-wrap gap-3">
            {(field.options || ['Option 1', 'Option 2', 'Option 3']).slice(0, 3).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={opt} disabled className="border-primary/50" />
                <Label className="text-sm text-muted-foreground">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'number':
        return (
          <Input 
            type="number" 
            placeholder="Enter number..." 
            disabled 
            className="max-w-[120px] bg-muted/30"
          />
        );
      
      case 'date':
        return (
          <Input 
            type="date" 
            disabled 
            className="max-w-[180px] bg-muted/30"
          />
        );
      
      case 'textarea':
        return (
          <Textarea 
            placeholder="Enter observations..." 
            disabled 
            rows={2}
            className="max-w-md bg-muted/30"
          />
        );
      
      case 'photo':
        return (
          <div className="flex items-center gap-2 p-3 border-2 border-dashed border-muted-foreground/20 rounded-lg max-w-xs">
            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">Tap to add photo</span>
          </div>
        );
      
      case 'file':
        return (
          <div className="flex items-center gap-2 p-3 border-2 border-dashed border-muted-foreground/20 rounded-lg max-w-xs">
            <FileText className="h-5 w-5 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">Attach file</span>
          </div>
        );
      
      default:
        return (
          <Input 
            placeholder="Enter value..." 
            disabled 
            className="max-w-md bg-muted/30"
          />
        );
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 bg-background rounded-lg border border-border/50 hover:border-border transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate">{field.name}</p>
            <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0">
              <Icon className="h-3 w-3 mr-1" />
              {field.type.replace('_', '/')}
            </Badge>
            {field.required && (
              <span className="text-red-500 text-xs">*</span>
            )}
          </div>
          <div className="mt-2">
            {renderFieldInput()}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionPreview({ section, sectionIndex }: { section: TemplateSection; sectionIndex: number }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-primary">
            {sectionIndex + 1}
          </div>
          <div>
            <CardTitle className="text-lg">{section.name}</CardTitle>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
            )}
          </div>
          <Badge variant="secondary" className="ml-auto">
            {section.fields?.length || 0} fields
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {section.fields?.length > 0 ? (
          section.fields.map((field, fieldIndex) => (
            <FieldPreview key={fieldIndex} field={field} index={fieldIndex} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fields in this section
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TemplateContentPreview({ content, templateType }: TemplateContentPreviewProps) {
  if (!content || !content.sections || content.sections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No preview available for this template</p>
      </div>
    );
  }

  const totalFields = content.sections.reduce(
    (acc, section) => acc + (section.fields?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{content.sections.length}</p>
          <p className="text-xs text-muted-foreground">Sections</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{totalFields}</p>
          <p className="text-xs text-muted-foreground">Total Fields</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center flex-1">
          <p className="text-sm font-medium">Ready to use</p>
          <p className="text-xs text-muted-foreground">Install to customize</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {content.sections.map((section, index) => (
          <SectionPreview key={index} section={section} sectionIndex={index} />
        ))}
      </div>
    </div>
  );
}
