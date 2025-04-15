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
 * Convert raw lyrics to timed lyrics format with better handling of Musixmatch formatting
 */
export function convertToTimedLyrics(lyricsText: string): LyricLine[] {
  if (!lyricsText || typeof lyricsText !== 'string') {
    console.error('Invalid lyrics text:', lyricsText);
    return [];
  }
  
  // Remove disclaimer text that Musixmatch adds to free tier responses
  const cleanLyrics = lyricsText
    .replace(/\.{3}\d+ Usage of Musixmatch content.*/s, '') // Remove disclaimer
    .replace(/\*{3}This Lyrics is NOT for Commercial use\*{3}/gi, '') // Remove license notice
    .replace(/This lyrics is NOT for Commercial use.*/gi, '') // Alternative license notice
    .replace(/\d+ Usage of Musixmatch content/g, '') // Yet another disclaimer format
    .replace(/\*{3,}/g, '') // Remove asterisk dividers
    .trim();
  
  // Split into lines and apply enhanced filtering
  const rawLines = cleanLyrics.split('\n');
  const filteredLines = [];
  
  // Track verse markers to convert them to actual lines
  let currentSection = '';
  
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    
    // Skip empty lines and common formatting markers
    if (!line || line === '...' || /^\*+$/.test(line)) {
      continue;
    }
    
    // Handle section markers [Verse], [Chorus], etc.
    if (/^\[(.*?)\]$/.test(line)) {
      const sectionMatch = line.match(/^\[(.*?)\]$/);
      if (sectionMatch && sectionMatch[1]) {
        currentSection = sectionMatch[1];
      }
      continue;
    }
    
    // Process and clean regular lines
    let processedLine = line
      .replace(/\s*\*+\s*$/, '') // Remove trailing asterisks
      .replace(/\(\s*\)/, '') // Remove empty parentheses
      .replace(/^[\d:]+\s*/, '') // Remove timestamps at start of line
      .trim();
      
    // Skip lines that are timestamps or usage notices
    if (/^[\d:]+ Usage of Musixmatch content$/.test(processedLine) || 
        /^\d+:\d+$/.test(processedLine)) {
      continue;
    }
    
    // Add the section prefix to the first line after a section marker (optional)
    if (currentSection && filteredLines.length === 0) {
      processedLine = `[${currentSection}] ${processedLine}`;
      currentSection = ''; // Reset so it's only added once
    }
    
    // Only add if we have actual content
    if (processedLine.length > 0) {
      filteredLines.push(processedLine);
    }
  }
  
  // Remove duplicate consecutive lines (common in Musixmatch lyrics)
  const uniqueLines: string[] = [];
  for (let i = 0; i < filteredLines.length; i++) {
    // Only add if it's not a duplicate of the previous line
    if (i === 0 || filteredLines[i] !== filteredLines[i-1]) {
      uniqueLines.push(filteredLines[i]);
    }
  }
  
  // If we ended up with no lines after cleaning, return empty array
  if (uniqueLines.length === 0) {
    console.error('No valid lyrics lines after processing');
    return [];
  }
  
  // Create timing with 3 seconds per line as a baseline
  const SECONDS_PER_LINE = 3;
  
  return uniqueLines.map((text, index) => ({
    text,
    startTime: index * SECONDS_PER_LINE,
    endTime: (index + 1) * SECONDS_PER_LINE - 0.1
  }));
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
    .replace(/ft\.?|feat\.?|official|lyrics|video|audio|hd|4k/gi, "") // Remove common video title terms
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .trim();
    
  const cleanArtist = artist
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/official|music|vevo|channel/gi, "")
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
    const firstWord = cleanArtist.split(" ")[0];
    // Only use first word if it's not a common prefix like "The", "A", etc.
    if (firstWord.length > 2 && !["the", "a", "an", "los", "las", "el", "la", "die", "der", "das"].includes(firstWord.toLowerCase())) {
      searchAttempts.push({
        title: cleanTitle,
        artist: firstWord,
        description: "title with first word of artist"
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
  }
  
  return result;
} 