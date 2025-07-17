import type { 
  QuoteApiResponse, 
  HistoricalQuoteApiResponse, 
  QuoteWithHistoryApiResponse,
  ApiStatusResponse,
  WebSocketQuoteMessage,
  Stock,
  PricePoint,
  ConnectionStatus,
  StockMetadata
} from '../types/stock';

// Configuration
const API_BASE_URL = import.meta.env.VITE_QUOTE_API_BASE_URL || 'http://localhost:8080';
const WS_URL = import.meta.env.VITE_QUOTE_API_WS_URL || 'ws://localhost:8080/ws';

// Stock metadata mapping
const STOCK_METADATA: Record<string, StockMetadata> = {
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corporation', marketCap: '2.85T' },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corporation', marketCap: '2.21T' },
  TSLA: { symbol: 'TSLA', name: 'Tesla, Inc.', marketCap: '792.3B' },
  PLTR: { symbol: 'PLTR', name: 'Palantir Technologies', marketCap: '58.2B' },
  ARKG: { symbol: 'ARKG', name: 'ARK Genomic Revolution ETF', marketCap: '1.2B' }
};

const TRACKED_SYMBOLS = ['MSFT', 'NVDA', 'TSLA', 'PLTR', 'ARKG'];

// Utility functions
function formatVolume(volume?: number): string {
  if (!volume) return 'N/A';
  
  if (volume >= 1000000000) {
    return `${(volume / 1000000000).toFixed(1)}B`;
  } else if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  
  return volume.toString();
}

function transformQuoteToStock(quote: QuoteApiResponse): Stock {
  const metadata = STOCK_METADATA[quote.symbol] || {
    symbol: quote.symbol,
    name: quote.symbol,
    marketCap: 'N/A'
  };

  return {
    symbol: quote.symbol,
    name: metadata.name,
    price: quote.last,
    change: quote.change || 0,
    changePercent: quote.changePercent || 0,
    volume: formatVolume(quote.volume),
    marketCap: metadata.marketCap,
    high: quote.high || quote.last,
    low: quote.low || quote.last,
    open: quote.open || quote.last,
    history: []
  };
}

function transformHistoricalData(histData: HistoricalQuoteApiResponse[]): PricePoint[] {
  return histData.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour12: false }),
    price: item.close,
    timestamp: item.timestamp
  }));
}

// API Service Class
export class QuoteApiService {
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnectAttempts: 0,
    dataSource: 'api'
  };

  private websocket: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  /**
   * Get current quote for a symbol
   */
  async getQuote(symbol: string): Promise<Stock | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/quotes?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const quote: QuoteApiResponse = await response.json();
      return transformQuoteToStock(quote);
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      this.connectionStatus.lastError = (error as Error).message;
      return null;
    }
  }

  /**
   * Get quote with historical data
   */
  async getQuoteWithHistory(symbol: string): Promise<{ stock: Stock; history: PricePoint[] } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/quotes/${symbol}/history`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: QuoteWithHistoryApiResponse = await response.json();
      const stock = transformQuoteToStock(data.current);
      const history = transformHistoricalData(data.history);
      
      return { stock, history };
    } catch (error) {
      console.error(`Failed to fetch quote with history for ${symbol}:`, error);
      this.connectionStatus.lastError = (error as Error).message;
      return null;
    }
  }

  /**
   * Get all tracked symbols with current quotes
   */
  async getAllQuotes(): Promise<Stock[]> {
    const promises = TRACKED_SYMBOLS.map(symbol => this.getQuote(symbol));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<Stock>).value);
  }

  /**
   * Get all tracked symbols with historical data
   */
  async getAllQuotesWithHistory(): Promise<Stock[]> {
    const promises = TRACKED_SYMBOLS.map(symbol => this.getQuoteWithHistory(symbol));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => {
        const data = (result as PromiseFulfilledResult<{ stock: Stock; history: PricePoint[] }>).value;
        return {
          ...data.stock,
          history: data.history
        };
      });
  }

  /**
   * Get API status
   */
  async getApiStatus(): Promise<ApiStatusResponse | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch API status:', error);
      return null;
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(onQuoteUpdate: (stock: Stock) => void, onConnectionChange?: (status: ConnectionStatus) => void): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.websocket = new WebSocket(WS_URL);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.wsReconnectAttempts = 0;
        this.connectionStatus = {
          connected: true,
          reconnectAttempts: this.wsReconnectAttempts,
          dataSource: 'websocket'
        };
        onConnectionChange?.(this.connectionStatus);
      };

      this.websocket.onmessage = (event) => {
        try {
          const quote: WebSocketQuoteMessage = JSON.parse(event.data);
          const stock = transformQuoteToStock(quote);
          onQuoteUpdate(stock);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.reason);
        this.connectionStatus.connected = false;
        onConnectionChange?.(this.connectionStatus);

        // Auto-reconnect with exponential backoff
        if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.wsReconnectAttempts), 30000);
          console.log(`Reconnecting WebSocket in ${delay}ms (attempt ${this.wsReconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.wsReconnectAttempts++;
            this.connectionStatus.reconnectAttempts = this.wsReconnectAttempts;
            this.connectWebSocket(onQuoteUpdate, onConnectionChange);
          }, delay);
        } else {
          console.error('Max WebSocket reconnection attempts reached');
          this.connectionStatus.lastError = 'Max reconnection attempts reached';
          onConnectionChange?.(this.connectionStatus);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus.lastError = 'WebSocket connection error';
        onConnectionChange?.(this.connectionStatus);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.connectionStatus.lastError = (error as Error).message;
      onConnectionChange?.(this.connectionStatus);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.connectionStatus.connected = false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported symbols
   */
  getSupportedSymbols(): string[] {
    return [...TRACKED_SYMBOLS];
  }
}

// Singleton instance
export const quoteApiService = new QuoteApiService(); 