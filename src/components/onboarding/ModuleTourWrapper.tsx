import { useEffect, useState } from 'react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useModuleOnboarding, useCompleteModuleOnboarding, useCompleteOnboardingStep } from '@/hooks/useModuleOnboarding';
import FeatureTour, { TourStep } from './FeatureTour';
import { toast } from 'sonner';

interface ModuleTourWrapperProps {
  moduleName: string;
  steps: TourStep[];
  moduleIcon?: React.ReactNode;
  children: React.ReactNode;
  autoStart?: boolean;
}

export default function ModuleTourWrapper({
  moduleName,
  steps,
  moduleIcon,
  children,
  autoStart = true,
}: ModuleTourWrapperProps) {
  const { hasModule } = useCompanyContext();
  const { data: onboarding, isLoading } = useModuleOnboarding(moduleName);
  const completeOnboarding = useCompleteModuleOnboarding();
  const completeStep = useCompleteOnboardingStep();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Only show tour if:
    // 1. Module is active
    // 2. User hasn't completed onboarding
    // 3. autoStart is enabled
    // 4. Not currently loading
    if (
      !isLoading && 
      autoStart && 
      hasModule(moduleName) && 
      (!onboarding || !onboarding.completed)
    ) {
      // Small delay to ensure the page is fully loaded
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [moduleName, hasModule, onboarding, isLoading, autoStart]);

  const handleComplete = async () => {
    try {
      await completeOnboarding.mutateAsync(moduleName);
      setShowTour(false);
      toast.success('Tour completed! You\'re all set to use this module.');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding.mutateAsync(moduleName);
      setShowTour(false);
      toast.info('Tour skipped. You can restart it anytime from settings.');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const handleStepComplete = async (stepId: string) => {
    try {
      await completeStep.mutateAsync({
        moduleName,
        stepId,
      });
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  return (
    <>
      {children}
      {showTour && (
        <FeatureTour
          steps={steps}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onStepComplete={handleStepComplete}
          moduleName={moduleName}
          moduleIcon={moduleIcon}
        />
      )}
    </>
  );
}
