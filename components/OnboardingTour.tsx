
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

interface TourStep {
  targetId: string | null; // null means centered modal intro
  title: string;
  content: string;
  position?: 'bottom' | 'top' | 'left' | 'right';
}

interface OnboardingTourProps {
  onComplete: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: null,
    title: "Welcome to HarvestHub! 🕊️",
    content: "We're excited to help your church streamline its soul-winning efforts. This quick 1-minute tour will show you how to navigate your new command center."
  },
  {
    targetId: 'tour-dashboard-stats',
    title: "The Pulse of the Harvest",
    content: "Monitor total prospects, baptism candidates, and follow-up activities in real-time. These metrics help your team focus on where the field is truly white unto harvest.",
    position: 'bottom'
  },
  {
    targetId: 'tour-invite-card',
    title: "Grow Your Labor Force",
    content: "Harvest is plenty, but laborers are few! Click here to generate smart invitation links for your fellow preachers and leaders.",
    position: 'top'
  },
  {
    targetId: 'tour-tab-new',
    title: "Logging a New Outreach",
    content: "When you preach to a soul, use this button. You can capture their info, GPS coordinates, and even a photo of their location. Gemini AI will automatically analyze your notes to suggest the best follow-up verses.",
    position: 'right'
  },
  {
    targetId: 'tour-tab-people',
    title: "Nurture Your Prospects",
    content: "Access your full directory here. Search by name, filter by spiritual hunger level, or find all your baptism candidates in one place.",
    position: 'right'
  },
  {
    targetId: 'tour-tab-users',
    title: "Team Collaboration",
    content: "View your fellow team members, their contact info, and their progress. If you're an Admin, you can also manage roles and approve new sign-ups here.",
    position: 'right'
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];

  useLayoutEffect(() => {
    if (step.targetId) {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // If element doesn't exist (e.g. wrong tab), skip or center
        setCoords(null);
      }
    } else {
      setCoords(null);
    }
  }, [currentStep, step.targetId]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const getTooltipStyle = () => {
    if (!coords) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const offset = 20;
    switch (step.position) {
      case 'bottom':
        return { top: `${coords.top + coords.height + offset}px`, left: `${coords.left + coords.width / 2}px`, transform: 'translateX(-50%)' };
      case 'top':
        return { top: `${coords.top - offset}px`, left: `${coords.left + coords.width / 2}px`, transform: 'translate(-50%, -100%)' };
      case 'right':
        return { top: `${coords.top + coords.height / 2}px`, left: `${coords.left + coords.width + offset}px`, transform: 'translateY(-50%)' };
      case 'left':
        return { top: `${coords.top + coords.height / 2}px`, left: `${coords.left - offset}px`, transform: 'translate(-100%, -50%)' };
      default:
        return { top: `${coords.top + coords.height + offset}px`, left: `${coords.left + coords.width / 2}px`, transform: 'translateX(-50%)' };
    }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden pointer-events-none">
      {/* Backdrop with SVG Cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.3))' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {coords && (
              <rect 
                x={coords.left - 8} 
                y={coords.top - 8} 
                width={coords.width + 16} 
                height={coords.height + 16} 
                rx="16" 
                fill="black" 
                className="transition-all duration-500"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.7)" mask="url(#spotlight-mask)" />
      </svg>

      {/* Interactive Tooltip Card */}
      <div 
        className="absolute pointer-events-auto bg-white p-6 rounded-[2rem] shadow-2xl w-full max-w-sm border border-blue-100 transition-all duration-500 ease-out"
        style={getTooltipStyle() as any}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
            {currentStep + 1}
          </div>
          <button 
            onClick={onComplete}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Skip
          </button>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {step.content}
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentStep ? 'bg-blue-600 w-4' : 'bg-gray-200'}`}></div>
            ))}
          </div>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button 
                onClick={handleBack}
                className="px-4 py-2 text-gray-500 font-bold text-xs hover:bg-gray-50 rounded-lg transition-all"
              >
                Back
              </button>
            )}
            <button 
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
