import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Mic, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { searchVideos, type YouTubeVideo } from '../lib/youtube';
import { demoSongs } from '../lib/lyrics';
import { useHotkeys } from 'react-hotkeys-hook';

interface SearchBarProps {
  onVideoSelect: (video: YouTubeVideo) => void;
  className?: string;
  isDark?: boolean;
}

export function SearchBar({ onVideoSelect, className, isDark = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const popularSearches = [
    'Ed Sheeran Shape of You',
    'Adele Hello',
    'Queen Bohemian Rhapsody',
    'Michael Jackson Thriller',
    'Taylor Swift Blank Space'
  ];

  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    inputRef.current?.focus();
    setIsExpanded(true);
    setShowSuggestions(true);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (query.trim()) {
        setIsSearching(true);
        const videos = await searchVideos(query + ' lyrics');
        setResults(videos);
        setIsSearching(false);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [query]);

  const handleVideoSelect = (video: YouTubeVideo) => {
    onVideoSelect(video);
    setQuery('');
    setResults([]);
    setIsExpanded(false);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    setIsExpanded(true);
    setShowSuggestions(true);
  };

  const handlePopularSearch = (search: string) => {
    setQuery(search);
    inputRef.current?.focus();
  };
  
  // Featured songs with preset lyrics
  const featuredSongs = Object.keys(demoSongs).map(id => ({
    id,
    title: demoSongs[id].title,
    artist: demoSongs[id].artist,
    thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    channelTitle: demoSongs[id].artist
  }));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isExpanded
          ? (isDark 
              ? 'bg-[#16161E] ring-1 ring-[#7aa2f7]/70 shadow-lg shadow-[#1a1b26]/50' 
              : 'bg-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50')
          : (isDark 
              ? 'bg-[#1E1E2E] border border-[#414868]/30' 
              : 'bg-white/90 shadow-md shadow-purple-500/5 border border-purple-100/70')
      }`}>
        <Search className={`w-5 h-5 ${isDark ? 'text-[#7aa2f7]' : 'text-purple-500'}`} />
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search for songs to type along... (Ctrl+K)"
          className={`flex-1 bg-transparent border-none focus:outline-none text-base ${
            isDark ? 'text-gray-100 placeholder:text-gray-500' : 'text-gray-800 placeholder:text-gray-400'
          }`}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className={`p-1.5 rounded-full transition-colors ${
              isDark ? 'hover:bg-[#414868]/50 text-gray-400 hover:text-gray-200' : 'hover:bg-purple-50 text-gray-400 hover:text-gray-700'
            }`}
          >
            ✕
          </button>
        )}
        {isSearching && (
          <div className={`w-5 h-5 border-2 rounded-full animate-spin ${
            isDark ? 'border-[#7aa2f7] border-t-transparent' : 'border-purple-500 border-t-transparent'
          }`} />
        )}
      </div>
      
      <AnimatePresence>
        {isExpanded && showSuggestions && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-40 left-0 right-0 mt-2 p-5 rounded-xl overflow-hidden ${
              isDark ? 'bg-[#16161E] border border-[#414868]/40 shadow-xl shadow-black/20' : 'bg-white shadow-xl shadow-purple-500/10 border border-purple-100/50'
            }`}
          >
            {results.length > 0 ? (
              <div className="space-y-4">
                <h3 className={`text-sm uppercase tracking-wider font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Search Results
                </h3>
                <div className="space-y-2">
                  {results.map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleVideoSelect(video)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-[#2D2D40]' : 'hover:bg-purple-50/70'
                      }`}
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-1">
                          <Music className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="overflow-hidden">
                        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {video.title}
                        </p>
                        <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {video.channelTitle}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {!query && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm uppercase tracking-wider font-medium flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Sparkles className="w-4 h-4" /> Featured Songs
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-[#7aa2f7]/20 text-[#7aa2f7] border border-[#7aa2f7]/30' : 'bg-purple-100/50 text-purple-600 border border-purple-200'
                      }`}>
                        With Synced Lyrics
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {featuredSongs.map((song, index) => (
                        <motion.div
                          key={song.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleVideoSelect(song)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                            isDark ? 'hover:bg-[#2D2D40] bg-[#1E1E2E]/50' : 'hover:bg-purple-50 bg-gray-50/50'
                          }`}
                        >
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                            <img 
                              src={song.thumbnail} 
                              alt={song.title} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-1.5">
                              <Mic className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="overflow-hidden">
                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                              {song.title}
                            </p>
                            <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {song.artist}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h3 className={`text-sm uppercase tracking-wider font-medium flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <TrendingUp className="w-4 h-4" /> Popular Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((search, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handlePopularSearch(search)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isDark 
                            ? 'bg-[#1E1E2E] border border-[#414868]/50 text-gray-300 hover:border-[#7aa2f7]/50' 
                            : 'bg-white border border-purple-100 text-purple-600 hover:border-purple-300'
                        }`}
                      >
                        {search}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className={`text-sm uppercase tracking-wider font-medium flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock className="w-4 h-4" /> Search Tips
                  </h3>
                  <div className={`rounded-xl p-3 text-sm ${
                    isDark ? 'bg-[#2D2D40]/30 text-gray-400' : 'bg-purple-50/50 text-gray-600'
                  }`}>
                    <p>Try searching for song titles, artists, or lyrics. Adding "lyrics" to your search helps find videos with lyrics.</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}