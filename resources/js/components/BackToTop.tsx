// File: resources/js/components/BackToTop.tsx
// Compact, non-evasive floating button that appears after the user scrolls
// past `threshold` pixels. Smooth-scrolls back to page top on click.
//
// Suggested pages (import into GuestLayout or AppLayout so it's always present,
// OR import per-page for targeted use):
//   - Layouts/GuestLayout.tsx             (global — applies to all public pages)
//   - Pages/Public/Hostels/HostelList.tsx (long paginated list)
//   - Pages/Public/HowItWorks.tsx         (long-scroll marketing page)
//   - Pages/Public/Welcome.tsx            (if welcome page is very tall)
//   - Layouts/AuthenticatedLayout.tsx     (global authenticated shell)
//
// Usage:
//   import BackToTop from '@/components/BackToTop';
//   <BackToTop />
//   <BackToTop threshold={400} className="bottom-6 right-6" />

import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackToTopProps {
  /** Scroll pixels after which button becomes visible. Default: 300 */
  threshold?: number;
  className?: string;
}

export default function BackToTop({ threshold = 400, className }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'flex items-center justify-center',
        'h-10 w-10 rounded-xl',
        'text-primary-foreground shadow-lg border border-primary hover:text-accent-500 hover:bg-primary bg-primary/90 hover:scale-105 active:scale-95',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-4',
        className,
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
