"use client";

import { useEffect, useState } from "react";
import {
    createPublicBooking,
    getPublicAvailability,
    getPublicServices,
    getPublicStaffForService
} from "@/app/actions/public-booking";

enum WizardStep {
    SERVICE_SELECTION = 1,
    STAFF_SELECTION = 2,
    DATE_TIME_SELECTION = 3,
    CUSTOMER_INFO = 4,
    CONFIRMATION = 5
}

type BookingSettings = {
    require_otp?: boolean;
    allow_any_staff?: boolean;
};

type Business = {
    id: string;
    name: string;
    slug?: string | null;
    booking_settings?: BookingSettings | null;
};

type ServiceCategory = {
    color_code?: string | null;
    icon?: string | null;
};

type Service = {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    description?: string | null;
    service_categories?: ServiceCategory | null;
};

type StaffMember = {
    id: string;
    first_name: string;
    last_name: string;
    role?: string | null;
};

type Slot = {
    time: string;
    available: boolean;
    available_staff_ids?: string[];
};

type CustomerForm = {
    firstName: string;
    lastName: string;
    phone: string;
};

type WizardHeaderProps = {
    businessName: string;
    step: WizardStep;
    onBack?: () => void;
};

function getTodayInIstanbul() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul"
    }).format(new Date());
}

