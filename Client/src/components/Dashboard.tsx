import React, { useState, useEffect } from 'react';
import StockTicker from './StockTicker';
import NewsScroller from './NewsScroller';
import MarketSummary from './MarketSummary';
import { Stock, PricePoint } from '../types/stock';
import { initialStocks, newsItems } from '../data/stocks';

const Dashboard: React.FC = () => {
  // Initialize stocks with empty history
  const [stocks, setStocks] = useState<Stock[]>(() => 
    initialStocks.map(stock => ({
      ...stock,
      history: [{
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        price: stock.price,
        timestamp: Date.now()
      }]
    }))
  );
  const [flashingStocks, setFlashingStocks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prevStocks => {
        const newStocks = prevStocks.map(stock => {
          const shouldUpdate = Math.random() < 0.3; // 30% chance of update
          
          if (shouldUpdate) {
            const changeAmount = (Math.random() - 0.5) * 5; // Random change between -2.5 and 2.5
            const newPrice = Math.max(0.01, stock.price + changeAmount);
            const newChange = newPrice - stock.open;
            const newChangePercent = (newChange / stock.open) * 100;
            
            // Create new price point
            const newPricePoint: PricePoint = {
              time: new Date().toLocaleTimeString('en-US', { hour12: false }),
              price: newPrice,
              timestamp: Date.now()
            };

            // Update history (keep last 50 points)
            const updatedHistory = [...(stock.history || []), newPricePoint].slice(-50);
            
            // Special case for ARKG - always trending down
            if (stock.symbol === 'ARKG') {
              const arkgChange = Math.random() * -2; // Always negative
              const arkgNewPrice = Math.max(0.01, stock.price + arkgChange);
              const arkgNewChange = arkgNewPrice - stock.open;
              const arkgNewChangePercent = (arkgNewChange / stock.open) * 100;
              
              const arkgPricePoint: PricePoint = {
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                price: arkgNewPrice,
                timestamp: Date.now()
              };

              const arkgHistory = [...(stock.history || []), arkgPricePoint].slice(-50);
              
              return {
                ...stock,
                price: arkgNewPrice,
                change: arkgNewChange,
                changePercent: arkgNewChangePercent,
                high: Math.max(stock.high, arkgNewPrice),
                low: Math.min(stock.low, arkgNewPrice),
                history: arkgHistory
              };
            }
            
            return {
              ...stock,
              price: newPrice,
              change: newChange,
              changePercent: newChangePercent,
              high: Math.max(stock.high, newPrice),
              low: Math.min(stock.low, newPrice),
              history: updatedHistory
            };
          }
          
          return stock;
        });
        
        // Track which stocks were updated for flashing effect
        const updatedStocks = new Set<string>();
        newStocks.forEach((stock, index) => {
          if (stock.price !== prevStocks[index].price) {
            updatedStocks.add(stock.symbol);
          }
        });
        
        setFlashingStocks(updatedStocks);
        
        // Clear flashing after 500ms
        setTimeout(() => {
          setFlashingStocks(new Set());
        }, 500);
        
        return newStocks;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-6 space-y-6">
        {/* Market Summary */}
        <MarketSummary />
        
        {/* Stock Tickers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {stocks.map((stock) => (
            <StockTicker
              key={stock.symbol}
              stock={stock}
              isFlashing={flashingStocks.has(stock.symbol)}
            />
          ))}
        </div>
        
        {/* News Section */}
        <NewsScroller newsItems={newsItems} />
      </div>
    </div>
  );
};

export default Dashboard;