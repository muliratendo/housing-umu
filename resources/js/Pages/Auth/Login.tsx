import { useEffect, FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function Login({ status, canResetPassword }: { status?: string; canResetPassword?: boolean }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            {status && (
                <div className="mb-4 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 p-3 rounded-md">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    {errors.email && <p className="text-xs font-semibold text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    {errors.password && <p className="text-xs font-semibold text-destructive">{errors.password}</p>}
                </div>

                <div className="flex items-center space-x-2 py-1">
                    <Checkbox
                        id="remember"
                        checked={data.remember}
                        onCheckedChange={(checked) => setData('remember', checked === true)}
                    />
                    <label htmlFor="remember" className="text-sm font-medium leading-none text-muted-foreground cursor-pointer select-none">
                        Remember my session
                    </label>
                </div>

                <Button type="submit" className="w-full font-medium" disabled={processing}>
                    {processing ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                        Don't have an account?{' '}
                        <Link href={route('register')} className="underline hover:text-foreground font-medium transition-colors">
                            Register here
                        </Link>
                    </p>
                </div>
            </form>
        </GuestLayout>
    );
}
