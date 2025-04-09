import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LyricLine } from '../lib/lyrics';

interface TypingState {
  text: string;
  typedText: string;
  wpm: number;
  accuracy: number;
  errors: number;
  isPlaying: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'en' | 'es' | 'fr' | 'de';
  mode: 'video' | 'practice' | 'challenge';
  lyrics: LyricLine[];
  currentLyric: LyricLine | null;
  lastCompletedLineIndex: number;
  practiceTexts: Record<string, string[]>;
  highScores: Array<{
    date: string;
    wpm: number;
    accuracy: number;
    mode: string;
    songTitle?: string;
  }>;
  setText: (text: string) => void;
  setTypedText: (text: string) => void;
  setWPM: (wpm: number) => void;
  setAccuracy: (accuracy: number) => void;
  setErrors: (errors: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  setLanguage: (language: 'en' | 'es' | 'fr' | 'de') => void;
  setMode: (mode: 'video' | 'practice' | 'challenge') => void;
  setLyrics: (lyrics: LyricLine[]) => void;
  setCurrentLyric: (lyric: LyricLine | null) => void;
  completeCurrentLine: () => void;
  addHighScore: (score: { wpm: number; accuracy: number; mode: string; songTitle?: string }) => void;
  reset: () => void;
  changeSong: (newLyrics: LyricLine[], newText: string) => void;
}

export const useTypingStore = create<TypingState>()(
  persist(
    (set, get) => ({
      text: '',
      typedText: '',
      wpm: 0,
      accuracy: 100,
      errors: 0,
      isPlaying: false,
      difficulty: 'medium',
      language: 'en',
      mode: 'video',
      lyrics: [],
      currentLyric: null,
      lastCompletedLineIndex: -1,
      practiceTexts: {
        en: [
          'The quick brown fox jumps over the lazy dog.',
          'Pack my box with five dozen liquor jugs.',
          'How vexingly quick daft zebras jump!'
        ],
        es: [
          'El veloz murcielago hindu comia feliz cardillo y kiwi.',
          'La ciguena tocaba el saxofon detras del palenque de paja.',
          'Que extrano ver zorro equis jugar bajo mi whisky!'
        ],
        fr: [
          'Portez ce vieux whisky au juge blond qui fume.',
          'Le coeur decu mais l\'ame plutot naive.',
          'Voix ambigue d\'un coeur qui au zephyr prefere les jattes de kiwis.'
        ],
        de: [
          'Victor jagt zwolf Boxkampfer quer uber den grossen Sylter Deich.',
          'Falsches Uben von Xylophonmusik qualt jeden grosseren Zwerg.',
          'Zwolf Boxkampfer jagen Viktor quer uber den grossen Sylter Deich.'
        ]
      },
      highScores: [],
      setText: (text) => set({ text }),
      setTypedText: (typedText) => set({ typedText }),
      setWPM: (wpm) => set({ wpm }),
      setAccuracy: (accuracy) => set({ accuracy }),
      setErrors: (errors) => set({ errors }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setDifficulty: (difficulty) => set({ difficulty }),
      setLanguage: (language) => set({ language }),
      setMode: (mode) => set({ mode }),
      setLyrics: (lyrics) => set({ lyrics }),
      setCurrentLyric: (currentLyric) => set({ currentLyric }),
      completeCurrentLine: () => {
        const state = get();
        if (state.currentLyric) {
          const currentIndex = state.lyrics.findIndex(
            (l) => l.text === state.currentLyric?.text
          );
          if (currentIndex > state.lastCompletedLineIndex) {
            set({ lastCompletedLineIndex: currentIndex });
          }
        }
      },
      addHighScore: (score) => 
        set((state) => ({
          highScores: [...state.highScores, { ...score, date: new Date().toISOString() }]
            .sort((a, b) => b.wpm - a.wpm)
            .slice(0, 10)
        })),
      reset: () => set({
        typedText: '',
        wpm: 0,
        accuracy: 100,
        errors: 0,
        isPlaying: false,
        lastCompletedLineIndex: -1,
        currentLyric: null
      }),
      changeSong: (newLyrics, newText) => set({
        lyrics: newLyrics,
        text: newText,
        typedText: '',
        wpm: 0,
        accuracy: 100,
        errors: 0,
        currentLyric: null,
        lastCompletedLineIndex: -1,
        isPlaying: true
      })
    }),
    {
      name: 'typing-store',
      partialize: (state) => ({
        highScores: state.highScores,
        language: state.language,
        difficulty: state.difficulty
      })
    }
  )
);