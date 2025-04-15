import axios from 'axios';
import { LyricLine, Song, adjustLyricsTiming } from './lyrics';

// Define missing types
export type TrackSearchResponse = {
  success: boolean;
  track_id?: number;
  track_name?: string;
  artist_name?: string;
  error?: string;
};

export type LyricsResponse = {
  success: boolean;
  lyrics_body?: string;
  error?: string;
};

export enum LyricsSource {
  MUSIXMATCH = 'musixmatch',
  CUSTOM = 'custom',
  UNKNOWN = 'unknown'
}

export type TimedLyricsResponse = {
  success: boolean;
  lyrics: LyricLine[];
  source?: LyricsSource;
  trackInfo?: {
    track_name: string;
    artist_name: string;
    track_id: number;
  };
  error?: string;
};

// RapidAPI Musixmatch endpoints
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'musixmatch.p.rapidapi.com';
const RAPIDAPI_BASE_URL = 'https://musixmatch.p.rapidapi.com/ws/1.1';

// Validation to detect missing API key early
if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'your_rapidapi_key_here') {
  console.error('⚠️ WARNING: Musixmatch API key is missing or invalid in .env file');
  console.warn('You need to set VITE_RAPIDAPI_KEY in your .env file to use lyrics fetching');
  console.info('Get your key from RapidAPI: https://rapidapi.com/musixmatch/api/musixmatch');
}

// YouTube API (using existing key)
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Get video details from YouTube to extract song information and duration
 */
