import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { HelpCircle, LogIn } from 'lucide-react';

interface CustomPageProps {
  auth: {
    user: any;
  };
  [key: string]: any;
}

export default function TopNav() {
  const { auth } = usePage<CustomPageProps>().props;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur px-4 sm:px-6 lg:px-8 shadow-sm">
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between">
        {/* Left Branded Section */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-foreground"
        >
          <img
            src="/favicon_io/android-chrome-512x512.png"
            alt="UMU Logo"
            className="h-7 w-7 object-contain"
          />
          <span>Housing@UMU</span>
        </Link>

        {/* Center Core Linking Section */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/hostels"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View Hostel
          </Link>
          <Link
            href={auth?.user ? route('student.dashboard') : route('login')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Apply Now
          </Link>
        </nav>

        {/* Right System Utilities Section */}
        <div className="flex items-center gap-4">
          <Link
            href="#"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" /> Help?
          </Link>
          {auth?.user ? (
            <Button asChild size="sm">
              {/* 🚀 FIXED: Route dynamically based on their Spatie roles array to avoid Ziggy crashes */}
              <Link
                href={
                  auth.user.roles?.includes('admin') ||
                  auth.user.roles?.includes('super_admin')
                    ? route('admin.dashboard')
                    : route('student.dashboard')
                }
              >
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href={route('login')}>
                <LogIn className="h-3.5 w-3.5" /> Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
