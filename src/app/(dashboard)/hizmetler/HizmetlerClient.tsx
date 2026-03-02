"use client";

import { useState, useEffect, useRef } from "react";
import { HizmetEkleModal } from "@/components/HizmetEkleModal";
import { addService, deleteService, updateService } from "@/app/actions/services";

export const getCategoryStyle = (category: string) => {
    switch (category) {
        case "Lazer & Epilasyon": return "bg-red-50 text-red-600";
        case "Cilt Bakımı": return "bg-pink-50 text-pink-600";
        case "Yüz & Kaş": return "bg-orange-50 text-orange-600";
        case "El & Ayak":
        case "Tırnak & El Ayak": return "bg-purple-50 text-purple-600";
        case "Saç Tasarımı": return "bg-blue-50 text-blue-600";
        default: return "bg-[var(--color-primary)]/10 text-[var(--color-primary)]";
    }
};

export default function HizmetlerClient({ initialServices }: { initialServices: any[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [services, setServices] = useState(initialServices);

    // Aksiyon menüsü (3 nokta) için state
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Düzenleme (Edit) modu için state
    const [editingService, setEditingService] = useState<any | null>(null);

    // Dışarı tıklanınca menüyü kapat
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Kategori verileri şimdilik statik
    const categories = [
        { name: "Tümü", count: services.length, active: true },
        { name: "Cilt Bakımı", count: services.filter(s => s.category === "Cilt Bakımı").length },
        { name: "Saç Tasarımı", count: services.filter(s => s.category === "Saç Tasarımı").length },
        { name: "Lazer & Epilasyon", count: services.filter(s => s.category === "Lazer & Epilasyon").length },
        { name: "Tırnak & El Ayak", count: services.filter(s => s.category === "Tırnak & El Ayak").length },
    ];

    // initialServices güncellendikçe (örn. Next.js revalidatePath ile) local state'i güncelle
    useEffect(() => {
        setServices(initialServices);
    }, [initialServices]);

    const handleAddService = async (newService: any) => {
        // Düzenleme (Update) modu
        if (editingService) {
            const res = await updateService(editingService.id, newService);

            if (!res.success) {
                throw new Error(res.error || "Hizmet güncellenemedi.");
            }

            if (res.data) {
                setServices((prev) => prev.map(s => s.id === editingService.id ? res.data : s));
            }

            setEditingService(null);
            setIsModalOpen(false);
            return;
        }

        // Yeni Ekleme (Create) Modu
        const res = await addService(newService);

        if (!res.success) {
            throw new Error(res.error || "Hizmet eklenemedi.");
        }

        if (res.data) {
            setServices((prev) => [res.data, ...prev]);
        }
    };

    const handleDelete = async (id: string | number) => {
        if (!confirm("Bu hizmeti kalıcı olarak silmek istediğinize emin misiniz?")) return;

        setActiveMenuId(null);
        const res = await deleteService(String(id));

        if (res.success) {
            setServices(prev => prev.filter(s => s.id !== id));
        } else {
            alert(res.error || "Silme işlemi başarısız.");
        }
    };

    const handleInlinePriceUpdate = async (id: string | number, currentPrice: number, newPriceStr: string) => {
        const newPrice = parseFloat(newPriceStr);
        if (isNaN(newPrice) || newPrice === currentPrice) return;

        try {
            const res = await updateService(id, { price: newPrice });
            if (res.success && res.data) {
                setServices(prev => prev.map(s => s.id === id ? res.data : s));
            } else {
                alert("Fiyat güncellenemedi: " + (res.error || "Bilinmeyen hata"));
            }
        } catch (error) {
            console.error(error);
            alert("Fiyat güncellenirken bir hata oluştu.");
        }
    };

    const handleEditClick = (service: any) => {
        setEditingService(service);
        setActiveMenuId(null);
        setIsModalOpen(true);
    };

    const handleOpenNewModal = () => {
        setEditingService(null);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Sayfa Üst Bilgisi */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-4xl font-bold text-slate-900">Hizmet Kataloğu</h2>
                        <p className="text-slate-400 mt-2 text-base">Salonunuzda sunduğunuz tüm işlemleri ve fiyatlarını yönetin.</p>
                    </div>
                    <button
                        onClick={handleOpenNewModal}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                    >
                        <span className="material-symbols-outlined text-xl">add</span>
                        Yeni Hizmet Ekle
                    </button>
                </div>

                {/* İstatistikler */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-[var(--color-accent-lavender)] rounded-2xl text-[var(--color-primary)]">
                            <span className="material-symbols-outlined text-3xl">content_cut</span>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Toplam Hizmet</p>
                            <h3 className="text-2xl font-bold">{services.length}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                            <span className="material-symbols-outlined text-3xl">star</span>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">En Popüler</p>
                            <h3 className="text-lg font-bold leading-tight">Cilt Bakımı</h3>
                        </div>
                    </div>
                    <div className="md:col-span-2 bg-gradient-to-r from-purple-50 to-[var(--color-accent-pink)] p-6 rounded-3xl border border-purple-100 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold uppercase tracking-widest text-[10px] mb-2">
                                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                AI Fiyat Optimizasyonu
                            </div>
                            <p className="text-sm text-slate-700 font-medium max-w-sm">
                                "Kalıcı Oje" hizmetinizin bölge ortalamasının <b>%15 altında</b> kaldığını tespit ettik. Fiyatı güncellemeyi düşünür müsünüz?
                            </p>
                        </div>
                        <button className="bg-white text-[var(--color-primary)] px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors">
                            Analizi Gör
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Kategori Filtreleri */}
                    <div className="flex gap-2 p-4 border-b border-slate-100 overflow-x-auto">
                        {categories.map((cat) => (
                            <button
                                key={cat.name}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${cat.active
                                    ? "bg-[var(--color-primary)] text-white shadow-md shadow-purple-500/20"
                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    }`}
                            >
                                {cat.name} <span className="opacity-60 ml-1 font-medium">({cat.count})</span>
                            </button>
                        ))}
                    </div>

                    {/* Hizmet Listesi (Grid) */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="relative w-72">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm placeholder:text-slate-400 outline-none"
                                    placeholder="Hizmet ara..."
                                    type="text"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"><span className="material-symbols-outlined text-xl">grid_view</span></button>
                                <button className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 transition-colors"><span className="material-symbols-outlined text-xl">view_list</span></button>
                            </div>
                        </div>

                        {services.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center">
                                <div className="p-4 bg-[var(--color-primary)]/5 rounded-full mb-4 text-[var(--color-primary)]">
                                    <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 mb-1">Henüz Hizmet Eklenmemiş</h4>
                                <p className="text-sm text-slate-500 max-w-xs mb-6">Müşterilerinize sunduğunuz ilk işlemi ekleyerek kataloğunuzu oluşturmaya başlayın.</p>
                                <button
                                    onClick={handleOpenNewModal}
                                    className="px-6 py-2.5 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all text-sm"
                                >
                                    İlk Hizmeti Ekle
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {services.map((service) => (
                                    <div key={service.id} className="bg-white border border-slate-200 p-5 rounded-3xl hover:border-[var(--color-primary)]/50 transition-colors group shadow-sm flex flex-col relative w-full h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-2 rounded-xl flex items-center justify-center ${getCategoryStyle(service.category)}`}>
                                                <span className="material-symbols-outlined">{service.icon || 'auto_awesome'}</span>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1 group/price bg-slate-50 px-2 pl-3 py-1 rounded-xl">
                                                    <input
                                                        type="text"
                                                        defaultValue={service.price}
                                                        onBlur={(e) => handleInlinePriceUpdate(service.id, service.price, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') e.currentTarget.blur();
                                                        }}
                                                        className="w-16 bg-transparent border-none p-0 text-right text-lg font-bold text-slate-900 focus:ring-0 focus:outline-none"
                                                    />
                                                    <span className="text-lg font-bold text-slate-900">₺</span>
                                                    <span className="material-symbols-outlined text-xs text-[var(--color-primary)] opacity-0 group-hover/price:opacity-100 transition-opacity ml-1">edit</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-400 mr-2 mt-1">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                    <p className="text-xs">{service.duration_minutes} dk</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-start pr-2">
                                            <div>
                                                <h4 className="font-bold text-lg mb-1 text-slate-900">{service.name}</h4>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{service.category}</p>
                                            </div>

                                            {/* Action Menü */}
                                            <div className="relative z-10" ref={activeMenuId === service.id ? menuRef : null}>
                                                <button
                                                    onClick={() => setActiveMenuId(activeMenuId === service.id ? null : service.id)}
                                                    className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-full transition-colors"
                                                >
                                                    <span className="material-symbols-outlined">more_vert</span>
                                                </button>

                                                {/* Dropdown Menu */}
                                                {activeMenuId === service.id && (
                                                    <div className="absolute right-0 top-8 w-44 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 pt-1">
                                                        <div className="p-1.5">
                                                            <button
                                                                onClick={() => handleEditClick(service)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] rounded-xl transition-colors font-medium"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">edit</span>
                                                                Düzenle
                                                            </button>
                                                            <button
                                                                onClick={() => { }} // TODO: Aktif / Pasif işlemi için backend hazırlanacak
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">public_off</span>
                                                                Pasife Al
                                                            </button>
                                                            <div className="h-px bg-slate-100 my-1.5 mx-2"></div>
                                                            <button
                                                                onClick={() => handleDelete(service.id)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                                Sil
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {service.description && (
                                            <p className="text-sm text-slate-500 line-clamp-2 mt-auto">{service.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <HizmetEkleModal
                isOpen={isModalOpen}
                initialData={editingService}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddService}
            />
        </>
    );
}
