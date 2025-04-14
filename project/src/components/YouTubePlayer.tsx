import React, { useEffect, useState, useRef, useCallback } from 'react';
import YouTube, { YouTubePlayer as Player, YouTubeEvent } from 'react-youtube';
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
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [songInfo, setSongInfo] = useState<SongInfo>({
    title: 'Loading...',
    artist: 'Please wait'
  });
  
  const timerRef = useRef<number | null>(null);
  const previousVideoId = useRef<string | null>(null);
  const syncAttemptsRef = useRef<number>(0);
  const initialLoadRef = useRef<boolean>(false);
  const changeSongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (changeSongTimeoutRef.current) {
        clearTimeout(changeSongTimeoutRef.current);
      }
      if (errorRetryTimeoutRef.current) {
        clearTimeout(errorRetryTimeoutRef.current);
      }
    };
  }, []);

  // Reset loading state and preload lyrics when video ID changes
  useEffect(() => {
    if (previousVideoId.current !== videoId) {
      // Immediately reset all states
      setIsLoading(true);
      setLoadError(null);
      syncAttemptsRef.current = 0;
      initialLoadRef.current = false;
      
      // Clear any previous player
      if (player) {
        try {
          player.stopVideo();
        } catch (e) {
          console.warn("Could not stop previous video:", e);
        }
      }
      
      // Load lyrics immediately
      loadLyrics(videoId, false);
      
      // Track the new ID
      previousVideoId.current = videoId;
    }
  }, [videoId, player]);

  // The loadLyrics function with improved error handling
  const loadLyrics = useCallback(async (videoId: string, isPreload = false) => {
    // Clear any existing error retry timeout
    if (errorRetryTimeoutRef.current) {
      clearTimeout(errorRetryTimeoutRef.current);
      errorRetryTimeoutRef.current = null;
    }

    try {
      if (!isPreload) {
        setIsLoading(true);
      }
      
      const song = await fetchLyrics(videoId);
      
      setSongInfo({
        title: song.title,
        artist: song.artist
      });
      
      // Ensure we have valid lyrics before proceeding
      if (song.lyrics && song.lyrics.length > 0) {
        // Format lyrics better for typing practice - add proper spacing
        const enhancedLyrics = song.lyrics.map(lyric => ({
          ...lyric,
          text: lyric.text.trim() // Ensure clean text
        }));
        
        const combinedText = enhancedLyrics.map(lyric => lyric.text).join(' ');
        
        // Apply lyrics to the typing store
        changeSong(enhancedLyrics, combinedText);
        initialLoadRef.current = true;
        
        if (!isPreload) {
          setIsLoading(false);
        }
        
        // Set a backup timeout to re-apply lyrics if needed
        if (changeSongTimeoutRef.current) {
          clearTimeout(changeSongTimeoutRef.current);
        }
        
        changeSongTimeoutRef.current = setTimeout(() => {
          changeSong(enhancedLyrics, combinedText);
          changeSongTimeoutRef.current = null;
        }, 1000);
      } else {
        // Handle empty lyrics case
        throw new Error('No lyrics found for this song');
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      setLoadError(`Failed to load lyrics: ${errorMessage}. Please try another song.`);
      
      // Retry immediately after error if it's not already a retry attempt
      if (syncAttemptsRef.current < 3) {
        syncAttemptsRef.current++;
        
        errorRetryTimeoutRef.current = setTimeout(() => {
          loadLyrics(videoId, false);
          errorRetryTimeoutRef.current = null;
        }, 800);
      }
      
      if (!isPreload) {
        setIsLoading(false);
      }
    }
  }, [changeSong]);

  const toggleAudioOnly = useCallback(() => {
    setIsAudioOnly(prev => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    if (!player) return;
    
    try {
    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
    } catch (error) {
      console.warn('Error toggling mute state:', error);
    }
  }, [player, isMuted]);

  const onReady = useCallback((event: YouTubeEvent) => {
    setPlayer(event.target);
    setDuration(event.target.getDuration() || 0);
    
    // Immediately clear loading state when player is ready
    setIsLoading(false);
    
    // Apply optimal settings for fast playback
    try {
      // Faster loading with lower quality
      event.target.setPlaybackQuality('small');
      
      // Set playing state in typing store before starting playback
      useTypingStore.getState().setIsPlaying(true);
      
      // Start playing immediately
      event.target.playVideo();
      
      // Force immediate lyrics load when player is ready
      if ((!initialLoadRef.current || syncAttemptsRef.current < 1) && videoId) {
        loadLyrics(videoId, false); // Not a preload - force immediate load
      }
    } catch (e) {
      console.warn("Error setting initial player state:", e);
    }
    
    // Clear any existing timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    
    // Set up a timer to update the time display
    timerRef.current = window.setInterval(() => {
      try {
        const currentTime = event.target.getCurrentTime() || 0;
        setCurrentTime(currentTime);
        
        const playerState = event.target.getPlayerState();
        const isCurrentlyPlaying = playerState === 1;
        
        // Only update if the state actually changed
        if (isPlaying !== isCurrentlyPlaying) {
          setIsPlaying(isCurrentlyPlaying);
          // Ensure typing store is updated when playing state changes
          useTypingStore.getState().setIsPlaying(isCurrentlyPlaying);
        }
        
        // Force lyrics loading if playing but no lyrics
        if (isCurrentlyPlaying && !initialLoadRef.current && syncAttemptsRef.current < 2) {
          loadLyrics(videoId, false);
          syncAttemptsRef.current++;
        }
      } catch (e) {
        console.warn("Error in player timer update:", e);
      }
    }, 100); // Slightly less frequent updates for better performance
  }, [videoId, isPlaying, loadLyrics, setIsPlaying]);

  const onStateChange = useCallback((event: YouTubeEvent) => {
    const playerState = event.data;
    // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
    const isCurrentlyPlaying = playerState === 1;
    setIsPlaying(isCurrentlyPlaying);
    useTypingStore.getState().setIsPlaying(isCurrentlyPlaying);
    
    // Clear loading state when video starts playing
    if (playerState === 1) {
      setIsLoading(false);
      
      // Force update the current time
      try {
        const currentTime = event.target.getCurrentTime();
        setCurrentTime(currentTime);
      } catch (e) {
        console.warn("Error getting current time:", e);
      }
      
      // When playback starts but initialization not complete
      if (!initialLoadRef.current && syncAttemptsRef.current < 2) {
        loadLyrics(videoId, false);
        syncAttemptsRef.current++;
      }
    }
  }, [videoId, loadLyrics, setIsPlaying]);

  const onError = useCallback((error: any) => {
    console.error("YouTube player error:", error);
    const errorCode = error?.data || 'unknown';
    let errorMessage = 'Unknown error occurred';
    
    // Map YouTube error codes to human-readable messages
    switch(errorCode) {
      case 2:
        errorMessage = 'Invalid video ID';
        break;
      case 5:
        errorMessage = 'Video cannot be played in the player';
        break;
      case 100:
        errorMessage = 'Video not found';
        break;
      case 101:
      case 150:
        errorMessage = 'Video cannot be played in embedded players';
        break;
    }
    
    setLoadError(`Error loading YouTube video: ${errorMessage}`);
    setIsLoading(false);
  }, []);

  // Optimize YouTube player options for faster loading
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      // Performance optimizations
      vq: 'small', // Start with lower quality for faster initial load
      disablekb: 0, // Allow keyboard controls
      iv_load_policy: 3, // Hide annotations
      fs: 1, // Allow fullscreen
      origin: window.location.origin,
      enablejsapi: 1,
    },
  };

  const renderProgressBar = () => {
    const progress = duration ? (currentTime / duration) * 100 : 0;
    
    return (
      <div className="h-1.5 w-full bg-slate-700/30 rounded-full overflow-hidden">
        <div 
          className={`h-full ${isDark ? 'bg-indigo-500' : 'bg-indigo-500'}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };

  return (
    <motion.div 
      className={`w-full rounded-xl overflow-hidden relative ${
        isDark ? 'bg-slate-900 shadow-lg shadow-black/50' : 'bg-white shadow-xl shadow-indigo-200/20'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Player Container */}
      <div className="relative aspect-video w-full">
        {/* YouTube Player */}
        <div className={`w-full h-full transition-opacity ${isAudioOnly ? 'opacity-0' : 'opacity-100'}`}>
      <YouTube
        videoId={videoId}
        opts={opts}
            onReady={onReady}
        onStateChange={onStateChange}
            onError={onError}
            className="w-full h-full"
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
                    height: [
                      Math.random() * 10 + 2,
                      Math.random() * 40 + 10,
                      Math.random() * 15 + 5
                    ]
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
            
            {/* Enhanced YouTube Music style lyrics display */}
            <div className="mt-6 text-center max-w-xl text-white font-medium">
              <p className="text-lg">
                {isPlaying ? "Music playing in audio-only mode" : "Press play to continue"}
              </p>
            </div>
          </div>
        )}
        
        {/* Controls Overlay */}
        <div className={`absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent 
          flex items-center justify-between z-20`}
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
          </div>
          
          <div className="flex items-center text-white">
            <span className="font-mono text-sm mr-2">{formatTime(currentTime)} / {formatTime(duration)}</span>
            <Clock className="w-4 h-4 opacity-80" />
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
              {syncAttemptsRef.current > 1 && (
                <button 
                  onClick={() => {
                    setIsLoading(false);
                    if (player) {
                      player.playVideo();
                    }
                  }}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Skip loading
                </button>
              )}
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
                onClick={() => {
                  setLoadError(null);
                  if (player) {
                    player.playVideo();
                  }
                }}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Try anyway
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="w-full">
        {renderProgressBar()}
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