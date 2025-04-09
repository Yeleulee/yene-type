import axios from 'axios';

export interface LyricLine {
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

export interface Song {
  title: string;
  artist: string;
  lyrics: LyricLine[];
}

// Demo songs with timed lyrics for testing
export const demoSongs: Record<string, Song> = {
  'dQw4w9WgXcQ': { // Rick Astley - Never Gonna Give You Up
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    lyrics: [
      { text: "We're no strangers to love", startTime: 18, endTime: 21 },
      { text: "You know the rules and so do I", startTime: 21.5, endTime: 25 },
      { text: "A full commitment's what I'm thinking of", startTime: 25.5, endTime: 29 },
      { text: "You wouldn't get this from any other guy", startTime: 29.5, endTime: 33 },
      { text: "I just wanna tell you how I'm feeling", startTime: 33.5, endTime: 37 },
      { text: "Gotta make you understand", startTime: 37.5, endTime: 42 },
      { text: "Never gonna give you up", startTime: 42.5, endTime: 45 },
      { text: "Never gonna let you down", startTime: 45.5, endTime: 48 },
      { text: "Never gonna run around and desert you", startTime: 48.5, endTime: 52 },
      { text: "Never gonna make you cry", startTime: 52.5, endTime: 55 },
      { text: "Never gonna say goodbye", startTime: 55.5, endTime: 58 },
      { text: "Never gonna tell a lie and hurt you", startTime: 58.5, endTime: 62 },
    ]
  },
  'fJ9rUzIMcZQ': { // Queen - Bohemian Rhapsody
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    lyrics: [
      { text: "Is this the real life?", startTime: 5, endTime: 8 },
      { text: "Is this just fantasy?", startTime: 8.5, endTime: 11 },
      { text: "Caught in a landslide", startTime: 11.5, endTime: 14 },
      { text: "No escape from reality", startTime: 14.5, endTime: 19 },
      { text: "Open your eyes", startTime: 19.5, endTime: 22 },
      { text: "Look up to the skies and see", startTime: 22.5, endTime: 27 },
      { text: "I'm just a poor boy, I need no sympathy", startTime: 27.5, endTime: 32 },
      { text: "Because I'm easy come, easy go", startTime: 32.5, endTime: 35 },
      { text: "Little high, little low", startTime: 35.5, endTime: 38 },
      { text: "Any way the wind blows doesn't really matter to me, to me", startTime: 38.5, endTime: 49 },
    ]
  }
};

// Placeholder lyrics for songs without predefined lyrics - improved with more typing-focused content
const placeholderLyrics = [
  "Welcome to Yene Type! Practice your typing skills with this song.",
  "Focus on accuracy first, then speed will naturally follow.",
  "Keep your fingers on the home row for better typing efficiency.",
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "How vexingly quick daft zebras jump!",
  "Maintaining good posture helps prevent strain while typing.",
  "Try to look at the screen instead of your keyboard while typing.",
  "Regular short breaks help maintain focus and prevent fatigue.",
  "Rhythm is important in typing, just like in music.",
  "Practice with different songs to improve your versatility.",
  "Challenge yourself to beat your previous typing speed record.",
  "Watch your accuracy percentage closely as you type.",
  "Typing to music can help you develop a consistent rhythm.",
  "Your fingers should hover over the keyboard, not rest on it.",
];

// Cache for recently fetched lyrics to improve performance
const lyricsCache: Record<string, Song> = {};

// Preload common lyrics to speed up initial experience
function preloadCommonLyrics() {
  // Preload the two demo songs
  Object.keys(demoSongs).forEach(videoId => {
    lyricsCache[videoId] = demoSongs[videoId];
  });
}

// Call this immediately to prepare cache
preloadCommonLyrics();

// Get video info from YouTube video ID - optimized with caching
async function getVideoInfo(videoId: string): Promise<{title: string, artist: string}> {
  try {
    // In a real implementation, you would fetch from YouTube API with proper caching
    // This is just a placeholder implementation using the video ID pattern
    
    // Implement simple memoization - use ID as part of title for more variety
    return {
      title: `Song ${videoId.substring(0, 8)}`,
      artist: 'Unknown Artist'
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return {
      title: 'Unknown Song',
      artist: 'Unknown Artist'
    };
  }
}

// Async function to fetch lyrics for a given video ID - with improved performance
export async function fetchLyrics(videoId: string): Promise<Song> {
  try {
    console.time('fetchLyrics');
    
    // Fast cache check first
    if (lyricsCache[videoId]) {
      console.log('Cache hit for lyrics - returning immediately');
      console.timeEnd('fetchLyrics');
      return { ...lyricsCache[videoId] }; // Return a copy to prevent mutation issues
    }
    
    // Then check predefined demo lyrics (with most common Rick Roll)
    if (videoId === 'dQw4w9WgXcQ' || demoSongs[videoId]) {
      // Special fast path for Rick Roll (most common test video)
      const songData = demoSongs[videoId] || demoSongs['dQw4w9WgXcQ'];
      // Cache for future use
      lyricsCache[videoId] = songData;
      console.timeEnd('fetchLyrics');
      return { ...songData };
    }
    
    // If not predefined, get video info and create placeholder lyrics immediately
    const videoInfo = await getVideoInfo(videoId);
    
    // Create time-spaced lyrics with optimized spacing - short gap for faster feedback
    const TIME_GAP = 3.0; // seconds per line (reduced for faster progression)
    const OVERLAP = 0.1; // slight overlap for smoother transitions
    
    const generatedLyrics: LyricLine[] = placeholderLyrics.map((text, index) => {
      const startTime = index * TIME_GAP;
      return {
        text,
        startTime,
        endTime: startTime + TIME_GAP - OVERLAP
      };
    });
    
    // Build the song object
    const song = {
      title: videoInfo.title,
      artist: videoInfo.artist,
      lyrics: generatedLyrics
    };
    
    // Cache for future requests - this will make subsequent loads much faster
    lyricsCache[videoId] = song;
    
    console.timeEnd('fetchLyrics');
    return { ...song };
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    console.timeEnd('fetchLyrics');
    
    // Immediate fallback with shorter content for faster loading
    const fallbackLyrics = placeholderLyrics.slice(0, 10); // Use fewer lines for faster loading
    
    const fallbackSong = {
      title: 'Typing Practice',
      artist: 'Yene Type',
      lyrics: fallbackLyrics.map((text, index) => ({
        text,
        startTime: index * 3, // Faster progression
        endTime: (index * 3) + 2.9
      }))
    };
    
    // Cache even the fallback for performance
    lyricsCache[videoId] = fallbackSong;
    
    return { ...fallbackSong };
  }
}

// Get the current lyric line with performance optimization
export function getCurrentLyric(lyrics: LyricLine[], currentTime: number): LyricLine | null {
  // Quick early return for empty array to avoid unnecessary loop
  if (!lyrics || lyrics.length === 0) return null;
  
  // Binary search would be more efficient for large lyrics arrays
  // but for typical song length, a simple loop is sufficient
  for (const line of lyrics) {
    if (currentTime >= line.startTime && currentTime <= line.endTime) {
      return line;
    }
  }
  return null;
}

// Get the next few lyric lines for preview
export function getUpcomingLyrics(lyrics: LyricLine[], currentTime: number, count: number = 3): LyricLine[] {
  const upcomingLyrics: LyricLine[] = [];
  let found = 0;
  
  for (const line of lyrics) {
    if (line.startTime > currentTime && found < count) {
      upcomingLyrics.push(line);
      found++;
    }
  }
  
  return upcomingLyrics;
}

// Format seconds to mm:ss
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 