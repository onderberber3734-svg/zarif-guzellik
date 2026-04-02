"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HizmetEkleModal } from "@/components/HizmetEkleModal";
import { PackageTemplatesModal, PackageTemplate } from "@/components/PackageTemplatesModal";
import { addService, deleteService, updateService, addServiceCategory, deleteServiceCategory, updateServiceCategory, getServiceCategories, addMultipleServices } from "@/app/actions/services";

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

export default function Step3({ services, onNext, onBack, isPending }: any) {
    const [localServices, setLocalServices] = useState<any[]>(services);
    const [categories, setCategories] = useState<any[]>([]);
    const [formPending, startTransition] = useTransition();
    const router = useRouter();

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    // UI States
    const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
    const [activeServiceType, setActiveServiceType] = useState<"all" | "single" | "package">("all");
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

    // Sync Categories
    useEffect(() => {
        const fetchCategories = async () => {
            const fetchedCats = await getServiceCategories();
            setCategories(fetchedCats || []);
        };
        fetchCategories();
    }, []);

    // Derived State
    const filteredServices = localServices.filter(service => {
        const isMatchedCat = activeCategoryId === "all" || service.category_id === activeCategoryId || (!service.category_id && service.category === categories.find(c => c.id === activeCategoryId)?.name);

        const isMatchedType = activeServiceType === "all" ||
            (activeServiceType === "package" && service.service_type === "package") ||
            (activeServiceType === "single" && service.service_type !== "package");

        const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return isMatchedCat && isMatchedType && matchesSearch;
    });

    const getServicesCountByCategory = (catId: string) => {
        return localServices.filter(s => s.category_id === catId || (!s.category_id && s.category === categories.find(c => c.id === catId)?.name)).length;
    };

    // Category Handlers
    const handleSaveCategory = async () => {
        if (!newCategoryName.trim()) {
            setIsAddingCategory(false);
            return;
        }

        startTransition(async () => {
            const res = await addServiceCategory(newCategoryName);
            if (res.success && res.data) {
                setCategories([...categories, res.data]);
            } else {
                alert(res.error || "Kategori eklenemedi.");
            }

            setNewCategoryName("");
            setIsAddingCategory(false);
        });
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        const count = getServicesCountByCategory(id);
        if (count > 0) {
            alert(`Bu kategoriye ait ${count} adet hizmet bulunuyor. Lütfen önce bu hizmetleri silin veya taşıyın.`);
            return;
        }

        if (!confirm(`'${name}' kategorisini silmek istediğinize emin misiniz?`)) return;

        startTransition(async () => {
            const res = await deleteServiceCategory(id);
            if (res.success) {
                setCategories(categories.filter(c => c.id !== id));
                if (activeCategoryId === id) setActiveCategoryId("all");
            } else {
                alert(res.error || "Silinirken bir hata oluştu.");
            }
        });
    };

    const handleUpdateCategory = async (id: string) => {
        if (!editCategoryName.trim()) {
            setEditingCategoryId(null);
            return;
        }

        startTransition(async () => {
            const res = await updateServiceCategory(id, editCategoryName);
            if (res.success && res.data) {
                setCategories(categories.map(c => c.id === id ? res.data : c));
            } else {
                alert(res.error || "Güncellenemedi.");
            }
            setEditingCategoryId(null);
        });
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
                setLocalServices((prev) => prev.map(s => s.id === editingService.id ? { ...res.data, service_categories: categories.find(c => c.id === res.data.category_id) } : s));
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
            setLocalServices((prev) => [{ ...res.data, salon_services: [], service_categories: categories.find(c => c.id === res.data.category_id) }, ...prev]);
        }
    };

    const handleDeleteService = async (id: string | number) => {
        if (!confirm("Bu hizmeti kalıcı olarak silmek istediğinize emin misiniz?")) return;

        setActiveMenuId(null);
        startTransition(async () => {
            const res = await deleteService(String(id));

            if (res.success) {
                setLocalServices(prev => prev.filter(s => s.id !== id));
            } else {
                alert(res.error || "Silme işlemi başarısız.");
            }
        });
    };

    const handleInlinePriceUpdate = async (id: string | number, currentPrice: number, newPriceStr: string) => {
        const newPrice = parseFloat(newPriceStr);
        if (isNaN(newPrice) || newPrice === currentPrice) return;

        try {
            const res = await updateService(id.toString(), { price: newPrice });
            if (res.success && res.data) {
                setLocalServices(prev => prev.map(s => s.id === id ? { ...s, price: res.data.price } : s));
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

    const handleSaveTemplates = async (templates: PackageTemplate[]) => {
        if (templates.length === 0) return;

        startTransition(async () => {
            try {
                // Ensure all distinct categories exist
                const distinctCats = Array.from(new Set(templates.map(t => t.categoryName)));

                const newCategoriesToCreate = distinctCats.filter(cName => !categories.find(c => c.name === cName));

                let currentCats = [...categories];

                // create missing categories
                for (const catName of newCategoriesToCreate) {
                    const res = await addServiceCategory(catName);
                    if (res.success && res.data) {
                        currentCats.push(res.data);
                    }
                }

                setCategories(currentCats);

                const dataToInsert = templates.map(t => ({
                    name: t.name,
                    category_id: currentCats.find(c => c.name === t.categoryName)?.id || null,
                    category_name: t.categoryName,
                    price: 0,
                    duration_minutes: t.sessions * 15, // Dummy average
                    service_type: 'package',
                    default_total_sessions: t.sessions,
                    default_interval_days: t.intervalDays,
                    default_package_price: t.price
                }));

                const res = await addMultipleServices(dataToInsert);

                if (res.success && res.data) {
                    // Prepend to local
                    const newServices = res.data.map((s: any) => ({
                        ...s,
                        salon_services: [],
                        service_categories: currentCats.find(c => c.id === s.category_id)
                    }));
                    setLocalServices(prev => [...newServices, ...prev]);
                    setIsTemplateModalOpen(false);
                    alert(`${templates.length} adet paket şablonu başarıyla eklendi!`);
                } else {
                    alert(res.error || "Şablonlar eklenemedi.");
                }

            } catch (err: any) {
                alert(err.message || "Bilinmeyen bir hata oluştu");
            }
        });
    };

    return (
        <div className="bg-gradient-onboarding min-h-screen flex flex-col items-center p-6 text-slate-900 relative">
            {/* Top Header matching Step 1 & 2 */}
            <div className="fixed top-0 left-0 w-full p-8 flex flex-col items-center z-50 bg-gradient-to-b from-[#f8f9fc] to-transparent">
                <div className="w-full max-w-md flex flex-col items-center gap-3">
                    <div className="flex justify-between w-full items-end">
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-lg leading-none">spa</span>
                            </div>
                            <span className="serif-heading text-lg font-bold text-primary">Zarif Güzellik</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Adım 3 / 8</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-3/6 rounded-full transition-all duration-500"></div>
                    </div>
                </div>
            </div>

            <main className="w-full max-w-6xl mt-24 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
                <header className="mb-10 text-center">
                    <h2 className="serif-heading text-4xl font-bold mb-3 tracking-tight">Hizmet Kataloğunu Oluştur</h2>
                    <p className="text-slate-500 text-lg">Salonunda sunduğun hizmetleri kategorize ederek ekle ve fiyatlandır.</p>
                </header>

                <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
                    {/* Üst Bilgi & Ekle Butonu */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 flex-wrap gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Hizmet Listesi</h3>
                            <p className="text-sm text-slate-500 mt-1">Toplam {localServices.length} hizmet eklendi.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsTemplateModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-3 bg-purple-50 text-purple-600 font-bold text-sm rounded-xl hover:bg-purple-100 transition-colors border border-purple-200"
                            >
                                <span className="material-symbols-outlined text-xl">layers</span>
                                Hazır Paket Şablonları
                            </button>
                            <button
                                onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}
                                className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                            >
                                <span className="material-symbols-outlined text-xl">add</span>
                                Yeni Hizmet Ekle
                            </button>
                        </div>
                    </div>

                    {/* İki Kolonlu Yapı: Kategoriler(Sol) ve Hizmetler(Sağ) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* SOL KOLON: KATEGORİ YÖNETİMİ */}
                        <div className="lg:col-span-3 flex flex-col gap-4">
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
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeServiceType === 'package' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700'}`}
                                >Paketler
                                    {activeServiceType !== "package" && <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>}
                                </button>
                            </div>

                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mt-2">Hizmet Kategorileri</h4>

                            <div className="space-y-1 custom-scrollbar max-h-[400px] overflow-y-auto pr-2">
                                {/* Tümü */}
                                <button
                                    onClick={() => setActiveCategoryId("all")}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeCategoryId === "all" ? 'bg-[var(--color-primary)] text-white shadow-md shadow-purple-500/20' : 'hover:bg-slate-50 text-slate-700 border border-transparent'}`}
                                >
                                    <span className="font-bold text-sm">Tümü</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeCategoryId === "all" ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {localServices.length}
                                    </span>
                                </button>

                                {/* Dinamik Kategoriler */}
                                {categories.map(cat => (
                                    <div key={cat.id} className="relative group">
                                        {editingCategoryId === cat.id ? (
                                            <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl mt-1 border border-slate-200">
                                                <input
                                                    type="text"
                                                    value={editCategoryName}
                                                    onChange={e => setEditCategoryName(e.target.value)}
                                                    className="w-full text-sm font-medium bg-transparent border-none px-2 py-1 focus:outline-none focus:ring-0"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateCategory(cat.id);
                                                        if (e.key === 'Escape') setEditingCategoryId(null);
                                                    }}
                                                />
                                                <button onClick={() => handleUpdateCategory(cat.id)} className="text-emerald-500 hover:text-emerald-600">
                                                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                </button>
                                                <button onClick={() => setEditingCategoryId(null)} className="text-slate-400 hover:text-red-500 mr-2">
                                                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setActiveCategoryId(cat.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl mt-1 transition-all ${activeCategoryId === cat.id ? 'bg-purple-50 text-[var(--color-primary)] border border-purple-100 font-black' : 'hover:bg-slate-50 text-slate-700 font-bold border border-transparent'}`}
                                            >
                                                <span className="text-sm text-left truncate pr-2">{cat.name}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] flex-shrink-0 ${activeCategoryId === cat.id ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {getServicesCountByCategory(cat.id)}
                                                </span>
                                            </button>
                                        )}

                                        {/* Action Hover */}
                                        {activeCategoryId !== cat.id && editingCategoryId !== cat.id && (
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
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
                                            className="w-full text-sm font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[var(--color-primary)]"
                                            placeholder="Kategori Adı..."
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveCategory();
                                                if (e.key === 'Escape') setIsAddingCategory(false);
                                            }}
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleSaveCategory} className="flex-1 bg-[var(--color-primary)] text-white text-[10px] font-black uppercase py-2 rounded-lg tracking-wider">Kaydet</button>
                                            <button onClick={() => setIsAddingCategory(false)} className="flex-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase py-2 rounded-lg tracking-wider">İptal</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingCategory(true)}
                                        className="w-full mt-3 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 transition-all font-bold text-sm"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>
                                        Yeni Kategori
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SAĞ KOLON: HİZMETLER LİSTESİ */}
                        <div className="lg:col-span-9 bg-slate-50 rounded-[24px] border border-slate-100 flex flex-col p-6">
                            {/* Arama Barı */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="relative w-full max-w-sm">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm placeholder:text-slate-400 outline-none transition-all focus:border-[var(--color-primary)]"
                                        placeholder="Kategori içindeki hizmetleri ara..."
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 custom-scrollbar overflow-y-auto max-h-[500px]">
                                {filteredServices.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white border border-slate-100 border-dashed rounded-2xl">
                                        <div className="p-4 bg-[var(--color-primary)]/5 rounded-full mb-4 text-[var(--color-primary)] border border-[var(--color-primary)]/10">
                                            <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900 mb-1">
                                            {localServices.length === 0 ? "Kataloğunuz Henüz Boş" : "Hizmet Bulunamadı"}
                                        </h4>
                                        <p className="text-sm text-slate-500 max-w-xs mb-6">
                                            {localServices.length === 0
                                                ? "Müşterilerinize sunduğunuz ilk işlemi ekleyerek kataloğunuzu oluşturmaya başlayın."
                                                : "Bu kategori veya aramaya uygun hizmet bulunmuyor."}
                                        </p>
                                        <button
                                            onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}
                                            className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:opacity-90 transition-all text-sm"
                                        >
                                            Hemen Hizmet Ekle
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredServices.map((service) => {
                                            const catName = service.service_categories?.name || service.category || "Genel";

                                            return (
                                                <div key={service.id} className="bg-white border border-slate-200 p-5 rounded-2xl transition-all group hover:shadow-lg hover:shadow-slate-200/50 hover:border-[var(--color-primary)]/30 flex flex-col relative w-full h-full">

                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`p-2 rounded-xl flex items-center justify-center ${getCategoryStyle(catName)}`}>
                                                            <span className="material-symbols-outlined">{service.icon || 'auto_awesome'}</span>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="flex items-center gap-1 group/price bg-slate-50 px-2 pl-3 py-1 rounded-xl group-hover:bg-slate-100 transition-colors">
                                                                <input
                                                                    type="text"
                                                                    defaultValue={service.service_type === 'package' ? service.default_package_price : service.price}
                                                                    onBlur={(e) => handleInlinePriceUpdate(service.id, service.price, e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                                    }}
                                                                    className={`w-16 bg-transparent border-none p-0 text-right text-lg font-black ${service.service_type === 'package' ? 'text-slate-500 cursor-not-allowed' : 'text-slate-900'} focus:ring-0 focus:outline-none`}
                                                                    disabled={formPending || service.service_type === 'package'}
                                                                />
                                                                <span className="text-lg font-black text-slate-900">₺</span>
                                                                {service.service_type !== 'package' && <span className="material-symbols-outlined text-[10px] text-slate-400 opacity-0 group-hover/price:opacity-100 transition-opacity ml-1 bg-white p-1 rounded-full shadow-sm">edit</span>}
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

                                                    <div className="flex justify-between items-start pr-2">
                                                        <div className="flex-1 pr-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-bold text-[15px] text-slate-800 leading-tight">{service.name}</h4>
                                                                {service.service_type === 'package' && (
                                                                    <span className="px-1.5 py-0.5 bg-purple-100 text-[var(--color-primary)] text-[9px] font-bold rounded uppercase tracking-wider">PAKET</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{catName}</p>
                                                        </div>

                                                        {/* Action Menü */}
                                                        <div className="relative z-10 shrink-0" ref={activeMenuId === service.id ? menuRef : null}>
                                                            <button
                                                                onClick={() => setActiveMenuId(activeMenuId === service.id ? null : service.id)}
                                                                disabled={formPending}
                                                                className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-full transition-colors bg-white border border-slate-100 shadow-sm disabled:opacity-50"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                                            </button>

                                                            {/* Dropdown Menu */}
                                                            {activeMenuId === service.id && (
                                                                <div className="absolute right-0 top-10 w-36 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 pt-1 z-50">
                                                                    <div className="p-1.5 space-y-0.5">
                                                                        <button
                                                                            onClick={() => handleEditClick(service)}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] rounded-xl transition-colors font-bold"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                                            Düzenle
                                                                        </button>
                                                                        <div className="h-px bg-slate-100 mx-2"></div>
                                                                        <button
                                                                            onClick={() => handleDeleteService(service.id)}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                            Sil
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {service.description && (
                                                        <p className="text-xs font-medium text-slate-500 line-clamp-2 mt-auto pt-3 border-t border-slate-50 leading-relaxed group-hover:border-slate-100">{service.description}</p>
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

                <div className="mt-12 flex items-center justify-between px-2">
                    <button onClick={onBack} disabled={isPending || formPending} className="px-8 py-3 text-slate-400 font-black tracking-widest uppercase hover:text-slate-900 transition-colors text-xs disabled:opacity-50">
                        GERİ DÖN
                    </button>
                    <button
                        onClick={() => onNext(4)}
                        disabled={isPending || formPending || localServices.length === 0}
                        className="group relative px-10 py-4 bg-slate-900 text-white rounded-[20px] font-black shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                        {isPending ? "KAYDEDİLİYOR..." : "KAYDET VE DEVAM ET"}
                        <span className={`material-symbols-outlined text-lg transition-transform ${isPending ? 'animate-spin' : 'group-hover:translate-x-1'}`}>
                            {isPending ? 'progress_activity' : 'arrow_forward'}
                        </span>
                    </button>
                </div>
            </main>

            <footer className="fixed bottom-8 text-center text-slate-400 text-xs font-bold tracking-widest uppercase z-0 pointer-events-none">
                Zarif Güzellik SaaS • Dijital Dönüşüm Partneriniz
            </footer>

            <HizmetEkleModal
                isOpen={isServiceModalOpen}
                initialData={editingService}
                onClose={() => setIsServiceModalOpen(false)}
                onAdd={handleAddService}
                categories={categories}
                activeCategoryId={activeCategoryId}
                salons={[]}
            />

            <PackageTemplatesModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onSave={handleSaveTemplates}
            />
        </div>
    );
}
