"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OdemeAlModal } from "@/components/OdemeAlModal";

interface SessionPlanPaymentClientProps {
    planId: string;
    customerId: string;
    packageTotalPrice: number | null;
    paidAmount: number;
    paymentMode: string;
}

export function SessionPlanPaymentClient({
    planId,
    customerId,
    packageTotalPrice,
    paidAmount,
    paymentMode
}: SessionPlanPaymentClientProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const total = Number(packageTotalPrice) || 0;
    const paid = Number(paidAmount) || 0;
    const balance = Math.max(0, total - paid);

    const isFullyPaid = packageTotalPrice !== null && balance <= 0;

    return (
        <div className="mt-3 bg-purple-50/50 p-3 rounded-xl border border-purple-100/50 text-xs text-slate-700">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-purple-100">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Paket Tutarı</span>
                <span className="font-extrabold text-slate-800 text-sm">₺{total}</span>
            </div>

            <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-600">Ödenen</span>
                <span className="font-bold text-emerald-600">₺{paid}</span>
            </div>

            <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-slate-600">Kalan Bakiye</span>
                <span className={`font-bold ${balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>₺{balance}</span>
            </div>

            <div className="flex flex-col gap-2 border-t border-purple-100/50 pt-3">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-white px-2 py-1 border border-slate-100 rounded-lg">
                        MOD: {paymentMode === 'prepaid_full' ? 'PEŞİN KAPSAM' : 'SEANS BAŞI'}
                    </span>

                    {!isFullyPaid && total > 0 && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg font-bold shadow-sm hover:opacity-90 flex items-center gap-1 transition-opacity text-xs"
                        >
                            <span className="material-symbols-outlined text-[14px]">payments</span>
                            Ödeme Al
                        </button>
                    )}
                    {isFullyPaid && total > 0 && (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Ödendi
                        </span>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <OdemeAlModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        router.refresh(); // Sayfayı yeniden yükle: totalSpent ve paid güncellensin
                    }}
                    customerId={customerId}
                    sessionPlanId={planId}
                    suggestedAmount={balance}
                    title="Paket Ödemesi"
                    description={`${total} ₺ tutarındaki paket için ödeme alıyorsunuz. Kalan borç: ${balance} ₺.`}
                />
            )}
        </div>
    );
}
