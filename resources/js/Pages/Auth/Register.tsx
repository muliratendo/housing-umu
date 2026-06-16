import { useEffect, FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register Account" />

            <form onSubmit={submit} className="space-y-4">
                {/* Full Name Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        name="name"
                        value={data.name}
                        className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="name"
                        autoFocus
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    {errors.name && <p className="text-xs font-semibold text-destructive">{errors.name}</p>}
                </div>

                {/* Email Address Field */}
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

                {/* Password Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    {errors.password && <p className="text-xs font-semibold text-destructive">{errors.password}</p>}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className={errors.password_confirmation ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    {errors.password_confirmation && (
                        <p className="text-xs font-semibold text-destructive">{errors.password_confirmation}</p>
                    )}
                </div>

                {/* Action Row */}
                <div className="pt-2 space-y-3">
                    <Button type="submit" className="w-full font-medium" disabled={processing}>
                        {processing ? 'Creating Account...' : 'Register'}
                    </Button>

                    <div className="text-center">
                        <Link
                            href={route('login')}
                            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors font-medium"
                        >
                            Already registered? Sign In
                        </Link>
                    </div>
                </div>
            </form>
        </GuestLayout>
    );
}
