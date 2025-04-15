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
  BookOpen,
  Volume2,
  VolumeX
} from 'lucide-react';
import '../styles/typing-animations.css'; // Import animations CSS

// Helper function to format time in MM:SS format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// CSS for shake animation
const shakeAnimationStyle = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }
  .shake-animation {
    animation: shake 0.2s ease-in-out;
  }
  .cursor-highlight {
    position: relative;
  }
`;

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
    currentTime,
    videoLoaded,
    activeLyricIndex,
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
  const [enableErrorSound, setEnableErrorSound] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);
  const hasAttemptedToFocus = useRef(false);
  const focusTimeoutRefs = useRef<number[]>([]);
  const syncStatusRef = useRef<'pending' | 'synced' | 'failed'>('pending');
  const syncAttemptTimeRef = useRef<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  // Create audio element for error sound
  useEffect(() => {
    // Create a simple beep sound for errors
    errorSoundRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" + Array(100).join("A"));
    errorSoundRef.current.volume = 0.2; // Keep the volume low
    
    return () => {
      if (errorSoundRef.current) {
        errorSoundRef.current = null;
      }
    };
  }, []);

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

  // Maintain focus when lyrics change or user clicks elsewhere on the page
  useEffect(() => {
    // Focus the textarea when the component mounts
    focusTextArea();
    
    // Add global click handler to refocus textarea when user clicks anywhere in typing area
    const handleGlobalClick = (e: MouseEvent) => {
      // Check if click was inside our component
      const typingAreaElement = document.querySelector('.typing-container');
      if (typingAreaElement && typingAreaElement.contains(e.target as Node)) {
        focusTextArea();
      }
    };
    
    // Add global keyboard handler to refocus on any key press when typing area is active
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys and some special keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Tab', 'Escape', 'CapsLock', 'Insert'].includes(e.key)) return;
      
      // If we have lyrics and are playing, ensure focus on any keypress
      if (allLyrics && isPlaying && !isComplete) {
        focusTextArea();
      }
    };
    
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      
      // Clear all focus timeouts
      focusTimeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
    };
  }, [focusTextArea, allLyrics, isPlaying, isComplete]);

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
    
    // Check if the new character is an error
    const lastCharIndex = newTypedText.length - 1;
    if (newTypedText.length > typedText.length && 
        lastCharIndex < allLyrics.length && 
        newTypedText[lastCharIndex] !== allLyrics[lastCharIndex]) {
      // Play error sound if enabled
      if (enableErrorSound && errorSoundRef.current) {
        errorSoundRef.current.currentTime = 0;
        errorSoundRef.current.play().catch(err => console.log("Error playing sound:", err));
      }
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

  // Highlight the current line based on time synchronization
  useEffect(() => {
    if (currentLyric && lyrics.length > 0) {
      // Find the corresponding index in the lyrics array
      const index = lyrics.findIndex(lyric => lyric.text === currentLyric.text);
      if (index !== -1 && index !== activeLineIndex) {
        setActiveLineIndex(index);
        
        // Scroll to the current lyric if we have a reference to the container
        if (lyricsRef.current) {
          const lyricElements = lyricsRef.current.querySelectorAll('.lyric-line');
          if (lyricElements[index]) {
            lyricElements[index].scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }
      }
    }
  }, [currentLyric, lyrics, activeLineIndex]);
  
  // Sync with currentTime changes
  useEffect(() => {
    if (currentTime > 0 && lyrics.length > 0 && activeLyricIndex >= 0) {
      // We have a valid time and active lyric - ensure the typing interface is synced
      const lyric = lyrics[activeLyricIndex];
      if (lyric && lyric.text) {
        // Focus the textarea if we're now active
        if (!hasAttemptedToFocus.current && isPlaying) {
          focusTextArea();
          hasAttemptedToFocus.current = true;
        }
      }
    }
  }, [currentTime, activeLyricIndex, lyrics, isPlaying, focusTextArea]);

  // Improved scroll to current lyric when it changes
  useEffect(() => {
    if (currentLyric && allLyrics && lyricsRef.current) {
      // Get the exact position of the current lyric in the full text
      const currentLyricPosition = allLyrics.indexOf(currentLyric.text);
      
      if (currentLyricPosition >= 0) {
        // Find the character elements in the container
        const charElements = Array.from(lyricsRef.current.children);
        
        // If we have elements and the current position is within bounds
        if (charElements.length > 0 && currentLyricPosition < charElements.length) {
          // Calculate the position to scroll to - we want to see several characters ahead
          const scrollIndex = Math.max(0, currentLyricPosition - 5);
          
          // More reliable scrolling with a slight delay to ensure DOM is updated
          setTimeout(() => {
            if (charElements[scrollIndex]) {
              // Smooth scroll to keep the current lyric in view
              charElements[scrollIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
              });
              
              // Add a pulsing animation to the element for better visibility
              charElements.slice(currentLyricPosition, currentLyricPosition + currentLyric.text.length).forEach(el => {
                el.classList.add('highlight-text');
                // Remove the highlight after a delay to avoid too many highlighted elements
                setTimeout(() => {
                  el.classList.remove('highlight-text');
                }, 2000);
              });
            }
          }, 300);
        }
      }
    }
  }, [currentLyric, allLyrics]);
  
  // Enhanced auto-advance to ensure sync with song
  useEffect(() => {
    if (!isPlaying || !currentLyric || !allLyrics) return;
    
    // Find the position of the current lyric in the text
    const currentLyricPosition = allLyrics.indexOf(currentLyric.text);
    
    // If user is significantly behind the current lyrics position, auto-advance
    if (currentLyricPosition > 0 && typedText.length < currentLyricPosition - 20) {
      // Only auto-advance if the song has been playing for a while
      if (currentTime > 5) {
        // Move the typed text position to just before the current lyric
        // Calculate the position to set the cursor to
        const newPosition = Math.max(0, currentLyricPosition - 3);
        setTypedText(allLyrics.substring(0, newPosition));
        setCurrentPosition(newPosition);
        
        // Ensure textarea focus is maintained
        focusTextArea();
      }
    }
  }, [currentLyric, currentTime, allLyrics, typedText, isPlaying, focusTextArea]);

  // Additional effect to sync with current time more frequently
  useEffect(() => {
    // Only run if playing and we have lyrics
    if (!isPlaying || !allLyrics || !lyrics || lyrics.length === 0) return;
    
    // Check current time against lyrics more frequently for better sync
    const syncInterval = setInterval(() => {
      // Find the lyric that should be active at the current time
      if (currentTime > 0) {
        for (let i = 0; i < lyrics.length; i++) {
          const lyric = lyrics[i];
          const nextLyric = i < lyrics.length - 1 ? lyrics[i + 1] : null;
          
          // Check if current time falls within this lyric's time range
          if (lyric.startTime <= currentTime && 
              (!nextLyric || nextLyric.startTime > currentTime)) {
            
            // If this is different from our current active lyric, update UI
            if (activeLyricIndex !== i) {
              // Find the position of this lyric in the full text
              const lyricPosition = allLyrics.indexOf(lyric.text);
              
              // If user is significantly behind, help them catch up
              if (lyricPosition > 0 && typedText.length < lyricPosition - 30) {
                setTypedText(allLyrics.substring(0, lyricPosition - 5));
                setCurrentPosition(lyricPosition - 5);
              }
              
              // Force update the active lyric index in the store
              const store = useTypingStore.getState();
              // Update both the current lyric and active index directly in the store
              store.setCurrentLyric(lyric);
              // Manually update active index since there's no direct setter
              useTypingStore.setState({ ...store, activeLyricIndex: i });
              
              // Ensure the current lyric is in view - more aggressively
              if (lyricsRef.current) {
                const charElements = Array.from(lyricsRef.current.children);
                if (charElements.length > 0 && lyricPosition < charElements.length) {
                  const targetElement = charElements[Math.max(0, lyricPosition)];
                  if (targetElement) {
                    targetElement.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center'
                    });
                    
                    // Add strong visual highlight to current lyric section
                    charElements.forEach((el, idx) => {
                      // Clear all highlights first
                      el.classList.remove('current-lyric-char');
                      el.classList.remove('highlight-text');
                      
                      // Then add highlights for current lyric only
                      if (idx >= lyricPosition && idx < lyricPosition + lyric.text.length) {
                        el.classList.add('current-lyric-char');
                        el.classList.add('highlight-text');
                      }
                    });
                  }
                }
              }
            }
            break;
          }
        }
      }
    }, 100); // Check very frequently for better synchronization
    
    return () => clearInterval(syncInterval);
  }, [isPlaying, currentTime, lyrics, allLyrics, typedText, activeLyricIndex]);

  // Direct reaction to currentTime changes to enhance sync
  useEffect(() => {
    if (!isPlaying || !lyrics || lyrics.length === 0 || currentTime <= 0) return;
    
    // Directly check which lyric should be active based on current time
    let foundActiveIndex = -1;
    
    for (let i = 0; i < lyrics.length; i++) {
      const lyric = lyrics[i];
      const nextLyric = i < lyrics.length - 1 ? lyrics[i + 1] : null;
      
      if (lyric.startTime <= currentTime && (!nextLyric || nextLyric.startTime > currentTime)) {
        foundActiveIndex = i;
        break;
      }
    }
    
    // If we found a matching lyric and it's different from current
    if (foundActiveIndex >= 0 && foundActiveIndex !== activeLyricIndex) {
      // Update the store
      const store = useTypingStore.getState();
      store.setCurrentLyric(lyrics[foundActiveIndex]);
      // Update the active index directly in the state
      useTypingStore.setState({ ...store, activeLyricIndex: foundActiveIndex });
      
      // Visual feedback for the sync
      if (lyricsRef.current) {
        // Directly force-highlight the new active lyric
        const lyricText = lyrics[foundActiveIndex].text;
        const lyricPosition = allLyrics.indexOf(lyricText);
        
        if (lyricPosition >= 0) {
          // Force immediate visual feedback
          setTimeout(() => {
            if (lyricsRef.current) {
              const charElements = Array.from(lyricsRef.current.children);
              
              // Create a strong visual pulse animation for the current lyric
              charElements.forEach((el, idx) => {
                if (idx >= lyricPosition && idx < lyricPosition + lyricText.length) {
                  // Add and then remove class to create pulse effect
                  el.classList.add('highlight-pulse');
                  setTimeout(() => el.classList.remove('highlight-pulse'), 300);
                }
              });
              
              // Scroll immediately to the current lyric
              if (charElements[lyricPosition]) {
                charElements[lyricPosition].scrollIntoView({
                  behavior: 'auto', // Use 'auto' for immediate scroll without animation
                  block: 'center'
                });
              }
            }
          }, 0);
        }
      }
    }
  }, [currentTime, lyrics, activeLyricIndex, isPlaying, allLyrics]);

  // When video loads, reset and prepare for typing
  useEffect(() => {
    if (videoLoaded) {
      reset();
      setStartTime(null);
      setIsComplete(false);
      setCurrentPosition(0);
      hasAttemptedToFocus.current = false;
      
      // Focus the text area when the video is loaded
      focusTextArea();
    }
  }, [videoLoaded, reset, focusTextArea]);

  // Force re-sync every time currentTime changes or when lyrics change
  useEffect(() => {
    if (!isPlaying || !currentLyric || allLyrics.length === 0) return;

    // Get the position of the current lyric in the entire text
    const lyricPosition = allLyrics.indexOf(currentLyric.text);
    if (lyricPosition < 0) return;

    // Force the current position to be visible
    requestAnimationFrame(() => {
      if (lyricsRef.current) {
        const charElements = Array.from(lyricsRef.current.children);
        
        // Mark all characters with their relation to current lyric
        charElements.forEach((el, idx) => {
          // First remove all status classes
          el.classList.remove('current-section');
          el.classList.remove('past-section');
          el.classList.remove('future-section');
          
          // Add appropriate class based on position
          if (idx >= lyricPosition && idx < lyricPosition + currentLyric.text.length) {
            el.classList.add('current-section');
          } else if (idx < lyricPosition) {
            el.classList.add('past-section');
          } else {
            el.classList.add('future-section');
          }
        });
        
        // Make sure the current lyric is always visible
        if (charElements[lyricPosition]) {
          const container = lyricsRef.current;
          const element = charElements[lyricPosition];
          
          // Calculate if element is in view
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          
          const isInView = 
            elementRect.top >= containerRect.top && 
            elementRect.bottom <= containerRect.bottom;
            
          // If not in view, scroll to it immediately
          if (!isInView) {
            element.scrollIntoView({
              behavior: 'auto',
              block: 'start'
            });
          }
        }
      }
    });
    
    // Add a very strong visual indicator for the current position
    const endOfCurrentLyric = lyricPosition + currentLyric.text.length;
    const userPosition = Math.min(typedText.length, allLyrics.length);
    
    // If user is typing and has reached or passed the current lyric but hasn't completed it
    if (userPosition >= lyricPosition && userPosition < endOfCurrentLyric) {
      // User is currently typing the active lyric - perfect sync!
      console.log("User is typing the active lyric - perfect sync!");
    } 
    // If user is behind the current lyric
    else if (userPosition < lyricPosition) {
      // User needs to catch up
      if (lyricPosition - userPosition > 30) {
        // If too far behind, auto-advance
        setTypedText(allLyrics.substring(0, Math.max(0, lyricPosition - 5)));
        setCurrentPosition(Math.max(0, lyricPosition - 5));
        focusTextArea(); // Keep focus
        console.log("Auto-advanced to catch up with current lyric");
      } else {
        // Just draw attention to the current lyric
        console.log("User needs to type faster to keep up");
      }
    }
    // If user is ahead of current lyric
    else if (userPosition > endOfCurrentLyric) {
      // User is ahead of the current lyric
      console.log("User is ahead of the current lyric");
    }
  }, [currentTime, currentLyric, allLyrics, typedText.length, isPlaying, focusTextArea]);

  // Modified renderTypingText to highlight the current line based on time
  const renderTypingText = () => {
    if (!text || text.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <BookOpen className={`w-12 h-12 ${isDark ? 'text-indigo-400' : 'text-indigo-600'} opacity-50 mb-4`} />
          <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Select a song to start typing
          </p>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Search for a song above and practice typing with lyrics
          </p>
        </div>
      );
    }
    
    if (isComplete) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
              }`}>
                <Check className={`w-10 h-10 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {wpm >= 80 ? 'Amazing!' : wpm >= 60 ? 'Great job!' : 'Completed!'}
              </h3>
              <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                You've finished typing this song!
              </p>
              
              <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-md">
                <div className={`p-4 rounded-lg ${
                  isDark ? 'bg-slate-800' : 'bg-white'
                } flex flex-col items-center`}>
                  <BarChart className={`w-5 h-5 mb-1 ${
                    isDark ? 'text-indigo-400' : 'text-indigo-600'
                  }`} />
                  <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {wpm}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    WPM
                  </span>
                </div>
                
                <div className={`p-4 rounded-lg ${
                  isDark ? 'bg-slate-800' : 'bg-white'
                } flex flex-col items-center`}>
                  <Award className={`w-5 h-5 mb-1 ${
                    accuracy > 95 
                      ? 'text-green-500' 
                      : accuracy > 85 
                        ? 'text-yellow-500' 
                        : 'text-red-500'
                  }`} />
                  <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {accuracy.toFixed(1)}%
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Accuracy
                  </span>
                </div>
                
                <div className={`p-4 rounded-lg ${
                  isDark ? 'bg-slate-800' : 'bg-white'
                } flex flex-col items-center`}>
                  <AlertTriangle className={`w-5 h-5 mb-1 ${
                    errors < 5 
                      ? 'text-green-500' 
                      : errors < 15 
                        ? 'text-yellow-500' 
                        : 'text-red-500'
                  }`} />
                  <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {errors}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Errors
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleReset}
                className={`mt-6 px-6 py-3 rounded-lg flex items-center gap-2 ${
                  isDark 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                } transition-colors`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          </motion.div>
        </div>
      );
    }
    
    // Render the lyrics with time-based highlighting
    return (
      <div className="relative overflow-hidden px-4">
        {/* Enhanced interactive typing display showing character-by-character feedback */}
        <div className={`rounded-lg font-mono text-lg leading-relaxed ${
          isDark ? 'bg-slate-800/70 border border-slate-700/50' : 'bg-white border border-slate-200/80 shadow-sm'
        }`}>
          {allLyrics && (
            <div className="relative">
              {/* Current lyric indicator */}
              {currentLyric && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`py-3 px-4 mb-4 rounded-lg ${
                    isDark 
                      ? 'bg-indigo-500/20 border-l-4 border-indigo-500' 
                      : 'bg-indigo-100 border-l-4 border-indigo-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`px-2 py-0.5 rounded-md font-mono text-xs ${
                      isDark 
                        ? 'bg-indigo-500/50 text-white' 
                        : 'bg-indigo-500 text-white'
                    }`}>
                      {formatTime(currentLyric.startTime || 0)}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                    }`}>
                      Now
                    </div>
                  </div>
                  <p className={`text-xl font-medium ${isDark ? 'text-white' : 'text-gray-800'} highlight-text`}>
                    {currentLyric.text}
                  </p>
                </motion.div>
              )}
              
              {/* Text content with character-by-character coloring - improved highlighting */}
              <div className="flex flex-wrap py-5 px-4 overflow-auto max-h-[200px] typing-container scrollbar-dark" ref={lyricsRef}>
                {allLyrics.split('').map((char, index) => {
                  let status = 'waiting';
                  // Character is waiting to be typed
                  if (index >= typedText.length) {
                    status = 'waiting';
                  } 
                  // Character was typed correctly
                  else if (char === typedText[index]) {
                    status = 'correct';
                  } 
                  // Character was typed incorrectly
                  else {
                    status = 'incorrect';
                  }
                  
                  // Special styling for spaces and newlines
                  const isSpace = char === ' ';
                  
                  // Current position highlighting
                  const isCurrent = index === typedText.length;
                  
                  // Enhanced check for current lyric - more precise
                  const isCurrentLyric = currentLyric && 
                    index >= allLyrics.indexOf(currentLyric.text) && 
                    index < allLyrics.indexOf(currentLyric.text) + currentLyric.text.length;
                  
                  // Check if this is the next upcoming lyric
                  const isNextLyric = lyrics && 
                    activeLyricIndex < lyrics.length - 1 && 
                    index >= allLyrics.indexOf(lyrics[activeLyricIndex + 1]?.text || '') && 
                    index < allLyrics.indexOf(lyrics[activeLyricIndex + 1]?.text || '') + 
                      (lyrics[activeLyricIndex + 1]?.text.length || 0);
                  
                  // Apply appropriate CSS classes based on status with improved highlighting
                  const classes = [
                    'relative',
                    isSpace ? 'px-1' : 'px-0.5',
                    isCurrent ? 'char-current cursor-highlight' : '',
                    status === 'correct' ? 'char-correct' : '',
                    status === 'incorrect' ? 'char-incorrect shake-animation' : '',
                    status === 'waiting' && isCurrentLyric ? 'char-active' : '',
                    status === 'waiting' && isNextLyric ? 'char-next' : '',
                    status === 'waiting' && !isCurrentLyric && !isNextLyric ? 'char-inactive' : '',
                    isCurrentLyric && isCurrent ? 'pulse-animation' : '',
                    isCurrentLyric ? 'current-lyric-char' : ''
                  ];
                  
                  return (
                    <motion.span 
                      key={index}
                      initial={isCurrent ? { scale: 1.1 } : { scale: 1 }}
                      animate={isCurrent ? { scale: 1 } : { scale: 1 }}
                      className={classes.filter(Boolean).join(' ')}
                    >
                      {isSpace ? '\u00A0' : char}
                      {/* Enhanced cursor */}
                      {isCurrent && (
                        <motion.div 
                          className={`absolute -left-1 -right-1 -bottom-1 -top-1 rounded ${
                            isCurrentLyric ? 'current-char-bg' : ''
                          }`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.span 
                            className={`absolute left-0 bottom-0 w-full h-[3px] ${
                              isCurrentLyric 
                                ? 'bg-indigo-500' 
                                : isDark 
                                  ? 'bg-slate-500' 
                                  : 'bg-slate-400'
                            }`}
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: 1 }}
                            transition={{ 
                              repeat: Infinity, 
                              repeatType: "reverse", 
                              duration: 0.8 
                            }}
                          />
                        </motion.div>
                      )}
                    </motion.span>
                  );
                })}
              </div>
              
              {/* Show next upcoming lyric */}
              {lyrics && activeLyricIndex < lyrics.length - 1 && (
                <div className={`py-3 px-4 mt-4 rounded-lg ${
                  isDark ? 'bg-slate-700/50' : 'bg-slate-100'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`px-2 py-0.5 rounded-md font-mono text-xs ${
                      isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {formatTime(lyrics[activeLyricIndex + 1].startTime || 0)}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      isDark ? 'bg-slate-600/30 text-slate-400' : 'bg-slate-200 text-slate-500'
                    }`}>
                      Next
                    </div>
                  </div>
                  <p className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-500'} opacity-75`}>
                    {lyrics[activeLyricIndex + 1].text}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Show stats while typing */}
          {startTime && !isComplete && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between mt-6 p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10"
            >
              <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white/70'} flex items-center gap-2`}>
                <Zap className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <div>
                  <span className={`font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{wpm}</span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}> WPM</span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white/70'} flex items-center gap-2`}>
                <Check className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <div>
                  <span className={`font-bold ${isDark ? 'text-green-300' : 'text-green-600'}`}>{accuracy}%</span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}> Accuracy</span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white/70'} flex items-center gap-2`}>
                <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <div>
                  <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{errors}</span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}> Errors</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Typing area */}
        <div className={`relative mt-4 ${isDark ? 'typing-area-dark' : 'typing-area-light'}`}>
          <textarea
            ref={textareaRef}
            value={typedText}
            onChange={handleTyping}
            onFocus={handleFocus}
            className={`w-full h-24 p-4 rounded-lg resize-none focus:ring-2 focus:ring-opacity-50 ${
              isDark 
                ? 'bg-slate-800 text-white border-slate-700 focus:ring-indigo-500' 
                : 'bg-white text-gray-800 border-gray-200 focus:ring-indigo-400'
            } border transition-all`}
            placeholder="Type the lyrics here..."
            aria-label="Type the lyrics here"
          />
          
          {showTip && !typedText && (
            <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <Keyboard className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click here and start typing to the rhythm</p>
            </div>
          )}
        </div>
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
            onClick={() => setEnableErrorSound(!enableErrorSound)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
            }`}
            title={enableErrorSound ? "Disable error sound" : "Enable error sound"}
          >
            {enableErrorSound ? (
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Sound On</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <VolumeX className="w-3.5 h-3.5" />
                <span>Sound Off</span>
              </span>
            )}
          </motion.button>
          
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