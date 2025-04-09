import React, { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubePlayer as Player } from 'react-youtube';
import { motion } from 'framer-motion';
import { useTypingStore } from '../store/typingStore';
import { fetchLyrics, formatTime } from '../lib/lyrics';
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
  Youtube
} from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  isDark?: boolean;
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
  const [songInfo, setSongInfo] = useState<{ title: string; artist: string }>({
    title: 'Loading...',
    artist: 'Please wait'
  });
  
  const timerRef = useRef<number | null>(null);
  const previousVideoId = useRef<string | null>(null);
  const syncAttemptsRef = useRef<number>(0);
  const initialLoadRef = useRef<boolean>(false);
  const changeSongTimeoutRef = useRef<any>(null);

  // Reset loading state and preload lyrics when video ID changes
  useEffect(() => {
    if (previousVideoId.current !== videoId) {
      console.log("Video ID changed from", previousVideoId.current, "to", videoId);
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
      
      // Force immediate lyrics loading with 0 delay
      console.log("New video ID detected, loading lyrics immediately");
      loadLyrics(videoId, false);
      
      // Track the new ID
      previousVideoId.current = videoId;
    }
  }, [videoId, player]);

  // The loadLyrics function with improved error handling and immediate application
  const loadLyrics = async (videoId: string, isPreload = false) => {
    try {
      if (!isPreload) {
        setIsLoading(true);
      }
      
      console.log(`Loading lyrics for video ${videoId}${isPreload ? ' (preload)' : ''}`);
      const song = await fetchLyrics(videoId);
      
      setSongInfo({
        title: song.title,
        artist: song.artist
      });
      
      // Ensure we have valid lyrics before proceeding
      if (song.lyrics && song.lyrics.length > 0) {
        // Apply lyrics IMMEDIATELY for better responsiveness
        console.log(`Loaded ${song.lyrics.length} lyric lines`);
        
        // Format lyrics better for typing practice - add proper spacing
        const enhancedLyrics = song.lyrics.map(lyric => ({
          ...lyric,
          text: lyric.text.trim() // Ensure clean text
        }));
        
        const combinedText = enhancedLyrics.map(lyric => lyric.text).join(' ');
        
        // Apply immediately without delay
        changeSong(enhancedLyrics, combinedText);
        initialLoadRef.current = true;
        
        if (!isPreload) {
          setIsLoading(false);
        }
        
        console.log("Lyrics ready for typing!");
      } else {
        // Handle empty lyrics case
        setLoadError('No lyrics found for this song. Please try another.');
        if (!isPreload) {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      setLoadError('Failed to load lyrics. Please try again or select another song.');
      
      // Retry immediately after error if it's not already a retry attempt
      if (syncAttemptsRef.current < 2) {
        console.log(`Retrying lyrics load after error (attempt ${syncAttemptsRef.current + 1})`);
        setTimeout(() => loadLyrics(videoId, false), 500); // Retry sooner
        syncAttemptsRef.current++;
      }
      
      if (!isPreload) {
        setIsLoading(false);
      }
    }
  };

  const toggleAudioOnly = () => {
    setIsAudioOnly(!isAudioOnly);
  };

  const toggleMute = () => {
    if (!player) return;
    
    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const onReady = (event: { target: Player }) => {
    console.log("YouTube player ready for video:", videoId);
    setPlayer(event.target);
    setDuration(event.target.getDuration() || 0);
    
    // Immediately clear loading state when player is ready
    setIsLoading(false);
    
    // Apply optimal settings for fast playback
    try {
      // Faster loading with lower quality
      event.target.setPlaybackQuality('small');
      event.target.playVideo();
      
      // Force immediate lyrics load when player is ready
      if ((!initialLoadRef.current || syncAttemptsRef.current < 1) && videoId) {
        console.log("Player ready but no lyrics - forcing immediate lyrics load");
        loadLyrics(videoId, false); // Not a preload - force immediate load
      }
    } catch (e) {
      console.warn("Error setting initial player state:", e);
    }
    
    // More frequent updates for better synchronization
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    
    timerRef.current = window.setInterval(() => {
      try {
        const currentTime = event.target.getCurrentTime() || 0;
        setCurrentTime(currentTime);
        
        const playerState = event.target.getPlayerState();
        const isCurrentlyPlaying = playerState === 1;
        setIsPlaying(isCurrentlyPlaying);
        
        // Force lyrics loading if playing but no lyrics and initialization not complete
        if (isCurrentlyPlaying && !initialLoadRef.current && syncAttemptsRef.current < 2) {
          console.log(`Force reloading lyrics - sync attempt ${syncAttemptsRef.current + 1}`);
          loadLyrics(videoId, false); // Force immediate load
          syncAttemptsRef.current++;
        }
      } catch (e) {
        console.warn("Error in player timer update:", e);
      }
    }, 50);
  };

  const onStateChange = (event: any) => {
    const playerState = event.data;
    // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
    setIsPlaying(playerState === 1);
    
    // Clear loading state when video starts playing
    if (playerState === 1) {
      setIsLoading(false);
      
      // Force update the current time
      const currentTime = event.target.getCurrentTime();
      setCurrentTime(currentTime);
      
      // When playback starts but initialization not complete
      if (!initialLoadRef.current && syncAttemptsRef.current < 2) {
        console.log(`Video playing but no lyrics - loading attempt ${syncAttemptsRef.current + 1}`);
        loadLyrics(videoId, false); // Force immediate load
        syncAttemptsRef.current++;
      }
    }
    
    // Handle buffering state for user feedback
    if (playerState === 3) {
      console.log("Video is buffering");
    }
  };

  const onError = (error: any) => {
    console.error("YouTube player error:", error);
    setLoadError(`Error loading YouTube video. Please try a different song. (Error: ${error.data})`);
    setIsLoading(false);
  };

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (changeSongTimeoutRef.current) {
        clearTimeout(changeSongTimeoutRef.current);
      }
    };
  }, []);

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