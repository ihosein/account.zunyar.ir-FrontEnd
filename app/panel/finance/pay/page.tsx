"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";
import { faNum, t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, formatMoney } from "@/lib/ui";
import { toast } from "@/lib/toast";

function PayContent() {
  const params = useSearchParams();
  const amount = useMemo(() => Number(params.get("amount") || 0), [params]);
  const bankTitle = params.get("bankTitle") || "—";

  return (
    <div>
      <Link
        href="/panel/finance"
        className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 hover:underline dark:text-accent-300"
      >
        <ArrowRight size={16} />
        {t("common.back")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-[var(--zy-ink)]">{t("panel.paymentTitle")}</h1>
      <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.paymentHint")}</p>

      <div className="glass-card-static mt-6 p-1">
        <div className="glass-inner !m-2 space-y-4 !p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CreditCard size={22} />
            </span>
            <div>
              <p className="text-xs text-[var(--zy-muted)]">{t("panel.transferAmount")}</p>
              <p className="text-2xl font-black text-[var(--zy-ink)]">
                {amount > 0 ? formatMoney(amount) : "—"}
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--zy-muted)]">
            {t("panel.paymentBank")}:{" "}
            <span className="font-semibold text-[var(--zy-ink)]">{bankTitle}</span>
          </p>
          <button
            type="button"
            className={`${dialogPrimaryBtnClass} w-full !bg-emerald-500 hover:!bg-emerald-600`}
            onClick={() => toast.info(t("common.comingSoon"))}
          >
            {t("panel.payNow")} ({faNum(amount || 0)})
          </button>
        </div>
      </div>
    </div>
  );
}

/** Temporary payment placeholder — gateway wiring comes later. */
export default function FinancePayPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>}
    >
      <PayContent />
    </Suspense>
  );
}
