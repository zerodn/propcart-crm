'use client';

import { useState, useRef } from 'react';
import { Check, ImageIcon, Palette, Link2, Pipette } from 'lucide-react';
import { usePageSetup } from '@/hooks/use-page-setup';
import { useI18n } from '@/providers/i18n-provider';
import {
  useBackground,
  GRADIENT_PRESETS,
  type BackgroundConfig,
} from '@/providers/background-provider';
import { cn } from '@/lib/utils';

// Predefined solid color swatches
const SOLID_PRESETS = [
  { color: '#0b1f3a', label: 'Navy' },
  { color: '#0f3460', label: 'Royal Blue' },
  { color: '#1a1a2e', label: 'Deep Space' },
  { color: '#16213e', label: 'Dark Navy' },
  { color: '#1b262c', label: 'Dark Teal' },
  { color: '#0d4f3c', label: 'Forest' },
  { color: '#1e3a1e', label: 'Pine' },
  { color: '#2c1654', label: 'Deep Purple' },
  { color: '#3d1a5c', label: 'Violet' },
  { color: '#4a1942', label: 'Plum' },
  { color: '#3d1a1a', label: 'Dark Wine' },
  { color: '#1a0a0a', label: 'Charcoal Red' },
  { color: '#1e1e1e', label: 'Near Black' },
  { color: '#2c3e50', label: 'Wet Asphalt' },
  { color: '#34495e', label: 'Slate' },
  { color: '#1a2a1a', label: 'Dark Olive' },
];

export default function AppearanceSettingsPage() {
  const { t, locale } = useI18n();
  const { config, setConfig } = useBackground();
  const [imageUrl, setImageUrl] = useState(config.imageUrl);
  const [imageError, setImageError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [customColor, setCustomColor] = useState(config.solidColor || '#0b1f3a');
  const colorInputRef = useRef<HTMLInputElement>(null);

  usePageSetup({
    title: t('settings.appearance.title'),
    subtitle: t('settings.appearance.subtitle'),
  });

  const handleSelectGradient = (key: string) => {
    setConfig({ ...config, type: 'gradient', gradientKey: key });
  };

  const handleSelectSolidColor = (color: string) => {
    setCustomColor(color);
    setConfig({ ...config, type: 'solid', solidColor: color });
  };

  const handleApplyImage = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) {
      setImageError(t('settings.appearance.imageUrlRequired'));
      return;
    }
    // Basic URL format validation
    try {
      new URL(trimmed);
    } catch {
      setImageError(t('settings.appearance.imageUrlInvalid'));
      return;
    }
    setImageError('');
    setIsVerifying(true);

    // Preload the image to verify it actually loads (catches CORS, 403, hot-link blocks, etc.)
    const img = new Image();
    img.onload = () => {
      setIsVerifying(false);
      setConfig({ ...config, type: 'image', imageUrl: trimmed });
    };
    img.onerror = () => {
      setIsVerifying(false);
      setImageError(t('settings.appearance.imageLoadFailed'));
    };
    img.src = trimmed;
  };

  const handleResetToGradient = () => {
    setConfig({ ...config, type: 'gradient', gradientKey: config.gradientKey || 'default', imageUrl: '' });
    setImageUrl('');
    setImageError('');
  };

  const isCurrentGradient = (key: string) =>
    config.type === 'gradient' && config.gradientKey === key;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Gradient Presets */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-[#CFAF6E]" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('settings.appearance.gradientPresets')}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(GRADIENT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handleSelectGradient(key)}
              className={cn(
                'relative rounded-xl overflow-hidden h-24 transition-all duration-200 group',
                isCurrentGradient(key)
                  ? 'ring-2 ring-[#CFAF6E] ring-offset-2 ring-offset-white dark:ring-offset-[#0b1f3a]'
                  : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-white/20',
              )}
            >
              <div className="absolute inset-0" style={{ background: preset.css }} />
              {/* Label overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs font-medium text-white">
                  {locale === 'vi' ? preset.label_vi : preset.label_en}
                </p>
              </div>
              {/* Check mark */}
              {isCurrentGradient(key) && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-[#CFAF6E] rounded-full flex items-center justify-center shadow-lg">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Solid Color */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Pipette className="h-5 w-5 text-[#CFAF6E]" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('settings.appearance.solidColor')}
          </h2>
        </div>
        <div className="glass-content-card rounded-xl p-5 space-y-4">
          {/* Preset swatches */}
          <div className="grid grid-cols-8 gap-2">
            {SOLID_PRESETS.map(({ color, label }) => {
              const isActive = config.type === 'solid' && config.solidColor === color;
              return (
                <button
                  key={color}
                  title={label}
                  onClick={() => handleSelectSolidColor(color)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'relative w-full aspect-square rounded-lg transition-all duration-150',
                    isActive
                      ? 'ring-2 ring-[#CFAF6E] ring-offset-2 ring-offset-white dark:ring-offset-[#0b1f3a] scale-110'
                      : 'hover:scale-110 hover:ring-1 hover:ring-white/40',
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom color picker */}
          <div className="flex items-center gap-3 pt-1">
            <label className="text-sm text-gray-600 dark:text-white/70 flex-shrink-0">
              {t('settings.appearance.customColor')}
            </label>
            <div className="relative flex items-center gap-2">
              {/* Hidden native color input */}
              <input
                ref={colorInputRef}
                type="color"
                value={customColor}
                onChange={(e) => handleSelectSolidColor(e.target.value)}
                className="sr-only"
                aria-label={t('settings.appearance.customColor')}
              />
              {/* Visual trigger button */}
              <button
                onClick={() => colorInputRef.current?.click()}
                style={{ backgroundColor: customColor }}
                className={cn(
                  'w-9 h-9 rounded-lg border-2 transition-all',
                  config.type === 'solid' && config.solidColor === customColor &&
                  !SOLID_PRESETS.some(p => p.color === customColor)
                    ? 'border-[#CFAF6E] scale-110'
                    : 'border-gray-300 dark:border-white/20 hover:border-[#CFAF6E]',
                )}
                title={customColor}
              />
              <span className="text-sm font-mono text-gray-500 dark:text-white/50 uppercase">
                {customColor}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-white/30">
            {t('settings.appearance.solidColorHint')}
          </p>
        </div>
      </section>

      {/* Custom Image URL */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-5 w-5 text-[#CFAF6E]" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('settings.appearance.customImage')}
          </h2>
        </div>
        <div className="glass-content-card rounded-xl p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-white/80 mb-1.5 block">
              {t('settings.appearance.imageUrl')}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageError('');
                  }}
                  placeholder="https://example.com/background.jpg"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#CFAF6E]/50 focus:border-[#CFAF6E]"
                />
              </div>
              <button
                onClick={handleApplyImage}
                disabled={isVerifying}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#CFAF6E] text-white hover:bg-[#B89655] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isVerifying ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('common.loading')}
                  </>
                ) : (
                  t('settings.appearance.apply')
                )}
              </button>
            </div>
            {imageError && (
              <p className="text-xs text-red-500 mt-1">{imageError}</p>
            )}
          </div>

          {/* Current image preview */}
          {config.type === 'image' && config.imageUrl && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-white/50">
                {t('settings.appearance.currentBackground')}
              </p>
              <div className="relative rounded-lg overflow-hidden h-32 border border-gray-200 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.imageUrl}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={handleResetToGradient}
                    className="px-2 py-1 text-xs font-medium rounded-md bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
                  >
                    {t('settings.appearance.removeImage')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-white/30">
            {t('settings.appearance.imageHint')}
          </p>
        </div>
      </section>
    </div>
  );
}
