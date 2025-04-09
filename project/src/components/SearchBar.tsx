import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Youtube, Loader, X, Music, History, TrendingUp } from 'lucide-react';
import { SearchResults } from './SearchResults';
import axios from 'axios';

interface SearchBarProps {
  onSelectVideo: (videoId: string) => void;
  isDark?: boolean;
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

// Popular songs for immediate selection
const popularSongs = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley' },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen' },
  { id: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee' },
  { id: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars' },
  { id: 'YQHsXMglC9A', title: 'Hello', artist: 'Adele' }
];

// Expanded song database for search results
const expandedSongs = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg' },
  { id: 'CZLuZStJaAQ', title: 'Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/CZLuZStJaAQ/mqdefault.jpg' },
  { id: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg' },
  { id: 'pRpeEdMmmQ0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', thumbnail: 'https://img.youtube.com/vi/pRpeEdMmmQ0/mqdefault.jpg' },
  { id: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg' },
  { id: 'lp-EO5I60KA', title: 'Stressed Out', artist: 'Twenty One Pilots', thumbnail: 'https://img.youtube.com/vi/lp-EO5I60KA/mqdefault.jpg' },
  { id: 'YQHsXMglC9A', title: 'Hello', artist: 'Adele', thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg' },
  { id: 'RgKAFK5djSk', title: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', thumbnail: 'https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg' },
  { id: '09R8_2nJtjg', title: 'Sugar', artist: 'Maroon 5', thumbnail: 'https://img.youtube.com/vi/09R8_2nJtjg/mqdefault.jpg' },
  { id: 'Zm0f0oF5VP0', title: 'Sorry', artist: 'Justin Bieber', thumbnail: 'https://img.youtube.com/vi/Zm0f0oF5VP0/mqdefault.jpg' },
  { id: 'NywWB67Z7zQ', title: 'This Is What You Came For', artist: 'Calvin Harris ft. Rihanna', thumbnail: 'https://img.youtube.com/vi/NywWB67Z7zQ/mqdefault.jpg' },
  { id: 'tt2k8PGm-TI', title: 'Baaghi 2: Mundiyan', artist: 'Tiger Shroff', thumbnail: 'https://img.youtube.com/vi/tt2k8PGm-TI/mqdefault.jpg' },
  { id: 'papuvlVeZg8', title: 'Girls Like You', artist: 'Maroon 5 ft. Cardi B', thumbnail: 'https://img.youtube.com/vi/papuvlVeZg8/mqdefault.jpg' }
];

// Expanded song database - used for searching
const songDatabase = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg'
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg'
  },
  {
    id: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg'
  },
  {
    id: 'RgKAFK5djSk',
    title: 'See You Again',
    artist: 'Wiz Khalifa ft. Charlie Puth',
    thumbnail: 'https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg'
  },
  {
    id: '9bZkp7q19f0',
    title: 'Gangnam Style',
    artist: 'PSY',
    thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg'
  },
  {
    id: 'OPf0YbXqDm0',
    title: 'Uptown Funk',
    artist: 'Mark Ronson ft. Bruno Mars',
    thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg'
  },
  {
    id: 'hT_nvWreIhg',
    title: 'Counting Stars',
    artist: 'OneRepublic',
    thumbnail: 'https://img.youtube.com/vi/hT_nvWreIhg/mqdefault.jpg'
  },
  {
    id: 'PT2_F-1esPk',
    title: 'Closer',
    artist: 'The Chainsmokers ft. Halsey',
    thumbnail: 'https://img.youtube.com/vi/PT2_F-1esPk/mqdefault.jpg'
  },
  {
    id: 'YQHsXMglC9A',
    title: 'Hello',
    artist: 'Adele',
    thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg'
  },
  {
    id: 'y6120QOlsfU',
    title: 'Sandstorm',
    artist: 'Darude',
    thumbnail: 'https://img.youtube.com/vi/y6120QOlsfU/mqdefault.jpg'
  },
  {
    id: 'lYBUbBu4W08',
    title: 'Bad Guy',
    artist: 'Billie Eilish',
    thumbnail: 'https://img.youtube.com/vi/lYBUbBu4W08/mqdefault.jpg'
  },
  {
    id: '0yW7w8F2TVA',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    thumbnail: 'https://img.youtube.com/vi/0yW7w8F2TVA/mqdefault.jpg'
  },
  {
    id: 'JRfuAukYTKg',
    title: 'Dance Monkey',
    artist: 'Tones and I',
    thumbnail: 'https://img.youtube.com/vi/JRfuAukYTKg/mqdefault.jpg'
  },
  {
    id: 'Io0fBr1XBUA',
    title: 'Thunder',
    artist: 'Imagine Dragons',
    thumbnail: 'https://img.youtube.com/vi/Io0fBr1XBUA/mqdefault.jpg'
  },
  {
    id: 'Xn676-fLq7I',
    title: 'Look What You Made Me Do',
    artist: 'Taylor Swift',
    thumbnail: 'https://img.youtube.com/vi/Xn676-fLq7I/mqdefault.jpg'
  },
  {
    id: 'DlexmDDSDZ0',
    title: "We Don't Talk About Bruno",
    artist: 'Encanto Cast',
    thumbnail: 'https://img.youtube.com/vi/DlexmDDSDZ0/mqdefault.jpg'
  },
  {
    id: 'KM38OFDKU20',
    title: 'Watermelon Sugar',
    artist: 'Harry Styles',
    thumbnail: 'https://img.youtube.com/vi/KM38OFDKU20/mqdefault.jpg'
  },
  {
    id: 'iCkYw3cRwLo',
    title: 'Let It Go',
    artist: 'Idina Menzel',
    thumbnail: 'https://img.youtube.com/vi/iCkYw3cRwLo/mqdefault.jpg'
  },
  {
    id: 'e-ORhEE9VVg',
    title: 'Blank Space',
    artist: 'Taylor Swift',
    thumbnail: 'https://img.youtube.com/vi/e-ORhEE9VVg/mqdefault.jpg'
  }
];

export function SearchBar({ onSelectVideo, isDark = false }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [showPopular, setShowPopular] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Default mock results for when search finds nothing
  const mockResults = [
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
    { id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', artist: 'Queen', thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg' }
  ];
  
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
  const saveToHistory = (result: any) => {
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
  
  // Search for videos using YouTube API or handle direct links
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setShowResults(true);
    
    // Check if input might be a direct YouTube URL or video ID
    const videoId = extractVideoId(searchQuery);
    
    if (videoId) {
      // Handle direct YouTube URL
      try {
        // Check if we have this video in our database
        const existingVideo = songDatabase.find(song => song.id === videoId);
        
        if (existingVideo) {
          const result = existingVideo;
          setResults([result]);
          setIsLoading(false);
          
          // Save directly using the result we just found
          saveToHistory(result);
      } else {
          // For unknown videos, create a placeholder
          const mockResult = {
            id: videoId,
            title: `YouTube Video (ID: ${videoId})`,
            artist: 'Unknown Artist',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
          };
          
          setResults([mockResult]);
          setIsLoading(false);
          saveToHistory(mockResult);
        }
      } catch (error) {
        console.error('Error fetching video details:', error);
        setResults([]);
        setIsLoading(false);
      }
    } else {
      // Handle regular search by searching our song database
      try {
        // Simulate network delay
        setTimeout(() => {
          // Filter songDatabase based on search query
          const queryLower = searchQuery.toLowerCase();
          const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
          
          // Score and filter songs
          const scoredResults = songDatabase
            .map(song => {
              const titleLower = (song.title || '').toLowerCase();
              const artistLower = (song.artist || '').toLowerCase();
              
              // Start with a base score
              let score = 0;
              
              // Exact matches get highest score
              if (titleLower === queryLower) score += 100;
              if (artistLower === queryLower) score += 80;
              
              // Title contains full query
              if (titleLower.includes(queryLower)) score += 60;
              
              // Artist contains full query
              if (artistLower.includes(queryLower)) score += 50;
              
              // Check for individual word matches
              queryWords.forEach(word => {
                if (word.length < 3) return; // Skip very short words
                
                if (titleLower.includes(word)) score += 15;
                if (artistLower.includes(word)) score += 12;
                
                // Bonus for word at the beginning
                if (titleLower.startsWith(word)) score += 10;
                if (artistLower.startsWith(word)) score += 8;
              });
              
              // Give a small base score to ensure some results appear
              if (queryLower.length > 0 && (titleLower.length > 0 || artistLower.length > 0)) {
                score += 1;
              }
              
              return { ...song, score };
            })
            .filter(song => song.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 15); // Show more results (up to 15)
          
          // If no relevant results, show some random songs from database
          if (scoredResults.length === 0) {
            // Get 5 random songs from the database
            const randomSongs = [...songDatabase]
              .sort(() => 0.5 - Math.random())
              .slice(0, 5)
              .map(song => ({ ...song, score: 1 }));
            
            setResults(randomSongs.length > 0 ? randomSongs : mockResults);
          } else {
            setResults(scoredResults);
          }
          
          setIsLoading(false);
    }, 500);
      } catch (error) {
        console.error('Error searching for videos:', error);
        setResults([]);
        setIsLoading(false);
      }
    }
  };
  
  const handleSelectVideo = (videoId: string, title: string) => {
    onSelectVideo(videoId);
    setShowResults(false);
    setSearchQuery('');
    
    // Save to history
    saveToHistory({
      id: videoId,
      title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value === '') {
      setShowPopular(true);
    } else {
      setShowPopular(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    setShowPopular(true);
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
        />
          {searchQuery && (
            <button 
              onClick={clearSearch}
              className={`p-1 rounded-full ${
                isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <X size={16} />
            </button>
          )}
          <button 
            onClick={handleSearch}
            className={`ml-2 rounded-lg p-2 ${
              isDark 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }`}
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