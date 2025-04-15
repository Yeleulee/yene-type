import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTypingStore } from '../store/typingStore';
import { fetchLyrics, formatTime, LyricLine } from '../lib/lyrics';
import { LyricsInfo } from './LyricsInfo';
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
          
          // Update the current time in the typing store for synchronization
          useTypingStore.getState().updateCurrentTime(data.info.currentTime || 0);
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

  // Poll for current time updates to ensure synchronization
  useEffect(() => {
    const syncTimer = setInterval(() => {
      if (!isLoading && iframeRef.current && initialLoadRef.current) {
        try {
          // Use the postMessage API to get the current time from the player
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'getCurrentTime',
            }),
            '*'
          );
          
          // Also update the typing store with the current time
          useTypingStore.getState().updateCurrentTime(currentTime);
        } catch (e) {
          console.warn('Error syncing time:', e);
        }
      }
    }, 100); // Poll more frequently for better sync
    
    return () => clearInterval(syncTimer);
  }, [currentTime, isLoading]);

  // Function to load lyrics with better error handling
  const loadLyrics = useCallback(async (videoId: string) => {
    try {
      console.log("YouTubePlayer: Loading lyrics for video ID:", videoId);
      setIsLoading(true);
      
      // Make it clear we're trying to fetch from Musixmatch API
      setSongInfo({
        title: 'Loading lyrics from Musixmatch...',
        artist: 'Please wait'
      });
      
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

  // Handle iframe load with improved synchronization
  const handleIframeLoad = useCallback(() => {
    console.log("YouTubePlayer: iframe loaded");
    setIsLoading(false);
    setIsPlaying(true);
    useTypingStore.getState().setIsPlaying(true);
    
    // Reset current time and force sync when video loads
    setCurrentTime(0);
    useTypingStore.getState().updateCurrentTime(0);
    
    // Notify typing store that video has loaded
    useTypingStore.getState().setVideoLoaded(true);
    
  }, [setIsPlaying]);
  
  return (
    <motion.div 
      className={`w-full rounded-xl overflow-hidden relative ${
        isDark ? 'bg-slate-900 shadow-lg shadow-black/50' : 'bg-white shadow-xl shadow-indigo-200/20'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Player Container with fixed aspect ratio */}
      <div className="relative aspect-video w-full bg-black overflow-hidden" ref={playerContainerRef}>
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
        
        {/* Progress indicator - stay on top of other elements */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 z-10 bg-black/40 pointer-events-none">
          <div 
            className="h-full bg-indigo-500"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        
        {/* Audio Only Mode Overlay */}
        {isAudioOnly && (
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-indigo-900 to-slate-900 flex flex-col items-center justify-center">
            <div 
              className={`w-24 h-24 rounded-full flex items-center justify-center mb-3 ${
                isDark ? 'bg-indigo-500/30' : 'bg-indigo-100'
              }`}
            >
              <Music className="text-white w-12 h-12" />
            </div>
            
            <div className="text-center px-4">
              <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{songInfo.title}</h3>
              <p className="text-indigo-200 mb-4 line-clamp-1">{songInfo.artist}</p>
            </div>
            
            {/* Audio visualizer bars */}
            <div className="flex items-end justify-center h-14 gap-0.5 mt-1 px-4">
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
            
            <div className="mt-4 text-center max-w-xl text-white font-medium px-4">
              <p className="text-sm">
                {isPlaying ? "Music playing in audio-only mode" : "Press play to continue"}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
            
            {/* Return to video button */}
            <button
              onClick={toggleAudioOnly}
              className="mt-6 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition-colors shadow-md backdrop-blur-sm"
            >
              <Youtube size={18} />
              <span>Return to Video</span>
            </button>
          </div>
        )}
        
        {/* Audio mode toggle button - positioned on the right */}
        <div 
          className={`absolute bottom-8 right-4 z-20 ${
            isAudioOnly ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button 
            onClick={toggleAudioOnly}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors text-white backdrop-blur-sm shadow-md"
            title="Switch to audio-only mode"
          >
            <Music className="w-5 h-5" />
          </button>
        </div>
        
        {/* Loading overlay - highest z-index */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-white text-center p-5 rounded-lg bg-black/60">
              <div className="w-14 h-14 mx-auto relative mb-3">
                <div className="animate-spin h-full w-full rounded-full border-3 border-indigo-400/20 border-t-indigo-400"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music className="text-indigo-400 w-5 h-5" />
                </div>
              </div>
              <p className="text-base font-medium mb-1">Loading song...</p>
              <p className="text-xs text-slate-300">This may take a moment</p>
            </div>
          </div>
        )}
        
        {/* Error overlay - highest z-index */}
        {loadError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-white text-center p-5 rounded-lg bg-black/60 max-w-md mx-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Info className="text-rose-400 w-7 h-7" />
              </div>
              <p className="text-base font-medium mb-3">{loadError}</p>
              <button 
                onClick={() => setLoadError(null)}
                className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Try anyway
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Add Lyrics Info Component */}
      <LyricsInfo videoId={videoId} isDark={isDark} />
      
      {/* Song Details */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
            isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
          }`}>
            <Music className={`${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} size={18} />
          </div>
          
          <div className="overflow-hidden">
            <h3 className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {songInfo.title}
            </h3>
            <p className={`truncate text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
        
        <div className={`p-3 rounded-lg text-sm ${
          isDark 
            ? 'bg-slate-800/50' 
            : 'bg-slate-50'
        }`}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader className={`w-4 h-4 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Loading lyrics for typing practice...
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Info className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {initialLoadRef.current
                  ? "Lyrics ready! Start typing along with the song."
                  : "Waiting for lyrics to load. The song will play shortly."}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}