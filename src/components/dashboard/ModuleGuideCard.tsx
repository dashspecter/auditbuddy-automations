import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

interface ModuleGuide {
  name: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stepImages?: string[];
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const nextImage = () => {
    if (guide.stepImages) {
      setCurrentImageIndex((prev) => (prev + 1) % guide.stepImages.length);
    }
  };
  
  const prevImage = () => {
    if (guide.stepImages) {
      setCurrentImageIndex((prev) => (prev - 1 + guide.stepImages.length) % guide.stepImages.length);
    }
  };

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
        {/* Image Carousel */}
        {guide.stepImages && guide.stepImages.length > 0 ? (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
            <img 
              src={guide.stepImages[currentImageIndex]}
              alt={`${guide.title} - Step ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Navigation arrows */}
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous step"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next step"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            
            {/* Step indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {guide.stepImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentImageIndex 
                      ? 'w-6 bg-primary' 
                      : 'w-2 bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Step counter */}
            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
              {currentImageIndex + 1} / {guide.stepImages.length}
            </div>
          </div>
        ) : null}

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