export async function getVideoDetailsFromYouTube(videoId: string): Promise<{title: string, artist: string, duration?: number}> {
  try {
    // Get video details from YouTube API with contentDetails for duration
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (!response.data.items || !response.data.items[0]) {
      throw new Error('Video not found');
    }

    const snippet = response.data.items[0].snippet;
    const contentDetails = response.data.items[0].contentDetails;
    
    // Parse ISO 8601 duration to seconds
    let duration: number | undefined = undefined;
    if (contentDetails && contentDetails.duration) {
      // Convert ISO 8601 duration (PT4M13S) to seconds
      const match = contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        duration = hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    // Try to extract artist and title from YouTube title
    // Common formats: "Artist - Title", "Title - Artist", "Title (Official Video) - Artist"
    let artist = snippet.channelTitle;
    let title = snippet.title;
    
    // Try to parse artist and title from the video title
    const titleParts = snippet.title.split(/\s*[-–]\s*/);
    if (titleParts.length >= 2) {
      // Assume format is either "Artist - Title" or "Title - Artist"
      // We'll make an educated guess based on channel name
      if (titleParts[0].toLowerCase().includes(snippet.channelTitle.toLowerCase())) {
        // If first part contains channel name, assume "Artist - Title" format
        artist = titleParts[0].trim();
        title = titleParts.slice(1).join(' - ').trim();
      } else if (titleParts[titleParts.length-1].toLowerCase().includes(snippet.channelTitle.toLowerCase())) {
        // If last part contains channel name, assume "Title - Artist" format
        artist = titleParts[titleParts.length-1].trim();
        title = titleParts.slice(0, -1).join(' - ').trim();
      } else {
        // Default to first part as artist, rest as title
        artist = titleParts[0].trim();
        title = titleParts.slice(1).join(' - ').trim();
      }
    }
    
    // Clean up title - remove common suffixes
    title = title
      .replace(/([\(\[].*?(official|lyrics|audio|music|video|hd|4k|720p|1080p).*?[\)\]])/gi, '')
      .replace(/\(\s*\)/g, '') // Remove empty parentheses
      .replace(/\[\s*\]/g, '') // Remove empty brackets
      .trim();
    
    return { title, artist, duration };
  } catch (error) {
    console.error('Error getting video details from YouTube:', error);
    throw new Error('Failed to extract song information from video');
  }
}

/**
 * Search for a song in Musixmatch API via RapidAPI
 */
export async function searchSong(title: string, artist: string): Promise<{ trackId: number, commontrackId: number }> {
  try {
    console.log(`Searching Musixmatch for track: "${title}" by "${artist}"`);
    
    // Log the request details for debugging
    console.log('Musixmatch API request:', {
      url: `${RAPIDAPI_BASE_URL}/matcher.lyrics.get`,
      params: {
        q_track: title,
        q_artist: artist
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY ? '[KEY AVAILABLE]' : '[KEY MISSING]',
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });
    
    const response = await axios.get(`${RAPIDAPI_BASE_URL}/matcher.lyrics.get`, {
      params: {
        q_track: title,
        q_artist: artist,
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });

    // Log the response status for debugging
    console.log('Musixmatch API response status:', response.status);
    console.log('Musixmatch API response header:', response.data?.message?.header);
    
    const data = response.data;
    if (data.message.header.status_code !== 200 || !data.message.body || !data.message.body.track) {
      console.error('Musixmatch API error:', data.message);
      throw new Error(`Song not found in Musixmatch: ${data.message.header.status_code}`);
    }

    const trackId = data.message.body.track.track_id;
    console.log(`Found track ID ${trackId} for "${title}" by "${artist}"`);
    
    return {
      trackId: trackId,
      commontrackId: data.message.body.track.commontrack_id
    };
  } catch (error) {
    console.error('Error searching song in Musixmatch via RapidAPI:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    throw new Error(`Failed to find lyrics for "${title}" by "${artist}": ${error.message}`);
  }
}

/**
 * Converts raw lyrics text into a timed format
 */
export function convertToTimedLyrics(lyricsText: string): TimedLyric[] {
  if (!lyricsText || typeof lyricsText !== 'string') {
    console.error("Invalid lyrics text provided to convertToTimedLyrics", lyricsText);
    return [];
  }

  // Clean up the lyrics text
  let cleanedLyrics = lyricsText
    // Remove Musixmatch disclaimer and similar notices at the end
    .replace(/\*{3}.*\*{3}/s, '')
    .replace(/This Lyrics is NOT for Commercial use.*/s, '')
    .replace(/\d+ lyrics taken from http:\/\/.*$/m, '')  
    .replace(/Lyrics powered by www\.musixmatch\.com/i, '')
    .replace(/Disclaimer:.*/s, '')
    .replace(/Paroles de la chanson.*/s, '')
    .replace(/Testo Della Canzone.*/s, '')
    .replace(/\[Paroles de.*?\]/s, '')
    .replace(/\[Lyrics.*?\]/s, '')
    .replace(/.*?Lyrics © .*/g, '')
    // Remove timestamps if they exist in the format [mm:ss.xx]
    .replace(/\[\d+:\d+\.\d+\]/g, '')
    // Remove line numbers like "1.", "2.", etc.
    .replace(/^\d+\.\s*/gm, '')
    // Remove common tags
    .replace(/\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain|Interlude)(\s\d+)?\]/gi, '')
    .replace(/\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain|Interlude)(\s\d+)?:/gi, '')
    // Clean up extra whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Split into lines and filter out empty lines
  const lines = cleanedLyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      
      // Filter out common non-lyric lines
      if (
        line.includes('Lyrics from') ||
        line.includes('lyrics licensed') ||
        line.includes('Submit Corrections') ||
        line.includes('Artist:') ||
        line.includes('Album:') ||
        line.includes('Released:') ||
        line.match(/^\(\d+\)$/) || // Just numbers in parentheses
        line.match(/^-+$/) || // Just dashes
        line.match(/^[×x]+$/) || // Just × or x symbols
        line.includes('http') || // URLs
        line.includes('www.') || // URLs
        line.includes('Lyrics © ') // Copyright notices
      ) {
        return false;
      }
      
      return true;
    });

  // Check if we have valid lines after cleaning
  if (lines.length === 0) {
    console.warn("No valid lyrics lines found after cleaning");
    return [];
  }

  // Calculate approximate time for each line if the song is around 3.5 minutes
  const defaultSongDuration = 210; // 3.5 minutes in seconds
  const linesCount = lines.length;
  const timePerLine = defaultSongDuration / linesCount;

  // Create timed lyrics with evenly distributed timestamps
  const timedLyrics: TimedLyric[] = lines.map((text, index) => {
    // Calculate time based on line index
    const startTime = Math.round(index * timePerLine);
    
    // Occasionally add a gap between verses (every 4 lines on average)
    const isVerseEnd = (index > 0) && (index % 4 === 0);
    const endTime = Math.round((index + 1) * timePerLine) - (isVerseEnd ? 0.5 : 0);
    
    return {
      text,
      startTime,
      endTime,
      highlighted: false,
      typed: false
    };
  });

  return timedLyrics;
}

/**
 * Fix common RapidAPI URL format issues (ensures proper encoding)
 */
