"use client";

import { useState, useTransition } from "react";
import { addPayment } from "@/app/actions/payments";

interface OdemeAlModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    sessionPlanId?: string;
    appointmentId?: string;
    suggestedAmount?: number;
    title: string;
    description?: string;
}

export function OdemeAlModal({
    isOpen,
    onClose,
    customerId,
    sessionPlanId,
    appointmentId,
    suggestedAmount = 0,
    title,
    description
}: OdemeAlModalProps) {
    const [amount, setAmount] = useState<string>(suggestedAmount > 0 ? suggestedAmount.toString() : "");
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'bank_transfer' | 'other'>("cash");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    if (!isOpen) return null;

    const handleSubmit = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Lütfen geçerli bir tutar girin.");
            return;
        }

        startTransition(async () => {
            setError("");
            const result = await addPayment({
                customer_id: customerId,
                session_plan_id: sessionPlanId,
                appointment_id: appointmentId,
                amount: numAmount,
                payment_method: paymentMethod,
                notes
            });

            if (result.success) {
                onClose();
            } else {
                setError(result.error || "Ödeme alınırken bir hata oluştu.");
            }
        });
    };

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9998] transition-opacity" onClick={onClose} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-[9999] overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors" disabled={isPending}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {description && <p className="text-sm text-slate-500 mb-6">{description}</p>}

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 font-bold border border-red-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Tutar */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tutar (₺)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold material-symbols-outlined">payments</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                disabled={isPending}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Yöntem */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ödeme Yöntemi</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'cash', icon: 'payments', label: 'Nakit' },
                                { id: 'credit_card', icon: 'credit_card', label: 'Kredi Kartı' },
                                { id: 'bank_transfer', icon: 'account_balance', label: 'Havale/EFT' },
                                { id: 'other', icon: 'wallet', label: 'Diğer' }
                            ].map(method => (
                                <button
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id as any)}
                                    disabled={isPending}
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-bold justify-center ${paymentMethod === method.id
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                                            : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{method.icon}</span>
                                    {method.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Not */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Not (Opsiyonel)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isPending}
                            rows={2}
                            placeholder="Ödeme ile ilgili notlar..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all resize-none"
                        ></textarea>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-[0_8px_16px_-6px_rgba(var(--color-primary-rgb),0.5)] hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isPending ? (
                            <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                        )}
                        Ödeme Al
                    </button>
                </div>
            </div>
        </>
    );
}
