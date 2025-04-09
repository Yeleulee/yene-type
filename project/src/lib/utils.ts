import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateWPM(
  typedCharacters: number,
  timeElapsedInSeconds: number,
  errors: number
): number {
  const minutes = timeElapsedInSeconds / 60;
  const words = typedCharacters / 5; // Standard: 5 characters = 1 word
  const grossWPM = words / minutes;
  const netWPM = grossWPM - errors / minutes;
  return Math.max(0, Math.round(netWPM));
}

export function calculateAccuracy(
  correctCharacters: number,
  totalCharacters: number
): number {
  if (totalCharacters === 0) return 100;
  return Math.round((correctCharacters / totalCharacters) * 100);
}