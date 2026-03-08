'use client';

import { useEffect, useState } from 'react';

interface LocationItem {
  code: number;
  name: string;
}

interface ProvinceV2Detail {
  code: number;
  name: string;
  wards: Array<{ code: number; name: string }>;
}

export interface LocationFormData {
  provinceCode?: string;
  provinceName?: string;
  wardCode?: string;
  wardName?: string;
  gender?: string;
  dateOfBirth?: string;
}

interface PersonalInfoFormProps {
  data: LocationFormData;
  onChange: (data: LocationFormData) => void;
  isDisabled?: boolean;
  showGenderAndDOB?: boolean;
  hideHeader?: boolean;
  genderDobInline?: boolean;
}

export function PersonalInfoForm({
  data,
  onChange,
  isDisabled = false,
  showGenderAndDOB = false,
  hideHeader = false,
  genderDobInline = false,
}: PersonalInfoFormProps) {
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [wardLoading, setWardLoading] = useState(false);

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await fetch('https://provinces.open-api.vn/api/v2/?depth=1');
        const provinceList = (await response.json()) as LocationItem[];
        setProvinces(provinceList || []);
        console.log('[PersonalInfoForm] Loaded provinces:', provinceList.length);
      } catch (err) {
        console.error('Failed to load provinces:', err);
      } finally {
        setLocationLoading(false);
      }
    };
    loadProvinces();
  }, []);

  useEffect(() => {
    if (!data.provinceCode) {
      setWards([]);
      return;
    }
    const loadWards = async () => {
      setWardLoading(true);
      try {
        const response = await fetch(`https://provinces.open-api.vn/api/v2/p/${data.provinceCode}?depth=2`);
        const payload = (await response.json()) as ProvinceV2Detail;
        const wardList = (payload.wards || []).map((item) => ({ code: item.code, name: item.name }));
        setWards(wardList);
        console.log('[PersonalInfoForm] Loaded wards for province', data.provinceCode, ':', wardList.length);
      } catch (err) {
        console.error('Failed to load wards:', err);
      } finally {
        setWardLoading(false);
      }
    };
    loadWards();
  }, [data.provinceCode]);

  const handleProvinceChange = (code: string) => {
    const province = provinces.find((p) => String(p.code) === code);
    console.log('[PersonalInfoForm] Province changed:', { code, name: province?.name });
    onChange({
      ...data,
      provinceCode: code,
      provinceName: province?.name || '',
      wardCode: '',
      wardName: '',
    });
  };

  const handleWardChange = (code: string) => {
    const ward = wards.find((w) => String(w.code) === code);
    console.log('[PersonalInfoForm] Ward changed:', { code, name: ward?.name });
    onChange({
      ...data,
      wardCode: code,
      wardName: ward?.name || '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tỉnh/Thành phố</label>
          <select
            value={data.provinceCode || ''}
            onChange={(e) => handleProvinceChange(e.target.value)}
            disabled={locationLoading || isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
          >
            <option value="">Chọn tỉnh/thành</option>
            {provinces.map((item) => (
              <option key={item.code} value={String(item.code)}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phường/Xã</label>
          <select
            value={data.wardCode || ''}
            onChange={(e) => handleWardChange(e.target.value)}
            disabled={!data.provinceCode || locationLoading || wardLoading || isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
          >
            <option value="">Chọn phường/xã</option>
            {wards.map((item) => (
              <option key={item.code} value={String(item.code)}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showGenderAndDOB && (
        <div>
          {!hideHeader && <div className="border-t border-gray-200 mb-3 pt-3" />}
          {!hideHeader && <h4 className="text-sm font-semibold text-gray-900 mb-3">Thông tin cá nhân</h4>}
          <div className={genderDobInline ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới tính</label>
              <select
                value={data.gender || ''}
                onChange={(e) => onChange({ ...data, gender: e.target.value })}
                disabled={isDisabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
              >
                <option value="">Chọn giới tính</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày sinh</label>
              <input
                type="date"
                value={data.dateOfBirth || ''}
                onChange={(e) => onChange({ ...data, dateOfBirth: e.target.value })}
                disabled={isDisabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
