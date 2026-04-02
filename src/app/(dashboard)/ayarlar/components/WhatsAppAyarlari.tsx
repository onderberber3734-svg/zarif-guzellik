"use client";

import { useState, useEffect } from "react";
import {
  getWhatsAppSettings,
  saveWhatsAppSettings,
  disconnectWhatsApp,
} from "@/app/actions/whatsapp";

export default function WhatsAppAyarlari() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    phone_number_id: "",
    access_token: "",
    phone_number: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const res = await getWhatsAppSettings();
    if (res.success && res.data) {
      setSettings(res.data);
      setForm({
        phone_number_id: res.data.phone_number_id || "",
        access_token: "",
        phone_number: res.data.phone_number || "",
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);

    if (!form.phone_number_id || !form.access_token) {
      setError("Phone Number ID ve Access Token zorunludur.");
      setSaving(false);
      return;
    }

    const res = await saveWhatsAppSettings(form);
    setSaving(false);

    if (res.success) {
      setSuccess(`Bağlantı başarılı! ${res.data?.verified_name || ""} (${res.data?.phone_number || ""})`);
      await loadSettings();
    } else {
      setError(res.error || "Bağlantı kurulamadı.");
    }
  }

  async function handleDisconnect() {
    if (!confirm("WhatsApp bağlantısını kesmek istediğinize emin misiniz?")) return;
    const res = await disconnectWhatsApp();
    if (res.success) {
      setSuccess("Bağlantı kesildi.");
      await loadSettings();
    }
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm font-medium">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  const isConnected = settings?.status === "active";
  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/whatsapp/webhook`
    : "/api/whatsapp/webhook";

  return (
    <div className="p-8 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-200">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">WhatsApp Business</h3>
            <p className="text-sm text-slate-500">
              Meta Cloud API ile WhatsApp mesaj bağlantısı
            </p>
          </div>
        </div>

        {isConnected && (
          <span className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-bold border border-green-200">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            Bağlı
          </span>
        )}
      </div>

      {/* Başarı/Hata Mesajları */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-red-500">error</span>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-medium">
          <span className="material-symbols-outlined text-green-500">check_circle</span>
          {success}
        </div>
      )}

      {/* Bağlantı Formu */}
      <div className="bg-slate-50 rounded-2xl p-6 space-y-5 border border-slate-100">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-slate-400">key</span>
          API Kimlik Bilgileri
        </h4>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
            Phone Number ID
          </label>
          <input
            type="text"
            value={form.phone_number_id}
            onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
            placeholder="Örn: 123456789012345"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Meta Developer Console → WhatsApp → API Setup → Phone Number ID
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
            Permanent Access Token
          </label>
          <input
            type="password"
            value={form.access_token}
            onChange={(e) => setForm({ ...form, access_token: e.target.value })}
            placeholder={settings?.has_token ? "••••••••••••••••" : "Meta Graph API Token"}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Meta Developer Console → System Users → Generate Token
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
            İşletme Telefon Numarası
          </label>
          <input
            type="text"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            placeholder="+90 5XX XXX XX XX"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-200 hover:shadow-green-300"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Bağlanıyor...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">link</span>
                {isConnected ? "Güncelle" : "Bağlan"}
              </>
            )}
          </button>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-50 transition-all"
            >
              <span className="material-symbols-outlined text-lg">link_off</span>
              Bağlantıyı Kes
            </button>
          )}
        </div>
      </div>

      {/* Webhook URL Bilgisi */}
      {isConnected && (
        <div className="bg-blue-50/50 rounded-2xl p-6 space-y-3 border border-blue-100">
          <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-blue-500">webhook</span>
            Webhook Yapılandırması
          </h4>
          <p className="text-xs text-blue-600">
            Meta Developer Console → WhatsApp → Configuration → Webhook URL alanına aşağıdaki adresi girin:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm text-slate-700 font-mono">
              {webhookUrl}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                setSuccess("Webhook URL kopyalandı!");
                setTimeout(() => setSuccess(""), 2000);
              }}
              className="p-3 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
              title="Kopyala"
            >
              <span className="material-symbols-outlined text-blue-600 text-lg">content_copy</span>
            </button>
          </div>
          <p className="text-xs text-blue-500">
            Subscribe to: <strong>messages</strong> • Verify Token: Meta panelinde belirttiğiniz token
          </p>
        </div>
      )}

      {/* Durum Bilgisi */}
      {isConnected && settings?.connected_at && (
        <div className="text-xs text-slate-400 text-right">
          Bağlantı tarihi:{" "}
          {new Date(settings.connected_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}
