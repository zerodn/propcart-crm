'use client';

import { createContext, useContext, useState, useCallback } from 'react';

export type BackgroundType = 'gradient' | 'image' | 'solid';

export interface BackgroundConfig {
  type: BackgroundType;
  gradientKey: string;
  imageUrl: string;
  solidColor: string;
}

interface BackgroundContextType {
  config: BackgroundConfig;
  setConfig: (config: BackgroundConfig) => void;
}

export const GRADIENT_PRESETS: Record<string, { label_vi: string; label_en: string; css: string }> =
  {
    default: {
      label_vi: 'Đại dương đêm',
      label_en: 'Night Ocean',
      css: 'linear-gradient(135deg, #020c1a 0%, #071d3d 25%, #0b2448 50%, #0f2a52 75%, #0b1f3a 100%)',
    },
    midnight: {
      label_vi: 'Nửa đêm',
      label_en: 'Midnight',
      css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    },
    forest: {
      label_vi: 'Rừng thông',
      label_en: 'Pine Forest',
      css: 'linear-gradient(135deg, #0a1a0a 0%, #1a3a1a 50%, #0d2d0d 100%)',
    },
    ocean: {
      label_vi: 'Đại dương xanh',
      label_en: 'Blue Ocean',
      css: 'linear-gradient(135deg, #0a1628 0%, #102a44 50%, #0a1e36 100%)',
    },
    slate: {
      label_vi: 'Đá phiến',
      label_en: 'Slate',
      css: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d3f 50%, #1a1a2e 100%)',
    },
    warm: {
      label_vi: 'Hoàng hôn',
      label_en: 'Sunset',
      css: 'linear-gradient(135deg, #1a0a0a 0%, #2d1a1a 25%, #3d2a1a 50%, #2d1a0a 100%)',
    },
  };

const DEFAULT_CONFIG: BackgroundConfig = {
  type: 'gradient',
  gradientKey: 'default',
  imageUrl: '',
  solidColor: '#0b1f3a',
};

const STORAGE_KEY = 'pc_background_config';

function getInitialConfig(): BackgroundConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.type === 'string') {
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<BackgroundConfig>(getInitialConfig);

  const setConfig = useCallback((newConfig: BackgroundConfig) => {
    setConfigState(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch {
      // quota exceeded
    }
  }, []);

  return (
    <BackgroundContext.Provider value={{ config, setConfig }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground(): BackgroundContextType {
  const context = useContext(BackgroundContext);
  if (!context) throw new Error('useBackground must be used within BackgroundProvider');
  return context;
}

/** Returns the CSS background style for the current config */
export function getBackgroundStyle(config: BackgroundConfig): React.CSSProperties {
  if (config.type === 'solid') {
    return { background: config.solidColor || '#0b1f3a' };
  }
  if (config.type === 'image' && config.imageUrl) {
    return {
      backgroundColor: '#0b1f3a',
      backgroundImage: `url("${config.imageUrl.replace(/"/g, '%22')}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  const preset = GRADIENT_PRESETS[config.gradientKey] ?? GRADIENT_PRESETS.default;
  return { background: preset.css };
}
