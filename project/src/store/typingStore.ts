import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LyricLine } from '../lib/lyrics';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'en' | 'es' | 'fr' | 'de';
export type Mode = 'video' | 'practice' | 'challenge';

export interface HighScore {
  date: string;
  wpm: number;
  accuracy: number;
  mode: string;
  songTitle?: string;
}

interface TypingState {
  text: string;
  typedText: string;
  wpm: number;
  accuracy: number;
  errors: number;
  isPlaying: boolean;
  difficulty: Difficulty;
  language: Language;
  mode: Mode;
  lyrics: LyricLine[];
  currentLyric: LyricLine | null;
  lastCompletedLineIndex: number;
  practiceTexts: Record<Language, string[]>;
  highScores: HighScore[];
  currentTime: number;
  videoLoaded: boolean;
  activeLyricIndex: number;
  setText: (text: string) => void;
  setTypedText: (text: string) => void;
  setWPM: (wpm: number) => void;
  setAccuracy: (accuracy: number) => void;
  setErrors: (errors: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setLanguage: (language: Language) => void;
  setMode: (mode: Mode) => void;
  setLyrics: (lyrics: LyricLine[]) => void;
  setCurrentLyric: (lyric: LyricLine | null) => void;
  completeCurrentLine: () => void;
  addHighScore: (score: Omit<HighScore, 'date'>) => void;
  reset: () => void;
  changeSong: (newLyrics: LyricLine[], newText: string) => void;
  updateCurrentTime: (time: number) => void;
  setVideoLoaded: (loaded: boolean) => void;
  getCurrentLyricByTime: (time: number) => void;
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
      currentTime: 0,
      videoLoaded: false,
      activeLyricIndex: -1,
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
      updateCurrentTime: (time) => {
        set({ currentTime: time });
        get().getCurrentLyricByTime(time);
      },
      setVideoLoaded: (loaded) => set({ videoLoaded: loaded }),
      getCurrentLyricByTime: (time) => {
        const { lyrics } = get();
        
        // If no lyrics, exit early
        if (!lyrics || lyrics.length === 0) return;
        
        // Find the lyric that corresponds to the current time
        let activeIndex = -1;
        
        for (let i = 0; i < lyrics.length; i++) {
          const lyric = lyrics[i];
          const nextLyric = i < lyrics.length - 1 ? lyrics[i + 1] : null;
          
          // Check if the current time is between this lyric's start time and the next lyric's start time
          if (lyric.startTime <= time && (!nextLyric || nextLyric.startTime > time || time <= lyric.endTime)) {
            activeIndex = i;
            break;
          }
        }
        
        // If we found a match and it's different from the current active lyric
        if (activeIndex >= 0 && activeIndex !== get().activeLyricIndex) {
          set({ 
            activeLyricIndex: activeIndex,
            currentLyric: lyrics[activeIndex]
          });
        }
      },
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
        currentLyric: null,
        currentTime: 0,
        activeLyricIndex: -1,
        videoLoaded: false
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
        isPlaying: true,
        currentTime: 0,
        activeLyricIndex: -1,
        videoLoaded: false
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