import React, { useEffect, useState } from 'react';
import { NewsItem } from '../types/stock';
import { Radio } from 'lucide-react';

interface NewsScrollerProps {
  newsItems: NewsItem[];
}

const ROTATE_INTERVAL = 4000; // 4 seconds

const NewsScroller: React.FC<NewsScrollerProps> = ({ newsItems }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (newsItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % newsItems.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [newsItems]);

  if (newsItems.length === 0) return null;

  const item = newsItems[current];

  return (
    <div className="bg-gray-900 border border-yellow-400 rounded-lg p-3">
      <div className="flex items-center space-x-2 mb-2">
        <Radio className="w-4 h-4 text-yellow-400" />
        <span className="text-yellow-400 font-bold font-mono text-sm">MARKET NEWS</span>
      </div>
      <div className="max-h-32 min-h-20 flex flex-col justify-center">
        <div className="border-b border-gray-700 pb-2">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-green-400 font-mono text-xs">{item.time}</span>
            <span className="text-yellow-400 font-mono text-xs">{item.source}</span>
          </div>
          <p className="text-white text-sm font-mono leading-relaxed">
            {item.headline}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewsScroller;