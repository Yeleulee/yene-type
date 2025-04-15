import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateWPM, calculateAccuracy, formatTime, getGradeFromAccuracy } from '../lib/utils';
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
    
    // Use requestAnimationFrame for more reliable focus
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        
        // Also try to force user activation
        textareaRef.current.click();
        hasAttemptedToFocus.current = true;
      }
    });
    
    // Additional focus attempts with increasing delays for reliability
    const delays = [100, 300, 500];
    
    delays.forEach(delay => {
      const timeoutId = window.setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          hasAttemptedToFocus.current = true;
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
    
    // Add a specific sync manager function that's triggered when video is playing but no lyrics are synced
    const syncLyricsWithCurrentTime = () => {
      console.log("Syncing lyrics with current time:", currentTime);
      
      if (!lyrics || lyrics.length === 0) {
        console.log("No lyrics available to sync");
        syncStatusRef.current = 'failed';
        return;
      }
      
      // Find the most appropriate lyric based on current video time
      let foundIndex = -1;
      
      // Use a more precise algorithm with lookahead
      for (let i = 0; i < lyrics.length; i++) {
        const lyric = lyrics[i];
        
        // Check if current time is within this lyric's timespan
        if (currentTime >= lyric.startTime && currentTime < lyric.endTime) {
          foundIndex = i;
          break;
        }
        
        // Look ahead to next lyric
        if (i < lyrics.length - 1) {
          const nextLyric = lyrics[i + 1];
          
          // Check if we're just before the next lyric with a small buffer
          if (currentTime >= lyric.endTime && currentTime < nextLyric.startTime) {
            // If we're closer to the next lyric, choose that one
            if (nextLyric.startTime - currentTime < 1.0) {
              foundIndex = i + 1;
            } else {
              foundIndex = i;
            }
            break;
          }
        }
        
        // Special case for the first lyric if we're just before it
        if (i === 0 && currentTime < lyric.startTime && lyric.startTime - currentTime < 2.0) {
          foundIndex = 0;
          break;
        }
      }
      
      if (foundIndex >= 0) {
        console.log(`Synced to lyric at index ${foundIndex}:`, lyrics[foundIndex].text);
        syncStatusRef.current = 'synced';
        
        // Update the current lyric in the store
        setCurrentPosition(0); // Reset typing position for the new lyric
        setStreakCount(0);     // Reset streak for the new lyric
        
        // Apply focus with slight delay to ensure UI has updated
        setTimeout(focusTextArea, 200);
      } else {
        console.log("Failed to find matching lyric for time:", currentTime);
        syncStatusRef.current = 'failed';
      }
    };
    
    // Check if we need to initiate sync
    if (syncStatusRef.current === 'pending' && isPlaying && currentTime > 0) {
      // Only try to sync if we haven't attempted recently (within 2 seconds)
      const now = Date.now();
      if (!syncAttemptTimeRef.current || now - syncAttemptTimeRef.current > 2000) {
        syncAttemptTimeRef.current = now;
        syncLyricsWithCurrentTime();
      }
    }
  }, [isPlaying, currentTime, lyrics, focusTextArea]);

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

  // Handle completion of the typing session
  const handleCompletion = () => {
    setIsComplete(true);
    setShowStats(true);
    
    // Save to high scores if meaningful text was typed
    if (text && text.length > 20) {
      addHighScore({
        wpm,
        accuracy,
        mode: 'video',
        songTitle: currentLyric?.text || 'Unknown'
      });
    }
  };

  // Enhanced handling of typing input
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentLyric || !isPlaying) return;
    
    const newValue = e.target.value;
    const currentTarget = currentLyric.text;
    
    // Start the timer on first keystroke
    if (newValue.length === 1 && startTime === null) {
      setStartTime(Date.now());
    }
    
    // Ensure what the user types stays in sync with the target text
    const isCorrect = currentTarget.startsWith(newValue);
    const isPossiblyBackspace = newValue.length < typedText.length;
    
    // If user typed something wrong but is now correcting with backspace, allow it
    if (!isCorrect && !isPossiblyBackspace) {
      // Play error sound if enabled
      if (enableErrorSound && errorSoundRef.current) {
        errorSoundRef.current.play().catch(e => {
          // Ignore playback errors - they commonly happen due to user interaction requirements
        });
      }
      
      // Add shake animation to the text
      if (lyricsRef.current) {
        lyricsRef.current.classList.add('shake-animation');
        setTimeout(() => {
          if (lyricsRef.current) {
            lyricsRef.current.classList.remove('shake-animation');
          }
        }, 200);
      }
      
      setErrors(errors + 1);
      
      // Don't update the typed text for incorrect input
      return;
    }
    
    // If we get here, the input is valid or the user is correcting with backspace
    setTypedText(newValue);
    
    // Check if user has completed typing the current lyric
    if (newValue === currentTarget) {
      // Mark this line as completed
      completeCurrentLine();
      
      // Update WPM and accuracy
      if (startTime) {
        const elapsedTimeInMinutes = (Date.now() - startTime) / 60000;
        const wordsTyped = newValue.split(' ').length;
        const newWPM = calculateWPM(wordsTyped, elapsedTimeInMinutes);
        const newAccuracy = calculateAccuracy(errors, newValue.length);
        
        setWPM(newWPM);
        setAccuracy(newAccuracy);
        
        // Auto-advance to next line after completion
        setTypedText('');
      }
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

        // Handle real-time sync adjustments for better accuracy
        if (currentTime > 0 && index > 0) {
          // Calculate how far we are through the current lyric
          const currentLineDuration = currentLyric.endTime - currentLyric.startTime;
          const elapsedInCurrentLine = currentTime - currentLyric.startTime;
          const progressPercent = elapsedInCurrentLine / currentLineDuration;
          
          // If we're less than 10% into a new line, it might be premature
          // If we're over 90% through a line, the next one might be late
          // Only log extreme timing issues for debugging
          if (progressPercent < 0.1) {
            console.log(`Sync: Line ${index} appears to start early (${Math.round(progressPercent * 100)}%)`);
          } else if (progressPercent > 0.9) {
            console.log(`Sync: Line ${index} appears to end late (${Math.round(progressPercent * 100)}%)`);
          }
        }
        
        // Scroll to the current lyric if we have a reference to the container
        if (lyricsRef.current) {
          const lyricElements = lyricsRef.current.querySelectorAll('.lyric-line');
          if (lyricElements && lyricElements.length > index && lyricElements[index]) {
            lyricElements[index].scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }
        
        // If user hasn't started typing yet, set the cursor position to the start of this lyric
        if (typedText.length === 0 || !startTime) {
          // Find the position of this lyric text in the combined lyrics
          const allLyricsText = lyrics.map(l => l.text).join(' ');
          const position = allLyricsText.indexOf(currentLyric.text);
          if (position >= 0) {
            setCurrentPosition(position);
          }
        }
      }
    }
  }, [currentLyric, lyrics, activeLineIndex, typedText, startTime, currentTime]);
  
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

  // Enhanced highlighting for the current position
  const renderText = useCallback(() => {
    if (!currentLyric || !currentLyric.text) return null;
    
    const wordsToRender = currentLyric.text.split(' ');
    const typedWords = typedText.split(' ');
    
    return (
      <div className="relative">
        <div className="flex flex-wrap gap-1 text-xl md:text-2xl leading-relaxed font-medium">
          {wordsToRender.map((word, i) => {
            const isCurrentWord = i === typedWords.length - 1;
            const isTypedCorrectly = i < typedWords.length && typedWords[i] === word;
            const isTypedIncorrectly = i < typedWords.length && typedWords[i] !== word;
            const isTyped = i < typedWords.length;
            
            // Determine word style based on typing status
            let wordClassName = '';
            if (isTyped) {
              if (isTypedCorrectly) {
                wordClassName = `${isDark ? 'text-green-400' : 'text-green-600'} transition-colors`;
              } else {
                wordClassName = `${isDark ? 'text-red-400' : 'text-red-600'} transition-colors`;
              }
            } else {
              wordClassName = `${isDark ? 'text-gray-400' : 'text-gray-600'} transition-colors`;
            }
            
            if (isCurrentWord) {
              wordClassName += ` ${isDark ? 'bg-gray-800/50' : 'bg-indigo-100/50'} rounded px-1 -mx-1 relative`;
            }
            
            return (
              <span key={i} className={wordClassName}>
                {word}
                {isCurrentWord && (
                  <motion.span
                    className={`absolute bottom-0 left-0 h-0.5 ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </span>
            );
          })}
        </div>
      </div>
    );
  }, [currentLyric, typedText, isDark]);

  // Add a nicer completion message
  const renderCompletionMessage = () => {
    return (
      <motion.div 
        className="completion-message"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="completion-header">
          <Check size={24} className="text-green-500" />
          <h3>Typing Complete!</h3>
        </div>
        <p>You've completed typing this song.</p>
        {wpm > 60 && <p className="achievement">Fast typer! Your speed is impressive!</p>}
        {accuracy > 95 && <p className="achievement">Amazing accuracy! Almost perfect!</p>}
        <button 
          className="try-again-btn"
          onClick={handleReset}
        >
          <RefreshCw size={16} className="mr-1" />
          Try Again
        </button>
      </motion.div>
    );
  };

  // More responsive rendering of the typing text
  const renderTypingArea = () => {
    if (!isPlaying && !text) {
      return (
        <div className="empty-state">
          <BookOpen size={48} className="mb-4 opacity-50" />
          <h3>No Lyrics Selected</h3>
          <p>Search for a song and select it to start typing</p>
        </div>
      );
    }
    
    if (isComplete) {
      return renderCompletionMessage();
    }
    
    return (
      <div className="typing-input-container">
        <textarea
          ref={textareaRef}
          value={typedText}
          onChange={handleTyping}
          className={`typing-input ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
          placeholder={showTip ? "Start typing the lyrics..." : ""}
          onFocus={handleFocus}
          autoFocus
          disabled={!isPlaying}
        />
        
        {/* Tip to show initially */}
        {showTip && !typedText && (
          <div className="typing-tip">
            <Keyboard className="tip-icon" />
            <span>Type along with the lyrics as they appear!</span>
          </div>
        )}
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

  // Enhanced stats display with grade
  const renderStats = () => {
  return (
    <motion.div 
        className={`typing-stats ${isDark ? 'text-white' : 'text-gray-800'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="stat-item">
          <Zap className="stat-icon" />
          <div className="stat-value">{wpm}</div>
          <div className="stat-label">WPM</div>
          </div>
        <div className="stat-item">
          <Award className="stat-icon" />
          <div className="stat-value">{accuracy.toFixed(1)}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="stat-item">
          <AlertTriangle className="stat-icon" />
          <div className="stat-value">{errors}</div>
          <div className="stat-label">Errors</div>
          </div>
        <div className="stat-item">
          <Award className="stat-icon" />
          <div className="stat-value">{getGradeFromAccuracy(accuracy)}</div>
          <div className="stat-label">Grade</div>
          </div>
      </motion.div>
    );
  };

  return (
    <div className={`typing-container ${isDark ? 'dark-mode' : 'light-mode'}`}>
      <style>{shakeAnimationStyle}</style>
      
      {/* Lyrics display section with highlighting */}
      <div 
        ref={lyricsRef}
        className={`lyrics-display ${currentLyric ? 'active' : ''} ${isDark ? 'text-gray-100' : 'text-gray-800'}`}
      >
        <div className="lyrics-display relative mb-4 px-1 py-2">
          {renderText()}
          {!isComplete && videoLoaded && !currentLyric && (
            <div className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <p className="text-lg">Waiting for lyrics...</p>
              <p className="text-sm mt-1">If lyrics don't appear, try another song</p>
            </div>
          )}
        </div>
      </div>

      {/* Typing statistics */}
      {isComplete ? (
        renderStats()
      ) : (
        <div className={`typing-stats ${isDark ? 'text-white' : 'text-gray-800'}`}>
          <div className="stat-item">
            <Zap className="stat-icon" />
            <div className="stat-value">{wpm}</div>
            <div className="stat-label">WPM</div>
                  </div>
          <div className="stat-item">
            <Award className="stat-icon" />
            <div className="stat-value">{accuracy.toFixed(1)}%</div>
            <div className="stat-label">Accuracy</div>
                </div>
          <div className="stat-item">
            <AlertTriangle className="stat-icon" />
            <div className="stat-value">{errors}</div>
            <div className="stat-label">Errors</div>
                  </div>
          {streakCount > 5 && (
            <div className="stat-item streak-highlight">
              <Zap className="stat-icon" />
              <div className="stat-value">{streakCount}</div>
              <div className="stat-label">Streak</div>
                </div>
          )}
                  </div>
      )}
      
      {/* Controls bar */}
      <div className="controls-bar">
        {/* Sound toggle button */}
            <button 
          className={`sound-toggle ${isDark ? 'text-white' : 'text-gray-800'}`}
          onClick={() => setEnableErrorSound(!enableErrorSound)}
          title={enableErrorSound ? "Mute error sounds" : "Enable error sounds"}
        >
          {enableErrorSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
        
        {/* Reset button */}
        <button 
          className={`reset-button ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
          onClick={handleReset}
        >
          <RefreshCw size={16} className="mr-1" />
          Reset
        </button>
              </div>

      {/* Typing area with dynamic rendering */}
      {renderTypingArea()}
      
      {/* Debug overlay (hidden by default) */}
      {showDebug && (
        <div className="debug-overlay">
          <h4>Debug Info</h4>
          <ul>
            <li>Current Time: {formatTime(currentTime)}</li>
            <li>Active Lyric: {activeLyricIndex}</li>
            <li>Current Lyric: {currentLyric?.text.substring(0, 30)}...</li>
            <li>Position: {currentPosition}</li>
            <li>Playing: {isPlaying ? 'Yes' : 'No'}</li>
            <li>Video Loaded: {videoLoaded ? 'Yes' : 'No'}</li>
            <li>Sync Status: {syncStatusRef.current}</li>
          </ul>
            </div>
        )}
      </div>
  );
}