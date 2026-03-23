"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCategoryStyle } from "@/app/(dashboard)/hizmetler/HizmetlerClient";
import { createAppointment, createSessionPlan } from "@/app/actions/appointments";
import { getEligibleStaffForService } from "@/app/actions/staff";
import CustomerLink from "@/components/CustomerLink";
import { PreAppointmentPaymentSummary } from "./PreAppointmentPaymentSummary";

export default function RandevuOlusturClient({ services, customers, appointments = [], salons = [], workingHours = [] }: { services: any[], customers: any[], appointments?: any[], salons?: any[], workingHours?: any[] }) {
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [selectedSalon, setSelectedSalon] = useState<any>(null);
    const [eligibleStaff, setEligibleStaff] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [isStaffLoading, setIsStaffLoading] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const today = new Date();
    const [baseDate, setBaseDate] = useState<Date>(today);
    const [selectedDate, setSelectedDate] = useState<number | null>(today.getDate());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPackageOverrides, setNewPackageOverrides] = useState<Record<string, { total_sessions: number, interval_days: number, prepayment: number }>>({});

    // Seans Planı State'leri
    const activeSessionPlans = selectedCustomer?.session_plans?.filter((p: any) => p.status === 'active') || [];

    const handleApplyRecommendedDate = (dateString: string) => {
        const d = new Date(dateString);
        if (!isNaN(d.getTime())) {
            setSelectedDate(d.getDate());
        }
    };

    const searchParams = useSearchParams();

    useEffect(() => {
        const customerId = searchParams.get("customer_id");
        const serviceId = searchParams.get("service_id");
        const dateParam = searchParams.get("date");
        const timeParam = searchParams.get("time");

        if (customerId && customers) {
            const customer = customers.find(c => c.id === customerId);
            if (customer) setSelectedCustomer(customer);
        }

        if (serviceId && services) {
            const service = services.find(s => s.id === serviceId);
            if (service) setSelectedServices([service]);
        }

        if (dateParam) {
            const d = new Date(dateParam);
            if (!isNaN(d.getTime())) {
                setBaseDate(d);
                setSelectedDate(d.getDate());
            }
        }

        if (timeParam) {
            setSelectedTime(timeParam);
        }
    }, [searchParams, customers, services]);

    const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
    const [activeServiceType, setActiveServiceType] = useState<"single" | "package" | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const isStep2Unlocked = !!selectedCustomer;
    const isStep3Unlocked = isStep2Unlocked && selectedServices.length > 0;
    const isStep4Unlocked = isStep3Unlocked && !!selectedDate && !!selectedTime;

    const next7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(baseDate.getTime());
        d.setDate(baseDate.getDate() + i);
        return d;
    });

    const handlePrevWeek = () => {
        const newBase = new Date(baseDate.getTime());
        newBase.setDate(baseDate.getDate() - 7);
        setBaseDate(newBase);
    };

    const handleNextWeek = () => {
        const newBase = new Date(baseDate.getTime());
        newBase.setDate(baseDate.getDate() + 7);
        setBaseDate(newBase);
    };

    const displayMonthYear = next7Days[0].toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    // Derive Categories from services
    const categories = Array.from(new Set(services.map(s => s.service_categories?.name || s.category || "Genel")));

    const filteredServices = services.filter(service => {
        const catName = service.service_categories?.name || service.category || "Genel";
        const isMatchedCat = activeCategoryId === "all" || catName === activeCategoryId;

        const currentServiceType = service.service_type || "single";
        const isMatchedType = activeServiceType === "all" || currentServiceType === activeServiceType;

        const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));

        return isMatchedCat && isMatchedType && matchesSearch;
    });

    const getServicesCountByCategory = (catName: string) => {
        return services.filter(s => (s.service_categories?.name || s.category || "Genel") === catName).length;
    };

    const handleServiceToggle = (service: any) => {
        setSelectedServices((prev) => {
            const isSelected = prev.find(s => s.id === service.id);
            if (isSelected) {
                return prev.filter(s => s.id !== service.id);
            } else {
                return [...prev, service];
            }
        });
    };

    // Toplam tutar ve süre hesaplaması
    const totalDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

    // Doğru fiyatı hesaplayan yardımcı fonksiyon
    const getEffectiveServicePrice = (service: any) => {
        let price = Number(service.price || 0);

        if (service.service_type === 'package') {
            return 0; // Kullanıcı isteği: Sadece paket işlemlerde otomatik fiyat gelmesin (randevu tutarına yansımasın)
        }
        return price;
    };

    const totalAmount = selectedServices.reduce((acc, s) => {
        let prepay = 0;
        if (s.service_type === 'package') {
            const existingPlan = activeSessionPlans.find((p: any) => p.service_id === s.id);
            if (!existingPlan) {
                prepay = newPackageOverrides[s.id]?.prepayment || 0;
            }
        }
        return acc + getEffectiveServicePrice(s) + Number(prepay);
    }, 0);
    const taxRate = 0.20; // %20 KDV
    const subtotal = totalAmount / (1 + taxRate);
    const taxAmount = totalAmount - subtotal;

    // Bitiş saatini hesaplama
    let endTimeStr = "";
    if (selectedTime && totalDuration > 0) {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
        date.setMinutes(date.getMinutes() + totalDuration);
        endTimeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // Seçili tarihin dize karşılığını hesapla
    const selectedDateObj = next7Days.find(d => d.getDate() === selectedDate) || today;
    const year = selectedDateObj.getFullYear();
    const month = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDateObj.getDate()).padStart(2, '0');
    const appointmentDateStr = `${year}-${month}-${day}`;

    // Seçili gündeki mevcut randevuları filtrele
    const appointmentsOnSelectedDate = (appointments || []).filter(a =>
        a.appointment_date === appointmentDateStr &&
        a.status !== 'canceled' &&
        a.status !== 'completed' // Erken tamamlanan randevular slotu/odayı boşaltsın (hibrit model)
    );

    // Personel Çekimi
    useEffect(() => {
        if (!appointmentDateStr || !selectedTime || selectedServices.length === 0) {
            setEligibleStaff([]);
            setSelectedStaff(null);
            return;
        }

        const fetchStaff = async () => {
            setIsStaffLoading(true);
            const res = await getEligibleStaffForService({
                serviceIds: selectedServices.map((s: any) => s.id),
                appointmentDate: appointmentDateStr,
                appointmentTime: selectedTime,
                totalDurationMinutes: totalDuration > 0 ? totalDuration : 30
            });
            setIsStaffLoading(false);

            if (res.success) {
                const staffData = res.data || [];
                setEligibleStaff(staffData);
                // Eğer daha önce seçilen personel hala uygunsa kalsın, yoksa null
                setSelectedStaff((prev: any) => {
                    const match = staffData.find((s:any) => s.id === prev?.id && s.isEligible);
                    return match || null;
                });
            }
        };

        fetchStaff();
    }, [appointmentDateStr, selectedTime, selectedServices, totalDuration]);

    // Saatleri dakikaya çeviren yardımcı fonksiyon
    const timeToMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const validSalons = salons.filter((s: any) => {
        if (!s.is_active) return false;
        if (selectedServices.length === 0) return true;
        const supportedIds = s.salon_services?.map((ss: any) => ss.service_id) || [];
        return selectedServices.every((srv: any) => supportedIds.includes(srv.id));
    });

    const unassignedSelectedServices = selectedServices.filter(service =>
        !salons.some((salon: any) =>
            salon.is_active && salon.salon_services?.some((ss: any) => ss.service_id === service.id)
        )
    );

    // Olası saat dilimlerini oluştur ve çakışmaları hesapla
    const dayOfWeek = selectedDateObj.getDay();
    const todayWorkingHours = workingHours.find((h: any) => h.day_of_week === dayOfWeek) || {};
    const isClosed = todayWorkingHours.is_closed ?? false;

    const startMins = isClosed ? 0 : timeToMinutes(todayWorkingHours.start_time || "09:00:00");
    const endMins = isClosed ? 0 : timeToMinutes(todayWorkingHours.end_time || "19:00:00");

    const breakStartMins = todayWorkingHours.break_start ? timeToMinutes(todayWorkingHours.break_start) : null;
    const breakEndMins = todayWorkingHours.break_end ? timeToMinutes(todayWorkingHours.break_end) : null;

    const availableSlots = (() => {
        const slots: Array<{ time: string; disabled: boolean; label?: string }> = [];
        if (isClosed) return slots; // O gün tamamen kapalıysa hiç slot yok

        // Mesai başlangıcından bitişine kadar 30 dk aralıklarla dolaş
        for (let m = startMins; m < endMins; m += 30) {
            const hStr = Math.floor(m / 60).toString().padStart(2, '0');
            const mStr = (m % 60).toString().padStart(2, '0');
            const timeStr = `${hStr}:${mStr}`;

            const slotStart = m;
            const reqDuration = totalDuration > 0 ? totalDuration : 30; // Eğer henüz hizmet seçilmediyse 30dk varsayılır
            const slotEnd = slotStart + reqDuration;

            // Hizmet süresi, mesai bitişini (endMins) aşıyorsa slotu pas geç
            if (slotEnd > endMins) continue;

            const isOverlapping = (() => {
                // Eğer çalışma slotu mola saatleriyle (break) kesişiyorsa kapalıdır
                if (breakStartMins !== null && breakEndMins !== null) {
                    if (slotStart < breakEndMins && slotEnd > breakStartMins) return true;
                }

                if (validSalons.length === 0) return true; // Bu hizmetleri destekleyen salon yok

                // Bu slot aralığında dolu olan salon_id'lerini topla
                const occupiedSalonIdsForThisSlot = appointmentsOnSelectedDate
                    .filter((appt: any) => {
                        const apptStart = timeToMinutes(appt.appointment_time);
                        const apptDuration = appt.total_duration_minutes || 0;
                        const apptEnd = apptStart + apptDuration;

                        const overStart = Math.max(slotStart, apptStart);
                        const overEnd = Math.min(slotEnd, apptEnd);
                        return overStart < overEnd; // Kesişme var
                    })
                    .map((appt: any) => appt.salon_id)
                    .filter(Boolean);

                // Eğer uyan tüm salonların (validSalons) ID'si, occupied listesinde ise => o saat cidden kapalıdır
                return validSalons.every((salon: any) => occupiedSalonIdsForThisSlot.includes(salon.id));
            })();

            // AI Önerisi vs. için mock etiketleme ekleyebiliriz
            let label;
            if (!isOverlapping) {
                if (timeStr === "10:30") label = "AI Önerisi";
                if (timeStr === "13:00") label = "En Verimli";
            }

            slots.push({
                time: timeStr,
                disabled: isOverlapping,
                label: label
            });
        }
        return slots;
    })();

    // Salonların müsaitlik durumunu hesapla
    const occupiedSalonIds = (() => {
        if (!selectedTime) return [];
        const slotStart = timeToMinutes(selectedTime);
        const reqDuration = totalDuration > 0 ? totalDuration : 30;
        const slotEnd = slotStart + reqDuration;

        return appointmentsOnSelectedDate
            .filter(appt => {
                const apptStart = timeToMinutes(appt.appointment_time);
                const apptDuration = appt.total_duration_minutes || 0;
                const apptEnd = apptStart + apptDuration;

                const overStart = Math.max(slotStart, apptStart);
                const overEnd = Math.min(slotEnd, apptEnd);
                return overStart < overEnd; // Kesişme var
            })
            .map(appt => appt.salon_id)
            .filter(Boolean); // null olanları çıkar
    })();

    const handleCreateAppointment = async () => {
        if (!selectedCustomer || selectedServices.length === 0 || !selectedDate || !selectedTime || !selectedSalon) {
            alert("Lütfen müşteri, hizmet, tarih, saat ve salon seçtiğinizden emin olun.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Backend için hizmetleri formatla
            // Yeni oluşturulacak planları beklet
            const servicesToInsert = await Promise.all(selectedServices.map(async (s) => {
                const plan = activeSessionPlans.find((p: any) => p.service_id === s.id);

                let planId = undefined;
                let sessionNum = undefined;
                let priceAtBooking = Number(s.price || 0);

                if (s.service_type === 'package') {
                    if (plan) {
                        // Var olan plana bağla
                        planId = plan.id;
                        sessionNum = plan.completed_sessions + 1;
                        priceAtBooking = Number((Number(plan.package_total_price) / Number(plan.total_sessions)).toFixed(2));
                        if (sessionNum === plan.total_sessions) {
                            const totalExpected = Number(plan.package_total_price);
                            const previousTotal = priceAtBooking * (plan.total_sessions - 1);
                            priceAtBooking = Number((totalExpected - previousTotal).toFixed(2));
                        }
                    } else {
                        // Yeni plan oluştur
                        const override = newPackageOverrides[s.id];
                        const planRes = await createSessionPlan({
                            customer_id: selectedCustomer.id,
                            service_id: s.id,
                            total_sessions: override?.total_sessions || Number(s.default_total_sessions || 8),
                            recommended_interval_days: override?.interval_days || Number(s.default_interval_days || 30),
                            pricing_model: 'package_total',
                            package_total_price: Number(s.default_package_price || 0),
                            per_session_price: undefined,
                            prepayment_amount: override?.prepayment || 0,
                            first_appointment_date: appointmentDateStr
                        });

                        if (planRes.success && planRes.data) {
                            planId = planRes.data.id;
                            sessionNum = 1;
                            priceAtBooking = Number((Number(s.default_package_price || 0) / Number(s.default_total_sessions || 8)).toFixed(2));
                        }
                    }
                }

                return {
                    service_id: s.id,
                    price_at_booking: priceAtBooking,
                    session_plan_id: planId,
                    session_number: sessionNum
                };
            }));

            const res = await createAppointment({
                customer_id: selectedCustomer.id,
                salon_id: selectedSalon.id,
                staff_id: selectedStaff?.id || null,
                appointment_date: appointmentDateStr,
                appointment_time: selectedTime,
                total_duration_minutes: totalDuration,
                total_price: totalAmount,
                services: servicesToInsert
            });

            if (res.success) {
                // Başarı durumunda success ekranını göster
                setIsSuccess(true);
                window.scrollTo(0, 0);
            } else {
                alert("Randevu oluşturulurken hata: " + res.error);
            }
        } catch (error: any) {
            alert("Randevu oluşturulurken beklenmeyen hata: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="max-w-3xl mx-auto py-12 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center size-24 bg-[var(--color-primary)]/10 rounded-full mb-6 relative">
                        <div className="size-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white shadow-xl shadow-[var(--color-primary)]/30 absolute">
                            <span className="material-symbols-outlined text-4xl font-bold">check</span>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Randevu Başarıyla Oluşturuldu!</h1>
                    <p className="text-slate-500 font-medium">Müşteriye onay bildirimi gönderildi.</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mb-8">
                    <div className="p-8">
                        <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                            <div className="size-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 ring-4 ring-purple-50">
                                <span className="material-symbols-outlined text-3xl">person</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Müşteri</p>
                                <h4 className="text-2xl font-bold text-slate-900">
                                    <CustomerLink id={selectedCustomer?.id} firstName={selectedCustomer?.first_name} lastName={selectedCustomer?.last_name} className="text-inherit hover:text-[var(--color-primary)] transition-colors" />
                                </h4>
                                <p className="text-sm text-slate-500">{selectedCustomer?.phone}</p>
                            </div>
                        </div>

                        <div className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">Hizmetler</p>
                                    <div className="space-y-3">
                                        {selectedServices.map(s => (
                                            <div key={s.id} className="flex items-center gap-3">
                                                <span className={`w-1.5 h-6 rounded-full ${getCategoryStyle(s.category).split(' ')[0]}`}></span>
                                                <p className="text-sm font-bold text-slate-700">{s.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">Tarih & Saat</p>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">calendar_today</span>
                                            <p className="text-sm font-bold">{selectedDate} {displayMonthYear.split(' ')[0]}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">schedule</span>
                                            <p className="text-sm font-bold text-[var(--color-primary)]">{selectedTime} {endTimeStr && `- ${endTimeStr}`}</p>
                                        </div>
                                    </div>
                                </div>
                                {selectedStaff && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">Personel</p>
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-lg text-[var(--color-primary)]">badge</span>
                                            <p className="text-sm font-bold">{selectedStaff.name}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedSalon && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">Salon / Oda</p>
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-lg" style={{ color: selectedSalon.color_code || 'var(--color-primary)' }}>meeting_room</span>
                                            <p className="text-sm font-bold">{selectedSalon.name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-8 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold">
                                <span className="material-symbols-outlined text-xl">payments</span>
                                <span className="text-lg">Toplam Tutar:</span>
                            </div>
                            <span className="text-3xl font-bold text-[var(--color-primary)]">₺{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-[var(--color-primary)]">auto_awesome</span>
                        <p className="text-xs text-slate-600">
                            <b className="text-[var(--color-primary)] font-bold">AI Notu:</b> Bu randevu için özel fiyatlandırma uygulandı ve sisteme işlendi.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => window.location.href = "/"} className="flex-1 bg-[var(--color-primary)] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">home</span>
                        Ana Panele Dön
                    </button>
                    <button onClick={() => { setIsSuccess(false); setSelectedServices([]); }} className="flex-1 bg-white text-slate-600 py-4 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">add</span>
                        Yeni Randevu Oluştur
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Yeni Randevu Oluştur</h2>
                    <p className="text-slate-500 mt-2">Müşteri, hizmet ve zaman bilgilerini belirleyin.</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-4 py-2 border border-slate-100 rounded-xl shadow-sm">
                    <span className="material-symbols-outlined text-[var(--color-primary)]">auto_awesome</span>
                    AI Önerileri Açık
                </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 mb-8 px-4">
                <div className="flex flex-wrap gap-x-6 gap-y-4">
                    <div className="pb-4 font-bold border-b-2 text-[var(--color-primary)] border-[var(--color-primary)] flex items-center gap-2 transition-all">
                        <span className="size-6 rounded-full text-xs flex items-center justify-center bg-[var(--color-primary)] text-white">1</span>
                        Müşteri
                    </div>
                    <div className={`pb-4 font-bold border-b-2 flex items-center gap-2 transition-all ${isStep2Unlocked ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-slate-400 border-transparent'}`}>
                        <span className={`size-6 rounded-full text-xs flex items-center justify-center ${isStep2Unlocked ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
                        Hizmet
                    </div>
                    <div className={`pb-4 font-bold border-b-2 flex items-center gap-2 transition-all ${isStep3Unlocked ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-slate-400 border-transparent'}`}>
                        <span className={`size-6 rounded-full text-xs flex items-center justify-center ${isStep3Unlocked ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>
                        Tarih & Saat
                    </div>
                    <div className={`pb-4 font-bold border-b-2 flex items-center gap-2 transition-all ${isStep4Unlocked ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-slate-400 border-transparent'}`}>
                        <span className={`size-6 rounded-full text-xs flex items-center justify-center ${isStep4Unlocked ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 text-slate-500'}`}>4</span>
                        Personel
                    </div>
                    <div className={`pb-4 font-bold border-b-2 flex items-center gap-2 transition-all ${isStep4Unlocked && selectedStaff ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-slate-400 border-transparent'}`}>
                        <span className={`size-6 rounded-full text-xs flex items-center justify-center ${isStep4Unlocked && selectedStaff ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-200 text-slate-500'}`}>5</span>
                        Salon
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* Müşteri Seçimi */}
                    <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition-all duration-300 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Müşteri</h3>
                            <button
                                onClick={() => setIsCustomerModalOpen(true)}
                                className="text-[var(--color-primary)] text-sm font-bold"
                            >
                                {selectedCustomer ? "Değiştir" : "Müşteri Seç"}
                            </button>
                        </div>

                        {selectedCustomer ? (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined">person</span>
                                </div>
                                <div>
                                    <CustomerLink id={selectedCustomer.id} firstName={selectedCustomer.first_name} lastName={selectedCustomer.last_name} className="text-sm font-bold block" />
                                    <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3 p-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsCustomerModalOpen(true)}>
                                <span className="material-symbols-outlined text-slate-400">person_add</span>
                                <p className="text-sm font-bold text-slate-500">Randevu için bir müşteri seçin</p>
                            </div>
                        )}
                    </section>

                    {/* Hizmet Seçimi (DİNAMİK) */}
                    <section className={`transition-all duration-500 ${!isStep2Unlocked ? 'opacity-40 pointer-events-none select-none blur-[1px]' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Hizmet Seçimi</h3>
                        </div>

                        {services.length === 0 ? (
                            <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center shadow-sm">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
                                <p className="text-slate-500">İşletmenize ait hiç hizmet bulunamadı. Lütfen önce Hizmetler sayfasından hizmet ekleyin.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                    {/* SOL KOLON: KATEGORİ YÖNETİMİ */}
                                    <div className="lg:col-span-4 flex flex-col gap-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hizmet Tipi</h4>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            <button
                                                onClick={() => setActiveServiceType("all")}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeServiceType === 'all' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700'}`}
                                            >Tümü</button>
                                            <button
                                                onClick={() => setActiveServiceType("single")}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeServiceType === 'single' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700'}`}
                                            >Tek Seans</button>
                                            <button
                                                onClick={() => setActiveServiceType("package")}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeServiceType === 'package' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700'}`}
                                            >Paket</button>
                                        </div>

                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mt-2">Kategoriler</h4>

                                        <div className="space-y-1 custom-scrollbar max-h-[400px] overflow-y-auto pr-2">
                                            {/* Tümü */}
                                            <button
                                                onClick={() => setActiveCategoryId("all")}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeCategoryId === "all" ? 'bg-[var(--color-primary)] text-white shadow-md shadow-purple-500/20' : 'hover:bg-slate-50 text-slate-700 border border-transparent'}`}
                                            >
                                                <span className="font-bold text-sm">Tümü</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeCategoryId === "all" ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {services.length}
                                                </span>
                                            </button>

                                            {/* Dinamik Kategoriler */}
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setActiveCategoryId(cat)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl mt-1 transition-all ${activeCategoryId === cat ? 'bg-purple-50 text-[var(--color-primary)] border border-purple-100 font-black' : 'hover:bg-slate-50 text-slate-700 font-bold border border-transparent'}`}
                                                >
                                                    <span className="text-sm text-left truncate pr-2">{cat}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] flex-shrink-0 ${activeCategoryId === cat ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        {getServicesCountByCategory(cat)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SAĞ KOLON: HİZMETLER LİSTESİ */}
                                    <div className="lg:col-span-8 bg-slate-50 rounded-[24px] border border-slate-100 flex flex-col p-6">
                                        {/* Arama Barı */}
                                        <div className="relative w-full mb-6">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                            <input
                                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm placeholder:text-slate-400 outline-none transition-all focus:border-[var(--color-primary)]"
                                                placeholder="Kategori içindeki hizmetleri ara..."
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>

                                        {/* List */}
                                        <div className="flex-1 custom-scrollbar overflow-y-auto max-h-[400px]">
                                            {filteredServices.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center py-10 bg-white border border-slate-100 border-dashed rounded-2xl">
                                                    <div className="p-3 bg-[var(--color-primary)]/5 rounded-full mb-3 text-[var(--color-primary)] border border-[var(--color-primary)]/10">
                                                        <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                                    </div>
                                                    <h4 className="text-base font-bold text-slate-900 mb-1">Hizmet Bulunamadı</h4>
                                                    <p className="text-xs text-slate-500 max-w-xs px-4">
                                                        Bu kategori veya aramaya uygun hizmet bulunmuyor.
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {filteredServices.map((service) => {
                                                            const isSelected = selectedServices.some(s => s.id === service.id);
                                                            const catName = service.service_categories?.name || service.category || "Genel";

                                                            return (
                                                                <div
                                                                    key={service.id}
                                                                    onClick={() => handleServiceToggle(service)}
                                                                    className={`bg-white border-2 p-4 rounded-2xl relative cursor-pointer transition-all flex flex-col ${isSelected ? 'border-[var(--color-primary)] shadow-md' : 'border-slate-200 hover:border-[var(--color-primary)]/50 hover:shadow-lg hover:shadow-slate-200/50'}`}
                                                                >
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <div className={`p-2 rounded-xl flex items-center justify-center ${getCategoryStyle(catName)}`}>
                                                                            <span className="material-symbols-outlined">{service.icon || 'auto_awesome'}</span>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <div className="bg-slate-50 px-2 pl-3 py-1 rounded-xl">
                                                                                <span className="text-lg font-black text-slate-900 leading-none">₺{service.service_type === 'package' ? service.default_package_price : service.price}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-slate-400 mr-2 mt-1">
                                                                                {service.service_type === 'package' ? (
                                                                                    <>
                                                                                        <span className="material-symbols-outlined text-[12px]">layers</span>
                                                                                        <p className="text-[11px] font-bold">{service.default_total_sessions} Seans</p>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                                                        <p className="text-[11px] font-bold">{service.duration_minutes} dk</p>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h4 className="font-bold text-[15px] text-slate-800 leading-tight pr-4">{service.name}</h4>
                                                                        {service.service_type === 'package' && (
                                                                            <span className="px-1.5 py-0.5 bg-purple-100 text-[var(--color-primary)] text-[9px] font-bold rounded uppercase tracking-wider shrink-0">PAKET</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{catName}</p>

                                                                    {service.description && (
                                                                        <p className="text-xs font-medium text-slate-500 line-clamp-2 mt-auto pt-3 border-t border-slate-50 leading-relaxed">{service.description}</p>
                                                                    )}

                                                                    {isSelected && (
                                                                        <div className="absolute top-2 right-2 bg-[var(--color-primary)] text-white size-6 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                                                                            <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                                                                        </div>
                                                                    )}

                                                                    {isSelected && service.service_type === 'package' && (
                                                                        <div className="mt-3 pt-3 border-t border-purple-100 flex items-center gap-2 text-purple-700 bg-purple-50 p-2 rounded-xl animate-in fade-in">
                                                                            <span className="material-symbols-outlined text-[16px] shrink-0">info</span>
                                                                            {(() => {
                                                                                const existingPlan = activeSessionPlans.find((p: any) => p.service_id === service.id);
                                                                                if (existingPlan) {
                                                                                    return <span className="text-[10px] font-bold leading-tight">Aktif paket bulundu ({existingPlan.completed_sessions}/{existingPlan.total_sessions}). Bu randevu Seans ({existingPlan.completed_sessions + 1}) olarak bağlanacak.</span>;
                                                                                } else {
                                                                                    return <span className="text-[10px] font-bold leading-tight">Yeni Paket Başlatılacak ({service.default_total_sessions} seans)</span>;
                                                                                }
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Tarih ve Saat */}
                    <section className={`bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition-all duration-500 ${!isStep3Unlocked ? 'opacity-40 pointer-events-none select-none blur-[1px]' : ''}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Tarih & Saat</h3>
                            <div className="flex items-center gap-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-3 py-1.5 rounded-xl text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                Verimli Saatler Öne Çıkarıldı
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-bold">{displayMonthYear}</p>
                                    <div className="flex gap-2">
                                        <button onClick={handlePrevWeek} className="p-1 rounded-lg hover:bg-slate-100 transition-colors tooltip tooltip-bottom" data-tip="Önceki Hafta"><span className="material-symbols-outlined">chevron_left</span></button>
                                        <button onClick={handleNextWeek} className="p-1 rounded-lg hover:bg-slate-100 transition-colors tooltip tooltip-bottom" data-tip="Sonraki Hafta"><span className="material-symbols-outlined">chevron_right</span></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-400 mb-2">
                                    {next7Days.map((d, i) => (
                                        <span key={`dayname-${i}`}>{d.toLocaleDateString('tr-TR', { weekday: 'short' })}</span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {next7Days.map((d, i) => {
                                        const dayNum = d.getDate();
                                        return (
                                            <div
                                                key={`cur-${dayNum}`}
                                                onClick={() => setSelectedDate(dayNum)}
                                                className={`h-11 flex items-center justify-center rounded-xl cursor-pointer shadow-sm transition-all ${selectedDate === dayNum
                                                    ? "bg-[var(--color-primary)] text-white font-bold"
                                                    : "font-medium hover:bg-slate-50 border border-transparent hover:border-slate-100"
                                                    }`}
                                            >
                                                {dayNum}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Müsait Saatler</p>
                                {availableSlots.length === 0 ? (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-red-400 text-3xl">event_busy</span>
                                        <p className="text-sm font-bold text-red-800">İşletme bu tarihte kapalıdır.</p>
                                        <p className="text-xs text-red-600">Lütfen farklı bir tarih seçin.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {availableSlots.map((slot, i) => {
                                            const isSelected = selectedTime === slot.time;
                                            const isDisabled = slot.disabled;

                                            if (isDisabled) {
                                                return (
                                                    <button key={i} disabled className="py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-300 line-through bg-slate-50 cursor-not-allowed">
                                                        {slot.time}
                                                    </button>
                                                );
                                            }

                                            if (slot.label) {
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedTime(slot.time)}
                                                        className={`py-2 rounded-xl flex flex-col items-center justify-center relative overflow-hidden transition-all ${isSelected
                                                            ? "border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-bold shadow-md shadow-[var(--color-primary)]/10"
                                                            : "border border-slate-200 text-slate-600 hover:border-[var(--color-primary)]/50 hover:bg-slate-50"
                                                            }`}
                                                    >
                                                        <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{slot.time}</span>
                                                        <span className={`text-[10px] ${isSelected ? 'text-[var(--color-primary)] opacity-100' : 'text-slate-400 opacity-70'}`}>{slot.label}</span>
                                                        {isSelected && <div className="absolute top-0 right-0 w-8 h-8 bg-[var(--color-primary)]/10 rotate-45 translate-x-4 -translate-y-4"></div>}
                                                    </button>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedTime(slot.time)}
                                                    className={`py-2.5 rounded-xl text-sm transition-all flex items-center justify-center ${isSelected
                                                        ? "border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-bold shadow-md shadow-[var(--color-primary)]/10"
                                                        : "border border-slate-200 font-medium text-slate-600 hover:border-[var(--color-primary)]/50 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {slot.time}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Personel Seçimi */}
                    <section className={`bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition-all duration-500 ${!isStep4Unlocked ? 'opacity-40 pointer-events-none select-none blur-[1px]' : ''}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Personel Seçimi</h3>
                            {!isStep4Unlocked && (
                                <p className="text-xs text-slate-400">Lütfen önce tarih ve saat seçin.</p>
                            )}
                        </div>

                        {isStaffLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <span className="material-symbols-outlined animate-spin text-[var(--color-primary)] text-3xl">refresh</span>
                            </div>
                        ) : eligibleStaff.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-3xl mb-2 text-slate-300">group_off</span>
                                <p>Bu hizmetleri verebilecek personel bulunamadı.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {eligibleStaff.map((staff: any) => {
                                    const isSelected = selectedStaff?.id === staff.id;
                                    const isDisabled = !staff.isEligible;

                                    return (
                                        <button
                                            key={staff.id}
                                            onClick={() => !isDisabled && setSelectedStaff(staff)}
                                            disabled={isDisabled}
                                            className={`relative p-4 rounded-3xl border-2 text-left transition-all overflow-hidden ${isDisabled
                                                ? 'border-slate-100 bg-slate-50 flex-col items-start cursor-not-allowed opacity-60'
                                                : isSelected
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md'
                                                    : 'border-slate-200 hover:border-[var(--color-primary)]/50 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={`font-bold ${isDisabled ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{staff.name}</h4>
                                                {isDisabled ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">{staff.ineligibleReason}</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Uygun</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 capitalize">{staff.role === 'owner' ? 'İşletme Sahibi' : staff.role === 'manager' ? 'Yönetici' : 'Personel'}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Salon Seçimi */}
                    <section className={`bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition-all duration-500 ${!(isStep4Unlocked && selectedStaff) ? 'opacity-40 pointer-events-none select-none blur-[1px]' : ''}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Salon / Oda Seçimi</h3>
                            {!isStep4Unlocked && (
                                <p className="text-xs text-slate-400">Lütfen önce tarih ve saat seçin.</p>
                            )}
                        </div>

                        {unassignedSelectedServices.length > 0 ? (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center animate-in fade-in">
                                <span className="material-symbols-outlined text-red-500 text-4xl mb-3">error</span>
                                <h4 className="text-red-800 font-bold text-lg mb-2">Hizmet İçin Oda Bulunamadı</h4>
                                <p className="text-red-700 text-sm mb-4">
                                    Seçmiş olduğunuz <strong>{unassignedSelectedServices.map((s: any) => s.name).join(", ")}</strong> hizmeti şu an hiçbir aktif odaya tanımlanmamış. Bu yüzden randevu oluşturulamaz.
                                </p>
                                <p className="text-red-600 text-xs font-medium">Lütfen sistem yöneticisiyle iletişime geçin veya ayarlardan salon/oda eşleştirmesini yapın.</p>
                            </div>
                        ) : validSalons.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {validSalons.map((salon: any) => {
                                    const isOccupied = occupiedSalonIds.includes(salon.id);
                                    const isSelected = selectedSalon?.id === salon.id;

                                    return (
                                        <button
                                            key={salon.id}
                                            onClick={() => !isOccupied && setSelectedSalon(salon)}
                                            disabled={isOccupied}
                                            className={`relative p-4 rounded-3xl border-2 text-left transition-all overflow-hidden ${isOccupied
                                                ? 'border-slate-100 bg-slate-50 flex-col items-start cursor-not-allowed opacity-60'
                                                : isSelected
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md'
                                                    : 'border-slate-200 hover:border-[var(--color-primary)]/50 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: salon.color_code || '#805ad5' }}></div>
                                            <div className="flex justify-between items-start mb-2 mt-1">
                                                <h4 className={`font-bold ${isOccupied ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{salon.name}</h4>
                                                {isOccupied ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Dolu</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Müsait</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1">{salon.description || 'Standart Oda'}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-3xl mb-2 text-slate-300">meeting_room</span>
                                <p>Seçili hizmetleri destekleyen uygun salon bulunamadı.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sağ Taraf - Özet Paneli */}
                <div className="lg:col-span-4">
                    <div className="sticky top-28">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                            <div className="bg-[var(--color-primary)] p-6 text-white">
                                <h3 className="text-xl font-bold">Randevu Özeti</h3>
                                <p className="text-sm text-purple-200 mt-1 opacity-80">Seçilen hizmetlerin toplam tutarı.</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                                    <div className="size-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Müşteri</p>
                                        <h4 className="font-bold text-slate-900">
                                            <CustomerLink id={selectedCustomer?.id} firstName={selectedCustomer?.first_name} lastName={selectedCustomer?.last_name} className="text-inherit hover:text-[var(--color-primary)] transition-colors" />
                                        </h4>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Hizmetler ({selectedServices.length})</p>
                                        {totalDuration > 0 && (
                                            <p className="text-xs text-slate-500 font-medium">Toplam {totalDuration} dk</p>
                                        )}
                                    </div>

                                    {selectedServices.length === 0 ? (
                                        <div className="text-sm text-slate-400 italic text-center py-4">Sol taraftan hizmet seçiniz.</div>
                                    ) : (
                                        selectedServices.map(service => {
                                            const isPlanAttached = service.service_type === 'package';
                                            // Paket hizmetlerde paket fiyatını, tek seanslarda normal fiyatı göster
                                            const displayPrice = isPlanAttached
                                                ? Number(service.default_package_price || 0)
                                                : Number(service.price || 0);
                                            // Ön ödeme miktarı (yeni paket için)
                                            const prepayAmount = isPlanAttached ? (newPackageOverrides[service.id]?.prepayment || 0) : 0;
                                            const existingPlan = isPlanAttached ? (selectedCustomer?.session_plans?.find((p: any) => p.service_id === service.id && p.status === 'active')) : null;

                                            return (
                                                <div key={service.id} className="flex justify-between items-center group">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1 h-8 bg-[var(--color-primary)] rounded-full"></span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-slate-700">{service.name}</p>
                                                                {isPlanAttached && (
                                                                    <span className="px-1.5 py-0.5 bg-purple-100 text-[var(--color-primary)] text-[9px] font-bold rounded uppercase tracking-wider">
                                                                        PAKET
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-400">{service.duration_minutes} dakika</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-bold text-slate-900">₺{displayPrice.toFixed(2)}</span>
                                                        {isPlanAttached && !existingPlan && prepayAmount > 0 && (
                                                            <span className="text-[10px] font-bold text-emerald-600">Ön ödeme: ₺{prepayAmount.toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <PreAppointmentPaymentSummary 
                                    selectedCustomer={selectedCustomer} 
                                    selectedServices={selectedServices} 
                                    appointments={appointments} 
                                    appointmentDate={appointmentDateStr}
                                    onOverridesChange={setNewPackageOverrides}
                                />

                                {selectedDate && selectedTime ? (
                                    <div className="p-4 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="material-symbols-outlined">calendar_month</span>
                                            <p className="text-sm font-bold">{selectedDate} {displayMonthYear.split(' ')[0]}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined">schedule</span>
                                            <p className="text-sm font-bold">Saat: {selectedTime} {endTimeStr && `- ${endTimeStr}`}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-sm font-medium text-slate-400">
                                        Tarih ve saat seçilmedi
                                    </div>
                                )}

                                {/* Personel & Salon bilgisi */}
                                {(selectedStaff || selectedSalon) && (
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                        {selectedStaff && (
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">badge</span>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Personel</p>
                                                    <p className="text-sm font-bold text-slate-800">{selectedStaff.name}</p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedSalon && (
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-lg" style={{ color: selectedSalon.color_code || 'var(--color-primary)' }}>meeting_room</span>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salon / Oda</p>
                                                    <p className="text-sm font-bold text-slate-800">{selectedSalon.name}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-6 border-t border-slate-100 space-y-3">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Ara Toplam (KDV Hariç)</span>
                                        <span>₺{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>İçindeki KDV (%20)</span>
                                        <span>₺{taxAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="font-bold text-lg text-slate-900">Genel Toplam</span>
                                        <span className="font-bold text-2xl text-[var(--color-primary)]">₺{totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <button
                                        onClick={handleCreateAppointment}
                                        disabled={selectedServices.length === 0 || !selectedCustomer || isSubmitting}
                                        className="w-full bg-[var(--color-primary)] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? "Kaydediliyor..." : "Randevuyu Oluştur"}
                                        {!isSubmitting && <span className="material-symbols-outlined">arrow_forward</span>}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Müşteri Seçme Modalı (Basit Versiyon) */}
            {isCustomerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCustomerModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 m-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-slate-900">Müşteri Seçin</h3>
                            <button onClick={() => setIsCustomerModalOpen(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="relative mb-4">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input type="text" placeholder="Müşteri ara..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none" />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                            {customers.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <p className="text-sm">Hiç müşteri bulunamadı.</p>
                                    <p className="text-xs mt-1">Lütfen önce Müşteriler sayfasından müşteri ekleyin.</p>
                                </div>
                            ) : (
                                customers.map(customer => (
                                    <div
                                        key={customer.id}
                                        onClick={() => {
                                            setSelectedCustomer(customer);
                                            setIsCustomerModalOpen(false);
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedCustomer?.id === customer.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                            <span className="material-symbols-outlined">person</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{customer.first_name} {customer.last_name}</p>
                                            <p className="text-xs text-slate-500">{customer.phone}</p>
                                        </div>
                                        {selectedCustomer?.id === customer.id && (
                                            <span className="material-symbols-outlined text-[var(--color-primary)] ml-auto">check_circle</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
