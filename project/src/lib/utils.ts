import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateWPM(
  typedCharacters: number,
  timeElapsedInMinutes: number,
  errors: number = 0
): number {
  if (timeElapsedInMinutes <= 0) return 0;
  
  const words = typedCharacters / 5; // Standard: 5 characters = 1 word
  const grossWPM = words / timeElapsedInMinutes;
  
  // Apply error penalty, but don't go below zero
  const netWPM = Math.max(0, grossWPM - (errors / timeElapsedInMinutes));
  
  return Math.round(netWPM);
}

export function calculateAccuracy(
  errors: number,
  totalCharacters: number
): number {
  if (totalCharacters === 0) return 100;
  
  const correctCharacters = Math.max(0, totalCharacters - errors);
  const accuracy = (correctCharacters / totalCharacters) * 100;
  
  // Ensure accuracy is between 0 and 100
  return Math.min(100, Math.max(0, Math.round(accuracy)));
}

export function calculateRawWPM(
  typedCharacters: number,
  timeElapsedInMinutes: number
): number {
  if (timeElapsedInMinutes <= 0) return 0;
  
  const words = typedCharacters / 5;
  return Math.round(words / timeElapsedInMinutes);
}

export function calculateErrorRate(
  errors: number,
  totalCharacters: number
): number {
  if (totalCharacters === 0) return 0;
  return Math.round((errors / totalCharacters) * 100);
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getGradeFromAccuracy(accuracy: number): string {
  if (accuracy >= 98) return 'S';
  if (accuracy >= 95) return 'A+';
  if (accuracy >= 90) return 'A';
  if (accuracy >= 85) return 'B+';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 75) return 'C+';
  if (accuracy >= 70) return 'C';
  if (accuracy >= 65) return 'D+';
  if (accuracy >= 60) return 'D';
  return 'F';
}

// Helper to smooth numeric values over time (avoid jumpy stats)
export function smoothValue(currentValue: number, newValue: number, weight: number = 0.3): number {
  return (currentValue * (1 - weight)) + (newValue * weight);
}