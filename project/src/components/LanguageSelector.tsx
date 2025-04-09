import React from 'react';
import { Globe } from 'lucide-react';
import { useTypingStore } from '../store/typingStore';

const languages = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch'
};

export function LanguageSelector() {
  const { language, setLanguage } = useTypingStore();

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-5 h-5 text-gray-500" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as any)}
        className="bg-transparent border-none text-sm text-gray-700 focus:outline-none cursor-pointer"
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