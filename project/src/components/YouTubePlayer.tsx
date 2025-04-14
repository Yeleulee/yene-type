import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTypingStore } from '../store/typingStore';
import { fetchLyrics, formatTime, LyricLine } from '../lib/lyrics';
import { 
  Music, 
  PlayCircle, 
  PauseCircle, 
  Volume2, 
  VolumeX,
  Clock,
  Loader,
  Info,
  ExternalLink,
  Youtube,
  AlertTriangle
} from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  isDark?: boolean;
}

interface SongInfo {
  title: string;
  artist: string;
}

export function YouTubePlayer({ videoId, isDark = false }: YouTubePlayerProps) {
  const { changeSong, isPlaying, setIsPlaying } = useTypingStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [songInfo, setSongInfo] = useState<SongInfo>({
    title: 'Loading...',
    artist: 'Please wait'
  });
  
  // References
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const previousVideoId = useRef<string | null>(null);
  const initialLoadRef = useRef<boolean>(false);

  // Create YouTube iframe API URL with better parameters
  const youtubeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&widget_referrer=${encodeURIComponent(window.location.href)}`;

  // Load lyrics when video ID changes
  useEffect(() => {
    if (previousVideoId.current !== videoId) {
      console.log("YouTubePlayer: Video ID changed - Old:", previousVideoId.current, "New:", videoId);
      setIsLoading(true);
      setLoadError(null);
      initialLoadRef.current = false;
      
      // Load lyrics
      loadLyrics(videoId);
      
      // Track the new ID
      previousVideoId.current = videoId;
      
      // Set playing state to true
      useTypingStore.getState().setIsPlaying(true);
      
      // Clear loading state after a timeout (in case loading takes too long)
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 3000);
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [videoId]);

  // Set up message listener for iframe API communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from YouTube
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        
        // Handle YouTube API events
        if (data.event === 'onStateChange') {
          // 1 = playing, 2 = paused
          const isCurrentlyPlaying = data.info === 1;
          setIsPlaying(isCurrentlyPlaying);
          useTypingStore.getState().setIsPlaying(isCurrentlyPlaying);
          
          if (data.info === 1) {
            setIsLoading(false);
          }
        }
        
        // Update current time for better synchronization
        if (data.event === 'onTimeUpdate') {
          setCurrentTime(data.info.currentTime || 0);
        }
        
        // Handle duration changes
        if (data.event === 'onReady' || data.event === 'onDurationChange') {
          setDuration(data.info.duration || 0);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Function to load lyrics with better error handling
  const loadLyrics = useCallback(async (videoId: string) => {
    try {
      console.log("YouTubePlayer: Loading lyrics for video ID:", videoId);
      const song = await fetchLyrics(videoId);
      
      setSongInfo({
        title: song.title || 'Unknown Title',
        artist: song.artist || 'Unknown Artist'
      });
      
      // Ensure we have valid lyrics
      if (song.lyrics && song.lyrics.length > 0) {
        console.log("YouTubePlayer: Lyrics loaded successfully, lines:", song.lyrics.length);
        
        // Format lyrics for typing practice
        const enhancedLyrics = song.lyrics.map(lyric => ({
          ...lyric,
          text: lyric.text.trim()
        }));
        
        const combinedText = enhancedLyrics.map(lyric => lyric.text).join(' ');
        
        // Apply lyrics to the typing store
        changeSong(enhancedLyrics, combinedText);
        initialLoadRef.current = true;
        setIsLoading(false);
        
        // Apply a second time after a delay to ensure it takes effect
        setTimeout(() => {
          changeSong(enhancedLyrics, combinedText);
        }, 500);
      } else {
        throw new Error('No lyrics found for this song');
      }
    } catch (error) {
      console.error("YouTubePlayer: Error loading lyrics:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      setLoadError(`Failed to load lyrics: ${errorMessage}. Please try another song.`);
      setIsLoading(false);
    }
  }, [changeSong]);

  // Toggle audio-only mode
  const toggleAudioOnly = useCallback(() => {
    setIsAudioOnly(prev => !prev);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    
    // We can't directly control the iframe's mute state without the API
    // But we can show the controls and let users handle it there
  }, []);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    console.log("YouTubePlayer: iframe loaded");
    setIsLoading(false);
    setIsPlaying(true);
    useTypingStore.getState().setIsPlaying(true);
    
    // Set up timer to check progress
    const progressTimer = setInterval(() => {
      if (iframeRef.current && initialLoadRef.current) {
        // Send message to iframe to update current time
        try {
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'getCurrentTime' }),
            'https://www.youtube.com'
          );
        } catch (e) {
          // Ignore errors
        }
      }
    }, 500);
    
    return () => clearInterval(progressTimer);
  }, [setIsPlaying]);
  
  return (
    <motion.div 
      className={`w-full rounded-xl overflow-hidden relative ${
        isDark ? 'bg-slate-900 shadow-lg shadow-black/50' : 'bg-white shadow-xl shadow-indigo-200/20'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Player Container */}
      <div className="relative aspect-video w-full bg-black" ref={playerContainerRef}>
        {/* Direct YouTube iFrame */}
        <iframe
          ref={iframeRef}
          src={youtubeUrl}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={handleIframeLoad}
        ></iframe>
        
        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 z-30 bg-black/40">
          <div 
            className="h-full bg-indigo-500"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        
        {/* Audio Only Mode Overlay */}
        {isAudioOnly && (
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-indigo-900 to-slate-900 flex flex-col items-center justify-center">
            <div 
              className={`w-28 h-28 rounded-full flex items-center justify-center mb-4 ${
                isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
              }`}
            >
              <Music className="text-white w-14 h-14" />
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-1">{songInfo.title}</h3>
              <p className="text-indigo-200 mb-4">{songInfo.artist}</p>
            </div>
            
            {/* Audio visualizer bars */}
            <div className="flex items-end justify-center h-16 gap-0.5 mt-2">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-indigo-400/80 rounded-t-full"
                  animate={{
                    height: isPlaying 
                      ? [Math.random() * 10 + 2, Math.random() * 40 + 10, Math.random() * 15 + 5]
                      : [Math.random() * 5 + 2]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: i * 0.05
                  }}
                />
              ))}
            </div>
            
            <div className="mt-6 text-center max-w-xl text-white font-medium">
              <p className="text-lg">
                {isPlaying ? "Music playing in audio-only mode" : "Press play to continue"}
              </p>
              <p className="text-sm text-white/60 mt-2">
                Current time: {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
          </div>
        )}
        
        {/* Controls Overlay */}
        <div className={`absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent 
          flex items-center justify-between z-20 ${isAudioOnly ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="flex items-center gap-2 text-white">
            <button 
              onClick={toggleAudioOnly}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              title={isAudioOnly ? "Show video" : "Audio only mode"}
            >
              {isAudioOnly ? (
                <Youtube className="w-5 h-5" />
              ) : (
                <Music className="w-5 h-5" />
              )}
            </button>
            
            <button 
              onClick={toggleMute}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            
            {/* Time display */}
            <div className="ml-3 text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-white text-center p-6 rounded-lg bg-black/40">
              <div className="w-16 h-16 mx-auto relative mb-4">
                <div className="animate-spin h-full w-full rounded-full border-4 border-indigo-400/20 border-t-indigo-400"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music className="text-indigo-400 w-6 h-6" />
                </div>
              </div>
              <p className="text-lg font-medium mb-1">Loading song data...</p>
              <p className="text-sm text-slate-300 mb-4">This may take a moment</p>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {loadError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-white text-center p-6 rounded-lg bg-black/40 max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Info className="text-rose-400 w-8 h-8" />
              </div>
              <p className="text-lg font-medium mb-3">{loadError}</p>
              <button 
                onClick={() => setLoadError(null)}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Try anyway
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Song Details */}
      <div className="p-4">
        <div className="flex items-center gap-4 mb-3">
          <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${
            isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
          }`}>
            <Music className={`${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} size={20} />
          </div>
          
          <div className="overflow-hidden">
            <h3 className={`font-bold text-lg truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {songInfo.title}
            </h3>
            <p className={`truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {songInfo.artist}
            </p>
          </div>
          
          <a 
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`ml-auto p-2 rounded-lg ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title="Open in YouTube"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        
        <div className={`p-4 rounded-lg text-sm ${
          isDark 
            ? isLoading ? 'bg-slate-800/50' : 'bg-slate-800/50' 
            : isLoading ? 'bg-indigo-50' : 'bg-slate-50'
        }`}>
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Loader className={`w-5 h-5 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                Loading lyrics for typing practice...
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Info className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                {initialLoadRef.current
                  ? "Lyrics are now ready! Click in the typing area below and start typing along with the song."
                  : "Waiting for lyrics to load. The song will play shortly."}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}