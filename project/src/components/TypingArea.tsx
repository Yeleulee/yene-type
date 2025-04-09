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
      
      // Reset scroll position
      if (lyricsRef.current) {
        lyricsRef.current.scrollLeft = 0;
      }
      
      // Re-focus the textarea when new lyrics are loaded
      if (textareaRef.current && !hasAttemptedToFocus.current) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            hasAttemptedToFocus.current = true;
          }
        }, 500);
      }
    }
  }, [text]);

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
      }
    }
  }, [lyrics]);

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
    if (!allLyrics) return null;
    
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
        isDark ? 'bg-[#24283b] shadow-lg shadow-[#1a1b26]/50' : 'bg-white/80 backdrop-blur-sm shadow-xl shadow-purple-500/10'
      }`}
      onClick={handleFocus}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Yene Type
        </h3>
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              isDark ? 'bg-[#1a1b26] hover:bg-[#414868]' : 'bg-purple-50 hover:bg-purple-100'
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
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              isDark ? 'bg-[#1a1b26] hover:bg-[#414868]' : 'bg-purple-50 hover:bg-purple-100'
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
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className={`flex flex-col items-center p-3 rounded-lg ${
                isDark ? 'bg-[#1a1b26]' : 'bg-purple-50'
              }`}>
                <Keyboard className={isDark ? 'text-[#7aa2f7] mb-1' : 'text-purple-500 mb-1'} size={18} />
                <p className="text-2xl font-mono font-bold">{wpm}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>WPM</p>
              </div>
              <div className={`flex flex-col items-center p-3 rounded-lg ${
                isDark ? 'bg-[#1a1b26]' : 'bg-purple-50'
              }`}>
                <Mic className={isDark ? 'text-[#bb9af7] mb-1' : 'text-purple-500 mb-1'} size={18} />
                <p className="text-2xl font-mono font-bold">{accuracy}%</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Accuracy</p>
              </div>
              <div className={`flex flex-col items-center p-3 rounded-lg ${
                isDark ? 'bg-[#1a1b26]' : 'bg-purple-50'
              }`}>
                <Headphones className={isDark ? 'text-[#7dcfff] mb-1' : 'text-purple-500 mb-1'} size={18} />
                <p className="text-2xl font-mono font-bold">{errors}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Errors</p>
              </div>
              <div className={`flex flex-col items-center p-3 rounded-lg ${
                isDark ? 'bg-[#1a1b26]' : 'bg-purple-50'
              }`}>
                <Award className={isDark ? 'text-[#e0af68] mb-1' : 'text-purple-500 mb-1'} size={18} />
                <p className="text-2xl font-mono font-bold">{streakCount}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Streak</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {showTip && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-2 ${
            isDark ? 'bg-[#414868]/30 text-[#7aa2f7]' : 'bg-purple-100/50 text-purple-700'
          }`}
        >
          <Rocket size={16} />
          <p>Type the text as it appears. The highlighted character shows your current position.</p>
          <button 
            onClick={() => setShowTip(false)} 
            className={`ml-auto px-2 py-1 rounded ${
              isDark ? 'hover:bg-[#1a1b26]' : 'hover:bg-white/50'
            }`}
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Monkey Type style typing area */}
      <div className={`rounded-lg p-5 mb-4 overflow-hidden ${
        isDark ? 'bg-[#1a1b26]/80' : 'bg-purple-50/80'
      }`}>
        {!isPlaying && !allLyrics ? (
          <div className="text-center py-8">
            <Music className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-[#7aa2f7]/50' : 'text-purple-500/50'}`} />
            <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Play a song to start typing
            </p>
          </div>
        ) : isPlaying && !allLyrics ? (
          <div className="text-center py-8">
            <AlertTriangle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-yellow-500/70' : 'text-yellow-500/70'}`} />
            <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Waiting for lyrics to load...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-full overflow-hidden py-4 px-2 relative">
              {renderMonkeyTypeLyrics()}
              
              {/* Cursor effect */}
              {typedText.length < allLyrics.length && (
                <motion.div 
                  className={`absolute bottom-0 w-[2px] h-6 ${isDark ? 'bg-[#7aa2f7]' : 'bg-purple-600'}`}
                  style={{
                    left: `calc(${typedText.length * 10}px + 0.5rem)`,
                    transform: 'translateX(-50%)'
                  }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </div>

            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 relative">
              <div
                className={`h-2.5 rounded-full ${isDark ? 'bg-[#7aa2f7]' : 'bg-purple-600'}`}
                style={{ width: `${allLyrics ? (typedText.length / allLyrics.length) * 100 : 0}%` }}
              ></div>
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
            <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Click anywhere to start typing
            </p>
          ) : null}
        </div>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center p-4 rounded-lg ${
            isDark ? 'bg-[#414868]/50 border border-[#7aa2f7]' : 'bg-purple-100'
          }`}
        >
          <h3 className="text-xl font-bold mb-2">🎵 Perfect Performance! 🎵</h3>
          <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            You've completed typing with {wpm} WPM and {accuracy}% accuracy!
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className={`mt-3 px-4 py-2 rounded-lg font-medium ${
              isDark 
                ? 'bg-[#7aa2f7] text-[#1a1b26] hover:bg-[#7aa2f7]/90' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            Try again
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}