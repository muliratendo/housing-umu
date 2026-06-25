import React, { useState, useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout'; // 🚀 Import layout wrapper
import { Link, Head, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  ArrowRight,
  Building2,
  FileText,
  Cpu,
  CheckCircle,
  HelpCircle,
  UserCheck,
  ShieldAlert,
  Users,
  RefreshCw,
  Wrench,
  PhoneCall,
  LogIn,
  Home,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';

// 🚀 FIXED: Extend PageProps and supply the explicit index signature fallback
interface CustomWelcomeProps extends Record<string, unknown> {
  auth: {
    user: any;
  };
  [key: string]: any;
}

export default function Welcome() {
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

  // TypeScript will now cleanly map the props without throwing exceptions
  const { auth } = usePage<CustomWelcomeProps>().props;

  // Fixed dummy occupancy metrics calculation
  const currentAllocationPercentage = 84;

  return (
    <GuestLayout showNavAndFooter={true}>
      <Head title="Welcome to UMU Housing" />

      {/* =========================================================================
                2. HERO STAGE CANVASES
               ========================================================================= */}
      {/* 🚀 FIXED: Added overflow-x-hidden here to cut off the invisible spillage scroll loop */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-2 md:pt-6 lg:pt-10 pb-12 md:pb-20 lg:pb-24 border-b bg-muted/20 overflow-x-hidden">
        {/* 🚀 FIXED: Added lg:pr-12 to the row wrapper to create a safe boundary zone for the 1/4 layout shift */}
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center lg:pr-12">
          {/* Left Column: Direct Call-To-Actions (CTAs) Matrix */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="space-y-4">
              <Badge
                variant="secondary"
                className="px-3 py-1 font-semibold text-xs tracking-wider uppercase text-primary bg-primary/10 border-none"
              >
                Uganda Martyrs University, Nkozi
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl font-sans leading-none">
                Simplify Campus <br />
                <span className="text-primary">Accommodation.</span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
                Experience a streamlined approach to secure and verified living
                spaces adjacent to the main campus gates.
              </p>
            </div>

            {/* Interactive Segmented Gateway Links */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              {auth.user ? (
                <Button
                  asChild
                  size="lg"
                  className="gap-2 font-medium w-full sm:w-auto shadow-md"
                >
                  <Link
                    href={
                      auth.user.roles?.includes('admin') ||
                      auth.user.roles?.includes('super_admin')
                        ? route('admin.dashboard')
                        : route('student.dashboard')
                    }
                  >My Dashboard<ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="font-medium w-full sm:w-auto shadow"
                  >
                    <Link href={route('login')}>Student or Guest Login</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="font-medium w-full sm:w-auto bg-background"
                  >
                      <Link href={route('public.hostels.index')}>View Available Hostels</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Imagery + Overlaid Corner Allocation Circular Tracker */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg aspect-[4/3] rounded-3xl border shadow-lg bg-muted overflow-visible">
              {/* Blur Gradient blend overlay top left */}
              <div className="absolute top-0 left-0 w-2/3 h-1/2 z-10 bg-gradient-to-br from-background/60 via-transparent to-transparent backdrop-blur-[0.3px] pointer-events-none rounded-3xl" />

              <img
                src="/images/umu-hostel-bed.jpg"
                srcSet="
                  /images/umu-hostel-bed.jpg 400w,
                  /images/umu-hostel-bed.jpg 800w,
                  /images/umu-hostel-bed.jpg 1200w
                "
                sizes="(max-width: 768px) 100vw, 50vw"
                alt="UMU Student Hostel Living Space"
                className="object-cover w-full h-full rounded-3xl relative z-0"
                loading="lazy"
              />

              {/* Centered Over Bottom Right Edge Corner Tracking Anchor Box */}
              <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 z-20 bg-background border rounded-2xl shadow-xl p-4 w-44 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                <div className="relative flex items-center justify-center h-16 w-16 mb-2">
                  <svg
                    className="absolute inset-0 w-full h-full transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      className="text-muted/40"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <style>{`@keyframes progress { from { stroke-dasharray: 0 100; } }`}</style>
                    <path
                      className="text-primary"
                      style={{ animation: 'progress 1s ease-out forwards' }}
                      strokeDasharray={`${currentAllocationPercentage}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="text-sm font-extrabold text-foreground font-mono">
                    {currentAllocationPercentage}%
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground leading-none tracking-tight">
                  Current Capacity
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Semestral Allocation
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
                3. HOW HOUSING AT UMU WORKS REGION
               ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-b">
        <div className="mx-auto max-w-7xl text-center space-y-12">
          <div className="space-y-3 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-sans">
              How Housing@UMU Works
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Get assigned to your room in four clear operational steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Step 1 */}
            <Link
              href="/how-it-works#step1"
              className="group p-5 rounded-2xl border bg-background hover:border-primary transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground tracking-tight">
                  Step 1: Student Sign In
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  Authenticate through your student profile or registration link
                  parameters.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 pt-2">
                Learn More <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Step 2 */}
            <Link
              href="/how-it-works#step2"
              className="group p-5 rounded-2xl border bg-background hover:border-primary transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground tracking-tight">
                  Step 2: Apply Now
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  Select your choice of hostel, bed space layout configurations,
                  and options.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 pt-2">
                Learn More <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Step 3 */}
            <Link
              href="/how-it-works#step3"
              className="group p-5 rounded-2xl border bg-background hover:border-primary transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground tracking-tight">
                  Step 3: Space Allocation
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  Automated system processing combined with manual validation
                  verification.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 pt-2">
                Learn More <ArrowRight className="h-3 w-3" />
              </span>
            </Link>

            {/* Step 4 */}
            <Link
              href="/how-it-works#step4"
              className="group p-5 rounded-2xl border bg-background hover:border-primary transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground tracking-tight">
                  Step 4: Check In & Renew
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  Collect keys from the campus hall wardens and lock in semester
                  transitions.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 pt-2">
                Learn More <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
                4. KEY CORE FEATURES BLOCKS
               ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-b bg-muted/10">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: Core Summary & Direct Support Anchor Card */}
          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-sans">
                Key Features
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Explore integrated policies built directly into the housing
                engine to support student residential workflows.
              </p>
            </div>

            <Card className="border bg-background shadow-sm rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground tracking-tight">
                    Need Help With Allocation?
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Reach out to the University Dean or Warden support staff
                    directly for manual adjustments.
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold"
                >
                  <Link href="/get-help">Contact Support</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Secondary Feature Segment Block 1 */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <div className="p-5 rounded-2xl border bg-background shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Find the Right
                Hostel
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Filter across off-campus private properties or campus hallowed
                halls with pricing transparency metrics.
              </p>
            </div>
            <div className="p-5 rounded-2xl border bg-background shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" /> Gender-Aware
                Policies
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatic block routing algorithms enforce safety bounds and
                separate residential floors based on campus policy guidelines.
              </p>
            </div>
            <div className="p-5 rounded-2xl border bg-background shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" /> Manage Room
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                View mapped sub-records containing inventory logs, assigned
                lockers, and light utility bills seamlessly from your viewport.
              </p>
            </div>
          </div>

          {/* Column 3: Secondary Feature Segment Block 2 */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <div className="p-5 rounded-2xl border bg-background shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Select Roommate
                (Optional)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Invite peers to sync and link bookings. Co-linked registrations
                require approval flags. *Terms apply.
              </p>
            </div>
            <div className="p-5 rounded-2xl border bg-background shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" /> Apply for Room
                Change
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Submit displacement or swapping request files programmatically
                if disputes arise mid-semester.
              </p>
            </div>
            <div className="p-5 rounded-2xl border bg-background shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Maintenance &
                Emergency
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Log maintenance issues directly to repair lines or tap instant
                alerts for system safety support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
            5. ACTIONS BOTTOM Call-To-Action (CTA) SEGMENT
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20 bg-brand-dark text-primary-foreground text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0,transparent_100%)] pointer-events-none" />
        <div className="mx-auto max-w-4xl space-y-6 relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl font-sans max-w-2xl mx-auto leading-tight">
            Secure your space for the upcoming semester.
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-black gap-1.5 transition-all duration-300 ease-in-out hover:bg-brand-black hover:text-accent-500 hover:border-brand-600"
            >
              <Link href="/hostels">View Hostel List</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-black gap-1.5 transition-all duration-300 ease-in-out hover:bg-brand-black hover:text-accent-500 hover:border-brand-600"
            >
              <Link
                href={auth.user ? route('student.dashboard') : route('login')}
              >
                Start Application
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* =========================================================================
            A. CENTERED SCROLL DOWN OVERLAY INDICATOR
          ========================================================================= */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 pointer-events-none flex flex-col items-center gap-1.5 ${
          scrollY > 20 ? 'opacity-0 translate-y-4' : 'opacity-100'
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
        className={`fixed bottom-6 right-6 z-40 h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg border border-primary flex items-center justify-center hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-300 ${
          scrollY > 400
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