function WizardHeader({ businessName, step, onBack }: WizardHeaderProps) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 text-center relative">
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                {businessName}
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">
                Online Randevu Sistemi
            </p>

            <div className="flex justify-center items-center gap-2 mt-6 max-w-sm mx-auto">
                {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="flex items-center">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${step === num ? "bg-[var(--color-primary)] text-white shadow-md shadow-purple-500/20" : step > num ? "bg-purple-100 text-[var(--color-primary)]" : "bg-slate-100 text-slate-400"}`}>
                            {step > num ? <span className="material-symbols-outlined text-[16px]">check</span> : num}
                        </div>
                        {num < 4 && <div className={`w-6 sm:w-10 h-1 rounded-full mx-1 transition-colors ${step > num ? "bg-purple-200" : "bg-slate-100"}`}></div>}
                    </div>
                ))}
            </div>

            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-8 left-8 p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
            )}
        </div>
    );
}

function ErrorBanner({ message }: { message: string }) {
    if (!message) return null;

    return (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {message}
        </div>
    );
}

export default function BookingWizardClient({ business }: { business: Business }) {
    const publicSlug = business.slug || "";
    const [step, setStep] = useState<WizardStep>(WizardStep.SERVICE_SELECTION);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [services, setServices] = useState<Service[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(getTodayInIstanbul());

    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerForm>({ firstName: "", lastName: "", phone: "" });
    const [otpCode, setOtpCode] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadServices() {
            setIsLoading(true);
            setErrorMessage("");
            const res = await getPublicServices(publicSlug);

            if (!isMounted) return;

            if (res.success && res.data) {
                setServices(res.data as Service[]);
            } else {
                setErrorMessage(res.error || "Hizmetler yuklenemedi.");
            }

            setIsLoading(false);
        }

        loadServices();

        return () => {
            isMounted = false;
        };
    }, [publicSlug]);

    const selectedService = services.find((service) => service.id === selectedServiceId);

    const fetchAvailability = async (staffId: string | null, date: string) => {
        if (!selectedServiceId) return;

        setIsLoading(true);
        setErrorMessage("");

        const normalizedStaffId = staffId === "any" ? null : staffId;
        const res = await getPublicAvailability(publicSlug, date, selectedServiceId, normalizedStaffId);

        if (res.success && res.data) {
            setAvailableSlots(res.data as Slot[]);
        } else {
            setAvailableSlots([]);
            setErrorMessage(res.error || "Musaitlik bilgisi alinamadi.");
        }

        setIsLoading(false);
    };

    const handleServiceSelect = async (serviceId: string) => {
        setSelectedServiceId(serviceId);
        setSelectedStaffId(null);
        setSelectedTimeSlot(null);
        setStaffList([]);
        setAvailableSlots([]);
        setErrorMessage("");
        setIsLoading(true);

        const res = await getPublicStaffForService(publicSlug, serviceId);

        if (res.success && res.data) {
            const nextStaff = res.data as StaffMember[];
            setStaffList(nextStaff);

            if (nextStaff.length === 0 && business.booking_settings?.allow_any_staff === false) {
                setSelectedStaffId("any");
                setStep(WizardStep.DATE_TIME_SELECTION);
                await fetchAvailability(null, selectedDate);
            } else {
                setStep(WizardStep.STAFF_SELECTION);
            }
        } else {
            setErrorMessage(res.error || "Personel bilgisi alinamadi.");
        }

        setIsLoading(false);
    };

    const handleStaffSelect = async (staffId: string | "any") => {
        const nextStaffId = staffId === "any" ? "any" : staffId;
        setSelectedStaffId(nextStaffId);
        setSelectedTimeSlot(null);
        setStep(WizardStep.DATE_TIME_SELECTION);
        await fetchAvailability(nextStaffId, selectedDate);
    };

    const handleDateSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value;
        setSelectedDate(date);
        setSelectedTimeSlot(null);
        await fetchAvailability(selectedStaffId, date);
    };

    const handleTimeSelect = (timeStr: string) => {
        setSelectedTimeSlot(timeStr);
        setErrorMessage("");
        setStep(WizardStep.CUSTOMER_INFO);
    };

    const handleCustomerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedServiceId || !selectedTimeSlot) {
            setErrorMessage("Randevu icin hizmet ve saat secimi gerekli.");
            return;
        }

        const requireOtp = business.booking_settings?.require_otp || false;
        if (requireOtp && !isOtpSent) {
            setIsLoading(true);
            setErrorMessage("SMS entegrasyonu henuz bagli degil. Test icin 123456 kodunu kullanabilirsiniz.");
            setTimeout(() => {
                setIsOtpSent(true);
                setIsLoading(false);
            }, 400);
            return;
        }

        setIsLoading(true);
        setErrorMessage("");

        const result = await createPublicBooking(
            publicSlug,
            selectedServiceId,
            selectedStaffId || "any",
            selectedDate,
            selectedTimeSlot,
            customerInfo,
            otpCode
        );

        if (!result.success) {
            setErrorMessage(result.error || "Randevu olusturulamadi.");
            setIsLoading(false);
            return;
        }

        setIsLoading(false);
        setStep(WizardStep.CONFIRMATION);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price || 0);
    };

    const backHandler = step > 1 && step < 5 ? () => setStep(step - 1) : undefined;

    if (step === WizardStep.SERVICE_SELECTION) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <WizardHeader businessName={business.name} step={step} onBack={backHandler} />
                <ErrorBanner message={errorMessage} />
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Hizmet Seciniz</h2>

                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400">Hizmetler yukleniyor...</div>
                    ) : services.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
                            Su anda aktif online rezervasyon hizmeti bulunmuyor.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {services.map((service) => (
                                <button
                                    key={service.id}
                                    onClick={() => handleServiceSelect(service.id)}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[var(--color-primary)] hover:shadow-lg hover:shadow-purple-500/10 transition-all text-left flex items-start gap-4 group"
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 text-slate-600 transition-colors"
                                        style={{
                                            backgroundColor: service.service_categories?.color_code ? `${service.service_categories.color_code}20` : "#f8fafc",
                                            color: service.service_categories?.color_code || "#475569"
                                        }}
                                    >
                                        <span className="material-symbols-outlined">{service.service_categories?.icon || "spa"}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-[var(--color-primary)] truncate">{service.name}</h3>
                                        {service.description && <p className="text-slate-500 text-xs font-medium mt-1 line-clamp-2">{service.description}</p>}
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-[11px] font-bold text-[var(--color-primary)] bg-purple-50 px-2.5 py-1 rounded-lg">
                                                {service.duration_minutes} Dk
                                            </span>
                                            {service.price > 0 && <span className="text-slate-700 font-extrabold">{formatPrice(service.price)}</span>}
                                        </div>
                                    </div>
                                    <div className="shrink-0 self-center text-slate-300 group-hover:text-[var(--color-primary)]">
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (step === WizardStep.STAFF_SELECTION) {
        return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <WizardHeader businessName={business.name} step={step} onBack={backHandler} />
                <ErrorBanner message={errorMessage} />
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm mb-6 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> SECILEN HIZMET</p>
                        <p className="font-extrabold text-slate-800">{selectedService?.name}</p>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Personel Tercihi</h2>
                {isLoading ? (
                    <div className="p-8 text-center text-slate-400">Yukleniyor...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {business.booking_settings?.allow_any_staff !== false && (
                            <button onClick={() => handleStaffSelect("any")} className="p-5 rounded-2xl border-2 text-center transition-all bg-white hover:border-purple-300 hover:shadow-md cursor-pointer border-slate-200">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
                                    <span className="material-symbols-outlined text-3xl">groups</span>
                                </div>
                                <h3 className="font-extrabold text-slate-800">Fark Etmez</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1">En uygun ilk saate randevu verilir.</p>
                            </button>
                        )}

                        {staffList.map((staff) => (
                            <button key={staff.id} onClick={() => handleStaffSelect(staff.id)} className="p-5 rounded-2xl border-2 text-center transition-all bg-white hover:border-purple-300 hover:shadow-md cursor-pointer flex flex-col items-center border-slate-200">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 text-[var(--color-primary)] flex items-center justify-center text-xl font-bold uppercase mb-3">
                                    {staff.first_name[0]}{staff.last_name[0]}
                                </div>
                                <h3 className="font-extrabold text-slate-800">{staff.first_name} {staff.last_name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{staff.role}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (step === WizardStep.DATE_TIME_SELECTION) {
        return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <WizardHeader businessName={business.name} step={step} onBack={backHandler} />
                <ErrorBanner message={errorMessage} />

                <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Tarih ve Saat</h2>

                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                    <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Tarih Seciniz</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateSelect}
                            min={getTodayInIstanbul()}
                            className="w-full border-2 border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-bold text-slate-700 block mb-3">Musait Saatler</label>

                        {isLoading ? (
                            <div className="py-8 text-center">Uygunluk durumu kontrol ediliyor...</div>
                        ) : availableSlots.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                Bu tarihte musait bir yer bulunamadi. Lutfen baska bir tarih secin.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {availableSlots.map((slot, index) => (
                                    <button
                                        key={`${slot.time}-${index}`}
                                        disabled={!slot.available}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        className={`py-3 rounded-xl border text-sm font-bold transition-all ${slot.available ? "border-purple-200 bg-purple-50 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white hover:shadow-lg hover:shadow-[var(--color-primary)]/30" : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60"}`}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (step === WizardStep.CUSTOMER_INFO) {
        return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <WizardHeader businessName={business.name} step={step} onBack={backHandler} />
                <ErrorBanner message={errorMessage} />

                <div className="bg-slate-900 text-white rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <span className="material-symbols-outlined text-8xl">drafts</span>
                    </div>

                    <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-4">Randevu Ozeti</p>
                    <h3 className="text-xl font-extrabold mb-1">{selectedService?.name}</h3>
                    <p className="text-sm text-white/70 font-medium mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">calendar_month</span> {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("tr-TR")} - {selectedTimeSlot}</p>

                    {selectedService && selectedService.price > 0 && (
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-sm text-white/70">Odenecek Tutar</span>
                            <span className="text-2xl font-black">{formatPrice(selectedService.price)}</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleCustomerSubmit} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Bilgileriniz</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1.5">Adiniz</label>
                            <input type="text" value={customerInfo.firstName} onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })} required disabled={isOtpSent} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-[var(--color-primary)] outline-none font-bold text-slate-800 disabled:opacity-50" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1.5">Soyadiniz</label>
                            <input type="text" value={customerInfo.lastName} onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })} required disabled={isOtpSent} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-[var(--color-primary)] outline-none font-bold text-slate-800 disabled:opacity-50" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">Cep Telefonu</label>
                        <div className="flex gap-2 relative">
                            <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">+90</span>
                            <input type="tel" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} placeholder="(5XX) XXX XX XX" required disabled={isOtpSent} className="w-full pl-12 bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-[var(--color-primary)] outline-none font-bold text-slate-800 disabled:opacity-50 tracking-wider" />
                        </div>
                    </div>

                    {business.booking_settings?.require_otp && isOtpSent && (
                        <div className="p-5 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-2xl animate-in zoom-in-95 mt-4">
                            <label className="text-xs font-extrabold text-[var(--color-primary)] mb-2 block text-center uppercase tracking-wider">SMS Dogrulama Kodu</label>
                            <input autoFocus type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required className="w-full bg-white border-2 border-[var(--color-primary)]/40 text-center text-2xl tracking-[0.5em] p-3 rounded-xl outline-none font-black text-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                            <p className="text-[10px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">info</span> Test akisinda 123456 kodu kullaniliyor.
                            </p>
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} className="w-full mt-6 py-4 bg-[var(--color-primary)] text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all shadow-xl shadow-[var(--color-primary)]/20 disabled:opacity-70 flex justify-center items-center gap-3">
                        {isLoading ? "Isleniyor..." : isOtpSent ? "Dogrula ve Onayla" : "Randevuyu Tamamla"}
                        {!isLoading && !isOtpSent && <span className="material-symbols-outlined">chevron_right</span>}
                    </button>

                    <p className="text-[10px] text-slate-400 text-center mt-4 px-4 leading-relaxed">
                        Randevu alarak kisisel verilerinizin islenmesine ve gizlilik kosullarina uyacaginizi kabul etmis sayilirsiniz.
                    </p>
                </form>
            </div>
        );
    }

    if (step === WizardStep.CONFIRMATION) {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
                    <span className="material-symbols-outlined text-5xl">check_circle</span>
                </div>

                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Randevunuz Alindi</h1>
                <p className="text-slate-500 font-medium max-w-sm mb-8">
                    Sayin {customerInfo.firstName}, <strong className="text-slate-800">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("tr-TR")} saat {selectedTimeSlot}</strong> icin <strong className="text-slate-800">{selectedService?.name}</strong> randevunuz basariyla olusturuldu.
                </p>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm w-full max-w-sm mx-auto mb-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Isletme Bilgileri</p>
                    <h3 className="font-extrabold text-slate-800 text-lg">{business.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">Onay icin sizinle telefon uzerinden iletisime gecilebilir.</p>
                </div>

                <a href={business.slug ? `/${business.slug}` : "/"} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                    Yeni Bir Islem
                </a>
            </div>
        );
    }

    return null;
}
