"use client";

import { useState } from "react";
import { OdemeAlModal } from "@/components/OdemeAlModal";

interface AppointmentPaymentClientProps {
    appt: any; // Appointment object with customer and services
}

export function AppointmentPaymentClient({ appt }: AppointmentPaymentClientProps) {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);

    // Filter services that belong to a package
    const packageServices = appt.services?.filter((s: any) => s.session_plans) || [];

    if (packageServices.length === 0) return null;

    return (
        <div className="space-y-3">
            {packageServices.map((srv: any, index: number) => {
                const plan = srv.session_plans;
                const total = Number(plan.package_total_price) || 0;
                const paid = Number(plan.paid_amount) || 0;
                const balance = Math.max(0, total - paid);
                const isFullyPaid = plan.package_total_price !== null && balance <= 0;
                const paymentMode = plan.payment_mode || 'prepaid_full';

                return (
                    <div key={index} className="bg-purple-50/50 p-4 rounded-3xl border border-purple-100/50">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">style</span>
                                {srv.service?.name} (Paket)
                            </h5>
                            <span className="text-[9px] uppercase font-bold text-slate-500 bg-white px-2 py-1 border border-slate-100 rounded-lg">
                                {paymentMode === 'prepaid_full' ? 'PEŞİN KAPSAM' : 'SEANS BAŞI'}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                            <div className="bg-white border flex flex-col items-center justify-center py-2 rounded-xl">
                                <span className="text-slate-400 font-bold mb-1">Tutar</span>
                                <span className="text-slate-800 font-extrabold">{total}₺</span>
                            </div>
                            <div className="bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center py-2 rounded-xl">
                                <span className="font-bold mb-1 opacity-70">Ödenen</span>
                                <span className="font-extrabold">{paid}₺</span>
                            </div>
                            <div className={`flex flex-col items-center justify-center py-2 rounded-xl ${balance > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}`}>
                                <span className="font-bold mb-1 opacity-70">Kalan</span>
                                <span className="font-extrabold">{balance}₺</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 text-xs">
                            {isFullyPaid && total > 0 ? (
                                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm font-bold">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    Peşin Ödendi - Ödeme Beklenmiyor
                                </span>
                            ) : total > 0 ? (
                                <button
                                    onClick={() => {
                                        setSelectedPackage(plan);
                                        setIsPaymentModalOpen(true);
                                    }}
                                    className="bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg font-bold shadow-sm hover:opacity-90 flex items-center gap-1.5 transition-opacity"
                                >
                                    <span className="material-symbols-outlined text-[14px]">payments</span>
                                    Ödeme Al
                                </button>
                            ) : null}
                        </div>
                    </div>
                );
            })}

            {isPaymentModalOpen && selectedPackage && (
                <OdemeAlModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    customerId={appt.customer_id}
                    sessionPlanId={selectedPackage.id}
                    appointmentId={appt.id}
                    suggestedAmount={selectedPackage.package_total_price - (selectedPackage.paid_amount || 0)}
                    title="Paket Ödemesi (Randevudan)"
                    description={`Kalan borç: ${selectedPackage.package_total_price - (selectedPackage.paid_amount || 0)} ₺`}
                />
            )}
        </div>
    );
}
