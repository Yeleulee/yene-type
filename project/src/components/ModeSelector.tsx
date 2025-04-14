import React from 'react';
import { Layout, Book, Trophy } from 'lucide-react';
import { useTypingStore } from '../store/typingStore';
import { cn } from '../lib/utils';

type Mode = 'video' | 'practice' | 'challenge';

interface ModeOption {
  id: Mode;
  icon: typeof Layout;
  label: string;
}

const modes: ModeOption[] = [
  { id: 'video', icon: Layout, label: 'Video Mode' },
  { id: 'practice', icon: Book, label: 'Practice Mode' },
  { id: 'challenge', icon: Trophy, label: 'Challenge Mode' }
];

export function ModeSelector() {
  const { mode, setMode } = useTypingStore();

  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg" role="radiogroup" aria-label="Select typing mode">
      {modes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            mode === id
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
          role="radio"
          aria-checked={mode === id}
          aria-label={label}
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}