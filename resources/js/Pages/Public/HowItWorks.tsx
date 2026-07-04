// File: resources/js/Pages/Public/HowItWorks.tsx
// REPLACE existing HowItWorks.tsx.
//
// Changes vs previous version:
//  - Removed inline scrollY state + useEffect + scrollToTop + scrollDownALittle helpers.
//  - Replaced with <BackToTop> and <ScrollDownIndicator> component imports.
//    BackToTop is already injected by GuestLayout; import here only if standalone use
//    is needed outside the layout (e.g., in a modal or a different shell).
//  - GuestLayout now renders BackToTop globally for showNavAndFooter pages,
//    so the standalone import is omitted here to avoid duplicates.

import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import GuestLayout from '@/Layouts/GuestLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ScrollDownIndicator from '@/components/ScrollDownIndicator';
import {
  UserCheck, FileText, Cpu, CheckCircle, ArrowRight,
  ShieldAlert, Users, Home,
} from 'lucide-react';
import { url } from 'node:inspector';

export default function HowItWorks(): React.JSX.Element {
  return (
    <GuestLayout showNavAndFooter={true}>
      <Head title="How It Works | Housing@UMU" />

      {/* Hero */}
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center bg-brand-dark px-4 py-20 text-center">
        <Badge className="mb-4 bg-black text-accent-500 border-accent-500/30">
          Student Guide
        </Badge>
        <h1 className="text-4xl font-bold text-white sm:text-5xl max-w-2xl">
          How Housing@UMU Works
        </h1>
        <p className="mt-4 max-w-xl text-slate-300 text-sm sm:text-base">
          From Sign-In to Move-In ── Four clear steps to secure your Accommodation.
        </p>
        <div className="mt-8 flex gap-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="text-black gap-1.5 transition-all duration-300 ease-in-out hover:bg-brand-black hover:text-accent-500 hover:border-brand-600"
          >
            <Link href={route('login')}>Get Started</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="text-black gap-1.5 transition-all duration-300 ease-in-out hover:bg-brand-black hover:text-accent-500 hover:border-brand-600"
          >
            <Link href={route('public.hostels.index')}>View Hostels</Link>
          </Button>
        </div>
        {/* Scroll hint disappears after 80px scroll */}
        <ScrollDownIndicator threshold={80} targetVh={0.85} />
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              url: '#step1',
              icon: UserCheck,
              step: '01',
              title: 'Sign In',
              desc: 'Authenticate using your student credentials or a verified registration link before you begin any housing action.',
            },
            {
              url: '#step2',
              icon: FileText,
              step: '02',
              title: 'Apply',
              desc: 'Choose hostels, room types, gender policies, and optional roommates, then submit a structured housing application.',
            },
            {
              url: '#step3',
              icon: Cpu,
              step: '03',
              title: 'Get Allocated',
              desc: 'The allocation engine processes your preferences and eligibility, then wardens review and finalize your room placement.',
            },
            {
              url: '#step4',
              icon: CheckCircle,
              step: '04',
              title: 'Move In',
              desc: 'Collect keys from hall wardens, move into your room, and renew or apply again for future semesters.',
            },
          ].map(({ url, icon: Icon, step, title, desc }) => (
            <Link href={url}>
              <Card key={step} className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-3 h-56">
                  <span className="text-3xl font-black text-accent-500/30">{step}</span>
                  <div className="flex items-center gap-3 pt-2">
                    <Icon className="h-6 w-6 text-accent-500" />
                    <h3 className="font-semibold text-lg">{title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-8 py-10 sm:px-12 lg:px-18">
        {/* Detailed step sections, matching the #step anchors */}
        <section className="space-y-8">
          {[
            {
              id: 'step1',
              icon: UserCheck,
              step: '1',
              title: 'Student Sign In',
              desc1: 'Housing@UMU starts with secure sign-in. Use your official student credentials or an approved activation link to access the housing portal. This ties all applications and room allocations directly to your academic profile and enrollment status.',
              desc2: 'Once signed in, your dashboard exposes housing modules such as hostel search, active applications, and allocation updates. Sign-in also ensures that any allocation, roommate request, or room change is recorded under your unique student identity.',
              url: route('login'),
              note: '',
              noteicon: '',
              cta: 'Go to Login',
            },
            {
              id: 'step2',
              icon: FileText,
              step: '2',
              title: 'Apply Now',
              desc1: 'After sign-in, you can browse hostels and room cards to find a suitable space. Filter by campus-managed or affiliated hostels, room type (self-contained, standard, apartments), bed count, gender policy, price per semester, and amenities. When you find a room that fits, click “Apply for this room” to start a guided application.',
              desc2: 'The application form captures your preferred hostel, room type, and roommate options (if applicable), along with any required declarations. You may also specify special needs or policy-based requests, which help wardens and the Dean’s office review your case fairly.',
              url: route('public.hostels.index'),
              note: '',
              noteicon: '',
              cta: 'Browse hostels and rooms',
            },
            {
              id: 'step3',
              icon: Cpu,
              step: '3',
              title: 'Space Allocation',
              desc1: 'Once your application is submitted, the allocation engine processes it using capacity limits, bed counts, gender policies, and campus rules. The system attempts to match you to your preferred hostel and room type while respecting availability and safety constraints.',
              desc2: 'Wardens and authorized staff then review allocations for edge cases, manual adjustments, or special requests. This blended approach— automated matching with human validation—helps keep assignments fair, consistent, and aligned with university accommodation policy.',
              url: route('public.support'),
              note: '',
              noteicon: '',
              cta: 'Ask about allocation status',
            },
            {
              id: 'step4',
              icon: CheckCircle,
              step: '4',
              title: 'Check In & Renew',
              desc1: 'After allocation is confirmed, you receive details of your assigned room and hostel. On arrival, you check in with the hall wardens, collect keys, and complete any remaining on-site verification. Your housing record updates to reflect active residency for the semester.',
              desc2: 'For future semesters, you can either renew your space (subject to policy) or apply for a new room. The same flow—sign in, apply, allocation, and check-in—supports smooth transitions across academic years and housing policies.',
              url: route('public.support'),
              note: 'Wardens help with keys, check-in, and practical questions about your block.',
              noteicon: Home,
              cta: 'Questions about check-in or renewal?',
            },
          ].map(({ id, icon: Icon, step, title, desc1, desc2, url, noteicon: NoteIcon, note, cta }) => (
            <Card id={id} className="border bg-background rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-accent-500" />
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Step {step}:{title}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {desc1}
                </p>
                <p className="text-sm text-muted-foreground">
                  {desc2}
                </p>
                {note && (
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {NoteIcon && <NoteIcon className="h-3 w-3 text-primary" />}
                      {note}
                    </span>
                  </div>
                )}

                {/* Step CTA */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link
                    href={url}
                    className="inline-flex items-center gap-1 rounded-full bg-transparent px-3 py-1.5 font-medium text-accent-500 border border-accent-500 hover:border-black hover:bg-black transition-colors duration-350"
                  >
                    {cta}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </section>
    </GuestLayout>
  );
}