function fixRapidApiUrl(url: string): string {
  // Replace spaces with %20 in query parameters
  return url.replace(/(\?|&)([^=]+)=([^&]+)/g, (match, prefix, key, value) => {
    return `${prefix}${key}=${encodeURIComponent(decodeURIComponent(value))}`;
  });
}

/**
 * Helper function to properly encode parameters for API requests
 */
export function encodeSearchParams(params: Record<string, string | number | boolean>): Record<string, string> {
  const encoded: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // Properly encode string values, handling special characters
      encoded[key] = encodeURIComponent(value);
    } else {
      // Convert non-string values to strings
      encoded[key] = String(value);
    }
  }
  
  return encoded;
}

/**
 * Searches for a track by title and artist
 */
export async function searchTrack(title: string, artist = ""): Promise<TrackSearchResponse> {
  try {
    // Construct the query parameter
    let query = title.trim();
    if (artist) {
      query += ` ${artist.trim()}`;
    }
    
    const params = encodeSearchParams({
      q: query,
      page_size: 5,
      page: 1,
      s_track_rating: 'desc'
    });
    
    const response = await axios.get(fixRapidApiUrl(`${RAPIDAPI_BASE_URL}/track.search`), {
      params,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });
    
    if (response.data?.message?.header?.status_code !== 200 || 
        !response.data?.message?.body?.track_list || 
        response.data.message.body.track_list.length === 0) {
      return {
        success: false,
        error: `No tracks found for "${query}"`
      };
    }
    
    const track = response.data.message.body.track_list[0].track;
    
    return {
      success: true,
      track_id: track.track_id,
      track_name: track.track_name,
      artist_name: track.artist_name
    };
  } catch (error) {
    console.error('Error searching tracks:', error);
    return {
      success: false,
      error: error.message || 'Failed to search tracks'
    };
  }
}

/**
 * Gets lyrics for a specific track by ID
 */
export async function getLyrics(trackId: string | number): Promise<LyricsResponse> {
  try {
    const params = encodeSearchParams({
      track_id: trackId
    });
    
    const response = await axios.get(fixRapidApiUrl(`${RAPIDAPI_BASE_URL}/track.lyrics.get`), {
      params,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });
    
    if (response.data?.message?.header?.status_code !== 200 || 
        !response.data?.message?.body?.lyrics?.lyrics_body) {
      return {
        success: false,
        error: `No lyrics found for track ID ${trackId}`
      };
    }
    
    return {
      success: true,
      lyrics_body: response.data.message.body.lyrics.lyrics_body
    };
  } catch (error) {
    console.error(`Error getting lyrics for track ${trackId}:`, error);
    return {
      success: false,
      error: error.message || `Failed to get lyrics for track ID ${trackId}`
    };
  }
}

/**
 * Main function to fetch lyrics for a YouTube video with enhanced sync
 */
