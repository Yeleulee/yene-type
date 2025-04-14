import React from 'react';
import { motion } from 'framer-motion';

interface VideoResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

interface SearchResultsProps {
  results: VideoResult[];
  onSelectVideo: (videoId: string, title: string) => void;
  isDark?: boolean;
}

export function SearchResults({ results, onSelectVideo, isDark = false }: SearchResultsProps) {
  return (
    <div className="p-1" role="listbox" aria-label="Search results">
      {results.map((result, index) => (
        <motion.div
          key={result.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`flex items-center gap-3 p-3 my-1 rounded-lg cursor-pointer transition-colors ${
            isDark 
              ? 'hover:bg-slate-700/60 active:bg-slate-700/80' 
              : 'hover:bg-indigo-50/60 active:bg-indigo-50/80'
          }`}
          onClick={() => onSelectVideo(result.id, result.title)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectVideo(result.id, result.title);
            }
          }}
          role="option"
          aria-selected={false}
          tabIndex={0}
        >
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
            <img 
              src={result.thumbnail} 
              alt={`Thumbnail for ${result.title}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/96x96/indigo/white?text=YT';
              }}
            />
            <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60`}></div>
            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
              YT
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm leading-tight truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {result.title}
            </p>
            <p className={`text-xs truncate mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {result.artist || 'YouTube'}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}