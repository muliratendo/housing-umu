import React from 'react';
import { Link } from '@inertiajs/react';
import { route } from 'ziggy-js';

export default function Footer() {
    return (
      <footer className="w-full border-t bg-background py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-b pb-8">
          {/* Left Summary Block */}
          <div className="md:col-span-5 space-y-3 text-left">
            <div className="flex items-center gap-2.5 font-bold text-foreground">
              <span>Housing@UMU</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
              The official accommodation management portal for Uganda Martyrs
              University, Nkozi. Built to govern clear semestral allocations.
            </p>
          </div>

          {/* Center Links Matrix */}
          <div className="md:col-span-4 grid grid-cols-2 gap-4 text-left">
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Quick Actions
              </h5>
              <ul className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <li>
                  <Link
                    href="/hostels"
                    className="hover:text-foreground transition-colors"
                  >
                    View Hostes
                  </Link>
                </li>
                <li>
                  <Link
                    href={route('login')}
                    className="hover:text-foreground transition-colors"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-it-works"
                    className="hover:text-foreground transition-colors"
                  >
                    Allocation Flow
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Legal & Help
              </h5>
              <ul className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <li>
                  <Link
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact-support"
                    className="hover:text-foreground transition-colors"
                  >
                    Support Center
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Decorative SVG Graphics Area */}
          <div className="md:col-span-3 flex justify-start md:justify-end">
            <div className="h-32 w-64 bg-muted/30 border border-dashed rounded-xl flex items-center justify-center text-muted-foreground overflow-hidden">
              {/* 🚀 FIXED: Replaced generic SVG with your master high-fidelity app graphic */}
              <img
                src="/favicon_io/android-chrome-512x512.png"
                alt="UMU Housing Master Emblem"
                className="h-32 w-64 object-contain filter grayscale opacity-40 hover:opacity-80 hover:grayscale-0 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Bottom Legal Baseline */}
        <div className="mx-auto max-w-7xl pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            &copy; {new Date().getFullYear()} Uganda Martyrs University. All
            rights reserved.
          </div>
          <div className="font-medium font-sans select-none tracking-tight">
            Virtute et Sapientia
          </div>
        </div>
      </footer>
    );
}
