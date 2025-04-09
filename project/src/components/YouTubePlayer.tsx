import React, { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubePlayer as Player } from 'react-youtube';
import { motion } from 'framer-motion';
import { useTypingStore } from '../store/typingStore';
import { fetchLyrics, formatTime } from '../lib/lyrics';
import { Music, Clock, Info, Video, Volume2, Loader, AlertTriangle } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  isDark?: boolean;
}

export function YouTubePlayer({ videoId, isDark = false }: YouTubePlayerProps) {
  const { changeSong, isPlaying, setIsPlaying, lyrics } = useTypingStore();
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [songInfo, setSongInfo] = useState<{ title: string; artist: string }>({
    title: 'Loading...',
    artist: 'Please wait'
  });
  const timerRef = useRef<number | null>(null);
  const previousVideoId = useRef<string | null>(null);
  const changeSongTimeoutRef = useRef<any>(null);
  const syncAttemptsRef = useRef(0);
  const initialLoadRef = useRef(false);

  // Reset loading state and preload lyrics when video ID changes
  useEffect(() => {
    if (previousVideoId.current !== videoId) {
      setIsLoading(true);
      setLoadError(null);
      syncAttemptsRef.current = 0;
      initialLoadRef.current = false;
      
      // Preload lyrics immediately when videoId changes
      console.log("New video ID detected, preloading lyrics");
      loadLyrics(videoId, true);
    }
  }, [videoId]);
  
  // The loadLyrics function with improved error handling and retry capability
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
        // Apply lyrics immediately with no debounce delay
        console.log(`Loaded ${song.lyrics.length} lyric lines`);
        
        // Format lyrics better for typing practice - add proper spacing
        const enhancedLyrics = song.lyrics.map(lyric => ({
          ...lyric,
          text: lyric.text.trim() // Ensure clean text
        }));
        
        const combinedText = enhancedLyrics.map(lyric => lyric.text).join(' ');
        
        // Add a slight delay to ensure UI is ready
        setTimeout(() => {
          changeSong(enhancedLyrics, combinedText);
          initialLoadRef.current = true;
          
          if (!isPreload) {
            setIsLoading(false);
          }
          
          // Show a toast or notification that lyrics are ready
          console.log("Lyrics ready for typing!");
        }, 300);
      } else {
        // Handle empty lyrics case
        setLoadError('No lyrics found for this song. Please try another.');
        if (!isPreload) {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
      setLoadError('Failed to load lyrics. Please try again or select another song.');
      
      // Retry once after error if it's not already a retry attempt
      if (syncAttemptsRef.current < 2) {
        console.log(`Retrying lyrics load after error (attempt ${syncAttemptsRef.current + 1})`);
        setTimeout(() => loadLyrics(videoId), 2000);
        syncAttemptsRef.current++;
      }
      
      if (!isPreload) {
        setIsLoading(false);
      }
    }
  };

  const onReady = (event: { target: Player }) => {
    console.log("YouTube player ready");
    setPlayer(event.target);
    setDuration(event.target.getDuration());
    
    // Apply optimal settings for fast playback
    try {
      // Try lowering quality first for faster loading
      event.target.setPlaybackQuality('medium');
      
      // If player is ready but lyrics haven't loaded yet, force a reload
      if ((!lyrics || lyrics.length === 0) && !initialLoadRef.current) {
        console.log("Player ready but no lyrics - forcing lyrics load");
        loadLyrics(videoId);
      }
    } catch (e) {
      console.warn("Error setting initial player state:", e);
    }
    
    // Update time frequently for better responsiveness - 40ms for smoother updates
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    
    timerRef.current = window.setInterval(() => {
      try {
        const currentTime = event.target.getCurrentTime();
        setCurrentTime(currentTime);
        
        // Check if player is actually playing
        const playerState = event.target.getPlayerState();
        const isCurrentlyPlaying = playerState === 1;
        setIsPlaying(isCurrentlyPlaying);
        
        // If video is playing but we don't have lyrics yet AND we've not exceeded retry attempts
        if (isCurrentlyPlaying && (!lyrics || lyrics.length === 0) && syncAttemptsRef.current < 3) {
          console.log(`Force reloading lyrics - sync attempt ${syncAttemptsRef.current + 1}`);
          loadLyrics(videoId);
          syncAttemptsRef.current++;
        }
      } catch (e) {
        console.warn("Error in player timer update:", e);
      }
    }, 40); // Reduced for smoother updates
  };

  const onStateChange = (event: any) => {
    const playerState = event.data;
    // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
    setIsPlaying(playerState === 1);
    
    // When video starts playing after a pause or when buffering completes, make sure we're fully synced
    if (playerState === 1) {
      // Force update the current time
      const currentTime = event.target.getCurrentTime();
      setCurrentTime(currentTime);
      
      // When playback starts but we still don't have lyrics
      if ((!lyrics || lyrics.length === 0) && syncAttemptsRef.current < 3) {
        console.log(`Video playing but no lyrics - loading attempt ${syncAttemptsRef.current + 1}`);
        loadLyrics(videoId);
        syncAttemptsRef.current++;
      }
    }
    
    // Handle buffering state for user feedback
    if (playerState === 3) {
      console.log("Video is buffering");
    }
  };

  const onError = (error: any) => {
    console.error('YouTube player error:', error);
    setLoadError(`Error loading video (code ${error.data}). Please try another song.`);
    setIsLoading(false);
  };
  
  // Main effect for video ID changes and cleanup
  useEffect(() => {
    // Check if the video ID has changed
    if (previousVideoId.current !== videoId) {
      previousVideoId.current = videoId;
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (changeSongTimeoutRef.current) {
        clearTimeout(changeSongTimeoutRef.current);
      }
    };
  }, [videoId, changeSong]);
  
  // Improve player options for faster loading and better performance
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      // Start with lower quality for faster initial load
      vq: 'medium',
      // Disable keyboard controls to prevent interference with typing
      disablekb: 1,
      // Improve performance with fewer related videos
      iv_load_policy: 3,
      // Disable annotations for better performance
      annotations: 0,
      // Preload for faster start
      fs: 0
    },
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-xl overflow-hidden border shadow-lg ${
        isDark ? 'bg-[#1E1E2E] border-[#24283b] shadow-[#1a1b26]/50' : 'bg-white border-gray-100 shadow-purple-500/10'
      }`}>
        {/* Toggle for Video/Audio mode */}
        <div className={`flex items-center justify-between px-4 py-3 ${
          isDark ? 'bg-[#16161E]' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-2">
            {isAudioOnly ? (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDark ? 'bg-[#414868]/30' : 'bg-purple-100'
              }`}>
                <Volume2 className={`w-4 h-4 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
              </div>
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDark ? 'bg-[#414868]/30' : 'bg-purple-100'
              }`}>
                <Video className={`w-4 h-4 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
              </div>
            )}
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {isAudioOnly ? 'Music Mode' : 'Video Mode'}
            </span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsAudioOnly(!isAudioOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isDark 
                ? 'bg-[#1a1b26] hover:bg-[#414868] text-[#c0caf5]' 
                : 'bg-white hover:bg-gray-100 text-purple-700 shadow-sm border border-gray-100'
            }`}
          >
            Switch to {isAudioOnly ? 'Video' : 'Music'} Mode
          </motion.button>
        </div>

        {/* Video or Audio Player Display */}
        <div 
          className={`relative ${isAudioOnly ? 'aspect-[16/5]' : 'aspect-video'} overflow-hidden transition-all duration-300`}
        >
          {/* Conditionally style based on audio-only mode */}
          {isAudioOnly && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900">
              <div className="text-center text-white w-full max-w-2xl px-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="mb-4"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm">
                    <Music className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{songInfo.title}</h3>
                  <p className="text-gray-300 mb-6 opacity-80">{songInfo.artist}</p>
                </motion.div>
                
                {/* YouTube Music style lyrics display - enhanced styling */}
                {lyrics && lyrics.length > 0 ? (
                  <div className="mt-6 text-left max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent px-2">
                    {lyrics.map((line, index) => {
                      const isActive = currentTime >= line.startTime && currentTime <= line.endTime;
                      const isPast = currentTime > line.endTime;
                      return (
                        <motion.div
                          key={index}
                          className={`py-2 px-3 my-1.5 rounded-lg transition-all ${
                            isActive 
                              ? 'bg-white/20 text-white font-bold border-l-4 border-white/50' 
                              : isPast 
                                ? 'text-gray-300/60' 
                                : 'text-gray-300/80'
                          }`}
                          initial={{ opacity: 0.7 }}
                          animate={{ 
                            opacity: isActive ? 1 : isPast ? 0.6 : 0.8,
                            scale: isActive ? 1.05 : 1,
                            x: isActive ? 8 : 0,
                            height: 'auto'
                          }}
                          transition={{
                            duration: 0.3,
                            ease: "easeInOut"
                          }}
                        >
                          {line.text}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  // Audio visualizer bars (animated) as fallback when no lyrics
                  <div className="flex items-end justify-center h-12 gap-1 mt-4">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 bg-white bg-opacity-80 rounded-full"
                        animate={{
                          height: [
                            Math.random() * 15 + 5,
                            Math.random() * 35 + 10,
                            Math.random() * 15 + 5
                          ]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          repeatType: "reverse",
                          delay: i * 0.05
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
              <div className="text-white text-center">
                <Loader className="w-12 h-12 mx-auto mb-3 animate-spin" />
                <p className="font-medium">Loading song data...</p>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {loadError && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-900/80 backdrop-blur-sm">
              <div className="text-white text-center p-6 max-w-md rounded-xl bg-black/20">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
                <p className="font-bold text-xl mb-2">Error</p>
                <p className="opacity-90">{loadError}</p>
              </div>
            </div>
          )}
          
          {/* The YouTube player is still loaded but visually hidden in audio-only mode */}
          <div className={isAudioOnly ? 'opacity-0' : 'opacity-100'}>
      <YouTube
        videoId={videoId}
        opts={opts}
              onReady={onReady}
        onStateChange={onStateChange}
              onError={onError}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
      
      <div className={`rounded-xl p-5 ${
        isDark ? 'bg-[#1E1E2E]' : 'bg-white/90 backdrop-blur-sm'
      }`}>
        <div className="flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isDark ? 'bg-[#7aa2f7]/10 border border-[#7aa2f7]/20' : 'bg-purple-100'
            }`}>
              <Music className={isDark ? 'text-[#7aa2f7]' : 'text-purple-500'} />
            </div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{songInfo.title}</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{songInfo.artist}</p>
            </div>
          </motion.div>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            isDark ? 'bg-[#414868]/20' : 'bg-purple-50'
          }`}>
            <Clock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-purple-500'}`} />
            <span className={`text-sm font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
        
        <div className={`mt-4 flex items-center gap-3 p-4 rounded-xl text-sm ${
          isDark 
            ? isLoading ? 'bg-[#414868]/20' : 'bg-[#2D2D40]/40' 
            : isLoading ? 'bg-indigo-50' : 'bg-purple-50'
        }`}>
          {isLoading ? (
            <div className="w-6 h-6 flex-shrink-0">
              <Loader className={`w-6 h-6 animate-spin ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
            </div>
          ) : (
            <Info className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
          )}
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {isLoading 
              ? "Loading lyrics for typing practice..." 
              : "Lyrics are now ready! Click in the typing area and start typing along with the song."}
          </p>
        </div>
      </div>
    </div>
  );
}