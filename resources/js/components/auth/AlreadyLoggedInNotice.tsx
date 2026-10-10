// resources/js/components/auth/AlreadyLoggedInNotice.tsx

import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutConfirmationDialog } from "@/components/auth/LogoutConfirmationDialog";

interface FlashNotice {
  type: "info" | "warning";
  title: string;
  message: string;
  showLogoutAction: boolean;
}

interface PageProps {
  flash?: {
    authNotice?: FlashNotice | null;
  };
}

/**
 * PURPOSE:
 * Displays the single-use Laravel flash notice after an authenticated person
 * attempts to open Login, Register, or password-reset pages.
 */
export function AlreadyLoggedInNotice() {
  const { flash } = usePage<PageProps>().props;
  const notice = flash?.authNotice;

  const [visible, setVisible] = useState(Boolean(notice));
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    setVisible(Boolean(notice));
  }, [notice]);

  if (!notice || !visible) {
    return null;
  }

  return (
    <>
      <div
        className="fixed right-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border bg-background p-4 shadow-lg"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{notice.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {notice.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Dismiss notice"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {notice.showLogoutAction && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="mr-2 size-4" />
            Sign out instead
          </Button>
        )}
      </div>

      <LogoutConfirmationDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
      />
    </>
  );
}
