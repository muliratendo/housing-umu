// File: resources/js/Layouts/AuthenticatedLayout.tsx
import { useState, ReactNode } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  Menu,
  Home,
  User,
  LogOut,
  Settings,
  HelpCircle,
  BedDouble,
  List,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
// NOTE: AlertDialogTrigger is intentionally NOT imported —
// logout dialogs are controlled via state, not a trigger child.

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
  href: string;
}

interface AuthenticatedLayoutProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  header?: ReactNode;
  children: ReactNode;
}

// ─── Sub-components defined OUTSIDE the parent ───────────────────────────────
// WHY: Defining components inside the parent causes React to unmount/remount
// them on every parent render (new function reference = new component identity).
// This breaks focus, animation state, and Radix portal contexts (AlertDialog,
// Sheet, Dropdown). They are now stable component definitions hoisted to
// module scope, receiving data via props.

interface NavLinksProps {
  onClickCallback?: () => void;
}

function CoreNavLinks({ onClickCallback }: NavLinksProps) {
  const { auth } = usePage<CustomPageProps>().props;
  const userRoles = auth.user?.roles ?? [];

  const links = [
    {
      name: 'Dashboard',
      href: route('student.dashboard'),
      icon: Home,
      routeName: 'student.dashboard',
      allowedRoles: ['student'],
    },
    {
      name: 'Hostels',
      href: route('student.hostels.index'),
      icon: BedDouble,
      routeName: 'student.hostels.index',
      allowedRoles: ['student'],
    },
    {
      name: 'My Applications',
      href: route('student.applications.index'),
      icon: List,
      routeName: 'student.applications.index',
      allowedRoles: ['student'],
    },
    {
      name: 'Maintenance',
      href: route('student.maintenance.index'),
      icon: ClipboardList,
      routeName: 'student.maintenance.index',
      allowedRoles: ['student'],
    },
    {
      name: 'Admin Dashboard',
      href: route('admin.dashboard'),
      icon: Home,
      routeName: 'admin.dashboard',
      allowedRoles: ['warden', 'super_admin'],
    },
  ];

  const filteredLinks = links.filter((link) =>
    link.allowedRoles.some((role) => userRoles.includes(role))
  );

  return (
    <div className="flex flex-col gap-1 w-full">
      {filteredLinks.map((link) => {
        const Icon = link.icon;
        const isActive = route().current(link.routeName);
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onClickCallback}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${isActive
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {link.name}
          </Link>
        );
      })}
    </div>
  );
}

function SettingsNavLinks({ onClickCallback }: NavLinksProps) {
  // WHY local state here: the AlertDialog for logout lives inside this
  // component and its open state should not bubble up to the layout.
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    // WHY router.post instead of useForm().post:
    // useForm() is a hook — it can't be called conditionally inside an event
    // handler. router.post() is a plain function call that works anywhere.
    router.post(route('logout'), {}, {
      onSuccess: () => onClickCallback?.(),
    });
  };

  const settingsLinks = [
    {
      name: 'Account Settings',
      href: route('profile.edit'),
      icon: Settings,
      routeName: 'profile.edit',
    },
    {
      name: 'Help & Support',
      href: route('public.support'),
      icon: HelpCircle,
      routeName: 'public.support',
      // WHY changed: 'support' is not a registered Ziggy route name.
      // route().current('support') would throw. Use the real route name.
    },
  ];

  return (
    <div className="flex flex-col gap-1 w-full">
      {settingsLinks.map((link) => {
        const Icon = link.icon;
        const isActive = route().current(link.routeName);
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onClickCallback}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${isActive
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {link.name}
          </Link>
        );
      })}

      {/* Logout button — opens AlertDialog via state, not AlertDialogTrigger */}
      <button
        onClick={() => setLogoutOpen(true)}
        className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-all mt-1"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Log Out
      </button>

      {/*
        WHY AlertDialog is here and NOT wrapping the button:
        AlertDialogTrigger uses asChild which pushes a ref to its child.
        A plain <button> supports refs fine, but keeping the dialog
        state-controlled (open={logoutOpen}) is more explicit and avoids
        Radix ref-forwarding issues when this component is inside a Sheet.
      */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Housing@UMU?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page. Any unsaved changes
              will be lost.
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
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-background sm:flex justify-between">
        <div className="flex flex-col flex-1">
          <Link
            href="/"
            className="flex h-16 items-center gap-2 border-b px-6 bg-background"
          >
            {/* Left Brand Image Anchor */}
            <img
              src="/favicon/favicon-96x96.png"
              alt="UMU Housing Logo"
              className="h-10 w-auto object-contain shrink-0"
            />
            {/* Right System Text Workspace Matrix */}
            <div className="hidden sm:flex flex-col justify-center leading-none">
              {/* Stylized Brand Name displaying Logo-accurate Custom Font Stack */}
              <span className="font-logo text-black text-xl sm:text-1x2 text-brand-black tracking-normal">
                <span className="text-xl sm:text-2xl font-medium">H</span>ousing
                <span className="text-xl sm:text-2xl font-medium text-accent-500">@</span>
                <span className="text-xl sm:text-2xl font-medium">U</span>
                <span>M</span>
                <span className="text-xl sm:text-2xl font-medium">U</span>
              </span>
            </div>
          </Link>
          <nav className="px-4 py-6 overflow-y-auto">
            <CoreNavLinks />
          </nav>
        </div>

        <div className="border-t p-4 bg-muted/20">
          <nav>
            <SettingsNavLinks />
          </nav>
        </div>
      </aside>

      {/* ── MAIN CONTENT COLUMN ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 sm:pl-64 min-h-screen">

        {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 sm:px-6 shadow-sm">

          {/* Mobile hamburger */}
          <div className="flex items-center gap-4 sm:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                {/*
                  WHY Button works here with asChild:
                  shadcn Button uses React.forwardRef, so Radix can attach
                  its ref without warnings.
                */}
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 p-4 flex flex-col justify-between h-full"
              >
                <div className="flex flex-col gap-6">
                  <SheetHeader className="text-left border-b pb-4">
                    <SheetTitle className="flex items-center gap-2 text-lg font-bold">
                      <img
                        src="/favicon/favicon-96x96.png"
                        alt="UMU Housing Logo"
                        className="h-6 w-6 object-contain shrink-0"
                      />
                      <span>Housing@UMU</span>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex-1">
                    <CoreNavLinks onClickCallback={() => setIsOpen(false)} />
                  </nav>
                </div>
                <div className="border-t pt-4">
                  <nav>
                    <SettingsNavLinks onClickCallback={() => setIsOpen(false)} />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>

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
