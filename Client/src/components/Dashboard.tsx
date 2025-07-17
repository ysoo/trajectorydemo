import React, { useState, useEffect, useRef } from 'react';
import StockTicker from './StockTicker';
import MarketSummary from './MarketSummary';
import { Stock, ConnectionStatus } from '../types/stock';
import { quoteApiService } from '../services/quoteApi';
import { addPricePointToHistory } from '../utils/stockUtils';

const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [flashingStocks, setFlashingStocks] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0,
    dataSource: 'api'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const flashTimeoutRef = useRef<number | null>(null);

  // Initialize dashboard with real data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Test API connectivity first
        const isConnected = await quoteApiService.testConnection();
        if (!isConnected) {
          setError('Unable to connect to Quote API. Please check if the service is running.');
          setLoading(false);
          return;
        }

        // Load initial data with history
        const initialStocks = await quoteApiService.getAllQuotesWithHistory();
        
        if (initialStocks.length === 0) {
          setError('No stock data available. API may be in fallback mode.');
        } else {
          setStocks(initialStocks);
          console.log(`Loaded ${initialStocks.length} stocks with historical data`);
        }

      } catch (err) {
        console.error('Failed to initialize dashboard:', err);
        setError('Failed to load stock data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    const handleQuoteUpdate = (updatedStock: Stock) => {
      setStocks(prevStocks => {
        const stockIndex = prevStocks.findIndex(stock => stock.symbol === updatedStock.symbol);
        
        if (stockIndex === -1) {
          // New stock, add it with initial history point
          return [...prevStocks, {
            ...updatedStock,
            history: addPricePointToHistory([], updatedStock.price)
          }];
        }

        // Update existing stock and add new price point to history
        const existingStock = prevStocks[stockIndex];
        const updatedStocks = [...prevStocks];
        
        updatedStocks[stockIndex] = {
          ...updatedStock,
          history: addPricePointToHistory(existingStock.history, updatedStock.price)
        };

        return updatedStocks;
      });

      // Flash effect for updated stock
      setFlashingStocks(prev => new Set(prev).add(updatedStock.symbol));
      
      // Clear flash effect after 500ms
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      
      flashTimeoutRef.current = setTimeout(() => {
        setFlashingStocks(prev => {
          const newSet = new Set(prev);
          newSet.delete(updatedStock.symbol);
          return newSet;
        });
      }, 500);
    };

    const handleConnectionChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
      console.log('WebSocket connection status:', status);
    };

    // Connect to WebSocket
    quoteApiService.connectWebSocket(handleQuoteUpdate, handleConnectionChange);

    // Cleanup on unmount
    return () => {
      quoteApiService.disconnectWebSocket();
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  // Periodic data refresh (fallback when WebSocket fails)
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      // Only refresh via REST if WebSocket is not connected
      if (!connectionStatus.connected) {
        try {
          const freshQuotes = await quoteApiService.getAllQuotes();
          if (freshQuotes.length > 0) {
            setStocks(prevStocks => {
              return freshQuotes.map(freshQuote => {
                const existingStock = prevStocks.find(stock => stock.symbol === freshQuote.symbol);
                return {
                  ...freshQuote,
                  history: existingStock?.history || addPricePointToHistory([], freshQuote.price)
                };
              });
            });
          }
        } catch (err) {
          console.error('Failed to refresh quotes:', err);
        }
      }
    }, 10000); // Refresh every 10 seconds when WebSocket is down

    return () => clearInterval(refreshInterval);
  }, [connectionStatus.connected]);

  // Retry connection function
  const retryConnection = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const isConnected = await quoteApiService.testConnection();
      if (isConnected) {
        const freshStocks = await quoteApiService.getAllQuotesWithHistory();
        setStocks(freshStocks);
        
        // Reconnect WebSocket
        quoteApiService.connectWebSocket(
          (updatedStock: Stock) => {
            setStocks(prevStocks => {
              const stockIndex = prevStocks.findIndex(stock => stock.symbol === updatedStock.symbol);
              if (stockIndex === -1) {
                return [...prevStocks, {
                  ...updatedStock,
                  history: addPricePointToHistory([], updatedStock.price)
                }];
              }
              
              const updatedStocks = [...prevStocks];
              updatedStocks[stockIndex] = {
                ...updatedStock,
                history: addPricePointToHistory(prevStocks[stockIndex].history, updatedStock.price)
              };
              return updatedStocks;
            });
          },
          setConnectionStatus
        );
      } else {
        setError('Quote API is still unavailable');
      }
    } catch (err) {
      setError('Failed to reconnect to Quote API');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-mono text-yellow-400">Loading Real Market Data...</h2>
          <p className="text-gray-400 font-mono mt-2">Connecting to Quote API</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-mono text-red-400 mb-4">Connection Error</h2>
          <p className="text-gray-400 font-mono mb-6">{error}</p>
          <button
            onClick={retryConnection}
            className="bg-yellow-400 text-black px-6 py-2 rounded font-mono hover:bg-yellow-300 transition-colors"
          >
            Retry Connection
          </button>
          <div className="mt-4 text-sm text-gray-500 font-mono">
            <p>Expected API URL: {import.meta.env.VITE_QUOTE_API_BASE_URL || 'http://localhost:8080'}</p>
            <p>WebSocket URL: {import.meta.env.VITE_QUOTE_API_WS_URL || 'ws://localhost:8080/ws'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 p-3 space-y-3">
        {/* Connection Status Indicator */}
        <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-2">
          <div className="flex items-center space-x-3">
            <div 
              className={`w-3 h-3 rounded-full ${
                connectionStatus.connected ? 'bg-green-400' : 'bg-red-400'
              }`}
            ></div>
            <span className="text-sm font-mono">
              {connectionStatus.connected ? 'Live Data' : 'Reconnecting...'}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Source: {connectionStatus.dataSource}
            </span>
          </div>
          
          {connectionStatus.reconnectAttempts > 0 && (
            <span className="text-xs text-yellow-400 font-mono">
              Attempts: {connectionStatus.reconnectAttempts}
            </span>
          )}
        </div>

        {/* Market Summary - Compact */}
        <MarketSummary />
        
        {/* Stock Tickers Grid - Optimized for 8 tickers and maximum screen usage */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3 content-start">
          {stocks.map((stock) => (
            <StockTicker
              key={stock.symbol}
              stock={stock}
              isFlashing={flashingStocks.has(stock.symbol)}
            />
          ))}
        </div>

        {/* Show message if no stocks loaded */}
        {stocks.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-mono text-gray-400">No Stock Data Available</h3>
            <p className="text-sm text-gray-500 font-mono mt-2">
              Quote API may be starting up or in fallback mode
            </p>
            <button
              onClick={retryConnection}
              className="mt-4 bg-yellow-400 text-black px-4 py-2 rounded font-mono text-sm hover:bg-yellow-300 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;