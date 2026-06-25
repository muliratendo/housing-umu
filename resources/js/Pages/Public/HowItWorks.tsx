import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserCheck,
  FileText,
  Cpu,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  Users,
  Home,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';

export default function HowItWorks(): React.JSX.Element {
  // State to track vertical pixel displacement
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Bind scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Clean up memory leaks on component unmount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth navigation viewport click helper
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollDownALittle = () => {
    window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  };

  return (
    <GuestLayout showNavAndFooter={true}>
      <Head title="How Housing@UMU Works | Housing@UMU" />

      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/20">
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
          {/* Hero / intro */}
          <header className="text-center space-y-3 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              How Housing@UMU Works
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Get assigned to your room in four clear operational steps, combining secure
              sign-in, digital applications, allocation logic, and on-campus check-in.
            </p>
          </header>

          {/* Quick step summary that mirrors the landing cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <Link
              href="#step1"
              className="group p-5 rounded-2xl border bg-background hover:border-primary transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Step 1: Student Sign In
                </h2>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                  Authenticate using your student credentials or a verified registration link
                  before you begin any housing action.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 pt-2">
                Learn more <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Step 2 */}
            <Link
              href="#step2"
              className="group p-5 rounded-2xl border bg-background hover:border-primary transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Step 2: Apply Now
                </h2>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                  Choose hostels, room types, gender policies, and optional roommates, then
                  submit a structured housing application.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 pt-2">
                Learn more <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Step 3 */}
            <Link
              href="#step3"
              className="group p-5 rounded-2xl border bg-background hover:border-primary transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Cpu className="h-5 w-5" />
                </div>
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Step 3: Space Allocation
                </h2>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                  The allocation engine processes your preferences and eligibility, then
                  wardens review and finalize your room placement.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 pt-2">
                Learn more <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Step 4 */}
            <Link
              href="#step4"
              className="group p-5 rounded-2xl border bg-background hover:border-primary transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Step 4: Check In & Renew
                </h2>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                  Collect keys from hall wardens, move into your room, and renew or apply
                  again for future semesters.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 pt-2">
                Learn more <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </section>

          {/* Detailed step sections, matching the #step anchors */}
          <section className="space-y-8">
            {/* Step 1 detail */}
            <Card id="step1" className="border bg-background rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Step 1: Student Sign In
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Housing@UMU starts with secure sign-in. Use your official student
                  credentials or an approved activation link to access the housing portal.
                  This ties all applications and room allocations directly to your academic
                  profile and enrollment status.
                </p>
                <p className="text-sm text-muted-foreground">
                  Once signed in, your dashboard exposes housing modules such as hostel
                  search, active applications, and allocation updates. Sign-in also ensures
                  that any allocation, roommate request, or room change is recorded under
                  your unique student identity.
                </p>

                {/* Step 1 CTA */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link
                    href="https://student.umu.ac.ug"
                    className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Go to student portal
                    <ArrowRight className="h-3 w-3" />

                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 detail */}
            <Card id="step2" className="border bg-background rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Step 2: Apply Now
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  After sign-in, you can browse hostels and room cards to find a suitable
                  space. Filter by campus-managed or affiliated hostels, room type
                  (self-contained, standard, apartments), bed count, gender policy, price
                  per semester, and amenities. When you find a room that fits, click “Apply
                  for this room” to start a guided application.
                </p>
                <p className="text-sm text-muted-foreground">
                  The application form captures your preferred hostel, room type, and
                  roommate options (if applicable), along with any required declarations.
                  You may also specify special needs or policy-based requests, which help
                  wardens and the Dean’s office review your case fairly.
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-primary" /> Gender-aware policies
                    are enforced when you choose mixed or single-gender rooms.
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3 text-primary" /> Roommate preferences can be
                    linked where shared rooms are available.
                  </span>
                </div>

                {/* Step 2 CTAs */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link
                    href="/hostels"
                    className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Browse hostels and rooms
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 detail */}
            <Card id="step3" className="border bg-background rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Cpu className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Step 3: Space Allocation
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Once your application is submitted, the allocation engine processes it
                  using capacity limits, bed counts, gender policies, and campus rules. The
                  system attempts to match you to your preferred hostel and room type while
                  respecting availability and safety constraints.
                </p>
                <p className="text-sm text-muted-foreground">
                  Wardens and authorized staff then review allocations for edge cases,
                  manual adjustments, or special requests. This blended approach—
                  automated matching with human validation—helps keep assignments fair,
                  consistent, and aligned with university accommodation policy.
                </p>

                {/* Step 3 CTA */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link
                    href="/contact-support"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-background px-3 py-1.5 font-medium text-slate-900 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-50"
                  >
                    Ask about allocation status
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 detail */}
            <Card id="step4" className="border bg-background rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Step 4: Check In & Renew
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  After allocation is confirmed, you receive details of your assigned room
                  and hostel. On arrival, you check in with the hall wardens, collect keys,
                  and complete any remaining on-site verification. Your housing record
                  updates to reflect active residency for the semester.
                </p>
                <p className="text-sm text-muted-foreground">
                  For future semesters, you can either renew your space (subject to policy)
                  or apply for a new room. The same flow—sign in, apply, allocation, and
                  check-in—supports smooth transitions across academic years and housing
                  policies.
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Home className="h-3 w-3 text-primary" /> Wardens help with keys,
                    check-in, and practical questions about your block.
                  </span>
                </div>

                {/* Step 4 CTA */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link
                    href="/contact-support"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-background px-3 py-1.5 font-medium text-slate-900 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-50"
                  >
                    Questions about check-in or renewal?
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Call to action back to hostels or contact support */}
          <section className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="text-xs sm:text-sm text-muted-foreground max-w-md">
              Ready to walk through the flow? Sign in, browse hostels, submit an
              application, and track your allocation and check-in with Housing@UMU.
            </div>
            <div className="flex gap-3">
              <Link
                href="/hostels"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Start by browsing hostels
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/contact-support"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-background px-4 py-2 text-xs font-medium text-slate-900 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-50"
              >
                Need help with any step?
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </section>
      </div>

      {/* =========================================================================
      A. CENTERED SCROLL DOWN OVERLAY INDICATOR
    ========================================================================= */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 pointer-events-none flex flex-col items-center gap-1.5 ${scrollY > 20 ? 'opacity-0 translate-y-4' : 'opacity-100'
          }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-background/80 backdrop-blur px-2.5 py-1 rounded-full border shadow-sm">
          Scroll To Explore
        </span>
        {/* Bouncing animation indicator hook */}
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full bg-background/90 shadow-md border pointer-events-auto animate-bounce cursor-pointer hover:bg-background"
          onClick={scrollDownALittle}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* =========================================================================
      B. NON-INVASIVE BACK TO TOP BUTTON OVERLAY
    ========================================================================= */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg border border-primary flex items-center justify-center hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-300 ${scrollY > 400
          ? 'opacity-100 translate-y-0 cursor-pointer'
          : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        aria-label="Back to top"
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </GuestLayout>
  );
}
