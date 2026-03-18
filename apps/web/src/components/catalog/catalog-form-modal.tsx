'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../lib/api-client';
import { useAuth } from '../../providers/auth-provider';
import { useI18n } from '../../providers/i18n-provider';
import { BaseDialog } from '../common/base-dialog';

interface CatalogValue {
  value: string;
  label: string;
  color?: string;
}

interface Catalog {
  id: string;
  type: string;
  code: string;
  name: string;
  values?: CatalogValue[];
}

interface Props {
  catalog?: Catalog | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CatalogFormModal({ catalog, onClose, onSuccess }: Props) {
  const { workspace } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'CUSTOM',
    code: '',
    name: '',
  });

  useEffect(() => {
    if (catalog) {
      setFormData({
        type: catalog.type || 'CUSTOM',
        code: catalog.code || '',
        name: catalog.name || '',
      });
    }
  }, [catalog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;

    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error(t('catalogs.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      if (catalog?.id) {
        // Update existing
        await apiClient.patch(`/workspaces/${workspace.id}/catalogs/${catalog.id}`, formData);
        toast.success(t('catalogs.message.updateSuccess'));
      } else {
        // Create new
        await apiClient.post(`/workspaces/${workspace.id}/catalogs`, formData);
        toast.success(t('catalogs.message.addSuccess'));
      }
      onSuccess();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      console.error('Form submission error:', err);
      toast.error(apiError.response?.data?.message || t('catalogs.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseDialog
      isOpen={true}
      onClose={onClose}
      title={catalog ? t('catalogs.edit') : t('catalogs.modal.addTitle')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="catalog-modal-form"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('catalogs.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <form id="catalog-modal-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('catalogs.form.typeLabel')}</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="CUSTOM">{t('catalogs.types.CUSTOM')}</option>
            <option value="ROLE">{t('catalogs.types.ROLE')}</option>
            <option value="DEPARTMENT">{t('catalogs.types.DEPARTMENT')}</option>
            <option value="PROPERTY_TYPE">{t('catalogs.types.PROPERTY_TYPE')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('catalogs.form.codeLabel')} *</label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder={t('catalogs.codePlaceholder')}
            disabled={!!catalog}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('catalogs.form.nameLabel')} *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('catalogs.namePlaceholder2')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>
    </BaseDialog>
  );
}
