import React, { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubePlayer as Player } from 'react-youtube';
import { motion } from 'framer-motion';
import { useTypingStore } from '../store/typingStore';
import { fetchLyrics, formatTime } from '../lib/lyrics';
import { Music, Clock, Info, Video, Volume2, Loader } from 'lucide-react';

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
        const combinedText = song.lyrics.map(lyric => lyric.text).join(' ');
        changeSong(song.lyrics, combinedText);
        initialLoadRef.current = true;
      } else {
        // Handle empty lyrics case
        setLoadError('No lyrics found for this song. Please try another.');
      }
      
      if (!isPreload) {
        setIsLoading(false);
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
        isDark ? 'bg-[#1a1b26] border-[#24283b] shadow-[#1a1b26]/50' : 'bg-white border-gray-100 shadow-purple-500/10'
      }`}>
        {/* Toggle for Video/Audio mode */}
        <div className={`flex items-center justify-between px-4 py-2 ${
          isDark ? 'bg-[#24283b]' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-2">
            {isAudioOnly ? (
              <Volume2 className={`w-4 h-4 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
            ) : (
              <Video className={`w-4 h-4 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
            )}
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {isAudioOnly ? 'Music Mode' : 'Video Mode'}
            </span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAudioOnly(!isAudioOnly)}
            className={`px-3 py-1 rounded-full text-xs ${
              isDark 
                ? 'bg-[#1a1b26] hover:bg-[#414868] text-gray-300' 
                : 'bg-white hover:bg-gray-100 text-gray-700 shadow-sm'
            }`}
          >
            Switch to {isAudioOnly ? 'Video' : 'Music'} Mode
          </motion.button>
        </div>

        {/* Video or Audio Player Display */}
        <div 
          className={`relative ${isAudioOnly ? 'aspect-[10/2]' : 'aspect-video'} overflow-hidden transition-all duration-300`}
        >
          {/* Conditionally style based on audio-only mode */}
          {isAudioOnly && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-r from-purple-900 via-pink-800 to-indigo-900">
              <div className="text-center text-white w-full max-w-2xl px-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-2"
                >
                  <Music className="w-10 h-10 mx-auto mb-2" />
                  <h3 className="text-xl font-bold">{songInfo.title}</h3>
                  <p className="text-gray-300 mb-6">{songInfo.artist}</p>
                </motion.div>
                
                {/* YouTube Music style lyrics display */}
                {lyrics && lyrics.length > 0 ? (
                  <div className="mt-4 text-left max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {lyrics.map((line, index) => {
                      const isActive = currentTime >= line.startTime && currentTime <= line.endTime;
                      return (
                        <motion.div
                          key={index}
                          className={`py-1 px-2 my-1 rounded transition-all ${
                            isActive ? 'bg-white/20 text-white font-bold' : 'text-gray-300'
                          }`}
                          initial={{ opacity: 0.7 }}
                          animate={{ 
                            opacity: isActive ? 1 : 0.7,
                            scale: isActive ? 1.02 : 1,
                            x: isActive ? 8 : 0
                          }}
                        >
                          {line.text}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  // Audio visualizer bars (animated) as fallback when no lyrics
                  <div className="flex items-end justify-center h-8 gap-1 mt-4">
                    {[...Array(16)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-white bg-opacity-80 rounded-full"
                        animate={{
                          height: [
                            Math.random() * 12 + 5,
                            Math.random() * 30 + 5,
                            Math.random() * 12 + 5
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
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-center">
                <Loader className="w-10 h-10 mx-auto mb-2 animate-spin" />
                <p>Loading song data...</p>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {loadError && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-900 bg-opacity-50">
              <div className="text-white text-center p-4">
                <p className="font-bold mb-2">Error</p>
                <p>{loadError}</p>
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
      
      <div className={`rounded-xl p-4 ${
        isDark ? 'bg-[#1a1b26]' : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDark ? 'bg-[#7aa2f7]/20' : 'bg-purple-100'
            }`}>
              <Music className={isDark ? 'text-[#7aa2f7]' : 'text-purple-500'} />
            </div>
            <div>
              <h3 className="font-bold">{songInfo.title}</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{songInfo.artist}</p>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg text-sm">
          <Info className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
          <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            {isLoading 
              ? "Loading lyrics for typing practice..." 
              : "Lyrics are now ready! Click in the typing area and start typing along with the song."}
          </p>
        </div>
      </div>
    </div>
  );
}