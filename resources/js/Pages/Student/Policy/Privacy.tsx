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

export default function Privacy() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="June 2026">
      <h2>1. Introduction</h2>
      <p>
        Uganda Martyrs University (&quot;UMU&quot;, &quot;we&quot;, &quot;us&quot;) operates the
        Housing@UMU platform. This Privacy Policy explains how we collect, use, and protect your
        personal information when you use our accommodation management services.
      </p>
      <h2>2. Information We Collect</h2>
      <p>We collect information you provide directly, including your full name, email address,
      student number, academic year, gender, and application preferences. We also collect usage
      data such as login times, allocation history, and maintenance request records.</p>
      <h2>3. How We Use Your Information</h2>
      <p>Your information is used solely to process housing applications, allocate beds, manage
      maintenance requests, and send official University housing communications.</p>
      <h2>4. Data Retention</h2>
      <p>Academic records are retained for the duration of your enrolment and for seven years
      thereafter as required by Ugandan law and UMU policy.</p>
      <h2>5. Your Rights</h2>
      <p>You may request access to, correction of, or deletion of your personal data by contacting
      the Dean of Students office at <a href="mailto:housing@umu.ac.ug">housing@umu.ac.ug</a>.</p>
      <h2>6. Security</h2>
      <p>We implement industry-standard security measures including encrypted sessions, role-based
      access control, and regular security audits.</p>
      <h2>7. Contact</h2>
      <p>Uganda Martyrs University, Nkozi, Mpigi District, Uganda. Email: <a href="mailto:housing@umu.ac.ug">housing@umu.ac.ug</a></p>
    </PolicyLayout>
  );
}
