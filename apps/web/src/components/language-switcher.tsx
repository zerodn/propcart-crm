'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/providers/i18n-provider';

interface LanguageSwitcherProps {
  /** Open the dropdown upward (use when the switcher sits near the bottom of the screen) */
  dropUp?: boolean;
  /** Dark variant — transparent glass style for use on dark backgrounds */
  dark?: boolean;
}

export function LanguageSwitcher({ dropUp = false, dark = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ] as const;

  const currentLang = languages.find((lang) => lang.code === locale);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    setLocale(code as 'vi' | 'en');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          dark
            ? 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/18 backdrop-blur-sm transition-colors text-sm text-white'
            : 'flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm'
        }
        aria-label="Toggle language menu"
        aria-expanded={isOpen}
      >
        <span className="text-lg">{currentLang?.flag}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${dark ? 'text-white/60' : 'text-gray-500'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-1 overflow-hidden ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${
                locale === lang.code
                  ? 'bg-[#F5F7FA] text-[#0B1F3A]'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.label}</span>
              {locale === lang.code && (
                <svg className="w-4 h-4 ml-auto text-[#CFAF6E]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
