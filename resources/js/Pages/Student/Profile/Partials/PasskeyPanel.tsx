// File: resources/js/Pages/Profile/Partials/PasskeyPanel.tsx  NEW.
// Placeholder panel — activated when a WebAuthn/Passkey package is installed.
// Routes: profile.passkeys, profile.passkeys.register, profile.passkeys.destroy (commented in web.php)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Plus, Trash2 } from 'lucide-react';

export default function PasskeyPanel() {
  // When WebAuthn is wired, replace with a passkeys prop from ProfileController::edit()
  const passkeys: { id: number; name: string; created_at: string }[] = []; // TODO: backend prop

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Fingerprint className="size-4 text-[#f1b418]" />
          Passkeys
        </CardTitle>
        <CardDescription>
          Sign in using biometrics (fingerprint, Face ID) or a hardware security key instead of a password.
          Passkeys are phishing-resistant and more secure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {passkeys.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Fingerprint className="size-8 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1} />
            <p className="text-sm font-medium text-muted-foreground">No passkeys registered</p>
            <p className="text-xs text-muted-foreground mt-1">
              Passkey support is coming soon. You will be able to register your device biometrics here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border">
            {passkeys.map((pk) => (
              <div key={pk.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{pk.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(pk.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <Plus className="size-4" /> Register New Passkey
        </Button>
      </CardContent>
    </Card>
  );
}
