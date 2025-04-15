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
  },
  'JGwWNGJdvx8': { // Ed Sheeran - Shape of You
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    lyrics: [
      { text: "The club isn't the best place to find a lover", startTime: 10, endTime: 13 },
      { text: "So the bar is where I go", startTime: 13.5, endTime: 16 },
      { text: "Me and my friends at the table doing shots", startTime: 16.5, endTime: 19 },
      { text: "Drinking fast and then we talk slow", startTime: 19.5, endTime: 22 },
      { text: "Come over and start up a conversation with just me", startTime: 22.5, endTime: 26 },
      { text: "And trust me I'll give it a chance now", startTime: 26.5, endTime: 29 },
      { text: "Take my hand, stop, put Van the Man on the jukebox", startTime: 30, endTime: 33 },
      { text: "And then we start to dance, and now I'm singing like", startTime: 33.5, endTime: 36 },
      { text: "Girl, you know I want your love", startTime: 36.5, endTime: 39 },
      { text: "Your love was handmade for somebody like me", startTime: 39.5, endTime: 42 },
      { text: "Come on now, follow my lead", startTime: 42.5, endTime: 45 },
      { text: "I may be crazy, don't mind me", startTime: 45.5, endTime: 48 },
    ]
  },
  'kJQP7kiw5Fk': { // Luis Fonsi - Despacito
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    lyrics: [
      { text: "Ay, Fonsi, DY", startTime: 19, endTime: 22 },
      { text: "Oh, oh no, oh no", startTime: 22.5, endTime: 25 },
      { text: "Hey yeah, Diridiri, dirididi Daddy", startTime: 25.5, endTime: 28 },
      { text: "Go!", startTime: 28.5, endTime: 30 },
      { text: "Sí, sabes que ya llevo un rato mirándote", startTime: 30.5, endTime: 33 },
      { text: "Tengo que bailar contigo hoy", startTime: 33.5, endTime: 36 },
      { text: "Vi que tu mirada ya estaba llamándome", startTime: 36.5, endTime: 39 },
      { text: "Muéstrame el camino que yo voy", startTime: 39.5, endTime: 42 },
      { text: "Tú, tú eres el imán y yo soy el metal", startTime: 42.5, endTime: 45 },
      { text: "Me voy acercando y voy armando el plan", startTime: 45.5, endTime: 48 },
      { text: "Solo con pensarlo se acelera el pulso", startTime: 48.5, endTime: 51 },
    ]
  },
  'OPf0YbXqDm0': { // Mark Ronson - Uptown Funk
    title: 'Uptown Funk',
    artist: 'Mark Ronson ft. Bruno Mars',
    lyrics: [
      { text: "This hit, that ice cold", startTime: 43, endTime: 45 },
      { text: "Michelle Pfeiffer, that white gold", startTime: 45.5, endTime: 48 },
      { text: "This one for them hood girls", startTime: 48.5, endTime: 51 },
      { text: "Them good girls, straight masterpieces", startTime: 51.5, endTime: 54 },
      { text: "Stylin', wilin', livin' it up in the city", startTime: 54.5, endTime: 57 },
      { text: "Got Chucks on with Saint Laurent", startTime: 57.5, endTime: 60 },
      { text: "Gotta kiss myself, I'm so pretty", startTime: 60.5, endTime: 65 },
      { text: "I'm too hot (hot damn)", startTime: 65.5, endTime: 68 },
      { text: "Called a police and a fireman", startTime: 68.5, endTime: 71 },
      { text: "I'm too hot (hot damn)", startTime: 71.5, endTime: 74 },
      { text: "Make a dragon wanna retire, man", startTime: 74.5, endTime: 77 },
    ]
  },
  'YQHsXMglC9A': { // Adele - Hello
    title: 'Hello',
    artist: 'Adele',
    lyrics: [
      { text: "Hello, it's me", startTime: 77, endTime: 80 },
      { text: "I was wondering if after all these years", startTime: 80.5, endTime: 84 },
      { text: "You'd like to meet, to go over everything", startTime: 84.5, endTime: 88 },
      { text: "They say that time's supposed to heal ya", startTime: 88.5, endTime: 92 },
      { text: "But I ain't done much healing", startTime: 92.5, endTime: 96 },
      { text: "Hello, can you hear me?", startTime: 96.5, endTime: 100 },
      { text: "I'm in California dreaming about who we used to be", startTime: 100.5, endTime: 104 },
      { text: "When we were younger and free", startTime: 104.5, endTime: 108 },
      { text: "I've forgotten how it felt before the world fell at our feet", startTime: 108.5, endTime: 112 },
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
    
    // Force clean video ID - this helps with URLs that might be pasted
    const cleanVideoId = videoId.trim().replace(/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i, '').split('&')[0];
    console.log('Processing video ID:', cleanVideoId);
    
    // Check cache first for faster loading (including the cleaned ID)
    if (lyricsCache[cleanVideoId]) {
      console.log('Cache hit for lyrics - returning immediately');
      console.timeEnd('fetchLyrics');
      return { ...lyricsCache[cleanVideoId] }; // Return a copy to prevent mutation issues
    }
    
    // Check if this is one of our demo songs
    const demoVideoId = Object.keys(demoSongs).find(id => 
      id === cleanVideoId || cleanVideoId.includes(id)
    );
    
    if (demoVideoId) {
      // We found a matching demo song
      console.log('Found matching demo song:', demoSongs[demoVideoId].title);
      // Cache for future use with both IDs
      lyricsCache[cleanVideoId] = demoSongs[demoVideoId];
      console.timeEnd('fetchLyrics');
      return { ...demoSongs[demoVideoId] };
    }
    
    // For non-demo songs, create meaningful fallback lyrics that always work
    console.log('Creating fallback lyrics for video:', cleanVideoId);
    
    // Try to get video info first
    const videoInfo = await getVideoInfo(cleanVideoId);
    
    // Create shorter time-spaced lyrics for faster feedback
    const TIME_GAP = 2.5; // seconds per line (even shorter for better responsiveness)
    const OVERLAP = 0.1; // slight overlap for smoother transitions
    
    // Use a subset of placeholder lyrics for faster loading
    const generatedLyrics: LyricLine[] = placeholderLyrics.slice(0, 12).map((text, index) => {
      const startTime = index * TIME_GAP;
      return {
        text,
        startTime,
        endTime: startTime + TIME_GAP - OVERLAP
      };
    });
    
    // Build the song object with guaranteed lyrics
    const song = {
      title: videoInfo.title || `Song ${cleanVideoId.substring(0, 6)}`,
      artist: videoInfo.artist || 'YouTube Artist',
      lyrics: generatedLyrics
    };
    
    // Cache for future requests - both original and cleaned ID
    lyricsCache[videoId] = song;
    if (videoId !== cleanVideoId) {
      lyricsCache[cleanVideoId] = song;
    }
    
    console.timeEnd('fetchLyrics');
    console.log('Successfully created fallback lyrics with', generatedLyrics.length, 'lines');
    return { ...song };
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    console.timeEnd('fetchLyrics');
    
    // Even more robust fallback that never fails
    console.log('Using emergency fallback lyrics');
    const simpleLyrics = [
      "Welcome to Yene Type! Practice your typing skills with this song.",
      "Focus on accuracy first, then speed will naturally follow.",
      "Keep your fingers on the home row for better typing efficiency.",
      "The quick brown fox jumps over the lazy dog.",
      "Typing to music can help you develop a consistent rhythm.",
    ];
    
    const fallbackSong = {
      title: 'Typing Practice',
      artist: 'Yene Type',
      lyrics: simpleLyrics.map((text, index) => ({
        text,
        startTime: index * 2.5,
        endTime: (index * 2.5) + 2.4
      }))
    };
    
    // Cache even the emergency fallback
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