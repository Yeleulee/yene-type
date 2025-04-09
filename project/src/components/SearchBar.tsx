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
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
        isExpanded
          ? (isDark 
              ? 'bg-[#1a1b26] ring-2 ring-[#7aa2f7]' 
              : 'bg-white shadow-lg shadow-purple-500/10 ring-2 ring-purple-500')
          : (isDark 
              ? 'bg-[#1a1b26] ring-1 ring-[#414868]' 
              : 'bg-white/80 shadow-lg shadow-purple-500/5')
      }`}>
        <Search className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-purple-400'}`} />
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
            className={`p-1 rounded-full ${isDark ? 'hover:bg-[#414868]' : 'hover:bg-gray-100'}`}
          >
            ✕
          </button>
        )}
        {isSearching && (
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      
      <AnimatePresence>
        {isExpanded && showSuggestions && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute z-40 left-0 right-0 mt-2 p-4 rounded-xl overflow-hidden ${
              isDark ? 'bg-[#1a1b26] border border-[#414868] shadow-xl' : 'bg-white shadow-xl'
            }`}
          >
            {results.length > 0 ? (
              <div className="space-y-3">
                <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Search Results
                </h3>
                {results.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleVideoSelect(video)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                      isDark ? 'hover:bg-[#414868]' : 'hover:bg-purple-50'
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Music className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {video.title}
                      </p>
                      <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {video.channelTitle}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {!query && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Sparkles className="w-4 h-4" /> Featured Songs
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-[#414868] text-gray-300' : 'bg-purple-100 text-purple-700'
                      }`}>
                        With Synced Lyrics
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {featuredSongs.map((song, index) => (
                        <motion.div
                          key={song.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleVideoSelect(song)}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                            isDark ? 'hover:bg-[#414868]' : 'hover:bg-purple-50'
                          }`}
                        >
                          <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <img 
                              src={song.thumbnail} 
                              alt={song.title} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-1">
                              <Mic className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="overflow-hidden">
                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                              {song.title}
                            </p>
                            <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {song.artist}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h3 className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
                        className={`px-3 py-1.5 rounded-full text-sm ${
                          isDark 
                            ? 'bg-[#414868] text-gray-200 hover:bg-[#5a6291]' 
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        {search}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-dashed">
                  <p className={`text-xs ${isDark ? 'text-gray-500 border-[#414868]' : 'text-gray-400 border-gray-200'}`}>
                    Start typing with your favorite songs!
                  </p>
                  <div className="flex items-center gap-1">
                    <Clock className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Recent searches will appear here
                    </p>
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