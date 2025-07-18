import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Globe, Clock } from 'lucide-react';
import { formatTime } from '../utils/formatters';

const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(formatTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-black border-b border-yellow-400 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-yellow-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-yellow-400 font-bold text-xl font-mono">SRE STOCK EXCHANGE</span>
              <span className="text-gray-400 text-xs font-mono">Real-time Market Data</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 bg-green-400/10 text-green-400 px-2 py-1 rounded">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-mono">LIVE</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-white bg-gray-800 px-3 py-1 rounded">
            <Globe className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-mono">NYSE</span>
          </div>
          <div className="flex items-center space-x-2 text-white bg-gray-800 px-3 py-1 rounded">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-mono">{currentTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;