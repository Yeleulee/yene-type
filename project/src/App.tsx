import React, { useState, useEffect } from 'react';
import { Music2, Settings, Moon, Sun, Trophy, Crown, Headphones, Clock, Zap, BarChart2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { YouTubePlayer } from './components/YouTubePlayer';
import { TypingArea } from './components/TypingArea';
import { SearchBar } from './components/SearchBar';
import { useTypingStore } from './store/typingStore';
import type { YouTubeVideo } from './lib/youtube';

function App() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const { difficulty, setDifficulty, highScores } = useTypingStore();
  const [isDark, setIsDark] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Set dark mode based on user preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  const handleVideoSelect = (videoId: string) => {
    console.log("App: Video selected - ID:", videoId);
    console.log("App: Current videoId state:", videoId);
    // Reset the typing store first
    useTypingStore.getState().reset();
    console.log("App: Typing store reset");
    // Set the video ID after resetting
    setVideoId(videoId);
    console.log("App: Video ID set");
    // Set isPlaying to true to start the video
    useTypingStore.getState().setIsPlaying(true);
    console.log("App: Playing state set to true");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1a1b26] text-gray-100' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-[#24283b]/80' : 'bg-white/80'} border-b ${isDark ? 'border-[#414868]' : 'border-gray-200'} sticky top-0 z-50 backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Music2 className={`w-8 h-8 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-500"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.8, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
                Yene Type
              </h1>
            </motion.div>
            
            {/* Desktop controls */}
            <div className="hidden md:flex items-center gap-4">
              <motion.div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const levels: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
                  const currentIndex = levels.indexOf(difficulty);
                  const nextIndex = (currentIndex + 1) % levels.length;
                  setDifficulty(levels[nextIndex]);
                }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-[#1a1b26] hover:bg-[#414868]' 
                      : 'bg-white shadow-sm hover:bg-purple-50'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${
                    difficulty === 'easy' 
                      ? (isDark ? 'text-[#9ece6a]' : 'text-green-500') 
                      : difficulty === 'medium'
                        ? (isDark ? 'text-[#e0af68]' : 'text-yellow-500')
                        : (isDark ? 'text-[#f7768e]' : 'text-red-500')
                  }`} />
                  <span className="capitalize">{difficulty}</span>
                </motion.button>
                
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute top-full mt-2 left-0 p-2 rounded text-xs w-40 ${
                      isDark ? 'bg-[#414868] text-gray-200' : 'bg-white text-gray-700 shadow-md'
                    }`}
                  >
                    Click to change difficulty level. Affects typing speed requirements.
                  </motion.div>
                )}
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'bg-[#1a1b26] hover:bg-[#414868]' 
                    : 'bg-white shadow-sm hover:bg-purple-50'
                }`}
                onClick={() => setShowHighScores(!showHighScores)}
              >
                <Trophy className={`w-4 h-4 ${isDark ? 'text-[#bb9af7]' : 'text-purple-600'}`} />
                <span>Stats</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-3 rounded-lg transition-colors ${
                  isDark 
                    ? 'bg-[#1a1b26] hover:bg-[#414868]' 
                    : 'bg-white shadow-sm hover:bg-purple-50'
                }`}
                onClick={() => setIsDark(!isDark)}
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-[#ffd93d]" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-600" />
                )}
              </motion.button>
            </div>
            
            {/* Mobile controls */}
            <div className="md:hidden">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMobileSettings(!showMobileSettings)}
                className={`p-2 rounded-lg ${
                  isDark ? 'bg-[#1a1b26]' : 'bg-white shadow-sm'
                }`}
              >
                {showMobileSettings ? 
                  <ChevronUp className={`w-5 h-5 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} /> : 
                  <ChevronDown className={`w-5 h-5 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'}`} />
                }
              </motion.button>
            </div>
          </div>
          
          {/* Mobile Settings Panel */}
          <AnimatePresence>
            {showMobileSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden overflow-hidden mt-3"
              >
                <div className="flex items-center justify-between gap-2 py-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const levels: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
                      const currentIndex = levels.indexOf(difficulty);
                      const nextIndex = (currentIndex + 1) % levels.length;
                      setDifficulty(levels[nextIndex]);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${
                      isDark ? 'bg-[#1a1b26]' : 'bg-white shadow-sm'
                    }`}
                  >
                    <Zap className={`w-4 h-4 ${
                      difficulty === 'easy' 
                        ? (isDark ? 'text-[#9ece6a]' : 'text-green-500') 
                        : difficulty === 'medium'
                          ? (isDark ? 'text-[#e0af68]' : 'text-yellow-500')
                          : (isDark ? 'text-[#f7768e]' : 'text-red-500')
                    }`} />
                    <span className="text-sm capitalize">{difficulty}</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${
                      isDark ? 'bg-[#1a1b26]' : 'bg-white shadow-sm'
                    }`}
                    onClick={() => setShowHighScores(!showHighScores)}
                  >
                    <Trophy className={`w-4 h-4 ${isDark ? 'text-[#bb9af7]' : 'text-purple-600'}`} />
                    <span className="text-sm">Stats</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${
                      isDark ? 'bg-[#1a1b26]' : 'bg-white shadow-sm'
                    }`}
                    onClick={() => setIsDark(!isDark)}
                  >
                    {isDark ? (
                      <>
                        <Sun className="w-4 h-4 text-[#ffd93d]" />
                        <span className="text-sm">Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Dark</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mt-4">
            <SearchBar onSelectVideo={handleVideoSelect} isDark={isDark} />
          </div>
        </div>
      </header>

      {/* High Scores Modal */}
      <AnimatePresence>
        {showHighScores && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowHighScores(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDark ? 'bg-[#24283b]' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4 shadow-xl`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart2 className={`w-5 h-5 ${isDark ? 'text-[#bb9af7]' : 'text-purple-600'}`} />
                  <h2 className="text-xl font-bold">Your Performance</h2>
                </div>
                <button 
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-[#1a1b26]' : 'hover:bg-gray-100'}`}
                  onClick={() => setShowHighScores(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {highScores.length > 0 ? (
                  highScores.map((score, index) => (
                    <motion.div
                    key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center p-4 rounded-lg ${
                      isDark ? 'bg-[#1a1b26]' : 'bg-gray-50'
                    }`}
                  >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        isDark ? 'bg-[#414868]' : 'bg-purple-100'
                      }`}>
                        {index < 3 ? (
                          <Crown className={`w-5 h-5 ${
                            index === 0 
                              ? 'text-yellow-400' 
                              : index === 1 
                                ? 'text-gray-300' 
                                : 'text-amber-600'
                          }`} />
                        ) : (
                          <span className="font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium truncate max-w-[150px]">
                            {score.songTitle || score.mode}
                          </p>
                          <p className="font-mono font-bold">
                            {score.wpm} <span className="text-xs">WPM</span>
                      </p>
                    </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(score.date).toLocaleDateString()}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {score.accuracy}% accuracy
                      </p>
                    </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-1">No records yet</p>
                    <p className="text-sm">Start typing to set your first record!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
        >
          <motion.div variants={itemVariants} className="lg:col-span-2 min-h-[400px]">
            <div className="sticky top-[100px]">
              {videoId ? (
                <YouTubePlayer videoId={videoId} isDark={isDark} />
              ) : (
                <div className={`w-full aspect-video rounded-xl flex flex-col items-center justify-center gap-4 ${
                  isDark ? 'bg-[#24283b]' : 'bg-white/80 shadow-lg shadow-purple-500/5'
                }`}>
                  <Headphones className={`w-16 h-16 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-600'} opacity-70`} />
                  <div className="text-center px-6">
                    <h2 className="text-xl font-semibold mb-2">Search for a Song</h2>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-md`}>
                      Type along with your favorite songs and improve your typing speed with lyrics!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <TypingArea isDark={isDark} />
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-6 border-t mt-auto text-center">
        <motion.div 
          layout
          layoutId="footer-content"
          initial={{ opacity: 1 }}
          className={`max-w-2xl mx-auto ${isDark ? 'text-gray-400 border-[#414868]' : 'text-gray-500 border-gray-200'}`}
        >
          <p className="mb-2">
            Enhance your typing skills with music! Practice typing to your favorite songs.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span>Current Difficulty:</span>
            <span className={`font-medium px-2 py-0.5 rounded-full capitalize ${
              difficulty === 'easy'
                ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                : difficulty === 'medium'
                  ? isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                  : isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
            }`}>
              {difficulty}
            </span>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}

export default App;