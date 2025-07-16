import React from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Stock } from '../types/stock';
import { formatPrice, formatChange, formatPercentage } from '../utils/formatters';

interface StockTickerProps {
  stock: Stock;
  isFlashing?: boolean;
}

const StockTicker: React.FC<StockTickerProps> = ({ stock, isFlashing = false }) => {
  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
  const borderColor = isPositive ? 'border-green-400' : 'border-red-400';
  
  return (
    <div className={`bg-gray-900 border-2 ${borderColor} rounded-lg p-4 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-400/20 ${isFlashing ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-bold font-mono text-lg">{stock.symbol}</span>
        </div>
        <div className="flex items-center space-x-1">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-white font-mono text-sm opacity-75 truncate">
          {stock.name}
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-white font-bold font-mono text-2xl">
            ${formatPrice(stock.price)}
          </span>
          <span className={`${changeColor} font-mono text-sm`}>
            {formatChange(stock.change)}
          </span>
          <span className={`${changeColor} font-mono text-sm`}>
            ({formatPercentage(stock.changePercent)})
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400 mt-3">
          <div>
            <span className="text-gray-500">HIGH:</span>
            <span className="text-white ml-1">${formatPrice(stock.high)}</span>
          </div>
          <div>
            <span className="text-gray-500">LOW:</span>
            <span className="text-white ml-1">${formatPrice(stock.low)}</span>
          </div>
          <div>
            <span className="text-gray-500">VOL:</span>
            <span className="text-white ml-1">{stock.volume}</span>
          </div>
          <div>
            <span className="text-gray-500">CAP:</span>
            <span className="text-white ml-1">{stock.marketCap}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTicker;