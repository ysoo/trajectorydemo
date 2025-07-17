import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Area, AreaChart } from 'recharts';
import { PricePoint } from '../types/stock';

interface StockChartProps {
  data: PricePoint[];
  isPositive: boolean;
  symbol: string;
}

const StockChart: React.FC<StockChartProps> = ({ data, isPositive, symbol }) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center bg-gray-800/50 rounded border border-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
          <span className="text-gray-500 text-xs font-mono">Loading chart...</span>
        </div>
      </div>
    );
  }

  // Get min and max for better scaling
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = Math.max((maxPrice - minPrice) * 0.1, 0.01);

  // Define colors based on trend
  const strokeColor = isPositive ? '#4ade80' : '#f87171'; // green-400 : red-400
  const gradientId = `gradient-${symbol}`;

  return (
    <div className="h-16 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="5%" 
                stopColor={strokeColor} 
                stopOpacity={isPositive ? 0.3 : 0.2}
              />
              <stop 
                offset="95%" 
                stopColor={strokeColor} 
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <YAxis 
            hide 
            domain={[minPrice - padding, maxPrice + padding]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={false}
            connectNulls={true}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Overlay indicators */}
      <div className="absolute top-1 right-1 flex items-center space-x-1">
        <div 
          className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-green-400' : 'bg-red-400'}`}
        ></div>
        <span className="text-gray-400 text-xs font-mono">
          {data.length}pts
        </span>
      </div>
    </div>
  );
};

export default StockChart; 