import { Link, Head, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight } from 'lucide-react';

interface CustomWelcomeProps {
  auth: {
    user: any;
  };
  [key: string]: any;
}

export default function Welcome() {
  const { auth } = usePage<CustomWelcomeProps>().props;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/30 overflow-hidden selection:bg-primary selection:text-primary-foreground">
      <Head title="Welcome to UMU Housing" />

      {/* Main Center Canvas Container */}
      <div className="relative w-full max-w-2xl px-6 lg:max-w-7xl text-center flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-background border shadow-sm">
          <img
            src="/favicon_io/android-chrome-512x512.png"
            alt="UMU Logo"
            className="h-12 w-12 object-contain"
          />
        </div>

        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl font-sans">
            Uganda Martyrs University <br />
            <span className="text-primary">Housing Portal</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Find verified, secure, and approved student hostels around the Nkozi
            Main Campus.
          </p>
        </div>

        {/* Secure Auth Redirect Links Shell */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {auth.user ? (
            <Button asChild size="lg" className="gap-2 font-medium shadow">
              <Link href={route('dashboard')}>
                View Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="font-medium shadow">
                <Link href={route('login')}>Sign In</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="font-medium bg-background"
              >
                <Link href={route('register')}>Create Account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
