import React from 'react';
import { Globe } from 'lucide-react';
import { useTypingStore } from '../store/typingStore';

type Language = 'en' | 'es' | 'fr' | 'de';

const languages: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch'
};

export function LanguageSelector() {
  const { language, setLanguage } = useTypingStore();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as Language;
    setLanguage(newLanguage);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-5 h-5 text-gray-500" aria-hidden="true" />
      <label htmlFor="language-select" className="sr-only">Select language</label>
      <select
        id="language-select"
        value={language}
        onChange={handleLanguageChange}
        className="bg-transparent border-none text-sm text-gray-700 focus:outline-none cursor-pointer"
        aria-label="Select language"
      >
        {Object.entries(languages).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}