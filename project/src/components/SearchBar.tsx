import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Youtube, Loader, X, Music, History, TrendingUp } from 'lucide-react';
import { SearchResults } from './SearchResults';
import { searchYouTubeVideos } from '../lib/youtube';

interface SearchBarProps {
  onSelectVideo: (videoId: string) => void;
  isDark?: boolean;
}

// Define the result type directly in the component
interface VideoResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

// Helper function to extract video ID from various YouTube URL formats
const extractVideoId = (url: string): string | null => {
  // Handle different YouTube URL formats
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^?]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/user\/[^\/]+\/?\?v=([^&]+)/i,
    /^([a-zA-Z0-9_-]{11})$/i  // Direct video ID (11 characters)
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// Built-in song database
const songDatabase: VideoResult[] = [
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
  { id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', artist: 'Queen Official', thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg' },
  { id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg' },
  { id: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', artist: 'Luis Fonsi', thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg' },
  { id: 'OPf0YbXqDm0', title: 'Mark Ronson - Uptown Funk ft. Bruno Mars', artist: 'Mark Ronson', thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg' },
  { id: 'YQHsXMglC9A', title: 'Adele - Hello', artist: 'Adele', thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg' },
  { id: '09R8_2nJtjg', title: 'Maroon 5 - Sugar', artist: 'Maroon 5', thumbnail: 'https://img.youtube.com/vi/09R8_2nJtjg/mqdefault.jpg' },
  { id: 'y6120QOlsfU', title: 'Darude - Sandstorm', artist: 'Darude', thumbnail: 'https://img.youtube.com/vi/y6120QOlsfU/mqdefault.jpg' },
  { id: 'lYBUbBu4W08', title: 'Billie Eilish - bad guy', artist: 'Billie Eilish', thumbnail: 'https://img.youtube.com/vi/lYBUbBu4W08/mqdefault.jpg' },
  { id: '0yW7w8F2TVA', title: 'The Weeknd - Blinding Lights', artist: 'The Weeknd', thumbnail: 'https://img.youtube.com/vi/0yW7w8F2TVA/mqdefault.jpg' },
  { id: 'RgKAFK5djSk', title: 'Wiz Khalifa - See You Again ft. Charlie Puth', artist: 'Wiz Khalifa', thumbnail: 'https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg' },
  { id: 'JRfuAukYTKg', title: 'Tones and I - Dance Monkey', artist: 'Tones and I', thumbnail: 'https://img.youtube.com/vi/JRfuAukYTKg/mqdefault.jpg' },
  { id: 'hT_nvWreIhg', title: 'OneRepublic - Counting Stars', artist: 'OneRepublic', thumbnail: 'https://img.youtube.com/vi/hT_nvWreIhg/mqdefault.jpg' },
  { id: 'PT2_F-1esPk', title: 'The Chainsmokers - Closer ft. Halsey', artist: 'The Chainsmokers', thumbnail: 'https://img.youtube.com/vi/PT2_F-1esPk/mqdefault.jpg' },
  { id: '2Vv-BfVoq4g', title: 'Ed Sheeran - Perfect', artist: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/2Vv-BfVoq4g/mqdefault.jpg' },
  { id: 'papuvlVeZg8', title: 'Maroon 5 - Girls Like You ft. Cardi B', artist: 'Maroon 5', thumbnail: 'https://img.youtube.com/vi/papuvlVeZg8/mqdefault.jpg' },
  { id: 'ApXoWvfEYVU', title: 'Post Malone - Better Now', artist: 'Post Malone', thumbnail: 'https://img.youtube.com/vi/ApXoWvfEYVU/mqdefault.jpg' },
  { id: 'nfs8NYg7yQM', title: 'Eminem - Rap God', artist: 'Eminem', thumbnail: 'https://img.youtube.com/vi/nfs8NYg7yQM/mqdefault.jpg' },
  { id: '31crA53Dgu0', title: 'Drake - Hotline Bling', artist: 'Drake', thumbnail: 'https://img.youtube.com/vi/31crA53Dgu0/mqdefault.jpg' },
  { id: 'xTlNMmZKwpA', title: 'BTS - Dynamite', artist: 'BTS', thumbnail: 'https://img.youtube.com/vi/xTlNMmZKwpA/mqdefault.jpg' },
  { id: 'aJOTlE1K90k', title: 'Katy Perry - Roar', artist: 'Katy Perry', thumbnail: 'https://img.youtube.com/vi/aJOTlE1K90k/mqdefault.jpg' },
  { id: 'QYh6mYIJG2Y', title: 'Ariana Grande - 7 rings', artist: 'Ariana Grande', thumbnail: 'https://img.youtube.com/vi/QYh6mYIJG2Y/mqdefault.jpg' },
  { id: 'CevxZvSJLk8', title: 'Katy Perry - Roar', artist: 'Katy Perry', thumbnail: 'https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg' }
];

// Popular songs subset for display when no search is active
const popularSongs: VideoResult[] = [
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
  { id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', artist: 'Queen', thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg' },
  { id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg' },
  { id: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg' },
  { id: 'YQHsXMglC9A', title: 'Hello', artist: 'Adele', thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg' }
];

const API_BASE_URL = '/api/youtube';

export function SearchBar({ onSelectVideo, isDark = false }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchHistory, setSearchHistory] = useState<VideoResult[]>([]);
  const [showPopular, setShowPopular] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const previousVideoId = useRef<string | null>(null);
  const player = useRef<any | null>(null);
  const loadError = useRef<string | null>(null);
  const syncAttemptsRef = useRef<number>(0);
  const initialLoadRef = useRef<boolean>(true);
  
  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history).slice(0, 5));
      } catch (e) {
        console.error('Error loading search history:', e);
      }
    }
  }, []);
  
  // Save search history to localStorage
  const saveToHistory = (result: VideoResult) => {
    const updatedHistory = [result, ...searchHistory.filter(item => item.id !== result.id)].slice(0, 5);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };
  
  // Handle clicks outside the search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Perform the search directly within the component
  const performSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setShowResults(true);
    
    try {
      if (!query || query.trim().length < 2) {
        setResults([]);
        setShowPopular(true);
        setIsLoading(false);
        return;
      }
      
      const results = await searchYouTubeVideos(query);
      setResults(results);
      setShowPopular(false);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search for videos. Please try again.');
      setResults([]);
      setShowPopular(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Debounced search
  const debouncedSearch = (query: string) => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    
    // Set loading state immediately
    setIsLoading(true);
    setShowResults(true);
    
    // Set new timeout
    searchTimeoutRef.current = window.setTimeout(() => {
      performSearch(query);
      searchTimeoutRef.current = null;
    }, 300);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  const handleSelectVideo = (videoId: string, title: string) => {
    console.log("SearchBar: Video selected - ID:", videoId, "Title:", title);
    onSelectVideo(videoId);
    setShowResults(false);
    
    // Find the selected video in results to save to history
    const selectedVideo = results.find(result => result.id === videoId) || 
                          songDatabase.find(result => result.id === videoId) || 
                          popularSongs.find(result => result.id === videoId);
    
    if (selectedVideo) {
      saveToHistory(selectedVideo);
    } else if (videoId) {
      // Create a basic result if we don't have the data
      saveToHistory({
        id: videoId,
        title: title || 'Unknown Song',
        artist: 'Unknown Artist',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setShowResults(true);
    
    if (newQuery === '') {
      setShowPopular(true);
      setResults([]);
      setError(null);
      setIsLoading(false);
    } else {
      debouncedSearch(newQuery);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      performSearch(searchQuery);
    }
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setResults([]);
    setError(null);
    setIsLoading(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    setShowPopular(true);
    
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
      <div className={`flex items-center mb-4 p-3 rounded-xl ${
        isDark 
          ? 'bg-slate-800/80 shadow-md shadow-black/20' 
          : 'bg-white shadow-md shadow-indigo-100/60'
      }`}>
        <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center mr-3 ${
          isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
        }`}>
          <Youtube className={isDark ? 'text-indigo-400' : 'text-indigo-600'} size={18} />
        </div>
        
        <div className="flex-1 flex border-b border-slate-200 dark:border-slate-700 px-1 pb-1.5">
        <input
            ref={searchInputRef}
          type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={() => setShowResults(true)}
            placeholder="Search for YouTube videos or paste a link"
            className={`flex-1 bg-transparent text-base border-none outline-none ${
              isDark ? 'text-white placeholder:text-slate-400' : 'text-slate-800 placeholder:text-slate-400'
          }`}
            aria-label="Search for videos"
        />
          {searchQuery && (
            <button 
              onClick={clearSearch}
              className={`p-1 rounded-full ${
                isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button 
            onClick={() => performSearch(searchQuery)}
            className={`ml-2 rounded-lg p-2 ${
              isDark 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }`}
            aria-label="Search"
          >
            {isLoading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-20 w-full rounded-xl overflow-hidden shadow-xl ${
              isDark ? 'bg-slate-800 shadow-black/40' : 'bg-white shadow-slate-200/60'
            }`}
          >
            {isLoading ? (
              <div className={`flex items-center justify-center p-8 ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                <Loader className="animate-spin mr-3" size={20} />
                <span>Searching for videos...</span>
              </div>
            ) : error ? (
              <div className={`flex flex-col items-center justify-center p-8 ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                <p className="text-center mb-2">{error}</p>
                <button 
                  onClick={clearSearch}
                  className={`mt-2 px-4 py-2 rounded-lg text-sm ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                >
                  Clear Search
                </button>
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                  <h3 className={`text-sm font-medium ${
                    isDark ? 'text-slate-300' : 'text-slate-500'
                  }`}>Search Results</h3>
                </div>
                <SearchResults 
                  results={results} 
                  onSelectVideo={handleSelectVideo} 
                  isDark={isDark} 
                />
              </div>
            ) : showPopular ? (
              <div className="max-h-96 overflow-y-auto">
                {searchHistory.length > 0 && (
                  <div>
                    <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                      <History size={14} className={isDark ? 'text-slate-400 mr-2' : 'text-slate-500 mr-2'} />
                      <h3 className={`text-sm font-medium ${
                        isDark ? 'text-slate-300' : 'text-slate-500'
                      }`}>Recent Searches</h3>
                    </div>
                    <SearchResults 
                      results={searchHistory} 
                      onSelectVideo={handleSelectVideo} 
                      isDark={isDark} 
                    />
                  </div>
                )}
                
                <div>
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center">
                    <TrendingUp size={14} className={isDark ? 'text-slate-400 mr-2' : 'text-slate-500 mr-2'} />
                    <h3 className={`text-sm font-medium ${
                      isDark ? 'text-slate-300' : 'text-slate-500'
                    }`}>Popular Songs</h3>
                  </div>
                  <SearchResults 
                    results={popularSongs} 
                    onSelectVideo={handleSelectVideo} 
                    isDark={isDark} 
                  />
                </div>
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center p-8 ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                <Search className="opacity-30 mb-2" size={24} />
                <p>No results found. Try another search.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}