function parseLyricsWithTiming(lyricsText: string): LyricsLine[] {
  if (!lyricsText) return [];
  
  const lines = lyricsText.split('\n');
  const result: LyricsLine[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check for different time formats
    // [mm:ss.ms] format
    const bracketTimeMatch = line.match(/^\[((\d+):(\d+)(?:\.(\d+))?)\](.*)/);
    // (mm:ss.ms) format
    const parenthesisTimeMatch = line.match(/^\(((\d+):(\d+)(?:\.(\d+))?)\)(.*)/);
    // mm:ss.ms format at start
    const plainTimeMatch = line.match(/^((\d+):(\d+)(?:\.(\d+))?)\s+(.*)/);
    // mm:ss format
    const simpleTimeMatch = line.match(/^((\d+):(\d+))\s+(.*)/);
    
    if (bracketTimeMatch || parenthesisTimeMatch || plainTimeMatch || simpleTimeMatch) {
      const match = bracketTimeMatch || parenthesisTimeMatch || plainTimeMatch || simpleTimeMatch;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const milliseconds = match[4] ? parseInt(match[4].padEnd(3, '0').substring(0, 3), 10) : 0;
      
      const startTime = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[5].trim();
      
      if (text) {
        result.push({
          id: `line-${i}`,
          text,
          startTime,
          endTime: 0,  // Will be calculated later
        });
      }
    } else {
      // Line without timing info
      result.push({
        id: `line-${i}`,
        text: line,
        startTime: result.length > 0 ? result[result.length - 1].startTime + 4 : 0,
        endTime: 0,
      });
    }
  }
  
  // Calculate end times (end time is the start time of the next line)
  for (let i = 0; i < result.length - 1; i++) {
    result[i].endTime = result[i + 1].startTime;
  }
  
  // For the last line, add a reasonable end time
  if (result.length > 0) {
    const lastLine = result[result.length - 1];
    // End time is either 4 seconds after start time or 1 second for short lines
    lastLine.endTime = lastLine.startTime + (lastLine.text.length > 10 ? 4 : 1);
  }
  
  return result;
} 