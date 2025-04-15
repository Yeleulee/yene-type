import React from 'react';
import { Info, MessageCircle, AlertCircle, Music, Loader } from 'lucide-react';
import { useTypingStore } from '../store/typingStore';

interface LyricsInfoProps {
  videoId: string;
  isDark?: boolean;
}

export function LyricsInfo({ videoId, isDark = false }: LyricsInfoProps) {
  const { lyrics, currentLyric, isPlaying } = useTypingStore();
  const [lyricsSource, setLyricsSource] = React.useState<'demo' | 'api' | 'fallback' | 'loading'>('loading');
  const [infoMessage, setInfoMessage] = React.useState<string>('Loading lyrics...');

  // Determine the source of lyrics
  React.useEffect(() => {
    if (!lyrics || lyrics.length === 0) {
      setLyricsSource('loading');
      setInfoMessage('Loading lyrics from Musixmatch...');
      return;
    }

    // Check if it's one of our demo songs
    const demoSongIds = [
      'dQw4w9WgXcQ', // Rick Astley
      'fJ9rUzIMcZQ', // Queen
      'JGwWNGJdvx8', // Ed Sheeran
      'kJQP7kiw5Fk', // Despacito
      'OPf0YbXqDm0', // Uptown Funk
      'YQHsXMglC9A', // Adele
    ];

    if (demoSongIds.includes(videoId)) {
      setLyricsSource('demo');
      setInfoMessage('Using built-in lyrics (perfect sync)');
    } else if (lyrics.length > 12) {
      // If we have more than 12 lyric lines, it's likely from the API
      // (our fallback always has 12 or fewer lines)
      setLyricsSource('api');
      setInfoMessage('Using real lyrics from Musixmatch API');
    } else {
      setLyricsSource('fallback');
      setInfoMessage('Using generated lyrics (song not found in Musixmatch)');
    }
  }, [lyrics, videoId]);

  // Don't show anything if we don't have lyrics yet and we're not in the loading state
  if ((!lyrics || lyrics.length === 0) && lyricsSource !== 'loading') return null;

  // Render appropriate information based on lyrics source
  return (
    <div className={`mt-2 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
      isDark 
        ? 'bg-slate-800/70 text-slate-300' 
        : 'bg-slate-100 text-slate-600'
    }`}>
      {lyricsSource === 'loading' && (
        <Loader className="w-4 h-4 text-blue-500 animate-spin" />
      )}
      {lyricsSource === 'demo' && (
        <Info className="w-4 h-4 text-blue-500" />
      )}
      {lyricsSource === 'api' && (
        <Music className="w-4 h-4 text-green-500" />
      )}
      {lyricsSource === 'fallback' && (
        <AlertCircle className="w-4 h-4 text-amber-500" />
      )}
      <span>{infoMessage}</span>
      {lyricsSource === 'api' && (
        <span className="text-xs opacity-75 ml-auto">Powered by Musixmatch</span>
      )}
    </div>
  );
} 