export async function fetchRealLyrics(videoId: string): Promise<Song | null> {
  try {
    console.log('Fetching real lyrics for video ID:', videoId);
    
    // Check if RAPIDAPI_KEY is available
    if (!RAPIDAPI_KEY) {
      console.error('ERROR: RAPIDAPI_KEY is not set in environment variables');
      console.log('To use Musixmatch lyrics, you need to set VITE_RAPIDAPI_KEY in your .env file');
      return null;
    }
    
    // Step 1: Get video details including duration
    const { title, artist, duration } = await getVideoDetailsFromYouTube(videoId);
    console.log(`Extracted song info: "${title}" by "${artist}" (duration: ${duration || 'unknown'} seconds)`);
    
    if (!title || !artist) {
      console.error('Could not extract valid title/artist from video');
      return null;
    }
    
    let lyrics: LyricLine[] = [];
    let lyricsSource = 'unknown';
    let lyricsText: string | null = null;
    
    // Try all methods in sequence until one works
    
    // Method 1: Direct lyrics search (fastest and simplest)
    console.log('Attempting direct lyrics search...');
    const directResult = await directLyricsSearch(title, artist);
    
    if (directResult.success && directResult.lyrics.length > 0) {
      lyricsSource = 'direct';
      lyrics = directResult.lyrics;
      console.log('Found lyrics using direct search');
    } else {
      // Method 2: Try primary search method 
      try {
        console.log('Direct search failed, trying matcher.lyrics.get...');
        const { trackId } = await searchSong(title, artist);
        console.log('Found track ID using matcher.lyrics.get:', trackId);
        
        // Step 3: Get lyrics for the track
        const lyricsResponse = await getLyrics(trackId);
        if (lyricsResponse.success && lyricsResponse.lyrics_body) {
          lyricsText = lyricsResponse.lyrics_body;
          lyricsSource = 'matcher';
        }
      } catch (error) {
        console.log('Primary search failed, trying track.search...', error.message);
        
        // Method 3: Alternative search method
        const trackResponse = await searchTrack(title, artist);
        if (trackResponse.success && trackResponse.track_id) {
          console.log('Found track ID using track.search:', trackResponse.track_id);
          const lyricsResponse = await getLyrics(trackResponse.track_id);
          
          if (lyricsResponse.success && lyricsResponse.lyrics_body) {
            lyricsText = lyricsResponse.lyrics_body;
            lyricsSource = 'search';
          } else {
            console.log('Found track but failed to get lyrics');
          }
        } else {
          console.log('All search methods failed to find lyrics');
        }
      }
      
      // If we got lyrics text from one of the methods, convert to timed lyrics
      if (lyricsText) {
        lyrics = convertToTimedLyrics(lyricsText);
      }
    }
    
    // Final validation - if we still have no lyrics, return null
    if (!lyrics || lyrics.length === 0) {
      console.error('No lyrics lines could be extracted');
      return null;
    } else if (lyrics.length < 5 && duration && duration > 60) {
      console.log('Too few lyrics detected, probably incomplete');
      return null;
    }
    
    console.log(`Successfully processed ${lyrics.length} lyrics lines from source: ${lyricsSource}`);
    
    // Adjust timing based on video duration if available
    if (duration && duration > 0) {
      lyrics = adjustLyricsTiming(lyrics, duration);
      console.log('Adjusted lyrics timing based on song duration:', duration);
    }
    
    // Return complete song object
    return {
      title,
      artist,
      lyrics
    };
  } catch (error) {
    console.error('Error fetching lyrics from Musixmatch:', error);
    return null;
  }
}

/**
 * Directly search for lyrics with an optimized search strategy
 */
export async function directLyricsSearch(title: string, artist = ""): Promise<TimedLyricsResponse> {
  console.log("🔍 Attempting direct lyrics search for:", { title, artist });
  
  // Clean title and artist for better matching
  const cleanTitle = title
    .replace(/\(.*?\)|\[.*?\]/g, "") // Remove content in parentheses and brackets
    .replace(/ft\.?|feat\.?|official|lyrics|video|audio|hd|4k|with lyrics|lyric video|official video|official audio/gi, "") // Remove common video title terms
    .replace(/official\s*(music)?\s*video/gi, "") // Remove "official music video"
    .replace(/\d{3,4}p/g, "") // Remove resolution indicators like 720p, 1080p
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .trim();
    
  const cleanArtist = artist
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/official|music|vevo|channel|topics/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  
  let result: TimedLyricsResponse = { success: false, lyrics: [] };
  
  // Create an array of search attempts with different parameters
  const searchAttempts = [];
  
  // Attempt 1: Try with both title and artist
  if (cleanTitle && cleanArtist) {
    searchAttempts.push({
      title: cleanTitle,
      artist: cleanArtist,
      description: "title and artist"
    });
  }
  
  // Attempt 2: Try with title only
  if (cleanTitle) {
    searchAttempts.push({
      title: cleanTitle,
      artist: "",
      description: "title only"
    });
  }
  
  // Attempt 3: If artist is a group/band (contains spaces), try first word of artist name
  // This helps with cases like "The Beatles" -> "Beatles"
  if (cleanArtist && cleanArtist.includes(" ")) {
    const parts = cleanArtist.split(" ");
    const firstWord = parts[0];
    // Only use first word if it's not a common prefix like "The", "A", etc.
    if (firstWord.length > 2 && !["the", "a", "an", "los", "las", "el", "la", "die", "der", "das"].includes(firstWord.toLowerCase())) {
      searchAttempts.push({
        title: cleanTitle,
        artist: firstWord,
        description: "title with first word of artist"
      });
    }
    
    // Also try with last word of artist (for bands like "Red Hot Chili Peppers" -> "Peppers")
    const lastWord = parts[parts.length - 1];
    if (lastWord.length > 3 && lastWord.toLowerCase() !== firstWord.toLowerCase()) {
      searchAttempts.push({
        title: cleanTitle,
        artist: lastWord,
        description: "title with last word of artist"
      });
    }
  }
  
  // Attempt 4: Try with just the first part of the title before any hyphen or dash
  // This helps with titles like "Song Name - Radio Edit" -> "Song Name"
  if (cleanTitle.includes('-')) {
    const titleFirstPart = cleanTitle.split('-')[0].trim();
    if (titleFirstPart.length > 5) {
      searchAttempts.push({
        title: titleFirstPart,
        artist: cleanArtist,
        description: "first part of title with artist"
      });
    }
  }
  
  // Try all search attempts until one succeeds
  for (const attempt of searchAttempts) {
    console.log(`🔍 Searching with ${attempt.description}:`, { 
      title: attempt.title, 
      artist: attempt.artist 
    });
    
    try {
      // Try to match track
      const trackResponse = await searchTrack(attempt.title, attempt.artist);
      
      if (trackResponse.success && trackResponse.track_id) {
        // We found a matching track, try to get its lyrics
        console.log(`✅ Found matching track with ID: ${trackResponse.track_id}`);
        
        const lyricsResponse = await getLyrics(trackResponse.track_id);
        
        if (lyricsResponse.success && lyricsResponse.lyrics_body) {
          // Clean and process the lyrics
          console.log("✅ Successfully retrieved lyrics from Musixmatch API");
          
          const processedLyrics = convertToTimedLyrics(lyricsResponse.lyrics_body);
          
          // Only consider it a success if we actually have lyrics lines
          if (processedLyrics.length > 0) {
            result = {
              success: true,
              lyrics: processedLyrics,
              source: LyricsSource.MUSIXMATCH,
              trackInfo: {
                track_name: trackResponse.track_name || attempt.title,
                artist_name: trackResponse.artist_name || attempt.artist,
                track_id: trackResponse.track_id
              }
            };
            
            // We found lyrics, exit the loop
            break;
          } else {
            console.log("⚠️ Found track but lyrics processing resulted in empty lines");
          }
        } else {
          console.log("⚠️ Found track but couldn't get lyrics");
        }
      } else {
        console.log(`⚠️ No matching track found with ${attempt.description}`);
      }
    } catch (error) {
      console.error(`❌ Error during lyrics search with ${attempt.description}:`, error);
    }
  }
  
  if (!result.success) {
    console.log("❌ All direct lyrics search attempts failed");
    result.error = "Could not find lyrics for this song";
  }
  
  return result;
}

