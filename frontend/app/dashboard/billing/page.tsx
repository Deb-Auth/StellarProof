"use client";

import React from "react";
import InvoicesView from "./invoices";

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-darkblue-dark px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <InvoicesView />
      </div>
    </main>
  );
}
