import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

interface EditProps {
    mustVerifyEmail: boolean;
    status?: string;
}

export default function Edit({ mustVerifyEmail, status }: EditProps) {
    return (
        <AuthenticatedLayout header="Profile Settings">
            <Head title="Profile" />

            {/* Profile Context Heading Description */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
                    Manage Account Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Update your Uganda Martyrs University portal login settings, credentials, and personal records.
                </p>
            </div>

            {/* Main Segment Wrapper using shadcn layouts structure */}
            <div className="space-y-6 max-w-4xl">

                {/* 1. Profile Information Section Card */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 sm:p-8">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                </div>

                {/* 2. Security / Credentials Section Card */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 sm:p-8">
                    <UpdatePasswordForm className="max-w-xl" />
                </div>

                {/* 3. Account Actions / Removal Section Card */}
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 text-card-foreground shadow-sm p-6 sm:p-8">
                    <DeleteUserForm className="max-w-xl" />
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
