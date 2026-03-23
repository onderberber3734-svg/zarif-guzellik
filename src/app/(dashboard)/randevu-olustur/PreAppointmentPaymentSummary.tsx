"use client";

import { useState, useEffect } from "react";
import { OdemeAlModal } from "@/components/OdemeAlModal";
import { UpdateSessionPlanModal } from "@/components/UpdateSessionPlanModal";

export function PreAppointmentPaymentSummary({ selectedCustomer, selectedServices, appointments, appointmentDate, onOverridesChange }: { selectedCustomer: any, selectedServices: any[], appointments: any[], appointmentDate?: string, onOverridesChange?: (overrides: Record<string, any>) => void }) {
    const [paymentModalData, setPaymentModalData] = useState<{ isOpen: boolean; plan: any } | null>(null);
    const [updateModalData, setUpdateModalData] = useState<{ isOpen: boolean; plan: any; futureAppointmentsCount: number; completedCount: number, isNew?: boolean } | null>(null);
    const [localOverrides, setLocalOverrides] = useState<Record<string, { total_sessions: number, interval_days: number, prepayment: number }>>({});

    useEffect(() => {
        if (onOverridesChange) onOverridesChange(localOverrides);
    }, [localOverrides, onOverridesChange]);

    if (!selectedCustomer || selectedServices.length === 0) return null;

    const activeSessionPlans = selectedCustomer.session_plans?.filter((p: any) => p.status === 'active') || [];

    // Filter services that are configured as 'package'
    const packageServices = selectedServices.filter(s => s.service_type === 'package');

    if (packageServices.length === 0) return null;

    return (
        <div className="mt-6 space-y-4">
            {packageServices.map((service, index) => {
                const existingPlan = activeSessionPlans.find((p: any) => p.service_id === service.id);
                
                // If it's a completely new plan that will be created on save
                if (!existingPlan) {
                    const override = localOverrides[service.id];
                    const totalSessions = override?.total_sessions || service.default_total_sessions;
                    const intervalConfig = override?.interval_days || service.default_interval_days;

                    return (
                        <div key={index} className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 relative group">
                            <div className="flex justify-between items-start mb-2 pr-8">
                                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 leading-tight">
                                    <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">style</span>
                                    {service.name} (Yeni Paket)
                                </h5>
                                <button 
                                    onClick={() => setUpdateModalData({ 
                                        isOpen: true, 
                                        plan: { id: service.id, total_sessions: totalSessions, recommended_interval_days: intervalConfig, completed_sessions: 0, base_date: appointmentDate }, 
                                        futureAppointmentsCount: 0, 
                                        completedCount: 0,
                                        isNew: true
                                    })}
                                    className="absolute top-4 right-4 bg-white border border-purple-100 hover:border-purple-300 hover:bg-purple-50 text-purple-500 hover:text-purple-700 size-7 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                                    title="Yeni Paketi Düzenle"
                                >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mb-4">
                                Bu randevu onaylandığında <b className="text-slate-700">{totalSessions}</b> seanslık (Aralık: <b className="text-slate-700">{intervalConfig}</b> gün) yeni bir paket planı oluşturulacak ve ödeme takibi başlayacaktır. Toplam paket tutarı: <b className="text-slate-700 font-bold">{service.default_package_price} ₺</b>
                            </p>
                            <div className="bg-white p-3 rounded-xl border border-purple-100 flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700">Ön Ödeme:</label>
                                <div className="relative w-32">
                                    <input 
                                        type="number" 
                                        min={0}
                                        max={service.default_package_price}
                                        value={override?.prepayment || 0}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setLocalOverrides(prev => ({
                                                ...prev,
                                                [service.id]: { ...prev[service.id], total_sessions: totalSessions, interval_days: intervalConfig, prepayment: val }
                                            }));
                                        }}
                                        className="w-full text-right bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-[var(--color-primary)] focus:border-transparent outline-none text-sm font-bold text-[var(--color-primary)]"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">₺</span>
                                </div>
                            </div>
                        </div>
                    );
                }

                const total = Number(existingPlan.package_total_price) || 0;
                const paid = Number(existingPlan.paid_amount) || 0;
                const balance = Math.max(0, total - paid);
                const paymentMode = existingPlan.payment_mode || 'prepaid_full';
                const isFullyPaid = existingPlan.package_total_price !== null && balance <= 0;

                // Find max session number robustly from appointments
                let maxSessionNum = existingPlan.completed_sessions || 0;
                appointments.forEach(a => {
                    if (a.customer_id === selectedCustomer.id && a.status !== 'canceled' && a.status !== 'no_show') {
                        a.services?.forEach((s: any) => {
                            if (s.session_plan_id === existingPlan.id && s.session_number) {
                                maxSessionNum = Math.max(maxSessionNum, s.session_number);
                            }
                        });
                    }
                });
                const nextSessionNum = maxSessionNum + 1;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let isPastDue = false;
                let pastDueDays = 0;
                if (existingPlan.next_recommended_date) {
                    const recDate = new Date(existingPlan.next_recommended_date);
                    recDate.setHours(0, 0, 0, 0);
                    if (recDate < today) {
                        isPastDue = true;
                        pastDueDays = Math.floor((today.getTime() - recDate.getTime()) / (1000 * 3600 * 24));
                    }
                }

                // Find future appointments for this session plan
                const futureAppointments = appointments.filter(a => 
                    a.customer_id === selectedCustomer.id &&
                    (a.status === 'scheduled' || a.status === 'checked_in') &&
                    new Date(a.appointment_date) >= today &&
                    a.services?.some((s: any) => s.session_plan_id === existingPlan.id)
                ).sort((a, b) => new Date(a.appointment_date + 'T' + a.appointment_time).getTime() - new Date(b.appointment_date + 'T' + b.appointment_time).getTime());

                return (
                    <div key={index} className="p-4 bg-purple-50/50 rounded-3xl border border-purple-100/50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]"></div>
                        
                        <div className="flex justify-between items-start mb-4 pl-2">
                            <div>
                                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">package_2</span>
                                    Paket Özeti
                                    <button 
                                        onClick={() => setUpdateModalData({ isOpen: true, plan: existingPlan, futureAppointmentsCount: futureAppointments.length, completedCount: existingPlan.completed_sessions || 0 })}
                                        className="ml-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-[var(--color-primary)] size-6 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                                        title="Paketi Düzenle"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                    </button>
                                </h5>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-white bg-[var(--color-primary)] px-2 py-0.5 rounded-md tracking-wider">PAKET</span>
                                    <span className="text-xs font-bold text-slate-500">{service.name} • Seans {nextSessionNum}/{existingPlan.total_sessions}</span>
                                </div>
                            </div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 bg-white px-2 py-1 border border-slate-100 rounded-lg shadow-sm">
                                {paymentMode === 'prepaid_full' ? 'PEŞİN KAPSAM' : 'SEANS BAŞI'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs mb-4 pl-2">
                            <div className="bg-white border flex flex-col items-center justify-center py-2 rounded-xl shadow-sm">
                                <span className="text-slate-400 font-bold mb-1">Toplam</span>
                                <span className="text-slate-800 font-extrabold">{total}₺</span>
                            </div>
                            <div className="bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center py-2 rounded-xl shadow-sm">
                                <span className="font-bold mb-1 opacity-70">Ödenen</span>
                                <span className="font-extrabold">{paid}₺</span>
                            </div>
                            <div className={`flex flex-col items-center justify-center py-2 rounded-xl shadow-sm ${balance > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}`}>
                                <span className="font-bold mb-1 opacity-70">Kalan</span>
                                <span className="font-extrabold">{balance}₺</span>
                            </div>
                        </div>

                        <div className="pl-2 flex flex-col gap-3">
                            <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ödeme Durumu</span>
                                    {isFullyPaid && total > 0 ? (
                                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            Peşin ödendi
                                        </span>
                                    ) : paymentMode === 'prepaid_full' && balance > 0 ? (
                                        <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                            Ödeme Bekleniyor
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            Bu seans alınacak: <b className="text-[var(--color-primary)]">{(total / existingPlan.total_sessions).toFixed(2)}₺</b>
                                        </span>
                                    )}
                                </div>
                                {balance > 0 && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">Kalan: {balance}₺</span>
                                        <button
                                            onClick={() => setPaymentModalData({ isOpen: true, plan: existingPlan })}
                                            className="bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:opacity-90 flex items-center gap-1 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">add_card</span>
                                            Ödeme Al
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Gelecek program */}
                            <div className="bg-white/60 rounded-xl p-3 text-xs border border-purple-100 border-dashed">
                                {existingPlan.next_recommended_date && (
                                    <div className={`flex items-center gap-2 mb-2 ${isPastDue ? 'text-rose-600' : 'text-slate-600'}`}>
                                        <span className={`material-symbols-outlined text-[14px] ${isPastDue ? 'text-rose-500' : 'text-amber-500'}`}>
                                            {isPastDue ? 'event_busy' : 'event_upcoming'}
                                        </span>
                                        <span className="font-bold">Önerilen Sonraki Seans:</span>
                                        <span className={`font-extrabold ${isPastDue ? 'text-rose-700' : 'text-slate-800'}`}>
                                            {new Date(existingPlan.next_recommended_date).toLocaleDateString('tr-TR')}
                                        </span>
                                        {isPastDue && (
                                            <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 bg-rose-100 rounded-lg text-rose-700 font-bold border border-rose-200">
                                                <span className="material-symbols-outlined text-[12px]">warning</span>
                                                Gecikmiş ({pastDueDays} gün)
                                                {selectedCustomer.phone && (
                                                    <a href={`tel:${selectedCustomer.phone}`} className="ml-1 p-0.5 bg-white rounded flex hover:bg-rose-50 items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[12px] text-rose-600">call</span>
                                                    </a>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {futureAppointments.length > 0 && (
                                    <div className="border-t border-purple-100/50 pt-2 mt-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">calendar_clock</span>
                                            Planlanmış Gelecek Randevular
                                        </p>
                                        <ul className="space-y-1">
                                            {futureAppointments.slice(0, 3).map(fa => (
                                                <li key={fa.id} className="text-slate-600 font-medium flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-50">
                                                    <span>{new Date(fa.appointment_date).toLocaleDateString('tr-TR')} - {fa.appointment_time?.substring(0,5)}</span>
                                                    <span className="text-[10px] opacity-60">Seans {fa.services?.find((s:any)=>s.session_plan_id===existingPlan.id)?.session_number || '?'}</span>
                                                </li>
                                            ))}
                                            {futureAppointments.length > 3 && (
                                                <li className="text-slate-400 text-center italic text-[10px]">+{futureAppointments.length - 3} randevu daha...</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {paymentModalData?.isOpen && paymentModalData.plan && (
                <OdemeAlModal
                    isOpen={paymentModalData.isOpen}
                    onClose={() => setPaymentModalData(null)}
                    customerId={selectedCustomer.id}
                    sessionPlanId={paymentModalData.plan.id}
                    suggestedAmount={Math.max(0, (Number(paymentModalData.plan.package_total_price) || 0) - (Number(paymentModalData.plan.paid_amount) || 0))}
                    title="Paket Ödemesi (Randevu Öncesi)"
                    description={`${paymentModalData.plan.services?.name || 'Paket'} için ödeme alıyorsunuz.`}
                />
            )}

            {updateModalData?.isOpen && updateModalData.plan && (
                <UpdateSessionPlanModal
                    isOpen={true}
                    onClose={() => setUpdateModalData(null)}
                    plan={updateModalData.plan}
                    futureAppointmentsCount={updateModalData.futureAppointmentsCount}
                    completedAppointmentsCount={updateModalData.completedCount}
                    isNewPackage={updateModalData.isNew}
                    appointmentDate={appointmentDate}
                    onSaveOverride={(total, interval) => {
                        setLocalOverrides(prev => ({
                            ...prev,
                            [updateModalData.plan.id]: { ...prev[updateModalData.plan.id], total_sessions: total, interval_days: interval }
                        }));
                    }}
                />
            )}
        </div>
    );
}
