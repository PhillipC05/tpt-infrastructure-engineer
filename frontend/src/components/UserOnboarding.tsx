// frontend/src/components/UserOnboarding.tsx
import React, { useState } from 'react';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to TPT Infrastructure Engineer',
    description: 'Your all-in-one platform for civil engineering design, cost estimation, project scheduling, and construction management.',
    icon: '🏗️'
  },
  {
    id: 2,
    title: 'Create Your First Project',
    description: 'Start by creating a new project or importing existing drawings. We support DXF, DWG, and IFC BIM formats.',
    icon: '📂'
  },
  {
    id: 3,
    title: 'Generate Cost Estimates',
    description: 'Automatically calculate material quantities, labour costs, and build accurate construction budgets in minutes.',
    icon: '💰'
  },
  {
    id: 4,
    title: 'Build Project Timelines',
    description: 'Create Gantt charts, manage dependencies, and run critical path analysis for optimal scheduling.',
    icon: '📅'
  },
  {
    id: 5,
    title: 'Ready to get started?',
    description: 'Press Ctrl+K anywhere to search modules. Use keyboard shortcuts to navigate faster and boost your productivity.',
    icon: '🚀'
  }
];

export const UserOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="px-8 py-10 text-center">
          <div className="text-6xl mb-6">{onboardingSteps[currentStep].icon}</div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {onboardingSteps[currentStep].title}
          </h2>
          
          <p className="text-gray-600 mb-8">
            {onboardingSteps[currentStep].description}
          </p>

          <div className="flex items-center justify-center gap-2 mb-8">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-600 w-6'
                    : index < currentStep
                    ? 'bg-blue-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium rounded-lg"
              >
                Back
              </button>
            )}
            
            <button
              onClick={nextStep}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Continue'}
            </button>
          </div>
        </div>

        <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {onboardingSteps.length}
          </span>
          <button
            onClick={skipOnboarding}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
};