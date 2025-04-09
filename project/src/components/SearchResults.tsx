import React from 'react';
import { Music2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { YouTubeVideo } from '../lib/youtube';

interface SearchResultsProps {
  results: YouTubeVideo[];
  onVideoSelect: (video: YouTubeVideo) => void;
  isDark?: boolean;
}

export function SearchResults({ results, onVideoSelect, isDark = false }: SearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50 ${
        isDark ? 'bg-[#1a1b26] ring-1 ring-[#414868]' : 'bg-white/90 backdrop-blur-sm'
      }`}
    >
      {results.map((video) => (
        <motion.button
          key={video.id}
          onClick={() => onVideoSelect(video)}
          className={`w-full p-4 flex items-start gap-4 transition-colors ${
            isDark 
              ? 'hover:bg-[#24283b] border-b border-[#414868] last:border-0' 
              : 'hover:bg-purple-50 border-b border-gray-100 last:border-0'
          }`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="relative rounded-md overflow-hidden">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-32 h-18 object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${
              isDark ? 'from-[#1a1b26]/50' : 'from-black/30'
            } to-transparent`} />
            <Music2 className="absolute bottom-2 right-2 w-4 h-4 text-white" />
          </div>
          <div className="flex-1 text-left">
            <h3 className={`font-medium line-clamp-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {video.title}
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {video.channelTitle}
            </p>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}