// File: resources/js/Pages/Profile/Edit.tsx  REPLACE existing.
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, User, Trash2, Lock, Fingerprint } from 'lucide-react';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import TwoFactorPanel from './Partials/TwoFactorPanel';
import PasskeyPanel from './Partials/PasskeyPanel';
import DeleteUserForm from './Partials/DeleteUserForm';

interface EditProps {
  mustVerifyEmail: boolean;
  status?: string;
}

export default function Edit({ mustVerifyEmail, status }: EditProps) {
  return (
    <AuthenticatedLayout
      title="Account Settings"
      breadcrumbs={[
        { label: 'Dashboard', href: route('dashboard') },
        { label: 'Account Settings', href: route('profile.edit') },
      ]}
    >
      <Head title="Account Settings – Housing@UMU" />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Uganda Martyrs University portal credentials, security, and preferences.
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted rounded-lg">
            <TabsTrigger value="profile" className="flex items-center gap-2 text-xs sm:text-sm">
              <User className="size-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2 text-xs sm:text-sm">
              <Key className="size-3.5" /> Password
            </TabsTrigger>
            <TabsTrigger value="2fa" className="flex items-center gap-2 text-xs sm:text-sm">
              <Shield className="size-3.5" />
              Two-Factor
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-0.5">Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="passkeys" className="flex items-center gap-2 text-xs sm:text-sm">
              <Fingerprint className="size-3.5" />
              Passkeys
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-0.5">Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex items-center gap-2 text-xs sm:text-sm text-destructive data-[state=active]:text-destructive">
              <Trash2 className="size-3.5" /> Danger Zone
            </TabsTrigger>
          </TabsList>

          {/* ── Profile tab ─────────────────────────────────────────── */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="size-4 text-[#f1b418]" /> Profile Information
                </CardTitle>
                <CardDescription>
                  Update your name and email address. Email changes require re-verification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Password tab ────────────────────────────────────────── */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="size-4 text-[#f1b418]" /> Update Password
                </CardTitle>
                <CardDescription>
                  Use a long, random password that is unique to this account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UpdatePasswordForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── 2FA tab ─────────────────────────────────────────────── */}
          <TabsContent value="2fa">
            <TwoFactorPanel />
          </TabsContent>

          {/* ── Passkeys tab ────────────────────────────────────────── */}
          <TabsContent value="passkeys">
            <PasskeyPanel />
          </TabsContent>

          {/* ── Danger Zone tab ─────────────────────────────────────── */}
          <TabsContent value="danger">
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <Trash2 className="size-4" /> Delete Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data.
                  This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeleteUserForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Policy links footer */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          By using Housing@UMU you agree to our{' '}
          <Link href={route('policy.terms')} className="underline hover:text-foreground">Terms of Service</Link>
          {' '}and{' '}
          <Link href={route('policy.privacy')} className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </AuthenticatedLayout>
  );
}
