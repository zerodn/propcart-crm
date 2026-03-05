'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailCheck, Save } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/providers/auth-provider';

interface LocationItem {
  code: number;
  name: string;
}

interface ProvinceV2Item {
  code: number;
  name: string;
}

interface ProvinceV2Detail {
  code: number;
  name: string;
  wards: Array<{
    code: number;
    name: string;
  }>;
}

interface FormState {
  fullName: string;
  email: string;
  fullAddress: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  fullAddress: '',
  provinceCode: '',
  provinceName: '',
  wardCode: '',
  wardName: '',
};

export default function ProfilePage() {
  const { refreshProfile } = useAuth();
  const { profile, isLoading, isSaving, updateProfile, sendEmailVerification } = useProfile();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [wardLoading, setWardLoading] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);

  const loadProvinceWards = async (provinceCode: string) => {
    const response = await fetch(
      `https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`,
    );
    const payload = (await response.json()) as ProvinceV2Detail;
    return (payload.wards || []).map((item) => ({ code: item.code, name: item.name }));
  };

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      fullAddress: profile.addressLine ?? '',
      provinceCode: profile.provinceCode ?? '',
      provinceName: profile.provinceName ?? '',
      wardCode: profile.wardCode ?? '',
      wardName: profile.wardName ?? '',
    });
  }, [profile]);

  useEffect(() => {
    const loadLocations = async () => {
      setLocationLoading(true);
      try {
        const response = await fetch('https://provinces.open-api.vn/api/v2/');
        const payload = (await response.json()) as ProvinceV2Item[];
        setProvinces(
          (payload || []).map((item) => ({
            code: item.code,
            name: item.name,
          })),
        );
      } finally {
        setLocationLoading(false);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    if (!form.provinceCode) {
      setWards([]);
      return;
    }

    const run = async () => {
      setWardLoading(true);
      try {
        const wardItems = await loadProvinceWards(form.provinceCode);
        setWards(wardItems);
      } catch {
        setWards([]);
      } finally {
        setWardLoading(false);
      }
    };

    run();
  }, [form.provinceCode]);

  const isEmailVerified = Boolean(profile?.emailVerifiedAt);
  const canVerifyEmail = Boolean(form.email.trim()) && !isEmailVerified;

  const handleProvinceChange = (code: string) => {
    const province = provinces.find((item) => String(item.code) === code);
    setForm((prev) => ({
      ...prev,
      provinceCode: code,
      provinceName: province?.name ?? '',
      wardCode: '',
      wardName: '',
    }));
  };

  const handleWardChange = (code: string) => {
    const ward = wards.find((item) => String(item.code) === code);
    setForm((prev) => ({
      ...prev,
      wardCode: code,
      wardName: ward?.name ?? '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateProfile({
      fullName: form.fullName,
      email: form.email,
      addressLine: form.fullAddress,
      provinceCode: form.provinceCode,
      provinceName: form.provinceName,
      wardCode: form.wardCode,
      wardName: form.wardName,
    });

    await refreshProfile();
  };

  const handleSendVerify = async () => {
    if (!canVerifyEmail) return;
    setSendingVerify(true);
    try {
      await sendEmailVerification();
    } finally {
      setSendingVerify(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Dang tai profile...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ho so ca nhan</h1>
        <p className="text-sm text-gray-500 mt-1">Cap nhat thong tin cua ban va xac thuc email</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">So dien thoai</label>
          <input
            value={profile?.phone ?? ''}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ten</label>
          <input
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="Nhap ten cua ban"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Nhap email"
              className="w-full px-3 py-2 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {isEmailVerified ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="email-verified" />
              ) : (
                <button
                  type="button"
                  aria-label="send-email-verification"
                  title="Gui xac thuc email"
                  disabled={!canVerifyEmail || sendingVerify}
                  onClick={handleSendVerify}
                  className="p-1 rounded hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sendingVerify ? (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  ) : (
                    <MailCheck className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dia chi day du</label>
          <input
            value={form.fullAddress}
            onChange={(e) => setForm((prev) => ({ ...prev, fullAddress: e.target.value }))}
            placeholder="VD: 123 Nguyen Van Linh, Phuong Ngu Hanh Son, Thanh pho Da Nang"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tinh/Thanh pho</label>
            <select
              value={form.provinceCode}
              onChange={(e) => handleProvinceChange(e.target.value)}
              disabled={locationLoading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Chon tinh/thanh</option>
              {provinces.map((item) => (
                <option key={item.code} value={String(item.code)}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phuong/Xa</label>
            <select
              value={form.wardCode}
              onChange={(e) => handleWardChange(e.target.value)}
              disabled={!form.provinceCode || locationLoading || wardLoading}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Chon phuong/xa</option>
              {wards.map((item) => (
                <option key={item.code} value={String(item.code)}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dia chi</label>
          <input
            value={form.wardName}
            onChange={(e) => setForm((prev) => ({ ...prev, wardName: e.target.value, wardCode: '' }))}
            placeholder="Neu can, nhap tay ten phuong/xa"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Luu thong tin
          </button>
        </div>
      </form>
    </div>
  );
}
