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

  // Add a synchronization reference 
  const syncStatusRef = useRef<'pending' | 'synced' | 'failed'>('pending');
  const syncAttemptTimeRef = useRef<number | null>(null);

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
  
  // More aggressive sync and focus handling
  useEffect(() => {
    // If music is playing but text isn't ready after a delay, try a forced sync
    if (isPlaying && (!allLyrics || allLyrics.length === 0) && syncStatusRef.current === 'pending') {
      if (!syncAttemptTimeRef.current) {
        syncAttemptTimeRef.current = Date.now();
        // Immediately attempt to sync by clearing any existing state
        setTypedText('');
        setCurrentPosition(0);
        setStartTime(null);
        setErrors(0);
        hasAttemptedToFocus.current = false;
        focusTextArea();
      } else if (Date.now() - syncAttemptTimeRef.current > 2000) { // Reduced timeout
        // It's been more than 2 seconds and still no lyrics - try a direct reset approach
        console.log("Force sync: No lyrics after 2 seconds of playback - attempting recovery");
        
        // Trigger the reset action in the typing store which should propagate to other components
        reset();
        syncStatusRef.current = 'failed';
        
        // Force focus again
        focusTextArea();
      }
    }
    
    // When lyrics arrive, mark as synced and reset the attempt time
    if (allLyrics && allLyrics.length > 0) {
      syncStatusRef.current = 'synced';
      syncAttemptTimeRef.current = null;
    }
  }, [isPlaying, allLyrics, reset]);

  // Improve the useEffect that processes lyrics changes to ensure it works with any song
  // When lyrics change, combine all lyrics into one continuous text - optimized for immediate response
  useEffect(() => {
    // Immediate check for lyrics presence - with better debugging
    if (!lyrics || lyrics.length === 0) {
      console.log("No lyrics available yet - resetting typing area");
      setAllLyrics('');
      syncStatusRef.current = 'pending';
      return;
    }
    
    // Join all lyrics with a space between each line - with trimming for cleaner text
    const combinedLyrics = lyrics.map(lyric => lyric.text.trim()).join(' ');
    
    // Log lyrics info to help with debugging
    console.log(`Lyrics received: ${lyrics.length} lines, ${combinedLyrics.length} characters`);
    
    // Always force update immediately for faster response, especially for new songs
    // Reset state for new lyrics
    setAllLyrics(combinedLyrics);
    setCurrentPosition(0);
    setTypedText('');
    setStartTime(null);
    setIsComplete(false);
    hasAttemptedToFocus.current = false;
    syncStatusRef.current = 'synced'; // Mark as synced since we got new lyrics
    
    // Force focus on text area multiple times
    focusTextArea();
    
    // Force scroll to start position
    if (lyricsRef.current) {
      lyricsRef.current.scrollLeft = 0;
    }
    
    // Schedule multiple focus attempts over time for better mobile experience
    [100, 500, 1000, 2000].forEach(delay => {
      setTimeout(() => {
        focusTextArea();
      }, delay);
    });
  }, [lyrics]);

  // Enhanced focus mechanism with more aggressive approach
  const focusTextArea = () => {
    if (!textareaRef.current) {
      console.log("Focus attempt failed - no textarea ref");
      return;
    }
    
    // Immediate focus attempt
    textareaRef.current.focus();
    console.log("Focus attempt on typing area");
    
    // Multiple focus attempts with shorter delays for better response
    [10, 50, 100, 200].forEach(delay => {
      setTimeout(() => {
        if (textareaRef.current) {
          // Add blur first to force iOS/mobile to recognize the focus
          textareaRef.current.blur();
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              hasAttemptedToFocus.current = true;
            }
          }, 5);
        }
      }, delay);
    });
  };

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

  // Enhanced typing handler with better performance
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!allLyrics) return;
    
    const newTypedText = e.target.value;
    
    // Performance optimization: only update if text actually changed
    if (newTypedText === typedText) return;
    
    setTypedText(newTypedText);
    setCurrentPosition(newTypedText.length);

    // Calculate errors - optimized for performance
    let newErrors = 0;
    const minLength = Math.min(newTypedText.length, allLyrics.length);
    for (let i = 0; i < minLength; i++) {
      if (newTypedText[i] !== allLyrics[i]) {
        newErrors++;
      }
    }
    
    // Add errors for extra typed characters beyond lyrics length
    if (newTypedText.length > allLyrics.length) {
      newErrors += newTypedText.length - allLyrics.length;
    }
    
    setErrors(newErrors);

    // Optimized auto-scroll with smoother scrolling
    if (lyricsRef.current) {
      const textWidth = 10; // Approximate width of a character in pixels
      const containerWidth = lyricsRef.current.offsetWidth;
      const charsVisible = Math.floor(containerWidth / textWidth);
      const scrollPosition = Math.max(0, newTypedText.length - charsVisible / 3); // More context ahead
      
      // Use smooth scrolling for better UX
      lyricsRef.current.scrollTo({
        left: scrollPosition * textWidth,
        behavior: 'smooth'
      });
    }
    
    // Start timer on first character
    if (newTypedText.length === 1 && !startTime) {
      setStartTime(Date.now());
      setIsComplete(false);
    }
    
    // Check completion
    if (newTypedText.length >= allLyrics.length && !isComplete) {
      setIsComplete(true);
      
      // Calculate final stats
      const timeElapsed = (Date.now() - (startTime || Date.now())) / 1000;
      const finalWPM = calculateWPM(newTypedText.length, timeElapsed, newErrors);
      const finalAccuracy = calculateAccuracy(
        newTypedText.length - newErrors,
        newTypedText.length
      );
      
      // Set final stats and add high score
      setWPM(finalWPM);
      setAccuracy(finalAccuracy);
      
      addHighScore({
        wpm: finalWPM,
        accuracy: finalAccuracy,
        mode: 'lyrics',
        songTitle: allLyrics.substring(0, 20) + '...'
      });
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
    
    // Split lyrics into words for better visualization like 10fastfingers
    const words = allLyrics.split(' ');
    let charIndex = 0;
    
    return (
      <div 
        ref={lyricsRef}
        className="font-mono text-xl whitespace-pre-wrap overflow-x-hidden"
      >
        <div className="flex flex-wrap gap-2">
          {words.map((word, wordIndex) => {
            // Track the current word
            const wordStart = charIndex;
            const wordEnd = wordStart + word.length;
            const isCurrentWord = typedText.length >= wordStart && typedText.length <= wordEnd;
            
            // Build the word display
            const wordElement = (
              <span 
                key={wordIndex} 
                className={`inline-block rounded px-0.5 py-0.5 ${
                  isCurrentWord ? (isDark ? 'bg-[#414868]/30' : 'bg-purple-100/50') : ''
                }`}
              >
                {word.split('').map((char, idx) => {
                  const absoluteIndex = wordStart + idx;
                  let className = isDark ? 'text-gray-500' : 'text-gray-400';
                  
                  if (absoluteIndex < typedText.length) {
                    // Character has been typed
                    className = typedText[absoluteIndex] === char 
                      ? (isDark ? 'text-[#9ece6a]' : 'text-purple-600') // Correct
                      : (isDark ? 'text-[#f7768e] bg-red-900/20' : 'text-red-600 bg-red-100'); // Wrong
                  } else if (absoluteIndex === typedText.length) {
                    // Current character to type (cursor position)
                    className = isDark ? 'text-white bg-[#7aa2f7]/50' : 'text-black bg-purple-200';
                  }
                  
                  return (
                    <span key={idx} className={className}>
                      {char}
                    </span>
                  );
                })}
              </span>
            );
            
            // Update the character index
            charIndex += word.length + 1; // +1 for the space
            
            // Return word + space
            return (
              <React.Fragment key={`word-${wordIndex}`}>
                {wordElement}
                {wordIndex < words.length - 1 && (
                  <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>
                    {' '}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // Enhanced cursor with animation
  const renderCursor = () => {
    if (!allLyrics || typedText.length >= allLyrics.length) return null;
    
    return (
      <motion.div 
        className={`absolute w-[2px] h-7 ${isDark ? 'bg-[#7aa2f7]' : 'bg-purple-600'}`}
        style={{
          left: `calc(${typedText.length * 10}px + 0.5rem)`,
          transform: 'translateX(-50%)',
          bottom: '0'
        }}
        animate={{ 
          opacity: [1, 0, 1],
          height: ['28px', '24px', '28px']
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 1,
          ease: "easeInOut"
        }}
      />
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
            <div className="w-full overflow-hidden py-6 px-3 relative min-h-[100px]">
              {renderMonkeyTypeLyrics()}
              {typedText.length < allLyrics.length && renderCursor()}
            </div>

            {/* Enhanced stats bar with real-time feedback */}
            <div className="mt-6 w-full max-w-3xl">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-[#1a1b26]' : 'bg-white'}`}>
                  <span className={`text-xs uppercase font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Speed</span>
                  <p className={`text-xl font-mono font-bold ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`}>{wpm} WPM</p>
                </div>
                <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-[#1a1b26]' : 'bg-white'}`}>
                  <span className={`text-xs uppercase font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Accuracy</span>
                  <p className={`text-xl font-mono font-bold ${isDark ? 'text-[#bb9af7]' : 'text-indigo-600'}`}>{accuracy}%</p>
                </div>
                <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-[#1a1b26]' : 'bg-white'}`}>
                  <span className={`text-xs uppercase font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Progress</span>
                  <p className={`text-xl font-mono font-bold ${isDark ? 'text-[#9ece6a]' : 'text-green-600'}`}>{allLyrics ? Math.round((typedText.length / allLyrics.length) * 100) : 0}%</p>
                </div>
              </div>
              
              <div className="flex justify-between text-xs mb-2">
                <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>Progress</span>
                <span className={`font-medium ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`}>
                  {typedText.length}/{allLyrics ? allLyrics.length : 0} characters
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700/30 rounded-full h-2 relative overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${allLyrics ? (typedText.length / allLyrics.length) * 100 : 0}%` }}
                  transition={{ duration: 0.2 }}
                  className={`h-2 rounded-full ${isDark ? 'bg-gradient-to-r from-[#7aa2f7] to-[#bb9af7]' : 'bg-gradient-to-r from-purple-600 to-indigo-500'}`}
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