import { useState, ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
  Menu,
  Home,
  User,
  LogOut,
  Settings,
  GraduationCap,
  Building2,
  Landmark,
  HelpCircle,
  ShieldAlert,
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

interface CustomPageProps {
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
      roles: string[]; // 👈 Explicitly type your Spatie roles array
      permissions: string[]; // 👈 Explicitly type your Spatie permissions array
    };
  };
  [key: string]: any;
}

interface AuthenticatedLayoutProps {
  header?: ReactNode;
  children: ReactNode;
}

export default function AuthenticatedLayout({
  header,
  children,
}: AuthenticatedLayoutProps) {
  const { auth } = usePage<CustomPageProps>().props;
  const user = auth.user;
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Primary Core Links List Loop
  // Primary Navigation Section Loop with Custom Role Constraints Filter
  const CoreNavLinks = ({
    onClickCallback,
  }: {
    onClickCallback?: () => void;
  }) => {
    const { auth } = usePage<CustomPageProps>().props;
    const userRoles = auth.user?.roles || [];

    // Comprehensive array mapping routes to authorized Spatie tiers
    const links = [
      // Student Workspace Routes
      {
        name: 'Dashboard',
        href: route('student.dashboard'),
        icon: Home,
        routeName: 'student.dashboard',
        allowedRoles: ['student'],
      },
      {
        name: 'My Bookings',
        href: '#',
        icon: Building2,
        routeName: 'student.bookings',
        allowedRoles: ['student'],
      },

      // Warden & Landlord Workspace Routes
      {
        name: 'Admin Dashboard',
        href: route('admin.dashboard'),
        icon: Home,
        routeName: 'admin.dashboard',
        allowedRoles: ['warden', 'super_admin'],
      },
      {
        name: 'Property Allocations',
        href: '#',
        icon: Landmark,
        routeName: 'allocations',
        allowedRoles: ['warden', 'affiliated_admin', 'super_admin'],
      },
      {
        name: 'Pending Approvals',
        href: '#',
        icon: ShieldAlert,
        routeName: 'admin.verifications',
        allowedRoles: ['warden', 'dean', 'super_admin'],
      },
      {
        name: 'Platform Settings',
        href: '#',
        icon: Settings,
        routeName: 'system.settings',
        allowedRoles: ['super_admin'],
      },
    ];

    // Filter and compile links based on array intersection evaluation rules
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
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
  };

  // Account & Structural Settings Lower Navigation Block
  const SettingsNavLinks = ({
    onClickCallback,
  }: {
    onClickCallback?: () => void;
  }) => {
    const settingsLinks = [
      {
        name: 'Account Settings',
        href: route('profile.edit'),
        icon: Settings,
        routeName: 'profile.edit',
      },
      {
        name: 'Help & Support',
        href: '#',
        icon: HelpCircle,
        routeName: 'support',
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.name}
            </Link>
          );
        })}

        {/* Inertia Form Link Post Action Helper */}
        <Link
          href={route('logout')}
          method="post"
          as="button"
          onClick={onClickCallback}
          className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-all mt-1"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log Out
        </Link>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* =========================================================================
                DESKTOP SIDEBAR SHELL (ANCHORED PANEL DESIGN) + LOGO (Using 512px crisp master graphic)
               ========================================================================= */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-background sm:flex justify-between">
        {/* Header Branding + Primary Links Wrapper Block */}
        <div className="flex flex-col flex-1">
          <div className="flex h-16 items-center gap-2 border-b px-6 bg-background">
            {/* Target your 512px icon from public asset tree */}
            <img
              src="/favicon_io/android-chrome-512x512.png"
              alt="UMU Housing Logo"
              className="h-8 w-8 object-contain shrink-0"
            />
            <span className="text-lg font-bold tracking-tight text-foreground">
              UMU Housing
            </span>
          </div>
          <nav className="px-4 py-6 overflow-y-auto">
            <CoreNavLinks />
          </nav>
        </div>

        {/* Anchored Bottom Footnote Component Panel */}
        <div className="border-t p-4 bg-muted/20">
          <div className="mb-3 px-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Account & Settings
            </p>
          </div>
          <nav>
            <SettingsNavLinks />
          </nav>
        </div>
      </aside>

      {/* Core Application Stage Framework */}
      <div className="flex flex-col flex-1 sm:pl-64 min-h-screen">
        {/* =========================================================================
                    SHARED APP TOP HEADER
                   ========================================================================= */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 sm:px-6 shadow-sm">
          {/* Mobile Dynamic Pull-Out Drawers Container + Logo */}
          <div className="flex items-center gap-4 sm:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
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
                        src="/favicon_io/android-chrome-512x512.png"
                        alt="UMU Housing Logo"
                        className="h-6 w-6 object-contain shrink-0"
                      />
                      <span>UMU Housing</span>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex-1">
                    <CoreNavLinks onClickCallback={() => setIsOpen(false)} />
                  </nav>
                </div>

                {/* Mobile Bottom Sheet Drawer Extension mapping */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                    Account & Settings
                  </p>
                  <nav>
                    <SettingsNavLinks
                      onClickCallback={() => setIsOpen(false)}
                    />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Header Context Title Slot */}
          <div className="flex-1 sm:flex-initial">
            {header ? (
              <div className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {header}
              </div>
            ) : (
              <div className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                Dashboard
              </div>
            )}
          </div>

          {/* Top Header Controls Container */}
          <div className="flex items-center gap-2">
            {/* 🚀 New Notification Link Anchor Button */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="#">
                <svg
                  xmlns="http://w3.org"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3c0 1.3 1.1 2.3 2.4 2.3s2.4-1 2.4-2.3" />
                </svg>
                {/* Optional Alert Ping Dot */}
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
              </Link>
            </Button>

            {/* Top Header Right Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full bg-muted border hover:bg-muted/80 focus-visible:ring-1"
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

                {/* 🛠️ Account Settings Routing Action */}
                <DropdownMenuItem asChild>
                  <Link
                    href={route('profile.edit')}
                    className="w-full cursor-pointer flex items-center gap-2 px-2 py-1.5 text-sm"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Account Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 🛠️ Log Out Post Submission Action */}
                <DropdownMenuItem asChild>
                  <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="w-full text-left cursor-pointer flex items-center gap-2 px-2 py-1.5 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* =========================================================================
                    MAIN INTERACTIVE CONTENT SPACE
                   ========================================================================= */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        {/* =========================================================================
                    FOOTER METRICS BAR SHELL
                   ========================================================================= */}
        <footer className="border-t bg-background mt-auto py-6 px-4 sm:px-6 md:px-8">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
            <div>
              &copy; {new Date().getFullYear()} Uganda Martyrs University. All
              rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Support Helpline
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
