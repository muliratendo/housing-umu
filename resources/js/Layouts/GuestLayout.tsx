import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';
import TopNav from '@/components/TopNav'; // 🚀 Import extracted navigation bar
import Footer from '@/components/Footer'; // 🚀 Import extracted footer

interface GuestLayoutProps {
    children: ReactNode;
    showNavAndFooter?: boolean; // 🚀 Flag to switch layouts conditionally
}

export default function GuestLayout({ children, showNavAndFooter = false }: GuestLayoutProps) {
    // 1. MARKETING / CONTENT VIEW SHELL (Welcome, How it works, About Us, Contact)
    if (showNavAndFooter) {
        return (
            <div className="flex min-h-screen flex-col bg-background">
                <TopNav />
                {/* Clean, un-boxed content injection area for full page sections */}
                <main className="flex-1">
                    {children}
                </main>
                <Footer />
            </div>
        );
    }

    // 2. AUTHENTICATION VIEW SHELL (Login, Register, Reset Password)
    return (
        <div className="flex min-h-screen flex-col bg-muted/30 justify-center items-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-md space-y-6">
                <div className="flex flex-col items-center gap-2 text-center">
                    <Link href="/">
                        <img src="/images/umu.png" alt="UMU Logo" className="h-28 w-32 object-contain mx-auto animate-in fade-in zoom-in-95 duration-200" />
                        <h1 className="text-2xl font-bold tracking-tight mt-2 text-foreground">UMU Accommodation Portal</h1>
                    </Link>
                </div>

                {/* Secure Auth Input Box layout wrapper card */}
                <div className="w-full bg-background rounded-2xl border shadow-sm p-6 md:p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
