// File: resources/js/Layouts/GuestLayout.tsx
// REPLACE existing GuestLayout.tsx.
//
// Changes:
//  - <BackToTop> added globally in the marketing shell (showNavAndFooter=true).
//    It auto-hides until user scrolls 300px — non-evasive by default.
//  - <ScrollDownIndicator> NOT added here because hero detection is page-specific;
//    import it directly in Welcome.tsx and HowItWorks.tsx hero sections.
//  - No other logic changes.

import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';
import TopNav from '@/components/PublicTopNav';
import Footer from '@/components/PublicFooter';
import BackToTop from '@/components/BackToTop';

interface GuestLayoutProps {
  children: ReactNode;
  showNavAndFooter?: boolean;
}

export default function GuestLayout({ children, showNavAndFooter = false }: GuestLayoutProps) {
  if (showNavAndFooter) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <TopNav />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        {/* Non-evasive back-to-top for all public marketing pages */}
        <BackToTop />
      </div>
    );
  }

  // Auth shell — no scroll utilities needed on short login/register pages.
  return (
    <div className="flex min-h-screen flex-col bg-muted/30 justify-center items-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/">
            <img
              src="/images/umu.png"
              alt="UMU Logo"
              className="h-28 w-32 object-contain mx-auto animate-in fade-in zoom-in-95 duration-200"
            />
            <h1 className="text-2xl font-bold tracking-tight mt-2 text-foreground">
              UMU Accommodation Portal
            </h1>
          </Link>
        </div>
        <div className="w-full bg-background rounded-2xl border shadow-sm p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
