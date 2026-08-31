"use client";

import Header from "@/components/Header";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";

export default function FiatCheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]">
      <Header />
      <main id="main-content" className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_420px]">
        <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#08111f]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Secure checkout</p>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pay with credit card</h1>
            </div>
          </div>

          <form className="space-y-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cardholder name<input className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white" placeholder="Ada Lovelace" /></label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Card number<input inputMode="numeric" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white" placeholder="4242 4242 4242 4242" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiration<input inputMode="numeric" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white" placeholder="MM / YY" /></label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CVC<input inputMode="numeric" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white" placeholder="123" /></label>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Billing email<input type="email" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white" placeholder="you@example.com" /></label>
            <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary/90"><Lock className="h-5 w-5" aria-hidden />Pay $9.00 securely</button>
          </form>
        </section>

        <aside className="h-fit rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#08111f]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Personal plan</span><span className="font-medium text-gray-900 dark:text-white">$9.00</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Processing fee</span><span className="font-medium text-gray-900 dark:text-white">$0.00</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-4 text-base dark:border-white/10"><span className="font-semibold text-gray-900 dark:text-white">Total</span><span className="font-bold text-primary">$9.00</span></div>
          </div>
          <p className="mt-6 flex items-start gap-2 rounded-2xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />Card details are collected in a secure form shell ready for payment-provider tokenization.</p>
        </aside>
      </main>
    </div>
  );
}
