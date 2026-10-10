// resources/js/components/auth/LogoutConfirmationDialog.tsx

import { useState } from "react";
import { router } from "@inertiajs/react";
import { route } from "ziggy-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LogoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * PURPOSE:
 * The single logout confirmation implementation used by both:
 * - AppSidebar Settings > Log Out
 * - “Already signed in” toast action
 *
 * This prevents two logout flows from drifting apart.
 */
export function LogoutConfirmationDialog({
  open,
  onOpenChange,
}: LogoutConfirmationDialogProps) {
  function confirmLogout() {
    router.post(route("logout"), {}, {
      onFinish: () => onOpenChange(false),
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of Housing@UMU?</AlertDialogTitle>
          <AlertDialogDescription>
            You will return to the login page. Any unsaved changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Stay signed in</AlertDialogCancel>

          <AlertDialogAction
            onClick={confirmLogout}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sign out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
