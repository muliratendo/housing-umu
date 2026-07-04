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

export default function Cookie() {
  return (
    <PolicyLayout title="Cookie Policy" lastUpdated="June 2026">
      <h2>1. What Are Cookies?</h2>
      <p>Cookies are small text files stored on your device when you visit a website. They help us
      provide a secure and functional experience.</p>
      <h2>2. Cookies We Use</h2>
      <p>
        <strong>Session Cookie</strong> (<code>housing-at-umu-session</code>): Required. Keeps you
        logged in during your session. Deleted when you close your browser or log out.
      </p>
      <p>
        <strong>CSRF Token</strong> (<code>XSRF-TOKEN</code>): Required. Protects form submissions
        from cross-site request forgery attacks.
      </p>
      <p>
        <strong>Analytics</strong>: We do not currently use third-party analytics cookies.
      </p>
      <h2>3. Managing Cookies</h2>
      <p>The session and CSRF cookies are strictly necessary for the platform to function. You
      cannot opt out of these cookies while using Housing@UMU. You may clear them by logging out
      or clearing your browser data.</p>
      <h2>4. Third-Party Cookies</h2>
      <p>Housing@UMU does not embed third-party advertising or tracking scripts.</p>
      <h2>5. Contact</h2>
      <p>Questions about our cookie use? Email <a href="mailto:housing@umu.ac.ug">housing@umu.ac.ug</a>.</p>
    </PolicyLayout>
  );
}
