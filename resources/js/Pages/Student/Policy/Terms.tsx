// File: resources/js/Pages/Policy/{name}.tsx  NEW.
import { Link } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { ChevronLeft } from 'lucide-react';

function PolicyLayout({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Head title={`${title} – Housing@UMU`} />
      <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6">
        <Link
          href={route('welcome')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 group"
        >
          <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Housing@UMU
        </Link>

        <div className="mb-8 border-b pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#f1b418] uppercase tracking-wider">Housing@UMU</span>
          </div>
          <h1 className="text-3xl font-bold font-heading text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-bold prose-a:text-[#137c41]">
          {children}
        </div>

        <div className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Uganda Martyrs University. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href={route('policy.privacy')} className="hover:text-foreground">Privacy Policy</Link>
            <Link href={route('policy.terms')} className="hover:text-foreground">Terms of Service</Link>
            <Link href={route('policy.cookie')} className="hover:text-foreground">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Terms() {
  return (
    <PolicyLayout title="Terms of Service" lastUpdated="June 2026">
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing Housing@UMU you agree to be bound by these Terms of Service and all applicable
      University housing regulations.</p>
      <h2>2. Eligibility</h2>
      <p>The platform is available exclusively to enrolled students, staff, and authorised
      administrators of Uganda Martyrs University.</p>
      <h2>3. Housing Application Rules</h2>
      <p>First-year students are prioritised for on-campus halls. Affiliated hostels are accessible
      to first-year students only when on-campus capacity is exhausted, or upon explicit Dean of
      Students approval. One application per hostel per academic term is permitted.</p>
      <h2>4. Allocation and Check-In</h2>
      <p>Allocated students must confirm check-in within the period specified in their allocation
      notice. Failure to confirm may result in reallocation of the bed to the next waitlisted student.</p>
      <h2>5. Conduct</h2>
      <p>Students must comply with all UMU hostel regulations including noise, visitor, and
      maintenance-reporting policies. Violations may result in eviction and loss of housing priority.</p>
      <h2>6. Limitation of Liability</h2>
      <p>UMU is not liable for personal property loss or damage in any hostel. Students are advised
      to maintain personal property insurance.</p>
      <h2>7. Modifications</h2>
      <p>UMU reserves the right to modify these terms at any time. Continued use of the platform
      constitutes acceptance of the revised terms.</p>
    </PolicyLayout>
  );
}
