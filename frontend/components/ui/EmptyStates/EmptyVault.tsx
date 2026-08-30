import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/utils/cn";

interface EmptyVaultProps {
  /** Optional call-to-action link, e.g. to upload the first file. */
  ctaHref?: string;
  ctaLabel?: string;
  /** Optional class name applied to the outer container. */
  className?: string;
}

export default function EmptyVault({
  ctaHref = "/register",
  ctaLabel = "Secure your first file",
  className,
}: EmptyVaultProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 px-6 text-center",
        "rounded-2xl border-2 border-dashed",
        "border-gray-200 dark:border-white/10",
        "bg-gray-50/50 dark:bg-white/[0.02]",
        className,
      )}
      role="status"
      data-testid="empty-vault"
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-gray-400" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        Your vault is empty
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        Files you secure will appear here, encrypted and ready for verification.
      </p>
      {ctaHref && (
        <Link
          href={ctaHref}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-dark shadow-button-glow transition-all"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
