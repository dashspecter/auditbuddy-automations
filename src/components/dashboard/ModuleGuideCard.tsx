import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ModuleGuide {
  name: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  videoUrl?: string;
  steps: string[];
  primaryAction: {
    label: string;
    to: string;
  };
  secondaryAction?: {
    label: string;
    to: string;
  };
}

interface ModuleGuideCardProps {
  guide: ModuleGuide;
}

export function ModuleGuideCard({ guide }: ModuleGuideCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {guide.icon}
            </div>
            <div>
              <CardTitle className="text-xl">{guide.title}</CardTitle>
              <CardDescription className="mt-1">{guide.description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Active</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Video Section */}
        {guide.videoUrl ? (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <iframe
              src={guide.videoUrl}
              title={`${guide.title} Tutorial`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <div className="text-center space-y-2">
              <PlayCircle className="h-16 w-16 text-primary mx-auto opacity-50" />
              <p className="text-sm text-muted-foreground">Tutorial video coming soon</p>
            </div>
          </div>
        )}

        {/* Step-by-Step Guide */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-primary" />
            Quick Start Guide
          </div>
          <ol className="space-y-2 pl-6">
            {guide.steps.map((step, index) => (
              <li key={index} className="text-sm text-muted-foreground list-decimal">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1">
            <Link to={guide.primaryAction.to}>
              {guide.primaryAction.label}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          {guide.secondaryAction && (
            <Button asChild variant="outline">
              <Link to={guide.secondaryAction.to}>
                {guide.secondaryAction.label}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
