"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Upload, X } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  icon?: ReactNode;
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: EmptyStateAction[];
}

const variantClass = {
  primary: "bg-primary text-white hover:bg-primary/90 border-primary",
  secondary: "bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 dark:border-white/10",
};

function EmptyStateActionButton({ action }: { action: EmptyStateAction }) {
  const className = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${variantClass[action.variant ?? "primary"]}`;

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.icon}
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.icon}
      {action.label}
    </button>
  );
}

export default function EmptyState({ title, description, icon, actions = [] }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]" role="status">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon ?? <Upload className="h-6 w-6" aria-hidden />}
      </div>
      <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {actions.length > 0 && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {actions.map((action) => (
            <EmptyStateActionButton key={action.label} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}

export function noResultsActions(onClearFilters: () => void): EmptyStateAction[] {
  return [{ label: "Clear filters", onClick: onClearFilters, variant: "secondary", icon: <X className="h-4 w-4" aria-hidden /> }];
}

export function uploadFirstAssetAction(href = "/launch"): EmptyStateAction {
  return { label: "Upload first asset", href, icon: <Upload className="h-4 w-4" aria-hidden /> };
}
