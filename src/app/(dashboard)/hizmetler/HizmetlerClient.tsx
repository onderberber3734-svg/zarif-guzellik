"use client";

import { useState, useEffect, useRef } from "react";
import { HizmetEkleModal } from "@/components/HizmetEkleModal";
import { addService, deleteService, updateService, addServiceCategory, deleteServiceCategory, updateServiceCategory } from "@/app/actions/services";

export const getCategoryStyle = (categoryName: string) => {
    switch (categoryName) {
        case "Lazer & Epilasyon": return "bg-red-50 text-red-600";
        case "Cilt Bakımı": return "bg-pink-50 text-pink-600";
        case "Yüz & Kaş": return "bg-orange-50 text-orange-600";
        case "El & Ayak":
        case "Tırnak & El Ayak": return "bg-purple-50 text-purple-600";
        case "Saç Tasarımı": return "bg-blue-50 text-blue-600";
        default: return "bg-[var(--color-primary)]/10 text-[var(--color-primary)]";
    }
};

export default function HizmetlerClient({ initialServices, initialCategories, salons, staffList = [] }: { initialServices: any[], initialCategories: any[], salons: any[], staffList?: any[] }) {
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [services, setServices] = useState(initialServices);
    const [categories, setCategories] = useState(initialCategories);

    // UI States
    const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
    const [activeServiceType, setActiveServiceType] = useState<"single" | "package" | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editCategoryName, setEditCategoryName] = useState("");

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

    // Sync with Server Props
    useEffect(() => {
        setServices(initialServices);
        setCategories(initialCategories);
    }, [initialServices, initialCategories]);

    // Derived State
    const unassignedServices = services.filter(s => !s.salon_services || s.salon_services.length === 0);
    const hasUnassignedWarning = unassignedServices.length > 0;

    const filteredServices = services.filter(service => {
        // Fallback for non-migrated items
        const isMatchedCat = activeCategoryId === "all" || service.category_id === activeCategoryId || (!service.category_id && service.category === categories.find(c => c.id === activeCategoryId)?.name);

        const currentServiceType = service.service_type || "single";
        const isMatchedType = activeServiceType === "all" || currentServiceType === activeServiceType;

        const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return isMatchedCat && isMatchedType && matchesSearch;
    });

    const getServicesCountByCategory = (catId: string) => {
        return services.filter(s => s.category_id === catId || (!s.category_id && s.category === categories.find(c => c.id === catId)?.name)).length;
    };

    // Category Handlers
    const handleSaveCategory = async () => {
        if (!newCategoryName.trim()) {
            setIsAddingCategory(false);
            return;
        }

        const res = await addServiceCategory(newCategoryName);
        if (res.success && res.data) {
            setCategories([...categories, res.data]);
        } else {
            alert(res.error || "Kategori eklenemedi.");
        }

        setNewCategoryName("");
        setIsAddingCategory(false);
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        const count = getServicesCountByCategory(id);
        if (count > 0) {
            alert(`Bu kategoriye ait ${count} adet hizmet bulunuyor. Lütfen önce bu hizmetleri silin veya taşıyın.`);
            return;
        }

        if (!confirm(`'${name}' kategorisini silmek istediğinize emin misiniz?`)) return;

        const res = await deleteServiceCategory(id);
        if (res.success) {
            setCategories(categories.filter(c => c.id !== id));
            if (activeCategoryId === id) setActiveCategoryId("all");
        } else {
            alert(res.error || "Silinirken bir hata oluştu.");
        }
    };

    const handleUpdateCategory = async (id: string) => {
        if (!editCategoryName.trim()) {
            setEditingCategoryId(null);
            return;
        }

        const res = await updateServiceCategory(id, editCategoryName);
        if (res.success && res.data) {
            setCategories(categories.map(c => c.id === id ? res.data : c));
        } else {
            alert(res.error || "Güncellenemedi.");
        }
        setEditingCategoryId(null);
    };


    // Service Handlers
    const handleAddService = async (newService: any) => {
        // Düzenleme (Update) modu
        if (editingService) {
            const res = await updateService(editingService.id, newService);

            if (!res.success) {
                throw new Error(res.error || "Hizmet güncellenemedi.");
            }

            if (res.data) {
                setServices((prev) => prev.map(s => s.id === editingService.id ? { ...res.data, service_categories: categories.find(c => c.id === res.data.category_id) } : s));
            }

            setEditingService(null);
            setIsServiceModalOpen(false);
            return;
        }

        // Yeni Ekleme (Create) Modu
        const res = await addService(newService);

        if (!res.success) {
            throw new Error(res.error || "Hizmet eklenemedi.");
        }

        if (res.data) {
            setServices((prev) => [{ ...res.data, salon_services: [], service_categories: categories.find(c => c.id === res.data.category_id) }, ...prev]);
        }
    };

    const handleDeleteService = async (id: string | number) => {
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
                setServices(prev => prev.map(s => s.id === id ? { ...s, price: res.data.price } : s));
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
        setIsServiceModalOpen(true);
    };

    const handleToggleActive = async (service: any) => {
        const newActive = !service.is_active;
        const res = await updateService(service.id, { is_active: newActive });
        if (res.success) {
            setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: newActive } : s));
        } else {
            alert(res.error || 'Durum güncellenemedi.');
        }
        setActiveMenuId(null);
    };

    return (
        <>
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Sayfa Üst Bilgisi */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-4xl font-bold text-slate-900">Hizmet Kataloğu</h2>
                        <p className="text-slate-400 mt-2 text-base">Salonunuzda sunduğunuz tüm işlemleri ve kategorilerini yönetin.</p>
                    </div>
                    <button
                        onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                    >
                        <span className="material-symbols-outlined text-xl">add</span>
                        Yeni Hizmet Ekle
                    </button>
                </div>

                {/* Oda Atanmamış Hizmet Uyarısı */}
                {hasUnassignedWarning && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-white rounded-full p-2 text-orange-500 shadow-sm mt-0.5">
                            <span className="material-symbols-outlined text-xl">warning</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-orange-800 font-bold mb-1">Eksik Kurulum Uyarısı: Odaya Atanmamış Hizmetleriniz Var!</h4>
                            <p className="text-orange-700/80 text-sm font-medium">Sistemde ekli olan <b>{unassignedServices.length} adet hizmet</b> henüz hiçbir salon veya odaya atanmamış. Bu hizmetler için müşterileriniz internetten randevu alamazlar.</p>
                            <p className="text-orange-600/70 text-xs mt-2">Lütfen "Salonlar/Odalar" menüsüne giderek bu hizmetleri ilgili odalara eşleyin.</p>
                        </div>
                    </div>
                )}

                {/* Personele Atanmamış Hizmet Uyarısı */}
                {services.filter(s => !s.staff_services || s.staff_services.length === 0).length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-white rounded-full p-2 text-amber-500 shadow-sm mt-0.5">
                            <span className="material-symbols-outlined text-xl">badge</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-amber-800 font-bold mb-1">Eksik Personel Ataması: Personele Atanmamış Hizmetleriniz Var!</h4>
                            <p className="text-amber-700/80 text-sm font-medium">Sistemde ekli olan <b>{services.filter(s => !s.staff_services || s.staff_services.length === 0).length} adet hizmet</b> henüz hiçbir personele atanmamış. Bu hizmetler için randevu oluşturulduğunda uygun personel bulunamayacaktır.</p>
                            <p className="text-amber-600/70 text-xs mt-2">Lütfen &quot;Personel&quot; menüsüne giderek bu hizmetleri ilgili personellere eşleyin veya hizmeti düzenleyerek personel atayın.</p>
                        </div>
                    </div>
                )}

                {/* İki Kolonlu Yapı: Kategoriler(Sol) ve Hizmetler(Sağ) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* SOL KOLON: KATEGORİ YÖNETİMİ */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Kategoriler</h3>

                            <div className="space-y-1 custom-scrollbar max-h-[60vh] overflow-y-auto pr-2">
                                {/* Tümü */}
                                <button
                                    onClick={() => setActiveCategoryId("all")}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeCategoryId === "all" ? 'bg-[var(--color-primary)] text-white shadow-md shadow-purple-500/20' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                    <span className="font-bold text-sm">Tümü</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeCategoryId === "all" ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {services.length}
                                    </span>
                                </button>

                                {/* Dinamik Kategoriler */}
                                {categories.map(cat => (
                                    <div key={cat.id} className="relative group">
                                        {editingCategoryId === cat.id ? (
                                            <div className="flex items-center gap-2 p-1">
                                                <input
                                                    type="text"
                                                    value={editCategoryName}
                                                    onChange={e => setEditCategoryName(e.target.value)}
                                                    className="w-full text-sm font-medium border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--color-primary)]"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateCategory(cat.id);
                                                        if (e.key === 'Escape') setEditingCategoryId(null);
                                                    }}
                                                />
                                                <button onClick={() => handleUpdateCategory(cat.id)} className="text-emerald-500 hover:text-emerald-700">
                                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                </button>
                                                <button onClick={() => setEditingCategoryId(null)} className="text-slate-400 hover:text-red-500">
                                                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setActiveCategoryId(cat.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeCategoryId === cat.id ? 'bg-purple-50 text-[var(--color-primary)] border border-purple-100' : 'hover:bg-slate-50 text-slate-700 border border-transparent'}`}
                                            >
                                                <span className="font-bold text-sm text-left truncate pr-2">{cat.name}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${activeCategoryId === cat.id ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {getServicesCountByCategory(cat.id)}
                                                </span>
                                            </button>
                                        )}

                                        {/* Action Hover */}
                                        {activeCategoryId !== cat.id && editingCategoryId !== cat.id && (
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex bg-slate-50 p-1 rounded-lg border border-slate-100 shadow-sm">
                                                <button onClick={() => { setEditingCategoryId(cat.id); setEditCategoryName(cat.name); }} className="p-1 text-slate-400 hover:text-[var(--color-primary)]">
                                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-1 text-slate-400 hover:text-red-500">
                                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Yeni Kategori Ekleme */}
                                {isAddingCategory ? (
                                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 border-dashed flex flex-col gap-2">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            className="w-full text-sm font-medium border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
                                            placeholder="Kategori Adı..."
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveCategory();
                                                if (e.key === 'Escape') setIsAddingCategory(false);
                                            }}
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleSaveCategory} className="flex-1 bg-[var(--color-primary)] text-white text-xs font-bold py-1.5 rounded-lg">Kaydet</button>
                                            <button onClick={() => setIsAddingCategory(false)} className="flex-1 bg-white border border-slate-200 text-slate-500 text-xs font-bold py-1.5 rounded-lg">İptal</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingCategory(true)}
                                        className="w-full mt-2 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>
                                        <span className="font-bold text-sm">Yeni Kategori Ekle</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SAĞ KOLON: HİZMETLER LİSTESİ */}
                    <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col custom-min-h-[500px]">
                        {/* Arama Barı ve Filtreler */}
                        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
                            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
                                <button
                                    onClick={() => setActiveServiceType("all")}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeServiceType === "all" ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Tümü
                                </button>
                                <button
                                    onClick={() => setActiveServiceType("single")}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeServiceType === "single" ? 'bg-[var(--color-primary)] text-white shadow-md shadow-purple-500/20' : 'text-slate-500 hover:text-[var(--color-primary)]'}`}
                                >
                                    Tek Seans
                                </button>
                                <button
                                    onClick={() => setActiveServiceType("package")}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeServiceType === "package" ? 'bg-purple-100 text-purple-700 shadow-md border border-purple-200' : 'text-slate-500 hover:text-purple-600'}`}
                                >
                                    Paketler
                                    {activeServiceType !== "package" && <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>}
                                </button>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <div className="relative w-full max-w-sm flex-1">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input
                                        className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm placeholder:text-slate-400 outline-none"
                                        placeholder="Bu kategorideki hizmetlerde ara..."
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 font-medium text-sm flex items-center gap-2 shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">sort</span> Sırala
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="p-6 flex-1 bg-slate-50/20">
                            {filteredServices.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                                    <div className="p-4 bg-[var(--color-primary)]/5 rounded-full mb-4 text-[var(--color-primary)]">
                                        <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 mb-1">
                                        {services.length === 0 ? "Henüz Hizmet Eklenmemiş" : "Hizmet Bulunamadı"}
                                    </h4>
                                    <p className="text-sm text-slate-500 max-w-xs mb-6">
                                        {services.length === 0
                                            ? "Müşterilerinize sunduğunuz ilk işlemi ekleyerek kataloğunuzu oluşturmaya başlayın."
                                            : "Bu kategori veya aramaya uygun hizmet bulunmuyor."}
                                    </p>
                                    <button
                                        onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}
                                        className="px-6 py-2.5 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all text-sm"
                                    >
                                        Yeni Hizmet Ekle
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filteredServices.map((service) => {
                                        const isUnassigned = !service.salon_services || service.salon_services.length === 0;
                                        const isStaffUnassigned = !service.staff_services || service.staff_services.length === 0;
                                        const catName = service.service_categories?.name || service.category || "Genel";
                                        const hasWarning = isUnassigned || isStaffUnassigned;

                                        return (
                                            <div key={service.id} className={`bg-white border p-5 rounded-3xl transition-colors group shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col relative w-full h-full ${hasWarning ? 'border-orange-200 hover:border-orange-400' : 'border-slate-200 hover:border-[var(--color-primary)]/50'}`}>

                                                <div className="absolute -top-3 -right-2 flex gap-1 z-10">
                                                    {isUnassigned && (
                                                        <div className="bg-orange-100 text-orange-600 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-orange-200 shadow-sm flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">meeting_room</span>
                                                            Oda
                                                        </div>
                                                    )}
                                                    {isStaffUnassigned && (
                                                        <div className="bg-amber-100 text-amber-700 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-amber-200 shadow-sm flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">badge</span>
                                                            Personel
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-2 rounded-xl flex items-center justify-center ${getCategoryStyle(catName)}`}>
                                                        <span className="material-symbols-outlined">{service.icon || 'auto_awesome'}</span>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-1 group/price bg-slate-50 px-2 pl-3 py-1 rounded-xl">
                                                            <input
                                                                type="text"
                                                                defaultValue={service.service_type === 'package' ? service.default_package_price : service.price}
                                                                onBlur={(e) => handleInlinePriceUpdate(service.id, service.service_type === 'package' ? service.default_package_price : service.price, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                                }}
                                                                className="w-16 bg-transparent border-none p-0 text-right text-lg font-bold text-slate-900 focus:ring-0 focus:outline-none"
                                                                disabled={service.service_type === 'package'}
                                                            />
                                                            <span className="text-lg font-bold text-slate-900">₺</span>
                                                            {service.service_type !== 'package' && (
                                                                <span className="material-symbols-outlined text-xs text-slate-300 opacity-0 group-hover/price:opacity-100 transition-opacity ml-1 hover:text-[var(--color-primary)]">edit</span>
                                                            )}
                                                        </div>
                                                        {service.service_type === 'package' ? (
                                                            <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded mr-2 mt-1 border border-purple-100">
                                                                <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                                                <p className="text-[10px] font-bold">{service.default_total_sessions} Seans</p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-slate-400 mr-2 mt-1">
                                                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                                <p className="text-xs font-medium">{service.duration_minutes} dk</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-start pr-2">
                                                    <div className="flex-1 pr-2">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-base text-slate-900 leading-tight">{service.name}</h4>
                                                            {service.service_type === 'package' && (
                                                                <span className="px-1.5 py-0.5 bg-purple-100 text-[var(--color-primary)] text-[9px] font-bold rounded uppercase tracking-wider shrink-0">PAKET</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{catName}</p>
                                                    </div>

                                                    {/* Action Menü */}
                                                    <div className="relative z-10 shrink-0" ref={activeMenuId === service.id ? menuRef : null}>
                                                        <button
                                                            onClick={() => setActiveMenuId(activeMenuId === service.id ? null : service.id)}
                                                            className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-full transition-colors bg-slate-50"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                        </button>

                                                        {/* Dropdown Menu */}
                                                        {activeMenuId === service.id && (
                                                            <div className="absolute right-0 top-10 w-44 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 pt-1 z-50">
                                                                <div className="p-1.5">
                                                                    <button
                                                                        onClick={() => handleEditClick(service)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] rounded-xl transition-colors font-medium"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                                        Düzenle
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleToggleActive(service)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">{service.is_active === false ? 'visibility' : 'public_off'}</span>
                                                                        {service.is_active === false ? 'Aktife Al' : 'Pasife Al'}
                                                                    </button>
                                                                    <div className="h-px bg-slate-100 my-1.5 mx-2"></div>
                                                                    <button
                                                                        onClick={() => handleDeleteService(service.id)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                        Sil
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {service.description && (
                                                    <p className="text-sm text-slate-500 line-clamp-2 mt-auto pt-2 border-t border-slate-50 leading-relaxed">{service.description}</p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <HizmetEkleModal
                isOpen={isServiceModalOpen}
                initialData={editingService}
                onClose={() => setIsServiceModalOpen(false)}
                onAdd={handleAddService}
                categories={categories}
                activeCategoryId={activeCategoryId}
                salons={salons}
                staffList={staffList}
            />
        </>
    );
}