/**
 * Adjusts the timing of lyrics based on actual video duration
 * @param lyrics The lyrics with default timing
 * @param videoDuration The actual video duration in seconds
 * @param startOffset Seconds to wait before first lyric (default: 3)
 * @param endOffset Seconds to end before video ends (default: 3)
 */
export function adjustLyricsTimingWithVideo(
  lyrics: TimedLyric[], 
  videoDuration: number,
  startOffset = 3,
  endOffset = 3
): TimedLyric[] {
  if (!lyrics || !lyrics.length || !videoDuration) {
    return lyrics;
  }

  // Calculate the actual available time for lyrics
  const availableDuration = videoDuration - startOffset - endOffset;
  
  // If we don't have enough time, reduce the offsets
  if (availableDuration <= 0) {
    const reducedOffset = Math.max(0, Math.floor(videoDuration / 10));
    return adjustLyricsTimingWithVideo(lyrics, videoDuration, reducedOffset, reducedOffset);
  }

  // Calculate time per line based on available duration
  const timePerLine = availableDuration / lyrics.length;
  
  // Adjust timing for each line
  return lyrics.map((lyric, index) => {
    // Apply start offset to first timestamp
    const startTime = startOffset + (index * timePerLine);
    
    // Add small gaps between verses (detected by empty line or punctuation)
    const isVerseEnd = index < lyrics.length - 1 && 
      (lyrics[index].text.endsWith('.') || 
       lyrics[index].text.endsWith('!') || 
       lyrics[index].text.endsWith('?'));
    
    const verseGap = isVerseEnd ? 0.5 : 0;
    const endTime = startOffset + ((index + 1) * timePerLine) - verseGap;
    
    // Keep any existing highlights or typed state
    return {
      ...lyric,
      startTime: Math.round(startTime * 10) / 10, // Round to 1 decimal place
      endTime: Math.round(endTime * 10) / 10
    };
  });
}

/**
 * Extract YouTube video ID from URL or direct ID
 */
