/**
 * Parse a YouTube video title to extract artist and song title
 */
export function parseTitle(title: string): { artist: string; title: string } {
  if (!title) {
    return { artist: '', title: '' };
  }

  // Clean up the title
  let cleanTitle = title
    .replace(/\(Official\s*(Music|Lyric|Audio|Video)\)/gi, '')
    .replace(/\[Official\s*(Music|Lyric|Audio|Video)\]/gi, '')
    .replace(/\(Official\)/gi, '')
    .replace(/\[Official\]/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\[Lyrics\]/gi, '')
    .replace(/\(Audio\)/gi, '')
    .replace(/\[Audio\]/gi, '')
    .replace(/\(Visualizer\)/gi, '')
    .replace(/\[Visualizer\]/gi, '')
    .replace(/\(Lyric Video\)/gi, '')
    .replace(/\[Lyric Video\]/gi, '')
    .replace(/\(Music Video\)/gi, '')
    .replace(/\[Music Video\]/gi, '')
    .replace(/\(Explicit\)/gi, '')
    .replace(/\[Explicit\]/gi, '')
    .replace(/\(Clean\)/gi, '')
    .replace(/\[Clean\]/gi, '')
    .replace(/\(HD\)/gi, '')
    .replace(/\[HD\]/gi, '')
    .replace(/\(HQ\)/gi, '')
    .replace(/\[HQ\]/gi, '')
    .replace(/\d{4} *(\[|\()?NEW(\]|\))?/gi, '')
    .replace(/\(\d{4}\)/gi, '')
    .replace(/\[\d{4}\]/gi, '')
    .trim();

  // Common separators between artist and title
  const separators = [' - ', ' – ', ' — ', ' | ', ': ', ' :: '];
  
  // Check for common separators
  for (const separator of separators) {
    if (cleanTitle.includes(separator)) {
      const [artist, ...titleParts] = cleanTitle.split(separator);
      return { 
        artist: artist.trim(), 
        title: titleParts.join(separator).trim() 
      };
    }
  }
  
  // Check for "by" pattern (e.g., "Song Title by Artist Name")
  const byMatch = cleanTitle.match(/^(.+)\s+by\s+(.+)$/i);
  if (byMatch) {
    return { 
      title: byMatch[1].trim(), 
      artist: byMatch[2].trim() 
    };
  }
  
  // Check for quotes pattern (e.g., Artist Name "Song Title")
  const quoteMatch = cleanTitle.match(/^(.+)\s+"(.+)"$/);
  if (quoteMatch) {
    return { 
      artist: quoteMatch[1].trim(), 
      title: quoteMatch[2].trim() 
    };
  }
  
  // If we reach here, we couldn't split the title
  // Return the whole thing as the title with empty artist
  return { artist: '', title: cleanTitle };
} 