import React from 'react';
import { NewsItem } from '../types/stock';
import { Radio } from 'lucide-react';

interface NewsScrollerProps {
  newsItems: NewsItem[];
}

const NewsScroller: React.FC<NewsScrollerProps> = ({ newsItems }) => {
  return (
    <div className="bg-gray-900 border border-yellow-400 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Radio className="w-5 h-5 text-yellow-400" />
        <span className="text-yellow-400 font-bold font-mono">MARKET NEWS</span>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {newsItems.map((item) => (
          <div key={item.id} className="border-b border-gray-700 pb-2 last:border-b-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-green-400 font-mono text-xs">{item.time}</span>
              <span className="text-yellow-400 font-mono text-xs">{item.source}</span>
            </div>
            <p className="text-white text-sm font-mono leading-relaxed">
              {item.headline}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsScroller;