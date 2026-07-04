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
    <header className="sticky top-0 z-50 w-full border-b bg-brand-black bg-background/95 backdrop-blur px-4 sm:px-6 lg:px-8 shadow-sm">
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between">
        {/* Left Branded Section */}
        <Link
          href="/"
          className="flex items-center gap-3"
        >
          {/* Left Brand Image Anchor */}
          <img
            src="/images/umu.png"
            alt="UMU Logo"
            className="h-15 rounded-md w-auto object-contain"
          />

          {/* Right System Text Workspace Matrix */}
          <div className="hidden sm:flex flex-col justify-center leading-none">
            {/* Stylized Brand Name displaying Logo-accurate Custom Font Stack */}
            <span className="font-logo text-white text-xl sm:text-2xl text-brand-black tracking-normal">
              <span className="text-xl sm:text-2xl font-medium">H</span>ousing
              <span className="text-xl sm:text-2xl font-medium text-accent-500">@</span>
              <span className="text-xl sm:text-2xl font-medium">U</span>
              <span>M</span>
              <span className="text-xl sm:text-2xl font-medium">U</span>
            </span>
          </div>
        </Link>

        {/* Center Core Linking Section */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/hostels"
            className="relative text-sm font-medium  text-white hover:text-accent-500 py-1 transition-colors duration-200 group"
          >
            <span>View Hostels</span>
            {/* Center-expanding Accent Line */}
            <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-accent-500 transition-all duration-300 ease-out group-hover:w-full" />
          </Link>

          <Link
            href={auth?.user ? route('student.dashboard') : route('login')}
            className="relative text-sm font-medium  text-white hover:text-accent-500 py-1 transition-colors duration-200 group"
          >
            <span>Apply Now</span>
            {/* Center-expanding Accent Line */}
            <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-accent-500 transition-all duration-300 ease-out group-hover:w-full" />
          </Link>
        </nav>


        {/* Right System Utilities Section */}
        <div className="flex items-center gap-4">
          <Link
            href="/get-help"
            className="text-sm font-medium  text-white hover:text-accent-500 transition-colors duration-200 flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" /> Help?
          </Link>
          {auth?.user ? (
            <Button asChild
              size="lg"
              variant="outline"
              className="gap-1.5 transition-all duration-300 ease-in-out hover:bg-brand-black hover:text-accent-500 hover:border-brand-600"
              >
              {/* 🚀 FIXED: Route dynamically based on their Spatie roles array to avoid Ziggy crashes */}
              <Link
                href={
                  auth.user.roles?.includes('admin') ||
                  auth.user.roles?.includes('super_admin')
                    ? route('admin.dashboard')
                    : route('student.dashboard')
                }
              >
                My Dashboard
              </Link>
            </Button>
          ) : (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-1.5 transition-all duration-300 ease-in-out hover:bg-brand-black hover:text-accent-500 hover:border-brand-600"
              >
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
