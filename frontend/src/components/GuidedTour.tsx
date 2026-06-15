// frontend/src/components/GuidedTour.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TourConfig {
  id: string;
  name: string;
  steps: TourStep[];
}

const availableTours: TourConfig[] = [
  {
    id: 'dashboard_overview',
    name: 'Dashboard Tour',
    steps: [
      { id: '1', target: '#sidebar-dashboard', title: 'Dashboard', description: 'Your main overview with project metrics and system status', position: 'right' },
      { id: '2', target: '#sidebar-projects', title: 'Projects', description: 'Create and manage all your construction projects', position: 'right' },
      { id: '3', target: '#global-search', title: 'Global Search', description: 'Press Ctrl+K anywhere to search all modules instantly', position: 'bottom' },
      { id: '4', target: '#user-menu', title: 'Account Settings', description: 'Manage your profile, preferences, and team members', position: 'left' },
    ]
  },
  {
    id: 'estimator_walkthrough',
    name: 'Cost Estimator Tour',
    steps: [
      { id: '1', target: '#estimator-form', title: 'Estimate Builder', description: 'Enter project parameters to generate accurate cost estimates', position: 'bottom' },
      { id: '2', target: '#material-selector', title: 'Material Database', description: 'Browse over 5,000 construction materials with real-time pricing', position: 'right' },
      { id: '3', target: '#calculate-btn', title: 'Run Calculation', description: 'Click to generate detailed breakdown with labour and overheads', position: 'top' },
    ]
  }
];

export const GuidedTour: React.FC<{ tourId: string; onComplete: () => void }> = ({ tourId, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const tourRef = useRef<HTMLDivElement>(null);

  const tour = availableTours.find(t => t.id === tourId);

  const nextStep = useCallback(() => {
    if (!tour) return;
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep, tour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(`tour_${tourId}_completed`, 'true');
    onComplete();
  }, [tourId, onComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') completeTour();
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, completeTour]);

  if (!isActive || !tour) return null;
  const step = tour.steps[currentStep];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={completeTour} />
      
      <div ref={tourRef} className="fixed z-50 bg-white rounded-xl shadow-2xl max-w-sm p-5" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-semibold text-gray-900">{step.title}</h4>
          <button onClick={completeTour} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">{step.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {tour.steps.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentStep ? 'bg-blue-600' : idx < currentStep ? 'bg-blue-300' : 'bg-gray-200'}`} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button onClick={prevStep} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Back</button>
            )}
            <button onClick={nextStep} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              {currentStep === tour.steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-3">
          <span>Step {currentStep + 1} of {tour.steps.length}</span>
          <button onClick={completeTour} className="hover:text-gray-600">Skip tour</button>
        </div>
      </div>
    </>
  );
};

export const TourTrigger: React.FC<{ tourId: string; children: React.ReactNode }> = ({ tourId, children }) => {
  const [showTour, setShowTour] = useState(false);
  const tourCompleted = localStorage.getItem(`tour_${tourId}_completed`) === 'true';

  const startTour = () => {
    setShowTour(true);
  };

  return (
    <>
      <div onClick={startTour}>{children}</div>
      {showTour && <GuidedTour tourId={tourId} onComplete={() => setShowTour(false)} />}
    </>
  );
};