'use client';

import { motion } from 'framer-motion';
import { Laugh } from 'lucide-react';

export default function InlineMeme({ meme }) {
  if (!meme) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="mt-3 p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-700/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
          <Laugh className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
            🎭 Cultural Meme
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {meme}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
