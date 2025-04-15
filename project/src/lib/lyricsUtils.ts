// Add lyrics cache at the top of the file
const lyricsCache: Record<string, { lyrics: string, timestamp: number }> = {};
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function fetchLyrics(artist: string, title: string) {
  try {
    // Normalize artist and title for better search results
    const normalizedArtist = artist.trim().toLowerCase();
    const normalizedTitle = title.trim().toLowerCase();
    
    // Create a cache key
    const cacheKey = `${normalizedArtist}:${normalizedTitle}`;
    
    // Check if we have cached lyrics that aren't expired
    const cachedLyrics = lyricsCache[cacheKey];
    if (cachedLyrics && (Date.now() - cachedLyrics.timestamp < CACHE_EXPIRY)) {
      console.log(`Using cached lyrics for ${normalizedArtist} - ${normalizedTitle}`);
      return cachedLyrics.lyrics;
    }
    
    // Encode properly for URLs
    const encodedArtist = encodeURIComponent(normalizedArtist);
    const encodedTitle = encodeURIComponent(normalizedTitle);
    
    // Try first API endpoint - Lyrics.ovh
    try {
      console.log(`Fetching lyrics from lyrics.ovh for ${normalizedArtist} - ${normalizedTitle}`);
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodedArtist}/${encodedTitle}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.lyrics && data.lyrics.length > 10) {
          const cleanedLyrics = cleanLyrics(data.lyrics);
          // Cache the result
          lyricsCache[cacheKey] = { lyrics: cleanedLyrics, timestamp: Date.now() };
          return cleanedLyrics;
        }
      }
    } catch (error) {
      console.log('First lyrics API failed:', error);
    }
    
    // Try second API endpoint - happi.dev
    try {
      console.log(`Fetching lyrics from happi.dev for ${normalizedArtist} - ${normalizedTitle}`);
      const response = await fetch(
        `https://api.happi.dev/v1/music/artists/${encodedArtist}/songs/${encodedTitle}`,
        {
          headers: {
            "x-happi-key": import.meta.env.VITE_HAPPI_API_KEY || "YOUR_API_KEY",
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.lyrics && data.result.lyrics.length > 10) {
          const cleanedLyrics = cleanLyrics(data.result.lyrics);
          // Cache the result
          lyricsCache[cacheKey] = { lyrics: cleanedLyrics, timestamp: Date.now() };
          return cleanedLyrics;
        }
      }
    } catch (error) {
      console.log('Second lyrics API failed:', error);
    }
    
    // Try third fallback - RapidAPI Genius
    try {
      console.log(`Fetching lyrics from RapidAPI Genius for ${normalizedArtist} - ${normalizedTitle}`);
      
      // Step 1: Search for the song
      const searchResponse = await fetch(
        `https://genius-song-lyrics1.p.rapidapi.com/search?q=${encodedArtist}%20${encodedTitle}&per_page=5`,
        {
          headers: {
            'X-RapidAPI-Key': import.meta.env.VITE_RAPID_API_KEY || "YOUR_API_KEY",
            'X-RapidAPI-Host': 'genius-song-lyrics1.p.rapidapi.com',
          },
        }
      );
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.hits && searchData.hits.length > 0) {
          // Get the first hit's ID
          const songId = searchData.hits[0].result.id;
          
          // Step 2: Get lyrics with the song ID
          const lyricsResponse = await fetch(
            `https://genius-song-lyrics1.p.rapidapi.com/song/lyrics/?id=${songId}`,
            {
              headers: {
                'X-RapidAPI-Key': import.meta.env.VITE_RAPID_API_KEY || "YOUR_API_KEY",
                'X-RapidAPI-Host': 'genius-song-lyrics1.p.rapidapi.com',
              },
            }
          );
          
          if (lyricsResponse.ok) {
            const lyricsData = await lyricsResponse.json();
            if (lyricsData.lyrics && lyricsData.lyrics.lyrics && lyricsData.lyrics.lyrics.body) {
              const cleanedLyrics = cleanLyrics(lyricsData.lyrics.lyrics.body.plain);
              // Cache the result
              lyricsCache[cacheKey] = { lyrics: cleanedLyrics, timestamp: Date.now() };
              return cleanedLyrics;
            }
          }
        }
      }
    } catch (error) {
      console.log('Third lyrics API failed:', error);
    }
    
    // Final fallback - placeholders when no lyrics found
    const placeholderLyrics = generatePlaceholderLyrics(title, artist);
    // Cache the placeholder too, but with a shorter expiry (we'll set it to expire in an hour)
    lyricsCache[cacheKey] = { lyrics: placeholderLyrics, timestamp: Date.now() - (CACHE_EXPIRY - 3600000) };
    return placeholderLyrics;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return generatePlaceholderLyrics(title, artist);
  }
}

// Add functions to manage cache
export function clearLyricsCache(): void {
  Object.keys(lyricsCache).forEach(key => {
    delete lyricsCache[key];
  });
  console.log('Lyrics cache cleared');
}

export function getCacheSize(): number {
  return Object.keys(lyricsCache).length;
}

function generatePlaceholderLyrics(title: string, artist: string): string {
  // Create a placeholder with the song title and artist
  return `[No lyrics found for "${title}" by ${artist}]\n\nYou can still practice typing with this placeholder.\nFeel free to add your own lyrics or try another song.`;
}

function cleanLyrics(lyrics: string): string {
  if (!lyrics) return '';
  
  // Replace common formatting issues
  let cleaned = lyrics
    .replace(/\[.*?\]/g, '') // Remove text in square brackets
    .replace(/\(.*?\)/g, '') // Remove text in parentheses
    .replace(/\r\n/g, '\n')   // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Limit to max 2 consecutive new lines
    .replace(/^\s+|\s+$/g, ''); // Trim whitespace at start/end
  
  // Filter out common metadata lines
  const metadataPatterns = [
    /^lyrics by .*/i,
    /^written by .*/i,
    /^composed by .*/i,
    /^produced by .*/i,
    /^published by .*/i,
    /^copyright .*/i,
    /^embed$/i,
    /^submit corrections$/i,
    /^.*?lyrics are property and copyright .*/i,
  ];
  
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmedLine = line.trim();
    return trimmedLine !== '' && !metadataPatterns.some(pattern => pattern.test(trimmedLine));
  });
  
  return filteredLines.join('\n');
} 