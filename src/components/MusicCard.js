'use client';

import { motion } from 'framer-motion';
import { Music, Sparkles, ExternalLink, Play } from 'lucide-react';
import { useState } from 'react';

export default function MusicCard({ music }) {
  const [hoveredLink, setHoveredLink] = useState(null);

  if (!music) return null;

  const { title, artist, reason, difficulty, genre } = music;

  // Generate search URLs for different music platforms
  const searchQuery = encodeURIComponent(`${title} ${artist}`);
  const spotifySearchUrl = `https://open.spotify.com/search/${searchQuery}`;
  const appleMusicSearchUrl = `https://music.apple.com/search?term=${searchQuery}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}+lyrics`;
  const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${searchQuery}`;
  const deezerSearchUrl = `https://www.deezer.com/search/${searchQuery}`;

  // Difficulty colors
  const difficultyColors = {
    easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    hard: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  };

  const musicPlatforms = [
    { name: 'Spotify', url: spotifySearchUrl, color: 'hover:bg-green-500', icon: '🎵' },
    { name: 'Apple Music', url: appleMusicSearchUrl, color: 'hover:bg-pink-500', icon: '🍎' },
    { name: 'YouTube', url: youtubeSearchUrl, color: 'hover:bg-red-500', icon: '▶️' },
    { name: 'YouTube Music', url: youtubeMusicSearchUrl, color: 'hover:bg-red-600', icon: '🎶' },
    { name: 'Deezer', url: deezerSearchUrl, color: 'hover:bg-purple-500', icon: '🎧' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="flex-shrink-0 p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md"
        >
          <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300">
              Song Recommendation for Learning
            </h3>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-0.5 truncate">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            by {artist}
          </p>
        </div>
      </div>

      {/* Reason */}
      {reason && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
          💡 {reason}
        </p>
      )}

      {/* Tags */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span
          className={`text-xs px-3 py-1 rounded-full font-semibold border ${
            difficultyColors[difficulty] || difficultyColors.medium
          }`}
        >
          {difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'Medium'}
        </span>
        {genre && (
          <span className="text-xs px-3 py-1 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
            {genre.charAt(0).toUpperCase() + genre.slice(1)}
          </span>
        )}
      </div>

      {/* Platform Links */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
          <Play className="w-3 h-3" />
          <span className="font-semibold">Listen & sing along:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {musicPlatforms.map((platform, idx) => (
            <motion.a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHoveredLink(platform.name)}
              onMouseLeave={() => setHoveredLink(null)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm border-2 ${
                hoveredLink === platform.name
                  ? `${platform.color} border-transparent text-white`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              <span className="text-base">{platform.icon}</span>
              <span className="truncate">{platform.name}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
            </motion.a>
          ))}
        </div>
      </div>

      {/* Footer tip */}
      <div className="mt-4 pt-3 border-t border-purple-200 dark:border-purple-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          🎤 Tip: Sing along to practice pronunciation and memorize phrases!
        </p>
      </div>
    </motion.div>
  );
}
