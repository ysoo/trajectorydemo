import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Globe } from 'lucide-react';

const MarketSummary: React.FC = () => {
  return (
    <div className="bg-gray-900 border border-yellow-400 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Globe className="w-5 h-5 text-yellow-400" />
        <span className="text-yellow-400 font-bold font-mono">MARKET OVERVIEW</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-sm">S&P 500</span>
            <div className="flex items-center space-x-1">
              <span className="text-white font-mono text-sm">4,892.35</span>
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-mono text-xs">+0.24%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-sm">NASDAQ</span>
            <div className="flex items-center space-x-1">
              <span className="text-white font-mono text-sm">15,341.09</span>
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-mono text-xs">+0.67%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-sm">DOW</span>
            <div className="flex items-center space-x-1">
              <span className="text-white font-mono text-sm">38,654.42</span>
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-red-400 font-mono text-xs">-0.12%</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-sm">VIX</span>
            <div className="flex items-center space-x-1">
              <span className="text-white font-mono text-sm">13.42</span>
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-red-400 font-mono text-xs">-2.34%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-sm">USD/EUR</span>
            <div className="flex items-center space-x-1">
              <span className="text-white font-mono text-sm">1.0847</span>
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-mono text-xs">+0.08%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-mono text-sm">GOLD</span>
            <div className="flex items-center space-x-1">
              <span className="text-white font-mono text-sm">2,034.50</span>
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-mono text-xs">+0.45%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSummary;