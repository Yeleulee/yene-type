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
  const { changeSong, isPlaying, setIsPlaying } = useTypingStore();
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

  // Reset loading state when video ID changes
  useEffect(() => {
    if (previousVideoId.current !== videoId) {
      setIsLoading(true);
      setLoadError(null);
    }
  }, [videoId]);

  // Safe wrapper for changeSong with debounce
  const safeChangeSong = (lyrics: any[], text: string) => {
    // Clear any existing timeout
    if (changeSongTimeoutRef.current) {
      clearTimeout(changeSongTimeoutRef.current);
    }
    
    // Set a small delay to ensure state consistency
    changeSongTimeoutRef.current = setTimeout(() => {
      console.log('Calling changeSong with lyrics length:', lyrics.length);
      changeSong(lyrics, text);
    }, 100);
  };

  useEffect(() => {
    // Check if the video ID has changed
    if (previousVideoId.current !== videoId) {
      previousVideoId.current = videoId;
      
      const loadLyrics = async () => {
        try {
          setIsLoading(true);
          const song = await fetchLyrics(videoId);
          setSongInfo({
            title: song.title,
            artist: song.artist
          });
          
          // Ensure we have valid lyrics before proceeding
          if (song.lyrics && song.lyrics.length > 0) {
            // Load the combined lyrics text for typing using the new changeSong method
            const combinedText = song.lyrics.map(lyric => lyric.text).join(' ');
            safeChangeSong(song.lyrics, combinedText);
          } else {
            // Handle empty lyrics case
            setLoadError('No lyrics found for this song. Please try another.');
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Error loading lyrics:', error);
          setLoadError('Failed to load lyrics. Please try again or select another song.');
          setIsLoading(false);
        }
      };
      loadLyrics();
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

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  const onReady = (event: { target: Player }) => {
    setPlayer(event.target);
    setDuration(event.target.getDuration());
    
    // Update time more frequently for better responsiveness
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      const currentTime = event.target.getCurrentTime();
      setCurrentTime(currentTime);
      
      // Check if player is actually playing (some browsers might pause without events)
      setIsPlaying(event.target.getPlayerState() === 1);
    }, 100); // Reduced from 500ms to 100ms for better sync
  };

  const onStateChange = (event: any) => {
    const playerState = event.data;
    // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
    setIsPlaying(playerState === 1);
    
    // When video starts playing after a pause, make sure we're synced
    if (playerState === 1) {
      // Force update the current time
      setCurrentTime(event.target.getCurrentTime());
    }
  };

  const onError = (error: any) => {
    console.error('YouTube player error:', error);
    setLoadError('Error loading video. Please try another song.');
    setIsLoading(false);
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
              <div className="text-center text-white">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-3"
                >
                  <Music className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-xl font-bold">{songInfo.title}</h3>
                  <p className="text-gray-300">{songInfo.artist}</p>
                </motion.div>
                
                {/* Audio visualizer bars (animated) */}
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