export function extractYouTubeVideoId(input: string): string | null {
  // Handle direct video IDs (11 characters)
  if (/^[A-Za-z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }

  // Handle YouTube URLs
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = input.match(youtubeRegex);
  return match ? match[1] : null;
}

/**
 * Extract song title and artist from YouTube video title
 * @param videoTitle The YouTube video title
 */
export function extractSongInfoFromYouTube(videoTitle: string): { title: string, artist: string } {
  // Remove common YouTube video title patterns
  let cleaned = videoTitle
    .replace(/\(Official (Music|Lyric|Video)\)/gi, '')
    .replace(/\[(Official (Music|Lyric|Video))\]/gi, '')
    .replace(/\(Official\)/gi, '')
    .replace(/\[Official\]/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\[Lyrics\]/gi, '')
    .replace(/\(Audio\)/gi, '')
    .replace(/\[Audio\]/gi, '')
    .replace(/\(Visualizer\)/gi, '')
    .replace(/\[Visualizer\]/gi, '')
    .replace(/\(Full (Video|Song)\)/gi, '')
    .replace(/\[Full (Video|Song)\]/gi, '')
    .replace(/HD|HQ|\d+p/gi, '')
    .trim();
  
  // Common separators between artist and title
  const separators = [' - ', ' – ', ' — ', ' | ', ' // ', ' ~ '];
  
  for (const separator of separators) {
    if (cleaned.includes(separator)) {
      const [artist, title] = cleaned.split(separator, 2);
      return { 
        artist: artist.trim(), 
        title: title.trim()
      };
    }
  }
  
  // If no separator found, try to guess based on common patterns
  const featMatch = cleaned.match(/^(.*?)\s+feat\.\s+(.*?)$/i);
  if (featMatch) {
    return { 
      artist: featMatch[1].trim(), 
      title: featMatch[2].trim()
    };
  }
  
  // As a fallback, return the whole string as title with no artist
  return { 
    artist: '', 
    title: cleaned 
  };
}

/**
 * Get lyrics for a song by title and artist
 */
export async function getLyricsForSong(
  songTitle: string, 
  artist: string = '', 
  options: { 
    useCache?: boolean,
    forceRapidApi?: boolean,
    youtubeVideoId?: string
  } = {}
): Promise<LyricsResult> {
  // Default options
  const { useCache = true, forceRapidApi = false, youtubeVideoId = null } = options;
  
  // Check if this is a YouTube URL or video ID
  const extractedVideoId = extractYouTubeVideoId(songTitle);
  
  // If we have a YouTube URL/ID but no explicit video ID was provided
  if (extractedVideoId && !youtubeVideoId) {
    try {
      // Get video info using YouTube API (implementation required outside)
      // For now we'll just use a placeholder
      const videoTitle = await getYouTubeVideoTitle(extractedVideoId);
      
      if (videoTitle) {
        const { title, artist: extractedArtist } = extractSongInfoFromYouTube(videoTitle);
        return getLyricsForSong(title, extractedArtist || artist, { 
          ...options, 
          youtubeVideoId: extractedVideoId 
        });
      }
    } catch (error) {
      console.error("Failed to get YouTube video info:", error);
      // Fall back to searching with the original input
    }
  }
  
  // Clean up inputs
  const cleanTitle = songTitle.trim();
  const cleanArtist = artist.trim();
  
  // Create a cache key
  const cacheKey = `lyrics:${cleanTitle}:${cleanArtist}`;
  
  // Check cache if enabled
  if (useCache) {
    const cachedLyrics = localStorage.getItem(cacheKey);
    if (cachedLyrics) {
      try {
        return JSON.parse(cachedLyrics);
      } catch (e) {
        // Invalid cache, continue with fetch
        localStorage.removeItem(cacheKey);
      }
    }
  }

  // Try different lyrics sources
  let result: LyricsResult = { lyrics: null, source: null, error: null };

  // Try RapidAPI first if forced or for specific artists
  if (forceRapidApi || shouldUseRapidApiForArtist(cleanArtist)) {
    try {
      result = await fetchLyricsViaRapidApi(cleanTitle, cleanArtist);
      if (result.lyrics) {
        if (useCache) {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        }
        return result;
      }
    } catch (error) {
      console.error("RapidAPI lyrics fetch failed:", error);
      // Continue to next source
    }
  }

  // Try Genius API
  try {
    result = await fetchLyricsViaGenius(cleanTitle, cleanArtist);
    if (result.lyrics) {
      if (useCache) {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      }
      return result;
    }
  } catch (error) {
    console.error("Genius lyrics fetch failed:", error);
    // Continue to next source
  }

  // Try direct lyrics search as fallback
  try {
    result = await searchDirectLyrics(cleanTitle, cleanArtist);
    if (result.lyrics) {
      if (useCache) {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      }
      return result;
    }
  } catch (error) {
    console.error("Direct lyrics search failed:", error);
    result.error = "Could not find lyrics for this song";
  }

  return result;
}

/**
 * Get YouTube video title by ID using the YouTube API
 */
async function getYouTubeVideoTitle(videoId: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error("YouTube API key is missing");
    return null;
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`
    );
    
    if (!response.ok) {
      throw new Error(`YouTube API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.title;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch YouTube video title:", error);
    return null;
  }
}

