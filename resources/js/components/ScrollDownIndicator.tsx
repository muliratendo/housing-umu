// File: resources/js/components/ScrollDownIndicator.tsx
// Non-evasive overlay chevron that fades out once user has scrolled.
// Import wherever a tall hero section benefits from a "scroll hint".
//
// Suggested pages:
//   - Pages/Public/Welcome.tsx        (hero section)
//   - Pages/Public/HowItWorks.tsx     (intro hero)
//   - Pages/Public/Hostels/Show.tsx   (hostel detail hero image area)
//
// Usage:
//   import ScrollDownIndicator from '@/components/ScrollDownIndicator';
//   <ScrollDownIndicator />                  // defaults: threshold=80, targetVh=0.8
//   <ScrollDownIndicator threshold={120} targetVh={1.0} className="bottom-6" />

import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollDownIndicatorProps {
  /** Scroll pixels after which the indicator disappears. Default: 80 */
  threshold?: number;
  /** Fraction of viewport height to scroll to on click. Default: 0.8 */
  targetVh?: number;
  className?: string;
}

export default function ScrollDownIndicator({
  threshold = 80,
  targetVh = 0.8,
  className,
}: ScrollDownIndicatorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY < threshold);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const handleClick = () => {
    window.scrollTo({ top: window.innerHeight * targetVh, behavior: 'smooth' });
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Scroll down"
      className={cn(
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-30',
        'flex flex-col items-center gap-1',
        'text-white/70 hover:text-white transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-2',
        className,
      )}
    >
      <span className="text-[10px] uppercase tracking-widest font-medium select-none">Scroll</span>
      <ChevronDown className="h-5 w-5 animate-bounce" />
    </button>
  );
}
