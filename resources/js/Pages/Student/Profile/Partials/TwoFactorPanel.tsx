// File: resources/js/Pages/Profile/Partials/TwoFactorPanel.tsx  NEW.
// Placeholder panel — fully activated when PragmaRX Google2FA is installed.
// Routes: profile.2fa.setup, profile.2fa.enable, profile.2fa.disable (commented in web.php)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react';

export default function TwoFactorPanel() {
  // When PragmaRX Google2FA is wired, replace `enabled` with a prop from
  // ProfileController::edit() → e.g. $user->two_factor_secret !== null
  const enabled = false; // TODO: replace with backend prop

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4 text-[#f1b418]" />
          Two-Factor Authentication
          {enabled ? (
            <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs">Enabled</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Disabled</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Add an extra layer of security using a TOTP authenticator app (Google Authenticator, Authy, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 p-4 flex items-start gap-3">
            <ShieldCheck className="size-5 text-green-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">2FA is active</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                Your account is protected by an authenticator app.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 p-4 flex items-start gap-3">
            <ShieldOff className="size-5 text-yellow-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">2FA is not enabled</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Enable two-factor authentication to protect your account from unauthorised access.
              </p>
            </div>
          </div>
        )}

        {/* Coming soon notice — remove this block once PragmaRX is installed */}
        <div className="rounded-lg border border-dashed p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {enabled ? 'Disable two-factor authentication' : 'Set up two-factor authentication'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This feature is coming soon. The system will prompt you to scan a QR code with your authenticator app.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled className="shrink-0">
            {enabled ? 'Disable' : 'Enable 2FA'}
          </Button>
        </div>

        {enabled && (
          <div className="rounded-lg border border-dashed p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Recovery Codes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Save your recovery codes in a safe place. They allow account access if you lose your device.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled className="shrink-0">View Codes</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
