// File: resources/js/Layouts/AuthenticatedLayout.tsx
import { useState, ReactNode } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  Home,
  User,
  LogOut,
  Settings,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlreadyLoggedInNotice } from "@/components/auth/AlreadyLoggedInNotice";
import {
  AppSidebarDesktop,
  AppSidebarMobile,
} from '@/components/Navigation/AppSidebar';
import '@/styles/states.css';

interface CustomPageProps {
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
      roles: string[];
      permissions: string[];
    };
  };
  [key: string]: any;
}

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AuthenticatedLayoutProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  header?: ReactNode;
  children: ReactNode;
}

export default function AuthenticatedLayout({
  title,
  breadcrumbs,
  header,
  children,
}: AuthenticatedLayoutProps) {
  const { auth } = usePage<CustomPageProps>().props;
  const user = auth.user;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [logoutOpen, setLogoutOpen] = useState<boolean>(false);

  const handleLogout = () => router.post(route('logout'));

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <AppSidebarDesktop />

      {/* ── MAIN CONTENT COLUMN ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 sm:pl-64 min-h-screen">
        {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 sm:px-6 shadow-sm">
          <AppSidebarMobile isOpen={isOpen} setIsOpen={setIsOpen} />

          {/* Page title only — breadcrumbs moved to body */}
          <div className="flex-1 sm:flex-initial">
            {header ? (
              <div className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {header}
              </div>
            ) : (
              <div className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {title ?? 'Dashboard'}
              </div>
            )}
          </div>

          {/* Top-right action bar */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={route('public.support')}>
                <HelpCircle className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={route('profile.edit')}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full bg-muted border hover:bg-black hover:text-accent-500 focus-visible:ring-1"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/*
                  WHY router.visit() instead of asChild + Link:
                  DropdownMenuItem passes a ref to its asChild child.
                  Inertia's <Link> is NOT wrapped in forwardRef, so the ref
                  cannot be attached → React warning + broken click behaviour.
                  router.visit() navigates programmatically without needing
                  a ref-capable child element.
                */}
                <DropdownMenuItem
                  onClick={() => router.visit(route('profile.edit'))}
                  className="cursor-pointer flex items-center gap-2 px-2 py-1.5 text-sm"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Account Settings</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.visit(route('public.support'))}
                  className="cursor-pointer flex items-center gap-2 px-2 py-1.5 text-sm"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Help &amp; Support</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/*
                  WHY onSelect with e.preventDefault():
                  Without it, Radix closes the dropdown before setLogoutOpen(true)
                  can fire, so the AlertDialog never receives its open=true signal.
                */}
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setLogoutOpen(true);
                  }}
                  className="cursor-pointer flex items-center gap-2 px-2 py-1.5 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/*
              WHY AlertDialog is OUTSIDE DropdownMenu:
              Radix unmounts DropdownMenuContent when the menu closes.
              If the AlertDialog were inside the content tree, it would be
              unmounted before it could animate open. Placing it as a sibling
              (at the same level as DropdownMenu) keeps it in the DOM and
              lets it open after the dropdown closes.
            */}
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out of Housing@UMU?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be redirected to the login page. Any unsaved
                    changes will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl space-y-4">
            {/* Breadcrumbs — rendered above page content when present */}
            {!header && breadcrumbs && breadcrumbs.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                {breadcrumbs.map((crumb, idx) => (
                  <span key={crumb.href ?? crumb.label} className="flex items-center gap-1">
                    {idx > 0 && <ChevronRight className="h-3 w-4" aria-hidden="true" />}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-foreground hover:underline transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            {children}
          </div>
        </main>

        <AlreadyLoggedInNotice />


        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="border-t bg-background mt-auto py-6 px-4 sm:px-6 md:px-8">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
            <div>
              &copy; {new Date().getFullYear()} Uganda Martyrs University. All
              rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link href={route('policy.privacy')} className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href={route('policy.terms')} className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href={route('policy.cookie')} className="hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
              <Link href={route('public.support')} className="hover:text-foreground transition-colors">
                Support Helpline
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
