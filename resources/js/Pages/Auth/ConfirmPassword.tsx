import { useEffect, FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

            {/* Security Notice Banner */}
            <div className="mb-4 text-sm text-muted-foreground leading-relaxed">
                This is a secure area of the application. Please confirm your
                password before continuing.
            </div>

            <form onSubmit={submit} className="space-y-4">
                {/* Password Input Block */}
                <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    {errors.password && (
                        <p className="text-xs font-semibold text-destructive">{errors.password}</p>
                    )}
                </div>

                {/* Submit Trigger Action row */}
                <div className="pt-2 flex justify-end">
                    <Button type="submit" className="w-full font-medium" disabled={processing}>
                        {processing ? 'Confirming...' : 'Confirm Password'}
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
