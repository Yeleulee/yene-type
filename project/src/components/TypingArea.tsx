import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateWPM, calculateAccuracy } from '../lib/utils';
import { useTypingStore } from '../store/typingStore';
import { Music, Headphones, Mic, Keyboard, Award, ChevronDown, Rocket, RefreshCw, AlertTriangle } from 'lucide-react';

interface TypingAreaProps {
  isDark?: boolean;
}

export function TypingArea({ isDark = false }: TypingAreaProps) {
  const {
    text,
    typedText,
    wpm,
    accuracy,
    errors,
    isPlaying,
    currentLyric,
    lyrics,
    setTypedText,
    setWPM,
    setAccuracy,
    setErrors,
    addHighScore,
    reset
  } = useTypingStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [showTip, setShowTip] = useState(true);
  const [allLyrics, setAllLyrics] = useState('');
  const [currentPosition, setCurrentPosition] = useState(0);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const hasAttemptedToFocus = useRef(false);

  // Reset everything when text changes (meaning a new song was selected)
  useEffect(() => {
    if (text && text !== previousText) {
      console.log("New text detected, resetting typing area");
      setPreviousText(text);
      setAllLyrics(text);
      setCurrentPosition(0);
      setTypedText('');
      setStartTime(null);
      setIsComplete(false);
      setErrors(0);
      hasAttemptedToFocus.current = false;
      
      // Reset scroll position
      if (lyricsRef.current) {
        lyricsRef.current.scrollLeft = 0;
      }
      
      // Aggressive focus attempts when new text is loaded
      focusTextArea();
    }
  }, [text]);
  
  // Extract focus logic to a reusable function for cleaner code
  const focusTextArea = () => {
    if (!textareaRef.current) return;
    
    // Immediate focus attempt
    textareaRef.current.focus();
    
    // Multiple focus attempts with escalating delays to ensure we catch the right moment
    [50, 100, 200, 500, 1000, 2000].forEach(delay => {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          if (delay >= 500) hasAttemptedToFocus.current = true;
        }
      }, delay);
    });
  };

  // When lyrics change, combine all lyrics into one continuous text
  useEffect(() => {
    if (lyrics && lyrics.length > 0) {
      // Join all lyrics with a space between each line
      const combinedLyrics = lyrics.map(lyric => lyric.text).join(' ');
      
      // Only update if we have new lyrics
      if (combinedLyrics !== allLyrics) {
        console.log("New lyrics detected, updating allLyrics");
        setAllLyrics(combinedLyrics);
        setCurrentPosition(0);
        setTypedText('');
        setStartTime(null);
        setIsComplete(false);
        hasAttemptedToFocus.current = false;
        
        // Focus on text area with our enhanced focus function
        focusTextArea();
      }
    } else {
      // Reset if no lyrics available
      setAllLyrics('');
    }
  }, [lyrics]);

  // Listen for isPlaying changes to improve sync
  useEffect(() => {
    // When music starts playing, make sure typing area is focused
    if (isPlaying && allLyrics && !hasAttemptedToFocus.current) {
      console.log("Music started playing - focusing typing area");
      focusTextArea();
    }
  }, [isPlaying, allLyrics]);
  
  // Handle clicks anywhere in the component to focus the textarea
  useEffect(() => {
    const handleGlobalClick = () => {
      if (allLyrics && !isComplete && textareaRef.current) {
        textareaRef.current.focus();
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [allLyrics, isComplete]);

  // Debug logging - add this to help troubleshoot
  useEffect(() => {
    console.log("Text from store:", text);
    console.log("All lyrics state:", allLyrics);
    console.log("Lyrics array:", lyrics);
  }, [text, allLyrics, lyrics]);

  useEffect(() => {
    if (typedText.length === 1 && !startTime) {
      setStartTime(Date.now());
      setIsComplete(false);
    }

    if (startTime && allLyrics) {
      const timeElapsed = (Date.now() - startTime) / 1000;
      const newWPM = calculateWPM(typedText.length, timeElapsed, errors);
      const newAccuracy = calculateAccuracy(
        typedText.length - errors,
        typedText.length
      );
      
      setWPM(newWPM);
      setAccuracy(newAccuracy);

      // Check if typing is complete
      if (typedText.length >= allLyrics.length) {
        setIsComplete(true);
        addHighScore({
          wpm: newWPM,
          accuracy: newAccuracy,
          mode: 'lyrics',
          songTitle: allLyrics.substring(0, 20) + '...'
        });
      }
    }
  }, [typedText, errors, startTime, allLyrics]);

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!allLyrics) return;
    
    const newTypedText = e.target.value;
    setTypedText(newTypedText);
    setCurrentPosition(newTypedText.length);

    // Calculate errors
    let newErrors = 0;
    for (let i = 0; i < newTypedText.length; i++) {
      if (i >= allLyrics.length || newTypedText[i] !== allLyrics[i]) {
        newErrors++;
      }
    }
    setErrors(newErrors);

    // Auto-scroll the lyrics display
    if (lyricsRef.current) {
      const textWidth = 10; // Approximate width of a character in pixels
      const containerWidth = lyricsRef.current.offsetWidth;
      const charsVisible = Math.floor(containerWidth / textWidth);
      const scrollPosition = Math.max(0, newTypedText.length - charsVisible / 2);
      lyricsRef.current.scrollLeft = scrollPosition * textWidth;
    }
  };

  const handleFocus = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleReset = () => {
    setTypedText('');
    setCurrentPosition(0);
    setStartTime(null);
    setIsComplete(false);
    setErrors(0);
    if (lyricsRef.current) {
      lyricsRef.current.scrollLeft = 0;
    }
  };

  const renderMonkeyTypeLyrics = () => {
    if (!allLyrics || allLyrics.length === 0) {
      return (
        <div className="font-mono text-xl text-center py-4">
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {isPlaying ? 'Waiting for lyrics...' : 'Play a song to see lyrics here'}
          </span>
        </div>
      );
    }
    
    return (
      <div 
        ref={lyricsRef}
        className="font-mono text-xl whitespace-nowrap overflow-x-hidden"
      >
        {allLyrics.split('').map((char, index) => {
          let className = isDark ? 'text-gray-500' : 'text-gray-400';
          
          if (index < typedText.length) {
            // Character has been typed
            className = typedText[index] === char 
              ? (isDark ? 'text-[#9ece6a]' : 'text-purple-600') // Correct
              : (isDark ? 'text-[#f7768e] bg-red-900/20' : 'text-red-600 bg-red-100'); // Wrong
          } else if (index === typedText.length) {
            // Current character to type (cursor position)
            className = isDark ? 'text-white bg-[#7aa2f7]/50' : 'text-black bg-purple-200';
          }
          
          return (
            <span
              key={index}
              className={className}
            >
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div 
      className={`w-full h-full flex flex-col gap-4 p-6 rounded-xl cursor-text transition-all ${
        isDark ? 'bg-[#1E1E2E] shadow-lg shadow-[#1a1b26]/50' : 'bg-white/90 backdrop-blur-sm shadow-xl shadow-purple-500/10'
      }`}
      onClick={handleFocus}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-xl font-extrabold bg-clip-text ${
            isDark 
              ? 'text-transparent bg-gradient-to-r from-[#7aa2f7] to-[#bb9af7]' 
              : 'text-transparent bg-gradient-to-r from-purple-600 to-indigo-600'
          }`}>
            Yene Type
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            isDark ? 'bg-[#414868] text-[#c0caf5]' : 'bg-purple-100 text-purple-800'
          }`}>
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
              isDark 
                ? 'bg-[#1a1b26] hover:bg-[#414868] text-[#c0caf5]' 
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
            }`}
            title="Reset typing test"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
              isDark 
                ? 'bg-[#1a1b26] hover:bg-[#414868] text-[#c0caf5]'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
            }`}
          >
            Stats
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      
      <AnimatePresence>
        {showStats && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className={`flex flex-col items-center p-3 rounded-xl ${
                isDark ? 'bg-[#1a1b26]' : 'bg-purple-50/80'
              }`}>
                <div className={`w-9 h-9 flex items-center justify-center rounded-lg mb-2 ${
                  isDark ? 'bg-[#414868]' : 'bg-white'
                }`}>
                  <Keyboard className={isDark ? 'text-[#7aa2f7]' : 'text-purple-500'} size={18} />
                </div>
                <p className="text-2xl font-mono font-bold">{wpm}</p>
                <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>WPM</p>
              </div>
              <div className={`flex flex-col items-center p-3 rounded-xl ${
                isDark ? 'bg-[#1a1b26]' : 'bg-purple-50/80'
              }`}>
                <div className={`w-9 h-9 flex items-center justify-center rounded-lg mb-2 ${
                  isDark ? 'bg-[#414868]' : 'bg-white'
                }`}>
                  <Mic className={isDark ? 'text-[#bb9af7]' : 'text-purple-500'} size={18} />
                </div>
                <p className="text-2xl font-mono font-bold">{accuracy}%</p>
                <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Accuracy</p>
              </div>
              <div className={`flex flex-col items-center p-3 rounded-xl ${
                isDark ? 'bg-[#1a1b26]' : 'bg-purple-50/80'
              }`}>
                <div className={`w-9 h-9 flex items-center justify-center rounded-lg mb-2 ${
                  isDark ? 'bg-[#414868]' : 'bg-white'
                }`}>
                  <Headphones className={isDark ? 'text-[#7dcfff]' : 'text-purple-500'} size={18} />
                </div>
                <p className="text-2xl font-mono font-bold">{errors}</p>
                <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Errors</p>
              </div>
              <div className={`flex flex-col items-center p-3 rounded-xl ${
                isDark ? 'bg-[#1a1b26]' : 'bg-purple-50/80'
              }`}>
                <div className={`w-9 h-9 flex items-center justify-center rounded-lg mb-2 ${
                  isDark ? 'bg-[#414868]' : 'bg-white'
                }`}>
                  <Award className={isDark ? 'text-[#e0af68]' : 'text-purple-500'} size={18} />
                </div>
                <p className="text-2xl font-mono font-bold">{streakCount}</p>
                <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Streak</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {showTip && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 p-4 rounded-xl text-sm mb-4 ${
            isDark ? 'bg-[#2D2D40]/60 text-[#7aa2f7]' : 'bg-purple-100/50 text-purple-700'
          }`}
        >
          <Rocket size={18} />
          <p className="font-medium">Type the text as it appears. The highlighted character shows your current position.</p>
          <button 
            onClick={() => setShowTip(false)} 
            className={`ml-auto p-1.5 rounded-lg hover:bg-opacity-80 transition-all ${
              isDark ? 'hover:bg-[#1a1b26]' : 'hover:bg-white/50'
            }`}
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Enhanced Typing Area */}
      <div className={`rounded-xl px-6 py-8 mb-6 overflow-hidden ${
        isDark ? 'bg-[#16161e]/90 shadow-inner shadow-black/20' : 'bg-purple-50/90 shadow-inner shadow-purple-500/5'
      }`}>
        {!isPlaying && !allLyrics ? (
          <div className="text-center py-12 px-4">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isDark ? 'bg-[#1a1b26]' : 'bg-white'
            }`}>
              <Music className={`${isDark ? 'text-[#7aa2f7]' : 'text-purple-500'}`} size={24} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Ready to Type
            </h3>
            <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Play a song to start your typing practice
            </p>
          </div>
        ) : isPlaying && !allLyrics ? (
          <div className="text-center py-12 px-4">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isDark ? 'bg-[#1a1b26]' : 'bg-white'
            }`}>
              <AlertTriangle className={`${isDark ? 'text-yellow-500' : 'text-yellow-500'}`} size={24} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Loading Lyrics
            </h3>
            <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Preparing your typing challenge...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-full overflow-hidden py-6 px-3 relative">
              {renderMonkeyTypeLyrics()}
              
              {/* Enhanced cursor effect */}
              {typedText.length < allLyrics.length && (
                <motion.div 
                  className={`absolute bottom-0 w-[2px] h-7 ${isDark ? 'bg-[#7aa2f7]' : 'bg-purple-600'}`}
                  style={{
                    left: `calc(${typedText.length * 10}px + 0.5rem)`,
                    transform: 'translateX(-50%)'
                  }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </div>

            <div className="mt-6 w-full max-w-3xl">
              <div className="flex justify-between text-xs mb-2">
                <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>Progress</span>
                <span className={`font-medium ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`}>
                  {allLyrics ? Math.round((typedText.length / allLyrics.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700/30 rounded-full h-1.5 relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${allLyrics ? (typedText.length / allLyrics.length) * 100 : 0}%` }}
                  transition={{ duration: 0.2 }}
                  className={`h-1.5 rounded-full ${isDark ? 'bg-gradient-to-r from-[#7aa2f7] to-[#bb9af7]' : 'bg-gradient-to-r from-purple-600 to-indigo-500'}`}
                ></motion.div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden textarea for typing */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={typedText}
          onChange={handleTyping}
          disabled={!allLyrics || isComplete}
          className={`absolute w-full h-full resize-none font-mono opacity-0 focus:outline-none`}
          spellCheck={false}
          autoComplete="off"
        />
        
        <div className="w-full h-full flex items-center justify-center">
          {!allLyrics ? (
            <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {isPlaying 
                ? 'Loading lyrics...' 
                : 'Play a song to start typing'}
            </p>
          ) : allLyrics && !typedText.length ? (
            <p className={`text-center font-medium px-4 py-2 rounded-lg ${
              isDark 
                ? 'text-[#c0caf5] bg-[#414868]/30 border border-[#414868]/50' 
                : 'text-purple-700 bg-purple-50 border border-purple-100'
            }`}>
              Click anywhere to start typing
            </p>
          ) : null}
        </div>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center py-6 px-8 rounded-xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#414868]/60 to-[#1a1b26] border border-[#7aa2f7]/30' 
              : 'bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100'
          }`}
        >
          <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
            isDark ? 'bg-[#7aa2f7]/20' : 'bg-white'
          }`}>
            <Award className={isDark ? 'text-[#e0af68]' : 'text-purple-500'} size={24} />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🎵 Perfect Performance! 🎵</h3>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            You've completed typing with <span className="font-bold">{wpm} WPM</span> and <span className="font-bold">{accuracy}%</span> accuracy!
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className={`px-6 py-2.5 rounded-lg font-medium ${
              isDark 
                ? 'bg-gradient-to-r from-[#7aa2f7] to-[#bb9af7] text-[#1a1b26] hover:opacity-90' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
            }`}
          >
            Try again
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}