/**
 * Check if we should use RapidAPI for certain artists
 * Some artists have better results with specific APIs
 */
function shouldUseRapidApiForArtist(artist: string): boolean {
  const rapidApiPreferredArtists = [
    'taylor swift',
    'billie eilish',
    'ed sheeran',
    'adele',
    'drake',
  ].map(a => a.toLowerCase());
  
  return rapidApiPreferredArtists.some(preferredArtist => 
    artist.toLowerCase().includes(preferredArtist)
  );
}

/**
 * Fetch lyrics using RapidAPI
 */
export async function fetchLyricsViaRapidApi(
  title: string,
  artist: string = ""
): Promise<LyricsResult> {
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  
  if (!apiKey) {
    console.error("RapidAPI key is missing");
    return { lyrics: null, source: null, error: "API key not configured" };
  }
  
  // Properly encode parameters
  const encodedTitle = encodeURIComponent(title.trim());
  const encodedArtist = encodeURIComponent(artist.trim());
  
  // Build the search query based on available parameters
  let query = encodedTitle;
  if (encodedArtist) {
    query = `${encodedArtist} ${encodedTitle}`;
  }
  
  try {
    // First search for the song
    const searchResponse = await fetch(
      `https://genius-song-lyrics1.p.rapidapi.com/search?q=${query}&per_page=5`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "genius-song-lyrics1.p.rapidapi.com"
        }
      }
    );
    
    if (!searchResponse.ok) {
      throw new Error(`RapidAPI search returned ${searchResponse.status}: ${await searchResponse.text()}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.hits || searchData.hits.length === 0) {
      return { lyrics: null, source: null, error: "No results found" };
    }
    
    // Find the best match
    const bestMatch = findBestSongMatch(searchData.hits, title, artist);
    
    if (!bestMatch || !bestMatch.result || !bestMatch.result.id) {
      return { lyrics: null, source: null, error: "No matching song found" };
    }
    
    // Get the song ID and fetch lyrics
    const songId = bestMatch.result.id;
    
    const lyricsResponse = await fetch(
      `https://genius-song-lyrics1.p.rapidapi.com/song/lyrics/?id=${songId}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "genius-song-lyrics1.p.rapidapi.com"
        }
      }
    );
    
    if (!lyricsResponse.ok) {
      throw new Error(`RapidAPI lyrics returned ${lyricsResponse.status}: ${await lyricsResponse.text()}`);
    }
    
    const lyricsData = await lyricsResponse.json();
    
    if (!lyricsData.lyrics || !lyricsData.lyrics.lyrics || !lyricsData.lyrics.lyrics.body) {
      return { lyrics: null, source: "RapidAPI", error: "No lyrics in response" };
    }
    
    const rawLyrics = lyricsData.lyrics.lyrics.body;
    const cleanedLyrics = cleanLyrics(rawLyrics);
    
    // If lyrics are too short, likely incorrect or incomplete
    if (cleanedLyrics.length < 50) {
      return { lyrics: null, source: "RapidAPI", error: "Lyrics too short or incomplete" };
    }
    
    // Create timed lyrics
    const timedLyrics = createTimedLyrics(cleanedLyrics);
    
    return {
      lyrics: timedLyrics,
      source: "RapidAPI (Genius)",
      songInfo: {
        title: bestMatch.result.title,
        artist: bestMatch.result.primary_artist?.name || artist,
        artwork: bestMatch.result.header_image_url
      },
      error: null
    };
  } catch (error) {
    console.error("RapidAPI error:", error);
    return {
      lyrics: null,
      source: "RapidAPI",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Find the best matching song from search results
 */
function findBestSongMatch(hits: any[], title: string, artist: string): any {
  // If we have both title and artist, look for exact matches first
  if (artist) {
    const exactMatch = hits.find(hit => {
      const resultTitle = hit.result?.title?.toLowerCase() || "";
      const resultArtist = hit.result?.primary_artist?.name?.toLowerCase() || "";
      
      return (
        similarityScore(resultTitle, title.toLowerCase()) > 0.8 &&
        similarityScore(resultArtist, artist.toLowerCase()) > 0.7
      );
    });
    
    if (exactMatch) return exactMatch;
  }
  
  // Otherwise find the closest match based on title
  let bestMatch = hits[0];
  let bestScore = -1;
  
  for (const hit of hits) {
    const resultTitle = hit.result?.title?.toLowerCase() || "";
    const score = similarityScore(resultTitle, title.toLowerCase());
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = hit;
    }
  }
  
  // Only return if the score is reasonable
  return bestScore > 0.5 ? bestMatch : null;
}

/**
 * Calculate similarity between two strings (simple implementation)
 */
function similarityScore(str1: string, str2: string): number {
  // Remove common noise words
  const cleanStr1 = str1.replace(/\bthe\b|\ba\b|\ban\b|\band\b|\bor\b|\bin\b|\bon\b|\bat\b|\bto\b|\bfor\b/gi, "").trim();
  const cleanStr2 = str2.replace(/\bthe\b|\ba\b|\ban\b|\band\b|\bor\b|\bin\b|\bon\b|\bat\b|\bto\b|\bfor\b/gi, "").trim();
  
  // Check if one contains the other
  if (cleanStr1.includes(cleanStr2) || cleanStr2.includes(cleanStr1)) {
    return 0.9;
  }
  
  // Count matching words
  const words1 = cleanStr1.split(/\s+/);
  const words2 = cleanStr2.split(/\s+/);
  
  const uniqueWords1 = new Set(words1);
  const uniqueWords2 = new Set(words2);
  
  let matchCount = 0;
  for (const word of uniqueWords1) {
    if (uniqueWords2.has(word)) {
      matchCount++;
    }
  }
  
  const totalUniqueWords = new Set([...uniqueWords1, ...uniqueWords2]).size;
  return totalUniqueWords > 0 ? matchCount / totalUniqueWords : 0;
}

/**
 * Clean lyrics text from common formatting issues
 */
export function cleanLyrics(lyrics: string): string {
  if (!lyrics) return "";
  
  let cleanedLyrics = lyrics
    // Remove HTML tags
    .replace(/<[^>]*>?/gm, '')
    // Remove square brackets with content (e.g., [Verse 1], [Chorus])
    .replace(/\[[^\]]+\]/g, '')
    // Remove parentheses with content on separate lines (often annotations)
    .replace(/^\([^)]+\)$/gm, '')
    // Remove common embed codes and annotations
    .replace(/embed\d+/g, '')
    .replace(/\d+embed/g, '')
    // Remove Genius-specific formatting
    .replace(/\d+Genius/g, '')
    .replace(/Genius\d+/g, '')
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove excessive whitespace, including newlines
    .replace(/\n{3,}/g, '\n\n')
    // Fix common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Remove line numbering sometimes found in lyrics (e.g., "1.", "2.", etc.)
    .replace(/^\d+\.\s*/gm, '')
    // Remove "Lyrics" text commonly appearing at the start
    .replace(/^Lyrics\s*(\n|$)/i, '')
    // Remove content in parentheses at the end of lines (often annotations)
    .replace(/\s*\([^)]+\)$/gm, '')
    // Remove timestamps in various formats
    .replace(/\[\d+:\d+\]/g, '')
    .replace(/^\d+:\d+\s*/gm, '')
    // Remove common labels for song sections (often found without brackets)
    .replace(/^(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Refrain|Interlude)(\s*\d*):?\s*$/gim, '')
    // Trim whitespace from all lines and the entire string
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
  
  // Remove empty lines at the beginning and end
  cleanedLyrics = cleanedLyrics.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
  
  // Check for indicators of lyrics not being lyrics (e.g., error messages)
  const nonLyricsIndicators = [
    "copyright",
    "all rights reserved",
    "lyrics not available",
    "instrumental",
    "no lyrics found",
    "404",
    "not found",
    "error"
  ];
  
  // If text is very short or contains indicators, it's probably not valid lyrics
  if (cleanedLyrics.length < 20 || 
      nonLyricsIndicators.some(indicator => 
        cleanedLyrics.toLowerCase().includes(indicator))) {
    return "";
  }
  
  return cleanedLyrics;
}

// ... existing code ... 