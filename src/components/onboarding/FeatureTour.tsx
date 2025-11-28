import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

interface FeatureTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
  onStepComplete?: (stepId: string) => void;
  moduleName: string;
  moduleIcon?: React.ReactNode;
}

export default function FeatureTour({
  steps,
  onComplete,
  onSkip,
  onStepComplete,
  moduleName,
  moduleIcon,
}: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightedElement(null);
    }
  }, [step]);

  useEffect(() => {
    // Add highlight styling
    if (highlightedElement) {
      highlightedElement.style.position = 'relative';
      highlightedElement.style.zIndex = '1000';
      highlightedElement.style.boxShadow = '0 0 0 4px hsl(var(--primary)), 0 0 0 8px hsla(var(--primary), 0.2)';
      highlightedElement.style.borderRadius = '8px';
      highlightedElement.style.transition = 'all 0.3s ease';

      return () => {
        highlightedElement.style.position = '';
        highlightedElement.style.zIndex = '';
        highlightedElement.style.boxShadow = '';
        highlightedElement.style.borderRadius = '';
      };
    }
  }, [highlightedElement]);

  const handleNext = () => {
    if (onStepComplete) {
      onStepComplete(step.id);
    }
    
    if (step.action) {
      step.action();
    }

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (highlightedElement) {
      highlightedElement.style.position = '';
      highlightedElement.style.zIndex = '';
      highlightedElement.style.boxShadow = '';
    }
    onSkip();
  };

  // Position the tour card based on placement
  const getCardPosition = () => {
    if (!step.target || !highlightedElement) {
      return 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }

    const rect = highlightedElement.getBoundingClientRect();
    const placement = step.placement || 'bottom';

    switch (placement) {
      case 'top':
        return 'fixed';
      case 'bottom':
        return 'fixed';
      case 'left':
        return 'fixed';
      case 'right':
        return 'fixed';
      default:
        return 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  const getCardStyle = (): React.CSSProperties => {
    if (!step.target || !highlightedElement) {
      return {};
    }

    const rect = highlightedElement.getBoundingClientRect();
    const placement = step.placement || 'bottom';
    const offset = 20;

    switch (placement) {
      case 'top':
        return {
          bottom: `${window.innerHeight - rect.top + offset}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: `${rect.bottom + offset}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: `${rect.top + rect.height / 2}px`,
          right: `${window.innerWidth - rect.left + offset}px`,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + offset}px`,
          transform: 'translateY(-50%)',
        };
      default:
        return {};
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999]"
        onClick={handleSkip}
      />

      {/* Tour card */}
      <Card 
        className={cn(
          'z-[1001] max-w-md shadow-2xl border-2 border-primary',
          getCardPosition()
        )}
        style={getCardStyle()}
      >
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {moduleIcon && <div className="text-primary">{moduleIcon}</div>}
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                New Feature Tour
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2 -mt-2"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-xl">{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tour
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
