import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateWPM, calculateAccuracy } from '../lib/utils';
import { useTypingStore } from '../store/typingStore';
import { 
  Keyboard, 
  Award, 
  Clock, 
  BarChart, 
  Zap, 
  ChevronDown, 
  RefreshCw, 
  AlertTriangle, 
  Check,
  BookOpen
} from 'lucide-react';

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
  const focusTimeoutRefs = useRef<number[]>([]);
  const syncStatusRef = useRef<'pending' | 'synced' | 'failed'>('pending');
  const syncAttemptTimeRef = useRef<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Enhanced focus mechanism with debounce to prevent excessive focus attempts
  const focusTextArea = useCallback(() => {
    if (!textareaRef.current) {
      console.log("Focus attempt failed - no textarea ref");
      return;
    }
    
    // Clear any existing focus timeouts
    focusTimeoutRefs.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    focusTimeoutRefs.current = [];
    
    // Immediate focus attempt
    textareaRef.current.focus();
    
    // More aggressive focus - try multiple times with increasing delays
    const delays = [100, 300, 500, 1000, 2000];
    
    delays.forEach(delay => {
      const timeoutId = window.setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          hasAttemptedToFocus.current = true;
          
          // Force a click on the textarea as well
          textareaRef.current.click();
        }
      }, delay);
      
      focusTimeoutRefs.current.push(timeoutId);
    });
  }, []);

  // Clear all timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      focusTimeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

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
      
      // Reset scroll position
      if (lyricsRef.current) {
        lyricsRef.current.scrollLeft = 0;
      }
      
      // Re-focus the textarea when new lyrics are loaded
      focusTextArea();
    }
  }, [text, focusTextArea]);

  // More aggressive sync and focus handling - optimized to reduce renders
  useEffect(() => {
    // Only execute this effect if playing state or lyrics have changed
    if (!isPlaying || allLyrics.length > 0) return;
    
    // If music is playing but text isn't ready, try a forced sync
    if (syncStatusRef.current === 'pending') {
      if (!syncAttemptTimeRef.current) {
        syncAttemptTimeRef.current = Date.now();
        // Immediately attempt to sync by clearing any existing state
        setTypedText('');
        setCurrentPosition(0);
        setStartTime(null);
        setErrors(0);
        hasAttemptedToFocus.current = false;
        
        // Force focus immediately
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.click();
        }
        
        // Set up a more aggressive focus retry
        const focusInterval = setInterval(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.click();
          }
        }, 100);
        
        // Clear the interval after 2 seconds
        setTimeout(() => {
          clearInterval(focusInterval);
        }, 2000);
      } else if (Date.now() - syncAttemptTimeRef.current > 2000) {
        // It's been more than 2 seconds and still no lyrics - try a direct reset approach
        console.log("Force sync: No lyrics after 2 seconds of playback - attempting recovery");
        
        // Trigger the reset action in the typing store
        reset();
        syncStatusRef.current = 'failed';
        
        // Force focus again
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.click();
        }
      }
    }
  }, [isPlaying, allLyrics, reset]);

  // When lyrics change, combine all lyrics into one continuous text - optimized for performance
  useEffect(() => {
    // Skip execution if lyrics array is empty or undefined
    if (!lyrics || lyrics.length === 0) {
      setAllLyrics('');
      syncStatusRef.current = 'pending';
      return;
    }
    
    // Join all lyrics with a space between each line - use memoization to avoid recreating string
    const combinedLyrics = lyrics.map(lyric => lyric.text.trim()).join(' ');
    
    // Update only if the combined lyrics actually changed
    if (combinedLyrics !== allLyrics) {
      setAllLyrics(combinedLyrics);
      setCurrentPosition(0);
      setTypedText('');
      setStartTime(null);
      setIsComplete(false);
      syncStatusRef.current = 'synced';
      
      // Force focus on text area
      if (!hasAttemptedToFocus.current) {
        hasAttemptedToFocus.current = true;
        focusTextArea();
      }
      
      // Force scroll to start position
      if (lyricsRef.current) {
        lyricsRef.current.scrollLeft = 0;
      }
    }
  }, [lyrics, allLyrics, focusTextArea]);

  // Handle typing stats calculations - extracted into a separate effect for better performance
  useEffect(() => {
    // Only run calculations if we're actively typing
    if (!startTime || !allLyrics || typedText.length === 0) return;
    
    const timeElapsed = (Date.now() - startTime) / 1000;
    const newWPM = calculateWPM(typedText.length, timeElapsed, errors);
    const newAccuracy = calculateAccuracy(
      typedText.length - errors,
      typedText.length
    );
    
    // Only update state if values have actually changed
    if (Math.abs(wpm - newWPM) >= 1) {
      setWPM(newWPM);
    }
    
    if (Math.abs(accuracy - newAccuracy) >= 1) {
      setAccuracy(newAccuracy);
    }

    // Check if typing is complete - but only if not already marked complete
    if (typedText.length >= allLyrics.length && !isComplete) {
      setIsComplete(true);
      addHighScore({
        wpm: newWPM,
        accuracy: newAccuracy,
        mode: 'lyrics',
        songTitle: allLyrics.substring(0, 20) + '...'
      });
    }
  }, [typedText, errors, startTime, allLyrics, wpm, accuracy, isComplete, addHighScore, setAccuracy, setWPM]);

  // Enhanced typing handler with better performance
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!allLyrics) {
      return;
    }
    
    const newTypedText = e.target.value;
    
    // Performance optimization: only update if text actually changed
    if (newTypedText === typedText) return;
    
    // If this is the first character typed, set the start time
    if (typedText.length === 0 && newTypedText.length === 1) {
      setStartTime(Date.now());
    }
    
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
    
    // Only update errors state if it changed
    if (newErrors !== errors) {
      setErrors(newErrors);
    }
  };

  const handleFocus = () => {
    if (allLyrics && !isComplete) {
      focusTextArea();
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
    focusTextArea();
  };

  // Memory-efficient word-by-word rendering approach
  const renderTypingText = () => {
    if (!allLyrics || allLyrics.length === 0) {
      return (
        <div className="font-mono text-xl text-center py-4">
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {isPlaying ? 'Waiting for lyrics...' : 'Play a song to see lyrics here'}
          </span>
        </div>
      );
    }
    
    // Split lyrics into words for better visualization
    const words = allLyrics.split(' ');
    const wordElements = [];
    let currentCharIndex = 0;
    
    // Process words in chunks for better performance with long texts
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordStart = currentCharIndex;
      const wordEnd = wordStart + word.length;
      const isCurrentWord = typedText.length >= wordStart && typedText.length <= wordEnd;
      
      const charElements = [];
      for (let j = 0; j < word.length; j++) {
        const char = word[j];
        const absoluteIndex = wordStart + j;
        let className = isDark ? 'text-gray-500' : 'text-gray-400';
        
        if (absoluteIndex < typedText.length) {
          // Character has been typed
          className = typedText[absoluteIndex] === char 
            ? (isDark ? 'text-emerald-400' : 'text-teal-600') // Correct
            : (isDark ? 'text-rose-400 bg-rose-900/20' : 'text-rose-600 bg-rose-100'); // Wrong
        } else if (absoluteIndex === typedText.length) {
          // Current character to type (cursor position)
          className = isDark ? 'text-white bg-indigo-500/50' : 'text-black bg-indigo-200';
        }
        
        charElements.push(
          <span key={`char-${absoluteIndex}`} className={className}>
            {char}
          </span>
        );
      }
      
      wordElements.push(
        <span 
          key={`word-${i}`} 
          className={`inline-block rounded px-0.5 py-0.5 ${
            isCurrentWord ? (isDark ? 'bg-indigo-500/20' : 'bg-indigo-100/70') : ''
          }`}
        >
          {charElements}
        </span>
      );
      
      // Add space between words
      if (i < words.length - 1) {
        currentCharIndex += word.length + 1; // +1 for the space
        wordElements.push(
          <span key={`space-${i}`} className={isDark ? 'text-gray-600' : 'text-gray-400'}>
            {' '}
          </span>
        );
      } else {
        currentCharIndex += word.length;
      }
    }
    
    return (
      <div 
        ref={lyricsRef}
        className="font-mono text-xl whitespace-pre-wrap overflow-x-auto py-3 px-2 rounded-lg"
      >
        {wordElements}
      </div>
    );
  };

  // Add keyboard shortcut for debug mode (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug(!showDebug);
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDebug]);

  return (
    <motion.div 
      className={`w-full h-full flex flex-col gap-4 rounded-xl cursor-text transition-all ${
        isDark 
          ? 'bg-slate-900 shadow-lg shadow-indigo-900/30' 
          : 'bg-white shadow-xl shadow-indigo-200/60'
      }`}
      onClick={handleFocus}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Debug Overlay */}
      {showDebug && (
        <div className="fixed top-0 right-0 bg-black/80 text-green-400 p-4 m-4 rounded-lg z-50 font-mono text-xs overflow-auto max-h-96 w-80">
          <h3 className="text-white mb-2 font-bold">Debug Info (Ctrl+Shift+D)</h3>
          <div>
            <p>Text Loaded: {Boolean(allLyrics) ? '✅' : '❌'}</p>
            <p>Text Length: {allLyrics?.length || 0} chars</p>
            <p>Typed: {typedText.length} chars</p>
            <p>isPlaying: {isPlaying ? '✅' : '❌'}</p>
            <p>startTime: {startTime ? '✅' : '❌'}</p>
            <p>Focus Attempts: {focusTimeoutRefs.current.length}</p>
            <p>Sync Status: {syncStatusRef.current}</p>
            <p>Lyrics Position: {currentPosition}</p>
            <p>WPM: {wpm}</p>
            <p>Accuracy: {accuracy}%</p>
            <p>Errors: {errors}</p>
            <button 
              onClick={handleReset}
              className="mt-2 bg-red-500 text-white px-2 py-1 rounded text-xs"
            >
              Force Reset
            </button>
            <button 
              onClick={focusTextArea}
              className="mt-2 ml-2 bg-blue-500 text-white px-2 py-1 rounded text-xs"
            >
              Force Focus
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
          }`}>
            <Keyboard className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Typing Practice
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Type along with music to improve your skills
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
            }`}
          >
            <BarChart className="w-3.5 h-3.5" />
            <span>Stats</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStats ? 'rotate-180' : ''}`} />
          </motion.button>
          </div>
      </div>

      <div className="px-5 flex-1 flex flex-col">
        <AnimatePresence>
          {showStats && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className={`flex flex-col items-center p-4 rounded-lg ${
                  isDark ? 'bg-slate-800' : 'bg-indigo-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
                  }`}>
                    <Zap className={isDark ? 'text-indigo-400 w-4 h-4' : 'text-indigo-500 w-4 h-4'} />
                  </div>
                  <p className={`text-2xl font-mono font-bold ${
                    isDark ? 'text-white' : 'text-indigo-600'
                  }`}>{wpm}</p>
                  <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>WPM</p>
                </div>
                <div className={`flex flex-col items-center p-4 rounded-lg ${
                  isDark ? 'bg-slate-800' : 'bg-indigo-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
                  }`}>
                    <Check className={isDark ? 'text-emerald-400 w-4 h-4' : 'text-emerald-500 w-4 h-4'} />
                  </div>
                  <p className={`text-2xl font-mono font-bold ${
                    isDark ? 'text-white' : 'text-emerald-600'
                  }`}>{accuracy}%</p>
                  <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Accuracy</p>
                </div>
                <div className={`flex flex-col items-center p-4 rounded-lg ${
                  isDark ? 'bg-slate-800' : 'bg-indigo-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
                  }`}>
                    <AlertTriangle className={isDark ? 'text-amber-400 w-4 h-4' : 'text-amber-500 w-4 h-4'} />
                  </div>
                  <p className={`text-2xl font-mono font-bold ${
                    isDark ? 'text-white' : 'text-amber-600'
                  }`}>{errors}</p>
                  <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Errors</p>
                </div>
                <div className={`flex flex-col items-center p-4 rounded-lg ${
                  isDark ? 'bg-slate-800' : 'bg-indigo-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
                  }`}>
                    <Clock className={isDark ? 'text-sky-400 w-4 h-4' : 'text-sky-500 w-4 h-4'} />
                  </div>
                  <p className={`text-2xl font-mono font-bold ${
                    isDark ? 'text-white' : 'text-sky-600'
                  }`}>{startTime ? Math.floor((Date.now() - startTime) / 1000) : 0}s</p>
                  <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Time</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {showTip && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 p-4 rounded-lg text-sm mb-4 ${
              isDark ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            <div className="mt-0.5">
              <BookOpen size={16} />
            </div>
            <div>
              <p className="font-medium mb-1">Typing Tips</p>
              <p className="text-xs leading-relaxed">
                Type the text as it appears. The highlighted character shows your current position. 
                Focus on accuracy first, then speed will follow naturally. Keep your fingers on the home row keys for better efficiency.
              </p>
            </div>
            <button 
              onClick={() => setShowTip(false)} 
              className={`ml-auto p-1 rounded ${
                isDark ? 'hover:bg-indigo-500/20' : 'hover:bg-indigo-100'
              }`}
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Main typing area */}
        <div className={`p-6 mb-4 rounded-xl overflow-hidden flex-1 flex flex-col ${
          isDark 
            ? 'bg-slate-800/50 border border-slate-700/50' 
            : 'bg-slate-50 border border-slate-100'
        }`}>
          {!isPlaying && !allLyrics ? (
            <div className="text-center py-12 px-4 flex-1 flex items-center justify-center">
              <div>
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-slate-700' : 'bg-indigo-100'
                }`}>
                  <Keyboard className={`${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} size={24} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  Ready to Type
                </h3>
                <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Play a song to start your typing practice
                </p>
              </div>
            </div>
          ) : isPlaying && !allLyrics ? (
            <div className="text-center py-12 px-4 flex-1 flex items-center justify-center">
              <div>
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-slate-700' : 'bg-indigo-100'
                }`}>
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-400 rounded-full border-t-transparent"></div>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  Loading Lyrics
                </h3>
                <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Preparing your typing challenge...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="mb-4 flex-1 overflow-hidden relative min-h-[150px] rounded-lg border border-slate-700/20">
                {renderTypingText()}
              </div>

              {/* Enhanced progress bar */}
              <div className="mt-auto">
                <div className="flex justify-between text-xs mb-2">
                  <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>Progress</span>
                  <span className={`font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {typedText.length}/{allLyrics ? allLyrics.length : 0} characters
                  </span>
                </div>
                <div className="w-full bg-slate-700/20 dark:bg-slate-700/30 rounded-full h-2 relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${allLyrics ? (typedText.length / allLyrics.length) * 100 : 0}%` }}
                    transition={{ duration: 0.2 }}
                    className={`h-2 rounded-full ${
                      isDark 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                  ></motion.div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Completion card */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-6 text-center mb-4 ${
              isDark 
                ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30' 
                : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200'
            }`}
          >
            <div className="mx-auto w-16 h-16 rounded-full border-4 border-green-400 flex items-center justify-center mb-4">
              <Award className="text-green-400 w-8 h-8" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Perfect Performance!
            </h3>
            <p className={`mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              You've completed typing with {wpm} WPM and {accuracy}% accuracy!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className={`px-6 py-2.5 rounded-lg font-medium ${
                isDark 
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
            >
              Try again
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Hidden textarea for typing - make slightly more visible during development */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={typedText}
          onChange={handleTyping}
          disabled={!allLyrics || isComplete}
          className="absolute top-0 left-0 w-full h-12 opacity-10 focus:opacity-20 focus:outline-none resize-none" 
          // ^ Increased height and slightly visible for debugging, revert to opacity-0 for production
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          aria-label="Typing area"
        />
      </div>
    </motion.div>
  );
}